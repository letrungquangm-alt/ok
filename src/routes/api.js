const express = require('express');
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

router.use(requireAuth);

router.get('/health', (req, res) => {
  res.json({ ok: true, user: req.session.user });
});

router.get('/products', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM products ORDER BY code');
    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/products', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const result = await query(
      `INSERT INTO products(code, name, unit, category, reference_price, active)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6, TRUE))
       RETURNING *`,
      [
        String(req.body.code || '').trim().toUpperCase(),
        req.body.name,
        req.body.unit,
        req.body.category || '',
        Number(req.body.reference_price || 0),
        req.body.active,
      ]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
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

router.post('/receipts', requireRole('ADMIN', 'FACTORY', 'WAREHOUSE'), async (req, res, next) => {
  try {
    const receipt = await createReceipt({
      warehouseId: Number(req.body.warehouse_id || req.body.warehouseId),
      sourceFactory: req.body.source_factory || req.body.sourceFactory || '',
      lines: req.body.lines || [],
      username: req.session.user.username,
      confirmNow: Boolean(req.body.confirm_now || req.body.confirmNow),
    });
    res.status(201).json({ data: receipt });
  } catch (error) {
    next(error);
  }
});

router.post('/receipts/:id/confirm', requireRole('ADMIN', 'FACTORY', 'WAREHOUSE'), async (req, res, next) => {
  try {
    const receipt = await confirmReceipt(req.params.id, req.session.user.username);
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

router.post('/orders', requireRole('ADMIN', 'SALES'), async (req, res, next) => {
  try {
    const order = await createOrder({
      customerId: Number(req.body.customer_id || req.body.customerId),
      warehouseId: Number(req.body.warehouse_id || req.body.warehouseId),
      deliveryAddress: req.body.delivery_address || req.body.deliveryAddress || '',
      notes: req.body.notes || '',
      lines: req.body.lines || [],
      username: req.session.user.username,
      submitNow: Boolean(req.body.submit_now || req.body.submitNow),
    });
    res.status(201).json({ data: order });
  } catch (error) {
    next(error);
  }
});

router.post('/orders/:id/submit', requireRole('ADMIN', 'SALES'), apiOrderAction((id) => transitionOrder(id, STATUS.DRAFT, STATUS.SUBMITTED, 'submitted_at')));
router.post('/orders/:id/logistics-receive', requireRole('ADMIN', 'LOGISTICS'), apiOrderAction((id) => transitionOrder(id, STATUS.SUBMITTED, STATUS.LOGISTICS_RECEIVED, 'logistics_received_at')));
router.post('/orders/:id/send-warehouse', requireRole('ADMIN', 'LOGISTICS'), apiOrderAction((id) => transitionOrder(id, STATUS.LOGISTICS_RECEIVED, STATUS.WAREHOUSE_PROCESSING, 'warehouse_processing_at')));
router.post('/orders/:id/complete', requireRole('ADMIN', 'WAREHOUSE'), apiOrderAction((id, req) => completeOrder(id, req.session.user.username)));
router.post('/orders/:id/cancel', requireRole('ADMIN', 'SALES'), apiOrderAction((id) => cancelOrder(id)));

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
