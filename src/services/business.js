const { transaction } = require('../config/db');

const STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  LOGISTICS_RECEIVED: 'LOGISTICS_RECEIVED',
  WAREHOUSE_PROCESSING: 'WAREHOUSE_PROCESSING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

function documentNumber(prefix) {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const random = Math.floor(Math.random() * 900 + 100);
  return `${prefix}-${stamp}-${random}`;
}

function normalizeLines(lines) {
  const clean = [];
  for (const line of lines || []) {
    const productId = Number(line.productId || line.product_id);
    const quantity = Number(line.quantity);
    if (!productId && !quantity) continue;
    if (!productId) throw new Error('Vui lòng chọn sản phẩm');
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Số lượng phải là số nguyên lớn hơn 0');
    clean.push({ productId, quantity });
  }
  if (clean.length === 0) {
    throw new Error('Chứng từ cần ít nhất một dòng sản phẩm');
  }
  return clean;
}

async function createReceipt({ warehouseId, sourceFactory, lines, username, confirmNow }) {
  const cleanLines = normalizeLines(lines);
  return transaction(async (client) => {
    const receiptNo = documentNumber('NK');
    const receiptResult = await client.query(
      `INSERT INTO inbound_receipts(receipt_no, warehouse_id, source_factory, status, created_by)
       VALUES ($1, $2, $3, 'DRAFT', $4)
       RETURNING *`,
      [receiptNo, warehouseId, sourceFactory || '', username]
    );
    const receipt = receiptResult.rows[0];

    for (const line of cleanLines) {
      await assertProduct(client, line.productId);
      await client.query(
        `INSERT INTO inbound_receipt_lines(receipt_id, product_id, quantity)
         VALUES ($1, $2, $3)`,
        [receipt.id, line.productId, line.quantity]
      );
    }

    if (confirmNow) {
      await confirmReceiptInTransaction(client, receipt.id, username);
    }

    return receipt;
  });
}

async function confirmReceipt(receiptId, username) {
  return transaction((client) => confirmReceiptInTransaction(client, receiptId, username));
}

async function confirmReceiptInTransaction(client, receiptId, username) {
  const receipt = await single(
    client,
    `SELECT * FROM inbound_receipts WHERE id = $1 FOR UPDATE`,
    [receiptId],
    'Không tìm thấy phiếu nhập'
  );
  if (receipt.status === 'CONFIRMED') {
    return receipt;
  }

  const lines = await client.query(
    `SELECT l.*, p.code, p.name
     FROM inbound_receipt_lines l
     JOIN products p ON p.id = l.product_id
     WHERE l.receipt_id = $1`,
    [receiptId]
  );
  if (lines.rows.length === 0) {
    throw new Error('Phiếu nhập chưa có dòng sản phẩm');
  }

  for (const line of lines.rows) {
    await increaseInventory(client, line.product_id, receipt.warehouse_id, line.quantity);
    await client.query(
      `INSERT INTO stock_movements(type, product_id, warehouse_id, quantity, document_no, partner_name, movement_at, created_by)
       VALUES ('INBOUND', $1, $2, $3, $4, $5, NOW(), $6)`,
      [line.product_id, receipt.warehouse_id, line.quantity, receipt.receipt_no, receipt.source_factory || '', username]
    );
  }

  const updated = await client.query(
    `UPDATE inbound_receipts
     SET status = 'CONFIRMED', confirmed_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [receiptId]
  );
  return updated.rows[0];
}

async function createOrder({ customerId, warehouseId, deliveryAddress, notes, lines, username, submitNow }) {
  const cleanLines = normalizeLines(lines);
  return transaction(async (client) => {
    await assertCustomer(client, customerId);
    await assertWarehouse(client, warehouseId);

    const status = submitNow ? STATUS.SUBMITTED : STATUS.DRAFT;
    const submittedAt = submitNow ? new Date() : null;
    const orderResult = await client.query(
      `INSERT INTO sales_orders(order_no, customer_id, warehouse_id, delivery_address, status, created_by, notes, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [documentNumber('SO'), customerId, warehouseId, deliveryAddress || '', status, username, notes || '', submittedAt]
    );
    const order = orderResult.rows[0];

    for (const line of cleanLines) {
      const product = await assertProduct(client, line.productId);
      await client.query(
        `INSERT INTO sales_order_lines(order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [order.id, line.productId, line.quantity, product.reference_price]
      );
    }

    return order;
  });
}

async function transitionOrder(orderId, fromStatus, toStatus, timestampColumn) {
  return transaction(async (client) => {
    const order = await single(client, `SELECT * FROM sales_orders WHERE id = $1 FOR UPDATE`, [orderId], 'Không tìm thấy đơn hàng');
    if (order.status !== fromStatus) {
      throw new Error('Trạng thái đơn hàng không hợp lệ cho thao tác này');
    }
    const result = await client.query(
      `UPDATE sales_orders
       SET status = $1, ${timestampColumn} = NOW()
       WHERE id = $2
       RETURNING *`,
      [toStatus, orderId]
    );
    return result.rows[0];
  });
}

async function cancelOrder(orderId) {
  return transaction(async (client) => {
    const order = await single(client, `SELECT * FROM sales_orders WHERE id = $1 FOR UPDATE`, [orderId], 'Không tìm thấy đơn hàng');
    if (order.status === STATUS.COMPLETED) {
      throw new Error('Không thể hủy đơn đã hoàn tất');
    }
    const result = await client.query(
      `UPDATE sales_orders SET status = 'CANCELLED', cancelled_at = NOW() WHERE id = $1 RETURNING *`,
      [orderId]
    );
    return result.rows[0];
  });
}

async function completeOrder(orderId, username) {
  return transaction(async (client) => {
    const order = await single(
      client,
      `SELECT o.*, c.name AS customer_name
       FROM sales_orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE o.id = $1
       FOR UPDATE OF o`,
      [orderId],
      'Không tìm thấy đơn hàng'
    );
    if (order.status !== STATUS.WAREHOUSE_PROCESSING) {
      throw new Error('Kho chỉ xác nhận xuất cho đơn đang xử lý');
    }

    const existingIssue = await client.query('SELECT id FROM stock_issues WHERE order_id = $1', [orderId]);
    if (existingIssue.rows.length > 0) {
      throw new Error('Đơn hàng đã có phiếu xuất kho');
    }

    const lines = await client.query(
      `SELECT l.*, p.code, p.name
       FROM sales_order_lines l
       JOIN products p ON p.id = l.product_id
       WHERE l.order_id = $1`,
      [orderId]
    );
    if (lines.rows.length === 0) {
      throw new Error('Đơn hàng chưa có dòng sản phẩm');
    }

    const issueNo = documentNumber('XK');
    const issueResult = await client.query(
      `INSERT INTO stock_issues(issue_no, order_id, warehouse_id, confirmed_by, confirmed_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [issueNo, orderId, order.warehouse_id, username]
    );
    const issue = issueResult.rows[0];

    for (const line of lines.rows) {
      await decreaseInventory(client, line.product_id, order.warehouse_id, line.quantity);
      await client.query(
        `INSERT INTO stock_issue_lines(issue_id, product_id, quantity)
         VALUES ($1, $2, $3)`,
        [issue.id, line.product_id, line.quantity]
      );
      await client.query(
        `INSERT INTO stock_movements(type, product_id, warehouse_id, quantity, document_no, partner_name, movement_at, created_by)
         VALUES ('OUTBOUND', $1, $2, $3, $4, $5, NOW(), $6)`,
        [line.product_id, order.warehouse_id, line.quantity, issueNo, order.customer_name, username]
      );
    }

    await client.query(
      `UPDATE sales_orders SET status = 'COMPLETED', completed_at = NOW() WHERE id = $1`,
      [orderId]
    );
    return issue;
  });
}

async function increaseInventory(client, productId, warehouseId, quantity) {
  await client.query(
    `INSERT INTO inventory(product_id, warehouse_id, quantity, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (product_id, warehouse_id)
     DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity, updated_at = NOW()`,
    [productId, warehouseId, quantity]
  );
}

async function decreaseInventory(client, productId, warehouseId, quantity) {
  const inventory = await client.query(
    `SELECT i.*, p.code, p.name
     FROM inventory i
     JOIN products p ON p.id = i.product_id
     WHERE i.product_id = $1 AND i.warehouse_id = $2
     FOR UPDATE OF i`,
    [productId, warehouseId]
  );
  if (inventory.rows.length === 0) {
    throw new Error('Chưa có tồn kho cho sản phẩm cần xuất');
  }
  const row = inventory.rows[0];
  if (Number(row.quantity) < Number(quantity)) {
    throw new Error(`Không đủ tồn kho cho ${row.code}. Tồn hiện tại: ${row.quantity}, cần xuất: ${quantity}`);
  }
  await client.query(
    `UPDATE inventory SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2`,
    [quantity, row.id]
  );
}

async function assertProduct(client, productId) {
  return single(client, 'SELECT * FROM products WHERE id = $1 AND active = TRUE', [productId], 'Không tìm thấy sản phẩm');
}

async function assertCustomer(client, customerId) {
  return single(client, 'SELECT * FROM customers WHERE id = $1', [customerId], 'Không tìm thấy khách hàng');
}

async function assertWarehouse(client, warehouseId) {
  return single(client, 'SELECT * FROM warehouses WHERE id = $1 AND active = TRUE', [warehouseId], 'Không tìm thấy kho');
}

async function single(client, sql, params, message) {
  const result = await client.query(sql, params);
  if (result.rows.length === 0) {
    throw new Error(message);
  }
  return result.rows[0];
}

module.exports = {
  STATUS,
  cancelOrder,
  completeOrder,
  createOrder,
  createReceipt,
  confirmReceipt,
  normalizeLines,
  transitionOrder,
};
