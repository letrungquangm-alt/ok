import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from './api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isFadingOut, setIsFadingOut] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await api.post('/login', { username, password });
      // Lưu token và thông tin user vào trình duyệt
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Start fade out transition
      setIsFadingOut(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 300);
    } catch (err) {
      setError(err.response?.data?.error || 'Đăng nhập thất bại');
    }
  };

  return (
    <div 
      className="app page-transition" 
      style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh', 
        padding: '20px',
        opacity: isFadingOut ? 0 : 1,
        transition: 'opacity 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
      }}
    >
      <form 
        className="panel"
        onSubmit={handleLogin} 
        style={{ width: '100%', maxWidth: '360px', padding: '32px', position: 'relative' }}
      >
        {/* Nút mũi tên quay về trang chủ */}
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: 'var(--muted)',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}
          title="Quay lại trang chủ"
        >
          ←
        </button>

        <div 
          className="brand" 
          onClick={() => navigate('/')}
          style={{ justifyContent: 'center', marginBottom: '24px', cursor: 'pointer' }}
          title="Về trang chủ"
        >
          <span className="brand-mark">📸</span>
          <span>HoangKiet</span>
        </div>
        {error && <div style={{ color: 'var(--red)', fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>{error}</div>}
        
        <div style={{ marginBottom: '16px' }}>
          <span className="label">Tên đăng nhập</span>
          <input style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px' }} value={username} onChange={e => setUsername(e.target.value)} required />
        </div>
        <div style={{ marginBottom: '24px' }}>
          <span className="label">Mật khẩu</span>
          <input type="password" style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px' }} value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        
        <button type="submit" className="btn primary" style={{ width: '100%', marginBottom: '16px' }}>Vào hệ thống</button>
      </form>
    </div>
  );
}