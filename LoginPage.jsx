import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from './api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await api.post('/login', { username, password });
      // Lưu token và thông tin user vào trình duyệt
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      // Chuyển hướng vào trang trong
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Đăng nhập thất bại');
    }
  };

  return (
    <div className="app page-transition" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
      <form 
        className="panel"
        onSubmit={handleLogin} 
        style={{ width: '100%', maxWidth: '360px', padding: '32px' }}
      >
        <div className="brand" style={{ justifyContent: 'center', marginBottom: '24px' }}>
          <span className="brand-mark">S</span>
          <span>Sốp Pi</span>
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

        <div style={{ textAlign: 'center', fontSize: '14px', color: 'var(--muted)' }}>
          Chưa có tài khoản? <Link to="/register" style={{ color: 'var(--green-2)', fontWeight: 'bold', textDecoration: 'underline' }}>Đăng ký ngay</Link>
        </div>
      </form>
    </div>
  );
}