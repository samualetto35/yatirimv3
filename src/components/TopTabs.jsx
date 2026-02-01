import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';

const allTabs = [
  { key: 'overview', label: 'Dashboard' },
  { key: 'history', label: 'Geçmiş' },
  { key: 'leaderboard', label: 'Sıralama' },
  { key: 'announcements', label: 'Duyurular' },
  { key: 'market', label: 'Piyasa' },
  { key: 'analizler', label: 'Analizler' },
  { key: 'profile', label: 'Profil' },
];

const TopTabs = ({ active, onChange }) => {
  const { currentUser, isAdmin } = useAuth();
  const [stylePref, setStylePref] = useState(() => {
    if (typeof window === 'undefined') return 'modern';
    return localStorage.getItem('topTabsStyle') || 'modern';
  });
  const [hasUnreadAnnouncements, setHasUnreadAnnouncements] = useState(false);

  const tabs = useMemo(() => {
    return isAdmin ? allTabs : allTabs.filter((t) => t.key !== 'analizler');
  }, [isAdmin]);

  useEffect(() => {
    const handler = () => {
      const next = localStorage.getItem('topTabsStyle') || 'modern';
      setStylePref(next);
    };
    window.addEventListener('topTabsStyleChanged', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('topTabsStyleChanged', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  // compute unread announcements (very lightweight: check latest 1 vs read receipts)
  useEffect(() => {
    (async () => {
      try {
        if (!currentUser?.uid) { setHasUnreadAnnouncements(false); return; }
        const annsSnap = await getDocs(collection(db, 'announcements'));
        if (!annsSnap.size) { setHasUnreadAnnouncements(false); return; }
        const latest = annsSnap.docs.reduce((acc, d) => {
          const t = d.data()?.createdAt?.toMillis?.() || 0;
          return !acc || t > acc.t ? { id: d.id, t } : acc;
        }, null);
        if (!latest) { setHasUnreadAnnouncements(false); return; }
        const rr = doc(db, 'announcementReads', `${currentUser.uid}_${latest.id}`);
        const rrSnap = await getDoc(rr);
        setHasUnreadAnnouncements(!rrSnap.exists());
      } catch {
        setHasUnreadAnnouncements(false);
      }
    })();
  }, [currentUser?.uid, active]);

  const isClassic = stylePref === 'classic';
  const baseClass = isClassic ? 'top-tabs classic' : 'top-tabs';
  const btnClass = (key) => {
    const activeCls = active === key ? (isClassic ? 'active-classic' : 'active') : '';
    return `top-tab ${isClassic ? 'classic' : ''} ${activeCls}`.trim();
  };

  return (
    <div className={baseClass}>
      {tabs.map(t => (
        <button
          key={t.key}
          type="button"
          className={btnClass(t.key)}
          onClick={() => onChange?.(t.key)}
        >
          {t.key === 'announcements' && hasUnreadAnnouncements ? (
            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              {t.label}
              <span style={{ width: 8, height: 8, borderRadius: 999, background: '#dc2626', display: 'inline-block', marginLeft: 6 }} />
            </span>
          ) : t.label}
        </button>
      ))}
    </div>
  );
};

export default TopTabs;


