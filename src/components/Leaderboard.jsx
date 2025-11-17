import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getLeaderboardByLatestWeek, getLeaderboardByOverallBalance, getLeaderboardByRecentWeeks, getWeeklyLeaderboardByWeek, testWeeklyBalancesAccess } from '../services/portfolioService';
import LeaderboardFilterBar from './LeaderboardFilterBar';

const tabs = [
  { key: 'latest', label: 'Latest Week %' },
  { key: 'overall', label: 'Overall Balance' },
  { key: 'month', label: 'Last 4 Weeks %' },
  { key: 'byweek', label: 'By Week' },
];

const Leaderboard = () => {
  const [tab, setTab] = useState('latest');
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [minWeeks, setMinWeeks] = useState(0);
  const [meta, setMeta] = useState(null);
  const [usernames, setUsernames] = useState({});
  const [weekList, setWeekList] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('');

  useEffect(() => {
    (async () => {
      console.log(`Leaderboard useEffect: tab=${tab}, selectedWeek=${selectedWeek}`);
      
      // Test weeklyBalances access on first load
      if (!Object.keys(usernames).length) {
        await testWeeklyBalancesAccess();
      }
      
      if (!Object.keys(usernames).length) {
        const usnap = await getDocs(collection(db, 'users')).catch(() => ({ docs: [] }));
        const map = {}; usnap.docs.forEach(d => { const u = d.data(); if (u?.uid) map[u.uid] = u.username || u.email || u.uid; });
        setUsernames(map);
        console.log(`Loaded ${Object.keys(map).length} usernames`);
      }
      if (!weekList.length) {
        const wsnap = await getDocs(collection(db, 'weeks')).catch(() => ({ docs: [] }));
        const arr = wsnap.docs.map(d => d.data()).filter(w => w.id).sort((a, b) => (b?.endDate?.toMillis?.() || 0) - (a?.endDate?.toMillis?.() || 0));
        setWeekList(arr.map(w => w.id));
        console.log(`Loaded ${arr.length} weeks:`, arr.map(w => ({ id: w.id, status: w.status })));
      }
      
      if (tab === 'latest') {
        console.log('Loading latest week leaderboard...');
        const { week, rows } = await getLeaderboardByLatestWeek();
        console.log(`Latest week result: week=${week}, rows=${rows.length}`);
        setRows(rows);
        setMeta({ week });
      } else if (tab === 'overall') {
        console.log('Loading overall balance leaderboard...');
        const rows = await getLeaderboardByOverallBalance();
        console.log(`Overall balance result: ${rows.length} rows`);
        setRows(rows.map(r => ({ uid: r.uid, latestBalance: r.latestBalance })));
        setMeta(null);
      } else if (tab === 'month') {
        console.log('Loading recent weeks leaderboard...');
        const { weeks, rows } = await getLeaderboardByRecentWeeks(4);
        console.log(`Recent weeks result: weeks=${weeks.length}, rows=${rows.length}`);
        setRows(rows);
        setMeta({ weeks });
      } else if (tab === 'byweek' && selectedWeek) {
        console.log(`Loading by-week leaderboard for week: ${selectedWeek}`);
        const rows = await getWeeklyLeaderboardByWeek(selectedWeek);
        console.log(`By-week result: ${rows.length} rows`);
        setRows(rows);
        setMeta({ week: selectedWeek });
      } else if (tab === 'byweek' && !selectedWeek) {
        console.log('By-week tab selected but no week chosen');
        setRows([]);
        setMeta(null);
      }
    })();
  }, [tab, selectedWeek]);

  const getRankBadgeStyle = (rank) => {
    const base = {
      display: 'inline-block',
      minWidth: 24,
      textAlign: 'center',
      padding: '2px 6px',
      borderRadius: 999,
      fontWeight: 800,
      background: '#f1f3f5',
      color: '#495057'
    };
    if (rank === 1) return { ...base, background: '#fff4cc', color: '#b58100' }; // gold
    if (rank === 2) return { ...base, background: '#e9ecef', color: '#6c757d' }; // silver
    if (rank === 3) return { ...base, background: '#ffe5d1', color: '#b36b00' }; // bronze
    return base;
  };

  const filtered = useMemo(() => {
    return rows
      .filter(r => (search ? ((usernames[r.uid] || r.uid) + '').toLowerCase().includes(search.toLowerCase()) : true))
      .filter(r => (typeof minWeeks === 'number' && minWeeks > 0 && r.weeks != null ? r.weeks >= minWeeks : true));
  }, [rows, search, minWeeks]);

  return (
    <div className="info-card">
      <LeaderboardFilterBar selected={tab} onSelect={setTab} search={search} onSearch={setSearch} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0', flexWrap: 'wrap' }}>
        <input
          placeholder="Search username…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: 16, border: '1px solid #ced4da', fontSize: 14, minWidth: 240 }}
        />
        {(tab === 'month' || tab === 'quarter' || tab === 'year') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#6c757d', fontSize: 12 }}>Min weeks</span>
            <input type="number" min={0} value={minWeeks} onChange={e => setMinWeeks(Number(e.target.value) || 0)} style={{ width: 80, padding: '6px 10px', borderRadius: 12, border: '1px solid #ced4da', fontSize: 12 }} />
          </div>
        )}
        {tab === 'byweek' && (
          <select value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)} style={{ padding: '8px 12px', borderRadius: 12, border: '1px solid #ced4da', fontSize: 12 }}>
            <option value="">Select week…</option>
            {weekList.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        )}
      </div>
      {meta?.week && <p style={{ color: '#6c757d' }}>Week: {meta.week}</p>}
      {meta?.weeks && <p style={{ color: '#6c757d', fontSize: 12 }}>Weeks: {meta.weeks.join(', ')}</p>}
      
      {/* Debug info */}
      <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 8 }}>
        Debug: {filtered.length} rows loaded for tab '{tab}'
        {tab === 'byweek' && !selectedWeek && ' (select a week)'}
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th className="lb-th">Rank</th>
              <th className="lb-th">User</th>
              {tab === 'overall' ? (
                <th className="lb-th">Latest Balance</th>
              ) : tab === 'byweek' ? (
                <>
                  <th className="lb-th">Return %</th>
                  <th className="lb-th">Base Balance</th>
                  <th className="lb-th">End Balance</th>
                </>
              ) : (
                <th className="lb-th">Return %</th>
              )}
              {(tab === 'month' || tab === 'quarter' || tab === 'year') && <th className="lb-th">Weeks</th>}
            </tr>
          </thead>
          <tbody>
              {filtered.map((r, idx) => (
              <tr key={`${tab}_${idx}`}>
                <td className="lb-td"><span className="lb-rank" style={getRankBadgeStyle(idx + 1)}>{idx + 1}</span></td>
                <td className="lb-td">{usernames[r.uid] || r.uid}</td>
                {tab === 'overall' ? (
                  <td className="lb-td">${Number(r.latestBalance).toLocaleString()}</td>
                ) : tab === 'byweek' ? (
                  <>
                    <td className="lb-td" style={{ color: Number((r.resultReturnPct ?? r.periodReturnPct) || 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                      {Number((r.resultReturnPct ?? r.periodReturnPct) || 0).toFixed(2)}%
                    </td>
                    <td className="lb-td">${Number(r.baseBalance || 0).toLocaleString()}</td>
                    <td className="lb-td">${Number(r.endBalance || 0).toLocaleString()}</td>
                  </>
                ) : (
                  <td className="lb-td" style={{ color: Number((r.resultReturnPct ?? r.periodReturnPct) || 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                    {Number((r.resultReturnPct ?? r.periodReturnPct) || 0).toFixed(2)}%
                  </td>
                )}
                {(tab === 'month' || tab === 'quarter' || tab === 'year') && (
                  <td className="lb-td">{r.weeks ?? '—'}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ color: '#6c757d', marginTop: 8, fontSize: 12 }}>
        Notes: For rolling periods, scores use geometric compounding over available weeks; you can require a minimum weeks filter.
      </p>
    </div>
  );
};

export default Leaderboard;


