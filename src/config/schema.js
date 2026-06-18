const bcrypt = require('bcryptjs');
const { query } = require('./db');

const roles = ['ADMIN', 'QUANLY', 'NHANVIEN', 'KHACH'];

async function initDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL chưa được cấu hình. Hãy dùng Neon connection string trong .env hoặc Render Environment.');
  }

  if (process.env.RESET_DB === 'true') {
    console.log('🔄 Đang dọn dẹp và Reset Database cũ...');
    await query(`
      DROP TABLE IF EXISTS stock_movements, stock_issue_lines, stock_issues,
      sales_order_lines, sales_orders, inbound_receipt_lines, inbound_receipts,
      inventory, users, warehouses, customers, products CASCADE;
    `);
  }

  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id BIGSERIAL PRIMARY KEY,
      code VARCHAR(40) NOT NULL UNIQUE,
      name VARCHAR(180) NOT NULL,
      unit VARCHAR(40) NOT NULL,
      category VARCHAR(120),
      reference_price NUMERIC(18,2) NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  
  // Tự động thêm cột ảnh sản phẩm nếu chưa có
  await query('ALTER TABLE products ADD COLUMN IF NOT EXISTS image TEXT');
  await query('ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT');

  await query(`
    CREATE TABLE IF NOT EXISTS customers (
      id BIGSERIAL PRIMARY KEY,
      code VARCHAR(40) NOT NULL UNIQUE,
      name VARCHAR(180) NOT NULL,
      address VARCHAR(400),
      phone VARCHAR(40),
      contact_person VARCHAR(120),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS warehouses (
      id BIGSERIAL PRIMARY KEY,
      code VARCHAR(40) NOT NULL UNIQUE,
      name VARCHAR(180) NOT NULL,
      address VARCHAR(400),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username VARCHAR(60) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name VARCHAR(140),
      role VARCHAR(30) NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Tự động thêm cột avatar nếu chưa có
  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT');
  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)');
  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT');
  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)');

  await query(`
    CREATE TABLE IF NOT EXISTS inventory (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL REFERENCES products(id),
      warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
      quantity BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(product_id, warehouse_id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS inbound_receipts (
      id BIGSERIAL PRIMARY KEY,
      receipt_no VARCHAR(40) NOT NULL UNIQUE,
      warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
      source_factory VARCHAR(180),
      status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
      created_by VARCHAR(80),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      confirmed_at TIMESTAMPTZ
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS inbound_receipt_lines (
      id BIGSERIAL PRIMARY KEY,
      receipt_id BIGINT NOT NULL REFERENCES inbound_receipts(id) ON DELETE CASCADE,
      product_id BIGINT NOT NULL REFERENCES products(id),
      quantity BIGINT NOT NULL CHECK (quantity > 0)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS sales_orders (
      id BIGSERIAL PRIMARY KEY,
      order_no VARCHAR(40) NOT NULL UNIQUE,
      customer_id BIGINT NOT NULL REFERENCES customers(id),
      warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
      delivery_address VARCHAR(400),
      status VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
      created_by VARCHAR(80),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      submitted_at TIMESTAMPTZ,
      logistics_received_at TIMESTAMPTZ,
      warehouse_processing_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      cancelled_at TIMESTAMPTZ
    )
  `);

  // Thêm các cột phục vụ Đơn hàng Online từ Web
  await query('ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS is_web_order BOOLEAN DEFAULT FALSE');
  await query('ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS tracking_code VARCHAR(100)');
  await query('ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMPTZ');

  await query(`
    CREATE TABLE IF NOT EXISTS sales_order_lines (
      id BIGSERIAL PRIMARY KEY,
      order_id BIGINT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
      product_id BIGINT NOT NULL REFERENCES products(id),
      quantity BIGINT NOT NULL CHECK (quantity > 0),
      unit_price NUMERIC(18,2) NOT NULL DEFAULT 0
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS stock_issues (
      id BIGSERIAL PRIMARY KEY,
      issue_no VARCHAR(40) NOT NULL UNIQUE,
      order_id BIGINT NOT NULL UNIQUE REFERENCES sales_orders(id),
      warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
      confirmed_by VARCHAR(80),
      confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS stock_issue_lines (
      id BIGSERIAL PRIMARY KEY,
      issue_id BIGINT NOT NULL REFERENCES stock_issues(id) ON DELETE CASCADE,
      product_id BIGINT NOT NULL REFERENCES products(id),
      quantity BIGINT NOT NULL CHECK (quantity > 0)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id BIGSERIAL PRIMARY KEY,
      type VARCHAR(30) NOT NULL,
      product_id BIGINT NOT NULL REFERENCES products(id),
      warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
      quantity BIGINT NOT NULL CHECK (quantity > 0),
      document_no VARCHAR(40) NOT NULL,
      partner_name VARCHAR(180),
      movement_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by VARCHAR(80)
    )
  `);

  await query('CREATE INDEX IF NOT EXISTS idx_stock_movements_type_date ON stock_movements(type, movement_at)');
  await query('CREATE INDEX IF NOT EXISTS idx_orders_status ON sales_orders(status)');
  await query('CREATE INDEX IF NOT EXISTS idx_receipts_status ON inbound_receipts(status)');

  if (process.env.APP_SEED !== 'false') {
    await seedData();
  }
}

async function seedData() {
  await seedUser('admin', 'admin123', 'Quản trị tối cao', 'ADMIN');
  await seedUser('quanly', 'quanly123', 'Quản lý cửa hàng', 'QUANLY');
  await seedUser('nhanvien', 'nhanvien123', 'Nhân viên vận hành', 'NHANVIEN');

  await query(
    `INSERT INTO products(code, name, unit, category, reference_price)
     VALUES
      ('SP001', 'Áo thun nữ basic', 'cái', 'Thời trang', 120000),
      ('SP002', 'Váy công sở', 'cái', 'Thời trang', 350000),
      ('SP003', 'Túi canvas', 'cái', 'Phụ kiện', 90000)
     ON CONFLICT (code) DO NOTHING`
  );

  await query(
    `INSERT INTO customers(code, name, address, phone, contact_person)
     VALUES
      ('KH001', 'Công ty Minh Anh', 'Quận 1, TP.HCM', '0909000001', 'Chị Anh'),
      ('KH002', 'Shop Hoa Nắng', 'Hà Nội', '0909000002', 'Anh Nam')
     ON CONFLICT (code) DO NOTHING`
  );

  await query(
    `INSERT INTO warehouses(code, name, address)
     VALUES ('KHO-HCM', 'Kho thành phẩm Hồ Chí Minh', 'Khu công nghiệp Tân Bình')
     ON CONFLICT (code) DO NOTHING`
  );
}

async function seedUser(username, password, fullName, role) {
  if (!roles.includes(role)) {
    throw new Error(`Role không hợp lệ: ${role}`);
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await query(
    `INSERT INTO users(username, password_hash, full_name, role, enabled)
     VALUES ($1, $2, $3, $4, TRUE)
     ON CONFLICT (username) DO NOTHING`,
    [username, passwordHash, fullName, role]
  );
}

module.exports = {
  initDb,
};
