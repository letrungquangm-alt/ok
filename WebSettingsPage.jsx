import React, { useEffect, useState } from 'react';
import api from './api';

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
        {/* Title + Desc */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <input
            type="text"
            placeholder="Tên nhóm ảnh (Ví dụ: ẢNH CƯỚI)"
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '13px', fontWeight: 'bold' }}
            value={slide.title}
            onChange={e => onChange(index, 'title', e.target.value)}
            required
          />
          <textarea
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

        {/* Upload mode */}
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

        {/* Link mode */}
        {mode === 'link' && (
          <input
            type="url"
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
        style={{
          background: 'none', border: 'none', color: 'var(--red)',
          fontSize: '18px', cursor: 'pointer', padding: '4px 8px',
          borderRadius: '4px', flexShrink: 0
        }}
        title="Xoá ảnh này"
      >✕</button>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function WebSettingsPage() {
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

  const fetchSettings = async () => {
    try {
      const res = await api.get('/web-settings');
      if (res.data) {
        setDisplayName(res.data.display_name || '');
        setSubHeading(res.data.sub_heading || '');
        setDescription(res.data.description || '');
        setAnnouncement(res.data.announcement || '');
        setPhone(res.data.phone || '');
        setFacetime(res.data.facetime || '');
        setSlides(res.data.slides || []);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Không thể tải cấu hình website.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleAddSlide = () => {
    setSlides([...slides, { title: 'TÊN HÌNH ẢNH MỚI', desc: 'Mô tả ngắn gọn.', image: '' }]);
  };

  const handleRemoveSlide = (index) => {
    if (!window.confirm('Bạn có chắc muốn xoá tấm ảnh này?')) return;
    const newSlides = [...slides];
    newSlides.splice(index, 1);
    setSlides(newSlides);
  };

  const handleSlideChange = (index, field, value) => {
    const newSlides = [...slides];
    newSlides[index] = { ...newSlides[index], [field]: value };
    setSlides(newSlides);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.put('/web-settings', {
        display_name: displayName,
        sub_heading: subHeading,
        description,
        announcement,
        phone,
        facetime,
        slides,
      });
      setSuccessMsg('Cập nhật cấu hình website thành công!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Lỗi khi lưu cấu hình.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Đang tải cấu hình website...</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <form onSubmit={handleSave} className="panel page-transition" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: '16px' }}>
          <h2 style={{ margin: 0, color: 'var(--green-2)' }}>Điều hành Web &amp; Nội dung Trang chủ</h2>
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
              <span className="label">Tên hiển thị Website</span>
              <input type="text" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }}
                value={displayName} onChange={e => setDisplayName(e.target.value)} required />
            </div>
            <div>
              <span className="label">Tiêu đề phụ (Sub-heading)</span>
              <input type="text" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }}
                value={subHeading} onChange={e => setSubHeading(e.target.value)} required />
            </div>
          </div>

          <div>
            <span className="label">Giới thiệu ngắn (Description)</span>
            <textarea style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', minHeight: '80px', fontFamily: 'inherit' }}
              value={description} onChange={e => setDescription(e.target.value)} required />
          </div>

          <div>
            <span className="label">📢 Thông báo trang chủ</span>
            <textarea style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', minHeight: '80px', fontFamily: 'inherit' }}
              placeholder="Nhập thông báo hiển thị tại trang chủ..."
              value={announcement} onChange={e => setAnnouncement(e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <span className="label">📞 Điện thoại / Zalo</span>
              <input type="text" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }}
                value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div>
              <span className="label">✉ FaceTime</span>
              <input type="text" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }}
                value={facetime} onChange={e => setFacetime(e.target.value)} />
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
              <SlideEditor
                key={index}
                slide={slide}
                index={index}
                onChange={handleSlideChange}
                onRemove={handleRemoveSlide}
              />
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
          <button type="submit" className="btn primary" disabled={saving} style={{ padding: '10px 24px' }}>
            {saving ? 'Đang lưu...' : 'Lưu cấu hình website'}
          </button>
        </div>
      </form>
    </div>
  );
}
