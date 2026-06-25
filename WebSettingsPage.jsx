import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import api from './api';

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
  const [slides, setSlides] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

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
          slides: res.data.slides || [],
        };
        setDisplayName(data.display_name);
        setSubHeading(data.sub_heading);
        setDescription(data.description);
        setAnnouncement(data.announcement);
        setPhone(data.phone);
        setFacetime(data.facetime);
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
      const payload = { display_name: displayName, sub_heading: subHeading, description, announcement, phone, facetime, slides };
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
