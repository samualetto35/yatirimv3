import { useEffect, useState, useMemo } from 'react';
import { getAllocations, getWeeklyBalancesAll, getUsersMap } from '../services/analyticsService';
import { getEnabledInstruments } from '../config/instruments';

// Spacing: 16px card padding, 12px between sections, 8px between rows
const card = {
  background: '#fff',
  borderRadius: 14,
  border: '1px solid #e5e7eb',
  padding: 18,
  marginBottom: 16,
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};
const sectionTitle = { fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 14, letterSpacing: '-0.01em' };
const blockLabel = { fontSize: 11, color: '#6b7280', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' };
const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6', gap: 12 };
const lastRow = { borderBottom: 'none' };

const pairCount = (alloc) => (alloc?.pairs ? Object.keys(alloc.pairs).filter((k) => Number(alloc.pairs[k]) > 0).length : 0);
const topN = (arr, n, key) => [...arr].sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0)).slice(0, n);

function HorizontalBarList({ items, maxVal, barColor, valueLabel = (x) => x }) {
  const m = Math.max(1, maxVal);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {items.map((item, i) => (
        <div key={item.symbol || i} style={{ ...row, ...(i === items.length - 1 ? lastRow : {}) }}>
          <div style={{ flex: '0 0 auto', minWidth: 48, fontWeight: 600, fontSize: 14, color: '#111827' }}>{item.symbol}</div>
          <div style={{ flex: 1, height: 10, background: '#f3f4f6', borderRadius: 5, overflow: 'hidden', alignSelf: 'center' }}>
            <div
              style={{
                width: `${(item.users / m) * 100}%`,
                height: '100%',
                background: barColor,
                borderRadius: 5,
                minWidth: item.users > 0 ? 8 : 0,
              }}
            />
          </div>
          <div style={{ flex: '0 0 auto', fontSize: 13, fontWeight: 600, color: '#6b7280', minWidth: 36, textAlign: 'right' }}>
            {valueLabel(item.users)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Analizler() {
  const [allocations, setAllocations] = useState([]);
  const [weeklyBalances, setWeeklyBalances] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedParite, setSelectedParite] = useState('');
  const [selectedWeekId, setSelectedWeekId] = useState('');

  const weekIds = useMemo(() => {
    const set = new Set(allocations.map((a) => a.weekId).filter(Boolean));
    return [...set].sort().reverse().slice(0, 24);
  }, [allocations]);

  useEffect(() => {
    if (weekIds.length && !selectedWeekId) setSelectedWeekId(weekIds[0]);
  }, [weekIds, selectedWeekId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [allocs, wb, users] = await Promise.all([
          getAllocations(),
          getWeeklyBalancesAll(),
          getUsersMap(),
        ]);
        setAllocations(allocs);
        setWeeklyBalances(wb);
        setUsersMap(users);
        const inst = getEnabledInstruments();
        const first = inst.find((i) => allocs.some((a) => a.pairs?.[i.code]));
        if (first && !selectedParite) setSelectedParite(first.code);
      } catch (e) {
        console.error('Analizler fetch error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const instruments = useMemo(() => getEnabledInstruments(), []);

  const pairUserCountOverall = useMemo(() => {
    const count = {};
    allocations.forEach((a) => {
      if (!a.pairs) return;
      Object.keys(a.pairs).forEach((sym) => {
        if (Number(a.pairs[sym]) > 0) count[sym] = (count[sym] || 0) + 1;
      });
    });
    return Object.entries(count).map(([symbol, users]) => ({ symbol, users })).sort((a, b) => b.users - a.users);
  }, [allocations]);

  const pairUserCountByWeek = useMemo(() => {
    const byWeek = {};
    allocations.forEach((a) => {
      const wid = a.weekId;
      if (!wid) return;
      if (!byWeek[wid]) byWeek[wid] = {};
      if (!a.pairs) return;
      Object.keys(a.pairs).forEach((sym) => {
        if (Number(a.pairs[sym]) > 0) byWeek[wid][sym] = (byWeek[wid][sym] || 0) + 1;
      });
    });
    return byWeek;
  }, [allocations]);

  const top3Overall = useMemo(() => topN(pairUserCountOverall, 3, 'users'), [pairUserCountOverall]);
  const top3ByWeek = useMemo(() => {
    if (!selectedWeekId || !pairUserCountByWeek[selectedWeekId]) return [];
    const arr = Object.entries(pairUserCountByWeek[selectedWeekId]).map(([symbol, users]) => ({ symbol, users }));
    return topN(arr, 3, 'users');
  }, [selectedWeekId, pairUserCountByWeek]);

  const maxU = Math.max(1, ...top3Overall.map((x) => x.users));
  const maxW = Math.max(1, ...top3ByWeek.map((x) => x.users));

  const diversificationByUserOverall = useMemo(() => {
    const byUid = {};
    allocations.forEach((a) => {
      const uid = a.uid;
      if (!uid) return;
      const n = pairCount(a);
      if (!byUid[uid]) byUid[uid] = { count: 0, sumN: 0 };
      byUid[uid].count += 1;
      byUid[uid].sumN += n;
    });
    return Object.entries(byUid).map(([uid, v]) => ({
      uid,
      avgParites: v.count ? v.sumN / v.count : 0,
    }));
  }, [allocations]);

  const diversificationByUserByWeek = useMemo(() => {
    const byWeek = {};
    allocations.forEach((a) => {
      const wid = a.weekId;
      if (!wid) return;
      if (!byWeek[wid]) byWeek[wid] = {};
      const uid = a.uid;
      if (!uid) return;
      byWeek[wid][uid] = pairCount(a);
    });
    return byWeek;
  }, [allocations]);

  const mostDiverseOverall = useMemo(() => topN(diversificationByUserOverall, 3, 'avgParites'), [diversificationByUserOverall]);
  const leastDiverseOverall = useMemo(() => [...diversificationByUserOverall].sort((a, b) => (a.avgParites ?? 0) - (b.avgParites ?? 0)).slice(0, 3), [diversificationByUserOverall]);
  const weekData = diversificationByUserByWeek[selectedWeekId] || {};
  const weekDiversityList = useMemo(() => Object.entries(weekData).map(([uid, n]) => ({ uid, n })), [selectedWeekId, diversificationByUserByWeek]);
  const mostDiverseWeek = useMemo(() => topN(weekDiversityList, 3, 'n'), [weekDiversityList]);
  const leastDiverseWeek = useMemo(() => [...weekDiversityList].sort((a, b) => (a.n ?? 0) - (b.n ?? 0)).slice(0, 3), [weekDiversityList]);

  const paritePreferenceByUser = useMemo(() => {
    if (!selectedParite) return [];
    const byUid = {};
    allocations.forEach((a) => {
      const w = Number(a.pairs?.[selectedParite]) || 0;
      if (w <= 0) return;
      const uid = a.uid;
      if (!uid) return;
      byUid[uid] = (byUid[uid] || 0) + w;
    });
    return Object.entries(byUid)
      .map(([uid, totalWeight]) => ({ uid, totalWeight }))
      .sort((a, b) => b.totalWeight - a.totalWeight);
  }, [allocations, selectedParite]);

  // Genel: kullanıcı bazında ortalama getiri; pozitif/negatif = benzersiz kişi sayısı (portföyü o yönde olan)
  const returnStatsOverall = useMemo(() => {
    const byUid = {};
    weeklyBalances.forEach((w) => {
      const uid = w.uid;
      const r = Number(w.resultReturnPct);
      if (!uid || !Number.isFinite(r)) return;
      if (!byUid[uid]) byUid[uid] = [];
      byUid[uid].push(r);
    });
    const uids = Object.keys(byUid);
    if (!uids.length) return null;
    const allReturns = weeklyBalances.map((w) => Number(w.resultReturnPct)).filter((r) => Number.isFinite(r));
    const avg = allReturns.length ? allReturns.reduce((s, r) => s + r, 0) / allReturns.length : 0;
    let positiveUsers = 0;
    let negativeUsers = 0;
    uids.forEach((uid) => {
      const arr = byUid[uid];
      const userAvg = arr.reduce((s, r) => s + r, 0) / arr.length;
      if (userAvg > 0) positiveUsers += 1;
      else if (userAvg < 0) negativeUsers += 1;
    });
    return { avg, positive: positiveUsers, negative: negativeUsers };
  }, [weeklyBalances]);

  // Hafta bazlı: zaten hafta başına bir kayıt = bir kişi; pozitif/negatif o haftada getirisi poz/neg olan kişi sayısı
  const returnStatsByWeek = useMemo(() => {
    const byWeek = {};
    weeklyBalances.forEach((w) => {
      const wid = w.weekId;
      if (!wid) return;
      if (!byWeek[wid]) byWeek[wid] = { returns: [], positive: 0, negative: 0 };
      const r = Number(w.resultReturnPct);
      if (!Number.isFinite(r)) return;
      byWeek[wid].returns.push(r);
      if (r > 0) byWeek[wid].positive += 1;
      else if (r < 0) byWeek[wid].negative += 1;
    });
    const result = {};
    Object.keys(byWeek).forEach((wid) => {
      const { returns: arr, positive, negative } = byWeek[wid];
      if (!arr.length) return;
      result[wid] = {
        avg: arr.reduce((s, r) => s + r, 0) / arr.length,
        positive,
        negative,
      };
    });
    return result;
  }, [weeklyBalances]);

  const selectedWeekReturnStats = selectedWeekId ? returnStatsByWeek[selectedWeekId] : null;

  const maxPref = Math.max(0.01, ...paritePreferenceByUser.map((u) => u.totalWeight));

  if (loading) {
    return (
      <div style={{ ...card, textAlign: 'center', padding: 40 }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', margin: '0 auto 14px', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontWeight: 600, fontSize: 14, color: '#6b7280' }}>Yükleniyor…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 88px 0', maxWidth: 640, margin: '0 auto' }}>
      {/* Hafta seçimi */}
      <div style={{ ...card, padding: '14px 18px' }}>
        <div style={{ ...blockLabel, marginBottom: 8 }}>Hafta seçin</div>
        <select
          value={selectedWeekId}
          onChange={(e) => setSelectedWeekId(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid #e5e7eb',
            fontSize: 14,
            background: '#fff',
            color: '#111827',
            fontWeight: 500,
          }}
        >
          {weekIds.length === 0 && <option value="">Veri yok</option>}
          {weekIds.map((wid) => (
            <option key={wid} value={wid}>{wid}</option>
          ))}
        </select>
      </div>

      {/* 1. En çok yatırım alan pariteler — yatay bar listesi */}
      <div style={card}>
        <div style={sectionTitle}>En çok yatırım alan pariteler</div>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14, lineHeight: 1.45 }}>
          Kaç kullanıcının o pariteye yatırım yaptığı (genel ve seçilen hafta).
        </p>
        <div style={{ ...blockLabel, marginBottom: 10 }}>Genel (tüm haftalar)</div>
        {top3Overall.length > 0 ? (
          <HorizontalBarList items={top3Overall} maxVal={maxU} barColor="#3b82f6" valueLabel={(v) => `${v} kişi`} />
        ) : (
          <div style={{ padding: '12px 0', fontSize: 13, color: '#6b7280' }}>Henüz veri yok.</div>
        )}
        <div style={{ ...blockLabel, marginBottom: 10, marginTop: 18 }}>Seçilen hafta ({selectedWeekId || '—'})</div>
        {top3ByWeek.length > 0 ? (
          <HorizontalBarList items={top3ByWeek} maxVal={maxW} barColor="#10b981" valueLabel={(v) => `${v} kişi`} />
        ) : (
          <div style={{ padding: '12px 0', fontSize: 13, color: '#6b7280' }}>Bu hafta veri yok.</div>
        )}
      </div>

      {/* 2. Çeşitlilik — aşağı doğru düzen */}
      <div style={card}>
        <div style={sectionTitle}>Çeşitlilik (diversification)</div>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 18, lineHeight: 1.45 }}>
          En fazla / en az parite çeşitliliği olan kullanıcılar (ortalama parite sayısı).
        </p>

        {/* Genel — En fazla çeşitlilik */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ ...blockLabel, marginBottom: 10 }}>Genel · En fazla çeşitlilik</div>
          <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
            {mostDiverseOverall.map((u, i) => (
              <div
                key={u.uid}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderBottom: i < mostDiverseOverall.length - 1 ? '1px solid #e2e8f0' : 'none',
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                  {i + 1}. {usersMap[u.uid] || u.uid}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', background: '#eff6ff', padding: '4px 10px', borderRadius: 8 }}>
                  ~{u.avgParites.toFixed(1)} parite
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Genel — En az çeşitlilik */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ ...blockLabel, marginBottom: 10 }}>Genel · En az çeşitlilik</div>
          <div style={{ background: '#fafafa', borderRadius: 10, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
            {leastDiverseOverall.map((u, i) => (
              <div
                key={u.uid}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderBottom: i < leastDiverseOverall.length - 1 ? '1px solid #e2e8f0' : 'none',
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                  {i + 1}. {usersMap[u.uid] || u.uid}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', padding: '4px 10px', borderRadius: 8 }}>
                  ~{u.avgParites.toFixed(1)} parite
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Seçilen hafta — En fazla çeşitlilik */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ ...blockLabel, marginBottom: 10 }}>Seçilen hafta ({selectedWeekId || '—'}) · En fazla çeşitlilik</div>
          <div style={{ background: '#f0fdf4', borderRadius: 10, border: '1px solid #dcfce7', overflow: 'hidden' }}>
            {mostDiverseWeek.map((u, i) => (
              <div
                key={u.uid}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderBottom: i < mostDiverseWeek.length - 1 ? '1px solid #bbf7d0' : 'none',
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                  {i + 1}. {usersMap[u.uid] || u.uid}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d', background: '#dcfce7', padding: '4px 10px', borderRadius: 8 }}>
                  {u.n} parite
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Seçilen hafta — En az çeşitlilik */}
        <div>
          <div style={{ ...blockLabel, marginBottom: 10 }}>Seçilen hafta ({selectedWeekId || '—'}) · En az çeşitlilik</div>
          <div style={{ background: '#fffbeb', borderRadius: 10, border: '1px solid #fef3c7', overflow: 'hidden' }}>
            {leastDiverseWeek.map((u, i) => (
              <div
                key={u.uid}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderBottom: i < leastDiverseWeek.length - 1 ? '1px solid #fde68a' : 'none',
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                  {i + 1}. {usersMap[u.uid] || u.uid}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#b45309', background: '#fef3c7', padding: '4px 10px', borderRadius: 8 }}>
                  {u.n} parite
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Parite tercihi */}
      <div style={card}>
        <div style={sectionTitle}>Parite tercihi</div>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14, lineHeight: 1.45 }}>
          Seçtiğiniz pariteyi en çok tercih eden kullanıcılar (toplam ağırlık).
        </p>
        <div style={{ marginBottom: 14 }}>
          <select
            value={selectedParite}
            onChange={(e) => setSelectedParite(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              fontSize: 14,
              background: '#fff',
              color: '#111827',
              fontWeight: 500,
            }}
          >
            <option value="">Parite seçin</option>
            {instruments.map((i) => (
              <option key={i.code} value={i.code}>{i.code} — {i.name}</option>
            ))}
          </select>
        </div>
        {selectedParite && paritePreferenceByUser.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {paritePreferenceByUser.slice(0, 12).map((u, i) => (
              <div key={u.uid} style={{ ...row, ...(i === Math.min(11, paritePreferenceByUser.length - 1) ? lastRow : {}) }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{i + 1}. {usersMap[u.uid] || u.uid}</span>
                <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden', alignSelf: 'center', maxWidth: 120 }}>
                  <div style={{ width: `${(u.totalWeight / maxPref) * 100}%`, height: '100%', background: '#8b5cf6', borderRadius: 4, minWidth: u.totalWeight > 0 ? 6 : 0 }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', minWidth: 52, textAlign: 'right' }}>{(u.totalWeight * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
        {selectedParite && paritePreferenceByUser.length === 0 && (
          <div style={{ padding: '14px 0', fontSize: 13, color: '#6b7280' }}>Bu pariteyi tercih eden kullanıcı yok.</div>
        )}
      </div>

      {/* 4. Getiri özeti */}
      <div style={card}>
        <div style={sectionTitle}>Getiri özeti</div>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 18, lineHeight: 1.45 }}>
          Ortalama getiri ve kaç kullanıcının pozitif / negatif getirdiği.
        </p>

        {/* Genel */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ ...blockLabel, marginBottom: 10 }}>Genel (tüm haftalar)</div>
          {returnStatsOverall ? (
            <div style={{ background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Ortalama getiri</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: returnStatsOverall.avg >= 0 ? '#059669' : '#dc2626', letterSpacing: '-0.02em' }}>
                  {(returnStatsOverall.avg * 100).toFixed(2)}%
                </span>
              </div>
              <div style={{ padding: '14px 18px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: '#22c55e' }} />
                  <span style={{ fontSize: 13, color: '#64748b' }}>Pozitif</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#059669' }}>{returnStatsOverall.positive}</span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>kişi</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: '#ef4444' }} />
                  <span style={{ fontSize: 13, color: '#64748b' }}>Negatif</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#dc2626' }}>{returnStatsOverall.negative}</span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>kişi</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '16px 18px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13, color: '#64748b' }}>Veri yok.</div>
          )}
        </div>

        {/* Seçilen hafta */}
        <div>
          <div style={{ ...blockLabel, marginBottom: 10 }}>Seçilen hafta ({selectedWeekId || '—'})</div>
          {selectedWeekReturnStats ? (
            <div style={{ background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 18px', borderBottom: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>Ortalama getiri</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: selectedWeekReturnStats.avg >= 0 ? '#059669' : '#dc2626', letterSpacing: '-0.02em' }}>
                  {(selectedWeekReturnStats.avg * 100).toFixed(2)}%
                </span>
              </div>
              <div style={{ padding: '14px 18px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: '#22c55e' }} />
                  <span style={{ fontSize: 13, color: '#166534' }}>Pozitif</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#059669' }}>{selectedWeekReturnStats.positive}</span>
                  <span style={{ fontSize: 12, color: '#15803d' }}>kişi</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: '#ef4444' }} />
                  <span style={{ fontSize: 13, color: '#166534' }}>Negatif</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#dc2626' }}>{selectedWeekReturnStats.negative}</span>
                  <span style={{ fontSize: 12, color: '#15803d' }}>kişi</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '16px 18px', background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0', fontSize: 13, color: '#166534' }}>Bu hafta veri yok.</div>
          )}
        </div>
      </div>
    </div>
  );
}
