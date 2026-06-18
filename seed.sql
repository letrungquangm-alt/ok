-- Mật khẩu mặc định cho tất cả tài khoản bên dưới là: 123456 (đã được hash qua Bcrypt)
INSERT INTO users(username, password_hash, full_name, role, enabled)
VALUES 
('admin', '$2a$10$Y1/L.w.K1G0fXzJbV.K8U.0gM/Kx7B5T9.ZpY.w8Z4lO0n3nL1G2u', 'Quản trị hệ thống', 'ADMIN', TRUE),
('sales', '$2a$10$Y1/L.w.K1G0fXzJbV.K8U.0gM/Kx7B5T9.ZpY.w8Z4lO0n3nL1G2u', 'Nhân viên sales', 'SALES', TRUE),
('logistics', '$2a$10$Y1/L.w.K1G0fXzJbV.K8U.0gM/Kx7B5T9.ZpY.w8Z4lO0n3nL1G2u', 'Điều phối logistics', 'LOGISTICS', TRUE),
('warehouse', '$2a$10$Y1/L.w.K1G0fXzJbV.K8U.0gM/Kx7B5T9.ZpY.w8Z4lO0n3nL1G2u', 'Thủ kho', 'WAREHOUSE', TRUE),
('factory', '$2a$10$Y1/L.w.K1G0fXzJbV.K8U.0gM/Kx7B5T9.ZpY.w8Z4lO0n3nL1G2u', 'Nhà máy', 'FACTORY', TRUE)
ON CONFLICT (username) DO NOTHING;

INSERT INTO products(code, name, unit, category, reference_price)
VALUES
('SP001', 'Áo thun nữ basic', 'cái', 'Thời trang', 120000),
('SP002', 'Váy công sở', 'cái', 'Thời trang', 350000),
('SP003', 'Túi canvas', 'cái', 'Phụ kiện', 90000)
ON CONFLICT (code) DO NOTHING;

INSERT INTO customers(code, name, address, phone, contact_person)
VALUES
('KH001', 'Công ty Minh Anh', 'Quận 1, TP.HCM', '0909000001', 'Chị Anh'),
('KH002', 'Shop Hoa Nắng', 'Hà Nội', '0909000002', 'Anh Nam')
ON CONFLICT (code) DO NOTHING;

INSERT INTO warehouses(code, name, address)
VALUES 
('KHO-HCM', 'Kho thành phẩm Hồ Chí Minh', 'Khu công nghiệp Tân Bình')
ON CONFLICT (code) DO NOTHING;