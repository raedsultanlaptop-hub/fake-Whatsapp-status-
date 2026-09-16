import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './StatusViewer.css';

interface StatusViewerProps {
  onClose: () => void;
}

export default function StatusViewer({ onClose }: StatusViewerProps) {
  // ⚡ استرجاع البيانات المخبأة في ذاكرة المتصفح لعرض الحالة فوراً بدون شاشة تحميل
  const [currentStatus, setCurrentStatus] = useState<any>(() => {
    const cached = localStorage.getItem('cached_current_status');
    return cached ? JSON.parse(cached) : null;
  });

  const [viewersList, setViewersList] = useState<any[]>(() => {
    const cached = localStorage.getItem('cached_viewers_list');
    return cached ? JSON.parse(cached) : [];
  });

  // إذا كانت هناك بيانات كاش سابقة، سيبدأ العرض فوراً دون انتظار
  const [loading, setLoading] = useState<boolean>(() => !localStorage.getItem('cached_current_status'));
  const [progress, setProgress] = useState(0);
  const [showViewersModal, setShowViewersModal] = useState(false);

  // 1. جلب أحدث البيانات بالخلفية وتحديث الكاش
  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        const { data: statusData } = await supabase
          .from('status')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        if (isMounted && statusData && statusData.length > 0) {
          setCurrentStatus(statusData[0]);
          localStorage.setItem('cached_current_status', JSON.stringify(statusData[0]));
        }

        const { data: viewersData } = await supabase
          .from('viewers')
          .select('*')
          .order('created_at', { ascending: false });

        if (isMounted && viewersData) {
          setViewersList(viewersData);
          localStorage.setItem('cached_viewers_list', JSON.stringify(viewersData));
        }
      } catch (err) {
        console.error('خطأ في جلب البيانات:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. التحكم بشريط التقدم (يتوقف موقتاً إذا كانت نافذة المشاهدين مفتوحة)
  useEffect(() => {
    if (loading || showViewersModal) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          onClose();
          return 100;
        }
        return prev + 1;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [loading, showViewersModal, onClose]);

  if (loading) {
    return <div className="viewer-loading">جاري تحميل الحالة...</div>;
  }

  return (
    <div className="status-viewer-container">
      {/* شريط التقدم */}
      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
      </div>

      <button className="viewer-close-btn" onClick={onClose}>&times;</button>

      {/* عرض صورة ونص الحالة */}
      <div className="status-media-content">
        {currentStatus?.image_url ? (
          <img 
            src={currentStatus.image_url} 
            alt="Status" 
            className="status-bg-image" 
            loading="eager" 
          />
        ) : (
          <div className="status-fallback-bg"></div>
        )}
        {currentStatus?.text && (
          <div className="status-text-overlay">{currentStatus.text}</div>
        )}
      </div>

      {/* الشريط السفلي للمشاهدات */}
      <div className="status-footer-bar" onClick={() => setShowViewersModal(true)}>
        <div className="views-count-badge">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
          </svg>
          <span>{viewersList.length}</span>
        </div>
        <span className="viewers-text-label">التفقد بواسطة المشاهدين</span>
      </div>

      {/* نافذة المشاهدين المنبثقة */}
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
                  <div key={viewer.id || viewer.created_at} className="viewer-item-row">
                    <img 
                      src={viewer.avatar_url || 'https://via.placeholder.com/40'} 
                      alt={viewer.viewer_name} 
                      className="viewer-avatar" 
                      loading="lazy"
                    />
                    <div className="viewer-info">
                      <span className="viewer-name">{viewer.viewer_name}</span>
                      <span className="viewer-time">
                        {viewer.created_at ? new Date(viewer.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
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