import React, { useState, useEffect, useRef } from 'react';
import api from './api';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

export default function ShopPage({ viewType = 'search' }) {
  const [codeQuery, setCodeQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const navigate = useNavigate();

  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Modal tạo mã
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFullName, setCreateFullName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [isEmailDuplicate, setIsEmailDuplicate] = useState(false);
  const [createdCode, setCreatedCode] = useState('');

  // Modal quên mã
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1: Nhập email, 2: Nhập OTP
  const [otpCode, setOtpCode] = useState('');
  const [recoveredCode, setRecoveredCode] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Countdown timer for resending OTP
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Modal thanh toán VietQR
  const [selectedOrderToPay, setSelectedOrderToPay] = useState(null);
  const [payChecking, setPayChecking] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [showPayDetails, setShowPayDetails] = useState(false);

  // Modal thông báo thành công chung (Cho gói miễn phí)
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalConfig, setSuccessModalConfig] = useState({ title: '', body: '' });

  // Ảnh phóng to xem trước
  const [zoomImage, setZoomImage] = useState(null);

  // Modal chi tiết gói ảnh chưa thanh toán/chưa xác nhận
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);

  // Tab kết quả tra cứu của khách hàng: 'current' (chưa thanh toán/chưa nhận) hoặc 'history' (đã thanh toán/đã nhận)
  const [activeTab, setActiveTab] = useState('current');

  const currentOrders = lookupResult ? lookupResult.orders.filter(order => !order.is_paid && order.status !== 'CANCELLED') : [];
  const historyOrders = lookupResult ? lookupResult.orders.filter(order => order.is_paid && order.status !== 'CANCELLED') : [];
  const visibleOrders = activeTab === 'current' ? currentOrders : historyOrders;

  const [bankConfig, setBankConfig] = useState({
    bankBrand: 'ACB',
    accountNo: '35749357',
    accountName: 'HOANG ANH KIET'
  });

  useEffect(() => {
    const controller = new AbortController();
    api.get('/public-config', { signal: controller.signal })
      .then(res => {
        if (res.data) setBankConfig(res.data);
      })
      .catch(err => {
        if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
          console.error('Lỗi tải cấu hình ngân hàng:', err);
        }
      });
    return () => controller.abort();
  }, []);

  // Auto-fill or redirect based on viewType
  useEffect(() => {
    const savedCode = localStorage.getItem('last_lookup_code');
    if (viewType === 'result') {
      if (savedCode) {
        setCodeQuery(savedCode);
        handleSearch(null, savedCode);
      } else {
        navigate('/tracuugoianh');
      }
    } else {
      if (savedCode) {
        setCodeQuery(savedCode);
      }
    }
  }, [viewType]);

  const handleSearch = async (e, forcedCode) => {
    if (e) e.preventDefault();
    const code = forcedCode || codeQuery;
    if (!code) return;

    setSearchLoading(true);
    setSearchError('');
    setLookupResult(null);

    try {
      const res = await api.get(`/lookups/search?code=${code.trim().toUpperCase()}`);
      setLookupResult(res.data);
      localStorage.setItem('last_lookup_code', code.trim().toUpperCase());
      window.dispatchEvent(new Event('lookup_change'));
      
      if (viewType === 'search') {
        navigate('/tracuu');
      }
    } catch (err) {
      setSearchError(err.response?.data?.error || 'Mã tra cứu không tồn tại hoặc đã có lỗi xảy ra.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleCreateCode = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');
    setCreatedCode('');
    setIsEmailDuplicate(false);

    try {
      const res = await api.post('/lookups', {
        email: createEmail,
        fullName: createFullName,
        phone: createPhone
      });
      setCreatedCode(res.data.code);
      setCodeQuery(res.data.code);
    } catch (err) {
      if (err.response?.data?.code === 'EMAIL_EXISTS') {
        setIsEmailDuplicate(true);
      } else {
        setCreateError(err.response?.data?.error || 'Lỗi khi đăng ký mã tra cứu.');
      }
    } finally {
      setCreateLoading(false);
    }
  };

  const handleGoToSearch = () => {
    resetAllModals();
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  };

  const handleGoToForgot = () => {
    const emailToRecover = createEmail;
    resetAllModals();
    setForgotEmail(emailToRecover);
    setShowForgotModal(true);
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setForgotLoading(true);
    setForgotError('');

    try {
      await api.post('/lookups/forgot', { email: forgotEmail });
      setForgotStep(2);
      setResendTimer(60);
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Lỗi khi gửi mã OTP.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');

    try {
      const res = await api.post('/lookups/verify', { email: forgotEmail, otp: otpCode });
      setRecoveredCode(res.data.code);
      setCodeQuery(res.data.code);
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Mã OTP không đúng hoặc hết hạn.');
    } finally {
      setForgotLoading(false);
    }
  };

  const triggerPaymentCheck = async () => {
    if (!selectedOrderToPay) return;
    setPayChecking(true);
    try {
      const res = await api.get(`/orders/${selectedOrderToPay.id}/payment-status`);
      setPayChecking(false);
      if (res.data.isPaid) {
        setPaySuccess(true);
      } else {
        alert('Hệ thống chưa ghi nhận được thanh toán chuyển khoản của bạn. Vui lòng chuyển khoản đúng nội dung cú pháp và số tiền, sau đó thử lại sau vài giây.');
      }
    } catch (err) {
      setPayChecking(false);
      alert('Lỗi kiểm tra trạng thái thanh toán.');
    }
  };

  const closePaymentModal = () => {
    setSelectedOrderToPay(null);
    setPaySuccess(false);
    setPayChecking(false);
    setShowPayDetails(false);
    setSelectedOrderDetails(null);
    // Tải lại kết quả tra cứu để hiển thị Link download ngay lập tức
    handleSearch(null, codeQuery);
  };

  const handleConfirmFreePackage = async (orderId) => {
    setSearchLoading(true);
    try {
      await api.post('/lookups/pay', { orderId });
      setSuccessModalConfig({
        title: 'Đăng ký nhận ảnh thành công!',
        body: 'Chúc mừng bạn đã hoàn thành đăng ký nhận gói ảnh, sản phẩm ảnh sẽ được gửi về email của bạn trong vòng 24 giờ tới.'
      });
      setShowSuccessModal(true);
      setSelectedOrderDetails(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Lỗi khi đăng ký nhận gói ảnh.');
    } finally {
      setSearchLoading(false);
    }
  };

  const resetAllModals = () => {
    setShowCreateModal(false);
    setCreateFullName('');
    setCreateEmail('');
    setCreatePhone('');
    setCreatedCode('');
    setCreateError('');
    setIsEmailDuplicate(false);

    setShowForgotModal(false);
    setForgotEmail('');
    setResendTimer(0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: viewType === 'result' ? '900px' : '800px', margin: '0 auto' }}>
      
      {viewType === 'search' ? (
        <>
          {/* Hero section */}
          <section className="panel page-transition" style={{ background: 'linear-gradient(120deg, var(--green), var(--green-2))', color: '#fff', border: 'none', padding: '32px' }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '28px' }}>Tra cứu thông tin gói ảnh</h2>
            <p style={{ margin: 0, color: '#e4f0ea', fontSize: '16px' }}>Nhập mã tra cứu của bạn để tải về link Drive, mật khẩu và xem trước sản phẩm ảnh.</p>
          </section>

          {/* Lookup entry panel */}
          <section className="panel" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
            <form onSubmit={(e) => handleSearch(e)}>
              <div style={{ marginBottom: '16px' }}>
                <span className="label" style={{ fontSize: '15px' }}>Mã tra cứu của bạn</span>
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
                  <input 
                    ref={searchInputRef}
                    style={{ flex: 1, padding: '12px', border: '1px solid var(--line)', borderRadius: '8px', fontSize: '16px', textTransform: 'uppercase' }} 
                    placeholder="VD: KH9X2Y..." 
                    value={codeQuery} 
                    onChange={(e) => setCodeQuery(e.target.value)} 
                    required 
                  />
                  <button type="submit" className="btn primary" style={{ minWidth: isMobile ? '100%' : '120px', fontSize: '15px' }} disabled={searchLoading}>
                    {searchLoading ? 'Đang tìm...' : 'Tra cứu'}
                  </button>
                </div>
                {searchError && (
                  <div style={{ color: 'var(--red)', fontSize: '14px', marginTop: '8px', fontWeight: 'bold' }}>
                    ✕ {searchError}
                  </div>
                )}
              </div>
            </form>
            
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '0', justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: '16px', fontSize: '14px', textAlign: 'center' }}>
              <span 
                style={{ color: 'var(--green-2)', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}
                onClick={() => { resetAllModals(); setShowCreateModal(true); }}
              >
                Đăng ký mã tra cứu mới
              </span>
              
              <span 
                style={{ color: 'var(--copper)', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}
                onClick={() => { resetAllModals(); setShowForgotModal(true); }}
              >
                Quên mã tra cứu?
              </span>
            </div>
          </section>
        </>
      ) : (
        <>
          {/* Search results view (viewType === 'result') */}
          {searchLoading ? (
            <section className="panel" style={{ background: 'var(--paper)', border: '1px solid var(--line)', textAlign: 'center', padding: '60px' }}>
              <div className="spinner" style={{ border: '4px solid rgba(0,0,0,0.1)', width: '40px', height: '40px', borderRadius: '50%', borderLeftColor: 'var(--green-2)', animation: 'spin 1s linear infinite', margin: '0 auto 20px auto' }}></div>
              <p>Đang tải thông tin kết quả tra cứu...</p>
            </section>
          ) : lookupResult ? (
            <div className="page-transition" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Customer info card */}
              <section className="panel" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
                  <h3 style={{ margin: 0, color: 'var(--copper)' }}>Kết quả tra cứu</h3>
                  <button 
                    type="button" 
                    className="btn ghost" 
                    style={{ color: 'var(--red)', borderColor: 'var(--red)', minHeight: 'auto', padding: '6px 12px', fontSize: '13px' }}
                    onClick={() => {
                      localStorage.removeItem('last_lookup_code');
                      window.dispatchEvent(new Event('lookup_change'));
                      navigate('/tracuugoianh');
                    }}
                  >
                    Đăng xuất
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '14px' }}>
                  <div><span style={{ color: 'var(--muted)' }}>Họ và tên:</span> <strong style={{ color: 'var(--ink)' }}>{lookupResult.customer.fullName}</strong></div>
                  <div><span style={{ color: 'var(--muted)' }}>Email:</span> <strong style={{ color: 'var(--ink)' }}>{lookupResult.customer.email}</strong></div>
                  <div><span style={{ color: 'var(--muted)' }}>Số điện thoại:</span> <strong style={{ color: 'var(--ink)' }}>{lookupResult.customer.phone || 'Chưa cập nhật'}</strong></div>
                  <div><span style={{ color: 'var(--muted)' }}>Trạng thái:</span> <span className="pill green" style={{ background: 'var(--bg)', color: 'var(--green-2)', border: '1px solid var(--line)' }}>Đang hoạt động</span></div>
                </div>
              </section>

              {/* Orders/Photos listing */}
              <section className="panel" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
                {/* Custom Tabs Navigation */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: '20px', gap: '24px' }}>
                  <button 
                    type="button" 
                    onClick={() => setActiveTab('current')} 
                    style={{
                      padding: '12px 6px',
                      background: 'none',
                      border: 'none',
                      borderBottom: activeTab === 'current' ? '2px solid var(--green-2)' : '2px solid transparent',
                      color: activeTab === 'current' ? 'var(--green-2)' : 'var(--muted)',
                      fontWeight: activeTab === 'current' ? '700' : '500',
                      cursor: 'pointer',
                      fontSize: '14.5px',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  >
                    Đang chờ thanh toán ({currentOrders.length})
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setActiveTab('history')} 
                    style={{
                      padding: '12px 6px',
                      background: 'none',
                      border: 'none',
                      borderBottom: activeTab === 'history' ? '2px solid var(--green-2)' : '2px solid transparent',
                      color: activeTab === 'history' ? 'var(--green-2)' : 'var(--muted)',
                      fontWeight: activeTab === 'history' ? '700' : '500',
                      cursor: 'pointer',
                      fontSize: '14.5px',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  >
                    Lịch sử mua ({historyOrders.length})
                  </button>
                </div>
                
                {visibleOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                    <span style={{ fontSize: '36px', display: 'block', marginBottom: '10px' }}>📸</span>
                    {activeTab === 'current' 
                      ? 'Hiện tại bạn không có gói ảnh nào cần xử lý hoặc thanh toán.' 
                      : 'Bạn chưa có lịch sử gói ảnh nào đã hoàn tất thanh toán.'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {visibleOrders.map(order => {
                      const isFree = order.package_type === 'Miễn phí';
                      
                      const isExpired = order.lookup_status === 'Đã hết hạn';
                      const isUpdating = order.lookup_status === 'Đang cập nhật';
                      const isBlocked = order.link_status === 'Không được cấp lại';

                      return (
                        <div 
                          key={order.id} 
                          onClick={() => setSelectedOrderDetails(order)}
                          className="order-card-clickable"
                          style={{ 
                            border: '1px solid var(--line)', 
                            borderRadius: '12px', 
                            padding: '24px', 
                            background: 'var(--paper)', 
                            boxShadow: '0 4px 12px rgba(0,0,0,0.03)', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '16px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div className="order-card-header">
                            <div>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--ink)' }}>
                                Gói sản phẩm: <span style={{ color: 'var(--muted)' }}>{order.order_no}</span>
                              </h4>
                              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                                Ngày tạo: {new Date(order.created_at).toLocaleString('vi-VN')}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <span className={`pill ${isFree ? 'gold' : 'blue'}`}>{order.package_type}</span>
                              {order.is_paid ? (
                                <span className="pill green">{isFree ? 'Đã nhận' : 'Đã thanh toán'}</span>
                              ) : order.status === 'CANCELLED' ? (
                                <span className="pill" style={{ background: '#fce8e8', color: 'var(--red)' }}>đã huỷ</span>
                              ) : (
                                <span className="pill red" style={{ background: '#fce8e8', color: 'var(--red)' }}>{isFree ? 'Chờ xác nhận' : 'Chưa thanh toán'}</span>
                              )}
                            </div>
                          </div>

                          {/* Display Status Warnings */}
                          {!order.is_paid && (isExpired || isUpdating || isBlocked) && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {isExpired && (
                                <div style={{ background: '#fff3cd', color: '#856404', padding: '10px', borderRadius: '6px', fontSize: '13px', borderLeft: '4px solid #ffc107' }}>
                                  <strong>⚠️ Thông báo hết hạn:</strong> Gói ảnh này đã quá hạn truy cập (quá 3 tháng). Hãy liên hệ quản trị viên để gia hạn.
                                </div>
                              )}
                              {isUpdating && (
                                <div style={{ background: '#d1ecf1', color: '#0c5460', padding: '10px', borderRadius: '6px', fontSize: '13px', borderLeft: '4px solid #17a2b8' }}>
                                  <strong>⏳ Đang cập nhật:</strong> Gói ảnh đang được tải lên hoặc chỉnh sửa. Vui lòng quay lại sau.
                                </div>
                              )}
                              {isBlocked && (
                                <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '6px', fontSize: '13px', borderLeft: '4px solid #dc3545' }}>
                                  <strong>🚫 Khóa link:</strong> Liên kết tải ảnh đã bị thu hồi và không cấp lại.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          ) : (
            <section className="panel" style={{ background: 'var(--paper)', border: '1px solid var(--line)', textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '10px' }}>⚠️</span>
              <p>Không tìm thấy thông tin kết quả tra cứu. Vui lòng quay lại nhập mã.</p>
              <button className="btn primary" onClick={() => navigate('/tracuugoianh')} style={{ marginTop: '20px' }}>Quay lại</button>
            </section>
          )}
        </>
      )}

      {/* --- CREATE LOOKUP CODE MODAL --- */}
      {showCreateModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <form className="panel page-transition" style={{ width: '100%', maxWidth: '440px', padding: '24px', background: 'var(--paper)', border: '1px solid var(--line)' }} onSubmit={handleCreateCode}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--line)', paddingBottom: '10px' }}>
              <h3 style={{ color: 'var(--green-2)', margin: 0 }}>Đăng ký mã tra cứu</h3>
              <button type="button" className="btn ghost" style={{ border: 'none', padding: '4px 8px', minHeight: 'auto', color: 'var(--muted)' }} onClick={resetAllModals}>✕</button>
            </div>

            {createdCode ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <span style={{ fontSize: '48px' }}>🎉</span>
                <h4 style={{ margin: '12px 0 6px 0', color: 'var(--green-2)' }}>Đăng ký mã thành công!</h4>
                <p style={{ color: 'var(--muted)', fontSize: '14px', margin: '0 0 16px 0' }}>Mã này sẽ gắn bó với email của bạn:</p>
                <div style={{ fontSize: '28px', fontWeight: 'black', letterSpacing: '2px', background: 'var(--bg)', border: '1px dashed var(--green)', padding: '16px', borderRadius: '8px', color: 'var(--ink)', display: 'inline-block', minWidth: '200px' }}>
                  {createdCode}
                </div>
                <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '16px' }}>Mã tra cứu đã tự động được điền vào ô tìm kiếm.</p>
                <button type="button" className="btn primary" style={{ width: '100%', marginTop: '24px' }} onClick={resetAllModals}>Bắt đầu sử dụng</button>
              </div>
            ) : (
              <>
                {createError && <div style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '12px', fontWeight: 'bold' }}>✕ {createError}</div>}
                
                {isEmailDuplicate && (
                  <div style={{ 
                    background: '#fce8e8', 
                    color: '#000000', 
                    padding: '12px 14px', 
                    borderRadius: '8px', 
                    fontSize: '13.5px', 
                    marginBottom: '16px', 
                    lineHeight: '1.5',
                    borderLeft: '4px solid var(--red)',
                    fontWeight: '500'
                  }}>
                    ✕ Bạn đã tạo mã tra cứu từ trước đó rồi, bạn hãy bấm vào{' '}
                    <button
                      type="button"
                      onClick={handleGoToSearch}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0066cc',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        padding: 0,
                        font: 'inherit',
                        fontWeight: 'bold',
                        display: 'inline',
                        margin: 0
                      }}
                    >
                      đây
                    </button>{' '}
                    để nhập mã nhé. Nếu bạn quên thì bấm vào{' '}
                    <button
                      type="button"
                      onClick={handleGoToForgot}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--red)',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        padding: 0,
                        font: 'inherit',
                        fontWeight: 'bold',
                        display: 'inline',
                        margin: 0
                      }}
                    >
                      quên mã tra cứu
                    </button>{' '}
                    để lấy lại mã nhé!
                  </div>
                )}
                
                <div style={{ marginBottom: '16px' }}>
                  <span className="label">Họ và tên của bạn</span>
                  <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }} placeholder="VD: Nguyễn Văn A" value={createFullName} onChange={e => setCreateFullName(e.target.value)} required />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <span className="label">Địa chỉ Email (Để khôi phục mã)</span>
                  <input type="email" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }} placeholder="VD: mail@example.com" value={createEmail} onChange={e => setCreateEmail(e.target.value)} required />
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <span className="label">Số điện thoại liên hệ</span>
                  <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }} placeholder="VD: 0909123456" value={createPhone} onChange={e => setCreatePhone(e.target.value)} required />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn ghost" style={{ color: 'var(--ink)' }} onClick={resetAllModals}>Hủy</button>
                  <button type="submit" className="btn" style={{ background: 'var(--green-2)', color: '#fff' }} disabled={createLoading}>
                    {createLoading ? 'Đang tạo...' : 'Tạo mã tra cứu'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      , document.body)}

      {/* --- FORGOT CODE / OTP MODAL --- */}
      {showForgotModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="panel page-transition" style={{ width: '100%', maxWidth: '400px', padding: '24px', background: 'var(--paper)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--line)', paddingBottom: '10px' }}>
              <h3 style={{ color: 'var(--copper)', margin: 0 }}>Quên mã tra cứu</h3>
              <button type="button" className="btn ghost" style={{ border: 'none', padding: '4px 8px', minHeight: 'auto', color: 'var(--muted)' }} onClick={resetAllModals}>✕</button>
            </div>

            {recoveredCode ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <span style={{ fontSize: '48px' }}>🔑</span>
                <h4 style={{ margin: '12px 0 6px 0', color: 'var(--ink)' }}>Mã tra cứu của bạn là:</h4>
                <div style={{ fontSize: '28px', fontWeight: 'black', letterSpacing: '2px', background: 'var(--bg)', border: '1px dashed var(--line)', padding: '16px', borderRadius: '8px', color: 'var(--ink)', display: 'inline-block', minWidth: '200px', margin: '12px 0' }}>
                  {recoveredCode}
                </div>
                <p style={{ color: 'var(--ink)', fontSize: '13px' }}>Hãy lưu lại mã này hoặc nhập ngay để tra cứu.</p>
                <button type="button" className="btn primary" style={{ width: '100%', marginTop: '24px' }} onClick={resetAllModals}>OK</button>
              </div>
            ) : forgotStep === 1 ? (
              <form onSubmit={handleSendOtp}>
                <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '16px' }}>Nhập Email bạn đã đăng ký để hệ thống gửi mã xác nhận OTP.</p>
                
                {forgotError && <div style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '12px', fontWeight: 'bold' }}>✕ {forgotError}</div>}
                
                <div style={{ marginBottom: '20px' }}>
                  <span className="label">Địa chỉ Email</span>
                  <input type="email" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }} placeholder="VD: email@example.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
                </div>
                
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn ghost" style={{ color: 'var(--ink)' }} onClick={resetAllModals}>Hủy</button>
                  <button type="submit" className="btn" style={{ background: 'var(--copper)', color: '#fff' }} disabled={forgotLoading || resendTimer > 0}>
                    {forgotLoading ? 'Đang gửi...' : resendTimer > 0 ? `Gửi lại sau ${resendTimer}s` : 'Gửi mã OTP'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '16px' }}>Mã OTP đã được gửi về email <strong>{forgotEmail}</strong>. Vui lòng kiểm tra và nhập OTP bên dưới.</p>
                
                {forgotError && <div style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '12px', fontWeight: 'bold' }}>✕ {forgotError}</div>}
                
                <div style={{ marginBottom: '20px' }}>
                  <span className="label">Nhập mã OTP (6 số)</span>
                  <input style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)', textAlign: 'center', fontSize: '20px', letterSpacing: '4px', fontWeight: 'bold' }} placeholder="000000" maxLength={6} value={otpCode} onChange={e => setOtpCode(e.target.value)} required />
                </div>

                <div style={{ textAlign: 'center', marginBottom: '20px', fontSize: '14px' }}>
                  {resendTimer > 0 ? (
                    <span style={{ color: 'var(--muted)' }}>
                      Bạn có thể gửi lại mã sau <strong style={{ color: 'var(--copper)' }}>{resendTimer}</strong> giây
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--copper)',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        padding: 0,
                        font: 'inherit'
                      }}
                      disabled={forgotLoading}
                    >
                      {forgotLoading ? 'Đang gửi lại...' : 'Gửi lại mã OTP'}
                    </button>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn ghost" style={{ color: 'var(--ink)' }} onClick={() => setForgotStep(1)}>Quay lại</button>
                  <button type="submit" className="btn primary" disabled={forgotLoading}>
                    {forgotLoading ? 'Đang xác nhận...' : 'Xác nhận OTP'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      , document.body)}

      {/* --- VIETQR PAYMENT MODAL --- */}
      {selectedOrderToPay && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="panel page-transition" style={{ width: '100%', maxWidth: '440px', padding: '0', overflow: 'hidden', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--green-2)' }}>Thanh toán qua QR Chuyển khoản</h3>
              {!payChecking && (
                <button type="button" className="btn ghost" style={{ padding: '4px 8px', minHeight: 'auto', border: 'none', color: 'var(--muted)' }} onClick={closePaymentModal}>✕</button>
              )}
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* QR Image Container with Overlay */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                background: 'var(--bg)', 
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
                    background: paySuccess ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg)',
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
                        <span style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '4px' }}>Vui lòng không tắt bảng này</span>
                      </>
                    )}
                    
                    {paySuccess && (
                      <>
                        <div style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          background: 'var(--bg)',
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
                      background: 'var(--bg)', 
                      border: 'none', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      fontSize: '13.5px',
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
                      background: 'var(--paper)', 
                      borderTop: '1px solid var(--line)', 
                      fontSize: '13.5px', 
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
                        <code style={{ fontSize: '14px', fontWeight: 'bold', background: 'var(--bg)', color: 'var(--ink)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', marginTop: '4px', letterSpacing: '0.5px' }}>
                          {selectedOrderToPay.lookup_code} Thanh Toan Goi Anh
                        </code>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!paySuccess ? (
                <div style={{ color: 'var(--muted)', fontSize: '12px', fontStyle: 'italic', textAlign: 'center' }}>
                  Quét mã QR bằng ứng dụng ngân hàng của bạn để thanh toán nhanh hơn. Hệ thống sẽ tự động xác minh sau khi bạn bấm nút xác nhận dưới đây.
                </div>
              ) : (
                <div style={{ background: '#e2f3eb', color: '#065f46', padding: '16px', borderRadius: '8px', border: '1px solid #a7f3d0', fontSize: '14px', textAlign: 'center', lineHeight: '1.5' }}>
                  Chúc mừng bạn đã thanh toán thành công, ảnh và thông tin truy cập sẽ được gửi vào email bạn trong vòng 24h tiếp theo.
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', flexDirection: 'column', marginTop: '8px' }}>
                {paySuccess ? (
                  <button type="button" className="btn primary" style={{ width: '100%', height: '42px', fontWeight: 'bold' }} onClick={closePaymentModal}>
                    Đóng
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button type="button" className="btn ghost" style={{ flex: 1, color: 'var(--ink)' }} disabled={payChecking} onClick={() => setSelectedOrderToPay(null)}>Hủy</button>
                      <button type="button" className="btn primary" style={{ flex: 1 }} disabled={payChecking} onClick={triggerPaymentCheck}>
                        {payChecking ? 'Đang xác minh...' : 'Tôi đã chuyển khoản'}
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        width: '100%',
                        background: '#7c3aed',
                        color: '#fff',
                        fontWeight: 'bold',
                        border: 'none',
                        marginTop: '4px',
                        padding: '10px',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                      disabled={payChecking}
                      onClick={async () => {
                        setPayChecking(true);
                        try {
                          await api.post('/lookups/pay', { orderId: selectedOrderToPay.id });
                          const res = await api.get(`/orders/${selectedOrderToPay.id}/payment-status`);
                          setPayChecking(false);
                          if (res.data.isPaid) {
                            setPaySuccess(true);
                          } else {
                            alert('Giả lập thành công nhưng kiểm tra trạng thái thất bại.');
                          }
                        } catch (err) {
                          alert('Lỗi giả lập thanh toán: ' + (err.response?.data?.error || err.message));
                          setPayChecking(false);
                        }
                      }}
                    >
                      ⚡ Giả lập thanh toán thành công (Test Admin)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* --- IMAGE ZOOM MODAL --- */}
      {zoomImage && createPortal(
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px', cursor: 'zoom-out' }}
          onClick={() => setZoomImage(null)}
        >
          <img src={zoomImage} alt="zoomed" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} />
        </div>
      , document.body)}

      {/* --- GENERIC SUCCESS/CONGRATULATIONS MODAL --- */}
      {showSuccessModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="panel page-transition" style={{ width: '100%', maxWidth: '440px', padding: '30px 20px', textAlign: 'center', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '10px', boxShadow: 'var(--shadow)' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'var(--bg)', color: 'var(--green-2)', display: 'grid', placeItems: 'center', fontSize: '36px', margin: '0 auto 20px auto', animation: 'scaleUp 0.3s ease' }}>
              ✓
            </div>
            <h3 style={{ color: 'var(--green-2)', margin: '0 0 12px 0' }}>{successModalConfig.title}</h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px', margin: '0 0 24px 0', lineHeight: '1.6' }}>
              {successModalConfig.body}
            </p>
            <button type="button" className="btn primary" style={{ width: '100%', height: '40px', background: 'var(--green-2)', color: '#fff', fontWeight: 'bold' }} onClick={() => { setShowSuccessModal(false); handleSearch(null, codeQuery); }}>Đóng</button>
          </div>
        </div>
      , document.body)}

      {/* --- PHOTO PACKAGE DETAILS & ACTION MODAL --- */}
      {selectedOrderDetails && (() => {
        const order = selectedOrderDetails;
        const isFree = order.package_type === 'Miễn phí';
        const isExpired = order.lookup_status === 'Đã hết hạn';
        const isUpdating = order.lookup_status === 'Đang cập nhật';
        const isBlocked = order.link_status === 'Không được cấp lại';

        return createPortal(
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998, padding: '20px' }}>
            <div className="panel page-transition" style={{ width: '100%', maxWidth: '500px', padding: '24px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '12px', boxShadow: 'var(--shadow)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
                <div>
                  <h3 style={{ color: 'var(--green-2)', margin: 0, fontSize: '18px' }}>Chi tiết gói sản phẩm</h3>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Mã đơn: {order.order_no}</span>
                </div>
                <button type="button" className="btn ghost" style={{ border: 'none', padding: '4px 8px', minHeight: 'auto', color: 'var(--muted)' }} onClick={() => setSelectedOrderDetails(null)}>✕</button>
              </div>

              {/* Status Warnings */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {isExpired && (
                  <div style={{ background: '#fff3cd', color: '#856404', padding: '10px', borderRadius: '6px', fontSize: '13px', borderLeft: '4px solid #ffc107' }}>
                    <strong>⚠️ Thông báo hết hạn:</strong> Gói ảnh này đã quá hạn truy cập (quá 3 tháng). Hãy liên hệ quản trị viên để gia hạn.
                  </div>
                )}
                {isUpdating && (
                  <div style={{ background: '#d1ecf1', color: '#0c5460', padding: '10px', borderRadius: '6px', fontSize: '13px', borderLeft: '4px solid #17a2b8' }}>
                    <strong>⏳ Đang cập nhật:</strong> Gói ảnh đang được tải lên hoặc chỉnh sửa. Vui lòng quay lại sau.
                  </div>
                )}
                {isBlocked && (
                  <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '6px', fontSize: '13px', borderLeft: '4px solid #dc3545' }}>
                    <strong>🚫 Khóa link:</strong> Liên kết tải ảnh đã bị thu hồi và không cấp lại.
                  </div>
                )}
              </div>

              {/* Preview Image */}
              <div style={{ marginBottom: '20px' }}>
                <span className="label" style={{ fontSize: '13px', marginBottom: '8px', display: 'block' }}>Ảnh xem trước (Preview)</span>
                {order.preview_image ? (
                  <div 
                    style={{ width: '100%', height: '220px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--line)', cursor: 'zoom-in', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setZoomImage(order.preview_image)}
                  >
                    <img src={order.preview_image} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                ) : (
                  <div style={{ width: '100%', height: '180px', borderRadius: '8px', border: '1px dashed var(--line)', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                    <span style={{ fontSize: '28px', marginBottom: '8px' }}>📷</span>
                    <span>Chưa có ảnh xem trước</span>
                  </div>
                )}
              </div>

              {/* Package info & action */}
              <div style={{ background: 'var(--bg)', padding: '16px', borderRadius: '8px', border: '1px solid var(--line)', marginBottom: '20px', fontSize: '14px' }}>
                {order.is_paid ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ background: '#e2f3eb', color: '#065f46', padding: '12px', borderRadius: '8px', border: '1px solid #a7f3d0', fontSize: '14px', textAlign: 'center', fontWeight: 'bold', lineHeight: '1.5' }}>
                      ✓ Gói ảnh này đã hoàn tất thanh toán thành công.
                    </div>
                    {order.drive_link ? (
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '8px', fontSize: '13.5px', color: '#15803d', lineHeight: '1.5' }}>
                        📧 <strong>Thông tin tải ảnh:</strong> Liên kết Drive và mật khẩu truy xuất đã được gửi tới email đăng ký của bạn. Vui lòng kiểm tra hộp thư đến (hoặc hộp thư rác/spam) để nhận ảnh.
                      </div>
                    ) : (
                      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '16px', borderRadius: '8px', fontSize: '13px', color: '#1e40af', lineHeight: '1.5' }}>
                        ℹ️ <strong>Thông báo:</strong> Thanh toán đã được ghi nhận. Thư mục ảnh đang được cập nhật, liên kết tải ảnh và mật khẩu sẽ sớm được gửi về email của bạn.
                      </div>
                    )}
                  </div>
                ) : isFree ? (
                  <div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '13.5px', color: 'var(--ink)', lineHeight: '1.5' }}>
                      Đây là gói ảnh <strong>Miễn phí</strong>. Vui lòng nhấn nút xác nhận bên dưới để hệ thống ghi nhận và gửi sản phẩm về email của bạn.
                    </p>
                    <button 
                      type="button" 
                      className="btn" 
                      style={{ background: 'var(--green-2)', color: '#fff', width: '100%', height: '42px', fontWeight: 'bold' }}
                      onClick={() => handleConfirmFreePackage(order.id)}
                      disabled={searchLoading}
                    >
                      {searchLoading ? 'Đang xử lý...' : '✓ Xác nhận nhận gói ảnh'}
                    </button>
                  </div>
                ) : order.status === 'CANCELLED' ? (
                  <div style={{ background: '#fce8e8', color: 'var(--red)', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '14px', textAlign: 'center', fontWeight: 'bold' }}>
                    🚫 Gói ảnh này đã bị huỷ.
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '14px', color: 'var(--ink)', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Số tiền cần thanh toán:</span>
                      <strong style={{ color: 'var(--red)', fontSize: '18px' }}>{Number(order.price).toLocaleString('vi-VN')} đ</strong>
                    </div>
                    <button 
                      type="button" 
                      className="btn" 
                      style={{ background: 'var(--green-2)', color: '#fff', width: '100%', height: '42px', fontWeight: 'bold' }}
                      onClick={() => setSelectedOrderToPay(order)}
                    >
                      💳 Thanh toán ngay qua QR
                    </button>
                  </div>
                )}
              </div>

              {/* Close/Back button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="btn ghost" style={{ color: 'var(--ink)', minWidth: '100px' }} onClick={() => setSelectedOrderDetails(null)}>
                  Quay lại
                </button>
              </div>
            </div>
          </div>
        , document.body);
      })()}

      <style>{`
        .lookup-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          max-width: 1200px;
          margin: 0 auto;
          align-items: start;
        }
        @media (min-width: 820px) {
          .lookup-grid {
            grid-template-columns: 360px 1fr;
          }
        }
        .order-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }
        @media (max-width: 600px) {
          .order-card-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
        }
        .order-card-clickable:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.06) !important;
          border-color: var(--green-2) !important;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes scaleUp {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}