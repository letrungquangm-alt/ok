import React, { useEffect, useState } from 'react';
import api from './api';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get('/customers');
        setCustomers(res.data.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/customers', { code, name, phone, address, contact_person: contactPerson });
      setCode(''); setName(''); setPhone(''); setAddress(''); setContactPerson(''); setShowForm(false);
      const res = await api.get('/customers');
      setCustomers(res.data.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Lỗi khi tạo khách hàng');
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Đang tải dữ liệu...</div>;

  return (
    <div className={"split-layout " + (showForm ? "has-form" : "")}>
      <section className="panel">
        <div className="panel-head">
          <h2>Danh mục Khách hàng</h2>
          {!showForm && <button className="btn primary" onClick={() => setShowForm(true)}>+ Thêm khách hàng</button>}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Mã KH</th><th>Tên khách hàng</th><th>Điện thoại</th><th>Địa chỉ</th><th>Người liên hệ</th></tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}><td><strong>{c.code}</strong></td><td>{c.name}</td><td>{c.phone}</td><td>{c.address}</td><td>{c.contact_person}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <section className="panel page-transition" style={{ alignSelf: 'start', border: '1px solid var(--green)' }}>
          <div className="panel-head"><h2>Thêm khách hàng</h2><button className="btn ghost" style={{ color: 'var(--muted)', borderColor: 'transparent', padding: '5px 10px' }} onClick={() => setShowForm(false)}>✕</button></div>
          <form onSubmit={handleCreate}>
            <div style={{ marginBottom: '16px' }}><span className="label">Mã khách hàng</span><input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }} value={code} onChange={e=>setCode(e.target.value)} required /></div>
            <div style={{ marginBottom: '16px' }}><span className="label">Tên công ty/cửa hàng</span><input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }} value={name} onChange={e=>setName(e.target.value)} required /></div>
            <div style={{ marginBottom: '16px' }}><span className="label">Số điện thoại</span><input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }} value={phone} onChange={e=>setPhone(e.target.value)} /></div>
            <div style={{ marginBottom: '16px' }}><span className="label">Địa chỉ</span><input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }} value={address} onChange={e=>setAddress(e.target.value)} /></div>
            <div style={{ marginBottom: '24px' }}><span className="label">Người liên hệ</span><input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }} value={contactPerson} onChange={e=>setContactPerson(e.target.value)} /></div>
            <button type="submit" className="btn primary" style={{ width: '100%' }}>Lưu khách hàng</button>
          </form>
        </section>
      )}
    </div>
  );
}