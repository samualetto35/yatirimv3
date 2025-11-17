import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserBalance, getWeeklyBalancesByUser, getLeaderboardByLatestWeek } from '../services/portfolioService';
import { getActiveOrUpcomingWeek } from '../services/weekService';

const KPIBar = () => {
  const { currentUser, userDoc } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(null);
  const [latestPct, setLatestPct] = useState(null);
  const [last4Pct, setLast4Pct] = useState(null);
  const [mode, setMode] = useState('latest'); // 'latest' | 'last4'
  const [week, setWeek] = useState(null);
  const [countdown, setCountdown] = useState('');
  const [deadlineLabel, setDeadlineLabel] = useState('');
  const [rank, setRank] = useState(null);
  const [rankWeek, setRankWeek] = useState(null);
  const [rankTotal, setRankTotal] = useState(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!currentUser) { setLoading(false); return; }
      try {
        const [balRes, wbsRes] = await Promise.allSettled([
          getUserBalance(currentUser.uid),
          getWeeklyBalancesByUser(currentUser.uid, 12),
        ]);
        if (!isMounted) return;
        const bal = balRes.status === 'fulfilled' ? balRes.value : null;
        const wbs = wbsRes.status === 'fulfilled' ? wbsRes.value : [];
        const last = wbs.length ? wbs[wbs.length - 1] : null;
        const lastEndNum = Number(last?.endBalance);
        const hasValidLastEnd = Number.isFinite(lastEndNum);
        const latestBalanceRaw = bal?.latestBalance;
        const latestBalanceNum = Number(latestBalanceRaw);
        const hasValidBal = Number.isFinite(latestBalanceNum);
        const latestBalance = hasValidBal ? latestBalanceNum : (hasValidLastEnd ? lastEndNum : 100000);
        const lastPctNum = last ? Number(last?.resultReturnPct) : NaN;
        const lastPctVal = Number.isFinite(lastPctNum) ? lastPctNum : (last ? 0 : null);
        const recent = wbs.slice(-4);
        const product = recent.reduce((p, r) => {
          const n = Number(r?.resultReturnPct);
          const pct = Number.isFinite(n) ? n : 0;
          return p * (1 + pct / 100);
        }, 1);
        const last4PctVal = recent.length ? ((product - 1) * 100) : null;
        setBalance(latestBalance);
        setLatestPct(lastPctVal);
        setLast4Pct(last4PctVal);
      } catch (e) {
        // fallbacks remain null
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [currentUser]);

  // Load active/upcoming week and manage countdown (choose nearest future deadline)
  useEffect(() => {
    let timerId = null;
    (async () => {
      const w = await getActiveOrUpcomingWeek();
      setWeek(w || null);
      if (!w) return;
      const toDate = (ts) => ts?.toDate?.() || null;
      const now = Date.now();
      const candidates = [
        { d: toDate(w.openAt), label: 'Kalan süre' },
        { d: toDate(w.closeAt), label: 'Kalan süre' },
        { d: toDate(w.startDate), label: 'Kalan süre' },
        { d: toDate(w.endDate), label: 'Kalan süre' },
        { d: toDate(w.settleAt), label: 'Kalan süre' },
      ].filter(x => x.d && x.d.getTime() > now);
      if (!candidates.length) return;
      candidates.sort((a, b) => a.d.getTime() - b.d.getTime());
      const target = candidates[0].d;
      setDeadlineLabel(candidates[0].label);
      const tick = () => {
        const ms = target.getTime() - Date.now();
        const s = Math.max(0, Math.floor(ms / 1000));
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const r = s % 60;
        setCountdown(`${h} saat ${m} dakika`);
      };
      tick();
      timerId = setInterval(tick, 1000);
    })();
    return () => { if (timerId) clearInterval(timerId); };
  }, []);

  // Load latest-week leaderboard rank for current user
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { week: w, rows } = await getLeaderboardByLatestWeek();
        if (!isMounted) return;
        setRankWeek(w || null);
        if (!rows || !rows.length || !currentUser) {
          setRank(null); setRankTotal(rows ? rows.length : null);
          return;
        }
        const idx = rows.findIndex(r => r.uid === currentUser.uid);
        if (idx === -1) {
          setRank(null); setRankTotal(rows.length);
        } else {
          setRank(idx + 1); setRankTotal(rows.length);
        }
      } catch (e) {
        setRank(null); setRankTotal(null);
      }
    })();
    return () => { isMounted = false; };
  }, [currentUser]);

  const fmtMoney = (n) => {
    const num = Number(n);
    return Number.isFinite(num) ? `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—';
  };
  const fmtPct = (n) =>
    typeof n === 'number' && Number.isFinite(n) ? `${n.toFixed(2)}%` : '—';

  const fmtDate = (ts) => {
    try {
      const d = ts?.toDate?.() || null;
      return d ? d.toLocaleDateString() : '—';
    } catch { return '—'; }
  };

  const capitalizeFirst = (s) => {
    if (!s || typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const deriveDisplayName = () => {
    const raw = userDoc?.username || currentUser?.displayName || (() => {
      const em = currentUser?.email || '';
      const at = em.indexOf('@');
      return at > 0 ? em.slice(0, at) : 'User';
    })();
    return capitalizeFirst(raw);
  };

  const Pill = ({ value }) => {
    if (typeof value !== 'number') return <span className="kpi-pill">—</span>;
    const positive = value >= 0;
    return (
      <span className={`kpi-pill ${positive ? 'pos' : 'neg'}`}>{fmtPct(value)}</span>
    );
  };

  const [greeting, setGreeting] = useState('');
  useEffect(() => {
    const computeGreeting = () => {
      const name = deriveDisplayName();
      try {
        const now = new Date();
        const hourStr = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', hour12: false, timeZone: 'Europe/Istanbul' }).format(now);
        const h = Number(hourStr);
        if (h >= 5 && h < 11) return `Günaydın, ${name} ☀️`;
        if (h >= 11 && h < 17) return `Hoşgeldin, ${name} 👋`;
        if (h >= 17 && h < 23) return `İyi Akşamlar, ${name} 🌖`;
        return `İyi Geceler, ${name} 🌘`;
      } catch {
        return `Hoşgeldin ${name} 👋`;
      }
    };
    const update = () => setGreeting(computeGreeting());
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [userDoc, currentUser]);

  return (
    <div className="kpi-container">
      <div className="kpi-header">
        <div className="kpi-header-left">
          <div className="kpi-week-title">{greeting}</div>
          <div className="kpi-week-period">{currentUser?.email || '—'}</div>
        </div>
        <div className="kpi-header-right" style={{ alignSelf: 'flex-end' }}>
          <span className={`chip-pill ${week?.status === 'open' ? 'chip-open' : (week?.status === 'closed' ? 'chip-red' : 'chip-gray')}`}>
            <span className="pill-dot" />
            {(week?.status || '—').slice(0,1).toUpperCase() + (week?.status || '—').slice(1)}
          </span>
        </div>
      </div>

      <div className="kpi-bar">
        <div className="kpi-card">
          <div className="kpi-label">Portföyünüz</div>
          <div className="kpi-value mono">{loading ? '…' : fmtMoney(balance)}</div>
          <div className="kpi-note chip-pill chip-gray kpi-chip-topright">Haftalık</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Geçen Hafta</div>
          <div className="kpi-value"><Pill value={loading ? null : latestPct} /></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Güncel Hafta</div>
          <div className="kpi-value" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontWeight: 800 }}>{week?.id || '—'}</span>
            <span className={`chip-pill ${week?.status === 'open' ? 'chip-open' : (week?.status === 'closed' ? 'chip-red' : 'chip-gray')}`}>
              <span className="pill-dot" />
              {(week?.status || '—').slice(0,1).toUpperCase() + (week?.status || '—').slice(1)}
            </span>
            {countdown && (
              <span className="chip-pill chip-gray" style={{ marginTop: 4 }}>
                {deadlineLabel} {countdown}
              </span>
            )}
          </div>
          <div className="kpi-note chip-pill chip-gray">{fmtDate(week?.startDate)} → {fmtDate(week?.endDate)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Sıralamanız</div>
          <div className="kpi-value" style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 800 }}>{typeof rank === 'number' ? `#${rank}` : '—'}</span>
            <span style={{ color: '#6c757d', fontWeight: 700 }}>{typeof rankTotal === 'number' ? `of ${rankTotal}` : ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KPIBar;


