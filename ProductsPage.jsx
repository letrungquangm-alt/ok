import React, { useEffect, useState, useRef } from 'react';
import api from './api';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const fileInputRef = useRef(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('cái');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get('/products');
        setProducts(res.data.data);
      } catch (error) {
        console.error('Lỗi khi tải sản phẩm:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) return alert('Ảnh quá lớn. Vui lòng chọn ảnh dưới 2MB');
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, { code, name, category, unit, reference_price: price, active: true, image, description });
      } else {
        await api.post('/products', { code, name, category, unit, reference_price: price, active: true, image, description });
      }
      resetForm();
      const res = await api.get('/products');
      setProducts(res.data.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Lỗi khi lưu sản phẩm');
    }
  };

  const resetForm = () => {
    setEditingId(null); setCode(''); setName(''); setCategory(''); setUnit('cái'); setPrice(''); setImage(''); setDescription(''); setShowForm(false);
  };

  const openEdit = (p) => {
    setEditingId(p.id); setCode(p.code); setName(p.name); setCategory(p.category || ''); 
    setUnit(p.unit); setPrice(p.reference_price); setImage(p.image || ''); setDescription(p.description || '');
    setShowForm(true); setMenuOpenId(null);
  };

  const handleDeleteProduct = async (id, name) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${name}" không? Hành động này không thể hoàn tác.`)) {
      try {
        await api.delete(`/products/${id}`);
        fetchProducts();
      } catch (err) {
        alert(err.response?.data?.error || 'Lỗi khi xóa sản phẩm');
      }
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Đang tải dữ liệu...</div>;

  return (
    <div className={"split-layout " + (showForm ? "has-form" : "")}>
      <section className="panel">
        <div className="panel-head">
          <h2>Danh mục Sản phẩm</h2>
          {!showForm && <button className="btn primary" onClick={() => { resetForm(); setShowForm(true); }}>+ Thêm sản phẩm</button>}
        </div>
        <div className="table-wrap" style={{ paddingBottom: menuOpenId ? '120px' : '0', transition: 'padding 0.2s ease' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '56px' }}>Ảnh</th>
                <th>Mã SP</th>
                <th>Tên sản phẩm</th>
                <th>Danh mục</th>
                <th>Đơn vị</th>
                <th>Giá tham khảo</th>
                <th>Trạng thái</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ width: '42px', height: '42px', borderRadius: '6px', background: '#f0f3ed', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p.image ? <img src={p.image} alt="img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🛍️'}
                    </div>
                  </td>
                  <td><strong>{p.code}</strong></td>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>{p.unit}</td>
                  <td>{Number(p.reference_price).toLocaleString('vi-VN')} đ</td>
                  <td>{p.active ? <span className="pill green">Đang bán</span> : <span className="pill gold">Ngừng bán</span>}</td>
                  <td style={{ position: 'relative' }}>
                    <button type="button" className="btn ghost" style={{ padding: '4px 8px', minHeight: 'auto', color: 'var(--ink)', borderColor: 'transparent' }} onClick={() => setMenuOpenId(menuOpenId === p.id ? null : p.id)}>⋮</button>
                    {menuOpenId === p.id && (
                      <div style={{ position: 'absolute', right: '10px', top: '35px', background: '#fff', border: '1px solid var(--line)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, display: 'flex', flexDirection: 'column', minWidth: '160px' }}>
                        <button type="button" className="btn ghost" style={{ border: 'none', borderRadius: 0, justifyContent: 'flex-start', padding: '10px 16px', color: 'var(--ink)' }} onClick={() => openEdit(p)}>Sửa thông tin & Ảnh</button>
                        <button type="button" className="btn ghost" style={{ border: 'none', borderRadius: 0, justifyContent: 'flex-start', padding: '10px 16px', color: 'var(--red)' }} onClick={() => { setMenuOpenId(null); handleDeleteProduct(p.id, p.name); }}>Xóa sản phẩm</button>
                      </div>
                    )}
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
            <h2>{editingId ? 'Sửa thông tin sản phẩm' : 'Thêm sản phẩm mới'}</h2>
            <button className="btn ghost" style={{ color: 'var(--muted)', borderColor: 'transparent', padding: '5px 10px' }} onClick={resetForm}>✕</button>
          </div>
          <form onSubmit={handleSave}>
            <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '8px', background: '#f0f3ed', display: 'grid', placeItems: 'center', overflow: 'hidden', border: '1px solid var(--line)' }}>
                {image ? <img src={image} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '24px' }}>🛍️</span>}
              </div>
              <div>
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/jpeg, image/png" onChange={handleFileChange} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn ghost" style={{ color: 'var(--ink)', borderColor: 'var(--line)', padding: '6px 12px' }} onClick={() => fileInputRef.current.click()}>{image ? 'Đổi ảnh' : 'Thêm ảnh'}</button>
                  {image && <button type="button" className="btn ghost" style={{ color: 'var(--red)', borderColor: 'var(--line)', padding: '6px 12px' }} onClick={() => setImage('')}>Xóa ảnh</button>}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>Hỗ trợ JPG, PNG dưới 2MB</div>
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}><span className="label">Mã sản phẩm</span><input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }} value={code} onChange={e=>setCode(e.target.value)} required /></div>
            <div style={{ marginBottom: '16px' }}><span className="label">Tên sản phẩm</span><input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }} value={name} onChange={e=>setName(e.target.value)} required /></div>
            <div style={{ marginBottom: '16px' }}><span className="label">Danh mục</span><input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }} value={category} onChange={e=>setCategory(e.target.value)} /></div>
            <div style={{ marginBottom: '16px' }}><span className="label">Đơn vị tính</span><input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }} value={unit} onChange={e=>setUnit(e.target.value)} required /></div>
            <div style={{ marginBottom: '24px' }}><span className="label">Giá tham khảo (VNĐ)</span><input type="number" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }} value={price} onChange={e=>setPrice(e.target.value)} required /></div>
            <div style={{ marginBottom: '24px' }}><span className="label">Mô tả sản phẩm</span><textarea style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', minHeight: '80px', fontFamily: 'inherit' }} value={description} onChange={e=>setDescription(e.target.value)}></textarea></div>
            <button type="submit" className="btn primary" style={{ width: '100%' }}>Lưu sản phẩm</button>
          </form>
        </section>
      )}
    </div>
  );
}