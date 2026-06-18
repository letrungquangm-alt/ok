import React, { useEffect, useState } from 'react';
import api from './api';

export default function UsersPage() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('NHANVIEN');
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      return setError('Mật khẩu không khớp!');
    }

    try {
      await api.post('/users', { username, fullName, email, password, role });
      setUsername(''); setFullName(''); setEmail(''); setPassword(''); setConfirmPassword(''); setRole('NHANVIEN');
      setShowForm(false);
      fetchUsers(); // Cập nhật lại danh sách sau khi tạo thành công
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi khi tạo tài khoản');
    }
  };

  const handleDeleteUser = async (id, username) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${username}" không? Hành động này không thể hoàn tác.`)) {
      try {
        await api.delete(`/users/${id}`);
        fetchUsers();
      } catch (err) { alert(err.response?.data?.error || 'Lỗi khi xóa'); }
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Đang tải dữ liệu...</div>;

  return (
    <div className={"split-layout " + (showForm ? "has-form" : "")}>
      <section className="panel">
        <div className="panel-head">
          <h2>Quản lý Tài khoản Nhân viên & Khách hàng</h2>
          {!showForm && <button className="btn primary" onClick={() => setShowForm(true)}>+ Thêm tài khoản mới</button>}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tên đăng nhập</th>
                <th>Họ và tên</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.username}</strong></td>
                  <td>{u.full_name}</td>
                  <td>{u.email}</td>
                  <td><span className="pill blue">{u.role}</span></td>
                  <td>{u.enabled ? <span className="pill green">Hoạt động</span> : <span className="pill gold">Khóa</span>}</td>
                  <td>
                    <button className="btn ghost" style={{ color: 'var(--red)', padding: '4px 8px', minHeight: 'auto' }} onClick={() => handleDeleteUser(u.id, u.username)}>
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <section className="panel page-transition" style={{ alignSelf: 'start', border: '1px solid var(--green)' }}>
          <div className="panel-head">
            <h2>Tạo tài khoản</h2>
            <button className="btn ghost" style={{ color: 'var(--muted)', borderColor: 'transparent', padding: '5px 10px' }} onClick={() => setShowForm(false)}>✕</button>
          </div>
          <form onSubmit={handleCreateUser}>
            {error && <div style={{ color: 'var(--red)', marginBottom: '16px', fontSize: '14px', background: '#fce8e8', padding: '10px', borderRadius: '6px' }}>{error}</div>}
            <div style={{ marginBottom: '16px' }}>
              <span className="label">Tên đăng nhập</span>
              <input style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px' }} value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <span className="label">Họ và tên hiển thị</span>
              <input style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px' }} value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <span className="label">Email</span>
              <input type="email" style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px' }} value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <span className="label">Mật khẩu</span>
              <input type="password" style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px' }} value={password} onChange={e => setPassword(e.target.value)} placeholder="Nhập mật khẩu..." required />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <span className="label">Nhập lại mật khẩu</span>
              <input type="password" style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px' }} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu..." required />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <span className="label">Vai trò trong hệ thống</span>
              <select style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px', background: '#fff' }} value={role} onChange={e => setRole(e.target.value)}>
                {currentUser.role === 'ADMIN' && <option value="ADMIN">Quản trị tối cao (ADMIN)</option>}
                {currentUser.role === 'ADMIN' && <option value="QUANLY">Quản lý (QUANLY)</option>}
                <option value="NHANVIEN">Nhân viên (NHANVIEN)</option>
                <option value="KHACH">Khách hàng (KHACH)</option>
              </select>
            </div>
            <button type="submit" className="btn primary" style={{ width: '100%' }}>Tạo tài khoản</button>
          </form>
        </section>
      )}
    </div>
  );
}