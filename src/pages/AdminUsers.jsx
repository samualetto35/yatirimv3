import { useEffect, useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { adminListUsers, adminDeleteUser, adminGetUserDetails } from '../services/adminService';
import './Dashboard.css';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  const [userDetails, setUserDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await adminListUsers();
      setUsers(result.users || []);
    } catch (error) {
      toast.error(error?.message || 'Kullanıcılar yüklenemedi');
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (uid, username, deleteAllocations = false) => {
    try {
      setDeleting(uid);
      const result = await adminDeleteUser({ uid, deleteAllocations });
      toast.success(result.message || 'Kullanıcı başarıyla silindi');
      setShowDeleteConfirm(null);
      // Reload users list
      await loadUsers();
    } catch (error) {
      toast.error(error?.message || 'Kullanıcı silinemedi');
      console.error('Failed to delete user:', error);
    } finally {
      setDeleting(null);
    }
  };

  const loadUserDetails = async (uid, forceRefresh = false) => {
    if (userDetails[uid] && !forceRefresh) {
      // Already loaded, skip unless force refresh
      return;
    }

    setLoadingDetails(prev => ({ ...prev, [uid]: true }));
    try {
      // Use admin function to get user details (bypasses Firestore rules)
      const details = await adminGetUserDetails(uid);
      
      const balanceData = details.balance || null;
      const wbData = details.weeklyBalances || [];
      const allocData = details.allocations || [];

      // Create a map of weekId -> data
      const weekMap = new Map();
      
      // Add weekly balances
      wbData.forEach(wb => {
        if (wb.weekId) {
          weekMap.set(wb.weekId, {
            weekId: wb.weekId,
            weeklyBalance: wb,
            allocation: null
          });
        }
      });

      // Add allocations
      allocData.forEach(alloc => {
        if (alloc.weekId) {
          const existing = weekMap.get(alloc.weekId);
          if (existing) {
            existing.allocation = alloc;
          } else {
            weekMap.set(alloc.weekId, {
              weekId: alloc.weekId,
              weeklyBalance: null,
              allocation: alloc
            });
          }
        }
      });

      // Convert to array and sort by weekId
      const weeks = Array.from(weekMap.values()).sort((a, b) => 
        (b.weekId || '').localeCompare(a.weekId || '')
      );

      setUserDetails(prev => ({
        ...prev,
        [uid]: {
          balance: balanceData,
          weeks: weeks,
          totalWeeks: weeks.length,
          totalAllocations: allocData.length
        }
      }));
      
      // Log for debugging
      console.log(`Loaded details for ${uid}:`, {
        allocations: allocData.length,
        weeklyBalances: wbData.length,
        weeks: weeks.length,
        allocationWeekIds: allocData.map(a => a.weekId),
        wbWeekIds: wbData.map(w => w.weekId)
      });
    } catch (error) {
      console.error('Failed to load user details:', error);
      toast.error('Kullanıcı detayları yüklenemedi');
    } finally {
      setLoadingDetails(prev => ({ ...prev, [uid]: false }));
    }
  };

  const handleToggleDetails = (uid) => {
    if (expandedUser === uid) {
      setExpandedUser(null);
    } else {
      setExpandedUser(uid);
      loadUserDetails(uid);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      user.username?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.uid?.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      let date;
      
      // If it's already an ISO string from functions
      if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      }
      // Check if it's a Firestore Timestamp with toDate method
      else if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      }
      // Check if it's a serialized Firestore Timestamp with seconds property
      else if (timestamp && (timestamp.seconds || timestamp._seconds)) {
        const seconds = timestamp.seconds || timestamp._seconds;
        date = new Date(seconds * 1000);
      }
      // Check if it's already a Date object
      else if (timestamp instanceof Date) {
        date = timestamp;
      }
      // Try to parse as number (milliseconds)
      else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
      }
      else {
        return 'N/A';
      }
      
      // Validate the date
      if (!date || isNaN(date.getTime())) {
        return 'N/A';
      }
      
      return date.toLocaleString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Istanbul'
      });
    } catch (error) {
      console.warn('Date formatting error:', error, timestamp);
      return 'N/A';
    }
  };

  // User Details Component
  const UserDetailsView = ({ user, details, onRefresh }) => {
    const formatMoney = (n) => {
      const num = Number(n);
      return Number.isFinite(num) ? `₺${num.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}` : '—';
    };

    const formatPct = (n) => {
      const num = Number(n);
      return Number.isFinite(num) ? `${num >= 0 ? '+' : ''}${num.toFixed(2)}%` : '—';
    };

    const getAllocString = (alloc) => {
      if (!alloc?.pairs) return 'Yok';
      const entries = Object.entries(alloc.pairs)
        .filter(([, v]) => Number(v) > 0)
        .map(([k, v]) => `${k} ${(Number(v) * 100).toFixed(2)}%`);
      return entries.length > 0 ? entries.join(' · ') : 'Yok';
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Balance Summary */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1rem', border: '1px solid #e9ecef' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ margin: '0', color: '#212529' }}>Bakiye Özeti</h4>
            <button
              className="btn btn-secondary"
              onClick={() => loadUserDetails(user.uid, true)}
              style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
              title="Detayları yenile"
            >
              🔄 Yenile
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: '0.25rem' }}>Güncel Bakiye</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#212529' }}>
                {formatMoney(details.balance?.latestBalance)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: '0.25rem' }}>Son Hafta</div>
              <div style={{ fontSize: '1rem', fontWeight: '600', color: '#495057' }}>
                {details.balance?.latestWeekId || 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: '0.25rem' }}>Toplam Hafta</div>
              <div style={{ fontSize: '1rem', fontWeight: '600', color: '#495057' }}>
                {details.totalWeeks} hafta
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: '0.25rem' }}>Toplam Allocation</div>
              <div style={{ fontSize: '1rem', fontWeight: '600', color: '#495057' }}>
                {details.totalAllocations} adet
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Details */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1rem', border: '1px solid #e9ecef' }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#212529' }}>Haftalık Detaylar ({details.weeks.length} hafta)</h4>
          <div style={{ maxHeight: '500px', overflow: 'auto' }}>
            {details.weeks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6c757d' }}>
                Henüz haftalık veri yok
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e9ecef', background: '#f8f9fa' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Hafta</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Başlangıç</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Bitiş</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Getiri</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Allocations</th>
                  </tr>
                </thead>
                <tbody>
                  {details.weeks.map((week) => {
                    const wb = week.weeklyBalance;
                    const alloc = week.allocation;
                    const returnPct = wb?.resultReturnPct;
                    const isPositive = returnPct != null && Number(returnPct) >= 0;
                    
                    return (
                      <tr key={week.weekId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '0.75rem', fontWeight: '600' }}>{week.weekId}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: '#495057' }}>
                          {formatMoney(wb?.baseBalance || alloc?.baseBalance)}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#212529' }}>
                          {formatMoney(wb?.endBalance)}
                        </td>
                        <td style={{ 
                          padding: '0.75rem', 
                          textAlign: 'right', 
                          fontWeight: '600',
                          color: returnPct != null ? (isPositive ? '#28a745' : '#dc3545') : '#6c757d'
                        }}>
                          {formatPct(returnPct)}
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#495057' }}>
                          {getAllocString(alloc)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Kullanıcı Yönetimi</h1>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
          <Link to="/admin/actions" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            Actions
          </Link>
          <Link to="/admin/logs" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            Logs
          </Link>
        </div>
      </div>
      <div className="dashboard-content">
        <div className="info-card" style={{ marginBottom: '1rem' }}>
          <h3>Filtreler</h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Kullanıcı adı, email veya UID ile ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid #ced4da' }}
            />
            <button className="btn btn-secondary" onClick={loadUsers} disabled={loading}>
              {loading ? 'Yükleniyor...' : 'Yenile'}
            </button>
          </div>
          <div style={{ marginTop: '0.5rem', color: '#6c757d', fontSize: '0.9rem' }}>
            Toplam: {users.length} kullanıcı | Filtrelenmiş: {filteredUsers.length}
          </div>
        </div>

        {loading ? (
          <div className="info-card">
            <div style={{ textAlign: 'center', padding: '2rem' }}>Yükleniyor...</div>
          </div>
        ) : (
          <div className="info-card">
            <h3>Kullanıcılar ({filteredUsers.length})</h3>
            <div style={{ maxHeight: '600px', overflow: 'auto' }}>
              {filteredUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6c757d' }}>
                  Kullanıcı bulunamadı
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e9ecef', background: '#f8f9fa' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', width: '30px' }}></th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Kullanıcı Adı</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Email</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Doğrulandı</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Auth Durumu</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Oluşturulma</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => {
                      const isExpanded = expandedUser === user.uid;
                      const details = userDetails[user.uid];
                      const loadingDetail = loadingDetails[user.uid];
                      
                      return (
                        <Fragment key={user.uid}>
                          <tr style={{ borderBottom: '1px solid #e9ecef', background: isExpanded ? '#f8f9fa' : 'transparent' }}>
                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                              <button
                                onClick={() => handleToggleDetails(user.uid)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '1.2rem',
                                  color: '#495057',
                                  padding: '0.25rem 0.5rem'
                                }}
                                title={isExpanded ? 'Detayları gizle' : 'Detayları göster'}
                              >
                                {isExpanded ? '▼' : '▶'}
                              </button>
                            </td>
                            <td style={{ padding: '0.75rem', fontWeight: '500' }}>{user.username}</td>
                            <td style={{ padding: '0.75rem' }}>{user.email}</td>
                            <td style={{ padding: '0.75rem' }}>
                              <span style={{ color: user.emailVerified ? '#28a745' : '#dc3545' }}>
                                {user.emailVerified ? '✓' : '✗'}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <span style={{ color: user.authExists ? '#28a745' : '#dc3545' }}>
                                {user.authExists ? 'Var' : 'Yok'}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: '#6c757d' }}>
                              {formatDate(user.createdAt)}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                                <button
                                  className="btn btn-secondary"
                                  onClick={() => handleToggleDetails(user.uid)}
                                  style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                                >
                                  {isExpanded ? 'Gizle' : 'Detaylar'}
                                </button>
                                {showDeleteConfirm === user.uid ? (
                                  <>
                                    <button
                                      className="btn btn-primary"
                                      onClick={() => handleDelete(user.uid, user.username, false)}
                                      disabled={deleting === user.uid}
                                      style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                                    >
                                      {deleting === user.uid ? 'Siliniyor...' : 'Sadece Kullanıcı'}
                                    </button>
                                    <button
                                      className="btn btn-primary"
                                      onClick={() => handleDelete(user.uid, user.username, true)}
                                      disabled={deleting === user.uid}
                                      style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem', background: '#dc3545' }}
                                    >
                                      {deleting === user.uid ? 'Siliniyor...' : 'Hepsi'}
                                    </button>
                                    <button
                                      className="btn btn-secondary"
                                      onClick={() => setShowDeleteConfirm(null)}
                                      disabled={deleting === user.uid}
                                      style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                                    >
                                      İptal
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    className="btn btn-primary"
                                    onClick={() => setShowDeleteConfirm(user.uid)}
                                    disabled={deleting === user.uid}
                                    style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem', background: '#dc3545' }}
                                  >
                                    Sil
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${user.uid}-details`}>
                              <td colSpan={7} style={{ padding: '0', background: '#f8f9fa' }}>
                                <div style={{ padding: '1.5rem', borderTop: '2px solid #dee2e6' }}>
                                  {loadingDetail ? (
                                    <div style={{ textAlign: 'center', padding: '2rem' }}>Yükleniyor...</div>
                                  ) : details ? (
                                    <UserDetailsView user={user} details={details} onRefresh={() => loadUserDetails(user.uid, true)} />
                                  ) : (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: '#6c757d' }}>
                                      Detaylar yüklenemedi
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
