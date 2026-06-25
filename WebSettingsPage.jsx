import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import api from './api';

// Helper to render plain text email template into beautiful HTML preview
function renderPreviewHTML({ subject, body, orderNo, fullName, lookupCode, paymentStatus, driveLink, drivePassword, previewImageSrc }) {
  // Format links & replacements with Scratch block colors
  const orderNoHtml = `<span style="background-color: #ffab19; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 13px; border-bottom: 2px solid rgba(0,0,0,0.15); display: inline-block; margin: 0 2px;">${orderNo}</span>`;
  const fullNameHtml = `<span style="background-color: #4c97ff; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 13px; border-bottom: 2px solid rgba(0,0,0,0.15); display: inline-block; margin: 0 2px;">${fullName}</span>`;
  const lookupCodeHtml = `<span style="background-color: #5cb1d6; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 13px; border-bottom: 2px solid rgba(0,0,0,0.15); display: inline-block; margin: 0 2px;">${lookupCode}</span>`;
  const paymentStatusHtml = `<span style="background-color: #9966ff; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 13px; border-bottom: 2px solid rgba(0,0,0,0.15); display: inline-block; margin: 0 2px;">${paymentStatus}</span>`;
  const driveLinkHtml = driveLink 
    ? `<a href="${driveLink}" target="_blank" rel="noopener noreferrer" style="background-color: #ff6680; color: white; padding: 3px 8px; border-radius: 6px; font-weight: bold; font-size: 13px; border-bottom: 2px solid rgba(0,0,0,0.15); text-decoration: none; display: inline-block; margin: 0 2px;">lấy ảnh ở Drive</a>`
    : 'Chưa cung cấp';
  const drivePasswordHtml = `<code style="background-color: #0fbd8c; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 13px; border-bottom: 2px solid rgba(0,0,0,0.15); display: inline-block; margin: 0 2px; font-family: monospace;">${drivePassword}</code>`;

  let previewHtml = '';
  if (previewImageSrc) {
    previewHtml = `<div style="margin: 20px 0;"><h3 style="font-size: 15px; margin: 0 0 10px 0; color: #fff;">Ảnh xem trước của bạn:</h3><img src="${previewImageSrc}" alt="Ảnh xem trước" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" /></div>`;
  }

  const paragraphs = body
    .split(/\r?\n/)
    .map(p => p.trim());

  let contentHtml = '';
  paragraphs.forEach(p => {
    if (p.length === 0) {
      contentHtml += `<div style="height: 10px;"></div>`;
      return;
    }

    let pContent = p
      .replace(/{order_no}/g, orderNoHtml)
      .replace(/{full_name}/g, fullNameHtml)
      .replace(/{lookup_code}/g, lookupCodeHtml)
      .replace(/{payment_status}/g, paymentStatusHtml)
      .replace(/{drive_link}/g, driveLinkHtml)
      .replace(/{drive_password}/g, drivePasswordHtml);

    if (p.includes('{preview_image}')) {
      contentHtml += pContent.replace(/{preview_image}/g, previewHtml);
    } else {
      contentHtml += `<p style="margin: 0 0 8px 0; font-size: 14px;">${pContent}</p>`;
    }
  });

  if (!body.includes('{preview_image}') && previewHtml !== '') {
    contentHtml += previewHtml;
  }

  return `
    <div style="font-family: sans-serif; line-height: 1.6; color: #f8fafc; background: #121614; border: 1px solid #1c221e; border-radius: 12px; padding: 20px; text-align: left; max-width: 600px; margin: 0 auto;">
      <div style="border-bottom: 2px solid #176b52; padding-bottom: 12px; margin-bottom: 16px;">
        <h4 style="margin: 0; color: #10b981; font-size: 16px; text-transform: uppercase;">Cập nhật trạng thái đơn hàng</h4>
      </div>
      <div style="font-size: 14px;">
        ${contentHtml}
      </div>
      <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #1c221e; font-size: 11px; color: #94a3b8; text-align: center;">
        Đây là email tự động gửi từ hệ thống HoangKiet Photography.<br/>Vui lòng không trả lời trực tiếp email này.
      </div>
    </div>
  `;
}

// ─── UnsavedModal component ──────────────────────────────────────────────────
function UnsavedModal({ onSave, onDiscard, onCancel, saving }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.15s ease'
    }}>
      <div style={{
        background: 'var(--paper)', border: '1px solid var(--line)',
        borderRadius: '16px', padding: '32px', maxWidth: '400px', width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        animation: 'slideUp 0.2s ease'
      }}>
        <div style={{ fontSize: '32px', marginBottom: '12px', textAlign: 'center' }}>💾</div>
        <h3 style={{ margin: '0 0 8px', textAlign: 'center', color: 'var(--ink)' }}>
          Bạn chưa lưu thay đổi
        </h3>
        <p style={{ margin: '0 0 24px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px', lineHeight: '1.5' }}>
          Cấu hình website chưa được lưu. Bạn có muốn lưu lại trước khi rời đi không?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            className="btn primary"
            style={{ width: '100%', padding: '10px' }}
            onClick={onSave}
            disabled={saving}
          >
            {saving ? 'Đang lưu...' : '✓ Lưu và tiếp tục'}
          </button>
          <button
            className="btn secondary"
            style={{ width: '100%', padding: '10px' }}
            onClick={onDiscard}
          >
            Không lưu, rời đi
          </button>
          <button
            className="btn ghost"
            style={{ width: '100%', padding: '8px', fontSize: '13px', color: 'var(--muted)', border: 'none', background: 'none', cursor: 'pointer' }}
            onClick={onCancel}
          >
            Huỷ — ở lại trang này
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SlideEditor component ──────────────────────────────────────────────────
function SlideEditor({ slide, index, onChange, onRemove }) {
  const isBase64 = slide.image && slide.image.startsWith('data:');
  const [mode, setMode] = useState(isBase64 ? 'upload' : 'link');

  const switchMode = (newMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    onChange(index, 'image', '');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Ảnh phải nhỏ hơn 5MB. Vui lòng chọn ảnh khác hoặc dùng link URL.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => onChange(index, 'image', ev.target.result);
    reader.readAsDataURL(file);
  };

  const tabBtn = (active) => ({
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 'bold',
    border: '1px solid var(--line)',
    borderRadius: '6px',
    cursor: 'pointer',
    background: active ? 'var(--green-2)' : 'transparent',
    color: active ? '#fff' : 'var(--muted)',
    transition: 'all 0.15s',
  });

  return (
    <div style={{
      display: 'flex', gap: '16px', padding: '16px',
      border: '1px solid var(--line)', borderRadius: '12px',
      background: 'rgba(255,255,255,0.02)', alignItems: 'start'
    }}>
      {/* Image Preview */}
      <div style={{
        width: '120px', height: '120px', border: '1px solid var(--line)',
        borderRadius: '8px', overflow: 'hidden', flexShrink: 0,
        background: '#1c221e', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {slide.image ? (
          <img src={slide.image} alt={slide.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ color: 'var(--muted)', fontSize: '11px', textAlign: 'center', padding: '8px' }}>Chưa có ảnh</span>
        )}
      </div>

      {/* Form fields */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <input
            type="text"
            name={`slide-title-${index}`}
            aria-label="Tên nhóm ảnh"
            placeholder="Tên nhóm ảnh (Ví dụ: ẢNH CƯỚI)"
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '13px', fontWeight: 'bold' }}
            value={slide.title}
            onChange={e => onChange(index, 'title', e.target.value)}
            required
          />
          <textarea
            name={`slide-desc-${index}`}
            aria-label="Mô tả nhóm ảnh"
            placeholder="Mô tả ngắn gọn về nhóm ảnh..."
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '13px', minHeight: '36px', fontFamily: 'inherit', resize: 'none' }}
            value={slide.desc}
            onChange={e => onChange(index, 'desc', e.target.value)}
            required
          />
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)', marginRight: '4px' }}>Nguồn ảnh:</span>
          <button type="button" style={tabBtn(mode === 'upload')} onClick={() => switchMode('upload')}>
            ⬆️ Upload file
          </button>
          <button type="button" style={tabBtn(mode === 'link')} onClick={() => switchMode('link')}>
            🔗 Dùng link URL
          </button>
        </div>

        {mode === 'upload' && (
          <label style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 12px', border: '1px dashed var(--line)', borderRadius: '8px',
            cursor: 'pointer', fontSize: '13px', color: 'var(--muted)',
            background: 'rgba(255,255,255,0.02)'
          }}>
            <span style={{ fontSize: '20px' }}>🖼️</span>
            <span>
              {slide.image && slide.image.startsWith('data:')
                ? '✓ Đã chọn ảnh — nhấn để thay ảnh khác'
                : 'Nhấn để chọn ảnh từ máy tính (tối đa 5MB)'}
            </span>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
          </label>
        )}

        {mode === 'link' && (
          <input
            type="url"
            name={`slide-image-${index}`}
            aria-label="Link URL ảnh"
            placeholder="https://example.com/anh.jpg"
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '13px', fontFamily: 'monospace' }}
            value={slide.image && !slide.image.startsWith('data:') ? slide.image : ''}
            onChange={e => onChange(index, 'image', e.target.value)}
          />
        )}
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: '18px', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', flexShrink: 0 }}
        title="Xoá ảnh này"
      >✕</button>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function WebSettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [subHeading, setSubHeading] = useState('');
  const [description, setDescription] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [phone, setPhone] = useState('');
  const [facetime, setFacetime] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [slides, setSlides] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState('paid');
  const lastFocusedInput = useRef(null);

  // Track whether form has unsaved changes
  const [isDirty, setIsDirty] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pendingPath, setPendingPath] = useState(null);
  const savedRef = useRef(null);
  const isDirtyRef = useRef(false);

  // Keep ref in sync with state (for use inside event listeners)
  useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);

  // Intercept internal SPA link clicks when there are unsaved changes
  useEffect(() => {
    const handleClick = (e) => {
      if (!isDirtyRef.current) return;
      const anchor = e.target.closest('a[href]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('mailto:') || href.startsWith('#')) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingPath(href);
      setShowModal(true);
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  // Warn before browser close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleInsertKeyword = (keyword) => {
    const input = lastFocusedInput.current;
    const fallbackEl = document.getElementById('ws-email-body');
    const targetInput = input || fallbackEl;

    if (!targetInput) return;

    const start = targetInput.selectionStart;
    const end = targetInput.selectionEnd;
    const val = targetInput.value;
    const newVal = val.slice(0, start) + keyword + val.slice(end);

    if (targetInput.id === 'ws-email-subject') {
      setEmailSubject(newVal);
      markDirty();
    } else {
      setEmailBody(newVal);
      markDirty();
    }

    setTimeout(() => {
      targetInput.focus();
      targetInput.setSelectionRange(start + keyword.length, start + keyword.length);
    }, 0);
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/web-settings');
      if (res.data) {
        const data = {
          display_name: res.data.display_name || '',
          sub_heading: res.data.sub_heading || '',
          description: res.data.description || '',
          announcement: res.data.announcement || '',
          phone: res.data.phone || '',
          facetime: res.data.facetime || '',
          email_subject: res.data.email_subject || '',
          email_body: res.data.email_body || '',
          slides: res.data.slides || [],
        };
        setDisplayName(data.display_name);
        setSubHeading(data.sub_heading);
        setDescription(data.description);
        setAnnouncement(data.announcement);
        setPhone(data.phone);
        setFacetime(data.facetime);
        setEmailSubject(data.email_subject);
        setEmailBody(data.email_body);
        setSlides(data.slides);
        savedRef.current = data;
        setIsDirty(false);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Không thể tải cấu hình website.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  // Mark dirty on any field change
  const markDirty = () => setIsDirty(true);

  const handleAddSlide = () => {
    setSlides(prev => [...prev, { title: 'TÊN HÌNH ẢNH MỚI', desc: 'Mô tả ngắn gọn.', image: '' }]);
    markDirty();
  };

  const handleRemoveSlide = (index) => {
    if (!window.confirm('Bạn có chắc muốn xoá tấm ảnh này?')) return;
    setSlides(prev => { const n = [...prev]; n.splice(index, 1); return n; });
    markDirty();
  };

  const handleSlideChange = (index, field, value) => {
    setSlides(prev => {
      const n = [...prev];
      n[index] = { ...n[index], [field]: value };
      return n;
    });
    markDirty();
  };

  // Core save logic (reusable for both form submit and modal save-and-go)
  const doSave = async () => {
    setSaving(true);
    setErrorMsg('');
    try {
      const payload = {
        display_name: displayName,
        sub_heading: subHeading,
        description,
        announcement,
        phone,
        facetime,
        email_subject: emailSubject,
        email_body: emailBody,
        slides
      };
      await api.put('/web-settings', payload);
      savedRef.current = payload;
      setIsDirty(false);
      setSuccessMsg('Cập nhật cấu hình website thành công!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setSuccessMsg(''), 5000);
      return true;
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Lỗi khi lưu cấu hình.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await doSave();
  };

  // Modal: Save then navigate away
  const handleModalSave = async () => {
    const ok = await doSave();
    if (ok && pendingPath) {
      setShowModal(false);
      navigate(pendingPath);
    }
  };

  // Modal: Discard changes then navigate away
  const handleModalDiscard = () => {
    setIsDirty(false);
    setShowModal(false);
    if (pendingPath) navigate(pendingPath);
  };

  // Modal: Cancel — stay on page
  const handleModalCancel = () => {
    setPendingPath(null);
    setShowModal(false);
  };

  if (loading) return <div style={{ padding: '20px' }}>Đang tải cấu hình website...</div>;

  return (
    <>
      {/* Unsaved changes modal */}
      {showModal && createPortal(
        <UnsavedModal
          onSave={handleModalSave}
          onDiscard={handleModalDiscard}
          onCancel={handleModalCancel}
          saving={saving}
        />
      , document.body)}

      {/* Email Preview Modal */}
      {showPreviewModal && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'var(--paper)', border: '1px solid var(--line)',
            borderRadius: '16px', width: '100%', maxWidth: '720px', maxHeight: '90vh',
            display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.25s ease'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid var(--line)' }}>
              <h3 style={{ margin: 0, color: 'var(--green-2)' }}>👀 Xem thử giao diện Email mẫu</h3>
              <button
                type="button"
                className="btn ghost"
                style={{ border: 'none', padding: '4px 8px', minHeight: 'auto', color: 'var(--muted)', fontSize: '18px', cursor: 'pointer' }}
                onClick={() => setShowPreviewModal(false)}
              >✕</button>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '8px', padding: '16px 20px', borderBottom: '1px solid var(--line)', background: 'rgba(255,255,255,0.01)' }}>
              <button
                type="button"
                onClick={() => setActivePreviewTab('paid')}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--line)', cursor: 'pointer',
                  fontWeight: 'bold', fontSize: '13px',
                  background: activePreviewTab === 'paid' ? 'var(--green-2)' : 'transparent',
                  color: activePreviewTab === 'paid' ? '#fff' : 'var(--muted)'
                }}
              >
                💵 Mẫu 1: Gói Trả Phí (Có ảnh)
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('free')}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--line)', cursor: 'pointer',
                  fontWeight: 'bold', fontSize: '13px',
                  background: activePreviewTab === 'free' ? 'var(--green-2)' : 'transparent',
                  color: activePreviewTab === 'free' ? '#fff' : 'var(--muted)'
                }}
              >
                🎁 Mẫu 2: Gói Miễn Phí (Không ảnh)
              </button>
            </div>

            {/* Email Render Box */}
            <div style={{ padding: '24px 20px', overflowY: 'auto', flex: 1, textAlign: 'center', background: 'var(--bg)' }}>
              {/* Mock Subject */}
              <div style={{
                textAlign: 'left', marginBottom: '16px', padding: '10px 14px', borderRadius: '8px',
                background: 'var(--paper)', border: '1px solid var(--line)', fontSize: '13px', color: 'var(--muted)'
              }}>
                <strong>Tiêu đề Mail:</strong> {
                  activePreviewTab === 'paid'
                    ? emailSubject.replace(/{order_no}/g, 'HK-GoiAnhCuoi-HK889').replace(/{full_name}/g, 'Nguyễn Văn A').replace(/{lookup_code}/g, 'LU9988')
                    : emailSubject.replace(/{order_no}/g, 'HK-AnhChanDungFree-HK123').replace(/{full_name}/g, 'Trần Thị B').replace(/{lookup_code}/g, 'LU1122')
                }
              </div>

              {/* Mock HTML Content */}
              <div dangerouslySetInnerHTML={{
                __html: activePreviewTab === 'paid' ? renderPreviewHTML({
                  subject: emailSubject,
                  body: emailBody,
                  orderNo: 'HK-GoiAnhCuoi-HK889',
                  fullName: 'Nguyễn Văn A',
                  lookupCode: 'LU9988',
                  paymentStatus: 'thanh toán gói ảnh',
                  driveLink: 'https://drive.google.com/drive/folders/mock-id-paid',
                  drivePassword: 'kietwedding123',
                  previewImageSrc: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80'
                }) : renderPreviewHTML({
                  subject: emailSubject,
                  body: emailBody,
                  orderNo: 'HK-AnhChanDungFree-HK123',
                  fullName: 'Trần Thị B',
                  lookupCode: 'LU1122',
                  paymentStatus: 'đăng ký gói ảnh miễn phí',
                  driveLink: 'https://drive.google.com/drive/folders/mock-id-free',
                  drivePassword: 'Không có',
                  previewImageSrc: ''
                })
              }} />
            </div>

            {/* Footer buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 20px', borderTop: '1px solid var(--line)' }}>
              <button type="button" className="btn secondary" style={{ minHeight: 'auto', padding: '8px 20px', cursor: 'pointer' }} onClick={() => setShowPreviewModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <form onSubmit={handleSave} className="panel page-transition" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ margin: 0, color: 'var(--green-2)', flex: 1 }}>Điều hành Web &amp; Nội dung Trang chủ</h2>
              {isDirty && (
                <span style={{ fontSize: '12px', color: 'var(--yellow, #e8a000)', background: 'rgba(232,160,0,0.12)', padding: '3px 10px', borderRadius: '20px', fontWeight: 'bold', border: '1px solid rgba(232,160,0,0.3)' }}>
                  ● Chưa lưu
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0 0', color: 'var(--muted)', fontSize: '14px' }}>Chỉnh sửa thông tin liên hệ, bảng thông báo và danh sách hình ảnh trình chiếu tại trang chủ.</p>
          </div>

          {successMsg && (
            <div style={{ background: '#dfeee7', color: 'var(--green-2)', border: '1px solid #cce0d6', padding: '12px 16px', borderRadius: '8px', fontWeight: 'bold' }}>
              ✓ {successMsg}
            </div>
          )}
          {errorMsg && (
            <div style={{ background: '#fce8e8', color: 'var(--red)', border: '1px solid #f8baba', padding: '12px 16px', borderRadius: '8px', fontWeight: 'bold' }}>
              ✕ {errorMsg}
            </div>
          )}

          {/* --- GENERAL CONFIGURATION --- */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', borderBottom: '1px solid var(--line)', paddingBottom: '8px', color: 'var(--ink)', fontSize: '17px' }}>⚙️ Thông tin chung</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label htmlFor="ws-display-name" className="label">Tên hiển thị Website</label>
                <input id="ws-display-name" name="display_name" type="text" autoComplete="organization" placeholder="Ví dụ: Kiet Hoang Photography" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }}
                  value={displayName} onChange={e => { setDisplayName(e.target.value); markDirty(); }} required />
              </div>
              <div>
                <label htmlFor="ws-sub-heading" className="label">Tiêu đề phụ (Sub-heading)</label>
                <input id="ws-sub-heading" name="sub_heading" type="text" autoComplete="off" placeholder="Ví dụ: Chuyên chụp ảnh chân dung, phong cảnh" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }}
                  value={subHeading} onChange={e => { setSubHeading(e.target.value); markDirty(); }} required />
              </div>
            </div>

            <div>
              <label htmlFor="ws-description" className="label">Giới thiệu ngắn (Description)</label>
              <textarea id="ws-description" name="description" placeholder="Mô tả ngắn về studio/dịch vụ của bạn..." style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', minHeight: '80px', fontFamily: 'inherit' }}
                value={description} onChange={e => { setDescription(e.target.value); markDirty(); }} required />
            </div>

            <div>
              <label htmlFor="ws-announcement" className="label">📢 Thông báo trang chủ</label>
              <textarea id="ws-announcement" name="announcement" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', minHeight: '80px', fontFamily: 'inherit' }}
                placeholder="Nhập thông báo hiển thị tại trang chủ..."
                value={announcement} onChange={e => { setAnnouncement(e.target.value); markDirty(); }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label htmlFor="ws-phone" className="label">📞 Điện thoại / Zalo</label>
                <input id="ws-phone" name="phone" type="tel" autoComplete="tel" placeholder="Ví dụ: 0703.01.2959" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }}
                  value={phone} onChange={e => { setPhone(e.target.value); markDirty(); }} />
              </div>
              <div>
                <label htmlFor="ws-facetime" className="label">✉ FaceTime</label>
                <input id="ws-facetime" name="facetime" type="text" autoComplete="off" placeholder="Ví dụ: 0703.01.2959 (Audio Only)" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }}
                  value={facetime} onChange={e => { setFacetime(e.target.value); markDirty(); }} />
              </div>
            </div>
          </section>

          {/* --- EMAIL CONFIGURATION --- */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '8px', marginBottom: '4px' }}>
              <h3 style={{ margin: 0, color: 'var(--ink)', fontSize: '17px' }}>✉️ Cấu hình Email gửi khách hàng</h3>
              <button
                type="button"
                className="btn secondary"
                style={{ padding: '6px 14px', fontSize: '13px', minHeight: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                onClick={() => setShowPreviewModal(true)}
              >
                👁️ Xem mẫu thử
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: '1.5' }}>
              Hãy nhập nội dung thư bằng chữ thường (Text). Hệ thống sẽ <strong>tự động tối ưu hóa giao diện</strong>, bọc email trong khung chuyên nghiệp, căn chỉnh phông chữ, định dạng link tải ảnh đẹp mắt, và tự động xử lý gửi kèm ảnh xem trước cho khách hàng.
            </p>

            <div>
              <span className="label" style={{ marginBottom: '8px', display: 'block', color: 'var(--ink)', fontWeight: 'bold' }}>
                Các từ khóa thay thế tự động (cứ ghi trong tiêu đề mail với nội dung thư là được):
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {[
                  { code: '{order_no}', label: 'Mã đơn', color: '#ffab19' },
                  { code: '{full_name}', label: 'Tên khách', color: '#4c97ff' },
                  { code: '{lookup_code}', label: 'Mã tra cứu', color: '#5cb1d6' },
                  { code: '{payment_status}', label: 'Trạng thái phí', color: '#9966ff' },
                  { code: '{drive_link}', label: 'Link Drive', color: '#ff6680' },
                  { code: '{drive_password}', label: 'Mật khẩu Drive', color: '#0fbd8c' },
                  { code: '{preview_image}', label: 'Khung ảnh xem trước', color: '#b66a2c' },
                ].map(item => (
                  <button
                    key={item.code}
                    type="button"
                    title={`Click để chèn ${item.code}`}
                    onClick={() => handleInsertKeyword(item.code)}
                    onMouseDown={e => e.preventDefault()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '6px 12px',
                      backgroundColor: item.color,
                      color: 'white',
                      borderRadius: '6px',
                      fontFamily: 'inherit',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      border: 'none',
                      borderBottom: '3px solid rgba(0,0,0,0.25)',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'transform 0.05s'
                    }}
                  >
                    🧩 {item.code} ({item.label})
                  </button>
                ))}
              </div>
            </div>
 
            <div>
              <label htmlFor="ws-email-subject" className="label">Tiêu đề Email</label>
              <input id="ws-email-subject" name="email_subject" type="text" placeholder="Ví dụ: [HoangKiet] Cập nhật thông tin đơn hàng {order_no}" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }}
                value={emailSubject} onChange={e => { setEmailSubject(e.target.value); markDirty(); }}
                onFocus={(e) => { lastFocusedInput.current = e.target; }} required />
            </div>
 
            <div>
              <label htmlFor="ws-email-body" className="label">Nội dung thư (Chữ thường)</label>
              <textarea id="ws-email-body" name="email_body" placeholder="Nhập nội dung thư gửi khách..." style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', minHeight: '220px', fontFamily: 'inherit', fontSize: '14px', lineHeight: '1.6' }}
                value={emailBody} onChange={e => { setEmailBody(e.target.value); markDirty(); }}
                onFocus={(e) => { lastFocusedInput.current = e.target; }} required />
            </div>
          </section>

          {/* --- PORTFOLIO SLIDES --- */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>
              <h3 style={{ margin: 0, color: 'var(--ink)', fontSize: '17px' }}>
                📸 Danh sách ảnh Portfolio trang chủ ({slides.length})
              </h3>
              <button type="button" className="btn secondary" style={{ padding: '6px 12px', fontSize: '13px', minHeight: 'auto' }} onClick={handleAddSlide}>
                + Thêm ảnh
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {slides.map((slide, index) => (
                <SlideEditor key={index} slide={slide} index={index} onChange={handleSlideChange} onRemove={handleRemoveSlide} />
              ))}
              {slides.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)', border: '1px dashed var(--line)', borderRadius: '8px' }}>
                  Chưa có ảnh nào trong danh sách. Hãy nhấn nút "+ Thêm ảnh" ở trên.
                </div>
              )}
            </div>
          </section>

          {/* --- ACTIONS --- */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--line)', paddingTop: '20px', marginTop: '12px' }}>
            <button type="submit" className="btn primary" disabled={saving || !isDirty} style={{ padding: '10px 24px', opacity: isDirty ? 1 : 0.5 }}>
              {saving ? 'Đang lưu...' : isDirty ? 'Lưu cấu hình website' : '✓ Đã lưu'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
