import React, { useEffect, useState } from 'react';
import api from './api';

export default function CustomersPage() {
  const [lookups, setLookups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchLookups = async () => {
    try {
      const res = await api.get('/lookups');
      setLookups(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLookups();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.post('/lookups', { fullName, email, phone });
      setSuccessMsg(`Tạo mã tra cứu thành công! Mã của khách là: ${res.data.code}`);
      setFullName('');
      setEmail('');
      setPhone('');
      setShowForm(false);
      fetchLookups();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Lỗi khi tạo mã tra cứu');
    }
  };

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mã tra cứu "${code}" không?`)) return;
    try {
      await api.delete(`/lookups/${id}`);
      fetchLookups();
      setSuccessMsg(`Đã xóa mã tra cứu "${code}" thành công.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Lỗi khi xóa mã tra cứu');
    }
  };

  const handleChangeCode = async (id, oldCode) => {
    if (!window.confirm(`Bạn có chắc chắn muốn đổi mã tra cứu "${oldCode}" không? Việc này sẽ tự động cập nhật mã liên kết cho toàn bộ đơn hàng hiện có của khách.`)) return;
    try {
      const res = await api.put(`/lookups/${id}/change-code`);
      setSuccessMsg(res.data.message);
      fetchLookups();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      alert(err.response?.data?.error || 'Lỗi khi đổi mã tra cứu');
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Đang tải danh sách mã tra cứu...</div>;

  return (
    <div className={"split-layout " + (showForm ? "has-form" : "")}>
      <section className="panel">
        <div className="panel-head">
          <h2>Danh sách Mã Tra Cứu Khách Hàng</h2>
          {!showForm && <button className="btn primary" onClick={() => { setShowForm(true); setErrorMsg(''); setSuccessMsg(''); }}>+ Thêm mã tra cứu</button>}
        </div>

        {successMsg && (
          <div className="panel page-transition" style={{ background: '#dfeee7', color: 'var(--green-2)', border: '1px solid #cce0d6', padding: '12px', marginBottom: '16px', fontWeight: 'bold' }}>
            ✓ {successMsg}
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mã Tra Cứu</th>
                <th>Họ và tên khách</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Ngày đăng ký</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {lookups.map(l => (
                <tr key={l.id}>
                  <td><strong style={{ color: 'var(--green-2)', letterSpacing: '0.5px' }}>{l.code}</strong></td>
                  <td>{l.full_name}</td>
                  <td>{l.email}</td>
                  <td>{l.phone}</td>
                  <td>{new Date(l.created_at).toLocaleString('vi-VN')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn ghost" 
                        style={{ color: 'var(--copper)', borderColor: 'var(--copper)', padding: '4px 10px', minHeight: 'auto' }}
                        onClick={() => handleChangeCode(l.id, l.code)}
                      >
                        Đổi mã
                      </button>
                      <button 
                        className="btn ghost" 
                        style={{ color: 'var(--red)', borderColor: 'var(--red)', padding: '4px 10px', minHeight: 'auto' }}
                        onClick={() => handleDelete(l.id, l.code)}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {lookups.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                    Chưa có mã tra cứu nào được đăng ký trên hệ thống.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <section className="panel page-transition" style={{ alignSelf: 'start', border: '1px solid var(--green)' }}>
          <div className="panel-head">
            <h2>Đăng ký mã tra cứu</h2>
            <button className="btn ghost" style={{ color: 'var(--muted)', borderColor: 'transparent', padding: '5px 10px' }} onClick={() => setShowForm(false)}>✕</button>
          </div>
          
          {errorMsg && <div style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '12px', fontWeight: 'bold' }}>✕ {errorMsg}</div>}

          <form onSubmit={handleCreate}>
            <div style={{ marginBottom: '16px' }}>
              <span className="label">Họ và tên người nhận</span>
              <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }} value={fullName} onChange={e=>setFullName(e.target.value)} required placeholder="VD: Nguyễn Văn A..." />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <span className="label">Địa chỉ Email</span>
              <input type="email" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }} value={email} onChange={e=>setEmail(e.target.value)} required placeholder="VD: email@example.com..." />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <span className="label">Số điện thoại</span>
              <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }} value={phone} onChange={e=>setPhone(e.target.value)} required placeholder="VD: 0909123456..." />
            </div>
            <button type="submit" className="btn primary" style={{ width: '100%' }}>Tạo mã xác nhận</button>
          </form>
        </section>
      )}
    </div>
  );
}