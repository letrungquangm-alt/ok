import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import api from './api';
import { createPortal } from 'react-dom';

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
  } else if (fontType === 'upload' && fontUrl) {
    const fontId = `uploaded-font-${nameTrim.replace(/\s+/g, '-').toLowerCase()}`;
    let styleTag = document.getElementById(fontId);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = fontId;
      document.head.appendChild(styleTag);
    }
    let format = 'woff2';
    if (fontUrl.includes('x-font-ttf') || fontUrl.includes('font/ttf')) format = 'truetype';
    else if (fontUrl.includes('font/woff') || fontUrl.includes('application/font-woff')) format = 'woff';
    else if (fontUrl.includes('font/otf') || fontUrl.includes('x-font-opentype')) format = 'opentype';

    styleTag.innerHTML = `
      @font-face {
        font-family: '${nameTrim}';
        src: url('${fontUrl}') format('${format}');
        font-weight: normal;
        font-style: normal;
      }
    `;
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

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const userStr = localStorage.getItem('user');
  const token = localStorage.getItem('token');
  const user = userStr && token ? JSON.parse(userStr) : null;

  const publicPaths = ['/', '/tracuugoianh', '/tracuu', '/cart'];
  const isPublicPath = publicPaths.includes(location.pathname);
  const isClientPage = ['/', '/tracuugoianh', '/tracuu', '/cart', '/my-orders'].includes(location.pathname);

  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);
  const [pendingEmailCount, setPendingEmailCount] = useState(0);
  const [hasClickedPendingPayment, setHasClickedPendingPayment] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [siteLogo, setSiteLogo] = useState('');
  const [brandName, setBrandName] = useState('HoangKiet');

  const [renderIsClientPage, setRenderIsClientPage] = useState(isClientPage);
  const [contentOpacity, setContentOpacity] = useState(1);

  useEffect(() => {
    if (isClientPage !== renderIsClientPage) {
      setContentOpacity(0);
      const timer = setTimeout(() => {
        setRenderIsClientPage(isClientPage);
        setContentOpacity(1);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setContentOpacity(1);
    }
  }, [isClientPage, renderIsClientPage]);

  const [activeLookupCode, setActiveLookupCode] = useState(localStorage.getItem('last_lookup_code') || '');
  const [showAdminConfirm, setShowAdminConfirm] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const updateCartCount = () => {
    try {
      const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
      const count = savedCart.reduce((sum, item) => sum + item.quantity, 0);
      setCartCount(count);
    } catch (e) {
      setCartCount(0);
    }
  };

  useEffect(() => {
    updateCartCount();
    window.addEventListener('storage', updateCartCount);
    window.addEventListener('cart_change', updateCartCount);
    return () => {
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('cart_change', updateCartCount);
    };
  }, [location.pathname]);

  const updateFavicon = (url) => {
    if (!url) return;
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = url;
  };

  useEffect(() => {
    api.get('/web-settings')
      .then(res => {
        if (res.data) {
          if (res.data.site_title) {
            document.title = res.data.site_title;
          }
          if (res.data.site_logo) {
            setSiteLogo(res.data.site_logo);
            updateFavicon(res.data.site_logo);
          }
          if (res.data.brand_name) {
            setBrandName(res.data.brand_name);
          }

          // Load & apply brand font
          const bType = res.data.brand_font_type || 'preset';
          const bName = res.data.brand_font_name || 'Be Vietnam Pro';
          const bUrl = res.data.brand_font_url || '';
          loadFont(bType, bName, bUrl);

          // Load & apply site font
          const sType = res.data.site_font_type || 'preset';
          const sName = res.data.site_font_name || 'Be Vietnam Pro';
          const sUrl = res.data.site_font_url || '';
          loadFont(sType, sName, sUrl);

          // Load & apply subheading font
          const subType = res.data.subheading_font_type || 'preset';
          const subName = res.data.subheading_font_name || 'Be Vietnam Pro';
          const subUrl = res.data.subheading_font_url || '';
          loadFont(subType, subName, subUrl);

          // Load & apply description font
          const descType = res.data.desc_font_type || 'preset';
          const descName = res.data.desc_font_name || 'Be Vietnam Pro';
          const descUrl = res.data.desc_font_url || '';
          loadFont(descType, descName, descUrl);

          // Apply CSS
          updateCustomFontsCSS(bName, sName, subName, descName);
        }
      })
      .catch(err => console.error('Lỗi tải cấu hình website:', err));
  }, []);

  const getBottomNavLinkStyle = (path) => {
    let isActive = false;
    if (path === '/tracuugoianh' || path === '/tracuu') {
      isActive = location.pathname === '/tracuugoianh' || location.pathname === '/tracuu';
    } else {
      isActive = location.pathname === path;
    }
    return {
      padding: '10px 20px',
      borderRadius: '999px',
      fontSize: '13px',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      color: isActive ? '#090b0a' : '#a3b8cc',
      background: isActive ? '#fff' : 'transparent',
      boxShadow: isActive ? '0 4px 12px rgba(255, 255, 255, 0.15)' : 'none',
      display: 'inline-flex',
      alignItems: 'center',
      cursor: 'pointer',
      textDecoration: 'none'
    };
  };

  useEffect(() => {
    const handleLookupChange = () => {
      setActiveLookupCode(localStorage.getItem('last_lookup_code') || '');
    };
    window.addEventListener('lookup_change', handleLookupChange);
    window.addEventListener('storage', handleLookupChange);
    return () => {
      window.removeEventListener('lookup_change', handleLookupChange);
      window.removeEventListener('storage', handleLookupChange);
    };
  }, []);

  if (!user) {
    if (!isPublicPath) {
      return <Navigate to="/" replace />;
    }
  }

  const isCustomer = !user || user.role === 'KHACH' || user.role === 'CUSTOMER';
  const isAdminStaff = user && (user.role === 'ADMIN' || user.role === 'QUANLY' || user.role === 'NHANVIEN');

  const isOrdersActive = location.pathname === '/orders';
  const queryParams = new URLSearchParams(location.search);
  const tab = queryParams.get('tab') || 'pending_email';
  
  const isNewOrdersActive = isOrdersActive && tab === 'pending_email';
  const isPendingPaymentActive = isOrdersActive && tab === 'pending_payment';

  useEffect(() => {
    if (isPendingPaymentActive) {
      setHasClickedPendingPayment(true);
    }
  }, [isPendingPaymentActive]);

  useEffect(() => {
    setIsSidebarOpen(false); // Tự động đóng menu trượt khi chuyển trang
    if (!isCustomer) {
      const controller = new AbortController();
      api.get('/dashboard', { signal: controller.signal })
        .then(res => {
          const newPaymentCount = res.data.pendingPayment || 0;
          const newEmailCount = res.data.pendingEmail || 0;
          
          setPendingPaymentCount(prev => {
            if (newPaymentCount > prev) {
              setHasClickedPendingPayment(false);
            }
            return newPaymentCount;
          });
          
          setPendingEmailCount(newEmailCount);
        })
        .catch(err => {
          if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
            // Bỏ qua lỗi do huỷ request
          }
        });
      return () => controller.abort();
    }
  }, [location.pathname, isCustomer]);

  return (
    <div className={renderIsClientPage ? "client-theme" : "app"} style={renderIsClientPage ? { minHeight: '100vh', display: 'flex', flexDirection: 'row', position: 'relative', background: '#090b0a', color: '#fff' } : {}}>
      {/* Morphing Navbar CSS Styles */}
      <style>{`
        /* Morphing Navbar Container */
        .sidebar-morph {
          position: fixed;
          z-index: 10000;
          transition: top 0.5s cubic-bezier(0.25, 1, 0.5, 1),
                      bottom 0.5s cubic-bezier(0.25, 1, 0.5, 1),
                      left 0.5s cubic-bezier(0.25, 1, 0.5, 1),
                      width 0.5s cubic-bezier(0.25, 1, 0.5, 1),
                      height 0.5s cubic-bezier(0.25, 1, 0.5, 1),
                      transform 0.5s cubic-bezier(0.25, 1, 0.5, 1),
                      border-radius 0.5s cubic-bezier(0.25, 1, 0.5, 1),
                      padding 0.5s cubic-bezier(0.25, 1, 0.5, 1),
                      background 0.5s cubic-bezier(0.25, 1, 0.5, 1),
                      border 0.5s cubic-bezier(0.25, 1, 0.5, 1),
                      box-shadow 0.5s cubic-bezier(0.25, 1, 0.5, 1);
          display: flex;
          overflow: hidden;
          box-sizing: border-box;
        }

        /* Sidebar Mode (Admin Page) */
        .sidebar-morph.sidebar-mode {
          top: 0;
          left: 0;
          height: 100vh;
          width: 248px;
          background: var(--gradient-sidebar);
          color: #f8fafc;
          padding: 28px 20px;
          flex-direction: column;
          border-radius: 0;
          box-shadow: 4px 0 24px rgba(0, 0, 0, 0.05);
          transform: translate(0, 0);
          border: 1px solid transparent;
        }

        /* Capsule Mode (Client Page) */
        .sidebar-morph.capsule-mode {
          top: auto;
          bottom: 24px;
          left: 50%;
          height: 52px;
          transform: translate(-50%, 0);
          background: rgba(9, 11, 10, 0.85);
          -webkit-backdrop-filter: blur(20px);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          padding: 6px;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          width: max-content;
          max-width: 90%;
        }

        /* Brand section morphing */
        .sidebar-morph .brand-section {
          transition: all 0.5s cubic-bezier(0.25, 1, 0.5, 1);
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 32px;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          opacity: 1;
          max-height: 50px;
          width: 100%;
          transform: scale(1);
          overflow: hidden;
          flex-shrink: 0;
        }
        .sidebar-morph.capsule-mode .brand-section {
          opacity: 0;
          width: 0;
          max-height: 0;
          margin: 0;
          padding: 0;
          transform: scale(0.8) translateY(-20px);
          pointer-events: none;
          overflow: hidden;
          flex: 0 0 0;
        }

        .sidebar-morph .brand-mark {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%);
          color: #0f766e;
          font-weight: 900;
          font-size: 18px;
        }

        /* Nav section container */
        .sidebar-morph .nav-section {
          display: flex;
          flex: 1;
          transition: all 0.5s ease;
        }
        .sidebar-morph.sidebar-mode .nav-section {
          flex-direction: column;
        }
        .sidebar-morph.capsule-mode .nav-section {
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        /* Capsule Divider styling */
        .sidebar-morph .capsule-divider {
          width: 1px;
          height: 16px;
          background: rgba(255, 255, 255, 0.15);
          margin: 0 10px;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }
        .sidebar-morph.sidebar-mode .capsule-divider {
          display: none;
        }

        /* Sidebar spacer in admin grid */
        .sidebar-spacer {
          width: 248px;
          height: 100vh;
          flex-shrink: 0;
          display: block;
        }
        @media (max-width: 980px) {
          .sidebar-spacer {
            display: none !important;
          }
        }

        /* Base Nav Item styling and transitions */
        .sidebar-morph .nav-item {
          display: flex;
          align-items: center;
          transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          text-decoration: none;
          cursor: pointer;
          font-family: inherit;
        }

        /* Sidebar Mode Nav Item */
        .sidebar-morph.sidebar-mode .nav-item {
          gap: 12px;
          border-radius: 10px;
          color: #a3b8cc;
          padding: 11px 14px;
          margin: 6px 0;
          font-weight: 500;
          font-size: 14px;
          text-transform: none;
          letter-spacing: normal;
          background: transparent;
          box-shadow: none;
        }
        .sidebar-morph.sidebar-mode .nav-item.active {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 4px 12px rgba(0, 0, 0, 0.15);
          font-weight: 600;
        }
        .sidebar-morph.sidebar-mode .nav-item:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #ffffff;
          transform: translateX(6px);
        }

        /* Capsule Mode Nav Item */
        .sidebar-morph.capsule-mode .nav-item {
          padding: 10px 20px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #a3b8cc;
          background: transparent;
          margin: 0;
          gap: 0;
        }
        .sidebar-morph.capsule-mode .nav-item.active {
          color: #090b0a;
          background: #ffffff;
          box-shadow: 0 4px 12px rgba(255, 255, 255, 0.15);
        }
        .sidebar-morph.capsule-mode .nav-item:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }

        /* Dot animation in Nav Items */
        .sidebar-morph .nav-item .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
          transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .sidebar-morph.sidebar-mode .nav-item .dot {
          width: 8px;
          height: 8px;
          margin-right: 12px;
          opacity: 1;
          transform: scale(1);
        }
        .sidebar-morph.capsule-mode .nav-item.active .dot {
          background: #090b0a !important;
        }
        .sidebar-morph.capsule-mode .nav-item .dot {
          width: 0;
          height: 0;
          margin-right: 0;
          opacity: 0;
          transform: scale(0);
        }

        /* Admin only links collapsing */
        .sidebar-morph .admin-only-links {
          transition: all 0.6s cubic-bezier(0.25, 1, 0.5, 1);
          overflow: hidden;
          width: 100%;
        }
        .sidebar-morph.capsule-mode .admin-only-links {
          max-height: 0;
          opacity: 0;
          margin: 0;
          padding: 0;
          pointer-events: none;
          width: 0;
          flex: 0 0 0;
          overflow: hidden;
        }
        .sidebar-morph.sidebar-mode .admin-only-links {
          max-height: 800px;
          opacity: 1;
        }

        /* Capsule extra actions block */
        .sidebar-morph .capsule-extra-links {
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.5s ease;
        }
        .sidebar-morph.sidebar-mode .capsule-extra-links {
          max-width: 0;
          opacity: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .sidebar-morph.capsule-mode .capsule-extra-links {
          max-width: 300px;
          opacity: 1;
        }

        .sidebar-morph .btn-capsule-admin {
          padding: 10px 20px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: all 0.3s ease;
          color: var(--copper);
          border: 1px solid rgba(182, 106, 44, 0.3);
          background: rgba(182, 106, 44, 0.1);
          margin-left: 4px;
          text-decoration: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
        }
        .sidebar-morph .btn-capsule-admin:hover {
          background: var(--copper);
          color: #fff;
        }

        .sidebar-morph .btn-capsule-logout {
          background: none;
          border: none;
          padding: 10px 20px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #ef4444;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
          display: inline-flex;
          align-items: center;
        }
        .sidebar-morph .btn-capsule-logout:hover {
          background: rgba(239, 68, 68, 0.1);
        }

        /* Dark overrides for client components */
        .client-theme {
          --bg: #090b0a;
          --paper: #121614;
          --ink: #f8fafc;
          --muted: #94a3b8;
          --line: #1c221e;
          --shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          --shadow-hover: 0 15px 40px rgba(0, 0, 0, 0.7);
        }
        .client-theme input, .client-theme select, .client-theme textarea {
          background: #181d1a !important;
          border: 1px solid #2a332d !important;
          color: #fff !important;
        }
        .client-theme th {
          background: #181d1a !important;
          color: #94a3b8 !important;
          border-bottom: 2px solid #2a332d !important;
        }
        .client-theme td {
          border-bottom: 1px solid #1c221e !important;
        }
        .client-theme tr:hover td {
          background: #141916 !important;
        }
        .client-theme .btn.ghost {
          border-color: #2a332d !important;
          color: #cbd5e1 !important;
          background: rgba(255,255,255,0.02) !important;
        }
        .client-theme .btn.ghost:hover {
          background: rgba(255,255,255,0.08) !important;
          border-color: #445449 !important;
        }
        .client-theme .spinner {
          border-left-color: var(--copper) !important;
        }

        /* Mobile responsive adjustments */
        @media (max-width: 980px) {
          .sidebar-morph {
            /* On mobile, disable position layout size transitions to prevent diagonal flight! */
            transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease-out, background 0.3s ease-out;
          }
          .sidebar-morph.sidebar-mode {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            width: 280px;
            z-index: 10001;
            transform: translateX(-100%);
          }
          .sidebar-morph.sidebar-mode.open {
            transform: translate(0, 0);
          }
        }
        @media (max-width: 768px) {
          .sidebar-morph.capsule-mode {
            max-width: 95%;
            top: auto;
            bottom: 16px;
            left: 50%;
            transform: translate(-50%, 0);
            padding: 4px;
          }
          .sidebar-morph.capsule-mode .nav-item,
          .sidebar-morph.capsule-mode .btn-capsule-admin,
          .sidebar-morph.capsule-mode .btn-capsule-logout {
            padding: 8px 10px !important;
            font-size: 11px !important;
            margin: 0 !important;
            letter-spacing: 0px !important;
          }
        }
      `}</style>

      {/* Admin confirm modal portal */}
      {showAdminConfirm && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div className="panel page-transition" style={{ width: '100%', maxWidth: '400px', padding: '24px', background: isClientPage ? '#121614' : '#fff', border: isClientPage ? '1px solid #1c221e' : '1px solid var(--line)', textAlign: 'center', borderRadius: '10px', boxShadow: 'var(--shadow)' }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🔑</span>
            <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 24px 0', color: isClientPage ? '#fff' : 'var(--ink)', lineHeight: '1.5' }}>
              Đây là mục dành cho Admin, bạn có phải là Admin không?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn" 
                style={{ flex: 1, background: isClientPage ? '#1c221e' : 'var(--line)', border: isClientPage ? '1px solid #2a332d' : 'none', color: isClientPage ? '#cbd5e1' : 'var(--ink)' }} 
                onClick={() => { setShowAdminConfirm(false); }}
              >
                Không
              </button>
              <button 
                type="button" 
                className="btn primary" 
                style={{ flex: 1, background: 'var(--copper)', color: '#fff' }} 
                onClick={() => { setShowAdminConfirm(false); navigate('/toicandangnhapwebhoangkiet'); }}
              >
                Có
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Unified Morphing Navbar */}
      <aside className={`sidebar-morph ${isClientPage ? 'capsule-mode' : 'sidebar-mode'} ${isClientPage ? (isAdminStaff ? 'has-admin' : (user ? 'has-logout' : 'guest')) : ''} ${isSidebarOpen ? 'open' : ''}`}>
        <div className="brand brand-section" onClick={() => navigate('/')} style={{ cursor: 'pointer' }} title="Về trang chủ">
          {siteLogo ? (
            <img src={siteLogo} alt="Logo" className="brand-mark" style={{ width: '24px', height: '24px', objectFit: 'contain', borderRadius: '4px' }} />
          ) : (
            <span className="brand-mark">📸</span>
          )}
          <span className="brand-text">{brandName || 'HoangKiet'}</span>
        </div>
        
        <div className="nav nav-section">
          {/* TRANG CHỦ */}
          <Link 
            to="/" 
            className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
          >
            <span className="dot" style={{background: 'var(--copper)'}}></span>
            <span>Trang chủ</span>
          </Link>

          {/* TRA CỨU */}
          <Link 
            to={activeLookupCode ? "/tracuu" : "/tracuugoianh"} 
            className={`nav-item ${(location.pathname === '/tracuugoianh' || location.pathname === '/tracuu') ? 'active' : ''}`}
          >
            <span className="dot" style={{background: 'var(--blue)'}}></span>
            <span>Tra cứu</span>
          </Link>

          {/* CAPSULE DIVIDER (Only visible in capsule mode when logged in) */}
          {isClientPage && user && (
            <div className="capsule-divider"></div>
          )}

          {/* ADMIN ONLY LINKS (Collapsed in capsule mode) */}
          <div className="admin-only-links">
            {!isCustomer && (
              <>
                <div className="nav-title">Vận hành</div>
                <Link to="/dashboard" className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}><span className="dot"></span><span>Tổng quan</span></Link>
                {user && (user.role === 'ADMIN' || user.role === 'QUANLY') && (
                  <Link to="/web-settings" className={`nav-item ${location.pathname === '/web-settings' ? 'active' : ''}`}>
                    <span className="dot" style={{ background: 'var(--copper)' }}></span>
                    <span>Điều hành web</span>
                  </Link>
                )}
              </>
            )}
            
            {user && (user.role === 'ADMIN' || user.role === 'QUANLY' || user.role === 'NHANVIEN') && !isCustomer && (
              <>
                <div className="nav-title">Danh mục</div>
                <Link to="/orders?tab=pending_email" className={`nav-item ${isNewOrdersActive ? 'active' : ''}`} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="dot" style={{background: 'var(--blue)'}}></span>
                    <span>Đơn mới</span>
                  </div>
                  {pendingEmailCount > 0 && <span style={{ background: 'var(--red)', color: '#fff', padding: '2px 6px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>{pendingEmailCount}</span>}
                </Link>
                <Link to="/orders?tab=pending_payment" className={`nav-item ${isPendingPaymentActive ? 'active' : ''}`} style={{ display: 'flex', justifyContent: 'space-between' }} onClick={() => setHasClickedPendingPayment(true)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="dot" style={{background: '#7c3aed'}}></span>
                    <span>Chờ khách thanh toán</span>
                  </div>
                  {pendingPaymentCount > 0 && !hasClickedPendingPayment && <span style={{ background: 'var(--red)', color: '#fff', padding: '2px 6px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>{pendingPaymentCount}</span>}
                </Link>
                <Link to="/orders-history" className={`nav-item ${location.pathname === '/orders-history' ? 'active' : ''}`} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="dot" style={{background: 'var(--gold)'}}></span>
                    <span>Lịch sử đơn hàng</span>
                  </div>
                </Link>
                <Link to="/customers" className={`nav-item ${location.pathname === '/customers' ? 'active' : ''}`}><span className="dot"></span><span>Khách hàng</span></Link>
                <Link to="/emails" className={`nav-item ${location.pathname === '/emails' ? 'active' : ''}`}><span className="dot" style={{background: '#10b981'}}></span><span>Mail đã gửi</span></Link>
              </>
            )}
          </div>
          
          {/* CAPSULE CONTROL LINKS (Only visible in capsule mode) */}
          {isClientPage && (
            <div className="capsule-extra-links">
              {/* QUẢN TRỊ / DASHBOARD */}
              {user && (user.role === 'ADMIN' || user.role === 'QUANLY' || user.role === 'NHANVIEN') && (
                <Link to="/dashboard" className="btn-capsule-admin">
                  Quản trị
                </Link>
              )}

              {/* ĐĂNG XUẤT / THOÁT */}
              {user && (
                <button 
                  onClick={() => {
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    navigate('/');
                  }}
                  className="btn-capsule-logout"
                >
                  Thoát
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      <div 
        className="sidebar-spacer" 
        style={{
          width: renderIsClientPage ? '0' : '248px',
          height: renderIsClientPage ? '0' : '100vh',
          transition: 'width 0.5s cubic-bezier(0.25, 1, 0.5, 1), height 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
          overflow: 'hidden'
        }}
      ></div>

      {/* Main Content Area */}
      <main 
        className={renderIsClientPage ? "client-main" : "main"} 
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          opacity: contentOpacity,
          transition: 'opacity 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
        }}
      >
        {renderIsClientPage ? (
          /* Minimal Header */
          <header style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '24px 40px',
            maxWidth: '1200px',
            width: '100%',
            margin: '0 auto',
            zIndex: 100
          }}>
            <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '20px', fontWeight: '800' }} title="Về trang chủ">
              <span className="brand-mark" style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                display: 'grid',
                placeItems: 'center',
                background: 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)',
                color: '#0f766e',
                fontWeight: '900',
                fontSize: '18px'
              }}>📸</span>
              <span style={{ color: '#fff' }}>HoangKiet</span>
            </div>
            
            {user ? (
              <div className="user" onClick={() => navigate('/profile')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', color: '#cbd5e1', padding: '6px 12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)' }} title="Tài khoản của tôi">
                <span>{user.fullName}</span>
                {user.avatar ? (
                  <img src={user.avatar} alt="avatar" className="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <span className="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 'bold' }}>{user.fullName?.charAt(0).toUpperCase()}</span>
                )}
              </div>
            ) : null}
          </header>
        ) : (
          /* Admin Topbar Header */
          <header className="topbar">
            <button className="menu-toggle" onClick={() => setIsSidebarOpen(true)}>☰</button>
            <div></div>
            {user ? (
              <div className="user" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }} title="Tài khoản của tôi">
                <span>{user.fullName}</span>
                {user.avatar ? (
                  <img src={user.avatar} alt="avatar" className="avatar" style={{ objectFit: 'cover' }} />
                ) : (
                  <span className="avatar">{user.fullName?.charAt(0).toUpperCase()}</span>
                )}
              </div>
            ) : (
              <div className="user" onClick={() => setShowAdminConfirm(true)} style={{ cursor: 'pointer' }} title="Đăng nhập Admin">
                <span className="avatar" style={{ display: 'grid', placeItems: 'center' }}>🔑</span>
              </div>
            )}
          </header>
        )}

        {/* Content Area */}
        <div 
          className="page-transition-wrapper"
          style={renderIsClientPage ? { 
            flex: 1, 
            padding: '20px 40px 120px 40px', 
            maxWidth: '1200px', 
            width: '100%', 
            margin: '0 auto' 
          } : {
            flex: 1,
            padding: '0',
            width: '100%'
          }}
        >
          <div key={location.pathname} className="page-transition">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}