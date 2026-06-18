import React, { useEffect, useState } from 'react';
import api from './api';
import { createPortal } from 'react-dom';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingCode, setTrackingCode] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [alertMsg, setAlertMsg] = useState('');
  const [confirmObj, setConfirmObj] = useState(null);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders');
      setOrders(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateTracking = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/orders/${selectedOrder.id}/tracking`, { trackingCode, estimatedDelivery });
      if (selectedOrder.status === 'DRAFT') {
         await api.post(`/orders/${selectedOrder.id}/submit`).catch(() => {});
         await api.post(`/orders/${selectedOrder.id}/logistics-receive`).catch(() => {});
      }
      setSelectedOrder(null);
      fetchOrders();
      setAlertMsg('Cập nhật vận đơn thành công! Khách hàng đã có thể theo dõi.');
    } catch (err) {
      setAlertMsg(err.response?.data?.error || 'Lỗi cập nhật vận đơn');
    }
  };

  const handleCancelOrder = (id, orderNo) => {
    setConfirmObj({
      message: `Bạn có chắc chắn muốn hủy đơn hàng "${orderNo}" không?`,
      onConfirm: async () => {
        try {
          await api.post(`/orders/${id}/cancel`);
          fetchOrders();
        } catch (err) { setAlertMsg(err.response?.data?.error || 'Lỗi khi hủy đơn hàng'); }
      }
    });
  };

  const handleDeleteOrder = (id, orderNo) => {
    setConfirmObj({
      message: `Xóa vĩnh viễn đơn hàng "${orderNo}" khỏi hệ thống? (Thao tác không thể hoàn tác)`,
      onConfirm: async () => {
        try {
          await api.delete(`/orders/${id}`);
          fetchOrders();
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
      case 'COMPLETED': return <span className="pill green">Hoàn tất</span>;
      case 'CANCELLED': return <span className="pill" style={{ background: '#fce8e8', color: 'var(--red)' }}>Đã hủy</span>;
      default: return <span className="pill gold">{status}</span>;
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Đang tải danh sách đơn hàng...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <section className="panel">
        <div className="panel-head"><h2>Quản lý Đơn hàng</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Thông tin liên hệ</th><th>Trạng thái</th><th>Ngày tạo</th><th>Hành động</th></tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td><strong>{o.order_no}</strong><br/><span style={{fontSize: '11px', color: 'var(--muted)'}}>{o.is_web_order ? '🌐 Đặt từ Web' : '🏢 Tạo nội bộ'}</span></td>
                  <td>{o.customer_name === 'Khách Đặt Web' ? o.delivery_address.split('-')[0].replace(/[\[\]]/g, '').trim() : o.customer_name}</td>
                  <td style={{ fontSize: '12px', color: 'var(--muted)', maxWidth: '200px' }}>{o.delivery_address}</td>
                  <td>{getStatusPill(o.status)}</td>
                  <td>{new Date(o.created_at).toLocaleString('vi-VN')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn ghost" style={{ color: 'var(--blue)', borderColor: 'var(--blue)', padding: '4px 10px', minHeight: 'auto' }} onClick={() => { setSelectedOrder(o); setTrackingCode(o.tracking_code || ''); setEstimatedDelivery(o.estimated_delivery ? o.estimated_delivery.split('T')[0] : ''); }}>Cập nhật</button>
                      {o.status !== 'CANCELLED' && o.status !== 'COMPLETED' && <button className="btn ghost" style={{ color: 'var(--copper)', borderColor: 'var(--copper)', padding: '4px 10px', minHeight: 'auto' }} onClick={() => handleCancelOrder(o.id, o.order_no)}>Hủy</button>}
                      {o.status === 'CANCELLED' && <button className="btn ghost" style={{ color: 'var(--red)', borderColor: 'var(--red)', padding: '4px 10px', minHeight: 'auto' }} onClick={() => handleDeleteOrder(o.id, o.order_no)}>Xóa</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedOrder && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <form className="panel page-transition" style={{ width: '100%', maxWidth: '400px', padding: '24px' }} onSubmit={handleUpdateTracking}>
            <h3 style={{ color: 'var(--blue)', marginTop: 0 }}>Cập nhật Vận đơn</h3>
            <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Đơn hàng: <strong style={{ color: 'var(--ink)'}}>{selectedOrder.order_no}</strong></p>
            <div style={{ marginBottom: '16px' }}><span className="label">Mã vận đơn (Tracking Code)</span><input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }} value={trackingCode} onChange={e => setTrackingCode(e.target.value)} placeholder="VD: GHTK123456789..." required /></div>
            <div style={{ marginBottom: '24px' }}><span className="label">Ngày giao dự kiến</span><input type="date" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }} value={estimatedDelivery} onChange={e => setEstimatedDelivery(e.target.value)} required /></div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}><button type="button" className="btn ghost" style={{ color: 'var(--ink)' }} onClick={() => setSelectedOrder(null)}>Hủy</button><button type="submit" className="btn" style={{ background: 'var(--blue)', color: '#fff' }}>Xác nhận & Cập nhật</button></div>
          </form>
        </div>
      , document.body)}

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