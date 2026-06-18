import React, { useEffect, useState } from 'react';
import api from './api';
import { createPortal } from 'react-dom';

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertMsg, setAlertMsg] = useState('');
  const [confirmObj, setConfirmObj] = useState(null);

  useEffect(() => {
    api.get('/my-orders')
      .then(res => setOrders(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

const handleCancelOrder = (id, orderNo) => {
    setConfirmObj({
      message: `Bạn có chắc chắn muốn hủy đơn hàng "${orderNo}" không?`,
      onConfirm: async () => {
        try {
          await api.post(`/my-orders/${id}/cancel`);
          setOrders(orders.map(o => o.id === id ? { ...o, status: 'CANCELLED' } : o));
        } catch (err) { setAlertMsg(err.response?.data?.error || 'Lỗi khi hủy đơn hàng'); }
      }
    });
  };

  const handleDeleteOrder = (id, orderNo) => {
    setConfirmObj({
      message: `Xóa vĩnh viễn đơn hàng "${orderNo}" khỏi lịch sử mua hàng của bạn?`,
      onConfirm: async () => {
        try {
          await api.delete(`/my-orders/${id}`);
          setOrders(orders.filter(o => o.id !== id));
        } catch (err) { setAlertMsg(err.response?.data?.error || 'Lỗi khi xóa đơn hàng'); }
      }
    });
  };

  const getStatusPill = (status) => {
    switch (status) {
      case 'DRAFT': return <span className="pill gold">Đang xử lý</span>;
      case 'SUBMITTED':
      case 'LOGISTICS_RECEIVED': 
      case 'WAREHOUSE_PROCESSING': return <span className="pill blue">Đã xác nhận & Đang giao hàng</span>;
      case 'COMPLETED': return <span className="pill green">Đã giao thành công</span>;
      case 'CANCELLED': return <span className="pill" style={{ background: '#fce8e8', color: 'var(--red)' }}>Đã hủy</span>;
      default: return <span className="pill gold">{status}</span>;
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Đang tải danh sách đơn hàng...</div>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="panel-head"><h2>Đơn mua của tôi</h2></div>
      
      {orders.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          Bạn chưa có đơn hàng nào được đặt.
        </div>
      ) : (
        orders.map(o => (
          <div key={o.id} className="panel page-transition" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <strong style={{ fontSize: '16px', color: 'var(--ink)' }}>Mã đơn: {o.order_no}</strong>
                <div style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '4px' }}>Đặt ngày: {new Date(o.created_at).toLocaleString('vi-VN')}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                {getStatusPill(o.status)}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {o.status === 'DRAFT' && <button className="btn ghost" style={{ color: 'var(--copper)', borderColor: 'var(--copper)', padding: '2px 8px', minHeight: 'auto', fontSize: '12px' }} onClick={() => handleCancelOrder(o.id, o.order_no)}>Hủy đơn</button>}
                  {o.status === 'CANCELLED' && <button className="btn ghost" style={{ color: 'var(--red)', borderColor: 'var(--red)', padding: '2px 8px', minHeight: 'auto', fontSize: '12px' }} onClick={() => handleDeleteOrder(o.id, o.order_no)}>Xóa lịch sử</button>}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '20px', fontSize: '14px' }}>
              <div>
                <div style={{ color: 'var(--muted)', marginBottom: '4px' }}>Thông tin nhận hàng:</div>
                <div style={{ lineHeight: '1.6' }}>{o.delivery_address}</div>
                <div style={{ marginTop: '12px', color: 'var(--muted)' }}>Số lượng sản phẩm: <strong style={{ color: 'var(--ink)' }}>{o.total_items}</strong> món</div>
              </div>
              
              <div style={{ background: '#f4f6f1', padding: '16px', borderRadius: '8px', border: '1px solid #e4e9e6' }}>
                <div style={{ color: 'var(--muted)', marginBottom: '8px', fontWeight: 'bold' }}>Thông tin Vận chuyển:</div>
                {o.tracking_code ? (
                  <>
                    <div style={{ marginBottom: '8px' }}>Mã vận đơn: <strong style={{ color: 'var(--blue)', fontSize: '16px' }}>{o.tracking_code}</strong></div>
                    <div>Dự kiến giao: <strong>{o.estimated_delivery ? new Date(o.estimated_delivery).toLocaleDateString('vi-VN') : 'Đang cập nhật'}</strong></div>
                  </>
                ) : (
                  <div style={{ color: 'var(--copper)' }}>Đơn hàng đang chờ nhân viên kiểm tra và điều phối giao hàng. (Thông tin vận đơn sẽ xuất hiện ở đây)</div>
                )}
              </div>
            </div>
          </div>
        ))
      )}

      {/* Modal Thông Báo (Alert) */}
      {alertMsg && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div className="panel page-transition" style={{ width: '100%', maxWidth: '400px', padding: '0', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--line)', background: '#f9fbf9' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--ink)' }}>Thông báo</h3>
              <button type="button" className="btn ghost" style={{ padding: '4px 8px', minHeight: 'auto', border: 'none', color: 'var(--muted)' }} onClick={() => setAlertMsg('')}>✕</button>
            </div>
            <div style={{ padding: '24px 20px', color: 'var(--muted)' }}>{alertMsg}</div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line)', textAlign: 'right' }}>
              <button type="button" className="btn primary" style={{ minHeight: '36px' }} onClick={() => setAlertMsg('')}>OK</button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Modal Xác Nhận (Confirm) */}
      {confirmObj && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div className="panel page-transition" style={{ width: '100%', maxWidth: '400px', padding: '0', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--line)', background: '#f9fbf9' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--ink)' }}>Xác nhận</h3>
              <button type="button" className="btn ghost" style={{ padding: '4px 8px', minHeight: 'auto', border: 'none', color: 'var(--muted)' }} onClick={() => setConfirmObj(null)}>✕</button>
            </div>
            <div style={{ padding: '24px 20px', color: 'var(--muted)' }}>{confirmObj.message}</div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn ghost" style={{ color: 'var(--ink)', borderColor: 'var(--line)', minHeight: '36px' }} onClick={() => setConfirmObj(null)}>Hủy</button>
              <button type="button" className="btn" style={{ background: 'var(--red)', color: '#fff', minHeight: '36px' }} onClick={() => { confirmObj.onConfirm(); setConfirmObj(null); }}>Đồng ý</button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}