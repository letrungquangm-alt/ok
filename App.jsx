import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import MainLayout from './MainLayout';
import ProductsPage from './ProductsPage';
import ProfilePage from './ProfilePage';
import UsersPage from './UsersPage';
import CustomersPage from './CustomersPage';
import ShopPage from './ShopPage';
import CartPage from './CartPage';
import MyOrdersPage from './MyOrdersPage';
import OrdersPage from './OrdersPage';
import api from './api';

const DashboardPage = () => {
  const [stats, setStats] = useState({ products: 0, pendingOrders: 0, inboundMonth: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard');
        setStats(res.data);
      } catch (error) {
        console.error('Lỗi tải số liệu:', error);
      }
    };
    fetchStats();
  }, []);

  return (
    <>
      <section className="hero">
        <div>
          <h1>Hệ thống quản lý sản phẩm, nhập kho và xuất hàng</h1>
          <p>Thiết kế cho quy trình thực tế: nhà máy tạo phiếu nhập, sales gửi đơn, logistics tiếp nhận, kho xác nhận xuất và tự động tổng hợp.</p>
          <div className="hero-actions">
            <button className="btn primary">Tạo đơn hàng</button>
            <button className="btn ghost">Xem báo cáo</button>
          </div>
        </div>
        <div className="hero-card">
          <span>Số lượng Sản phẩm</span>
          <strong>{stats.products}</strong>
          <span>đang được kinh doanh</span>
        </div>
      </section>

      <section className="metrics">
        <article className="metric">
          <span className="label">Đơn đang xử lý</span>
          <div className="value">{stats.pendingOrders}</div>
          <div className="trend">8 đơn chờ kho</div>
        </article>
        <article className="metric">
          <span className="label">Nhập trong tháng</span>
          <div className="value">{stats.inboundMonth}</div>
          <div className="trend">đã xác nhận</div>
        </article>
      </section>
    </>
  );
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<MainLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/my-orders" element={<MyOrdersPage />} />
      </Route>
    </Routes>
  );
}