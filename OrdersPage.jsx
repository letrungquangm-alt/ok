import React, { useEffect, useState } from 'react';
import api from './api';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';

export default function OrdersPage({ isHistory = false }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // States cho modal cập nhật tra cứu
  const [folderName, setFolderName] = useState('');
  const [lookupStatus, setLookupStatus] = useState('Bình thường');
  const [linkStatus, setLinkStatus] = useState('Đang xem xét');
  const [packageType, setPackageType] = useState('Trả phí');
  const [linkProvisionTime, setLinkProvisionTime] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [drivePassword, setDrivePassword] = useState('');
  const [previewImage, setPreviewImage] = useState('');
  const [notes, setNotes] = useState('');
  
  const [alertMsg, setAlertMsg] = useState('');
  const [updating, setUpdating] = useState(false);
  const [confirmObj, setConfirmObj] = useState(null);
  const [subTab, setSubTab] = useState('pending_email'); // 'pending_email' (chờ gửi mail/đã thanh toán) hoặc 'pending_payment' (chờ thanh toán)

  const [selectedOrderToPay, setSelectedOrderToPay] = useState(null);
  const [payChecking, setPayChecking] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [showPayDetails, setShowPayDetails] = useState(false);
  const [bankConfig, setBankConfig] = useState({
    bankBrand: 'TCB',
    accountNo: '3624081006',
    accountName: 'HOANG ANH KIET'
  });

  useEffect(() => {
    api.get('/public-config')
      .then(res => {
        if (res.data) setBankConfig(res.data);
      })
      .catch(err => console.error('Lỗi tải cấu hình ngân hàng:', err));
  }, []);

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

  const location = useLocation();

  useEffect(() => {
    // Nếu được điều hướng từ Dashboard với subTab cụ thể thì chọn sẵn tab đó
    if (location.state?.subTab) {
      setSubTab(location.state.subTab);
    }
  }, [location.state]);

  useEffect(() => {
    fetchOrders();
  }, [isHistory]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) return alert('Ảnh quá lớn. Vui lòng chọn ảnh dưới 2MB');
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateLookupOrder = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await api.put(`/orders/${selectedOrder.id}/lookup-update`, {
        folderName,
        lookupStatus,
        linkStatus,
        packageType,
        linkProvisionTime,
        driveLink,
        drivePassword,
        previewImage,
        notes
      });
      setSelectedOrder(null);
      fetchOrders();
      setAlertMsg('Cập nhật đơn hàng tra cứu thành công! Hệ thống đã tự động gửi mail tới khách.');
    } catch (err) {
      setAlertMsg(err.response?.data?.error || 'Lỗi cập nhật đơn hàng.');
    } finally {
      setUpdating(false);
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

  const handleConfirmFree = (order) => {
    setConfirmObj({
      message: `Xác nhận đơn "${order.order_no}" cho khách hàng? Hệ thống sẽ gửi email ngay và hoàn thành đơn.`,
      onConfirm: async () => {
        try {
          await api.post(`/orders/${order.id}/confirm-free`);
          setAlertMsg('Gửi email thành công! Đơn hàng đã được hoàn thành.');
          fetchOrders();
        } catch (err) {
          setAlertMsg(err.response?.data?.error || 'Lỗi khi xác nhận đơn');
        }
      }
    });
  };

  const triggerPaymentCheck = async () => {
    if (!selectedOrderToPay) return;
    setPayChecking(true);
    try {
      const res = await api.get(`/orders/${selectedOrderToPay.id}/payment-status`);
      setPayChecking(false);
      if (res.data.isPaid) {
        setPaySuccess(true);
        fetchOrders();
      } else {
        alert('Hệ thống chưa ghi nhận được thanh toán chuyển khoản. Vui lòng thử lại sau.');
      }
    } catch (err) {
      setPayChecking(false);
      alert('Lỗi kiểm tra trạng thái thanh toán.');
    }
  };

  const simulatePaymentScan = async () => {
    if (!selectedOrderToPay) return;
    setPayChecking(true);
    setTimeout(async () => {
      try {
        await api.post('/lookups/pay', { orderId: selectedOrderToPay.id });
        setPayChecking(false);
        setPaySuccess(true);
        fetchOrders();
      } catch (err) {
        setPayChecking(false);
        alert('Lỗi khi mô phỏng thanh toán.');
      }
    }, 2500);
  };

  const closePaymentModal = (wasSuccess = false) => {
    setSelectedOrderToPay(null);
    setPaySuccess(false);
    setPayChecking(false);
    setShowPayDetails(false);
    // Nếu vừa thanh toán thành công → tự động nhảy sang tab Chờ gửi mail
    if (wasSuccess) {
      setSubTab('pending_email');
    }
    fetchOrders();
  };

  const getMailStatusPill = (status) => {
    switch (status) {
      case 'COMPLETED': return <span className="pill green">Đã gửi</span>;
      case 'CANCELLED': return <span className="pill" style={{ background: '#fce8e8', color: 'var(--red)' }}>Đã hủy</span>;
      default: return <span className="pill gold">Đang chờ</span>;
    }
  };

  const getPaymentStatusPill = (isPaid) => {
    if (isPaid) {
      return <span className="pill green">Đã thanh toán</span>;
    }
    return <span className="pill red" style={{ background: '#fce8e8', color: 'var(--red)' }}>Chưa thanh toán</span>;
  };

  const parseContactInfo = (address) => {
    if (!address) return { name: 'Khách vãng lai', phone: 'Chưa có', email: 'Chưa có' };
    const parts = address.split(' - ');
    let name = 'Khách vãng lai';
    let phone = 'Chưa có';
    let email = 'Chưa có';
    
    parts.forEach(part => {
      const trimmed = part.trim();
      if (trimmed.startsWith('[')) {
        name = trimmed.replace(/[\[\]]/g, '').trim();
      } else if (trimmed.startsWith('SĐT:')) {
        phone = trimmed.replace('SĐT:', '').trim();
      } else if (trimmed.startsWith('Email:')) {
        email = trimmed.replace('Email:', '').trim();
      } else if (trimmed.includes('@') && !trimmed.startsWith('Email:')) {
        email = trimmed;
      }
    });
    
    return { name, phone, email };
  };

  const calculateDates = (provisionTimeStr) => {
    if (!provisionTimeStr) return { expiry: 'N/A', reprovision: 'N/A' };
    const date = new Date(provisionTimeStr);
    if (isNaN(date.getTime())) return { expiry: 'N/A', reprovision: 'N/A' };
    
    const expiry = new Date(date);
    expiry.setMonth(expiry.getMonth() + 3);
    
    const reprovision = new Date(expiry);
    reprovision.setDate(reprovision.getDate() + 15);
    
    return {
      expiry: expiry.toLocaleDateString('vi-VN'),
      reprovision: reprovision.toLocaleDateString('vi-VN')
    };
  };

  const filteredOrders = orders.filter(o => {
    const isFinished = o.status === 'COMPLETED' || o.status === 'CANCELLED';
    if (isHistory) return isFinished;

    // Trang Đơn mới: Chỉ hiển thị các đơn chưa hoàn tất/hủy
    if (isFinished) return false;
    if (subTab === 'pending_email') {
      return o.is_paid;
    } else {
      return !o.is_paid;
    }
  });

  if (loading) return <div style={{ padding: '20px' }}>Đang tải danh sách đơn hàng...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <section className="panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="panel-head" style={{ padding: '20px 20px 10px 20px' }}><h2>{isHistory ? 'Lịch sử Đơn hàng' : 'Danh sách Đơn mới'}</h2></div>
        
        {!isHistory && (
          <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: '16px', gap: '20px', padding: '0 20px' }}>
            <button 
              type="button" 
              onClick={() => setSubTab('pending_email')} 
              style={{
                padding: '12px 6px',
                background: 'none',
                border: 'none',
                borderBottom: subTab === 'pending_email' ? '2.5px solid var(--green-2)' : '2.5px solid transparent',
                color: subTab === 'pending_email' ? 'var(--green-2)' : 'var(--muted)',
                fontWeight: subTab === 'pending_email' ? '700' : '500',
                cursor: 'pointer',
                fontSize: '14px',
                fontFamily: 'inherit',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
            >
              Chờ gửi mail ({orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED' && o.is_paid).length})
            </button>
            <button 
              type="button" 
              onClick={() => setSubTab('pending_payment')} 
              style={{
                padding: '12px 6px',
                background: 'none',
                border: 'none',
                borderBottom: subTab === 'pending_payment' ? '2.5px solid var(--green-2)' : '2.5px solid transparent',
                color: subTab === 'pending_payment' ? 'var(--green-2)' : 'var(--muted)',
                fontWeight: subTab === 'pending_payment' ? '700' : '500',
                cursor: 'pointer',
                fontSize: '14px',
                fontFamily: 'inherit',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
            >
              Chờ thanh toán ({orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED' && !o.is_paid).length})
            </button>
          </div>
        )}

        <div className="table-wrap" style={{ padding: '0 20px 20px 20px' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Mã Tra Cứu Khách Hàng</th>
                <th style={{ width: '15%' }}>Mã sản phẩm (Mã Đơn)</th>
                <th style={{ width: '12%' }}>Khách hàng</th>
                <th style={{ width: '22%' }}>Thông tin liên hệ</th>
                <th style={{ textAlign: 'center', whiteSpace: 'nowrap', width: '12%', paddingRight: '25px' }}>Trạng thái gửi mail</th>
                <th style={{ width: '12%' }}>Thanh toán</th>
                <th style={{ width: '12%' }}>Ngày tạo</th>
                <th style={{ width: '10%' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)', fontSize: '14px' }}>
                    Hiện tại không có gì ở đây
                  </td>
                </tr>
              ) : (
                filteredOrders.map(o => {
                  const contact = parseContactInfo(o.delivery_address);
                  return (
                    <tr key={o.id}>
                      <td>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          {o.preview_image ? (
                            <img src={o.preview_image} alt="preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--line)' }} />
                          ) : (
                            <div style={{ width: '40px', height: '40px', background: '#fafafa', border: '1px solid var(--line)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--muted)', textAlign: 'center' }}>Không ảnh</div>
                          )}
                          <div>
                            <strong style={{ color: 'var(--green-2)' }}>{o.lookup_code || 'N/A'}</strong>
                            <br/>
                            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                              {o.is_web_order ? '🌐 Đặt từ Web' : '🏢 Tạo nội bộ'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>{o.order_no}</strong>
                        {o.link_provision_time && (
                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                            📅 Cấp link: <strong>{o.link_provision_time ? o.link_provision_time.split('T')[0] : 'N/A'}</strong>
                          </div>
                        )}
                      </td>
                      <td>{contact.name}</td>
                      <td>
                        <div style={{ fontSize: '12px' }}>
                          <div>📞 SĐT: <strong>{contact.phone}</strong></div>
                          <div style={{ color: 'var(--muted)' }}>✉ Email: {contact.email}</div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>{getMailStatusPill(o.status)}</td>
                      <td>{getPaymentStatusPill(o.is_paid)}</td>
                      <td>{new Date(o.created_at).toLocaleString('vi-VN')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {!isHistory ? (
                            <>
                              {subTab === 'pending_email' && (
                                <button 
                                  className="btn ghost" 
                                  style={{ color: 'var(--blue)', borderColor: 'var(--blue)', padding: '4px 10px', minHeight: 'auto' }} 
                                  onClick={() => { 
                                    setSelectedOrder(o); 
                                    setFolderName(o.folder_name || '');
                                    setLookupStatus(o.lookup_status || 'Bình thường');
                                    setLinkStatus(o.link_status || 'Đang xem xét');
                                    setPackageType(o.package_type || 'Trả phí');
                                    setLinkProvisionTime(o.link_provision_time ? o.link_provision_time.split('T')[0] : '');
                                    setDriveLink(o.drive_link || '');
                                    setDrivePassword(o.drive_password || '');
                                    setPreviewImage(o.preview_image || '');
                                    setNotes(o.notes || '');
                                  }}
                                >
                                  Cập nhật
                                </button>
                              )}
                              {o.status !== 'CANCELLED' && o.status !== 'COMPLETED' && (
                                <button className="btn ghost" style={{ color: 'var(--copper)', borderColor: 'var(--copper)', padding: '4px 10px', minHeight: 'auto' }} onClick={() => handleCancelOrder(o.id, o.order_no)}>Hủy</button>
                              )}
                              {!o.is_paid && o.status !== 'CANCELLED' && (
                                o.package_type === 'Miễn phí' ? (
                                  <button className="btn ghost" style={{ color: 'var(--blue)', borderColor: 'var(--blue)', padding: '4px 10px', minHeight: 'auto' }} onClick={() => handleConfirmFree(o)}>Xác nhận</button>
                                ) : (
                                  <button className="btn ghost" style={{ color: 'var(--green-2)', borderColor: 'var(--green-2)', padding: '4px 10px', minHeight: 'auto' }} onClick={() => setSelectedOrderToPay(o)}>Mock Thanh Toán</button>
                                )
                              )}
                            </>
                          ) : (
                            <button className="btn ghost" style={{ color: 'var(--red)', borderColor: 'var(--red)', padding: '4px 10px', minHeight: 'auto' }} onClick={() => handleDeleteOrder(o.id, o.order_no)}>Xóa</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* --- UPDATE LOOKUP ORDER MODAL --- */}
      {selectedOrder && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <form className="panel page-transition" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', background: '#fff' }} onSubmit={handleUpdateLookupOrder}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--line)', paddingBottom: '10px' }}>
              <h3 style={{ color: 'var(--blue)', margin: 0 }}>Cập nhật Đơn hàng Tra cứu</h3>
              <button type="button" className="btn ghost" style={{ border: 'none', padding: '4px 8px', minHeight: 'auto', color: 'var(--muted)' }} onClick={() => setSelectedOrder(null)}>✕</button>
            </div>
            
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
              Mã sản phẩm (Mã đơn): <strong>{selectedOrder.order_no}</strong> | Mã tra cứu: <strong style={{ color: 'var(--green-2)' }}>{selectedOrder.lookup_code || 'N/A'}</strong>
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <span className="label">Tên thư mục (Drive Folder)</span>
                <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', background: '#f5f5f5', color: 'var(--muted)' }} placeholder="Nhập tên thư mục lưu..." value={folderName} disabled />
              </div>
              <div>
                <span className="label">Trạng thái đơn hàng</span>
                <select style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', background: '#fff' }} value={lookupStatus} onChange={e => setLookupStatus(e.target.value)}>
                  <option value="Bình thường">Bình thường</option>
                  <option value="Đã hết hạn">Đã hết hạn</option>
                  <option value="Đang cập nhật">Đang cập nhật</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <span className="label">Trạng thái cấp link</span>
                <select style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', background: '#fff' }} value={linkStatus} onChange={e => setLinkStatus(e.target.value)}>
                  <option value="Đang xem xét">Đang xem xét</option>
                  <option value="Không được cấp lại">Không được cấp lại</option>
                </select>
              </div>
              <div>
                <span className="label">Gói ảnh</span>
                <select style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', background: '#f5f5f5', color: 'var(--muted)' }} value={packageType} disabled>
                  <option value="Trả phí">Trả phí</option>
                  <option value="Miễn phí">Miễn phí</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px', alignItems: 'center' }}>
              <div>
                <span className="label">Thời gian cấp link</span>
                <input type="date" style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--line)', background: '#f5f5f5', color: 'var(--muted)' }} value={linkProvisionTime} disabled />
              </div>
              <div style={{ fontSize: '13px' }}>
                <span style={{ color: 'var(--muted)' }}>Ngày hết hạn:</span>
                <br/>
                <strong>{calculateDates(linkProvisionTime).expiry}</strong>
              </div>
              <div style={{ fontSize: '13px' }}>
                <span style={{ color: 'var(--muted)' }}>Hạn cấp lại link:</span>
                <br/>
                <strong>{calculateDates(linkProvisionTime).reprovision}</strong>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <span className="label">Link download (Drive)</span>
                <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }} placeholder="Nhập link Drive..." value={driveLink} onChange={e => setDriveLink(e.target.value)} required />
              </div>
              <div>
                <span className="label">Mật khẩu Drive</span>
                <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }} placeholder="Mật khẩu..." value={drivePassword} onChange={e => setDrivePassword(e.target.value)} />
              </div>
            </div>

            {/* Upload Preview Image */}
            <div style={{ marginBottom: '16px', display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <span className="label">Ảnh xem trước (Preview Image)</span>
                <input type="file" accept="image/*" onChange={handleFileChange} style={{ fontSize: '13px' }} />
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>Hỗ trợ định dạng JPG, PNG. Dưới 2MB.</div>
              </div>
              {previewImage && (
                <div style={{ width: '120px', height: '80px', border: '1px solid var(--line)', borderRadius: '6px', overflow: 'hidden', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={previewImage} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              )}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <span className="label">Ghi chú (Notes)</span>
              <textarea style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', minHeight: '50px', fontFamily: 'inherit' }} placeholder="Nhập ghi chú..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn ghost" style={{ color: 'var(--ink)' }} onClick={() => setSelectedOrder(null)}>Hủy</button>
              <button type="submit" className="btn" style={{ background: 'var(--blue)', color: '#fff' }} disabled={updating}>
                {updating ? 'Đang cập nhật...' : 'Xác nhận & Cập nhật'}
              </button>
            </div>
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
      {/* Modal Thanh toán QR (Giống phía khách hàng để Admin mock quét tích xanh) */}
      {selectedOrderToPay && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div className="panel page-transition" style={{ width: '100%', maxWidth: '420px', padding: '0', overflow: 'hidden', background: '#fff', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--green-2)' }}>VietQR Thanh toán</h3>
              {!payChecking && (
                <button type="button" className="btn ghost" style={{ padding: '4px 8px', minHeight: 'auto', border: 'none', color: 'var(--muted)' }} onClick={() => closePaymentModal(paySuccess)}>✕</button>
              )}
            </div>
            
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* QR Image Container with Overlay */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                background: '#fafafa', 
                padding: '16px', 
                borderRadius: '12px', 
                border: '1px solid var(--line)',
                position: 'relative',
                overflow: 'hidden',
                minHeight: '250px'
              }}>
                <img 
                  src={`https://img.vietqr.io/image/${bankConfig.bankBrand}-${bankConfig.accountNo}-compact.png?amount=${selectedOrderToPay.price}&addInfo=${selectedOrderToPay.lookup_code}%20Thanh%20Toan%20Goi%20Anh&accountName=${encodeURIComponent(bankConfig.accountName)}`} 
                  alt="VietQR Payment" 
                  style={{ 
                    maxWidth: '220px', 
                    height: 'auto', 
                    display: 'block',
                    filter: (payChecking || paySuccess) ? 'blur(3px)' : 'none',
                    transition: 'all 0.3s ease'
                  }} 
                />
                
                {/* Status Overlay */}
                {(payChecking || paySuccess) && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: paySuccess ? 'rgba(240, 253, 244, 0.95)' : 'rgba(255, 255, 255, 0.85)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'fadeIn 0.2s ease-in-out',
                    zIndex: 2
                  }}>
                    {payChecking && (
                      <>
                        <div className="spinner" style={{ 
                          border: '4px solid rgba(0,0,0,0.1)', 
                          width: '48px', 
                          height: '48px', 
                          borderRadius: '50%', 
                          borderLeftColor: 'var(--green-2)', 
                          animation: 'spin 1s linear infinite',
                          marginBottom: '12px'
                        }}></div>
                        <span style={{ fontWeight: '600', color: 'var(--ink)', fontSize: '15px' }}>Đang xác minh giao dịch...</span>
                        <span style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '4px', textAlign: 'center' }}>Hệ thống đang đối soát tài khoản ngân hàng mô phỏng.</span>
                      </>
                    )}
                    
                    {paySuccess && (
                      <>
                        <div style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          background: '#dfeee7',
                          color: 'var(--green-2)',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: '32px',
                          fontWeight: 'bold',
                          marginBottom: '12px',
                          animation: 'scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}>
                          ✓
                        </div>
                        <span style={{ fontWeight: 'bold', color: 'var(--green-2)', fontSize: '16px' }}>Thanh toán thành công!</span>
                        <span style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '4px', textAlign: 'center', padding: '0 12px' }}>
                          Đơn hàng {selectedOrderToPay.order_no} đã được thanh toán hoàn tất.
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Transfer Info */}
              {!paySuccess && (
                <div style={{ border: '1px solid var(--line)', borderRadius: '8px', overflow: 'hidden' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowPayDetails(!showPayDetails)} 
                    style={{ 
                      width: '100%', 
                      padding: '10px 14px', 
                      background: '#f8faf9', 
                      border: 'none', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      color: 'var(--green-2)',
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                  >
                    <span>ℹ️ Chi tiết thông tin chuyển khoản</span>
                    <span>{showPayDetails ? '▲' : '▼'}</span>
                  </button>
                  
                  {showPayDetails && (
                    <div style={{ 
                      padding: '14px', 
                      background: '#fff', 
                      borderTop: '1px solid var(--line)', 
                      fontSize: '13px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '8px',
                      animation: 'fadeIn 0.2s ease-in-out'
                    }}>
                      <div><span style={{ color: 'var(--muted)' }}>Ngân hàng:</span> <strong>{bankConfig.bankBrand}</strong></div>
                      <div><span style={{ color: 'var(--muted)' }}>Số tài khoản:</span> <strong>{bankConfig.accountNo}</strong></div>
                      <div><span style={{ color: 'var(--muted)' }}>Chủ tài khoản:</span> <strong>{bankConfig.accountName}</strong></div>
                      <div><span style={{ color: 'var(--muted)' }}>Số tiền:</span> <strong style={{ color: 'var(--red)', fontSize: '15px' }}>{Number(selectedOrderToPay.price).toLocaleString('vi-VN')} đ</strong></div>
                      <div>
                        <span style={{ color: 'var(--muted)' }}>Nội dung chuyển khoản:</span> 
                        <br/>
                        <code style={{ fontSize: '13.5px', fontWeight: 'bold', background: '#eaeaea', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', marginTop: '4px', letterSpacing: '0.5px' }}>
                          {selectedOrderToPay.lookup_code} Thanh Toan Goi Anh
                        </code>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!paySuccess ? (
                <div style={{ color: 'var(--muted)', fontSize: '12px', fontStyle: 'italic', textAlign: 'center' }}>
                  Quét mã QR bằng ứng dụng ngân hàng để thanh toán nhanh hơn. Hệ thống sẽ tự động xác minh sau khi bạn bấm nút xác nhận dưới đây.
                </div>
              ) : (
                <div style={{ background: '#e2f3eb', color: '#065f46', padding: '16px', borderRadius: '8px', border: '1px solid #a7f3d0', fontSize: '14px', textAlign: 'center', lineHeight: '1.5' }}>
                  Hệ thống đã nhận thanh toán thành công và tự động chuyển trạng thái đơn hàng hoàn thành.
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', flexDirection: 'column', marginTop: '8px' }}>
                {paySuccess ? (
                  <button type="button" className="btn primary" style={{ width: '100%', height: '42px', fontWeight: 'bold' }} onClick={() => closePaymentModal(true)}>
                    Đóng
                  </button>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button type="button" className="btn ghost" style={{ flex: 1, color: 'var(--ink)' }} disabled={payChecking} onClick={() => setSelectedOrderToPay(null)}>Hủy thanh toán</button>
                      <button type="button" className="btn primary" style={{ flex: 1 }} disabled={payChecking} onClick={triggerPaymentCheck}>
                        {payChecking ? 'Đang xác minh...' : 'Tôi đã chuyển khoản'}
                      </button>
                    </div>
                    <button type="button" className="btn ghost" style={{ color: 'var(--green-2)', borderColor: 'var(--green-2)', width: '100%' }} disabled={payChecking} onClick={simulatePaymentScan}>
                      ⚡ Mock Thanh Toán (Mô phỏng)
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}