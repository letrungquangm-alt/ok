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

function removeVietnameseTones(str) {
  if (!str) return '';
  let result = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  result = result.replace(/đ/g, "d").replace(/Đ/g, "D");
  result = result.replace(/[^a-zA-Z0-9]/g, "");
  return result.toUpperCase();
}

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
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';

function parseOptionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // Ignore invalid/expired token for optional authentication
    }
  }
  next();
}

router.get('/products', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM products ORDER BY code');
    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/shop/order', parseOptionalAuth, async (req, res, next) => {
  try {
    const user = req.user;
    let fullName, phone, address, username;

    if (user) {
      fullName = req.body.fullName || user.fullName;
      phone = req.body.phone || user.phone;
      address = req.body.address || user.address;
      username = user.username;
    } else {
      fullName = req.body.fullName;
      phone = req.body.phone;
      address = req.body.address;
      username = 'guest';
    }

    if (!fullName || !phone || !address) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ Họ tên, Số điện thoại và Địa chỉ nhận hàng' });
    }

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
      deliveryAddress: `[${fullName}] - SĐT: ${phone} - Đ/c: ${address}`,
      notes: req.body.notes || (user ? 'Đơn hàng từ Web' : 'Đơn hàng từ Web (Khách vãng lai)'),
      lines: req.body.lines,
      username: username,
      submitNow: false
    });

    await query(`UPDATE sales_orders SET is_web_order = TRUE WHERE id = $1`, [order.id]);
    res.json({ message: 'Đặt hàng thành công!' });
  } catch (error) { next(error); }
});

// Public Lookup Endpoints
function generateRandomCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

router.post('/lookups', async (req, res, next) => {
  try {
    const { email, fullName, phone } = req.body;
    if (!email || !fullName || !phone) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin: Email, Họ tên và Số điện thoại' });
    }
    
    const existing = await query('SELECT code FROM customer_lookups WHERE email = $1', [email.trim().toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        code: 'EMAIL_EXISTS',
        error: 'Email này đã đăng ký mã tra cứu trước đó. Mỗi email chỉ có 1 mã duy nhất. Vui lòng dùng tính năng "Quên mã" hoặc liên hệ Admin nếu muốn đổi mã.' 
      });
    }

    let code;
    let attempts = 0;
    while (attempts < 10) {
      code = generateRandomCode(6);
      const dup = await query('SELECT id FROM customer_lookups WHERE code = $1', [code]);
      if (dup.rows.length === 0) break;
      attempts++;
    }
    
    await query(
      `INSERT INTO customer_lookups(code, full_name, email, phone) VALUES ($1, $2, $3, $4)`,
      [code, fullName.trim(), email.trim().toLowerCase(), phone.trim()]
    );
    
    res.status(201).json({ code, message: 'Tạo mã tra cứu thành công!' });
  } catch (error) {
    next(error);
  }
});

router.post('/lookups/forgot', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Vui lòng nhập Email' });

    const customerRes = await query('SELECT code, full_name FROM customer_lookups WHERE email = $1', [email.trim().toLowerCase()]);
    const customer = customerRes.rows[0];
    if (!customer) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin khách hàng với Email này.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await query(
      'UPDATE customer_lookups SET otp = $1, otp_expiry = $2 WHERE email = $3',
      [otp, otpExpiry, email.trim().toLowerCase()]
    );

    const { sendEmail } = require('../services/email');
    await sendEmail({
      to: email.trim().toLowerCase(),
      subject: 'Mã xác nhận (OTP) để lấy lại mã tra cứu khách hàng',
      text: `Xin chào ${customer.full_name},\n\nMã OTP để lấy lại mã tra cứu của bạn là: ${otp}\n\nMã OTP này có hiệu lực trong vòng 10 phút.`,
      html: `<p>Xin chào <strong>${customer.full_name}</strong>,</p><p>Mã OTP để lấy lại mã tra cứu của bạn là: <strong style="font-size: 18px; color: #10b981;">${otp}</strong></p><p>Mã OTP này có hiệu lực trong vòng 10 phút.</p>`,
    });

    res.json({ message: 'Mã xác nhận OTP đã được gửi về email của bạn.' });
  } catch (error) {
    next(error);
  }
});

router.post('/lookups/verify', async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Thiếu Email hoặc mã OTP' });

    const customerRes = await query(
      'SELECT code, otp, otp_expiry FROM customer_lookups WHERE email = $1',
      [email.trim().toLowerCase()]
    );
    const customer = customerRes.rows[0];
    if (!customer) return res.status(404).json({ error: 'Không tìm thấy Email này' });

    if (customer.otp !== otp || new Date() > new Date(customer.otp_expiry)) {
      return res.status(400).json({ error: 'Mã OTP không chính xác hoặc đã hết hạn.' });
    }

    await query('UPDATE customer_lookups SET otp = NULL, otp_expiry = NULL WHERE email = $1', [email.trim().toLowerCase()]);

    res.json({ code: customer.code });
  } catch (error) {
    next(error);
  }
});

router.get('/lookups/search', async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Thiếu mã tra cứu' });

    const lookupRes = await query('SELECT * FROM customer_lookups WHERE code = $1', [code.trim().toUpperCase()]);
    const lookup = lookupRes.rows[0];
    if (!lookup) return res.status(404).json({ error: 'Không tìm thấy mã tra cứu này trên hệ thống.' });

    const ordersRes = await query(
      `SELECT o.*, 
              (SELECT json_agg(json_build_object('id', l.id, 'productId', l.product_id, 'productName', p.name, 'quantity', l.quantity, 'unitPrice', l.unit_price))
               FROM sales_order_lines l
               JOIN products p ON p.id = l.product_id
               WHERE l.order_id = o.id) as lines
       FROM sales_orders o
       WHERE o.lookup_code = $1
       ORDER BY o.created_at DESC`,
      [lookup.code]
    );

    res.json({
      customer: {
        fullName: lookup.full_name,
        email: lookup.email,
        phone: lookup.phone,
        status: lookup.status
      },
      orders: ordersRes.rows
    });
  } catch (error) {
    next(error);
  }
});

router.post('/lookups/pay', async (req, res, next) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'Thiếu ID đơn hàng' });

    const orderRes = await query('SELECT * FROM sales_orders WHERE id = $1', [orderId]);
    const order = orderRes.rows[0];
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });

    await query(
      `UPDATE sales_orders 
       SET is_paid = TRUE 
       WHERE id = $1`,
      [orderId]
    );

    res.json({ message: 'Thanh toán thành công!' });
  } catch (error) {
    next(error);
  }
});

// Xác nhận đơn miễn phí (admin xác nhận, gửi mail ngay, chuyển thẳng sang COMPLETED)
router.post('/orders/:id/confirm-free', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const orderRes = await query('SELECT * FROM sales_orders WHERE id = $1', [id]);
    const order = orderRes.rows[0];
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    if (order.package_type !== 'Miễn phí') return res.status(400).json({ error: 'Đơn này không phải gói miễn phí' });
    if (order.is_paid) return res.status(400).json({ error: 'Đơn hàng đã được xác nhận rồi' });

    // Đánh dấu đã thanh toán (miễn phí) và hoàn thành luôn
    await query(
      `UPDATE sales_orders SET is_paid = TRUE, status = 'COMPLETED', completed_at = NOW() WHERE id = $1`,
      [id]
    );

    // Gửi email ngay cho khách
    const lookupRes = await query('SELECT * FROM customer_lookups WHERE code = $1', [order.lookup_code]);
    const lookup = lookupRes.rows[0];
    if (lookup && lookup.email) {
      const { sendEmail } = require('../services/email');
      const orderNoText = order.order_no;
      const emailSubject = `[HoangKiet] Cập nhật thông tin đơn hàng ${orderNoText}`;

      const textMail = `Xin chào ${lookup.full_name} với mã tra cứu ${lookup.code},\n\n` +
        `Chúng tôi đã nhận được đăng ký gói ảnh miễn phí của bạn và đơn hàng ${orderNoText} đã hoàn thành!\n\n` +
        `Link Drive: ${order.drive_link || 'Chưa cung cấp'}\n` +
        `Mật khẩu Drive: ${order.drive_password || 'Không có'}\n\n` +
        `Chúc bạn luôn có những bức ảnh đẹp nhất và ngập tràn niềm vui!\n` +
        `Trân trọng,\nBan quản trị hệ thống.`;

      const htmlMail = `<div style="font-family: sans-serif; line-height: 1.6; color: #333;">` +
        `<p>Xin chào <strong>${lookup.full_name}</strong> với mã tra cứu <strong>${lookup.code}</strong>,</p>` +
        `<p>Chúng tôi đã nhận được thông tin <strong>đăng ký gói ảnh miễn phí</strong> của bạn và đơn hàng <strong>${orderNoText}</strong> đã hoàn thành!</p>` +
        (order.drive_link ? `<p><strong>Link Drive tải ảnh:</strong> <a href="${order.drive_link}" style="color: #10b981; font-weight: bold; text-decoration: underline;">lấy ảnh ở Drive</a></p>` : '') +
        `<p><strong>Mật khẩu:</strong> <code style="background: #f4f6f1; padding: 2px 6px; border-radius: 4px;">${order.drive_password || 'Không có'}</code></p>` +
        `<br/>` +
        `<p style="font-style: italic; color: #555;">Chúc bạn luôn có những bức ảnh đẹp nhất và ngập tràn niềm vui!</p>` +
        `<p>Trân trọng,<br/><strong>Ban quản trị HoangKiet</strong></p>` +
        `</div>`;

      await sendEmail({ to: lookup.email, subject: emailSubject, text: textMail, html: htmlMail })
        .catch(err => console.error('Lỗi gửi email miễn phí:', err.message));
    }

    res.json({ message: 'Đã xác nhận và gửi email cho khách hàng thành công!' });
  } catch (error) {
    next(error);
  }
});

router.get('/orders/:id/payment-status', async (req, res, next) => {
  try {
    const result = await query("SELECT is_paid FROM sales_orders WHERE id = $1", [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    res.json({ isPaid: result.rows[0].is_paid });
  } catch (error) {
    next(error);
  }
});

router.get('/public-config', (req, res) => {
  res.json({
    bankBrand: process.env.SEPAY_BANK_BRAND || 'TCB',
    accountNo: process.env.SEPAY_ACCOUNT_NO || '3624081006',
    accountName: process.env.SEPAY_ACCOUNT_NAME || 'HOANG ANH KIET'
  });
});

router.post('/sepay/webhook', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
    const expectedToken = process.env.SEPAY_WEBHOOK_TOKEN;
    if (expectedToken && token !== expectedToken) {
      return res.status(401).json({ error: 'Unauthorized: Invalid webhook token' });
    }

    const { transactionContent, amountIn } = req.body;
    if (!transactionContent) {
      return res.status(400).json({ error: 'Missing transactionContent' });
    }

    const cleanContent = transactionContent.toUpperCase().replace(/[^A-Z0-9-]/g, ' ');
    const tokens = cleanContent.split(/\s+/).filter(Boolean);

    let matchedOrdersList = [];

    // 1. Thử khớp mã đơn hàng (e.g. HK-XXXX)
    for (const t of tokens) {
      if (t.startsWith('HK-')) {
        const orderRes = await query("SELECT * FROM sales_orders WHERE UPPER(order_no) = $1 AND is_paid = FALSE", [t]);
        if (orderRes.rows[0]) {
          matchedOrdersList.push(orderRes.rows[0]);
          break;
        }
      }
    }

    // 2. Nếu không khớp mã đơn, thử khớp với mã tra cứu khách hàng (e.g. HU8WAD)
    if (matchedOrdersList.length === 0) {
      for (const t of tokens) {
        if (t.length === 6) {
          const lookupRes = await query("SELECT * FROM customer_lookups WHERE UPPER(code) = $1", [t]);
          if (lookupRes.rows[0]) {
            const ordersRes = await query("SELECT * FROM sales_orders WHERE lookup_code = $1 AND is_paid = FALSE", [t]);
            matchedOrdersList = ordersRes.rows;
            break;
          }
        }
      }
    }

    if (matchedOrdersList.length === 0) {
      return res.json({ status: 'ignored', message: 'No matching unpaid order or lookup code found in content' });
    }

    for (const order of matchedOrdersList) {
      await query(
        `UPDATE sales_orders 
         SET is_paid = TRUE 
         WHERE id = $1`,
        [order.id]
      );
    }

    res.json({ status: 'success', updated_count: matchedOrdersList.length });
  } catch (error) {
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
    const [pendingPaymentRes, pendingEmailRes, historyRes] = await Promise.all([
      query("SELECT COUNT(*)::int AS count FROM sales_orders WHERE is_paid = FALSE AND status NOT IN ('COMPLETED', 'CANCELLED')"),
      query("SELECT COUNT(*)::int AS count FROM sales_orders WHERE is_paid = TRUE AND status NOT IN ('COMPLETED', 'CANCELLED')"),
      query("SELECT COUNT(*)::int AS count FROM sales_orders WHERE status IN ('COMPLETED', 'CANCELLED')")
    ]);
    res.json({
      pendingPayment: pendingPaymentRes.rows[0].count,
      pendingEmail: pendingEmailRes.rows[0].count,
      historyOrders: historyRes.rows[0].count
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

router.get('/receipts', requireRole('ADMIN', 'QUANLY', 'NHANVIEN'), async (req, res, next) => {
  try {
    const result = await query(`
      SELECT r.*, w.code AS warehouse_code, w.name AS warehouse_name,
             COALESCE(SUM(l.quantity), 0)::bigint AS total_quantity
      FROM inbound_receipts r
      JOIN warehouses w ON w.id = r.warehouse_id
      LEFT JOIN inbound_receipt_lines l ON l.receipt_id = r.id
      GROUP BY r.id, w.id
      ORDER BY r.created_at DESC
    `);
    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get('/receipts/:id', requireRole('ADMIN', 'QUANLY', 'NHANVIEN'), async (req, res, next) => {
  try {
    const receiptRes = await query(`
      SELECT r.*, w.code AS warehouse_code, w.name AS warehouse_name
      FROM inbound_receipts r
      JOIN warehouses w ON w.id = r.warehouse_id
      WHERE r.id = $1
    `, [req.params.id]);
    
    if (receiptRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy phiếu nhập' });
    }
    
    const linesRes = await query(`
      SELECT l.*, p.code AS product_code, p.name AS product_name, p.unit
      FROM inbound_receipt_lines l
      JOIN products p ON p.id = l.product_id
      WHERE l.receipt_id = $1
      ORDER BY l.id
    `, [req.params.id]);
    
    res.json({
      data: {
        ...receiptRes.rows[0],
        lines: linesRes.rows
      }
    });
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

router.post('/orders/lookup-create', requireRole('ADMIN', 'QUANLY'), async (req, res, next) => {
  try {
    const { lookupCode, driveLink, drivePassword, price, packageType, notes, productName, linkProvisionTime, previewImage } = req.body;
    if (!lookupCode) return res.status(400).json({ error: 'Thiếu mã tra cứu của khách hàng' });
    if (!productName) return res.status(400).json({ error: 'Thiếu tên sản phẩm' });

    const lookupRes = await query('SELECT * FROM customer_lookups WHERE code = $1', [lookupCode.trim().toUpperCase()]);
    const lookup = lookupRes.rows[0];
    if (!lookup) return res.status(400).json({ error: 'Mã tra cứu không tồn tại trên hệ thống' });

    let cRes = await query(`SELECT id FROM customers WHERE code = 'WEB_GUEST'`);
    if (cRes.rows.length === 0) {
      cRes = await query(`INSERT INTO customers(code, name, address, phone) VALUES ('WEB_GUEST', 'Khách Đặt Web', 'Hệ thống tự tạo', '000') RETURNING id`);
    }
    const customerId = cRes.rows[0].id;
    
    const wRes = await query(`SELECT id FROM warehouses LIMIT 1`);
    if (wRes.rows.length === 0) return res.status(400).json({ error: 'Hệ thống chưa cấu hình kho xử lý' });
    const warehouseId = wRes.rows[0].id;

    const cleanProdName = removeVietnameseTones(productName);
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderNo = `HK-${cleanProdName}${randomStr}`;
    const orderStatus = 'DRAFT';

    // Tính ngày hết hạn và hạn cấp lại từ thời gian cấp link (nếu có)
    let provisionTime = null, expiryDate = null, reprovisionExpiryDate = null;
    if (linkProvisionTime) {
      provisionTime = new Date(linkProvisionTime);
      expiryDate = new Date(provisionTime);
      expiryDate.setMonth(expiryDate.getMonth() + 3);
      reprovisionExpiryDate = new Date(expiryDate);
      reprovisionExpiryDate.setDate(reprovisionExpiryDate.getDate() + 15);
    }
    
    const orderResult = await query(
      `INSERT INTO sales_orders(
         order_no, customer_id, warehouse_id, delivery_address, status, created_by, notes,
         lookup_code, drive_link, drive_password, price, package_type, is_web_order, folder_name,
         link_provision_time, expiry_date, reprovision_expiry_date, preview_image
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE, $13, $14, $15, $16, $17) RETURNING *`,
      [
        orderNo, customerId, warehouseId,
        `[${lookup.full_name}] - SĐT: ${lookup.phone || 'Chưa có'} - Email: ${lookup.email}`,
        orderStatus, req.user.username, notes || '',
        lookup.code, driveLink || '', drivePassword || '',
        packageType === 'Miễn phí' ? 0 : Number(price || 0),
        packageType || 'Trả phí',
        productName,
        provisionTime, expiryDate, reprovisionExpiryDate,
        previewImage || null
      ]
    );

    res.status(201).json({ message: 'Tạo đơn hàng tra cứu thành công!', data: orderResult.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.get('/lookups', requireRole('ADMIN', 'QUANLY'), async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM customer_lookups ORDER BY created_at DESC');
    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.delete('/lookups/:id', requireRole('ADMIN', 'QUANLY'), async (req, res, next) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM customer_lookups WHERE id = $1', [id]);
    res.json({ message: 'Đã xóa mã tra cứu của khách hàng.' });
  } catch (error) {
    next(error);
  }
});

router.put('/lookups/:id/change-code', requireRole('ADMIN', 'QUANLY'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const lookupRes = await query('SELECT code FROM customer_lookups WHERE id = $1', [id]);
    const lookup = lookupRes.rows[0];
    if (!lookup) return res.status(404).json({ error: 'Không tìm thấy thông tin khách hàng' });

    let newCode;
    let attempts = 0;
    while (attempts < 10) {
      newCode = generateRandomCode(6);
      const dup = await query('SELECT id FROM customer_lookups WHERE code = $1', [newCode]);
      if (dup.rows.length === 0) break;
      attempts++;
    }

    const oldCode = lookup.code;

    const { transaction: dbTransaction } = require('../config/db');
    await dbTransaction(async (client) => {
      await client.query('UPDATE customer_lookups SET code = $1 WHERE id = $2', [newCode, id]);
      await client.query('UPDATE sales_orders SET lookup_code = $1 WHERE lookup_code = $2', [newCode, oldCode]);
    });

    res.json({ message: `Đã đổi mã tra cứu từ "${oldCode}" sang "${newCode}" thành công!`, newCode });
  } catch (error) {
    next(error);
  }
});

router.put('/orders/:id/lookup-update', requireRole('ADMIN', 'QUANLY'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      folderName,
      lookupStatus,
      linkStatus,
      packageType,
      linkProvisionTime,
      driveLink,
      drivePassword,
      previewImage,
      notes
    } = req.body;

    const orderRes = await query('SELECT * FROM sales_orders WHERE id = $1', [id]);
    const order = orderRes.rows[0];
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });

    let provisionTime = linkProvisionTime ? new Date(linkProvisionTime) : null;
    let expiryDate = null;
    let reprovisionExpiryDate = null;

    if (provisionTime && !isNaN(provisionTime.getTime())) {
      expiryDate = new Date(provisionTime);
      expiryDate.setMonth(expiryDate.getMonth() + 3);

      reprovisionExpiryDate = new Date(expiryDate);
      reprovisionExpiryDate.setDate(reprovisionExpiryDate.getDate() + 15);
    }

    await query(
      `UPDATE sales_orders
       SET folder_name = $1,
           lookup_status = $2,
           link_status = $3,
           package_type = $4,
           link_provision_time = $5,
           expiry_date = $6,
           reprovision_expiry_date = $7,
           drive_link = $8,
           drive_password = $9,
           preview_image = $10,
           notes = $11,
           status = 'COMPLETED',
           completed_at = NOW()
       WHERE id = $12`,
      [
        folderName,
        lookupStatus || 'Bình thường',
        linkStatus || 'Đang xem xét',
        packageType || 'Trả phí',
        provisionTime,
        expiryDate,
        reprovisionExpiryDate,
        driveLink || order.drive_link,
        drivePassword || order.drive_password,
        previewImage || order.preview_image,
        notes || order.notes,
        id
      ]
    );

    const lookupRes = await query('SELECT * FROM customer_lookups WHERE code = $1', [order.lookup_code]);
    const lookup = lookupRes.rows[0];

    if (lookup) {
      const { sendEmail } = require('../services/email');
      
      const isFree = packageType === 'Miễn phí';
      const paymentStatus = isFree ? 'đăng ký gói ảnh miễn phí' : 'thanh toán gói ảnh';
      const orderNoText = order.order_no;

      const emailSubject = `[HoangKiet] Cập nhật thông tin đơn hàng ${orderNoText}`;
      
      const textMail = `Xin chào ${lookup.full_name} với mã tra cứu ${lookup.code},\n\n` +
        `Chúng tôi đã nhận được thông tin ${paymentStatus} của bạn và đơn hàng ${orderNoText} đã hoàn thành!\n\n` +
        (previewImage ? `[Ảnh xem trước đính kèm trong email]\n\n` : '') +
        `Link Drive: ${driveLink || order.drive_link || 'Chưa cung cấp'}\n` +
        `Mật khẩu Drive: ${drivePassword || order.drive_password || 'Không có'}\n\n` +
        `Chúc bạn luôn có những bức ảnh đẹp nhất và ngập tràn niềm vui!\n` +
        `Trân trọng,\nBan quản trị hệ thống.`;

      let previewHtml = '';
      if (previewImage) {
        previewHtml = `<div style="margin: 20px 0;"><img src="${previewImage}" alt="Ảnh xem trước" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" /></div>`;
      }

      const htmlMail = `<div style="font-family: sans-serif; line-height: 1.6; color: #333;">` +
        `<p>Xin chào <strong>${lookup.full_name}</strong> với mã tra cứu <strong>${lookup.code}</strong>,</p>` +
        `<p>Chúng tôi đã nhận được thông tin <strong>${paymentStatus}</strong> của bạn và đơn hàng <strong>${orderNoText}</strong> đã hoàn thành!</p>` +
        `<h3>Ảnh xem trước của bạn:</h3>` +
        previewHtml +
        `<p><strong>Link Drive tải ảnh:</strong> <a href="${driveLink || order.drive_link}" style="color: #10b981; font-weight: bold; text-decoration: underline;">lấy ảnh ở Drive</a></p>` +
        `<p><strong>Mật khẩu:</strong> <code style="background: #f4f6f1; padding: 2px 6px; border-radius: 4px;">${drivePassword || order.drive_password || 'Không có'}</code></p>` +
        `<br/>` +
        `<p style="font-style: italic; color: #555;">Chúc bạn luôn có những bức ảnh đẹp nhất và ngập tràn niềm vui!</p>` +
        `<p>Trân trọng,<br/><strong>Ban quản trị HoangKiet</strong></p>` +
        `</div>`;

      await sendEmail({
        to: lookup.email,
        subject: emailSubject,
        text: textMail,
        html: htmlMail
      }).catch(err => console.error('Failed to send update lookup email:', err.message));
    }

    res.json({ message: 'Cập nhật đơn hàng thành công và đã gửi email cho khách!' });
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
  const { id } = req.params;
  try {
    const order = await query('SELECT status FROM sales_orders WHERE id = $1', [id]);
    if (!order.rows[0]) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    
    const issueRes = await query('SELECT id FROM stock_issues WHERE order_id = $1', [id]);
    if (issueRes.rows[0]) {
      const issueId = issueRes.rows[0].id;
      await query('DELETE FROM stock_issue_lines WHERE issue_id = $1', [issueId]);
      await query('DELETE FROM stock_issues WHERE id = $1', [issueId]);
    }
    
    await query('DELETE FROM sales_orders WHERE id = $1', [id]);
    res.json({ message: 'Đã xóa đơn hàng thành công!' });
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
