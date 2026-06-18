const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
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

router.post('/login', async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const result = await query('SELECT * FROM users WHERE username = $1 AND enabled = TRUE', [username]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    const payload = { id: user.id, username: user.username, fullName: user.full_name, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev-jwt-secret', { expiresIn: '1d' });
    const userResponse = { ...payload, avatar: user.avatar };

    res.json({ message: 'Đăng nhập thành công', token, user: userResponse });
  } catch (error) {
    next(error);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const email = String(req.body.email || '').trim();
    if (!username || !password) return res.status(400).json({ error: 'Thiếu tên đăng nhập hoặc mật khẩu' });

    const passwordHash = await bcrypt.hash(password, 10);
    await query(
      `INSERT INTO users(username, password_hash, full_name, role, email) VALUES ($1,$2,$3,'KHACH',$4)`,
      [username, passwordHash, req.body.fullName || username, email]
    );
    res.status(201).json({ message: 'Đăng ký thành công' });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
    next(error);
  }
});

router.use(requireAuth);

router.get('/health', (req, res) => {
  res.json({ ok: true, user: req.user });
});

router.put('/profile', async (req, res, next) => {
  try {
    const { fullName, currentPassword, newPassword, avatar, phone, address, email } = req.body;
    let result;
    
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Vui lòng nhập mật khẩu hiện tại' });
      }
      const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
      if (!(await bcrypt.compare(currentPassword, userRes.rows[0].password_hash))) {
        return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
      }

      const hash = await bcrypt.hash(newPassword, 10);
      result = await query(
        'UPDATE users SET full_name = $1, password_hash = $2, avatar = $3, phone = $4, address = $5, email = $6 WHERE id = $7 RETURNING id, username, full_name, role, avatar, phone, address, email',
        [String(fullName).trim(), hash, avatar || null, phone || '', address || '', email || '', req.user.id]
      );
    } else {
      result = await query(
        'UPDATE users SET full_name = $1, avatar = $2, phone = $3, address = $4, email = $5 WHERE id = $6 RETURNING id, username, full_name, role, avatar, phone, address, email',
        [String(fullName).trim(), avatar || null, phone || '', address || '', email || '', req.user.id]
      );
    }
    
    const updatedUser = result.rows[0];
    const payload = { id: updatedUser.id, username: updatedUser.username, fullName: updatedUser.full_name, role: updatedUser.role, phone: updatedUser.phone, address: updatedUser.address, email: updatedUser.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev-jwt-secret', { expiresIn: '1d' });
    
    res.json({ message: 'Cập nhật thành công', token, user: { ...payload, avatar: updatedUser.avatar } });
  } catch (error) {
    next(error);
  }
});

router.delete('/profile', async (req, res, next) => {
  try {
    if (req.user.role === 'ADMIN') return res.status(403).json({ error: 'Quản trị viên không thể tự xóa tài khoản.' });
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Vui lòng nhập mật khẩu hiện tại để xác nhận.' });
    
    const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!(await bcrypt.compare(password, userRes.rows[0].password_hash))) {
      return res.status(400).json({ error: 'Mật khẩu không đúng.' });
    }
    await query('DELETE FROM users WHERE id = $1', [req.user.id]);
    res.json({ message: 'Đã xóa tài khoản' });
  } catch (error) { next(error); }
});

router.get('/dashboard', async (req, res, next) => {
  try {
    const [products, orders, inbound, webOrders] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM products WHERE active = TRUE'),
      query("SELECT COUNT(*)::int AS count FROM sales_orders WHERE status NOT IN ('COMPLETED', 'CANCELLED')"),
      query("SELECT COALESCE(SUM(quantity), 0)::int AS count FROM stock_movements WHERE type = 'INBOUND' AND movement_at >= date_trunc('month', CURRENT_DATE)"),
      query("SELECT COUNT(*)::int AS count FROM sales_orders WHERE is_web_order = TRUE AND status = 'DRAFT'")
    ]);
    res.json({
      products: products.rows[0].count,
      pendingOrders: orders.rows[0].count,
      inboundMonth: inbound.rows[0].count,
      pendingWebOrders: webOrders.rows[0].count
    });
  } catch (error) {
    next(error);
  }
});

router.get('/users', requireRole('ADMIN', 'QUANLY'), async (req, res, next) => {
  try {
    const result = await query('SELECT id, username, full_name, email, role, enabled, created_at FROM users ORDER BY username');
    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/users', requireRole('ADMIN', 'QUANLY'), async (req, res, next) => {
  try {
    if (req.user.role === 'QUANLY' && ['ADMIN', 'QUANLY'].includes(req.body.role)) {
      return res.status(403).json({ error: 'Quản lý không thể tạo tài khoản cùng cấp hoặc cao hơn.' });
    }

    const username = String(req.body.username || '').trim().toLowerCase();
    const enabled = req.body.enabled !== false;
    if (!username) throw new Error('Tên đăng nhập không được trống');
    if (!req.body.password) throw new Error('Người dùng mới cần mật khẩu');

    const passwordHash = await bcrypt.hash(req.body.password, 10);
    const result = await query(
      `INSERT INTO users(username, password_hash, full_name, role, email, enabled) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, username, full_name, role, enabled`,
      [username, passwordHash, String(req.body.fullName || '').trim(), req.body.role || 'NHANVIEN', req.body.email || '', enabled]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
    next(error);
  }
});

router.delete('/users/:id', requireRole('ADMIN', 'QUANLY'), async (req, res, next) => {
  try {
    const target = await query('SELECT role FROM users WHERE id = $1', [req.params.id]);
    if (!target.rows[0]) return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
    if (req.user.role === 'QUANLY' && ['ADMIN', 'QUANLY'].includes(target.rows[0].role)) {
      return res.status(403).json({ error: 'Bạn không có quyền xóa tài khoản cấp ngang hoặc cao hơn.' });
    }
    await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'Đã xóa tài khoản' });
  } catch (error) { next(error); }
});

router.get('/products', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM products ORDER BY code');
    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/products', requireRole('ADMIN', 'QUANLY', 'NHANVIEN'), async (req, res, next) => {
  try {
    const result = await query(
      `INSERT INTO products(code, name, unit, category, reference_price, active, image)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6, TRUE),$7)
       RETURNING *`,
      [
        String(req.body.code || '').trim().toUpperCase(),
        req.body.name,
        req.body.unit,
        req.body.category || '',
        Number(req.body.reference_price || 0),
        req.body.active,
        req.body.image || null
      ]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.put('/products/:id', requireRole('ADMIN', 'QUANLY', 'NHANVIEN'), async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE products SET code=$1, name=$2, unit=$3, category=$4, reference_price=$5, active=$6, image=$7, description=$8 WHERE id=$9 RETURNING *`,
      [
        String(req.body.code || '').trim().toUpperCase(), req.body.name, req.body.unit, req.body.category || '',
        Number(req.body.reference_price || 0), req.body.active, req.body.image || null, req.body.description || '', req.params.id
      ]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    res.json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

router.delete('/products/:id', requireRole('ADMIN', 'QUANLY', 'NHANVIEN'), async (req, res, next) => {
  try {
    await query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ message: 'Đã xóa sản phẩm' });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Không thể xóa sản phẩm đã có dữ liệu tồn kho hoặc đơn hàng. Vui lòng Sửa và chọn trạng thái "Ngừng bán".' });
    }
    next(error);
  }
});

router.get('/customers', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM customers ORDER BY code');
    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/customers', requireRole('ADMIN', 'QUANLY', 'NHANVIEN'), async (req, res, next) => {
  try {
    const result = await query(
      `INSERT INTO customers(code, name, address, phone, contact_person) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [
        String(req.body.code || '').trim().toUpperCase(),
        req.body.name,
        req.body.address,
        req.body.phone,
        req.body.contact_person
      ]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.get('/warehouses', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM warehouses ORDER BY code');
    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get('/inventory', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT i.*, p.code AS product_code, p.name AS product_name, p.unit, w.code AS warehouse_code, w.name AS warehouse_name
      FROM inventory i
      JOIN products p ON p.id = i.product_id
      JOIN warehouses w ON w.id = i.warehouse_id
      ORDER BY p.code, w.code
    `);
    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/receipts', requireRole('ADMIN', 'QUANLY', 'NHANVIEN'), async (req, res, next) => {
  try {
    const receipt = await createReceipt({
      warehouseId: Number(req.body.warehouse_id || req.body.warehouseId),
      sourceFactory: req.body.source_factory || req.body.sourceFactory || '',
      lines: req.body.lines || [],
      username: req.user.username,
      confirmNow: Boolean(req.body.confirm_now || req.body.confirmNow),
    });
    res.status(201).json({ data: receipt });
  } catch (error) {
    next(error);
  }
});

router.post('/receipts/:id/confirm', requireRole('ADMIN', 'QUANLY', 'NHANVIEN'), async (req, res, next) => {
  try {
    const receipt = await confirmReceipt(req.params.id, req.user.username);
    res.json({ data: receipt });
  } catch (error) {
    next(error);
  }
});

router.get('/orders', async (req, res, next) => {
  try {
    const params = [];
    let where = '';
    if (Object.values(STATUS).includes(req.query.status)) {
      params.push(req.query.status);
      where = 'WHERE o.status = $1';
    }
    const result = await query(`
      SELECT o.*, c.code AS customer_code, c.name AS customer_name, w.code AS warehouse_code, w.name AS warehouse_name
      FROM sales_orders o
      JOIN customers c ON c.id = o.customer_id
      JOIN warehouses w ON w.id = o.warehouse_id
      ${where}
      ORDER BY o.created_at DESC
    `, params);
    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/orders', requireRole('ADMIN', 'QUANLY', 'NHANVIEN'), async (req, res, next) => {
  try {
    const order = await createOrder({
      customerId: Number(req.body.customer_id || req.body.customerId),
      warehouseId: Number(req.body.warehouse_id || req.body.warehouseId),
      deliveryAddress: req.body.delivery_address || req.body.deliveryAddress || '',
      notes: req.body.notes || '',
      lines: req.body.lines || [],
      username: req.user.username,
      submitNow: Boolean(req.body.submit_now || req.body.submitNow),
    });
    res.status(201).json({ data: order });
  } catch (error) {
    next(error);
  }
});

router.post('/shop/order', async (req, res, next) => {
  try {
    const user = req.user;
    if (!user.phone || !user.address) return res.status(400).json({ error: 'Vui lòng cập nhật số điện thoại và địa chỉ trước khi đặt hàng' });

    // Tạo khách vãng lai nếu chưa có
    let cRes = await query(`SELECT id FROM customers WHERE code = 'WEB_GUEST'`);
    if (cRes.rows.length === 0) {
      cRes = await query(`INSERT INTO customers(code, name, address, phone) VALUES ('WEB_GUEST', 'Khách Đặt Web', 'Hệ thống tự tạo', '000') RETURNING id`);
    }
    
    const wRes = await query(`SELECT id FROM warehouses LIMIT 1`);
    if (wRes.rows.length === 0) return res.status(400).json({ error: 'Hệ thống chưa có kho xử lý' });

    const order = await createOrder({
      customerId: cRes.rows[0].id,
      warehouseId: wRes.rows[0].id,
      deliveryAddress: `[${user.fullName}] - SĐT: ${user.phone} - Đ/c: ${user.address}`,
      notes: req.body.notes || 'Đơn hàng từ Web',
      lines: req.body.lines,
      username: user.username,
      submitNow: false
    });

    await query(`UPDATE sales_orders SET is_web_order = TRUE WHERE id = $1`, [order.id]);
    res.json({ message: 'Đặt hàng thành công!' });
  } catch (error) { next(error); }
});

router.get('/my-orders', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT o.*, 
             (SELECT COALESCE(SUM(quantity), 0) FROM sales_order_lines WHERE order_id = o.id) as total_items
      FROM sales_orders o
      WHERE o.created_by = $1 AND o.is_web_order = TRUE
      ORDER BY o.created_at DESC
    `, [req.user.username]);
    res.json({ data: result.rows });
  } catch (error) { next(error); }
});

router.post('/my-orders/:id/cancel', async (req, res, next) => {
  try {
    const order = await query('SELECT status FROM sales_orders WHERE id = $1 AND created_by = $2', [req.params.id, req.user.username]);
    if (!order.rows[0]) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    if (order.rows[0].status !== 'DRAFT') return res.status(400).json({ error: 'Chỉ có thể hủy đơn hàng đang chờ xác nhận' });
    
    await query(`UPDATE sales_orders SET status = 'CANCELLED', cancelled_at = NOW() WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Đã hủy đơn hàng' });
  } catch (error) { next(error); }
});

router.delete('/my-orders/:id', async (req, res, next) => {
  try {
    const order = await query('SELECT status FROM sales_orders WHERE id = $1 AND created_by = $2', [req.params.id, req.user.username]);
    if (!order.rows[0]) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    if (order.rows[0].status !== 'CANCELLED') return res.status(400).json({ error: 'Chỉ có thể xóa đơn hàng đã bị hủy' });
    
    await query('DELETE FROM sales_orders WHERE id = $1', [req.params.id]);
    res.json({ message: 'Đã xóa đơn hàng' });
  } catch (error) { next(error); }
});

router.put('/orders/:id/tracking', requireRole('ADMIN', 'QUANLY', 'NHANVIEN'), async (req, res, next) => {
  try {
    const { trackingCode, estimatedDelivery } = req.body;
    const result = await query(
      `UPDATE sales_orders SET tracking_code = $1, estimated_delivery = $2 WHERE id = $3 RETURNING *`,
      [trackingCode || null, estimatedDelivery || null, req.params.id]
    );
    res.json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

router.delete('/orders/:id', requireRole('ADMIN', 'QUANLY', 'NHANVIEN'), async (req, res, next) => {
  try {
    const order = await query('SELECT status FROM sales_orders WHERE id = $1', [req.params.id]);
    if (!order.rows[0]) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    if (order.rows[0].status !== 'CANCELLED') return res.status(400).json({ error: 'Chỉ có thể xóa đơn hàng đã hủy' });
    await query('DELETE FROM sales_orders WHERE id = $1', [req.params.id]);
    res.json({ message: 'Đã xóa đơn hàng' });
  } catch (error) { next(error); }
});

router.post('/orders/:id/submit', requireRole('ADMIN', 'QUANLY', 'NHANVIEN'), apiOrderAction((id) => transitionOrder(id, STATUS.DRAFT, STATUS.SUBMITTED, 'submitted_at')));
router.post('/orders/:id/logistics-receive', requireRole('ADMIN', 'QUANLY', 'NHANVIEN'), apiOrderAction((id) => transitionOrder(id, STATUS.SUBMITTED, STATUS.LOGISTICS_RECEIVED, 'logistics_received_at')));
router.post('/orders/:id/send-warehouse', requireRole('ADMIN', 'QUANLY', 'NHANVIEN'), apiOrderAction((id) => transitionOrder(id, STATUS.LOGISTICS_RECEIVED, STATUS.WAREHOUSE_PROCESSING, 'warehouse_processing_at')));
router.post('/orders/:id/complete', requireRole('ADMIN', 'QUANLY', 'NHANVIEN'), apiOrderAction((id, req) => completeOrder(id, req.user.username)));
router.post('/orders/:id/cancel', requireRole('ADMIN', 'QUANLY', 'NHANVIEN'), apiOrderAction((id) => cancelOrder(id)));

router.get('/reports/:type', async (req, res, next) => {
  try {
    const type = String(req.params.type || '').toUpperCase() === 'OUTBOUND' ? 'OUTBOUND' : 'INBOUND';
    const from = req.query.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const to = req.query.to || new Date().toISOString().slice(0, 10);
    const result = await query(
      `SELECT m.*, p.code AS product_code, p.name AS product_name, w.code AS warehouse_code, w.name AS warehouse_name
       FROM stock_movements m
       JOIN products p ON p.id = m.product_id
       JOIN warehouses w ON w.id = m.warehouse_id
       WHERE m.type = $1 AND m.movement_at BETWEEN $2 AND $3
       ORDER BY m.movement_at DESC`,
      [type, `${from}T00:00:00.000Z`, `${to}T23:59:59.999Z`]
    );
    res.json({ type, from, to, data: result.rows });
  } catch (error) {
    next(error);
  }
});

function apiOrderAction(action) {
  return async (req, res, next) => {
    try {
      const data = await action(req.params.id, req);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = router;
