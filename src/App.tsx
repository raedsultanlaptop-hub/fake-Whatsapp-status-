import React, { useState, useEffect } from 'react';
import './App.css';
import backgroundImage from './assets/background.jpeg'; 
import { supabase } from './supabaseClient';
import StatusViewer from './StatusViewer';
import cameraIconPath from './assets/camera.jpeg';

// ==========================================
// 🛠️ أداة ضغط الصور (تحافظ على الدقة وتقلل الحجم)
// ==========================================
const compressImage = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // الحفاظ على أبعاد عالية الدقة للقصص (HD)
        const MAX_WIDTH = 1080;
        const MAX_HEIGHT = 1920;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        } else if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // تحويل الصورة إلى WebP بحجم خفيف جداً وجودة 80%
        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], `compressed_${Date.now()}.webp`, {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            resolve(newFile);
          } else {
            resolve(file); // في حال فشل الضغط، يتم رفع الصورة الأصلية
          }
        }, 'image/webp', 0.8); 
      };
    };
    reader.onerror = (error) => reject(error);
  });
};

// -------------------------------------------------
// 1. صفحة "قائمة حالتي" (My Status Page)
// -------------------------------------------------
interface MyStatusPageProps {
  onClose: () => void;
  viewersCount: number;
  latestStatusImage: string;
  refreshData: () => void; // تحديث البيانات بعد الرفع
}

const MyStatusPage: React.FC<MyStatusPageProps> = ({ onClose, viewersCount, latestStatusImage, refreshData }) => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [showViewerModal, setShowViewerModal] = useState<boolean>(false);
  const [viewerName, setViewerName] = useState<string>('');
  const [viewerFile, setViewerFile] = useState<File | null>(null);
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('');
  const [statusFile, setStatusFile] = useState<File | null>(null);
  const [isViewingStatus, setIsViewingStatus] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const uploadImageToStorage = async (file: File): Promise<string | null> => {
    try {
      // 🚀 ضغط الصورة قبل الرفع
      const compressedFile = await compressImage(file);
      const cleanFileName = `img_${Date.now()}_${Math.floor(Math.random() * 100000)}.webp`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(cleanFileName, compressedFile);

      if (uploadError) {
        alert("خطأ في السيرفر أثناء الرفع: " + uploadError.message);
        return null;
      }

      const { data } = supabase.storage.from('images').getPublicUrl(cleanFileName);
      return data.publicUrl;
    } catch (err: any) {
      alert("حدث خطأ غير متوقع: " + err.message);
      return null;
    }
  };

  const handleSaveViewer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewerName || !viewerFile) return alert("الرجاء إدخال اسم المشاهد واختيار صورة.");

    setLoading(true);
    const publicUrl = await uploadImageToStorage(viewerFile);
    if (!publicUrl) return setLoading(false);

    const { error } = await supabase.from('viewers').insert([{ viewer_name: viewerName, avatar_url: publicUrl }]);
    
    setLoading(false);
    if (error) alert("فشل حفظ المشاهد: " + error.message);
    else {
      alert("تمت إضافة المشاهد بنجاح!");
      setShowViewerModal(false);
      setViewerName('');
      setViewerFile(null);
      refreshData();
    }
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusFile) return alert("الرجاء اختيار صورة للقصة.");

    setLoading(true);
    const publicUrl = await uploadImageToStorage(statusFile);
    if (!publicUrl) return setLoading(false);

    const { error } = await supabase.from('status').insert([{ image_url: publicUrl, text: statusText }]);

    setLoading(false);
    if (error) alert("فشل نشر القصة: " + error.message);
    else {
      alert("تم نشر القصة بنجاح!");
      setShowStatusModal(false);
      setStatusText('');
      setStatusFile(null);
      refreshData();
    }
  };

  const handleDeleteStory = async () => {
    const { error } = await supabase.from('status').delete().neq('id', 0);
    if (!error) {
      alert("تم حذف القصة بنجاح!");
      refreshData();
      setIsMenuOpen(false);
    } else {
      alert("حدث خطأ أثناء الحذف");
    }
  };

  return (
    <div className="my-status-page">
      {isViewingStatus && <StatusViewer onClose={() => setIsViewingStatus(false)} />}

      <div className="status-header">
        <button onClick={onClose} className="back-btn" title="رجوع">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 5 12 12 19"></polyline>
          </svg>
        </button>
        <span className="header-title">حالتي</span>
      </div>

      <div className="brown-divider"></div>

      <div className="status-item">
        <div className="item-right">
          <div className="circle-icon" style={{ overflow: 'hidden' }}>
            {latestStatusImage ? (
              <img src={latestStatusImage} alt="الحالة" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
            ) : (
              <div style={{ width: '100%', height: '100%', backgroundColor: '#3c3a3a' }}></div>
            )}
          </div>
          
          <div className="status-card-box" onClick={() => setIsViewingStatus(true)} style={{ cursor: 'pointer' }}>
            <div className="views-info">
              <div className="views-count-row">
                <span>{viewersCount}</span>
                <span>مشاهدات</span>
                <span className="green-heart">💚</span>
              </div>
            </div>
          </div>
        </div>

        <div className="item-left">
          <button className="three-dots-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>&#8942;</button>
          
          {isMenuOpen && ( 
            <div className="dropdown-menu">
              <button className="delete-btn" onClick={() => { setIsMenuOpen(false); setShowViewerModal(true); }}>إضافة مشاهد</button>
              <button className="delete-btn" onClick={() => { setIsMenuOpen(false); setShowStatusModal(true); }}>إضافة قصة</button>
              <button className="delete-btn" style={{ color: '#ff4d4d' }} onClick={handleDeleteStory}>حذف القصة</button>
            </div>
          )}
        </div>
      </div>

      <div className="brown-divider"></div>

      <div className="encryption-footer">
        <svg className="lock-outline-icon" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="14" rx="2" ry="2"></rect>
          <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
          <circle cx="12" cy="18" r="1.6" fill="currentColor" stroke="none"></circle>
        </svg>
        <span className="encryption-text">
          حالاتك <span style={{ color: '#25D366' }}>مشفرة تماما بين الطرفين</span> . وستختفي بعد 24 ساعه .
        </span>
      </div>

      <div className="whatsapp-fab-container">
        <button className="fab-btn fab-pencil" onClick={() => setShowViewerModal(true)} title="إضافة مشاهد">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
        </button>
        
        <button className="fab-btn fab-camera" onClick={() => setShowStatusModal(true)} title="إضافة قصة">
          <img src={cameraIconPath} alt="كاميرا" style={{ width: '58px', height: '58px', objectFit: 'contain' }} />
        </button>
      </div>

      {/* النوافذ المنبثقة تبقى كما هي تقريباً، مع التأكد من إيقاف الزر أثناء التحميل */}
      {showViewerModal && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={handleSaveViewer}>
            <h3>إضافة مشاهد جديد</h3>
            <input type="text" placeholder="اسم المشاهد" value={viewerName} onChange={(e) => setViewerName(e.target.value)} required />
            <label style={{ fontSize: '12px', color: '#aaa' }}>صورة المشاهد:</label>
            <input type="file" accept="image/*" onChange={(e) => setViewerFile(e.target.files ? e.target.files[0] : null)} required />
            <div className="modal-actions">
              <button type="button" className="modal-btn-cancel" onClick={() => setShowViewerModal(false)}>إلغاء</button>
              <button type="submit" className="modal-btn-save" disabled={loading}>{loading ? "جاري الرفع..." : "حفظ"}</button>
            </div>
          </form>
        </div>
      )}

      {showStatusModal && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={handleSaveStatus}>
            <h3>إضافة قصة جديدة</h3>
            <input type="text" placeholder="نص القصة (اختياري)" value={statusText} onChange={(e) => setStatusText(e.target.value)} />
            <label style={{ fontSize: '12px', color: '#aaa' }}>صورة القصة:</label>
            <input type="file" accept="image/*" onChange={(e) => setStatusFile(e.target.files ? e.target.files[0] : null)} required />
            <div className="modal-actions">
              <button type="button" className="modal-btn-cancel" onClick={() => setShowStatusModal(false)}>إلغاء</button>
              <button type="submit" className="modal-btn-save" disabled={loading}>{loading ? "جاري النشر..." : "نشر"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------
// 2. الصفحة الرئيسية
// -------------------------------------------------
interface HomeProps {
  onOpenStatusPage: () => void;
}

const Home: React.FC<HomeProps> = ({ onOpenStatusPage }) => (
  <div className="app-container">
    <div className="image-wrapper">
      <img src={backgroundImage} alt="الواجهة" />
      <div className="clickable-area" onClick={onOpenStatusPage}></div>
    </div>
  </div>
);

// -------------------------------------------------
// 3. المكون الرئيسي (App) مع نظام التخزين والتحميل المسبق
// -------------------------------------------------
const App: React.FC = () => {
  const [isStatusPageOpen, setIsStatusPageOpen] = useState<boolean>(false);
  
  // ⚡ استرجاع البيانات المحفوظة في المتصفح لتظهر فوراً بدون انتظار
  const [viewersCount, setViewersCount] = useState<number>(() => parseInt(localStorage.getItem('cached_viewersCount') || '0'));
  const [latestStatusImage, setLatestStatusImage] = useState<string>(() => localStorage.getItem('cached_statusImage') || '');

  const fetchBackgroundData = async () => {
    try {
      // 1. جلب عدد المشاهدين
      const { count, error: err1 } = await supabase.from('viewers').select('*', { count: 'exact', head: true });
      if (!err1 && count !== null) {
        setViewersCount(count);
        localStorage.setItem('cached_viewersCount', count.toString());
      }

      // 2. جلب أحدث صورة للحالة
      const { data, error: err2 } = await supabase.from('status').select('image_url').order('id', { ascending: false }).limit(1);
      if (!err2) {
        const imageUrl = data && data.length > 0 ? data[0].image_url : '';
        setLatestStatusImage(imageUrl);
        localStorage.setItem('cached_statusImage', imageUrl);
      }
    } catch (error) {
      console.error("خطأ في تحديث البيانات بالخلفية", error);
    }
  };

  // ⚡ تشغيل التحميل بالخلفية فور فتح التطبيق (حتى لو كان في صفحة Home)
  useEffect(() => {
    fetchBackgroundData();
  }, []);

  return (
    <div>
      {isStatusPageOpen ? (
        <MyStatusPage 
          onClose={() => setIsStatusPageOpen(false)} 
          viewersCount={viewersCount}
          latestStatusImage={latestStatusImage}
          refreshData={fetchBackgroundData} // لتحديث البيانات فورا بعد الرفع
        />
      ) : (
        <Home onOpenStatusPage={() => setIsStatusPageOpen(true)} />
      )}
    </div>
  );
};

export default App;