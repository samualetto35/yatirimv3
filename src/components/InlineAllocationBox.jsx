import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getActiveOrUpcomingWeek } from '../services/weekService';
import { getUserAllocationForWeek, submitAllocation } from '../services/allocationService';
import { getEnabledInstruments, INSTRUMENT_CATEGORIES } from '../config/instruments';

const numberOrZero = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const InlineAllocationBox = () => {
  const { currentUser } = useAuth();
  const [week, setWeek] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([{ symbol: 'XU100', weight: '' }]);
  const [message, setMessage] = useState('');
  
  // Get all available instruments
  const pairOptions = useMemo(() => {
    return getEnabledInstruments().map(inst => ({
      symbol: inst.code,
      name: inst.name,
      fullName: inst.fullName,
      category: inst.category,
      categoryName: INSTRUMENT_CATEGORIES[inst.category]?.name || inst.category,
      categoryIcon: INSTRUMENT_CATEGORIES[inst.category]?.icon || '📊',
      currency: inst.currency,
      source: inst.source,
    }));
  }, []);
  
  const [hasExisting, setHasExisting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showInstruments, setShowInstruments] = useState(false);
  const [openIdx, setOpenIdx] = useState(null);
  const [cat, setCat] = useState('Tümü');
  const [query, setQuery] = useState('');
  
  const categories = useMemo(() => {
    const s = new Set(pairOptions.map(p => p.categoryName));
    return ['Tümü', ...Array.from(s).sort()];
  }, [pairOptions]);

  useEffect(() => {
    (async () => {
      try {
        const w = await getActiveOrUpcomingWeek();
        setWeek(w || null);
        if (!currentUser || !w?.id) return;
        const alloc = await getUserAllocationForWeek(w.id, currentUser.uid);
        if (alloc?.pairs) {
          const next = [];
          pairOptions.forEach(opt => {
            const s = opt.symbol;
            const v = Number(alloc.pairs[s] || 0);
            if (v > 0) next.push({ symbol: s, weight: String(Math.round(v * 100)) });
          });
          setRows(next.length ? next : [{ symbol: 'XU100', weight: '' }]);
          setHasExisting(next.length > 0);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUser]);

  const total = useMemo(() => rows.reduce((acc, r) => acc + numberOrZero(r.weight), 0), [rows]);
  const canTrade = week?.status === 'open';
  const canSave = canTrade && total === 100 && !saving && !!currentUser;

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setMessage('');
    try {
      const pairs = rows.reduce((map, r) => {
        const w = Number((numberOrZero(r.weight) / 100).toFixed(4));
        if (w > 0) map[r.symbol] = w;
        return map;
      }, {});
      const payload = { weekId: week.id, pairs };
      await submitAllocation(payload);
      setMessage('Yatırım tercihleriniz kaydedildi.');
      window.location.reload();
    } catch (e) {
      setMessage('Yatırım tercihleriniz kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const disabledReason = !canTrade ? 'Allocation window is closed' : (total !== 100 ? 'Weights must total 100%' : '');

  const PairSelect = ({ value, onChange, disabledList = [] }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [cat, setCat] = useState('Tümü');
    const ref = useRef(null);

    const categories = useMemo(() => {
      const set = new Set(pairOptions.map(p => p.category));
      return ['Tümü', ...Array.from(set)];
    }, []);

    const filtered = useMemo(() => {
      const q = query.trim().toLowerCase();
      return pairOptions.filter(p => {
        const byCat = cat === 'Tümü' || p.categoryName === cat;
        const byQuery = !q || 
          p.symbol.toLowerCase().includes(q) || 
          p.name.toLowerCase().includes(q) ||
          p.fullName.toLowerCase().includes(q);
        return byCat && byQuery;
      });
    }, [pairOptions, cat, query]);

    useEffect(() => {
      const onDocClick = (e) => {
        if (!ref.current) return;
        if (!ref.current.contains(e.target)) setOpen(false);
      };
      document.addEventListener('mousedown', onDocClick);
      return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    const current = pairOptions.find(p => p.symbol === value);

    return (
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          style={{
            width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 12, border: '1px solid #ced4da',
            background: '#fff', cursor: 'pointer', color: '#1a1a1a', fontWeight: 400, fontSize: 15
          }}
        >
          {current ? current.symbol : 'Pair seçiniz'}
        </button>
        {open && (
          <div style={{ marginTop: 8, background: '#fff', border: '1px solid #e9ecef', borderRadius: 12, boxShadow: '0 8px 20px rgba(0,0,0,.06)', padding: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {categories.map(c => (
                <button key={c} type="button" onClick={() => setCat(c)}
                  style={{ padding: '8px 12px', borderRadius: 999, border: '1px solid ' + (cat === c ? '#0d6efd' : '#e9ecef'), background: cat === c ? '#e7f1ff' : '#fff', color: cat === c ? '#0d6efd' : '#495057', fontWeight: 700, fontSize: 13 }}
                >{c}</button>
              ))}
            </div>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <input type="text" placeholder="Ara (sembol / isim)" value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #e9ecef', fontSize: 15 }} />
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {filtered.map(opt => {
                const isDisabled = disabledList.includes(opt.symbol);
                return (
                  <button key={opt.symbol} type="button" disabled={isDisabled}
                    onClick={() => { if (!isDisabled) { onChange(opt.symbol); setOpen(false); } }}
                    style={{ width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 12, border: '1px solid #f1f3f5', background: '#fff', marginBottom: 8, color: isDisabled ? '#adb5bd' : '#212529', cursor: isDisabled ? 'not-allowed' : 'pointer', fontSize: 15 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{opt.symbol} — <span style={{ fontWeight: 600, color: '#6c757d', fontSize: 14 }}>{opt.name}</span></div>
                      <span style={{ fontSize: 13, color: '#0d6efd', background: '#e7f1ff', borderRadius: 999, padding: '6px 10px' }}>{opt.category}</span>
                    </div>
                  </button>
                );
              })}
              {!filtered.length && (
                <div style={{ color: '#6c757d', fontSize: 13, padding: 8 }}>Sonuç bulunamadı</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
          <button
            type="button"
            onClick={() => canTrade && setExpanded(v => !v)}
            disabled={!canTrade}
            title={!canTrade ? 'Opens when trading window is open' : ''}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '14px 28px',
              width: '100%',
              borderRadius: 18,
              border: 'none',
              background: canTrade ? 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)' : '#e9ecef',
              color: canTrade ? '#ffffff' : '#6c757d',
              fontWeight: 800,
              fontSize: 18,
              boxShadow: canTrade ? '0 12px 24px rgba(29, 78, 216, 0.25)' : 'none',
              cursor: canTrade ? 'pointer' : 'not-allowed'
            }}
          >
            Yatırım Yap
          </button>
          {!canTrade && (
            <>
              <button
                type="button"
                onClick={() => setShowInstruments(true)}
                aria-label="Kullanılabilir enstrümanlar"
                title="Yatırım yapılabilir enstrümanları gör"
                style={{
                  position: 'absolute',
                  right: 42,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: '1px solid #ced4da',
                  background: '#ffffff',
                  color: '#16a34a',
                  fontWeight: 800,
                  fontSize: 16,
                  lineHeight: '26px',
                  textAlign: 'center',
                  cursor: 'pointer'
                }}
              >
                📊
              </button>
              <button
                type="button"
                onClick={() => setShowHelp(true)}
                aria-label="Yatırım penceresi bilgisi"
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: '1px solid #ced4da',
                  background: '#ffffff',
                  color: '#0d6efd',
                  fontWeight: 800,
                  fontSize: 14,
                  lineHeight: '26px',
                  textAlign: 'center',
                  cursor: 'pointer'
                }}
              >
                ?
              </button>
            </>
          )}
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: 10, border: '1px solid #e9ecef', borderRadius: 16, padding: 12 }}>
          {loading ? (
            <p style={{ color: '#6c757d' }}>Loading…</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {rows.map((r, idx) => (
                <>
                  <div key={`row_${idx}`} style={{ display: 'grid', gridTemplateColumns: '1fr 140px auto', gap: 8, alignItems: 'center', border: '1px solid #edf2f7', borderRadius: 12, padding: 12 }}>
                    <button
                      type="button"
                      onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                      style={{ width: '100%', textAlign: 'left', display: 'inline-flex', alignItems: 'center', height: 44, padding: '0 14px', borderRadius: 12, border: '1px solid #ced4da', background: '#fff', cursor: 'pointer', color: '#1a1a1a', fontWeight: 400, fontSize: 15 }}
                    >
                      {r.symbol || 'Pair seçiniz'}
                    </button>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={r.weight}
                      onChange={e => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        const v = raw === '' ? '' : String(Math.max(0, Math.min(100, Number(raw))));
                        setRows(prev => prev.map((x, i) => i === idx ? { ...x, weight: v } : x));
                      }}
                      style={{ width: 100, height: 44, padding: '0 28px 0 12px', borderRadius: 12, border: '1px solid #ced4da', fontSize: 16 }}
                    />
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#6c757d', fontSize: 12 }}>%</span>
                  </div>
                  <button type="button" className="btn-chip ghost" style={{ alignSelf: 'center' }} onClick={() => setRows(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)} disabled={rows.length <= 1}>Kaldır</button>
                </div>
                {openIdx === idx && (
                  <div style={{ gridColumn: '1 / -1', marginTop: 8, background: '#fff', border: '1px solid #e9ecef', borderRadius: 12, boxShadow: '0 8px 20px rgba(0,0,0,.06)', padding: 12 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                      {categories.map(c => (
                        <button key={c} type="button" onClick={() => setCat(c)}
                          style={{ padding: '8px 12px', borderRadius: 999, border: '1px solid ' + (cat === c ? '#0d6efd' : '#e9ecef'), background: cat === c ? '#e7f1ff' : '#fff', color: cat === c ? '#0d6efd' : '#495057', fontWeight: 700, fontSize: 13 }}
                        >{c}</button>
                      ))}
                    </div>
                    <div style={{ position: 'relative', marginBottom: 10 }}>
                      <input type="text" placeholder="Ara (sembol / isim)" value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #e9ecef', fontSize: 16 }} />
                    </div>
                    <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                      {pairOptions.filter(p => {
                        const byCat = cat === 'Tümü' || p.categoryName === cat;
                        const q = query.toLowerCase();
                        const byQuery = !q || p.symbol.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || p.fullName.toLowerCase().includes(q);
                        return byCat && byQuery;
                      }).map(opt => {
                        const isDisabled = rows.some((x, i) => i !== idx && x.symbol === opt.symbol);
                        return (
                          <button key={opt.symbol} type="button" disabled={isDisabled}
                            onClick={() => { if (!isDisabled) { setRows(prev => prev.map((x, i) => i === idx ? { ...x, symbol: opt.symbol } : x)); setOpenIdx(null); } }}
                            style={{ width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 12, border: '1px solid #f1f3f5', background: '#fff', marginBottom: 8, color: isDisabled ? '#adb5bd' : '#212529', cursor: isDisabled ? 'not-allowed' : 'pointer', fontSize: 15 }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 2 }}>
                                  {opt.categoryIcon} {opt.symbol} — {opt.name}
                                </div>
                                <div style={{ fontWeight: 500, color: '#6c757d', fontSize: 12 }}>
                                  {opt.fullName} • {opt.currency}
                                </div>
                              </div>
                              <span style={{ fontSize: 11, color: '#0d6efd', background: '#e7f1ff', borderRadius: 999, padding: '4px 8px', whiteSpace: 'nowrap' }}>
                                {opt.source.toUpperCase()}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                </>
              ))}
              <div>
                <button type="button" className="btn-chip" onClick={() => {
                  const remaining = pairOptions.find(p => !rows.some(r => r.symbol === p.symbol));
                  if (remaining) setRows(prev => [...prev, { symbol: remaining.symbol, weight: '' }]);
                }} disabled={rows.length >= pairOptions.length}>+ Ekle</button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#6c757d', fontSize: 12 }}>{!canSave ? disabledReason : ''}</span>
                <button className={`btn-chip ${canSave ? 'primary' : 'ghost'}`} disabled={!canSave} onClick={onSave}>
                  {saving ? 'Kaydediliyor…' : (hasExisting ? 'Yatırım Güncelle' : 'Yatırım Kaydet')}
                </button>
              </div>
              {message && <div style={{ gridColumn: '1 / -1', color: '#16a34a', fontSize: 12 }}>{message}</div>}
            </div>
          )}
        </div>
      )}
      {saving && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 14, boxShadow: '0 12px 28px rgba(0,0,0,.25)', minWidth: 280, textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, margin: '0 auto 12px', border: '4px solid #e9ecef', borderTopColor: '#0d6efd', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <div style={{ fontWeight: 800, marginBottom: 4 }}>Yükleniyor…</div>
            <div style={{ color: '#6c757d' }}>Tercihleriniz kaydediliyor</div>
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {showHelp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100 }}>
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 14, boxShadow: '0 12px 28px rgba(0,0,0,.25)', minWidth: 280, textAlign: 'center', maxWidth: 360 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Yatırım Penceresi</div>
            <div style={{ color: '#6c757d', fontSize: 14, marginBottom: 12 }}>
              Yatırım yapma penceresi Cuma 23:58 (TRT) itibarıyla açılır ve Pazar 23:00 (TRT) saatinde kapanır.
            </div>
            <button type="button" className="btn-chip primary" onClick={() => setShowHelp(false)}>Tamam</button>
          </div>
        </div>
      )}
      {showInstruments && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100, padding: 16 }}
          onClick={() => setShowInstruments(false)}
        >
          <div 
            style={{ 
              background: '#ffffff', 
              borderRadius: 16, 
              boxShadow: '0 12px 28px rgba(0,0,0,.25)', 
              width: '100%',
              maxWidth: 500,
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>📊 Yatırım Yapılabilir Enstrümanlar</div>
              <button 
                type="button" 
                onClick={() => setShowInstruments(false)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: 24, 
                  color: '#6c757d', 
                  cursor: 'pointer',
                  padding: 0,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
            
            {/* Content */}
            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
              <div style={{ color: '#6c757d', fontSize: 14, marginBottom: 16 }}>
                Normal zamanda yatırım yapabileceğiniz {pairOptions.length} enstrüman:
              </div>
              
              {/* Group by category */}
              {categories.filter(c => c !== 'Tümü').map(categoryName => {
                const categoryInstruments = pairOptions.filter(p => p.categoryName === categoryName);
                if (categoryInstruments.length === 0) return null;
                
                return (
                  <div key={categoryName} style={{ marginBottom: 20 }}>
                    <div style={{ 
                      fontWeight: 700, 
                      fontSize: 14, 
                      color: '#1f2937', 
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}>
                      {categoryInstruments[0].categoryIcon} {categoryName}
                    </div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {categoryInstruments.map(inst => (
                        <div 
                          key={inst.symbol}
                          style={{
                            padding: '10px 12px',
                            background: '#f9fafb',
                            borderRadius: 10,
                            border: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                              {inst.symbol} — {inst.name}
                            </div>
                            <div style={{ fontSize: 11, color: '#6c757d' }}>
                              {inst.currency}
                            </div>
                          </div>
                          <div style={{ 
                            fontSize: 10, 
                            color: '#0d6efd', 
                            background: '#e7f1ff', 
                            padding: '3px 8px', 
                            borderRadius: 12,
                            fontWeight: 600
                          }}>
                            {inst.source.toUpperCase()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e9ecef', textAlign: 'center' }}>
              <button 
                type="button" 
                className="btn-chip primary" 
                onClick={() => setShowInstruments(false)}
                style={{ width: '100%' }}
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default InlineAllocationBox;


