import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';

const DEFAULT_SLIDES = [
  {
    title: 'ẢNH CHÂN DUNG',
    desc: 'Lưu giữ những khoảnh khắc chân thực, thần thái tự nhiên và sắc nét nhất của bạn.',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'
  },
  {
    title: 'ẢNH PHONG CẢNH',
    desc: 'Bản hòa ca của ánh sáng và thiên nhiên hùng vĩ qua góc nhìn nghệ thuật đặc trưng.',
    image: 'https://images.unsplash.com/photo-1472214222541-d510753a49f8?auto=format&fit=crop&w=800&q=80'
  },
  {
    title: 'ẢNH KỶ YẾU',
    desc: 'Gói trọn thanh xuân và những nụ cười rực rỡ nhất dưới mái trường thân yêu.',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80'
  },
  {
    title: 'ẢNH ĐÁM CƯỚI',
    desc: 'Ghi dấu câu chuyện tình yêu ngọt ngào, khoảnh khắc thiêng liêng trong ngày trọng đại.',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80'
  },
  {
    title: 'ẢNH ĐƯỜNG PHỐ',
    desc: 'Hơi thở cuộc sống thường nhật, góc phố quen thuộc qua lăng kính đầy chất thơ.',
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80'
  },
  {
    title: 'ẢNH NGHỆ THUẬT',
    desc: 'Sáng tạo không giới hạn với những góc máy độc lạ và ý tưởng nghệ thuật phá cách.',
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80'
  },
  {
    title: 'ẢNH SỰ KIỆN',
    desc: 'Bắt trọn không khí sôi động, chuyên nghiệp và đầy cảm xúc của mọi sự kiện.',
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80'
  },
  {
    title: 'ẢNH GIA ĐÌNH',
    desc: 'Lưu giữ khoảnh khắc sum vầy ấm áp, gắn kết tình thân gia đình qua năm tháng.',
    image: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=800&q=80'
  },
  {
    title: 'ẢNH DÃ NGOẠI',
    desc: 'Hành trình khám phá những vùng đất mới, lưu lại dấu chân tự do và phóng khoáng.',
    image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'
  },
  {
    title: 'ẢNH PHÒNG CHỤP',
    desc: 'Chuyên nghiệp trong từng set ánh sáng, làm nổi bật phong thái cá nhân tối đa.',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80'
  }
];

export default function HomePage() {
  const [slides, setSlides] = useState(DEFAULT_SLIDES);
  const [displayName, setDisplayName] = useState('Kiet Hoang Photography');
  const [subHeading, setSubHeading] = useState('Chuyên chụp ảnh chân dung, phong cảnh, kỷ yếu');
  const [description, setDescription] = useState('Chào mừng bạn đã đến với Website của Kiet Hoang Photography! Nơi lưu giữ những khung hình cảm xúc, chất lượng hình ảnh nghệ thuật đỉnh cao và chuyên nghiệp nhất.');
  const [announcements, setAnnouncements] = useState([]);
  const [annIndex, setAnnIndex] = useState(0);
  const startAnnX = useRef(0);
  const startAnnY = useRef(0);
  const [phone, setPhone] = useState('0703.01.2959');
  const [facetime, setFacetime] = useState('0703.01.2959 (Audio Only)');
  
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const startX = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    api.get('/web-settings', { signal: controller.signal })
      .then(res => {
        if (res.data) {
          if (res.data.slides && Array.isArray(res.data.slides) && res.data.slides.length > 0) {
            setSlides(res.data.slides);
          }
          if (res.data.display_name) setDisplayName(res.data.display_name);
          if (res.data.sub_heading) setSubHeading(res.data.sub_heading);
          if (res.data.description) setDescription(res.data.description);
          if (res.data.announcement) {
            try {
              const parsed = JSON.parse(res.data.announcement);
              if (Array.isArray(parsed)) {
                setAnnouncements(parsed.filter(str => str && str.trim() !== ''));
              } else {
                setAnnouncements([res.data.announcement]);
              }
            } catch (e) {
              setAnnouncements([res.data.announcement]);
            }
          }
          if (res.data.phone) setPhone(res.data.phone);
          if (res.data.facetime) setFacetime(res.data.facetime);
        }
      })
      .catch(err => {
        if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
          console.error('Lỗi tải cấu hình website:', err);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isHovered || isDraggingState || slides.length === 0) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 6000); // 6s autoplay
    return () => clearInterval(timer);
  }, [current, isHovered, isDraggingState, slides.length]);

  // Autoplay announcements every 3 seconds
  useEffect(() => {
    if (announcements.length <= 1) return;
    const timer = setInterval(() => {
      setAnnIndex(prev => (prev === announcements.length - 1 ? 0 : prev + 1));
    }, 3000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  // Announcement Swipe Gestures
  const handleAnnTouchStart = (e) => {
    startAnnX.current = e.touches[0].clientX;
    startAnnY.current = e.touches[0].clientY;
  };

  const handleAnnTouchEnd = (e) => {
    if (announcements.length <= 1) return;
    const diffX = e.changedTouches[0].clientX - startAnnX.current;
    const diffY = e.changedTouches[0].clientY - startAnnY.current;
    const threshold = 40;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > threshold) {
        if (diffX > 0) {
          setAnnIndex(prev => (prev === 0 ? announcements.length - 1 : prev - 1));
        } else {
          setAnnIndex(prev => (prev === announcements.length - 1 ? 0 : prev + 1));
        }
      }
    } else {
      if (Math.abs(diffY) > threshold) {
        if (diffY > 0) {
          setAnnIndex(prev => (prev === 0 ? announcements.length - 1 : prev - 1));
        } else {
          setAnnIndex(prev => (prev === announcements.length - 1 ? 0 : prev + 1));
        }
      }
    }
  };

  const handleAnnMouseDown = (e) => {
    startAnnX.current = e.clientX;
    startAnnY.current = e.clientY;
  };

  const handleAnnMouseUp = (e) => {
    if (announcements.length <= 1) return;
    const diffX = e.clientX - startAnnX.current;
    const diffY = e.clientY - startAnnY.current;
    const threshold = 40;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > threshold) {
        if (diffX > 0) {
          setAnnIndex(prev => (prev === 0 ? announcements.length - 1 : prev - 1));
        } else {
          setAnnIndex(prev => (prev === announcements.length - 1 ? 0 : prev + 1));
        }
      }
    } else {
      if (Math.abs(diffY) > threshold) {
        if (diffY > 0) {
          setAnnIndex(prev => (prev === 0 ? announcements.length - 1 : prev - 1));
        } else {
          setAnnIndex(prev => (prev === announcements.length - 1 ? 0 : prev + 1));
        }
      }
    }
  };

  const handleNext = () => {
    if (slides.length === 0) return;
    setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const handlePrev = () => {
    if (slides.length === 0) return;
    setCurrent((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const getSlideIndex = (offset) => {
    if (slides.length === 0) return 0;
    const idx = (current + offset) % slides.length;
    return idx < 0 ? idx + slides.length : idx;
  };

  const getOffset = (i) => {
    if (slides.length === 0) return 0;
    let diff = i - current;
    const len = slides.length;
    if (diff < -len / 2) diff += len;
    if (diff > len / 2) diff -= len;
    return diff;
  };

  const handleDragStart = (e) => {
    setIsDraggingState(true);
    startX.current = e.touches ? e.touches[0].clientX : e.clientX;
  };

  const handleDragEnd = (e) => {
    if (!isDraggingState) return;
    const endX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const diff = endX - startX.current;

    if (diff > 55) {
      handlePrev();
    } else if (diff < -55) {
      handleNext();
    }
    setIsDraggingState(false);
  };

  return (
    <div style={{
      minHeight: '85vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '12px' : '20px 0',
      background: '#090b0a',
      color: '#fff',
      borderRadius: '20px',
      overflow: 'hidden',
      border: '1px solid #1c221e'
    }}>
      <div className="portfolio-container" style={{
        width: '100%',
        maxWidth: '1200px',
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: isMobile ? '24px' : '40px',
        padding: isMobile ? '0 16px' : '0 40px',
        alignItems: 'center'
      }}>
        {/* LEFT: SLIDER */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
          <div className="slider-wrapper" 
            onMouseEnter={() => setIsHovered(true)} 
            onMouseLeave={(e) => { setIsHovered(false); handleDragEnd(e); }}
            onTouchStart={handleDragStart}
            onTouchEnd={handleDragEnd}
            onMouseDown={handleDragStart}
            onMouseUp={handleDragEnd}
            style={{
              position: 'relative',
              width: '100%',
              height: isMobile ? '320px' : '420px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              cursor: isDraggingState ? 'grabbing' : 'grab',
              userSelect: 'none'
            }}>
            {/* Prev arrow */}
            <button 
              onClick={handlePrev} 
              style={{
                position: 'absolute',
                left: '20px',
                zIndex: 10,
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#fff',
                fontSize: '18px',
                cursor: 'pointer',
                display: isMobile ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)'
              }}
              onMouseEnter={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.25)'; }}
              onMouseLeave={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.1)'; }}
            >
              ←
            </button>

            {slides.map((slide, i) => {
              const offset = getOffset(i);
              const isActive = offset === 0;
              const isVisible = Math.abs(offset) <= 1;

              if (!isVisible) return null;

              return (
                <div 
                  key={i}
                  className={isActive ? "slide-active" : "slide-preview"}
                  style={{
                    position: 'absolute',
                    width: isActive ? (isMobile ? '82%' : '60%') : (isMobile ? '70%' : '50%'),
                    height: isActive ? (isMobile ? '300px' : '400px') : (isMobile ? '250px' : '340px'),
                    borderRadius: '16px',
                    overflow: 'hidden',
                    zIndex: isActive ? 5 : 1,
                    opacity: isActive ? 1 : 0.2,
                    filter: isActive ? 'none' : 'blur(2px)',
                    transform: `translate(-50%, -50%) translateX(${offset * (isMobile ? 120 : 260)}px) scale(${isActive ? 1 : 0.82})`,
                    left: '50%',
                    top: '50%',
                    boxShadow: isActive ? '0 20px 40px rgba(0,0,0,0.5)' : 'none',
                    border: isActive ? '2px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(255, 255, 255, 0.05)',
                    transition: 'all 0.85s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    pointerEvents: isActive ? 'auto' : 'none'
                  }}
                >
                  <img 
                    src={slide.image} 
                    alt={slide.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    draggable="false"
                  />
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                      padding: isMobile ? '16px 12px' : '24px 20px',
                      textAlign: 'left'
                    }}>
                      <span style={{ fontSize: isMobile ? '10px' : '11px', fontWeight: 'bold', letterSpacing: '2px', color: 'var(--copper)' }}>{slide.title}</span>
                      <p style={{ margin: '4px 0 0 0', fontSize: isMobile ? '12.5px' : '13.5px', color: '#e2e8f0', lineHeight: '1.4' }}>{slide.desc}</p>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Next arrow */}
            <button 
              onClick={handleNext} 
              style={{
                position: 'absolute',
                right: '20px',
                zIndex: 10,
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#fff',
                fontSize: '18px',
                cursor: 'pointer',
                display: isMobile ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)'
              }}
              onMouseEnter={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.25)'; }}
              onMouseLeave={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.1)'; }}
            >
              →
            </button>
          </div>
          
          {/* Indicators */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {slides.map((_, i) => (
              <span 
                key={i} 
                onClick={() => setCurrent(i)}
                style={{
                  width: i === current ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: i === current ? 'var(--copper)' : 'rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>
        </div>

        {/* RIGHT: PORTFOLIO INFO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '24px', textAlign: 'left' }}>
          <div>
            <h1 style={{ 
              margin: '0 0 8px 0', 
              fontSize: isMobile ? '26px' : '36px', 
              fontWeight: '900', 
              letterSpacing: '-1px',
              background: 'linear-gradient(to right, #ffffff, #b66a2c)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {displayName}
            </h1>
            <p className="custom-subheading-font" style={{ margin: 0, fontSize: isMobile ? '15px' : '18px', color: 'var(--copper)', fontWeight: '600' }}>
              {subHeading}
            </p>
          </div>

          <p className="custom-desc-font" style={{ margin: 0, fontSize: '15px', color: '#cbd5e1', lineHeight: '1.6' }}>
            {description}
          </p>

          {/* Announcement Slider Block */}
          {announcements.length > 0 && (
            <div 
              onTouchStart={handleAnnTouchStart}
              onTouchEnd={handleAnnTouchEnd}
              onMouseDown={handleAnnMouseDown}
              onMouseUp={handleAnnMouseUp}
              style={{ 
                background: 'rgba(182, 106, 44, 0.1)', 
                borderLeft: '4px solid var(--copper)', 
                padding: '16px 20px', 
                borderRadius: '0 12px 12px 0',
                marginTop: '8px',
                position: 'relative',
                cursor: announcements.length > 1 ? 'grab' : 'default',
                userSelect: 'none',
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <h4 style={{ margin: 0, color: 'var(--copper)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  📢 Thông báo
                </h4>
                {announcements.length > 1 && (
                  <span style={{ fontSize: '11px', color: 'var(--copper)', opacity: 0.8 }}>
                    {annIndex + 1} / {announcements.length}
                  </span>
                )}
              </div>

              {/* Announcements viewport with dynamic height */}
              <div style={{ minHeight: '40px', position: 'relative' }}>
                {announcements.map((ann, idx) => (
                  <p 
                    key={idx} 
                    style={{ 
                      margin: 0, 
                      fontSize: '13.5px', 
                      color: '#e2e8f0', 
                      lineHeight: '1.5', 
                      whiteSpace: 'pre-wrap',
                      position: idx === annIndex ? 'relative' : 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      opacity: idx === annIndex ? 1 : 0,
                      transform: idx === annIndex ? 'translateX(0)' : idx < annIndex ? 'translateX(-20px)' : 'translateX(20px)',
                      transition: 'all 0.4s ease',
                      pointerEvents: idx === annIndex ? 'auto' : 'none'
                    }}
                  >
                    {ann}
                  </p>
                ))}
              </div>

              {/* Pagination indicators (Dots) */}
              {announcements.length > 1 && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '10px', justifyContent: 'center' }}>
                  {announcements.map((_, i) => (
                    <span 
                      key={i} 
                      onClick={(e) => { e.stopPropagation(); setAnnIndex(i); }}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: i === annIndex ? 'var(--copper)' : 'rgba(255,255,255,0.2)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Contact Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13.5px', color: '#94a3b8', borderTop: '1px solid #1c221e', paddingTop: '16px' }}>
            {phone && <div>📞 Điện thoại / Zalo: <strong style={{ color: '#fff' }}>{phone}</strong></div>}
            {facetime && <div>✉ FaceTime: <strong style={{ color: '#fff' }}>{facetime}</strong></div>}
          </div>

          <div>
            <button 
              className="btn" 
              style={{ background: 'var(--copper)', color: '#fff', border: 'none', padding: '12px 28px', fontSize: '14.5px', fontWeight: 'bold', cursor: 'pointer' }}
              onClick={() => navigate('/tracuugoianh')}
            >
              🔍 Tra cứu gói ảnh của bạn
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .slide-active {
          transition: all 0.85s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        }
        .slide-active:hover {
          transform: translate(-50%, -52%) scale(1.03) !important;
          box-shadow: 0 25px 50px rgba(182, 106, 44, 0.35) !important;
          border-color: rgba(182, 106, 44, 0.5) !important;
        }
        .slide-active img {
          transition: transform 1.2s cubic-bezier(0.25, 1, 0.5, 1) !important;
        }
        .slide-active:hover img {
          transform: scale(1.06);
        }
        @media (min-width: 860px) {
          .portfolio-container {
            grid-template-columns: 1.1fr 0.9fr;
          }
        }
      `}</style>
    </div>
  );
}
