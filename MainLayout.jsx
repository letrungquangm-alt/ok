import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import api from './api';
import { createPortal } from 'react-dom';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const userStr = localStorage.getItem('user');
  const token = localStorage.getItem('token');
  const user = userStr && token ? JSON.parse(userStr) : null;
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const publicPaths = ['/', '/result', '/cart'];
  const isPublicPath = publicPaths.includes(location.pathname);

  const [activeLookupCode, setActiveLookupCode] = useState(localStorage.getItem('last_lookup_code') || '');
  const [showAdminConfirm, setShowAdminConfirm] = useState(false);

  useEffect(() => {
    const handleLookupChange = () => {
      setActiveLookupCode(localStorage.getItem('last_lookup_code') || '');
    };
    window.addEventListener('lookup_change', handleLookupChange);
    window.addEventListener('storage', handleLookupChange);
    return () => {
      window.removeEventListener('lookup_change', handleLookupChange);
      window.removeEventListener('storage', handleLookupChange);
    };
  }, []);

  if (!user) {
    if (!isPublicPath) {
      return <Navigate to="/login" />;
    }
  }

  const isCustomer = !user || user.role === 'KHACH' || user.role === 'CUSTOMER';

  useEffect(() => {
    setIsSidebarOpen(false); // Tự động đóng menu trượt khi chuyển trang
    // Nhân viên mới cần lấy số lượng đơn mới để hiển thị thông báo đỏ
    if (!isCustomer) {
      api.get('/dashboard').then(res => setPendingOrdersCount((res.data.pendingPayment || 0) + (res.data.pendingEmail || 0))).catch(() => {});
    }
  }, [location.pathname, isCustomer]);

  return (
    <div className="app">
      {/* Lớp phủ xám toàn màn hình khi mở Menu trên Mobile */}
      {isSidebarOpen && createPortal(
        <div className="page-transition" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000 }} onClick={() => setIsSidebarOpen(false)}></div>
      , document.body)}

      {showAdminConfirm && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div className="panel page-transition" style={{ width: '100%', maxWidth: '400px', padding: '24px', background: '#fff', textAlign: 'center', borderRadius: '10px', boxShadow: 'var(--shadow)' }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🔑</span>
            <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 24px 0', color: 'var(--ink)', lineHeight: '1.5' }}>
              Đây là mục dành cho Admin, bạn có phải là Admin không?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn" 
                style={{ flex: 1, background: 'var(--line)', color: 'var(--ink)' }} 
                onClick={() => { setShowAdminConfirm(false); navigate('/'); }}
              >
                Không
              </button>
              <button 
                type="button" 
                className="btn primary" 
                style={{ flex: 1, background: 'var(--green-2)', color: '#fff' }} 
                onClick={() => { setShowAdminConfirm(false); navigate('/login'); }}
              >
                Có
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }} title="Về trang Tra cứu">
          <span className="brand-mark">📸</span>
          <span>HoangKiet</span>
        </div>
        <div className="nav">
          <div className="nav-title">Trang Chủ</div>
          {!activeLookupCode ? (
            <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
              <span className="dot" style={{background: 'var(--copper)'}}></span>Tra cứu
            </Link>
          ) : (
            <Link to="/result" className={location.pathname === '/result' ? 'active' : ''}>
              <span className="dot" style={{background: 'var(--blue)'}}></span>Kết quả tra cứu
            </Link>
          )}
          
          {!isCustomer && (
            <>
              <div className="nav-title">Vận hành</div>
              <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}><span className="dot"></span>Tổng quan</Link>
            </>
          )}
          
          {user && (user.role === 'ADMIN' || user.role === 'QUANLY' || user.role === 'NHANVIEN') && !isCustomer && (
            <>
              <div className="nav-title">Danh mục</div>
              <Link to="/orders" className={location.pathname === '/orders' ? 'active' : ''} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span className="dot" style={{background: 'var(--blue)'}}></span>Đơn mới</div>
                {pendingOrdersCount > 0 && <span style={{ background: 'var(--red)', color: '#fff', padding: '2px 6px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>{pendingOrdersCount}</span>}
              </Link>
              <Link to="/orders-history" className={location.pathname === '/orders-history' ? 'active' : ''} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span className="dot" style={{background: 'var(--gold)'}}></span>Lịch sử đơn hàng</div>
              </Link>
              <Link to="/customers" className={location.pathname === '/customers' ? 'active' : ''}><span className="dot"></span>Khách hàng</Link>
            </>
          )}
        </div>
      </aside>
      
      <main className="main">
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setIsSidebarOpen(true)}>☰</button>
          <div></div>
          {user ? (
            <div className="user" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }} title="Tài khoản của tôi">
              <span>{user.fullName}</span>
              {user.avatar ? (
                <img src={user.avatar} alt="avatar" className="avatar" style={{ objectFit: 'cover' }} />
              ) : (
                <span className="avatar">{user.fullName?.charAt(0).toUpperCase()}</span>
              )}
            </div>
          ) : (
            <div className="user" onClick={() => setShowAdminConfirm(true)} style={{ cursor: 'pointer' }} title="Đăng nhập Admin">
              <span className="avatar" style={{ display: 'grid', placeItems: 'center' }}>🔑</span>
            </div>
          )}
        </header>

        {/* Bọc Outlet bằng thẻ div có key để kích hoạt Animation khi chuyển trang */}
        <div key={location.pathname} className="page-transition">
          <Outlet />
        </div>
      </main>
    </div>
  );
}