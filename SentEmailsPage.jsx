import React, { useEffect, useState } from 'react';
import api from './api';
import { createPortal } from 'react-dom';

export default function SentEmailsPage() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDark, setIsDark] = useState(() => !document.body.classList.contains('light-mode'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(!document.body.classList.contains('light-mode'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  
  const [selectedIds, setSelectedIds] = useState([]);
  const [alertMsg, setAlertMsg] = useState('');
  const [confirmObj, setConfirmObj] = useState(null);

  const fetchEmails = async () => {
    try {
      const res = await api.get('/emails');
      setEmails(res.data.data || []);
      setSelectedIds([]);
    } catch (err) {
      console.error('Lỗi tải danh sách email:', err);
      setAlertMsg(err.response?.data?.error || 'Không thể tải lịch sử email.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleToggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setConfirmObj({
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedIds.length} email đã chọn không?`,
      onConfirm: async () => {
        try {
          await api.post('/emails/batch-delete', { ids: selectedIds });
          setEmails(emails.filter(e => !selectedIds.includes(e.id)));
          setSelectedIds([]);
          setAlertMsg('Đã xóa các email đã chọn thành công.');
        } catch (err) {
          setAlertMsg(err.response?.data?.error || 'Lỗi khi xóa email.');
        }
      }
    });
  };

  const filteredEmails = emails.filter(e => 
    e.to_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div style={{ padding: '20px' }}>Đang tải lịch sử email...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <style>{`
        .sent-emails-panel {
          background: var(--paper) !important;
          color: var(--ink) !important;
          border: 1px solid var(--line) !important;
        }
        .sent-emails-panel .panel-head h2 {
          color: var(--ink) !important;
        }
        .sent-emails-panel .panel-head p {
          color: var(--muted) !important;
        }
        .sent-emails-table {
          background: var(--paper) !important;
          color: var(--ink) !important;
          width: 100%;
        }
        .sent-emails-table th {
          background: var(--bg) !important;
          color: var(--muted) !important;
          border-bottom: 2px solid var(--line) !important;
        }
        .sent-emails-table td {
          background: var(--paper) !important;
          color: var(--ink) !important;
          border-bottom: 1px solid var(--line) !important;
        }
        .sent-emails-table tr:hover td {
          background: var(--bg) !important;
        }
        
        /* Modal Styles */
        .custom-modal {
          background: var(--paper) !important;
          color: var(--ink) !important;
          border: 1px solid var(--line) !important;
        }
        .custom-modal-header {
          background: var(--bg) !important;
          border-bottom: 1px solid var(--line) !important;
        }
        .custom-modal-header h3 {
          color: var(--ink) !important;
        }
        .custom-modal-subheader {
          background: var(--paper) !important;
          border-bottom: 1px solid var(--line) !important;
          color: var(--ink) !important;
        }
        .custom-modal-body {
          background: var(--bg) !important;
          color: var(--ink) !important;
        }
        .custom-modal-footer {
          background: var(--bg) !important;
          border-top: 1px solid var(--line) !important;
        }
      `}</style>
      <section className="panel sent-emails-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="panel-head" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--ink)' }}>Thư đã gửi (Lịch sử gửi Mail)</h2>
            <p style={{ margin: '4px 0 0 0', color: 'var(--muted)', fontSize: '13px' }}>
              Danh sách ghi nhận các email đã gửi thành công hoặc giả lập từ hệ thống cho khách hàng.
            </p>
          </div>
          {selectedIds.length > 0 && (
            <button 
              type="button" 
              className="btn" 
              style={{ background: 'var(--red)', color: '#fff', border: 'none', animation: 'scaleUp 0.2s ease', minHeight: '38px', padding: '0 16px' }}
              onClick={handleDeleteSelected}
            >
              🗑️ Xóa {selectedIds.length} mục đã chọn
            </button>
          )}
        </div>

        {/* Tìm kiếm */}
        <div style={{ padding: '0 20px 16px 20px', borderBottom: '1px solid var(--line)' }}>
          <input 
            type="text" 
            placeholder="Tìm kiếm theo người nhận hoặc tiêu đề..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', 
              maxWidth: '400px', 
              padding: '10px 14px', 
              borderRadius: '8px', 
              border: '1px solid var(--line)',
              outline: 'none',
              fontSize: '14px',
              fontFamily: 'inherit',
              background: 'var(--paper)',
              color: 'var(--ink)'
            }}
          />
        </div>

        <div className="table-wrap" style={{ padding: '0 20px 20px 20px' }}>
          <table className="sent-emails-table">
            <thead>
              <tr>
                <th style={{ width: '25%' }}>Người nhận</th>
                <th style={{ width: '40%' }}>Tiêu đề</th>
                <th style={{ width: '20%' }}>Thời gian gửi</th>
                <th style={{ width: '15%', textAlign: 'center' }}>Chọn / Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmails.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)', fontSize: '14px' }}>
                    {searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có email nào được ghi nhận'}
                  </td>
                </tr>
              ) : (
                filteredEmails.map(e => (
                  <tr key={e.id}>
                    <td>
                      <strong style={{ color: 'var(--ink)' }}>{e.to_email}</strong>
                    </td>
                    <td>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--ink)' }}>{e.subject}</span>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '13px' }}>
                      {new Date(e.sent_at).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center' }}>
                        <button 
                          className="btn ghost" 
                          style={{ color: 'var(--blue)', borderColor: 'var(--blue)', padding: '4px 10px', minHeight: 'auto', fontSize: '13px' }}
                          onClick={() => setSelectedEmail(e)}
                        >
                          Chi tiết
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedIds.includes(e.id)} 
                            onChange={() => handleToggleSelect(e.id)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            aria-label={`Chọn email ID ${e.id}`}
                            title="Chọn email này"
                          />
                          {selectedIds.includes(e.id) && (
                            <span style={{ 
                              background: 'var(--green-2)', 
                              color: '#fff', 
                              borderRadius: '50%', 
                              width: '20px', 
                              height: '20px', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              fontSize: '11px',
                              fontWeight: 'bold'
                            }}>
                              {selectedIds.indexOf(e.id) + 1}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* --- MODAL XEM CHI TIẾT EMAIL --- */}
      {selectedEmail && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div className="custom-modal page-transition" style={{ width: '100%', maxWidth: '720px', height: '85vh', display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden', borderRadius: '12px' }}>
            <div className="custom-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Chi tiết email</h3>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Thời gian: {new Date(selectedEmail.sent_at).toLocaleString('vi-VN')}</span>
              </div>
              <button type="button" className="btn ghost" style={{ padding: '4px 8px', minHeight: 'auto', border: 'none', color: 'var(--muted)' }} onClick={() => setSelectedEmail(null)}>✕</button>
            </div>
            
            <div className="custom-modal-subheader" style={{ padding: '16px 20px' }}>
              <div style={{ marginBottom: '8px' }}><span style={{ color: 'var(--muted)', fontSize: '13px' }}>Tới:</span> <strong>{selectedEmail.to_email}</strong></div>
              <div><span style={{ color: 'var(--muted)', fontSize: '13px' }}>Tiêu đề:</span> <strong>{selectedEmail.subject}</strong></div>
            </div>

            <div className="custom-modal-body" style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
              {selectedEmail.html_body ? (
                <iframe 
                  title="Email Preview" 
                  srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body { font-family: sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 10px; }${isDark ? `
                    body {
                      background-color: #090b0a !important;
                      color: #cbd5e1 !important;
                    }
                    div[style*="max-width: 600px"], 
                    div[style*="max-width:600px"] {
                      background-color: #121614 !important;
                      border-color: #1c221e !important;
                      box-shadow: none !important;
                    }
                    div, p, span, h3, h4, h5, h6, table, tr, td, th {
                      color: #cbd5e1 !important;
                    }
                    h2 {
                      color: #34d399 !important;
                    }
                    strong, strong span, span strong {
                      color: #f8fafc !important;
                    }
                    a {
                      color: #38bdf8 !important;
                    }
                    code {
                      background-color: #1c221e !important;
                      color: #f8fafc !important;
                    }
                  ` : `
                    body {
                      background-color: #f8fafc !important;
                      color: #333 !important;
                    }
                  `}</style></head><body>${selectedEmail.html_body}</body></html>`}
                  style={{ width: '100%', height: '100%', border: 'none', background: isDark ? '#090b0a' : '#fff', borderRadius: '6px' }}
                />
              ) : (
                <pre style={{ 
                  margin: 0, 
                  whiteSpace: 'pre-wrap', 
                  fontFamily: 'monospace', 
                  fontSize: '13.5px', 
                  background: 'var(--paper)', 
                  color: 'var(--ink)',
                  padding: '16px', 
                  borderRadius: '6px',
                  border: '1px solid var(--line)'
                }}>
                  {selectedEmail.body}
                </pre>
              )}
            </div>

            <div className="custom-modal-footer" style={{ padding: '16px 20px', textAlign: 'right' }}>
              <button type="button" className="btn primary" style={{ minHeight: '36px' }} onClick={() => setSelectedEmail(null)}>Đóng</button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Modal Thông Báo (Alert) */}
      {alertMsg && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div className="custom-modal page-transition" style={{ width: '100%', maxWidth: '400px', padding: '0', overflow: 'hidden', borderRadius: '12px' }}>
            <div className="custom-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Thông báo</h3>
              <button type="button" className="btn ghost" style={{ padding: '4px 8px', minHeight: 'auto', border: 'none', color: 'var(--muted)' }} onClick={() => setAlertMsg('')}>✕</button>
            </div>
            <div style={{ padding: '24px 20px', color: 'var(--muted)' }}>{alertMsg}</div>
            <div className="custom-modal-footer" style={{ padding: '16px 20px', textAlign: 'right' }}>
              <button type="button" className="btn primary" style={{ minHeight: '36px' }} onClick={() => setAlertMsg('')}>OK</button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Modal Xác Nhận (Confirm) */}
      {confirmObj && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div className="custom-modal page-transition" style={{ width: '100%', maxWidth: '400px', padding: '0', overflow: 'hidden', borderRadius: '12px' }}>
            <div className="custom-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Xác nhận</h3>
              <button type="button" className="btn ghost" style={{ padding: '4px 8px', minHeight: 'auto', border: 'none', color: 'var(--muted)' }} onClick={() => setConfirmObj(null)}>✕</button>
            </div>
            <div style={{ padding: '24px 20px', color: 'var(--muted)' }}>{confirmObj.message}</div>
            <div className="custom-modal-footer" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn ghost" style={{ color: 'var(--ink)', borderColor: 'var(--line)', minHeight: '36px' }} onClick={() => setConfirmObj(null)}>Hủy</button>
              <button type="button" className="btn" style={{ background: 'var(--red)', color: '#fff', minHeight: '36px' }} onClick={() => { confirmObj.onConfirm(); setConfirmObj(null); }}>Đồng ý</button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
