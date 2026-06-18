import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import { createPortal } from 'react-dom';

export default function CartPage() {
  const [cart, setCart] = useState([]);
  const [alertObj, setAlertObj] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(savedCart);
  }, []);

  const updateQuantity = (id, delta) => {
    const newCart = cart.map(item => {
      if (item.id === id) return { ...item, quantity: Math.max(1, item.quantity + delta) };
      return item;
    });
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const removeItem = (id) => {
    const newCart = cart.filter(item => item.id !== id);
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    const lines = cart.map(item => ({ productId: item.id, quantity: item.quantity }));
    
    try {
      await api.post('/shop/order', { lines });
      localStorage.removeItem('cart');
      setCart([]);
      setAlertObj({
        message: '🎉 Chúc mừng! Đặt hàng thành công. Bạn có thể theo dõi đơn ở mục "Đơn mua của bạn".',
        onClose: () => navigate('/my-orders')
      });
    } catch (err) {
      if (err.response?.data?.error?.includes('cập nhật số điện thoại')) {
        setAlertObj({
          message: 'Vui lòng cập nhật Số điện thoại và Địa chỉ giao hàng trong Hồ sơ trước khi đặt hàng!',
          onClose: () => navigate('/profile')
        });
      } else {
        setAlertObj({
          message: err.response?.data?.error || 'Lỗi đặt hàng'
        });
      }
    }
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="panel-head" style={{ marginBottom: '20px' }}><h2>Giỏ hàng của bạn</h2></div>
      
      {cart.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛒</div>
          Giỏ hàng đang trống. Hãy quay lại cửa hàng để chọn món đồ yêu thích nhé!
          <br/><br/>
          <button className="btn primary" onClick={() => navigate('/shop')}>Đến cửa hàng</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {cart.map(item => (
            <div key={item.id} className="panel page-transition" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '16px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '8px', background: '#f0f3ed', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px' }}>
                {item.image ? <img src={item.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="img" /> : '🛍️'}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{item.name}</h3>
                <strong style={{ color: 'var(--copper)' }}>{Number(item.price).toLocaleString('vi-VN')} đ</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f4f6f1', padding: '4px', borderRadius: '8px' }}>
                <button className="btn ghost" style={{ minHeight: '30px', padding: '0 12px', borderColor: 'transparent', color: 'var(--ink)' }} onClick={() => updateQuantity(item.id, -1)}>-</button>
                <span style={{ fontWeight: 'bold', width: '20px', textAlign: 'center' }}>{item.quantity}</span>
                <button className="btn ghost" style={{ minHeight: '30px', padding: '0 12px', borderColor: 'transparent', color: 'var(--ink)' }} onClick={() => updateQuantity(item.id, 1)}>+</button>
              </div>
              <button className="btn ghost" style={{ color: 'var(--red)', borderColor: 'transparent' }} onClick={() => removeItem(item.id)}>Xóa</button>
            </div>
          ))}
          
          <div className="panel" style={{ marginTop: '16px', background: '#f2f8f5', border: '1px solid #cce0d6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><span style={{ color: 'var(--muted)' }}>Tổng thanh toán:</span><br/><strong style={{ fontSize: '24px', color: 'var(--green-2)' }}>{total.toLocaleString('vi-VN')} đ</strong></div>
            <button className="btn" style={{ background: 'var(--green-2)', color: '#fff', fontSize: '16px', padding: '12px 32px' }} onClick={handleCheckout}>Tiến hành Đặt hàng</button>
          </div>
        </div>
      )}

      {/* Modal Thông Báo (Alert) xịn xò */}
      {alertObj && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div className="panel page-transition" style={{ width: '100%', maxWidth: '400px', padding: '0', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--line)', background: '#f9fbf9' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--ink)' }}>Thông báo</h3>
              <button type="button" className="btn ghost" style={{ padding: '4px 8px', minHeight: 'auto', border: 'none', color: 'var(--muted)' }} onClick={() => { if(alertObj.onClose) alertObj.onClose(); setAlertObj(null); }}>✕</button>
            </div>
            <div style={{ padding: '24px 20px', color: 'var(--muted)' }}>{alertObj.message}</div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line)', textAlign: 'right' }}>
              <button type="button" className="btn primary" style={{ minHeight: '36px' }} onClick={() => { if(alertObj.onClose) alertObj.onClose(); setAlertObj(null); }}>OK</button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}