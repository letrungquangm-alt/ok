import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from './api';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      return setError('Mật khẩu không khớp!');
    }

    try {
      await api.post('/register', { username, fullName, email, password });
      alert('Đăng ký tài khoản thành công! Vui lòng đăng nhập.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Đăng ký thất bại');
    }
  };

  return (
    <div className="app page-transition" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
      <form 
        className="panel"
        onSubmit={handleRegister} 
        style={{ width: '100%', maxWidth: '400px', padding: '32px' }}
      >
        <div className="brand" style={{ justifyContent: 'center', marginBottom: '8px' }}>
          <span className="brand-mark">S</span>
          <span>Sốp Pi</span>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 0, marginBottom: '24px' }}>Đăng ký tài khoản khách hàng</p>
        
        {error && <div style={{ color: 'var(--red)', fontSize: '14px', textAlign: 'center', marginBottom: '16px', background: '#fce8e8', padding: '8px', borderRadius: '6px' }}>{error}</div>}
        
        <div style={{ marginBottom: '16px' }}><span className="label">Tên đăng nhập</span><input style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px' }} value={username} onChange={e => setUsername(e.target.value)} required /></div>
        
        <div style={{ marginBottom: '16px' }}><span className="label">Họ và tên hiển thị</span><input style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px' }} value={fullName} onChange={e => setFullName(e.target.value)} required /></div>
        
        <div style={{ marginBottom: '16px' }}><span className="label">Email</span><input type="email" style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px' }} value={email} onChange={e => setEmail(e.target.value)} required /></div>
        
        <div style={{ marginBottom: '16px' }}><span className="label">Mật khẩu</span><input type="password" style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px' }} value={password} onChange={e => setPassword(e.target.value)} required /></div>
        
        <div style={{ marginBottom: '24px' }}><span className="label">Nhập lại mật khẩu</span><input type="password" style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px' }} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /></div>
        
        <button type="submit" className="btn primary" style={{ width: '100%', marginBottom: '16px' }}>Đăng ký tài khoản</button>
        
        <div style={{ textAlign: 'center', fontSize: '14px', color: 'var(--muted)' }}>
          Đã có tài khoản? <Link to="/login" style={{ color: 'var(--green-2)', fontWeight: 'bold', textDecoration: 'underline' }}>Đăng nhập ngay</Link>
        </div>
      </form>
    </div>
  );
}