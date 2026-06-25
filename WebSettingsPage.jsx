import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import api from './api';

// Helper to render plain text email template into beautiful HTML preview
function renderPreviewHTML({ subject, body, orderNo, fullName, lookupCode, paymentStatus, driveLink, drivePassword, previewImageSrc, footer }) {
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
        ${(footer || 'Đây là email tự động gửi từ hệ thống HoangKiet Photography.\nVui lòng không trả lời trực tiếp email này.').replace(/\r?\n/g, '<br/>')}
      </div>
    </div>
  `;
}

// Helper to update browser tab favicon dynamically
function updateFavicon(url) {
  if (!url) return;
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.getElementsByTagName('head')[0].appendChild(link);
  }
  link.href = url;
}

// Helper to dynamically load font from Google Fonts or a custom URL stylesheet
function loadFont(fontType, fontName, fontUrl) {
  if (!fontName) return;
  const nameTrim = fontName.trim();
  if (fontType === 'custom_url' && fontUrl) {
    const urlTrim = fontUrl.trim();
    let link = document.querySelector(`link[href="${urlTrim}"]`);
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = urlTrim;
      document.head.appendChild(link);
    }
  } else if (fontType === 'google') {
    const fontId = `gfont-${nameTrim.replace(/\s+/g, '-').toLowerCase()}`;
    let link = document.getElementById(fontId);
    if (!link) {
      link = document.createElement('link');
      link.id = fontId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(nameTrim)}:wght@300;400;500;600;700;800;900&display=swap`;
      document.head.appendChild(link);
    }
  } else if (fontType === 'preset') {
    const presets = {
      'Inter': 'Inter:wght@300;400;500;600;700;800;900',
      'Outfit': 'Outfit:wght@300;400;500;600;700;800;900',
      'Roboto': 'Roboto:wght@300;400;500;700;900',
      'Montserrat': 'Montserrat:wght@300;400;500;600;700;800;900',
      'Playfair Display': 'Playfair+Display:ital,wght@0,400..900;1,400..900',
      'Lora': 'Lora:ital,wght@0,400..700;1,400..700',
      'Dancing Script': 'Dancing+Script:wght@400..700',
      'Cinzel': 'Cinzel:wght@400..900',
      'Pacifico': 'Pacifico',
    };
    if (presets[nameTrim]) {
      const fontId = `gfont-${nameTrim.replace(/\s+/g, '-').toLowerCase()}`;
      let link = document.getElementById(fontId);
      if (!link) {
        link = document.createElement('link');
        link.id = fontId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${presets[nameTrim]}&display=swap`;
        document.head.appendChild(link);
      }
    }
  }
}

function updateCustomFontsCSS(brandFontName, siteFontName, subheadingFontName, descFontName) {
  let styleTag = document.getElementById('custom-fonts-css');
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'custom-fonts-css';
    document.head.appendChild(styleTag);
  }

  const brandFamily = brandFontName ? `'${brandFontName.replace(/'/g, "\\'")}'` : 'inherit';
  const siteFamily = siteFontName ? `'${siteFontName.replace(/'/g, "\\'")}'` : 'inherit';
  const subheadingFamily = subheadingFontName ? `'${subheadingFontName.replace(/'/g, "\\'")}'` : 'inherit';
  const descFamily = descFontName ? `'${descFontName.replace(/'/g, "\\'")}'` : 'inherit';

  styleTag.innerHTML = `
    body, input, select, textarea, button {
      font-family: ${siteFamily}, 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    }
    .sidebar-morph .brand .brand-text {
      font-family: ${brandFamily}, 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    }
    .custom-subheading-font {
      font-family: ${subheadingFamily}, inherit !important;
    }
    .custom-desc-font {
      font-family: ${descFamily}, inherit !important;
    }
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
  const mode = slide.mode || 'link';

  const switchMode = (newMode) => {
    if (newMode === mode) return;
    onChange(index, 'mode', newMode);
    onChange(index, 'image', newMode === 'upload' ? slide.uploadedImage : slide.linkImage);
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
    reader.onload = (ev) => {
      onChange(index, 'uploadedImage', ev.target.result);
      onChange(index, 'image', ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleLinkChange = (e) => {
    const val = e.target.value;
    onChange(index, 'linkImage', val);
    onChange(index, 'image', val);
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
              {slide.uploadedImage ? '✓ Đã chọn ảnh — nhấn để thay ảnh khác' : 'Nhấn để chọn ảnh từ máy tính (tối đa 5MB)'}
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
            value={slide.linkImage || ''}
            onChange={handleLinkChange}
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

const DEFAULT_EMAIL_FROM_NAME = 'HoangKiet';
const DEFAULT_EMAIL_SUBJECT = '[HoangKiet] Cập nhật thông tin đơn hàng {order_no}';
const DEFAULT_EMAIL_BODY = `Xin chào {full_name} với mã tra cứu {lookup_code},

Chúng tôi đã nhận được thông tin {payment_status} của bạn và đơn hàng {order_no} đã hoàn thành!

{preview_image}

Dưới đây là toàn bộ gói ảnh của bạn:
Link Drive tải ảnh: {drive_link}
Mật khẩu: {drive_password}

Chúc bạn luôn có những bức ảnh đẹp nhất và ngập tràn niềm vui!

Trân trọng,
Ban quản trị HoangKiet`;

const DEFAULT_EMAIL_FOOTER = 'Đây là email tự động gửi từ hệ thống HoangKiet Photography.\nVui lòng không trả lời trực tiếp email này.';

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function WebSettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [siteTitle, setSiteTitle] = useState('');
  const [siteLogo, setSiteLogo] = useState('');
  const [uploadedLogo, setUploadedLogo] = useState('');
  const [linkLogo, setLinkLogo] = useState('');
  const [logoMode, setLogoMode] = useState('link');
  const [brandName, setBrandName] = useState('HoangKiet');
  const [brandFontType, setBrandFontType] = useState('preset');
  const [brandFontName, setBrandFontName] = useState('Be Vietnam Pro');
  const [brandFontUrl, setBrandFontUrl] = useState('');
  const [siteFontType, setSiteFontType] = useState('preset');
  const [siteFontName, setSiteFontName] = useState('Be Vietnam Pro');
  const [siteFontUrl, setSiteFontUrl] = useState('');
  
  // New font states for sub-heading and description
  const [subHeadingFontType, setSubHeadingFontType] = useState('preset');
  const [subHeadingFontName, setSubHeadingFontName] = useState('Be Vietnam Pro');
  const [subHeadingFontUrl, setSubHeadingFontUrl] = useState('');
  const [descFontType, setDescFontType] = useState('preset');
  const [descFontName, setDescFontName] = useState('Be Vietnam Pro');
  const [descFontUrl, setDescFontUrl] = useState('');
  
  // Font sync states
  const [syncBrand, setSyncBrand] = useState(false);
  const [syncSubHeading, setSyncSubHeading] = useState(false);
  const [syncDesc, setSyncDesc] = useState(false);
  
  // Font edit mode: brand | subheading | description | sync | all
  const [fontEditMode, setFontEditMode] = useState('brand');

  const [displayName, setDisplayName] = useState('');
  const [subHeading, setSubHeading] = useState('');
  const [description, setDescription] = useState('');
  const [announcements, setAnnouncements] = useState(['']);
  const [phone, setPhone] = useState('');
  const [facetime, setFacetime] = useState('');
  const [emailFromName, setEmailFromName] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailFooter, setEmailFooter] = useState('');
  const [slides, setSlides] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState('paid_with_img');
  const [emailConfigExpanded, setEmailConfigExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const sliderContainerRef = useRef(null);
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

  const renderFontInputs = (title, type, setType, name, setName, url, setUrl, isSynced, targetKey) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: isSynced ? 0.75 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <label className="label" style={{ margin: 0, fontWeight: 'bold' }}>{title}</label>
          {isSynced && (
            <span style={{ 
              fontSize: '11px', 
              color: '#10b981', 
              background: 'rgba(16,185,129,0.1)', 
              padding: '2px 8px', 
              borderRadius: '4px', 
              fontWeight: 'bold',
              border: '1px solid rgba(16,185,129,0.2)'
            }}>
              🔗 Đang tự động đồng bộ theo Font giao diện
            </span>
          )}
        </div>
        
        <select 
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', background: isSynced ? 'rgba(255,255,255,0.02)' : 'var(--paper)', color: isSynced ? 'var(--muted)' : 'var(--ink)', cursor: isSynced ? 'not-allowed' : 'default' }}
          value={type}
          onChange={e => { setType(e.target.value); markDirty(); }}
          disabled={isSynced}
        >
          <option value="preset">Chọn từ danh sách có sẵn (Google Fonts)</option>
          <option value="google">Nhập tên Google Font bất kỳ</option>
          <option value="upload">Tải file Font từ máy (.woff2, .woff, .ttf, .otf)</option>
          <option value="custom_url">Nhập link file Font CSS tùy chỉnh</option>
        </select>

        {type === 'preset' && (
          <select 
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', background: isSynced ? 'rgba(255,255,255,0.02)' : 'var(--paper)', color: isSynced ? 'var(--muted)' : 'var(--ink)', cursor: isSynced ? 'not-allowed' : 'default' }}
            value={name}
            onChange={e => { setName(e.target.value); markDirty(); }}
            disabled={isSynced}
          >
            <option value="Be Vietnam Pro">Be Vietnam Pro (Mặc định)</option>
            <option value="Inter">Inter (Hiện đại)</option>
            <option value="Outfit">Outfit (Bo tròn trẻ trung)</option>
            <option value="Roboto">Roboto (Truyền thống)</option>
            <option value="Montserrat">Montserrat (Mạnh mẽ)</option>
            <option value="Playfair Display">Playfair Display (Sang trọng)</option>
            <option value="Lora">Lora (Cổ điển)</option>
            <option value="Dancing Script">Dancing Script (Nghệ thuật bay bổng)</option>
            <option value="Cinzel">Cinzel (Cực kỳ cao cấp)</option>
            <option value="Pacifico">Pacifico (Phá cách)</option>
          </select>
        )}

        {type === 'google' && (
          <input 
            type="text" 
            placeholder="Ví dụ: Oswald hoặc Open Sans" 
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', background: isSynced ? 'rgba(255,255,255,0.02)' : 'var(--paper)', color: isSynced ? 'var(--muted)' : 'var(--ink)', cursor: isSynced ? 'not-allowed' : 'default' }}
            value={name}
            onChange={e => { setName(e.target.value); markDirty(); }}
            required
            disabled={isSynced}
          />
        )}

        {type === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="Đặt tên Font (Ví dụ: CustomFont)" 
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', background: isSynced ? 'rgba(255,255,255,0.02)' : 'var(--paper)', color: isSynced ? 'var(--muted)' : 'var(--ink)', cursor: isSynced ? 'not-allowed' : 'default' }}
              value={name}
              onChange={e => { setName(e.target.value); markDirty(); }}
              required
              disabled={isSynced}
            />
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px',
              border: '1px dashed var(--line)',
              borderRadius: '8px',
              cursor: isSynced ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              color: 'var(--muted)',
              background: 'rgba(255,255,255,0.02)',
              margin: 0
            }}>
              <span>{url && url.startsWith('data:') ? '✓ Đã tải lên file Font' : 'Chọn file Font (.woff2, .woff, .ttf, .otf)'}</span>
              <input 
                type="file" 
                accept=".woff2,.woff,.ttf,.otf" 
                style={{ display: 'none' }} 
                onChange={(e) => handleFontUpload(e, targetKey)} 
                disabled={isSynced}
              />
            </label>
          </div>
        )}

        {type === 'custom_url' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="Tên Font-Family (Ví dụ: CustomFont)" 
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', background: isSynced ? 'rgba(255,255,255,0.02)' : 'var(--paper)', color: isSynced ? 'var(--muted)' : 'var(--ink)', cursor: isSynced ? 'not-allowed' : 'default' }}
              value={name}
              onChange={e => { setName(e.target.value); markDirty(); }}
              required
              disabled={isSynced}
            />
            <input 
              type="url" 
              placeholder="Link file CSS (Ví dụ: https://example.com/font.css)" 
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', background: isSynced ? 'rgba(255,255,255,0.02)' : 'var(--paper)', color: isSynced ? 'var(--muted)' : 'var(--ink)', cursor: isSynced ? 'not-allowed' : 'default' }}
              value={url}
              onChange={e => { setUrl(e.target.value); markDirty(); }}
              required
              disabled={isSynced}
            />
          </div>
        )}
      </div>
    );
  };

  // Live font draft loading (registers font files in browser memory for previews)
  useEffect(() => {
    loadFont(brandFontType, brandFontName, brandFontUrl);
    loadFont(siteFontType, siteFontName, siteFontUrl);
    loadFont(subHeadingFontType, subHeadingFontName, subHeadingFontUrl);
    loadFont(descFontType, descFontName, descFontUrl);
  }, [
    brandFontType, brandFontName, brandFontUrl, 
    siteFontType, siteFontName, siteFontUrl,
    subHeadingFontType, subHeadingFontName, subHeadingFontUrl,
    descFontType, descFontName, descFontUrl
  ]);

  // Synchronize font settings if enabled
  useEffect(() => {
    if (syncBrand) {
      setBrandFontType(siteFontType);
      setBrandFontName(siteFontName);
      setBrandFontUrl(siteFontUrl);
    }
  }, [siteFontType, siteFontName, siteFontUrl, syncBrand]);

  useEffect(() => {
    if (syncSubHeading) {
      setSubHeadingFontType(siteFontType);
      setSubHeadingFontName(siteFontName);
      setSubHeadingFontUrl(siteFontUrl);
    }
  }, [siteFontType, siteFontName, siteFontUrl, syncSubHeading]);

  useEffect(() => {
    if (syncDesc) {
      setDescFontType(siteFontType);
      setDescFontName(siteFontName);
      setDescFontUrl(siteFontUrl);
    }
  }, [siteFontType, siteFontName, siteFontUrl, syncDesc]);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/web-settings');
      if (res.data) {
        const data = {
          site_title: res.data.site_title || '',
          site_logo: res.data.site_logo || '',
          brand_name: res.data.brand_name || 'HoangKiet',
          brand_font_type: res.data.brand_font_type || 'preset',
          brand_font_name: res.data.brand_font_name || 'Be Vietnam Pro',
          brand_font_url: res.data.brand_font_url || '',
          site_font_type: res.data.site_font_type || 'preset',
          site_font_name: res.data.site_font_name || 'Be Vietnam Pro',
          site_font_url: res.data.site_font_url || '',
          subheading_font_type: res.data.subheading_font_type || 'preset',
          subheading_font_name: res.data.subheading_font_name || 'Be Vietnam Pro',
          subheading_font_url: res.data.subheading_font_url || '',
          desc_font_type: res.data.desc_font_type || 'preset',
          desc_font_name: res.data.desc_font_name || 'Be Vietnam Pro',
          desc_font_url: res.data.desc_font_url || '',
          sync_brand: res.data.sync_brand === 'true' || res.data.sync_brand === true,
          sync_subheading: res.data.sync_subheading === 'true' || res.data.sync_subheading === true,
          sync_desc: res.data.sync_desc === 'true' || res.data.sync_desc === true,
          display_name: res.data.display_name || '',
          sub_heading: res.data.sub_heading || '',
          description: res.data.description || '',
          announcement: res.data.announcement || '',
          phone: res.data.phone || '',
          facetime: res.data.facetime || '',
          email_from_name: res.data.email_from_name || '',
          email_subject: res.data.email_subject || '',
          email_body: res.data.email_body || '',
          email_footer: res.data.email_footer || '',
          slides: res.data.slides || [],
        };
        const isLogoB64 = data.site_logo && data.site_logo.startsWith('data:');
        setSiteTitle(data.site_title);
        setSiteLogo(data.site_logo);
        setUploadedLogo(isLogoB64 ? data.site_logo : '');
        setLinkLogo(!isLogoB64 ? data.site_logo : '');
        setLogoMode(isLogoB64 ? 'upload' : 'link');
        setBrandName(data.brand_name);
        setBrandFontType(data.brand_font_type);
        setBrandFontName(data.brand_font_name);
        setBrandFontUrl(data.brand_font_url);
        setSiteFontType(data.site_font_type);
        setSiteFontName(data.site_font_name);
        setSiteFontUrl(data.site_font_url);
        
        // Populate new font states
        setSubHeadingFontType(data.subheading_font_type);
        setSubHeadingFontName(data.subheading_font_name);
        setSubHeadingFontUrl(data.subheading_font_url);
        setDescFontType(data.desc_font_type);
        setDescFontName(data.desc_font_name);
        setDescFontUrl(data.desc_font_url);
        setSyncBrand(data.sync_brand);
        setSyncSubHeading(data.sync_subheading);
        setSyncDesc(data.sync_desc);

        setDisplayName(data.display_name);
        setSubHeading(data.sub_heading);
        setDescription(data.description);
        if (data.announcement) {
          try {
            const parsed = JSON.parse(data.announcement);
            setAnnouncements(Array.isArray(parsed) ? parsed.filter(Boolean) : [data.announcement]);
          } catch (e) {
            setAnnouncements([data.announcement]);
          }
        } else {
          setAnnouncements(['']);
        }
        setPhone(data.phone);
        setFacetime(data.facetime);
        setEmailFromName(data.email_from_name);
        setEmailSubject(data.email_subject);
        setEmailBody(data.email_body);
        setEmailFooter(data.email_footer);

        const normalizedSlides = (data.slides || []).map(s => {
          const isB64 = s.image && s.image.startsWith('data:');
          return {
            title: s.title || '',
            desc: s.desc || '',
            image: s.image || '',
            uploadedImage: isB64 ? s.image : '',
            linkImage: !isB64 ? s.image : '',
            mode: isB64 ? 'upload' : 'link'
          };
        });
        setSlides(normalizedSlides);
        savedRef.current = {
          ...data,
          slides: normalizedSlides
        };

        // Load & Apply font CSS globally based on SAVED data only
        loadFont(data.brand_font_type, data.brand_font_name, data.brand_font_url);
        loadFont(data.site_font_type, data.site_font_name, data.site_font_url);
        loadFont(data.subheading_font_type, data.subheading_font_name, data.subheading_font_url);
        loadFont(data.desc_font_type, data.desc_font_name, data.desc_font_url);
        updateCustomFontsCSS(
          data.brand_font_name,
          data.site_font_name,
          data.subheading_font_name,
          data.desc_font_name
        );

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

  const handleResetEmailTemplate = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục cấu hình email về mặc định ban đầu?')) {
      setEmailFromName(DEFAULT_EMAIL_FROM_NAME);
      setEmailSubject(DEFAULT_EMAIL_SUBJECT);
      setEmailBody(DEFAULT_EMAIL_BODY);
      setEmailFooter(DEFAULT_EMAIL_FOOTER);
      markDirty();
    }
  };

  const handleAddSlide = () => {
    setSlides(prev => {
      const nextSlides = [...prev, { title: 'TÊN HÌNH ẢNH MỚI', desc: 'Mô tả ngắn gọn.', image: '', uploadedImage: '', linkImage: '', mode: 'link' }];
      const nextTotalPages = Math.ceil(nextSlides.length / 5);
      setCurrentPage(nextTotalPages - 1);
      return nextSlides;
    });
    markDirty();
  };

  const handleRemoveSlide = (index) => {
    if (!window.confirm('Bạn có chắc muốn xoá tấm ảnh này?')) return;
    setSlides(prev => {
      const n = [...prev];
      n.splice(index, 1);
      const nextTotalPages = Math.max(1, Math.ceil(n.length / 5));
      setCurrentPage(p => Math.min(p, nextTotalPages - 1));
      return n;
    });
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

  const handleDragStart = (e) => {
    const tagName = e.target.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'button' || tagName === 'select' || e.target.closest('label') || e.target.closest('button')) {
      return;
    }
    setIsDragging(true);
    startX.current = e.touches ? e.touches[0].clientX : e.clientX;
    currentX.current = startX.current;
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    currentX.current = x;
    const diffX = x - startX.current;
    const containerWidth = sliderContainerRef.current ? sliderContainerRef.current.offsetWidth : 1000;
    const offsetPercent = -diffX / containerWidth;
    setDragOffset(offsetPercent);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const totalPages = Math.max(1, Math.ceil(slides.length / 5));
    const threshold = 0.15;
    let newPage = currentPage;
    if (dragOffset > threshold && currentPage < totalPages - 1) {
      newPage = currentPage + 1;
    } else if (dragOffset < -threshold && currentPage > 0) {
      newPage = currentPage - 1;
    }
    setCurrentPage(newPage);
    setDragOffset(0);
  };

  const doSave = async () => {
    setSaving(true);
    setErrorMsg('');
    try {
      const dbSlides = slides.map(s => ({
        title: s.title || '',
        desc: s.desc || '',
        image: s.image || ''
      }));
      const payload = {
        site_title: siteTitle,
        site_logo: siteLogo,
        brand_name: brandName,
        brand_font_type: brandFontType,
        brand_font_name: brandFontName,
        brand_font_url: brandFontUrl,
        site_font_type: siteFontType,
        site_font_name: siteFontName,
        site_font_url: siteFontUrl,
        subheading_font_type: subHeadingFontType,
        subheading_font_name: subHeadingFontName,
        subheading_font_url: subHeadingFontUrl,
        desc_font_type: descFontType,
        desc_font_name: descFontName,
        desc_font_url: descFontUrl,
        sync_brand: syncBrand,
        sync_subheading: syncSubHeading,
        sync_desc: syncDesc,
        display_name: displayName,
        sub_heading: subHeading,
        description,
        announcement: JSON.stringify(announcements.filter(val => val && val.trim() !== '')),
        phone,
        facetime,
        email_from_name: emailFromName,
        email_subject: emailSubject,
        email_body: emailBody,
        email_footer: emailFooter,
        slides: dbSlides
      };
      await api.put('/web-settings', payload);
      savedRef.current = {
        ...payload,
        slides: [...slides]
      };
      setIsDirty(false);
      if (siteTitle) {
        document.title = siteTitle;
      }
      if (siteLogo) {
        updateFavicon(siteLogo);
      }
      // Apply the newly saved fonts globally right away!
      updateCustomFontsCSS(brandFontName, siteFontName, subHeadingFontName, descFontName);
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

  const handleDiscardChanges = () => {
    if (!window.confirm('Bạn có chắc chắn muốn huỷ bỏ toàn bộ các thay đổi chưa lưu?')) return;
    const data = savedRef.current;
    if (data) {
      const isLogoB64 = data.site_logo && data.site_logo.startsWith('data:');
      setSiteTitle(data.site_title || '');
      setSiteLogo(data.site_logo || '');
      setUploadedLogo(isLogoB64 ? data.site_logo : '');
      setLinkLogo(!isLogoB64 ? data.site_logo : '');
      setLogoMode(isLogoB64 ? 'upload' : 'link');
      setBrandName(data.brand_name || 'HoangKiet');
      setBrandFontType(data.brand_font_type || 'preset');
      setBrandFontName(data.brand_font_name || 'Be Vietnam Pro');
      setBrandFontUrl(data.brand_font_url || '');
      setSiteFontType(data.site_font_type || 'preset');
      setSiteFontName(data.site_font_name || 'Be Vietnam Pro');
      setSiteFontUrl(data.site_font_url || '');
      
      // Reset new font states
      setSubHeadingFontType(data.subheading_font_type || 'preset');
      setSubHeadingFontName(data.subheading_font_name || 'Be Vietnam Pro');
      setSubHeadingFontUrl(data.subheading_font_url || '');
      setDescFontType(data.desc_font_type || 'preset');
      setDescFontName(data.desc_font_name || 'Be Vietnam Pro');
      setDescFontUrl(data.desc_font_url || '');
      setSyncBrand(data.sync_brand || false);
      setSyncSubHeading(data.sync_subheading || false);
      setSyncDesc(data.sync_desc || false);
      setFontEditMode('brand');

      setDisplayName(data.display_name || '');
      setSubHeading(data.sub_heading || '');
      setDescription(data.description || '');
      if (data.announcement) {
        try {
          const parsed = JSON.parse(data.announcement);
          setAnnouncements(Array.isArray(parsed) ? parsed.filter(Boolean) : [data.announcement]);
        } catch (e) {
          setAnnouncements([data.announcement]);
        }
      } else {
        setAnnouncements(['']);
      }
      setPhone(data.phone || '');
      setFacetime(data.facetime || '');
      setEmailFromName(data.email_from_name || '');
      setEmailSubject(data.email_subject || '');
      setEmailBody(data.email_body || '');
      setEmailFooter(data.email_footer || '');

      const normalizedSlides = (data.slides || []).map(s => {
        const isB64 = s.image && s.image.startsWith('data:');
        return {
          title: s.title || '',
          desc: s.desc || '',
          image: s.image || '',
          uploadedImage: isB64 ? s.image : '',
          linkImage: !isB64 ? s.image : '',
          mode: isB64 ? 'upload' : 'link'
        };
      });
      setSlides(normalizedSlides);
      setIsDirty(false);
      setCurrentPage(0);
      
      // Re-apply original phông chữ globally
      updateCustomFontsCSS(
        data.brand_font_name || 'Be Vietnam Pro',
        data.site_font_name || 'Be Vietnam Pro',
        data.subheading_font_name || 'Be Vietnam Pro',
        data.desc_font_name || 'Be Vietnam Pro'
      );
    }
  };

  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Logo phải nhỏ hơn 5MB. Vui lòng chọn ảnh khác hoặc dùng link URL.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target.result;
      setUploadedLogo(result);
      setSiteLogo(result);
      markDirty();
    };
    reader.readAsDataURL(file);
  };

  const handleSwitchLogoMode = (newMode) => {
    if (newMode === logoMode) return;
    setLogoMode(newMode);
    setSiteLogo(newMode === 'upload' ? uploadedLogo : linkLogo);
    markDirty();
  };

  const handleLogoLinkChange = (e) => {
    const val = e.target.value;
    setLinkLogo(val);
    setSiteLogo(val);
    markDirty();
  };

  const handleFontUpload = (e, target) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('File Font phải nhỏ hơn 10MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      const defaultName = file.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, '');
      if (target === 'brand') {
        setBrandFontUrl(base64);
        if (!brandFontName || brandFontName === 'Be Vietnam Pro') {
          setBrandFontName(defaultName);
        }
      } else if (target === 'site') {
        setSiteFontUrl(base64);
        if (!siteFontName || siteFontName === 'Be Vietnam Pro') {
          setSiteFontName(defaultName);
        }
      } else if (target === 'subheading') {
        setSubHeadingFontUrl(base64);
        if (!subHeadingFontName || subHeadingFontName === 'Be Vietnam Pro') {
          setSubHeadingFontName(defaultName);
        }
      } else if (target === 'description') {
        setDescFontUrl(base64);
        if (!descFontName || descFontName === 'Be Vietnam Pro') {
          setDescFontName(defaultName);
        }
      }
      markDirty();
    };
    reader.readAsDataURL(file);
  };

  const logoTabBtn = (active) => ({
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '16px 20px', borderBottom: '1px solid var(--line)', background: 'rgba(255,255,255,0.01)' }}>
              <button
                type="button"
                onClick={() => setActivePreviewTab('paid_with_img')}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--line)', cursor: 'pointer',
                  fontWeight: 'bold', fontSize: '13px',
                  background: activePreviewTab === 'paid_with_img' ? 'var(--green-2)' : 'transparent',
                  color: activePreviewTab === 'paid_with_img' ? '#fff' : 'var(--muted)'
                }}
              >
                💵 Trả Phí (Có ảnh)
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('paid_no_img')}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--line)', cursor: 'pointer',
                  fontWeight: 'bold', fontSize: '13px',
                  background: activePreviewTab === 'paid_no_img' ? 'var(--green-2)' : 'transparent',
                  color: activePreviewTab === 'paid_no_img' ? '#fff' : 'var(--muted)'
                }}
              >
                💵 Trả Phí (Không ảnh)
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('free_with_img')}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--line)', cursor: 'pointer',
                  fontWeight: 'bold', fontSize: '13px',
                  background: activePreviewTab === 'free_with_img' ? 'var(--green-2)' : 'transparent',
                  color: activePreviewTab === 'free_with_img' ? '#fff' : 'var(--muted)'
                }}
              >
                🎁 Miễn Phí (Có ảnh)
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('free_no_img')}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--line)', cursor: 'pointer',
                  fontWeight: 'bold', fontSize: '13px',
                  background: activePreviewTab === 'free_no_img' ? 'var(--green-2)' : 'transparent',
                  color: activePreviewTab === 'free_no_img' ? '#fff' : 'var(--muted)'
                }}
              >
                🎁 Miễn Phí (Không ảnh)
              </button>
            </div>

            {/* Email Envelope Header */}
            {(() => {
              let previewOrderNo = 'HK-GoiAnhCuoi-HK889';
              let previewFullName = 'Nguyễn Văn A';
              let previewLookupCode = 'LU9988';
              let previewPaymentStatus = 'thanh toán gói ảnh';
              let previewDriveLink = 'https://drive.google.com/drive/folders/mock-id-paid';
              let previewDrivePassword = 'kietwedding123';
              let previewImageSrc = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80';

              if (activePreviewTab === 'paid_no_img') {
                previewImageSrc = '';
              } else if (activePreviewTab === 'free_with_img') {
                previewOrderNo = 'HK-AnhChanDungFree-HK123';
                previewFullName = 'Trần Thị B';
                previewLookupCode = 'LU1122';
                previewPaymentStatus = 'đăng ký gói ảnh miễn phí';
                previewDriveLink = 'https://drive.google.com/drive/folders/mock-id-free';
                previewDrivePassword = 'Không có';
              } else if (activePreviewTab === 'free_no_img') {
                previewOrderNo = 'HK-AnhChanDungFree-HK123';
                previewFullName = 'Trần Thị B';
                previewLookupCode = 'LU1122';
                previewPaymentStatus = 'đăng ký gói ảnh miễn phí';
                previewDriveLink = 'https://drive.google.com/drive/folders/mock-id-free';
                previewDrivePassword = 'Không có';
                previewImageSrc = '';
              }

              const computedSubject = emailSubject
                .replace(/{order_no}/g, previewOrderNo)
                .replace(/{full_name}/g, previewFullName)
                .replace(/{lookup_code}/g, previewLookupCode)
                .replace(/{payment_status}/g, previewPaymentStatus);

              return (
                <>
                  <div style={{ padding: '16px 20px 0' }}>
                    <div style={{
                      textAlign: 'left', padding: '16px', borderRadius: '12px',
                      background: 'var(--paper)', border: '1px solid var(--line)', fontSize: '13px',
                      display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--ink)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ color: 'var(--muted)', width: '80px', display: 'inline-block', flexShrink: 0 }}>Từ:</span>
                        <span style={{ fontWeight: 'bold' }}>{emailFromName || 'HoangKiet'}</span>
                        <span style={{ color: 'var(--muted)', marginLeft: '4px' }}>&lt;hoanganhkiet.264@gmail.com&gt;</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>
                        <span style={{ color: 'var(--muted)', width: '80px', display: 'inline-block', flexShrink: 0 }}>Tới:</span>
                        <span>khachhang@gmail.com</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline' }}>
                        <span style={{ color: 'var(--muted)', width: '80px', display: 'inline-block', flexShrink: 0 }}>Tiêu đề:</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--green-2)' }}>{computedSubject}</span>
                      </div>
                    </div>
                  </div>

                  {/* Email Render Box */}
                  <div style={{ padding: '20px', overflowY: 'auto', flex: 1, textAlign: 'center', background: 'var(--bg)' }}>
                    <div dangerouslySetInnerHTML={{
                      __html: renderPreviewHTML({
                        subject: emailSubject,
                        body: emailBody,
                        orderNo: previewOrderNo,
                        fullName: previewFullName,
                        lookupCode: previewLookupCode,
                        paymentStatus: previewPaymentStatus,
                        driveLink: previewDriveLink,
                        drivePassword: previewDrivePassword,
                        previewImageSrc: previewImageSrc,
                        footer: emailFooter
                      })
                    }} />
                  </div>
                </>
              );
            })()}

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
                <label htmlFor="ws-site-title" className="label">Tiêu đề Web (Hiển thị trên tab trình duyệt)</label>
                <input id="ws-site-title" name="site_title" type="text" placeholder="Ví dụ: HoangKiet - Tra cứu thông tin gói ảnh" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }}
                  value={siteTitle} onChange={e => { setSiteTitle(e.target.value); markDirty(); }} required />
              </div>

              <div>
                <label className="label" style={{ display: 'block', marginBottom: '8px' }}>Logo Website</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {/* Logo Preview */}
                  <div style={{
                    width: '42px',
                    height: '42px',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: '#1c221e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {siteLogo ? (
                      <img src={siteLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: '18px' }}>📸</span>
                    )}
                  </div>

                  {/* Logo Upload/Link input */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        type="button" 
                        style={logoTabBtn(logoMode === 'upload')} 
                        onClick={() => handleSwitchLogoMode('upload')}
                      >
                        ⬆️ Upload file
                      </button>
                      <button 
                        type="button" 
                        style={logoTabBtn(logoMode === 'link')} 
                        onClick={() => handleSwitchLogoMode('link')}
                      >
                        🔗 Dùng link URL
                      </button>
                    </div>

                    {logoMode === 'upload' ? (
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 12px',
                        border: '1px dashed var(--line)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: 'var(--muted)',
                        background: 'rgba(255,255,255,0.02)',
                        margin: 0
                      }}>
                        <span>{uploadedLogo ? '✓ Đã chọn file' : 'Chọn logo từ máy (tối đa 5MB)'}</span>
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoFileChange} />
                      </label>
                    ) : (
                      <input
                        type="url"
                        placeholder="https://example.com/logo.png"
                        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '12px', fontFamily: 'monospace', width: '100%' }}
                        value={linkLogo}
                        onChange={handleLogoLinkChange}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label htmlFor="ws-brand-name" className="label">Tên thương hiệu (Sidebar)</label>
                <input id="ws-brand-name" name="brand_name" type="text" placeholder="Ví dụ: HoangKiet" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }}
                  value={brandName} onChange={e => { setBrandName(e.target.value); markDirty(); }} required />
              </div>

              <div>
                <label htmlFor="ws-display-name" className="label">Tên hiển thị Website</label>
                <input id="ws-display-name" name="display_name" type="text" autoComplete="organization" placeholder="Ví dụ: Kiet Hoang Photography" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }}
                  value={displayName} onChange={e => { setDisplayName(e.target.value); markDirty(); }} required />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Site Interface Base Font (Always Visible) */}
              <div style={{ padding: '16px', border: '1px solid var(--line)', borderRadius: '10px', background: 'rgba(255,255,255,0.01)' }}>
                {renderFontInputs(
                  'Font chữ giao diện Website (Phông chữ nền)',
                  siteFontType, setSiteFontType,
                  siteFontName, setSiteFontName,
                  siteFontUrl, setSiteFontUrl,
                  false, 'site'
                )}
              </div>

              {/* Advanced Font Option Select Dropdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className="label" style={{ fontWeight: 'bold', color: 'var(--copper)' }}>⚙️ Tùy chọn cấu hình phông chữ nâng cao</label>
                <select 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)' }}
                  value={fontEditMode}
                  onChange={e => setFontEditMode(e.target.value)}
                >
                  <option value="brand">1. Sửa phông chữ Logo/Thương hiệu (Brand)</option>
                  <option value="subheading">2. Sửa phông chữ Tiêu đề phụ (Sub-heading)</option>
                  <option value="description">3. Sửa phông chữ Giới thiệu ngắn (Description)</option>
                  <option value="sync">4. Tích chọn phông chữ muốn đồng bộ theo Giao diện Web</option>
                  <option value="all">5. Hiển thị và sửa tất cả phông chữ</option>
                </select>
              </div>

              {/* Conditional Panels */}
              {(fontEditMode === 'brand' || fontEditMode === 'all') && (
                <div style={{ padding: '16px', border: '1px solid var(--line)', borderRadius: '10px', background: 'rgba(255,255,255,0.01)' }}>
                  {renderFontInputs(
                    'Phông chữ Logo / Thương hiệu (Sidebar)',
                    brandFontType, setBrandFontType,
                    brandFontName, setBrandFontName,
                    brandFontUrl, setBrandFontUrl,
                    syncBrand, 'brand'
                  )}
                </div>
              )}

              {(fontEditMode === 'subheading' || fontEditMode === 'all') && (
                <div style={{ padding: '16px', border: '1px solid var(--line)', borderRadius: '10px', background: 'rgba(255,255,255,0.01)' }}>
                  {renderFontInputs(
                    'Phông chữ Tiêu đề phụ (Sub-heading)',
                    subHeadingFontType, setSubHeadingFontType,
                    subHeadingFontName, setSubHeadingFontName,
                    subHeadingFontUrl, setSubHeadingFontUrl,
                    syncSubHeading, 'subheading'
                  )}
                </div>
              )}

              {(fontEditMode === 'description' || fontEditMode === 'all') && (
                <div style={{ padding: '16px', border: '1px solid var(--line)', borderRadius: '10px', background: 'rgba(255,255,255,0.01)' }}>
                  {renderFontInputs(
                    'Phông chữ Giới thiệu ngắn (Description)',
                    descFontType, setDescFontType,
                    descFontName, setDescFontName,
                    descFontUrl, setDescFontUrl,
                    syncDesc, 'description'
                  )}
                </div>
              )}

              {fontEditMode === 'sync' && (
                <div style={{ padding: '20px', border: '1px dashed var(--line)', borderRadius: '10px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--blue)' }}>🔗 Tích chọn các phông chữ muốn tự động đồng bộ theo phông chữ Giao diện Web:</span>
                  <p style={{ margin: '0', fontSize: '12.5px', color: '#aaaaaa', lineHeight: '1.45' }}>
                    💡 <strong>Nguyên lý hoạt động:</strong> Phông chữ được lấy làm <strong>gốc / chuẩn</strong> là <strong>"Font chữ giao diện Website (Phông chữ nền)"</strong> (luôn hiển thị ở khung đầu tiên phía trên). Khi bạn thay đổi phông chữ giao diện chính đó, tất cả phông chữ con được chọn đồng bộ bên dưới sẽ tự động cập nhật theo.
                  </p>
                  
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13.5px', margin: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={syncBrand} 
                      onChange={e => { setSyncBrand(e.target.checked); markDirty(); }} 
                      style={{ width: '16px', height: '16px', accentColor: 'var(--copper)' }}
                      aria-label="Đồng bộ phông chữ Logo / Thương hiệu theo Giao diện Web"
                      title="Đồng bộ phông chữ Logo / Thương hiệu theo Giao diện Web"
                    />
                    <span>Đồng bộ phông chữ <strong>Logo / Thương hiệu (Brand)</strong></span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13.5px', margin: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={syncSubHeading} 
                      onChange={e => { setSyncSubHeading(e.target.checked); markDirty(); }} 
                      style={{ width: '16px', height: '16px', accentColor: 'var(--copper)' }}
                      aria-label="Đồng bộ phông chữ Tiêu đề phụ theo Giao diện Web"
                      title="Đồng bộ phông chữ Tiêu đề phụ theo Giao diện Web"
                    />
                    <span>Đồng bộ phông chữ <strong>Tiêu đề phụ (Sub-heading)</strong></span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13.5px', margin: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={syncDesc} 
                      onChange={e => { setSyncDesc(e.target.checked); markDirty(); }} 
                      style={{ width: '16px', height: '16px', accentColor: 'var(--copper)' }}
                      aria-label="Đồng bộ phông chữ Giới thiệu ngắn theo Giao diện Web"
                      title="Đồng bộ phông chữ Giới thiệu ngắn theo Giao diện Web"
                    />
                    <span>Đồng bộ phông chữ <strong>Giới thiệu ngắn (Description)</strong></span>
                  </label>
                </div>
              )}
            </div>

            {/* Font Sample Preview Collapsible */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--line)', borderRadius: '12px', padding: '16px', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 'bold' }}>👁️ Mẫu hiển thị Font chữ thực tế (Bản nháp trực quan)</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '12px' }}>
                {/* Brand Preview */}
                {(fontEditMode === 'brand' || fontEditMode === 'all' || (fontEditMode === 'sync' && syncBrand)) && (
                  <div style={{ background: 'var(--bg)', padding: '16px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--copper)', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      Sidebar Brand: "{brandName}" ({brandFontName})
                    </div>
                    <div style={{ 
                      fontFamily: `"${brandFontName}", sans-serif`, 
                      fontSize: '24px', 
                      fontWeight: 'bold', 
                      color: '#fff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {brandName}
                    </div>
                  </div>
                )}

                {/* Web Interface Preview */}
                <div style={{ background: 'var(--bg)', padding: '16px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--blue)', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Giao diện Web: ({siteFontName})
                  </div>
                  <div style={{ 
                    fontFamily: `"${siteFontName}", sans-serif`, 
                    fontSize: '14px', 
                    color: '#cbd5e1',
                    lineHeight: '1.6'
                  }}>
                    AaBbCcDdEeGgHh 0123456789
                  </div>
                </div>

                {/* Sub-heading Preview */}
                {(fontEditMode === 'subheading' || fontEditMode === 'all' || (fontEditMode === 'sync' && syncSubHeading)) && (
                  <div style={{ background: 'var(--bg)', padding: '16px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--green-2)', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      Tiêu đề phụ: ({subHeadingFontName})
                    </div>
                    <div style={{ 
                      fontFamily: `"${subHeadingFontName}", sans-serif`, 
                      fontSize: '16px', 
                      color: 'var(--copper)',
                      fontWeight: '600'
                    }}>
                      {subHeading || 'Chuyên chụp ảnh chân dung, phong cảnh'}
                    </div>
                  </div>
                )}

                {/* Description Preview */}
                {(fontEditMode === 'description' || fontEditMode === 'all' || (fontEditMode === 'sync' && syncDesc)) && (
                  <div style={{ background: 'var(--bg)', padding: '16px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--purple)', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      Giới thiệu ngắn: ({descFontName})
                    </div>
                    <div style={{ 
                      fontFamily: `"${descFontName}", sans-serif`, 
                      fontSize: '14px', 
                      color: '#cbd5e1',
                      lineHeight: '1.5'
                    }}>
                      {description || 'Mô tả ngắn về studio/dịch vụ của bạn...'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="ws-sub-heading" className="label">Tiêu đề phụ (Sub-heading)</label>
              <input id="ws-sub-heading" name="sub_heading" type="text" autoComplete="off" placeholder="Ví dụ: Chuyên chụp ảnh chân dung, phong cảnh" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }}
                value={subHeading} onChange={e => { setSubHeading(e.target.value); markDirty(); }} required />
            </div>

            <div>
              <label htmlFor="ws-description" className="label">Giới thiệu ngắn (Description)</label>
              <textarea id="ws-description" name="description" placeholder="Mô tả ngắn về studio/dịch vụ của bạn..." style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', minHeight: '80px', fontFamily: 'inherit' }}
                value={description} onChange={e => { setDescription(e.target.value); markDirty(); }} required />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="label" style={{ margin: 0 }}>📢 Danh sách thông báo trang chủ ({announcements.length})</label>
                <button 
                  type="button" 
                  className="btn secondary" 
                  style={{ padding: '4px 10px', fontSize: '12px', minHeight: 'auto' }}
                  onClick={() => { setAnnouncements(prev => [...prev, '']); markDirty(); }}
                >
                  + Thêm thông báo
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {announcements.map((ann, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <textarea
                        value={ann}
                        placeholder={`Thông báo số ${idx + 1}...`}
                        onChange={e => {
                          const val = e.target.value;
                          setAnnouncements(prev => {
                            const n = [...prev];
                            n[idx] = val;
                            return n;
                          });
                          markDirty();
                        }}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', minHeight: '60px', fontFamily: 'inherit', resize: 'vertical' }}
                        required
                      />
                    </div>
                    {announcements.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setAnnouncements(prev => prev.filter((_, i) => i !== idx));
                          markDirty();
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: '18px', cursor: 'pointer', padding: '10px 4px' }}
                        title="Xoá thông báo này"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'var(--muted)' }}>Các thông báo sẽ tự động xoay tua mỗi 3 giây tại Trang chủ, hỗ trợ vuốt lướt qua lại/lên xuống.</p>
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

          {/* Divider between General and Email Config */}
          <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: 0 }} />

          {/* --- EMAIL CONFIGURATION --- */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div 
              onClick={() => setEmailConfigExpanded(!emailConfigExpanded)}
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                borderBottom: '1px solid var(--line)', 
                paddingBottom: '8px', 
                marginBottom: '4px',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <h3 style={{ margin: 0, color: 'var(--ink)', fontSize: '17px' }}>✉️ Cấu hình Email gửi khách hàng</h3>
              <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 'bold' }}>
                {emailConfigExpanded ? '▲ Thu gọn' : '▼ Mở rộng để thiết lập'}
              </span>
            </div>

            {emailConfigExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.2s ease' }}>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ padding: '6px 14px', fontSize: '13px', minHeight: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); setShowPreviewModal(true); }}
                  >
                    👁️ Xem mail mẫu
                  </button>
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ padding: '6px 14px', fontSize: '13px', minHeight: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--red)', borderColor: 'var(--red)' }}
                    onClick={(e) => { e.stopPropagation(); handleResetEmailTemplate(); }}
                  >
                    🔄 Khôi phục mặc định
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
                  <label htmlFor="ws-email-from-name" className="label">Tên hiển thị người gửi (FROM Name)</label>
                  <input id="ws-email-from-name" name="email_from_name" type="text" placeholder="Ví dụ: HoangKiet" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }}
                    value={emailFromName} onChange={e => { setEmailFromName(e.target.value); markDirty(); }}
                    onFocus={(e) => { lastFocusedInput.current = e.target; }} required />
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

                <div>
                  <label htmlFor="ws-email-footer" className="label">Chữ ký / Chân trang Email (Footer)</label>
                  <textarea id="ws-email-footer" name="email_footer" placeholder="Ví dụ: Đây là email tự động gửi từ hệ thống HoangKiet Photography..." style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', minHeight: '80px', fontFamily: 'inherit', fontSize: '14px', lineHeight: '1.6' }}
                    value={emailFooter} onChange={e => { setEmailFooter(e.target.value); markDirty(); }}
                    onFocus={(e) => { lastFocusedInput.current = e.target; }} required />
                </div>
              </div>
            )}
          </section>

          {/* Divider between Email Config and Portfolio Slides */}
          <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: 0 }} />

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

            {slides.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)', border: '1px dashed var(--line)', borderRadius: '8px' }}>
                Chưa có ảnh nào trong danh sách. Hãy nhấn nút "+ Thêm ảnh" ở trên.
              </div>
            ) : (() => {
              const PAGE_SIZE = 5;
              const totalPages = Math.max(1, Math.ceil(slides.length / PAGE_SIZE));

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div 
                    ref={sliderContainerRef}
                    onMouseDown={handleDragStart}
                    onMouseMove={handleDragMove}
                    onMouseUp={handleDragEnd}
                    onMouseLeave={handleDragEnd}
                    onTouchStart={handleDragStart}
                    onTouchMove={handleDragMove}
                    onTouchEnd={handleDragEnd}
                    style={{
                      overflow: 'hidden',
                      width: '100%',
                      position: 'relative',
                      cursor: isDragging ? 'grabbing' : 'default',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      width: `${totalPages * 100}%`,
                      transform: `translateX(-${((currentPage + dragOffset) / totalPages) * 100}%)`,
                      transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
                    }}>
                      {Array.from({ length: totalPages }).map((_, pageIdx) => {
                        const pageSlides = slides.slice(pageIdx * PAGE_SIZE, (pageIdx + 1) * PAGE_SIZE);
                        return (
                          <div 
                            key={pageIdx} 
                            style={{
                              width: `${100 / totalPages}%`,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '16px',
                              padding: '4px',
                              flexShrink: 0
                            }}
                          >
                            {pageSlides.map((slide, localIdx) => {
                              const globalIdx = pageIdx * PAGE_SIZE + localIdx;
                              return (
                                <SlideEditor
                                  key={globalIdx}
                                  slide={slide}
                                  index={globalIdx}
                                  onChange={handleSlideChange}
                                  onRemove={handleRemoveSlide}
                                />
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                      <button
                        type="button"
                        disabled={currentPage === 0}
                        className="btn secondary"
                        style={{ padding: '6px 14px', minHeight: 'auto', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', opacity: currentPage === 0 ? 0.4 : 1 }}
                        onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                      >
                        ◀ Trang trước
                      </button>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {Array.from({ length: totalPages }).map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              padding: 0,
                              border: 'none',
                              cursor: 'pointer',
                              background: currentPage === i ? 'var(--green-2)' : 'var(--line)',
                              transform: currentPage === i ? 'scale(1.2)' : 'scale(1)',
                              transition: 'all 0.2s'
                            }}
                            onClick={() => setCurrentPage(i)}
                            title={`Trang ${i + 1}`}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        disabled={currentPage === totalPages - 1}
                        className="btn secondary"
                        style={{ padding: '6px 14px', minHeight: 'auto', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', opacity: currentPage === totalPages - 1 ? 0.4 : 1 }}
                        onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                      >
                        Trang sau ▶
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </section>

          {/* --- ACTIONS --- */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--line)', paddingTop: '20px', marginTop: '12px' }}>
            <button 
              type="button" 
              className="btn secondary" 
              disabled={saving || !isDirty} 
              onClick={handleDiscardChanges}
              style={{ padding: '10px 24px', opacity: isDirty ? 1 : 0.5 }}
            >
              Hủy thay đổi hiện tại
            </button>
            <button 
              type="submit" 
              className="btn primary" 
              disabled={saving || !isDirty} 
              style={{ padding: '10px 24px', opacity: isDirty ? 1 : 0.5 }}
            >
              {saving ? 'Đang lưu...' : isDirty ? 'Lưu cấu hình website' : '✓ Đã lưu'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
