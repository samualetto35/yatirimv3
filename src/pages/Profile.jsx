import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { updateUserDocument } from '../services/userService';

const fmtTR = (d) => {
  if (!d) return '—';
  try {
    const date = d instanceof Date ? d : (typeof d === 'string' ? new Date(d) : d?.toDate?.());
    return date ? date.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '—';
  } catch { return '—'; }
};

const Profile = () => {
  const { currentUser, userDoc, logout } = useAuth();
  const navigate = useNavigate();
  const [tabsStyle, setTabsStyle] = useState(() => {
    if (typeof window === 'undefined') return 'modern';
    return localStorage.getItem('topTabsStyle') || 'modern';
  });

  useEffect(() => {
    const handler = () => {
      const next = localStorage.getItem('topTabsStyle') || 'modern';
      setTabsStyle(next);
    };
    window.addEventListener('topTabsStyleChanged', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('topTabsStyleChanged', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);
  const hasAuth = !!currentUser;
  const hasFirestore = !!userDoc;
  const emailsMatch = (userDoc?.email && currentUser?.email) ? (userDoc.email === currentUser.email) : null;
  const synced = hasAuth && hasFirestore && (emailsMatch !== false);

  const emailVerified = currentUser?.emailVerified ? 'Yes' : 'No';
  const verifiedAt = userDoc?.emailVerifiedAt?.toDate?.() || (currentUser?.emailVerified ? userDoc?.updatedAt?.toDate?.() : null);

  const authCreatedAt = currentUser?.metadata?.creationTime ? new Date(currentUser.metadata.creationTime) : null;
  const authLastSignInAt = currentUser?.metadata?.lastSignInTime ? new Date(currentUser.metadata.lastSignInTime) : null;

  return (
    <div className="info-card">
      <h3>Profil & Ayarlar</h3>
      <div className="info-item" style={{ alignItems: 'center' }}>
        <span>Menü Stili</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`btn-chip ${tabsStyle === 'modern' ? 'primary' : 'ghost'}`}
            onClick={() => {
              localStorage.setItem('topTabsStyle', 'modern');
              setTabsStyle('modern');
              if (currentUser?.uid) { updateUserDocument(currentUser.uid, { topTabsStyle: 'modern' }); }
              window.dispatchEvent(new Event('topTabsStyleChanged'));
            }}
          >
            Modern
          </button>
          <button
            type="button"
            className={`btn-chip ${tabsStyle === 'classic' ? 'primary' : 'ghost'}`}
            onClick={() => {
              localStorage.setItem('topTabsStyle', 'classic');
              setTabsStyle('classic');
              if (currentUser?.uid) { updateUserDocument(currentUser.uid, { topTabsStyle: 'classic' }); }
              window.dispatchEvent(new Event('topTabsStyleChanged'));
            }}
          >
            Classic
          </button>
        </div>
      </div>
      <div className="info-item"><span>Auth status</span><strong className="success">{hasAuth ? 'Present' : 'Missing'}</strong></div>
      <div className="info-item"><span>Firestore user</span><strong className="success">{hasFirestore ? 'Present' : 'Missing'}</strong></div>
      <div className="info-item"><span>Sync</span><strong className="success">{synced ? 'Synced ✓' : 'Not synced'}</strong></div>

      <div className="info-item"><span>Username</span><strong>{userDoc?.username || currentUser?.displayName || '—'}</strong></div>
      <div className="info-item"><span>Email</span><strong>{userDoc?.email || currentUser?.email || '—'}</strong></div>
      <div className="info-item"><span>Email Verified</span><strong className="success">{emailVerified}</strong></div>
      <div className="info-item"><span>Verified At (TR)</span><strong>{fmtTR(verifiedAt)}</strong></div>

      <div className="info-item"><span>Auth UID</span><strong>{currentUser?.uid || '—'}</strong></div>
      <div className="info-item"><span>Registered (TR)</span><strong>{fmtTR(authCreatedAt)}</strong></div>
      <div className="info-item"><span>Last Sign In (TR)</span><strong>{fmtTR(authLastSignInAt)}</strong></div>

      <div className="info-item"><span>Firestore Created</span><strong>{fmtTR(userDoc?.createdAt)}</strong></div>
      <div className="info-item"><span>Firestore Updated</span><strong>{fmtTR(userDoc?.updatedAt)}</strong></div>
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={async () => {
            const ok = window.confirm('Are you sure you want to log out?');
            if (!ok) return;
            try {
              await logout();
              navigate('/');
            } catch {}
          }}
          className="btn btn-logout"
        >
          Logout
        </button>
      </div>
      {/* Settings box removed; style toggle moved above */}
    </div>
  );
};

export default Profile;


