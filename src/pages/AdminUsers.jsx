import { useEffect, useState, Fragment, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { adminListUsers, adminDeleteUser, adminGetUserDetails } from '../services/adminService';
import './Admin.css';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  const [userDetails, setUserDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filterVerified, setFilterVerified] = useState('all'); // all, verified, unverified
  const [filterAuth, setFilterAuth] = useState('all'); // all, exists, not-exists

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
      return;
    }

    setLoadingDetails(prev => ({ ...prev, [uid]: true }));
    try {
      const details = await adminGetUserDetails(uid);
      
      const balanceData = details.balance || null;
      const wbData = details.weeklyBalances || [];
      const allocData = details.allocations || [];

      const weekMap = new Map();
      
      wbData.forEach(wb => {
        if (wb.weekId) {
          weekMap.set(wb.weekId, {
            weekId: wb.weekId,
            weeklyBalance: wb,
            allocation: null
          });
        }
      });

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

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { key, direction: 'asc' };
    });
  };

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter(user => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        if (!(
          user.username?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.uid?.toLowerCase().includes(searchLower)
        )) {
          return false;
        }
      }

      // Verified filter
      if (filterVerified === 'verified' && !user.emailVerified) return false;
      if (filterVerified === 'unverified' && user.emailVerified) return false;

      // Auth filter
      if (filterAuth === 'exists' && !user.authExists) return false;
      if (filterAuth === 'not-exists' && user.authExists) return false;

      return true;
    });

    // Sort
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === 'createdAt') {
          aVal = aVal ? new Date(aVal).getTime() : 0;
          bVal = bVal ? new Date(bVal).getTime() : 0;
        } else if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [users, search, filterVerified, filterAuth, sortConfig]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      let date;
      if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp && (timestamp.seconds || timestamp._seconds)) {
        const seconds = timestamp.seconds || timestamp._seconds;
        date = new Date(seconds * 1000);
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
      } else {
        return 'N/A';
      }
      
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="admin-card" style={{ padding: '1rem', marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>Bakiye Özeti</h4>
            <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={onRefresh}>
              🔄
            </button>
          </div>
          <div className="admin-stats-compact">
            <div className="admin-stat-compact">
              <div className="admin-stat-compact-label">Güncel Bakiye</div>
              <div className="admin-stat-compact-value">{formatMoney(details.balance?.latestBalance)}</div>
            </div>
            <div className="admin-stat-compact">
              <div className="admin-stat-compact-label">Son Hafta</div>
              <div className="admin-stat-compact-value" style={{ fontSize: '0.875rem' }}>
                {details.balance?.latestWeekId || 'N/A'}
              </div>
            </div>
            <div className="admin-stat-compact">
              <div className="admin-stat-compact-label">Toplam Hafta</div>
              <div className="admin-stat-compact-value" style={{ fontSize: '0.875rem' }}>
                {details.totalWeeks}
              </div>
            </div>
            <div className="admin-stat-compact">
              <div className="admin-stat-compact-label">Allocations</div>
              <div className="admin-stat-compact-value" style={{ fontSize: '0.875rem' }}>
                {details.totalAllocations}
              </div>
            </div>
          </div>
        </div>

        <div className="admin-card" style={{ padding: '1rem', marginBottom: 0 }}>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
            Haftalık Detaylar ({details.weeks.length})
          </h4>
          <div className="admin-table-wrapper admin-scrollable" style={{ maxHeight: '400px' }}>
            {details.weeks.length === 0 ? (
              <div className="admin-empty" style={{ padding: '1.5rem' }}>Henüz haftalık veri yok</div>
            ) : (
              <table className="admin-table admin-table-compact">
                <thead>
                  <tr>
                    <th>Hafta</th>
                    <th style={{ textAlign: 'right' }}>Başlangıç</th>
                    <th style={{ textAlign: 'right' }}>Bitiş</th>
                    <th style={{ textAlign: 'right' }}>Getiri</th>
                    <th>Allocations</th>
                  </tr>
                </thead>
                <tbody>
                  {details.weeks.map((week) => {
                    const wb = week.weeklyBalance;
                    const alloc = week.allocation;
                    const returnPct = wb?.resultReturnPct;
                    const isPositive = returnPct != null && Number(returnPct) >= 0;
                    
                    return (
                      <tr key={week.weekId}>
                        <td style={{ fontWeight: '600' }}>{week.weekId}</td>
                        <td style={{ textAlign: 'right' }}>
                          {formatMoney(wb?.baseBalance || alloc?.baseBalance)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '600' }}>
                          {formatMoney(wb?.endBalance)}
                        </td>
                        <td style={{ 
                          textAlign: 'right', 
                          fontWeight: '600',
                          color: returnPct != null ? (isPositive ? '#10b981' : '#ef4444') : '#6b7280'
                        }}>
                          {formatPct(returnPct)}
                        </td>
                        <td style={{ fontSize: '0.75rem' }}>
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
    <div className="admin-container">
      <div className="admin-header">
        <div className="admin-header-content">
          <h1>Kullanıcı Yönetimi</h1>
          <div className="admin-nav">
            <Link to="/admin" className="admin-nav-link">Ana Sayfa</Link>
            <Link to="/admin/performance" className="admin-nav-link">Performans</Link>
            <Link to="/admin/actions" className="admin-nav-link">Actions</Link>
            <Link to="/admin/logs" className="admin-nav-link">Logs</Link>
          </div>
        </div>
      </div>

      <div className="admin-content">
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">Filtreler ve Arama</h3>
          </div>
          <div className="admin-search">
            <input
              type="text"
              className="admin-search-input"
              placeholder="Kullanıcı adı, email veya UID ile ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button 
              className="admin-btn admin-btn-secondary" 
              onClick={loadUsers} 
              disabled={loading}
            >
              {loading ? 'Yükleniyor...' : 'Yenile'}
            </button>
          </div>
          <div className="admin-filter-pills">
            <button
              className={`admin-filter-pill ${filterVerified === 'all' ? 'active' : ''}`}
              onClick={() => setFilterVerified('all')}
            >
              Tümü
            </button>
            <button
              className={`admin-filter-pill ${filterVerified === 'verified' ? 'active' : ''}`}
              onClick={() => setFilterVerified('verified')}
            >
              Doğrulanmış
            </button>
            <button
              className={`admin-filter-pill ${filterVerified === 'unverified' ? 'active' : ''}`}
              onClick={() => setFilterVerified('unverified')}
            >
              Doğrulanmamış
            </button>
            <button
              className={`admin-filter-pill ${filterAuth === 'all' ? 'active' : ''}`}
              onClick={() => setFilterAuth('all')}
            >
              Auth: Tümü
            </button>
            <button
              className={`admin-filter-pill ${filterAuth === 'exists' ? 'active' : ''}`}
              onClick={() => setFilterAuth('exists')}
            >
              Auth: Var
            </button>
            <button
              className={`admin-filter-pill ${filterAuth === 'not-exists' ? 'active' : ''}`}
              onClick={() => setFilterAuth('not-exists')}
            >
              Auth: Yok
            </button>
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
            Toplam: <strong>{users.length}</strong> kullanıcı | Filtrelenmiş: <strong>{filteredAndSortedUsers.length}</strong>
          </div>
        </div>

        {loading ? (
          <div className="admin-card">
            <div className="admin-loading">Yükleniyor...</div>
          </div>
        ) : (
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">Kullanıcılar ({filteredAndSortedUsers.length})</h3>
            </div>
            <div className="admin-table-wrapper">
              {filteredAndSortedUsers.length === 0 ? (
                <div className="admin-empty">Kullanıcı bulunamadı</div>
              ) : (
                <table className="admin-table admin-table-compact">
                  <thead>
                    <tr>
                      <th style={{ width: '30px' }}></th>
                      <th 
                        className={`admin-sortable ${sortConfig.key === 'username' ? sortConfig.direction : ''}`}
                        onClick={() => handleSort('username')}
                      >
                        Kullanıcı Adı
                      </th>
                      <th 
                        className={`admin-sortable ${sortConfig.key === 'email' ? sortConfig.direction : ''}`}
                        onClick={() => handleSort('email')}
                      >
                        Email
                      </th>
                      <th>Doğrulandı</th>
                      <th>Auth</th>
                      <th 
                        className={`admin-sortable ${sortConfig.key === 'createdAt' ? sortConfig.direction : ''}`}
                        onClick={() => handleSort('createdAt')}
                      >
                        Oluşturulma
                      </th>
                      <th style={{ textAlign: 'center' }}>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedUsers.map((user) => {
                      const isExpanded = expandedUser === user.uid;
                      const details = userDetails[user.uid];
                      const loadingDetail = loadingDetails[user.uid];
                      
                      return (
                        <Fragment key={user.uid}>
                          <tr className={isExpanded ? 'admin-expandable-row' : ''}>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                onClick={() => handleToggleDetails(user.uid)}
                                className="admin-toggle-btn"
                                title={isExpanded ? 'Detayları gizle' : 'Detayları göster'}
                              >
                                {isExpanded ? '▼' : '▶'}
                              </button>
                            </td>
                            <td style={{ fontWeight: '500' }}>{user.username}</td>
                            <td style={{ fontSize: '0.8125rem' }}>{user.email}</td>
                            <td>
                              <span className={`admin-badge ${user.emailVerified ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                                {user.emailVerified ? '✓' : '✗'}
                              </span>
                            </td>
                            <td>
                              <span className={`admin-badge ${user.authExists ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                                {user.authExists ? 'Var' : 'Yok'}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              {formatDate(user.createdAt)}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div className="admin-actions-group">
                                <button
                                  className="admin-btn admin-btn-secondary admin-btn-sm"
                                  onClick={() => handleToggleDetails(user.uid)}
                                >
                                  {isExpanded ? 'Gizle' : 'Detay'}
                                </button>
                                {showDeleteConfirm === user.uid ? (
                                  <>
                                    <button
                                      className="admin-btn admin-btn-primary admin-btn-sm"
                                      onClick={() => handleDelete(user.uid, user.username, false)}
                                      disabled={deleting === user.uid}
                                    >
                                      {deleting === user.uid ? '...' : 'Sadece'}
                                    </button>
                                    <button
                                      className="admin-btn admin-btn-danger admin-btn-sm"
                                      onClick={() => handleDelete(user.uid, user.username, true)}
                                      disabled={deleting === user.uid}
                                    >
                                      {deleting === user.uid ? '...' : 'Hepsi'}
                                    </button>
                                    <button
                                      className="admin-btn admin-btn-secondary admin-btn-sm"
                                      onClick={() => setShowDeleteConfirm(null)}
                                      disabled={deleting === user.uid}
                                    >
                                      İptal
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    className="admin-btn admin-btn-danger admin-btn-sm"
                                    onClick={() => setShowDeleteConfirm(user.uid)}
                                    disabled={deleting === user.uid}
                                  >
                                    Sil
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} style={{ padding: 0 }}>
                                <div className="admin-expandable-content" style={{ padding: '1rem' }}>
                                  {loadingDetail ? (
                                    <div className="admin-loading" style={{ padding: '1.5rem' }}>Yükleniyor...</div>
                                  ) : details ? (
                                    <UserDetailsView user={user} details={details} onRefresh={() => loadUserDetails(user.uid, true)} />
                                  ) : (
                                    <div className="admin-empty" style={{ padding: '1.5rem' }}>Detaylar yüklenemedi</div>
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
