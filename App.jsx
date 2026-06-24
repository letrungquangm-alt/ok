import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import LoginPage from './LoginPage';
import MainLayout from './MainLayout';
import ProfilePage from './ProfilePage';
import UsersPage from './UsersPage';
import CustomersPage from './CustomersPage';
import ShopPage from './ShopPage';
import OrdersPage from './OrdersPage';
import api from './api';
import { createPortal } from 'react-dom';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ pendingPayment: 0, pendingEmail: 0, historyOrders: 0 });

  // States cho modal tạo đơn hàng
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [lookups, setLookups] = useState([]);
  const [lookupCode, setLookupCode] = useState('');
  const [productName, setProductName] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [drivePassword, setDrivePassword] = useState('');
  const [price, setPrice] = useState('');
  const [displayPrice, setDisplayPrice] = useState('');
  const [packageType, setPackageType] = useState('Trả phí');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [linkProvisionTime, setLinkProvisionTime] = useState('');

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard');
      setStats(res.data);
    } catch (error) {
      console.error('Lỗi tải số liệu:', error);
    }
  };

  const fetchLookups = async () => {
    try {
      const res = await api.get('/lookups');
      setLookups(res.data.data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách mã tra cứu:', err);
    }
  };

  const handlePriceChange = (val) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) {
      setDisplayPrice('');
      setPrice('');
      return;
    }
    const num = parseInt(clean, 10);
    setPrice(num * 1000);
    setDisplayPrice(num.toLocaleString('vi-VN'));
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (showCreateOrderModal) {
      fetchLookups();
    }
  }, [showCreateOrderModal]);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      await api.post('/orders/lookup-create', {
        lookupCode,
        driveLink,
        drivePassword,
        price,
        packageType,
        notes,
        productName,
        linkProvisionTime
      });
      setSuccessMsg('Tạo đơn hàng thành công!');
      setLookupCode('');
      setProductName('');
      setDriveLink('');
      setDrivePassword('');
      setPrice('');
      setDisplayPrice('');
      setPackageType('Trả phí');
      setNotes('');
      setLinkProvisionTime('');
      fetchStats();
      setTimeout(() => setSuccessMsg(''), 3000);
      setShowCreateOrderModal(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi khi tạo đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section className="hero" style={{ display: 'block' }}>
        <div>
          <h1>Hệ thống Quản lý Đơn hàng & Tra cứu Gói ảnh</h1>
          <p>Hệ thống quản trị nội bộ dành cho Admin & Nhân viên: Tạo đơn hàng nhanh chóng, quản lý mã tra cứu khách hàng và tự động cập nhật liên kết tải ảnh.</p>
          <div className="hero-actions">
            <button className="btn primary" onClick={() => setShowCreateOrderModal(true)}>Tạo đơn hàng</button>
          </div>
        </div>
      </section>

      {successMsg && (
        <div className="panel page-transition" style={{ background: '#dfeee7', color: 'var(--green-2)', border: '1px solid #cce0d6', padding: '12px', marginBottom: '16px', fontWeight: 'bold' }}>
          ✓ {successMsg}
        </div>
      )}

      <section className="metrics" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <article className="metric" onClick={() => navigate('/orders', { state: { subTab: 'pending_payment' } })} style={{ cursor: 'pointer' }}>
          <span className="label">Đang chờ kích hoạt</span>
          <div className="value">{stats.pendingPayment || 0}</div>
          <div className="trend">Đơn chưa thanh toán</div>
        </article>
        <article className="metric" onClick={() => navigate('/orders', { state: { subTab: 'pending_email' } })} style={{ cursor: 'pointer' }}>
          <span className="label">Đang chờ gửi email</span>
          <div className="value">{stats.pendingEmail || 0}</div>
          <div className="trend">Đã thanh toán, chờ xử lý</div>
        </article>
        <article className="metric" onClick={() => navigate('/orders-history')} style={{ cursor: 'pointer' }}>
          <span className="label">Lịch sử đơn hàng</span>
          <div className="value">{stats.historyOrders || 0}</div>
          <div className="trend">Đã hoàn thành / hủy</div>
        </article>
      </section>

      {/* --- MODAL TẠO ĐƠN HÀNG TRA CỨU --- */}
      {showCreateOrderModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <form className="panel page-transition" style={{ width: '100%', maxWidth: '480px', padding: '24px', background: '#fff', maxHeight: '90vh', overflowY: 'auto' }} onSubmit={handleCreateOrder}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--line)', paddingBottom: '10px' }}>
              <h3 style={{ color: 'var(--green-2)', margin: 0 }}>Tạo đơn hàng tra cứu mới</h3>
              <button type="button" className="btn ghost" style={{ border: 'none', padding: '4px 8px', minHeight: 'auto', color: 'var(--muted)' }} onClick={() => setShowCreateOrderModal(false)}>✕</button>
            </div>

            {error && <div style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '12px', fontWeight: 'bold' }}>✕ {error}</div>}

            {/* Những trường này đã điền khi tạo → khóa lại */}
            <div style={{ marginBottom: '16px' }}>
              <span className="label">Tên sản phẩm / Gói ảnh</span>
              <input
                type="text"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }}
                placeholder="Nhập tên sản phẩm (Ví dụ: Goi Anh Cuoi)..."
                value={productName}
                onChange={e => setProductName(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <span className="label">Mã tra cứu khách hàng</span>
              <select
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', background: '#fff' }}
                value={lookupCode}
                onChange={e => setLookupCode(e.target.value)}
                required
              >
                <option value="" disabled>-- Chọn mã tra cứu --</option>
                {lookups.map(item => (
                  <option key={item.id} value={item.code}>
                    {item.code} - {item.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <span className="label">Gói ảnh</span>
                <select style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', background: '#fff' }} value={packageType} onChange={e => setPackageType(e.target.value)}>
                  <option value="Trả phí">Trả phí</option>
                  <option value="Miễn phí">Miễn phí</option>
                </select>
              </div>
              <div>
                <span className="label">Số tiền (VND)</span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    style={{
                      width: '100%',
                      padding: '10px 85px 10px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--line)',
                      textAlign: 'right',
                      fontFamily: 'inherit',
                      background: packageType === 'Miễn phí' ? '#f5f5f5' : '#fff'
                    }}
                    placeholder="Nhập số..."
                    value={packageType === 'Miễn phí' ? '0' : displayPrice}
                    onChange={e => handlePriceChange(e.target.value)}
                    disabled={packageType === 'Miễn phí'}
                    required={packageType === 'Trả phí'}
                  />
                  {packageType !== 'Miễn phí' && displayPrice && (
                    <span style={{
                      position: 'absolute',
                      right: '12px',
                      color: 'var(--muted)',
                      pointerEvents: 'none',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}>
                      .000 VND
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Thời gian cấp link – chọn ngay khi tạo */}
            <div style={{ marginBottom: '16px' }}>
              <span className="label">Thời gian cấp link</span>
              <input
                type="date"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', background: '#fff' }}
                value={linkProvisionTime}
                onChange={e => setLinkProvisionTime(e.target.value)}
              />
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>Ngày hết hạn và hạn cấp lại link sẽ được tự động tính trong đơn mới.</div>
            </div>

            {/* Link Drive và Mật khẩu – vẫn được chỉnh sửa */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <span className="label">Link Drive sản phẩm ảnh</span>
                <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }} placeholder="Nhập link Google Drive..." value={driveLink} onChange={e => setDriveLink(e.target.value)} />
              </div>
              <div>
                <span className="label">Mật khẩu Drive</span>
                <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }} placeholder="Mật khẩu (nếu có)..." value={drivePassword} onChange={e => setDrivePassword(e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <span className="label">Ghi chú đơn hàng</span>
              <textarea style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', minHeight: '60px', fontFamily: 'inherit' }} placeholder="Ghi chú..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn ghost" style={{ color: 'var(--ink)' }} onClick={() => setShowCreateOrderModal(false)}>Hủy</button>
              <button type="submit" className="btn primary" disabled={loading}>
                {loading ? 'Đang tạo đơn...' : 'Xác nhận tạo đơn'}
              </button>
            </div>
          </form>
        </div>
      , document.body)}
    </>
  );
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<MainLayout />}>
        <Route path="/" element={<ShopPage viewType="search" />} />
        <Route path="/result" element={<ShopPage viewType="result" />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/orders" element={<OrdersPage isHistory={false} />} />
        <Route path="/orders-history" element={<OrdersPage isHistory={true} />} />
      </Route>
    </Routes>
  );
}