import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import api from './api';
import { createPortal } from 'react-dom';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const [pendingWebOrders, setPendingWebOrders] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!user) return <Navigate to="/login" />;
  const isCustomer = user.role === 'KHACH' || user.role === 'CUSTOMER';

  useEffect(() => {
    setIsSidebarOpen(false); // Tự động đóng menu trượt khi chuyển trang
    // Nhân viên mới cần lấy số lượng đơn Web để hiển thị thông báo đỏ
    if (!isCustomer) {
      api.get('/dashboard').then(res => setPendingWebOrders(res.data.pendingWebOrders || 0)).catch(() => {});
    }
  }, [location.pathname, isCustomer]);

  return (
    <div className="app">
      {/* Lớp phủ xám toàn màn hình khi mở Menu trên Mobile */}
      {isSidebarOpen && createPortal(
        <div className="page-transition" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000 }} onClick={() => setIsSidebarOpen(false)}></div>
      , document.body)}

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="brand" onClick={() => navigate('/shop')} style={{ cursor: 'pointer' }} title="Về trang Cửa hàng">
          <span className="brand-mark">S</span>
          <span>Sốp Pi</span>
        </div>
        <div className="nav">
          <div className="nav-title">Mua sắm</div>
          <Link to="/shop" className={location.pathname === '/shop' ? 'active' : ''}><span className="dot" style={{background: 'var(--copper)'}}></span>Cửa hàng</Link>
          <Link to="/cart" className={location.pathname === '/cart' ? 'active' : ''}><span className="dot" style={{background: 'var(--copper)'}}></span>Giỏ hàng</Link>
          <Link to="/my-orders" className={location.pathname === '/my-orders' ? 'active' : ''}><span className="dot" style={{background: 'var(--blue)'}}></span>Đơn hàng</Link>
          
          {!isCustomer && (
            <>
              <div className="nav-title">Vận hành</div>
              <Link to="/" className={location.pathname === '/' ? 'active' : ''} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span className="dot"></span>Tổng quan</div>
                {pendingWebOrders > 0 && <span style={{ background: 'var(--red)', color: '#fff', padding: '2px 6px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>{pendingWebOrders}</span>}
              </Link>
            </>
          )}
          
          {(user.role === 'ADMIN' || user.role === 'QUANLY' || user.role === 'NHANVIEN') && !isCustomer && (
            <>
              <div className="nav-title">Danh mục</div>
              <Link to="/orders" className={location.pathname === '/orders' ? 'active' : ''}><span className="dot" style={{background: 'var(--blue)'}}></span>Đơn mới</Link>
              <Link to="/products" className={location.pathname === '/products' ? 'active' : ''}><span className="dot"></span>Sản phẩm</Link>
              <Link to="/customers" className={location.pathname === '/customers' ? 'active' : ''}><span className="dot"></span>Khách hàng</Link>
            </>
          )}
        </div>
      </aside>
      
      <main className="main">
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setIsSidebarOpen(true)}>☰</button>
          <div className="search">
            <input placeholder="Tìm đơn hàng, sản phẩm, khách hàng..." aria-label="Tìm kiếm" />
          </div>
          <div className="user" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }} title="Tài khoản của tôi">
            <span>{user.fullName}</span>
            {user.avatar ? (
              <img src={user.avatar} alt="avatar" className="avatar" style={{ objectFit: 'cover' }} />
            ) : (
              <span className="avatar">{user.fullName?.charAt(0).toUpperCase()}</span>
            )}
          </div>
        </header>

        {/* Bọc Outlet bằng thẻ div có key để kích hoạt Animation khi chuyển trang */}
        <div key={location.pathname} className="page-transition">
          <Outlet />
        </div>
      </main>
    </div>
  );
}