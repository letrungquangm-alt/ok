import React, { useEffect, useState } from 'react';
import api from './api';

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

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleAddSlide = () => {
    setSlides([
      ...slides,
      {
        title: 'TÊN HÌNH ẢNH MỚI',
        desc: 'Mô tả ngắn gọn về tấm ảnh này.',
        image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80'
      }
    ]);
  };

  const handleRemoveSlide = (index) => {
    if (!window.confirm('Bạn có chắc muốn xoá tấm ảnh này khỏi danh sách trình chiếu?')) return;
    const newSlides = [...slides];
    newSlides.splice(index, 1);
    setSlides(newSlides);
  };

  const handleSlideChange = (index, field, value) => {
    const newSlides = [...slides];
    newSlides[index] = {
      ...newSlides[index],
      [field]: value
    };
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
        description: description,
        announcement: announcement,
        phone: phone,
        facetime: facetime,
        slides: slides
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
          <h2 style={{ margin: 0, color: 'var(--green-2)' }}>Điều hành Web & Nội dung Trang chủ</h2>
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
              <input 
                type="text" 
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }}
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
              />
            </div>
            <div>
              <span className="label">Tiêu đề phụ (Sub-heading)</span>
              <input 
                type="text" 
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }}
                value={subHeading}
                onChange={e => setSubHeading(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <span className="label">Giới thiệu ngắn (Description)</span>
            <textarea 
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', minHeight: '80px', fontFamily: 'inherit' }}
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
            />
          </div>

          <div>
            <span className="label">📢 Thông báo trang chủ</span>
            <textarea 
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', minHeight: '80px', fontFamily: 'inherit' }}
              placeholder="Nhập thông báo hiển thị tại trang chủ..."
              value={announcement}
              onChange={e => setAnnouncement(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <span className="label">📞 Điện thoại / Zalo</span>
              <input 
                type="text" 
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }}
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
            <div>
              <span className="label">✉ FaceTime</span>
              <input 
                type="text" 
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }}
                value={facetime}
                onChange={e => setFacetime(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* --- PORTFOLIO SLIDES MANAGEMENT --- */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>
            <h3 style={{ margin: 0, color: 'var(--ink)', fontSize: '17px' }}>📸 Danh sách ảnh Portfolio trang chủ ({slides.length})</h3>
            <button type="button" className="btn secondary" style={{ padding: '6px 12px', fontSize: '13px', minHeight: 'auto' }} onClick={handleAddSlide}>+ Thêm ảnh</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {slides.map((slide, index) => (
              <div 
                key={index} 
                style={{ 
                  display: 'flex', 
                  gap: '16px', 
                  padding: '16px', 
                  border: '1px solid var(--line)', 
                  borderRadius: '12px', 
                  background: 'rgba(255,255,255,0.02)',
                  alignItems: 'start'
                }}
              >
                {/* Image Preview */}
                <div style={{ width: '120px', height: '120px', border: '1px solid var(--line)', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: '#1c221e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {slide.image ? (
                    <img src={slide.image} alt={slide.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: 'var(--muted)', fontSize: '11px' }}>Không có ảnh</span>
                  )}
                </div>

                {/* Form fields for slide */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '12px' }}>
                    <div>
                      <input 
                        type="text" 
                        placeholder="Tên nhóm ảnh (Ví dụ: ẢNH CƯỚI)"
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '13px', fontWeight: 'bold' }}
                        value={slide.title}
                        onChange={e => handleSlideChange(index, 'title', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <input 
                        type="text" 
                        placeholder="Đường dẫn link ảnh (URL)"
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '13px', fontFamily: 'monospace' }}
                        value={slide.image}
                        onChange={e => handleSlideChange(index, 'image', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <textarea 
                      placeholder="Mô tả ngắn gọn về nhóm ảnh..."
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '13px', minHeight: '50px', fontFamily: 'inherit' }}
                      value={slide.desc}
                      onChange={e => handleSlideChange(index, 'desc', e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Remove button */}
                <button 
                  type="button" 
                  onClick={() => handleRemoveSlide(index)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--red)',
                    fontSize: '18px',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}
                  title="Xoá ảnh này"
                >
                  ✕
                </button>
              </div>
            ))}

            {slides.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)', border: '1px dashed var(--line)', borderRadius: '8px' }}>
                Chưa có ảnh nào trong danh sách. Hãy nhấn nút "+ Thêm ảnh" ở trên.
              </div>
            )}
          </div>
        </section>

        {/* --- FORM ACTIONS --- */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--line)', paddingTop: '20px', marginTop: '12px' }}>
          <button type="submit" className="btn primary" disabled={saving} style={{ padding: '10px 24px' }}>
            {saving ? 'Đang lưu...' : 'Lưu cấu hình website'}
          </button>
        </div>
      </form>
    </div>
  );
}
