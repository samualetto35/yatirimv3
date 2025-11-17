import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getLeaderboardByLatestWeek, getLeaderboardByOverallBalance, getLeaderboardByRecentWeeks, getWeeklyLeaderboardByWeek, getLeaderboardByAnnualizedReturn, getLeaderboardByWinRate } from '../services/portfolioService';

const metrics = [
  { key: 'latest', label: 'Son Hafta' },
  { key: 'overall', label: 'Portföy Büyüklüğü' },
  { key: 'month', label: 'Son 4 Hafta' },
  { key: 'byweek', label: 'Haftaya Göre' },
  { key: 'winrate', label: 'WinRate' },
  { key: 'annualized', label: 'Yıllıklandırılmış %' },
];

const WeekDropdown = ({ weeks, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const currentLabel = value || 'Hafta seç…';

  return (
    <div className="wkdd">
      <button
        type="button"
        className="wkdd-btn"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{currentLabel}</span>
        <span className="wkdd-caret">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="wkdd-panel" role="listbox">
          <div className="wkdd-list">
            {weeks.map(w => (
              <button
                key={w}
                type="button"
                className={`wkdd-option ${w === value ? 'active' : ''}`}
                onClick={() => { onChange?.(w); setOpen(false); }}
              >
                <span className="wkdd-option-text">{w}</span>
                {w === value && <span className="wkdd-check">✓</span>}
              </button>
            ))}
            {!weeks.length && (
              <div className="wkdd-empty">Gösterilecek hafta yok</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Ranking = () => {
  const [metric, setMetric] = useState('latest');
  const [rows, setRows] = useState([]);
  const [usernames, setUsernames] = useState({});
  const [search, setSearch] = useState('');
  const [weekList, setWeekList] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('');

  useEffect(() => {
    (async () => {
      if (!Object.keys(usernames).length) {
        const usnap = await getDocs(collection(db, 'users')).catch(() => ({ docs: [] }));
        const map = {}; usnap.docs.forEach(d => { const u = d.data(); if (u?.uid) map[u.uid] = u.username || u.email || u.uid; });
        setUsernames(map);
      }
      if (!weekList.length) {
        const wsnap = await getDocs(collection(db, 'weeks')).catch(() => ({ docs: [] }));
        const arr = wsnap.docs.map(d => d.data()).filter(w => w.id).sort((a, b) => (b?.endDate?.toMillis?.() || 0) - (a?.endDate?.toMillis?.() || 0));
        setWeekList(arr.map(w => w.id));
      }
    })();
  }, [usernames, weekList.length]);

  useEffect(() => {
    (async () => {
      if (metric === 'latest') {
        const { week, rows } = await getLeaderboardByLatestWeek();
        setRows(rows);
      } else if (metric === 'overall') {
        const rows = await getLeaderboardByOverallBalance();
        setRows(rows.map(r => ({ uid: r.uid, latestBalance: r.latestBalance })));
      } else if (metric === 'month') {
        const { rows } = await getLeaderboardByRecentWeeks(4);
        setRows(rows);
      } else if (metric === 'byweek') {
        if (selectedWeek) {
          const rows = await getWeeklyLeaderboardByWeek(selectedWeek);
          setRows(rows);
        } else {
          setRows([]);
        }
      } else if (metric === 'winrate') {
        const rows = await getLeaderboardByWinRate(10);
        setRows(rows);
      } else if (metric === 'annualized') {
        const rows = await getLeaderboardByAnnualizedReturn();
        setRows(rows);
      }
    })();
  }, [metric, selectedWeek]);

  const getRankBadgeStyle = (rank) => {
    const base = {
      display: 'inline-block',
      minWidth: 24,
      textAlign: 'center',
      padding: '2px 6px',
      borderRadius: 999,
      fontWeight: 800,
      fontSize: 12,
      background: '#f1f3f5',
      color: '#495057'
    };
    if (rank === 1) return { ...base, background: '#fff4cc', color: '#b58100' };
    if (rank === 2) return { ...base, background: '#e9ecef', color: '#6c757d' };
    if (rank === 3) return { ...base, background: '#ffe5d1', color: '#b36b00' };
    return base;
  };

  const filtered = useMemo(() => {
    return rows.filter(r => (search ? ((usernames[r.uid] || r.uid) + '').toLowerCase().includes(search.toLowerCase()) : true));
  }, [rows, search, usernames]);

  return (
    <div className="info-card" style={{ marginTop: 12 }}>
      <h3 style={{ fontSize: '1.05rem' }}>Sıralama</h3>
      <div className="pill-tabs" style={{ overflowX: 'auto', whiteSpace: 'nowrap', marginBottom: 8 }}>
        {metrics.map(m => (
          <button
            key={m.key}
            type="button"
            className={`chip-tab ${metric === m.key ? 'active' : ''}`}
            onClick={() => setMetric(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <input
          placeholder="Kullanıcı adı ara…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: 16, border: '1px solid #ced4da', fontSize: 14, minWidth: 240 }}
        />
        {metric === 'byweek' && (
          <WeekDropdown weeks={weekList} value={selectedWeek} onChange={setSelectedWeek} />
        )}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th className="lb-th">Rank</th>
              <th className="lb-th">Kullanıcı</th>
              {metric === 'overall' ? <th className="lb-th">Portföy</th> : <th className="lb-th">Getiri %</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, idx) => (
              <tr key={`${metric}_${idx}`}>
                <td className="lb-td"><span className="lb-rank" style={getRankBadgeStyle(idx + 1)}>{idx + 1}</span></td>
                <td className="lb-td">{usernames[r.uid] || r.uid}</td>
                {metric === 'overall' ? (
                  <td className="lb-td">${Number(r.latestBalance || 0).toLocaleString()}</td>
                ) : (
                  <td className="lb-td" style={{ color: Number((r.resultReturnPct ?? r.periodReturnPct) || 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                    {Number((r.resultReturnPct ?? r.periodReturnPct) || 0).toFixed(2)}%
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Ranking;


