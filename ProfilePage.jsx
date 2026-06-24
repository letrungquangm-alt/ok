import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from './api';
import { createPortal } from 'react-dom';

export default function ProfilePage() {
  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : {};

  const [fullName, setFullName] = useState(user.fullName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showInfoForm, setShowInfoForm] = useState(false);
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [address, setAddress] = useState(user.address || '');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) return alert('Ảnh quá lớn. Vui lòng chọn ảnh dưới 2MB');
      const reader = new FileReader();
      reader.onloadend = () => setAvatar(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const togglePasswordForm = () => {
    if (showPasswordForm) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setShowPasswordForm(!showPasswordForm);
  };

  const toggleInfoForm = () => {
    if (showInfoForm) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
    setShowInfoForm(!showInfoForm);
  };

  // Kiểm tra xem có sự thay đổi nào không
  const isChanged = fullName !== (user.fullName || '') || phone !== (user.phone || '') || email !== (user.email || '') || avatar !== (user.avatar || '') || newPassword !== '';

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!isChanged) return;
    if (newPassword && newPassword !== confirmPassword) {
      return alert('Mật khẩu mới không khớp!');
    }

    try {
      const res = await api.put('/profile', { fullName, currentPassword, newPassword, avatar, phone, address, email });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      alert('Cập nhật hồ sơ thành công!');
      window.location.reload(); // Load lại trang để Avatar hiện lên góc phải
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || err.message || 'Lỗi cập nhật');
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) return alert('Vui lòng nhập mật khẩu xác nhận.');
    try {
      await api.delete('/profile', { data: { password: deletePassword } });
      alert('Tài khoản đã được xóa vĩnh viễn.');
      localStorage.clear();
      navigate('/login');
    } catch (err) {
      alert(err.response?.data?.error || 'Lỗi khi xóa tài khoản');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <section className="panel" style={{ marginBottom: '20px' }}>
        <div className="panel-head" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '16px', marginBottom: '20px' }}>
          <h2>Hồ sơ cá nhân</h2>
        </div>
        
        <div style={{ display: 'flex', gap: '24px', marginBottom: '30px', alignItems: 'center' }}>
          <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: '#dfeee7', color: 'var(--green-2)', display: 'grid', placeItems: 'center', fontSize: '36px', fontWeight: 'bold', overflow: 'hidden' }}>
            {avatar ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (user.fullName?.charAt(0).toUpperCase() || 'U')}
          </div>
          <div>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/jpeg, image/png" onChange={handleFileChange} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn ghost" style={{ color: 'var(--ink)', borderColor: 'var(--line)' }} onClick={() => fileInputRef.current.click()}>Tải ảnh Avatar mới</button>
              {avatar && <button type="button" className="btn ghost" style={{ color: 'var(--red)', borderColor: 'var(--line)' }} onClick={() => setAvatar('')}>Xóa ảnh</button>}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>Định dạng hỗ trợ: JPG, PNG. Tối đa 2MB.</div>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile}>
          <div style={{ marginBottom: '16px' }}>
            <span className="label">Tên đăng nhập (Không thể thay đổi)</span>
            <input style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px', background: '#f4f6f1', color: 'var(--muted)' }} value={user.username} disabled />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <button 
              type="button" 
              className="btn"
              onClick={toggleInfoForm}
              style={{ 
                width: '100%', 
                justifyContent: 'space-between',
                background: showInfoForm ? '#e4e9e6' : 'transparent',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
                marginBottom: showInfoForm ? '16px' : '0'
              }}
            >
              <span>Đổi thông tin cá nhân</span>
              <span style={{ fontSize: '12px', transition: 'transform 0.3s', transform: showInfoForm ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </button>
            
            {showInfoForm && (
              <div className="page-transition" style={{ background: '#f9fbf9', padding: '16px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                <div style={{ marginBottom: '16px' }}>
                  <span className="label" style={{ fontWeight: 'normal', color: 'var(--ink)' }}>Họ và tên hiển thị</span>
                  <input style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px', background: '#fff' }} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nhập họ và tên..." required />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <span className="label" style={{ fontWeight: 'normal', color: 'var(--ink)' }}>Email liên hệ</span>
                  <input type="email" style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px', background: '#fff' }} value={email} onChange={e => setEmail(e.target.value)} placeholder="VD: mail@example.com" />
                </div>

                <div style={{ marginBottom: '0' }}>
                  <span className="label" style={{ fontWeight: 'normal', color: 'var(--ink)' }}>Số điện thoại</span>
                  <input style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px', background: '#fff' }} value={phone} onChange={e => setPhone(e.target.value)} placeholder="VD: 0909123456..." />
                </div>
              </div>
            )}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <button 
              type="button" 
              className="btn"
              onClick={togglePasswordForm}
              style={{ 
                width: '100%', 
                justifyContent: 'space-between',
                background: showPasswordForm ? '#e4e9e6' : 'transparent',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
                marginBottom: showPasswordForm ? '16px' : '0'
              }}
            >
              <span>Đổi mật khẩu</span>
              <span style={{ fontSize: '12px', transition: 'transform 0.3s', transform: showPasswordForm ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </button>
            
            {showPasswordForm && (
              <div className="page-transition" style={{ background: '#f9fbf9', padding: '16px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                <div style={{ marginBottom: '16px' }}>
                  <span className="label" style={{ fontWeight: 'normal', color: 'var(--ink)' }}>Mật khẩu hiện tại</span>
                  <input type="password" style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px', background: '#fff' }} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Nhập mật khẩu hiện tại..." />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <span className="label" style={{ fontWeight: 'normal', color: 'var(--ink)' }}>Mật khẩu mới</span>
                  <input type="password" style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px', background: '#fff' }} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nhập mật khẩu mới..." />
                </div>
                <div style={{ marginBottom: '0' }}>
                  <span className="label" style={{ fontWeight: 'normal', color: 'var(--ink)' }}>Nhập lại mật khẩu mới</span>
                  <input type="password" style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px', background: '#fff' }} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu mới..." />
                </div>
              </div>
            )}
          </div>
          <button type="submit" className="btn primary" disabled={!isChanged} style={{ opacity: isChanged ? 1 : 0.5, cursor: isChanged ? 'pointer' : 'not-allowed', transition: 'all 0.3s' }}>Lưu thông tin</button>
          
          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--line)' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>Quản lý phiên đăng nhập</h3>
            <p style={{ margin: '0 0 16px 0', color: 'var(--muted)', fontSize: '13px' }}>Vai trò hiện tại: <strong>{user.role}</strong></p>
            <button type="button" onClick={handleLogout} className="btn" style={{ background: 'var(--red)', color: '#fff' }}>
              Đăng xuất khỏi hệ thống
            </button>
            {user.role !== 'ADMIN' && (
              <button type="button" onClick={() => setShowDeleteModal(true)} className="btn ghost" style={{ color: 'var(--red)', borderColor: 'var(--red)', marginLeft: '10px' }}>
                Xóa tài khoản vĩnh viễn
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Modal Xóa Tài Khoản */}
      {showDeleteModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="panel page-transition" style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
            <h3 style={{ color: 'var(--red)', marginTop: 0 }}>Xóa tài khoản</h3>
            <p>Bạn thật sự muốn xoá tài khoản này sao? Nếu xoá thì sẽ không bao giờ được khôi phục.</p>
            <input type="password" placeholder="Nhập mật khẩu hiện tại để xác nhận" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', marginBottom: '20px' }} />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn ghost" style={{ color: 'var(--ink)' }} onClick={() => setShowDeleteModal(false)}>Hủy</button>
              <button className="btn" style={{ background: 'var(--red)', color: '#fff' }} onClick={handleDeleteAccount}>Xóa vĩnh viễn</button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Khu vực đặc quyền dành riêng cho ADMIN */}
      {(user.role === 'ADMIN' || user.role === 'QUANLY') && (
        <section className="panel" style={{ border: '1px solid #cce0d6', background: '#f2f8f5' }}>
          <h3 style={{ margin: '0 0 10px 0', color: 'var(--green-2)' }}>Quản trị hệ thống</h3>
          <p style={{ margin: '0 0 16px 0', color: 'var(--muted)' }}>Bạn có quyền quản lý, thêm, sửa, xóa tài khoản của các nhân viên hoặc khách hàng trong hệ thống.</p>
          <button className="btn" style={{ background: 'var(--green-2)', color: '#fff' }} onClick={() => navigate('/users')}>Quản lý tài khoản nhân viên</button>
        </section>
      )}
    </div>
  );
}