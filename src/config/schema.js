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
    CREATE TABLE IF NOT EXISTS customer_lookups (
      id BIGSERIAL PRIMARY KEY,
      code VARCHAR(40) NOT NULL UNIQUE,
      full_name VARCHAR(180) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(40),
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      otp VARCHAR(10),
      otp_expiry TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

  await query('ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS is_web_order BOOLEAN DEFAULT FALSE');
  await query('ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS tracking_code VARCHAR(100)');
  await query('ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMPTZ');
  await query('ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS lookup_code VARCHAR(40) REFERENCES customer_lookups(code)');
  await query('ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS drive_link TEXT');
  await query('ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS drive_password VARCHAR(100)');
  await query('ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS price NUMERIC(18,2)');
  await query('ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS folder_name VARCHAR(255)');
  await query("ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS lookup_status VARCHAR(50) DEFAULT 'Bình thường'");
  await query("ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS link_status VARCHAR(50) DEFAULT 'Đang xem xét'");
  await query("ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS package_type VARCHAR(30) DEFAULT 'Trả phí'");
  await query('ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS link_provision_time TIMESTAMPTZ');
  await query('ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ');
  await query('ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS reprovision_expiry_date TIMESTAMPTZ');
  await query('ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS preview_image TEXT');
  await query('ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE');

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

  await query(`
    CREATE TABLE IF NOT EXISTS sent_emails (
      id BIGSERIAL PRIMARY KEY,
      to_email VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      body TEXT,
      html_body TEXT,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS web_settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  const defaultSettings = [
    { key: 'site_title', value: 'HoangKiet - Tra cứu thông tin gói ảnh' },
    { key: 'display_name', value: 'Kiet Hoang Photography' },
    { key: 'sub_heading', value: 'Chuyên chụp ảnh chân dung, phong cảnh, kỷ yếu' },
    { key: 'description', value: 'Chào mừng bạn đã đến với Website của Kiet Hoang Photography! Nơi lưu giữ những khung hình cảm xúc, chất lượng hình ảnh nghệ thuật đỉnh cao và chuyên nghiệp nhất.' },
    { key: 'announcement', value: '[Update 12/06/2026] Bắt đầu tính phí gói ảnh ở tất cả các thể loại chụp/quay.' },
    { key: 'phone', value: '0703.01.2959' },
    { key: 'facetime', value: '0703.01.2959 (Audio Only)' },
    { key: 'email_subject', value: '[HoangKiet] Cập nhật thông tin đơn hàng {order_no}' },
    { key: 'email_from_name', value: 'HoangKiet' },
    { key: 'email_footer', value: 'Đây là email tự động gửi từ hệ thống HoangKiet Photography.\nVui lòng không trả lời trực tiếp email này.' },
    { key: 'email_body', value: `Xin chào {full_name} với mã tra cứu {lookup_code},

Chúng tôi đã nhận được thông tin {payment_status} của bạn và đơn hàng {order_no} đã hoàn thành!

{preview_image}

Dưới đây là toàn bộ gói ảnh của bạn:
Link Drive tải ảnh: {drive_link}
Mật khẩu: {drive_password}

Chúc bạn luôn có những bức ảnh đẹp nhất và ngập tràn niềm vui!

Trân trọng,
Ban quản trị HoangKiet` },
    { key: 'slides', value: JSON.stringify([
      { title: 'ẢNH CHÂN DUNG', desc: 'Lưu giữ những khoảnh khắc chân thực, thần thái tự nhiên và sắc nét nhất của bạn.', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80' },
      { title: 'ẢNH PHONG CẢNH', desc: 'Bản hòa ca của ánh sáng và thiên nhiên hùng vĩ qua góc nhìn nghệ thuật đặc trưng.', image: 'https://images.unsplash.com/photo-1472214222541-d510753a49f8?auto=format&fit=crop&w=800&q=80' },
      { title: 'ẢNH KỶ YẾU', desc: 'Gói trọn thanh xuân và những nụ cười rực rỡ nhất dưới mái trường thân yêu.', image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80' },
      { title: 'ẢNH ĐÁM CƯỚI', desc: 'Ghi dấu câu chuyện tình yêu ngọt ngào, khoảnh khắc thiêng liêng trong ngày trọng đại.', image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80' },
      { title: 'ẢNH ĐƯỜNG PHỐ', desc: 'Hơi thở cuộc sống thường nhật, góc phố quen thuộc qua lăng kính đầy chất thơ.', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80' },
      { title: 'ẢNH NGHỆ THUẬT', desc: 'Sáng tạo không giới hạn với những góc máy độc lạ và ý tưởng nghệ thuật phá cách.', image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80' },
      { title: 'ẢNH SỰ KIỆN', desc: 'Bắt trọn không khí sôi động, chuyên nghiệp và đầy cảm xúc của mọi sự kiện.', image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80' },
      { title: 'ẢNH GIA ĐÌNH', desc: 'Lưu giữ khoảnh khắc sum vầy ấm áp, gắn kết tình thân gia đình qua năm tháng.', image: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=800&q=80' },
      { title: 'ẢNH DÃ NGOẠI', desc: 'Hành trình khám phá những vùng đất mới, lưu lại dấu chân tự do và phóng khoáng.', image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80' },
      { title: 'ẢNH PHÒNG CHỤP', desc: 'Chuyên nghiệp trong từng set ánh sáng, làm nổi bật phong thái cá nhân tối đa.', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80' }
    ]) }
  ];

  for (const s of defaultSettings) {
    await query(
      `INSERT INTO web_settings(key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
      [s.key, s.value]
    );
  }

  // Nếu trong database đang chứa code HTML cũ từ bản build trước, dọn dẹp và đưa về plain text mặc định
  const currentBodyRes = await query("SELECT value FROM web_settings WHERE key = 'email_body'");
  if (currentBodyRes.rows.length > 0 && currentBodyRes.rows[0].value.includes('<div style=')) {
    const plainTextDefault = `Xin chào {full_name} với mã tra cứu {lookup_code},

Chúng tôi đã nhận được thông tin {payment_status} của bạn và đơn hàng {order_no} đã hoàn thành!

{preview_image}

Dưới đây là toàn bộ gói ảnh của bạn:
Link Drive tải ảnh: {drive_link}
Mật khẩu: {drive_password}

Chúc bạn luôn có những bức ảnh đẹp nhất và ngập tràn niềm vui!

Trân trọng,
Ban quản trị HoangKiet`;
    await query("UPDATE web_settings SET value = $1 WHERE key = 'email_body'", [plainTextDefault]);
  }

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
