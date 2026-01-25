import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getWeeklyBalancesByUser } from '../services/portfolioService';
import { getUserAllocations } from '../services/allocationService';

const History = () => {
  const { currentUser } = useAuth();
  const [wb, setWb] = useState([]);
  const [allocs, setAllocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState({ key: 'week', dir: 'default' }); // default -> asc -> desc

  useEffect(() => {
    (async () => {
      if (!currentUser) return;
      try {
        const [wbRes, aRes] = await Promise.allSettled([
          getWeeklyBalancesByUser(currentUser.uid, 104),
          getUserAllocations(currentUser.uid, 104)
        ]);
        setWb(wbRes.status === 'fulfilled' ? (wbRes.value || []) : []);
        setAllocs(aRes.status === 'fulfilled' ? (aRes.value || []) : []);
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUser]);

  const getAllocString = (a) => {
    if (!a?.pairs) return '—';
    return Object.entries(a.pairs)
      .filter(([, v]) => Number(v) > 0)
      .map(([k, v]) => `${k} ${(Number(v) * 100).toFixed(2)}%`)
      .join(' · ');
  };

  const renderAlloc = (s) => {
    if (!s || s === '—') return '—';
    const parts = String(s).split(' · ').filter(Boolean);
    if (!parts.length) return '—';
    return (
      <span>
        {parts.map((p, idx) => {
          const [sym, ...rest] = p.split(' ');
          const pct = rest.join(' ').trim();
          return (
            <span key={`alloc_${idx}_${sym}`}>
              <strong>{sym}</strong> <span>{pct}</span>
              {idx < parts.length - 1 ? <span style={{ color: '#9ca3af' }}> · </span> : null}
            </span>
          );
        })}
      </span>
    );
  };

  const joinedRows = useMemo(() => {
    const byWb = new Map(wb.map(r => [r.weekId, r]));
    const byAlloc = new Map(allocs.map(r => [r.weekId, r]));
    const keys = new Set([...byWb.keys(), ...byAlloc.keys()]);
    const parseWeek = (s) => {
      // expects 'YYYY-Wxx'
      if (!s) return { y: -Infinity, w: -Infinity };
      const m = /^(\d{4})-W(\d{1,2})$/.exec(s);
      if (!m) return { y: -Infinity, w: -Infinity };
      return { y: Number(m[1]), w: Number(m[2]) };
    };
    const cmpWeek = (a, b) => {
      const pa = parseWeek(a);
      const pb = parseWeek(b);
      if (pa.y !== pb.y) return pa.y - pb.y;
      return pa.w - pb.w;
    };
    const wbAsc = [...wb].sort((a, b) => cmpWeek(a.weekId, b.weekId));
    const findPrevEnd = (wid) => {
      // returns endBalance of the latest week strictly before wid
      const target = parseWeek(wid);
      let prev = null;
      for (let i = 0; i < wbAsc.length; i++) {
        const it = wbAsc[i];
        const pi = parseWeek(it.weekId);
        if (pi.y < target.y || (pi.y === target.y && pi.w < target.w)) {
          prev = it; // keep last lower
        } else {
          break;
        }
      }
      return prev ? Number(prev.endBalance || 0) : null;
    };
    const rows = Array.from(keys).map(weekId => {
      const w = byWb.get(weekId) || {};
      const a = byAlloc.get(weekId) || {};
      const hasWb = w && w.weekId;
      const fallbackBase = hasWb ? null : findPrevEnd(weekId);
      return {
        weekId,
        baseBalance: hasWb ? w.baseBalance : fallbackBase,
        endBalance: hasWb ? w.endBalance : null,
        resultReturnPct: hasWb ? w.resultReturnPct : null,
        allocation: getAllocString(a),
      };
    });
    return rows;
  }, [wb, allocs]);

  const sorted = useMemo(() => {
    const arr = [...joinedRows];
    if (sort.key === 'base') {
      arr.sort((a, b) => Number(a.baseBalance || 0) - Number(b.baseBalance || 0));
    } else if (sort.key === 'end') {
      arr.sort((a, b) => Number(a.endBalance || 0) - Number(b.endBalance || 0));
    } else if (sort.key === 'pct') {
      arr.sort((a, b) => Number(a.resultReturnPct || 0) - Number(b.resultReturnPct || 0));
    } else {
      arr.sort((a, b) => (a.weekId || '').localeCompare(b.weekId || ''));
    }
    if (sort.dir === 'desc') arr.reverse();
    return arr;
  }, [joinedRows, sort]);

  const nextSort = (key) => {
    setSort(prev => {
      if (prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      if (prev.dir === 'desc') return { key: 'week', dir: 'default' };
      return { key, dir: 'asc' };
    });
  };

  return (
    <div className="info-card">
      <h3>Geçmiş</h3>
      {loading ? <p style={{ color: '#6c757d' }}>Loading…</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Hafta</th>
                <th style={{ cursor: 'pointer' }} onClick={() => nextSort('base')}>Başlangıç</th>
                <th style={{ cursor: 'pointer' }} onClick={() => nextSort('end')}>Bitiş</th>
                <th style={{ cursor: 'pointer' }} onClick={() => nextSort('pct')}>Getiri</th>
                <th>Dağılım</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(row => {
                return (
                  <tr key={row.weekId}>
                    <td>{row.weekId}</td>
                    <td>{row.baseBalance != null ? `₺${Number(row.baseBalance).toLocaleString()}` : '—'}</td>
                    <td>{row.endBalance != null ? `₺${Number(row.endBalance).toLocaleString()}` : '—'}</td>
                    <td style={{ color: Number(row.resultReturnPct || 0) > 0 ? '#16a34a' : (Number(row.resultReturnPct || 0) < 0 ? '#dc2626' : '#9ca3af') }}>
                      {row.resultReturnPct != null ? `${Number(row.resultReturnPct).toFixed(2)}%` : '—'}
                    </td>
                    <td>
                      <div style={{ whiteSpace: 'nowrap', overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: 520 }}>
                        {renderAlloc(row.allocation || '—')}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default History;


