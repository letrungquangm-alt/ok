-- Mật khẩu mặc định khởi tạo qua Server là: admin123 (cho admin), quanly123 (cho quanly), nhanvien123 (cho nhanvien).
-- Nếu nạp trực tiếp qua seed.sql, mật khẩu là: 123456
INSERT INTO users(username, password_hash, full_name, role, enabled)
VALUES 
('admin', '$2a$10$Y1/L.w.K1G0fXzJbV.K8U.0gM/Kx7B5T9.ZpY.w8Z4lO0n3nL1G2u', 'Quản trị hệ thống', 'ADMIN', TRUE),
('sales', '$2a$10$Y1/L.w.K1G0fXzJbV.K8U.0gM/Kx7B5T9.ZpY.w8Z4lO0n3nL1G2u', 'Nhân viên sales', 'SALES', TRUE),
('logistics', '$2a$10$Y1/L.w.K1G0fXzJbV.K8U.0gM/Kx7B5T9.ZpY.w8Z4lO0n3nL1G2u', 'Điều phối logistics', 'LOGISTICS', TRUE),
('warehouse', '$2a$10$Y1/L.w.K1G0fXzJbV.K8U.0gM/Kx7B5T9.ZpY.w8Z4lO0n3nL1G2u', 'Thủ kho', 'WAREHOUSE', TRUE),
('factory', '$2a$10$Y1/L.w.K1G0fXzJbV.K8U.0gM/Kx7B5T9.ZpY.w8Z4lO0n3nL1G2u', 'Nhà máy', 'FACTORY', TRUE)
ON CONFLICT (username) DO NOTHING;

INSERT INTO warehouses(code, name, address)
VALUES 
('KHO_HE_THONG', 'Kho Hệ Thống', 'Hệ thống tự động')
ON CONFLICT (code) DO NOTHING;