import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Admin.css';
import { toast } from 'react-toastify';
import {
  adminCreateOrUpdateWeek,
  adminCloseWeek,
  adminFetchMarketData,
  adminSettleWeek,
  adminRecomputeFromWeek,
} from '../services/adminService';

const AdminActions = () => {
  const [weekId, setWeekId] = useState('');
  const [openAt, setOpenAt] = useState('');
  const [closeAt, setCloseAt] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('open');
  const [busy, setBusy] = useState(false);
  const [activeAction, setActiveAction] = useState(null);

  const run = async (fn, payload, message, actionName) => {
    setBusy(true);
    setActiveAction(actionName);
    try {
      await fn(payload);
      toast.success(message || 'İşlem başarılı');
    } catch (e) {
      toast.error(e?.message || 'İşlem başarısız');
    } finally {
      setBusy(false);
      setActiveAction(null);
    }
  };

  const actions = [
    {
      id: 'save',
      title: 'Hafta Kaydet',
      description: 'Yeni hafta oluştur veya mevcut haftayı güncelle',
      icon: '💾',
      fn: () => run(adminCreateOrUpdateWeek, { weekId, status, openAt, closeAt, startDate, endDate }, 'Hafta kaydedildi', 'save'),
      disabled: !weekId,
      color: '#3b82f6'
    },
    {
      id: 'close',
      title: 'Haftayı Kapat',
      description: 'Açık haftayı kapat (allocation kabul etme)',
      icon: '🔒',
      fn: () => run(adminCloseWeek, { weekId }, 'Hafta kapatıldı', 'close'),
      disabled: !weekId,
      color: '#f59e0b'
    },
    {
      id: 'fetch',
      title: 'Piyasa Verilerini Çek',
      description: 'Belirtilen hafta veya mevcut hafta için piyasa verilerini çek',
      icon: '📊',
      fn: () => run(adminFetchMarketData, { weekId }, 'Piyasa verileri çekildi', 'fetch'),
      disabled: false,
      color: '#10b981'
    },
    {
      id: 'settle',
      title: 'Haftayı Kapat ve Hesapla',
      description: 'Haftayı kapat, getirileri hesapla ve bakiyeleri güncelle',
      icon: '⚡',
      fn: () => run(adminSettleWeek, { weekId }, 'Hafta kapatıldı ve hesaplandı', 'settle'),
      disabled: !weekId,
      color: '#8b5cf6'
    },
    {
      id: 'recompute',
      title: 'Yeniden Hesapla',
      description: 'Belirtilen haftadan itibaren tüm haftaları yeniden hesapla',
      icon: '🔄',
      fn: () => run(adminRecomputeFromWeek, { weekId }, 'Yeniden hesaplama başlatıldı', 'recompute'),
      disabled: !weekId,
      color: '#ef4444'
    },
  ];

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="admin-header-content">
          <h1>Admin Actions</h1>
          <div className="admin-nav">
            <Link to="/admin" className="admin-nav-link">Ana Sayfa</Link>
            <Link to="/admin/users" className="admin-nav-link">Kullanıcılar</Link>
            <Link to="/admin/performance" className="admin-nav-link">Performans</Link>
            <Link to="/admin/logs" className="admin-nav-link">Logs</Link>
          </div>
        </div>
      </div>

      <div className="admin-content">
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">Hafta Parametreleri</h3>
          </div>
          <div className="admin-form">
            <div className="admin-form-group">
              <label className="admin-form-label">Week ID <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                className="admin-form-input"
                value={weekId}
                onChange={(e) => setWeekId(e.target.value)}
                placeholder="YYYY-WNN (örn: 2025-W41)"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="admin-form-group">
                <label className="admin-form-label">Status</label>
                <select
                  className="admin-form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="open">open</option>
                  <option value="closed">closed</option>
                  <option value="settled">settled</option>
                  <option value="upcoming">upcoming</option>
                </select>
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">openAt (ISO, opsiyonel)</label>
                <input
                  className="admin-form-input"
                  value={openAt}
                  onChange={(e) => setOpenAt(e.target.value)}
                  placeholder="2025-10-10T20:00:00+03:00"
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">closeAt (ISO, opsiyonel)</label>
                <input
                  className="admin-form-input"
                  value={closeAt}
                  onChange={(e) => setCloseAt(e.target.value)}
                  placeholder="2025-10-12T23:00:00+03:00"
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">startDate (ISO, opsiyonel)</label>
                <input
                  className="admin-form-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="2025-10-13T00:00:00+03:00"
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">endDate (ISO, opsiyonel)</label>
                <input
                  className="admin-form-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="2025-10-17T21:00:00+03:00"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">İşlemler</h3>
            <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
              {busy && activeAction && 'İşlem yürütülüyor...'}
            </div>
          </div>
          <div className="admin-actions-grid">
            {actions.map((action) => (
              <div
                key={action.id}
                className="admin-action-card"
                style={{
                  borderColor: activeAction === action.id ? action.color : undefined,
                  opacity: action.disabled && !busy ? 0.6 : 1
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{action.icon}</span>
                  <h4 className="admin-action-card-title">{action.title}</h4>
                </div>
                <p className="admin-action-card-desc">{action.description}</p>
                <button
                  className="admin-btn admin-btn-primary"
                  disabled={busy || action.disabled}
                  onClick={action.fn}
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    background: activeAction === action.id ? action.color : undefined,
                    opacity: activeAction === action.id ? 0.9 : 1
                  }}
                >
                  {activeAction === action.id ? 'Çalışıyor...' : 'Çalıştır'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminActions;
