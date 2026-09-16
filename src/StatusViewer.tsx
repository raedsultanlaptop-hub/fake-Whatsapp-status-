import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './StatusViewer.css';

interface StatusViewerProps {
  onClose: () => void;
}

export default function StatusViewer({ onClose }: StatusViewerProps) {
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState<any>(null);
  const [viewersList, setViewersList] = useState<any[]>([]);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // جلب أحدث حالة ومشاهدين من Supabase عند الفتح
  useEffect(() => {
    async function fetchData() {
      try {
        // 1. جلب أحدث حالة من جدول status
        const { data: statusData } = await supabase
          .from('status')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        if (statusData && statusData.length > 0) {
          setCurrentStatus(statusData[0]);
        }

        // 2. جلب المشاهدين من جدول viewers
        const { data: viewersData } = await supabase
          .from('viewers')
          .select('*')
          .order('created_at', { ascending: false });

        if (viewersData) {
          setViewersList(viewersData);
        }
      } catch (err) {
        console.error('خطأ في جلب البيانات:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // شريط التقدم العلوي (يعد لمدة 5 ثوانٍ مثلاً ثم يغلق أو ينتقل)
  useEffect(() => {
    if (loading) return;
    
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          onClose(); // إغلاق الصفحة عند انتهاء الشريط
          return 100;
        }
        return prev + 1; // زيادة التدريج
      }, 50); // 50ms * 100 = 5 ثوانٍ تقريباً
    }, 50);

    return () => clearInterval(interval);
  }, [loading, onClose]);

  if (loading) {
    return <div className="viewer-loading">جاري تحميل الحالة...</div>;
  }

  return (
    <div className="status-viewer-container">
      {/* شريط التقدم العلوي */}
      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
      </div>

      {/* زر الإغلاق أو الرجوع */}
      <button className="viewer-close-btn" onClick={onClose}>&times;</button>

      {/* محتوى الحالة (صورة الخلفية والنص) */}
      <div className="status-media-content">
        {currentStatus?.image_url ? (
          <img src={currentStatus.image_url} alt="Status" className="status-bg-image" />
        ) : (
          <div className="status-fallback-bg"></div>
        )}
        {currentStatus?.text && (
          <div className="status-text-overlay">{currentStatus.text}</div>
        )}
      </div>

      {/* الشريط السفلي: أيقونة العين وعدد المشاهدات */}
      <div className="status-footer-bar" onClick={() => setShowViewersModal(true)}>
        <div className="views-count-badge">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
          </svg>
          <span>{viewersList.length}</span>
        </div>
        <span className="viewers-text-label">التفقد بواسطة المشاهدين</span>
      </div>

      {/* نافذة منبثقة (Modal) لقائمة المشاهدين مع السكرول مثل واتساب */}
      {showViewersModal && (
        <div className="viewers-modal-backdrop" onClick={() => setShowViewersModal(false)}>
          <div className="viewers-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-line"></div>
            <h3>المشاهدون ({viewersList.length})</h3>
            
            <div className="viewers-scroll-list">
              {viewersList.length === 0 ? (
                <p className="no-viewers">لا يوجد مشاهدين حتى الآن</p>
              ) : (
                viewersList.map((viewer) => (
                  <div key={viewer.id} className="viewer-item-row">
                    <img 
                      src={viewer.avatar_url || 'https://via.placeholder.com/40'} 
                      alt={viewer.viewer_name} 
                      className="viewer-avatar" 
                    />
                    <div className="viewer-info">
                      <span className="viewer-name">{viewer.viewer_name}</span>
                      <span className="viewer-time">
                        {new Date(viewer.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}