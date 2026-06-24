CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  unit VARCHAR(40) NOT NULL,
  category VARCHAR(120),
  reference_price NUMERIC(18,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  address VARCHAR(400),
  phone VARCHAR(40),
  contact_person VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouses (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  address VARCHAR(400),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(60) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(140),
  role VARCHAR(30) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
  quantity BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS inbound_receipts (
  id BIGSERIAL PRIMARY KEY,
  receipt_no VARCHAR(40) NOT NULL UNIQUE,
  warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
  source_factory VARCHAR(180),
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  created_by VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS inbound_receipt_lines (
  id BIGSERIAL PRIMARY KEY,
  receipt_id BIGINT NOT NULL REFERENCES inbound_receipts(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  quantity BIGINT NOT NULL CHECK (quantity > 0)
);
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
);

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
  cancelled_at TIMESTAMPTZ,
  is_web_order BOOLEAN DEFAULT FALSE,
  tracking_code VARCHAR(100),
  estimated_delivery TIMESTAMPTZ,
  lookup_code VARCHAR(40) REFERENCES customer_lookups(code),
  drive_link TEXT,
  drive_password VARCHAR(100),
  price NUMERIC(18,2),
  folder_name VARCHAR(255),
  lookup_status VARCHAR(50) DEFAULT 'Bình thường',
  link_status VARCHAR(50) DEFAULT 'Đang xem xét',
  package_type VARCHAR(30) DEFAULT 'Trả phí',
  link_provision_time TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  reprovision_expiry_date TIMESTAMPTZ,
  preview_image TEXT,
  is_paid BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sales_order_lines (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  quantity BIGINT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(18,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stock_issues (
  id BIGSERIAL PRIMARY KEY,
  issue_no VARCHAR(40) NOT NULL UNIQUE,
  order_id BIGINT NOT NULL UNIQUE REFERENCES sales_orders(id),
  warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
  confirmed_by VARCHAR(80),
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_issue_lines (
  id BIGSERIAL PRIMARY KEY,
  issue_id BIGINT NOT NULL REFERENCES stock_issues(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  quantity BIGINT NOT NULL CHECK (quantity > 0)
);

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
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_type_date ON stock_movements(type, movement_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON inbound_receipts(status);