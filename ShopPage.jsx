import React, { useEffect, useState } from 'react';
import api from './api';
import { createPortal } from 'react-dom';

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get('/products');
        // Chỉ hiển thị các sản phẩm đang được kinh doanh (active = true)
        const activeProducts = res.data.data.filter(p => p.active);
        setProducts(activeProducts);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const addToCart = (e, p) => {
    e.stopPropagation(); // Ngăn không cho mở modal khi bấm nút Thêm
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    let item = cart.find(i => i.id === p.id);
    if (item) item.quantity += 1;
    else cart.push({ id: p.id, name: p.name, price: p.reference_price, image: p.image, quantity: 1 });
    localStorage.setItem('cart', JSON.stringify(cart));
    
    setToast(`Đã thêm "${p.name}" vào giỏ!`);
    setTimeout(() => setToast(''), 2500); // Ẩn thông báo sau 2.5s
    if (selectedProduct) setSelectedProduct(null); // Đóng modal nếu đang mở
  };

  if (loading) return <div style={{ padding: '20px' }}>Đang tải cửa hàng...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <section className="panel page-transition" style={{ background: 'linear-gradient(120deg, var(--green), var(--green-2))', color: '#fff', border: 'none', padding: '32px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '28px' }}>Cửa hàng trực tuyến</h2>
        <p style={{ margin: 0, color: '#e4f0ea', fontSize: '16px' }}>Khám phá các sản phẩm nổi bật và đặt hàng ngay hôm nay.</p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' }}>
        {products.map((p, index) => (
          <div 
            key={p.id} 
            className="panel page-transition" 
            style={{ 
              display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden',
              animationDelay: `${index * 0.05}s`, // Đã thêm dấu phẩy ở đây
              cursor: 'pointer'
            }}
            onClick={() => setSelectedProduct(p)}
          >
            {/* Vùng chứa ảnh sản phẩm */}
            <div style={{ height: '220px', overflow: 'hidden', borderBottom: '1px solid var(--line)' }}>
              <div 
                style={{ height: '100%', background: '#f0f3ed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px', transition: 'transform 0.3s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {p.image ? <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🛍️'}
              </div>
            </div>
            
            {/* Thông tin sản phẩm */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1, background: '#fff' }}>
              <div style={{ fontSize: '12px', color: 'var(--copper)', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>
                {p.category || 'Chưa phân loại'}
              </div>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--ink)', lineHeight: '1.4' }}>
                {p.name}
              </h3>
              
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ color: 'var(--green-2)', fontSize: '18px' }}>
                  {Number(p.reference_price).toLocaleString('vi-VN')} đ
                </strong>
                <button className="btn primary" style={{ background: 'var(--green)', color: '#fff', minHeight: '36px', padding: '0 16px', fontSize: '13px' }} onClick={(e) => addToCart(e, p)}>
                  Thêm vào giỏ
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {products.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--muted)', background: '#fff', borderRadius: '10px', border: '1px dashed var(--line)' }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📭</span>
            Hiện tại chưa có sản phẩm nào được bày bán.
          </div>
        )}
      </div>

      {/* Modal chi tiết sản phẩm */}
      {selectedProduct && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }} onClick={() => setSelectedProduct(null)}>
          <div className="panel page-transition" style={{ width: '100%', maxWidth: '400px', padding: '0', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ height: '280px', background: '#f0f3ed', display: 'grid', placeItems: 'center', fontSize: '80px' }}>
              {selectedProduct.image ? <img src={selectedProduct.image} alt="img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🛍️'}
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ color: 'var(--copper)', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>{selectedProduct.category}</div>
                  <h2 style={{ margin: 0 }}>{selectedProduct.name}</h2>
                </div>
                <strong style={{ fontSize: '22px', color: 'var(--green-2)' }}>{Number(selectedProduct.reference_price).toLocaleString('vi-VN')}đ</strong>
              </div>
              <p style={{ color: 'var(--muted)', margin: '0 0 24px 0', minHeight: '60px' }}>{selectedProduct.description || 'Chưa có mô tả cho sản phẩm này.'}</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn ghost" style={{ flex: 1, color: 'var(--ink)', borderColor: 'var(--line)' }} onClick={() => setSelectedProduct(null)}>Đóng</button>
                <button className="btn" style={{ flex: 1, background: 'var(--green-2)', color: '#fff' }} onClick={(e) => addToCart(e, selectedProduct)}>Thêm vào giỏ hàng</button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Thông báo bay lên (Toast) */}
      {toast && createPortal(
        <div className="page-transition" style={{ position: 'fixed', bottom: '30px', right: '30px', background: 'var(--green-2)', color: '#fff', padding: '14px 24px', borderRadius: '8px', boxShadow: '0 10px 20px rgba(0,0,0,0.2)', zIndex: 10000, fontWeight: 'bold' }}>✓ {toast}</div>
      , document.body)}
    </div>
  );
}