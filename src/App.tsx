import React, { useState, useEffect } from 'react';
import './App.css';
import backgroundImage from './assets/background.jpeg'; 
import { supabase } from './supabaseClient';
import StatusViewer from './StatusViewer';

import cameraIconPath from './assets/camera.jpeg';

// -------------------------------------------------
// 1. صفحة "قائمة حالتي" (My Status Page)
// -------------------------------------------------
interface MyStatusPageProps {
  onClose: () => void;
}

const MyStatusPage: React.FC<MyStatusPageProps> = ({ onClose }) => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  
  const [viewersCount, setViewersCount] = useState<number>(0);
  const [latestStatusImage, setLatestStatusImage] = useState<string>('');

  const [showViewerModal, setShowViewerModal] = useState<boolean>(false);
  const [viewerName, setViewerName] = useState<string>('');
  const [viewerFile, setViewerFile] = useState<File | null>(null);

  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('');
  const [statusFile, setStatusFile] = useState<File | null>(null);
  
  // حالة فتح نافذة الاستعراض (StatusViewer)
  const [isViewingStatus, setIsViewingStatus] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchViewersCount();
    fetchLatestStatus();
  }, []);

  const fetchViewersCount = async () => {
    const { count, error } = await supabase
      .from('viewers')
      .select('*', { count: 'exact', head: true });
    
    if (!error && count !== null) {
      setViewersCount(count);
    }
  };

  const fetchLatestStatus = async () => {
    const { data, error } = await supabase
      .from('status')
      .select('image_url')
      .order('id', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      setLatestStatusImage(data[0].image_url);
    }
  };

  const uploadImageToStorage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const cleanFileName = `img_${Date.now()}_${Math.floor(Math.random() * 100000)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(cleanFileName, file);

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
    if (!viewerName || !viewerFile) {
      alert("الرجاء إدخال اسم المشاهد واختيار صورة.");
      return;
    }

    setLoading(true);
    const publicUrl = await uploadImageToStorage(viewerFile);
    if (!publicUrl) {
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('viewers').insert([
      { viewer_name: viewerName, avatar_url: publicUrl }
    ]);

    setLoading(false);
    if (error) {
      alert("فشل حفظ المشاهد: " + error.message);
    } else {
      alert("تمت إضافة المشاهد بنجاح!");
      setShowViewerModal(false);
      setViewerName('');
      setViewerFile(null);
      fetchViewersCount();
    }
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusFile) {
      alert("الرجاء اختيار صورة للقصة.");
      return;
    }

    setLoading(true);
    const publicUrl = await uploadImageToStorage(statusFile);
    if (!publicUrl) {
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('status').insert([
      { image_url: publicUrl, text: statusText }
    ]);

    setLoading(false);
    if (error) {
      alert("فشل نشر القصة: " + error.message);
    } else {
      alert("تم نشر القصة بنجاح!");
      setShowStatusModal(false);
      setStatusText('');
      setStatusFile(null);
      setLatestStatusImage(publicUrl);
    }
  };

  const handleDeleteStory = async () => {
    const { error } = await supabase.from('status').delete().neq('id', 0);
    if (!error) {
      alert("تم حذف القصة بنجاح!");
      setLatestStatusImage('');
      setIsMenuOpen(false);
    } else {
      alert("حدث خطأ أثناء الحذف");
    }
  };

  return (
    <div className="my-status-page">
      {/* عرض صفحة الاستعراض عند الضغط على مربع الحالة */}
      {isViewingStatus && (
        <StatusViewer onClose={() => setIsViewingStatus(false)} />
      )}

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
              <img src={latestStatusImage} alt="الحالة" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', backgroundColor: '#3c3a3a' }}></div>
            )}
          </div>
          
          {/* تم ربط الضغط هنا لفتح StatusViewer */}
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
          <button className="three-dots-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            &#8942;
          </button>
          
          {isMenuOpen && ( 
            <div className="dropdown-menu">
              <button className="delete-btn" onClick={() => { setIsMenuOpen(false); setShowViewerModal(true); }}>
                إضافة مشاهد
              </button>
              <button className="delete-btn" onClick={() => { setIsMenuOpen(false); setShowStatusModal(true); }}>
                إضافة قصة
              </button>
              <button className="delete-btn" style={{ color: '#ff4d4d' }} onClick={handleDeleteStory}>
                حذف القصة
              </button>
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

      {showViewerModal && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={handleSaveViewer}>
            <h3>إضافة مشاهد جديد</h3>
            <input 
              type="text" 
              placeholder="اسم المشاهد" 
              value={viewerName} 
              onChange={(e) => setViewerName(e.target.value)} 
              required 
            />
            <label style={{ fontSize: '12px', color: '#aaa' }}>صورة المشاهد:</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => setViewerFile(e.target.files ? e.target.files[0] : null)} 
              required 
            />
            <div className="modal-actions">
              <button type="button" className="modal-btn-cancel" onClick={() => setShowViewerModal(false)}>إلغاء</button>
              <button type="submit" className="modal-btn-save" disabled={loading}>
                {loading ? "جاري الرفع..." : "حفظ"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showStatusModal && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={handleSaveStatus}>
            <h3>إضافة قصة جديدة</h3>
            <input 
              type="text" 
              placeholder="نص القصة (اختياري)" 
              value={statusText} 
              onChange={(e) => setStatusText(e.target.value)} 
            />
            <label style={{ fontSize: '12px', color: '#aaa' }}>صورة القصة:</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => setStatusFile(e.target.files ? e.target.files[0] : null)} 
              required 
            />
            <div className="modal-actions">
              <button type="button" className="modal-btn-cancel" onClick={() => setShowStatusModal(false)}>إلغاء</button>
              <button type="submit" className="modal-btn-save" disabled={loading}>
                {loading ? "جاري النشر..." : "نشر"}
              </button>
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

const Home: React.FC<HomeProps> = ({ onOpenStatusPage }) => {
  return (
    <div className="app-container">
      <div className="image-wrapper">
        <img src={backgroundImage} alt="الواجهة" />
        <div className="clickable-area" onClick={onOpenStatusPage}></div>
      </div>
    </div>
  );
};


// -------------------------------------------------
// 3. المكون الرئيسي (App)
// -------------------------------------------------
const App: React.FC = () => {
  const [isStatusPageOpen, setIsStatusPageOpen] = useState<boolean>(false);

  return (
    <div>
      {isStatusPageOpen ? (
        <MyStatusPage onClose={() => setIsStatusPageOpen(false)} />
      ) : (
        <Home onOpenStatusPage={() => setIsStatusPageOpen(true)} />
      )}
    </div>
  );
};

export default App;