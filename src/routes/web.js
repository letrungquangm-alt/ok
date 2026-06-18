const bcrypt = require('bcryptjs');
const express = require('express');
const { query } = require('../config/db');
const { flash, guestOnly, requireAuth, requireRole } = require('../middleware/auth');
const {
  STATUS,
  cancelOrder,
  completeOrder,
  confirmReceipt,
  createOrder,
  createReceipt,
  transitionOrder,
} = require('../services/business');

const router = express.Router();

const statuses = Object.values(STATUS);
const roles = ['ADMIN', 'SALES', 'LOGISTICS', 'WAREHOUSE', 'FACTORY'];

router.get('/login', guestOnly, (req, res) => {
  res.render('login', { title: 'Đăng nhập' });
});

router.post('/login', guestOnly, async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const result = await query('SELECT * FROM users WHERE username = $1 AND enabled = TRUE', [username]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      flash(req, 'error', 'Tên đăng nhập hoặc mật khẩu không đúng');
      return res.redirect('/login');
    }
    req.session.user = {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
    };
    return res.redirect('/');
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const [products, customers, orders, inventory, pending] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM products'),
      query('SELECT COUNT(*)::int AS count FROM customers'),
      query('SELECT COUNT(*)::int AS count FROM sales_orders'),
      query(inventorySql('LIMIT 8')),
      query(orderListSql('WHERE o.status IN ($1, $2, $3)') + ' LIMIT 8', [
        STATUS.SUBMITTED,
        STATUS.LOGISTICS_RECEIVED,
        STATUS.WAREHOUSE_PROCESSING,
      ]),
    ]);
    res.render('dashboard', {
      title: 'Tổng quan',
      counts: {
        products: products.rows[0].count,
        customers: customers.rows[0].count,
        orders: orders.rows[0].count,
      },
      inventoryRows: inventory.rows,
      pendingOrders: pending.rows,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/products', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const products = await query('SELECT * FROM products ORDER BY code');
    res.render('products', { title: 'Sản phẩm', products: products.rows, product: {} });
  } catch (error) {
    next(error);
  }
});

router.get('/products/:id/edit', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const [products, product] = await Promise.all([
      query('SELECT * FROM products ORDER BY code'),
      query('SELECT * FROM products WHERE id = $1', [req.params.id]),
    ]);
    res.render('products', { title: 'Sản phẩm', products: products.rows, product: product.rows[0] || {} });
  } catch (error) {
    next(error);
  }
});

router.post('/products', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const values = [
      normalizeCode(req.body.code),
      text(req.body.name),
      text(req.body.unit),
      text(req.body.category),
      Number(req.body.reference_price || 0),
      req.body.active === 'on',
    ];
    if (req.body.id) {
      await query(
        `UPDATE products SET code=$1, name=$2, unit=$3, category=$4, reference_price=$5, active=$6 WHERE id=$7`,
        values.concat(req.body.id)
      );
    } else {
      await query(
        `INSERT INTO products(code, name, unit, category, reference_price, active) VALUES ($1,$2,$3,$4,$5,$6)`,
        values
      );
    }
    flash(req, 'success', 'Đã lưu sản phẩm');
  } catch (error) {
    flash(req, 'error', friendlyError(error, 'Không lưu được sản phẩm'));
  }
  res.redirect('/products');
});

router.get('/customers', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const customers = await query('SELECT * FROM customers ORDER BY code');
    res.render('customers', { title: 'Khách hàng', customers: customers.rows, customer: {} });
  } catch (error) {
    next(error);
  }
});

router.get('/customers/:id/edit', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const [customers, customer] = await Promise.all([
      query('SELECT * FROM customers ORDER BY code'),
      query('SELECT * FROM customers WHERE id = $1', [req.params.id]),
    ]);
    res.render('customers', { title: 'Khách hàng', customers: customers.rows, customer: customer.rows[0] || {} });
  } catch (error) {
    next(error);
  }
});

router.post('/customers', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const values = [
      normalizeCode(req.body.code),
      text(req.body.name),
      text(req.body.address),
      text(req.body.phone),
      text(req.body.contact_person),
    ];
    if (req.body.id) {
      await query(
        `UPDATE customers SET code=$1, name=$2, address=$3, phone=$4, contact_person=$5 WHERE id=$6`,
        values.concat(req.body.id)
      );
    } else {
      await query(
        `INSERT INTO customers(code, name, address, phone, contact_person) VALUES ($1,$2,$3,$4,$5)`,
        values
      );
    }
    flash(req, 'success', 'Đã lưu khách hàng');
  } catch (error) {
    flash(req, 'error', friendlyError(error, 'Không lưu được khách hàng'));
  }
  res.redirect('/customers');
});

router.get('/warehouses', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const warehouses = await query('SELECT * FROM warehouses ORDER BY code');
    res.render('warehouses', { title: 'Kho', warehouses: warehouses.rows, warehouse: {} });
  } catch (error) {
    next(error);
  }
});

router.get('/warehouses/:id/edit', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const [warehouses, warehouse] = await Promise.all([
      query('SELECT * FROM warehouses ORDER BY code'),
      query('SELECT * FROM warehouses WHERE id = $1', [req.params.id]),
    ]);
    res.render('warehouses', { title: 'Kho', warehouses: warehouses.rows, warehouse: warehouse.rows[0] || {} });
  } catch (error) {
    next(error);
  }
});

router.post('/warehouses', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const values = [
      normalizeCode(req.body.code),
      text(req.body.name),
      text(req.body.address),
      req.body.active === 'on',
    ];
    if (req.body.id) {
      await query(
        `UPDATE warehouses SET code=$1, name=$2, address=$3, active=$4 WHERE id=$5`,
        values.concat(req.body.id)
      );
    } else {
      await query(`INSERT INTO warehouses(code, name, address, active) VALUES ($1,$2,$3,$4)`, values);
    }
    flash(req, 'success', 'Đã lưu kho');
  } catch (error) {
    flash(req, 'error', friendlyError(error, 'Không lưu được kho'));
  }
  res.redirect('/warehouses');
});

router.get('/users', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const users = await query('SELECT * FROM users ORDER BY username');
    res.render('users', { title: 'Người dùng', users: users.rows, userAccount: {}, roles });
  } catch (error) {
    next(error);
  }
});

router.get('/users/:id/edit', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const [users, user] = await Promise.all([
      query('SELECT * FROM users ORDER BY username'),
      query('SELECT * FROM users WHERE id = $1', [req.params.id]),
    ]);
    res.render('users', { title: 'Người dùng', users: users.rows, userAccount: user.rows[0] || {}, roles });
  } catch (error) {
    next(error);
  }
});

router.post('/users', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const enabled = req.body.enabled === 'on';
    if (!username) throw new Error('Tên đăng nhập không được trống');
    if (req.body.id) {
      if (req.body.password) {
        const passwordHash = await bcrypt.hash(req.body.password, 10);
        await query(
          `UPDATE users SET username=$1, password_hash=$2, full_name=$3, role=$4, enabled=$5 WHERE id=$6`,
          [username, passwordHash, text(req.body.full_name), req.body.role, enabled, req.body.id]
        );
      } else {
        await query(
          `UPDATE users SET username=$1, full_name=$2, role=$3, enabled=$4 WHERE id=$5`,
          [username, text(req.body.full_name), req.body.role, enabled, req.body.id]
        );
      }
    } else {
      if (!req.body.password) throw new Error('Người dùng mới cần mật khẩu');
      const passwordHash = await bcrypt.hash(req.body.password, 10);
      await query(
        `INSERT INTO users(username, password_hash, full_name, role, enabled) VALUES ($1,$2,$3,$4,$5)`,
        [username, passwordHash, text(req.body.full_name), req.body.role, enabled]
      );
    }
    flash(req, 'success', 'Đã lưu người dùng');
  } catch (error) {
    flash(req, 'error', friendlyError(error, 'Không lưu được người dùng'));
  }
  res.redirect('/users');
});

router.get('/receipts', requireAuth, requireRole('ADMIN', 'FACTORY', 'WAREHOUSE'), async (req, res, next) => {
  try {
    const [receipts, products, warehouses] = await Promise.all([
      query(receiptListSql()),
      query('SELECT * FROM products WHERE active = TRUE ORDER BY code'),
      query('SELECT * FROM warehouses WHERE active = TRUE ORDER BY code'),
    ]);
    res.render('receipts', { title: 'Nhập kho', receipts: receipts.rows, products: products.rows, warehouses: warehouses.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/receipts', requireAuth, requireRole('ADMIN', 'FACTORY', 'WAREHOUSE'), async (req, res) => {
  try {
    await createReceipt({
      warehouseId: Number(req.body.warehouse_id),
      sourceFactory: text(req.body.source_factory),
      lines: linesFromBody(req.body),
      username: req.session.user.username,
      confirmNow: req.body.action === 'confirm',
    });
    flash(req, 'success', req.body.action === 'confirm' ? 'Đã tạo và xác nhận nhập kho' : 'Đã tạo phiếu nhập nháp');
  } catch (error) {
    flash(req, 'error', error.message);
  }
  res.redirect('/receipts');
});

router.get('/receipts/:id', requireAuth, requireRole('ADMIN', 'FACTORY', 'WAREHOUSE'), async (req, res, next) => {
  try {
    const [receipt, lines] = await Promise.all([
      query(receiptDetailSql(), [req.params.id]),
      query(receiptLineSql(), [req.params.id]),
    ]);
    if (!receipt.rows[0]) return res.status(404).render('error', { title: 'Không tìm thấy', error: 'Không tìm thấy phiếu nhập' });
    res.render('receipt-detail', { title: receipt.rows[0].receipt_no, receipt: receipt.rows[0], lines: lines.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/receipts/:id/confirm', requireAuth, requireRole('ADMIN', 'FACTORY', 'WAREHOUSE'), async (req, res) => {
  try {
    await confirmReceipt(req.params.id, req.session.user.username);
    flash(req, 'success', 'Đã xác nhận nhập kho');
  } catch (error) {
    flash(req, 'error', error.message);
  }
  res.redirect(`/receipts/${req.params.id}`);
});

router.get('/orders', requireAuth, async (req, res, next) => {
  try {
    const selectedStatus = statuses.includes(req.query.status) ? req.query.status : '';
    const params = selectedStatus ? [selectedStatus] : [];
    const sql = orderListSql(selectedStatus ? 'WHERE o.status = $1' : '');
    const orders = await query(sql, params);
    res.render('orders', { title: 'Đơn hàng', orders: orders.rows, statuses, selectedStatus });
  } catch (error) {
    next(error);
  }
});

router.get('/orders/new', requireAuth, requireRole('ADMIN', 'SALES'), async (req, res, next) => {
  try {
    const [customers, products, warehouses] = await Promise.all([
      query('SELECT * FROM customers ORDER BY code'),
      query('SELECT * FROM products WHERE active = TRUE ORDER BY code'),
      query('SELECT * FROM warehouses WHERE active = TRUE ORDER BY code'),
    ]);
    res.render('order-form', { title: 'Tạo đơn hàng', customers: customers.rows, products: products.rows, warehouses: warehouses.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/orders', requireAuth, requireRole('ADMIN', 'SALES'), async (req, res) => {
  try {
    await createOrder({
      customerId: Number(req.body.customer_id),
      warehouseId: Number(req.body.warehouse_id),
      deliveryAddress: text(req.body.delivery_address),
      notes: text(req.body.notes),
      lines: linesFromBody(req.body),
      username: req.session.user.username,
      submitNow: req.body.action === 'submit',
    });
    flash(req, 'success', req.body.action === 'submit' ? 'Đã tạo và gửi đơn hàng' : 'Đã lưu đơn hàng nháp');
    res.redirect('/orders');
  } catch (error) {
    flash(req, 'error', error.message);
    res.redirect('/orders/new');
  }
});

router.get('/orders/:id', requireAuth, async (req, res, next) => {
  try {
    const [order, lines, issue] = await Promise.all([
      query(orderDetailSql(), [req.params.id]),
      query(orderLineSql(), [req.params.id]),
      query(`SELECT * FROM stock_issues WHERE order_id = $1`, [req.params.id]),
    ]);
    if (!order.rows[0]) return res.status(404).render('error', { title: 'Không tìm thấy', error: 'Không tìm thấy đơn hàng' });
    res.render('order-detail', { title: order.rows[0].order_no, order: order.rows[0], lines: lines.rows, issue: issue.rows[0] || null });
  } catch (error) {
    next(error);
  }
});

router.post('/orders/:id/submit', requireAuth, requireRole('ADMIN', 'SALES'), orderAction((id) => transitionOrder(id, STATUS.DRAFT, STATUS.SUBMITTED, 'submitted_at'), 'Đã gửi đơn hàng'));
router.post('/orders/:id/logistics-receive', requireAuth, requireRole('ADMIN', 'LOGISTICS'), orderAction((id) => transitionOrder(id, STATUS.SUBMITTED, STATUS.LOGISTICS_RECEIVED, 'logistics_received_at'), 'Logistics đã tiếp nhận đơn'));
router.post('/orders/:id/send-warehouse', requireAuth, requireRole('ADMIN', 'LOGISTICS'), orderAction((id) => transitionOrder(id, STATUS.LOGISTICS_RECEIVED, STATUS.WAREHOUSE_PROCESSING, 'warehouse_processing_at'), 'Đã chuyển yêu cầu xuất cho kho'));
router.post('/orders/:id/complete', requireAuth, requireRole('ADMIN', 'WAREHOUSE'), orderAction((id, req) => completeOrder(id, req.session.user.username), 'Kho đã xác nhận xuất hàng'));
router.post('/orders/:id/cancel', requireAuth, requireRole('ADMIN', 'SALES'), orderAction((id) => cancelOrder(id), 'Đã hủy đơn hàng'));

router.get('/reports/inbound', requireAuth, reportPage('INBOUND', 'reports-inbound', 'Báo cáo nhập kho'));
router.get('/reports/outbound', requireAuth, reportPage('OUTBOUND', 'reports-outbound', 'Báo cáo xuất kho'));

router.get('/reports/inventory', requireAuth, async (req, res, next) => {
  try {
    const inventory = await query(inventorySql(''));
    res.render('reports-inventory', { title: 'Báo cáo tồn kho', inventoryRows: inventory.rows });
  } catch (error) {
    next(error);
  }
});

function orderAction(action, successMessage) {
  return async (req, res) => {
    try {
      await action(req.params.id, req);
      flash(req, 'success', successMessage);
    } catch (error) {
      flash(req, 'error', error.message);
    }
    res.redirect(`/orders/${req.params.id}`);
  };
}

function reportPage(type, view, title) {
  return async (req, res, next) => {
    try {
      const range = dateRange(req.query.from, req.query.to);
      const movements = await query(
        `SELECT m.*, p.code AS product_code, p.name AS product_name, w.code AS warehouse_code, w.name AS warehouse_name
         FROM stock_movements m
         JOIN products p ON p.id = m.product_id
         JOIN warehouses w ON w.id = m.warehouse_id
         WHERE m.type = $1 AND m.movement_at BETWEEN $2 AND $3
         ORDER BY m.movement_at DESC`,
        [type, range.fromDate, range.toDateEnd]
      );
      res.render(view, { title, movements: movements.rows, from: range.from, to: range.to });
    } catch (error) {
      next(error);
    }
  };
}

function linesFromBody(body) {
  const productIds = asArray(body.productIds);
  const quantities = asArray(body.quantities);
  return productIds.map((productId, index) => ({
    productId,
    quantity: quantities[index],
  }));
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function dateRange(from, to) {
  const today = new Date().toISOString().slice(0, 10);
  const toValue = to || today;
  const fromValue = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return {
    from: fromValue,
    to: toValue,
    fromDate: `${fromValue}T00:00:00.000Z`,
    toDateEnd: `${toValue}T23:59:59.999Z`,
  };
}

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase();
}

function text(value) {
  return String(value || '').trim();
}

function friendlyError(error, fallback) {
  if (error && error.code === '23505') return 'Mã đã tồn tại';
  return error && error.message ? error.message : fallback;
}

function inventorySql(suffix) {
  return `
    SELECT i.*, p.code AS product_code, p.name AS product_name, p.unit, p.category,
           w.code AS warehouse_code, w.name AS warehouse_name
    FROM inventory i
    JOIN products p ON p.id = i.product_id
    JOIN warehouses w ON w.id = i.warehouse_id
    ORDER BY p.code, w.code
    ${suffix || ''}
  `;
}

function receiptListSql() {
  return `
    SELECT r.*, w.code AS warehouse_code, w.name AS warehouse_name,
           COALESCE(SUM(l.quantity), 0)::bigint AS total_quantity
    FROM inbound_receipts r
    JOIN warehouses w ON w.id = r.warehouse_id
    LEFT JOIN inbound_receipt_lines l ON l.receipt_id = r.id
    GROUP BY r.id, w.id
    ORDER BY r.created_at DESC
  `;
}

function receiptDetailSql() {
  return `
    SELECT r.*, w.code AS warehouse_code, w.name AS warehouse_name
    FROM inbound_receipts r
    JOIN warehouses w ON w.id = r.warehouse_id
    WHERE r.id = $1
  `;
}

function receiptLineSql() {
  return `
    SELECT l.*, p.code AS product_code, p.name AS product_name, p.unit
    FROM inbound_receipt_lines l
    JOIN products p ON p.id = l.product_id
    WHERE l.receipt_id = $1
    ORDER BY l.id
  `;
}

function orderListSql(whereClause) {
  return `
    SELECT o.*, c.code AS customer_code, c.name AS customer_name,
           w.code AS warehouse_code, w.name AS warehouse_name,
           COALESCE(SUM(l.quantity), 0)::bigint AS total_quantity
    FROM sales_orders o
    JOIN customers c ON c.id = o.customer_id
    JOIN warehouses w ON w.id = o.warehouse_id
    LEFT JOIN sales_order_lines l ON l.order_id = o.id
    ${whereClause || ''}
    GROUP BY o.id, c.id, w.id
    ORDER BY o.created_at DESC
  `;
}

function orderDetailSql() {
  return `
    SELECT o.*, c.code AS customer_code, c.name AS customer_name, c.address AS customer_address, c.phone AS customer_phone,
           w.code AS warehouse_code, w.name AS warehouse_name
    FROM sales_orders o
    JOIN customers c ON c.id = o.customer_id
    JOIN warehouses w ON w.id = o.warehouse_id
    WHERE o.id = $1
  `;
}

function orderLineSql() {
  return `
    SELECT l.*, p.code AS product_code, p.name AS product_name, p.unit
    FROM sales_order_lines l
    JOIN products p ON p.id = l.product_id
    WHERE l.order_id = $1
    ORDER BY l.id
  `;
}

module.exports = router;
