import { useEffect, useMemo, useRef, useState } from 'react';
import { getActiveOrUpcomingWeek } from '../services/weekService';
import { submitAllocation, getUserAllocationForWeek } from '../services/allocationService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { getEnabledInstruments, INSTRUMENT_CATEGORIES, formatInstrument } from '../config/instruments';

const numberOrZero = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const AllocationForm = () => {
  const { currentUser } = useAuth();
  const [week, setWeek] = useState(null);
  const [rows, setRows] = useState([
    { symbol: 'XU100', weight: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState(null);
  
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

  useEffect(() => {
    (async () => {
      const w = await getActiveOrUpcomingWeek();
      setWeek(w || null);
      if (w && currentUser) {
        const cur = await getUserAllocationForWeek(w.id, currentUser.uid);
        if (cur) {
          setExisting(cur);
          const next = [];
          pairOptions.forEach((opt) => {
            const s = opt.symbol;
            const v = Number(cur.pairs?.[s] || 0);
            if (v > 0) next.push({ symbol: s, weight: String(Math.round(v * 100)) });
          });
          setRows(next.length ? next : [{ symbol: 'XU100', weight: '' }]);
        }
      }
    })();
  }, [currentUser]);

  const total = useMemo(() => rows.reduce((acc, r) => acc + numberOrZero(r.weight), 0), [rows]);
  const disabled = !week || week.status !== 'open' || total !== 100 || submitting;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (disabled) return;
    setSubmitting(true);
    try {
      const pairs = rows.reduce((map, r) => {
        const w = Number((numberOrZero(r.weight) / 100).toFixed(4));
        if (w > 0) map[r.symbol] = w;
        return map;
      }, {});
      await submitAllocation({ weekId: week.id, pairs });
      toast.success('Allocation submitted!');
      window.location.reload();
    } catch (err) {
      toast.error(err.message || 'Failed to submit allocation');
    } finally {
      setSubmitting(false);
    }
  };

  const PairSelect = ({ value, onChange, disabledList = [] }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [cat, setCat] = useState('Tümü');
    const ref = useRef(null);

    const categories = useMemo(() => {
      const set = new Set(pairOptions.map(p => p.categoryName));
      return ['Tümü', ...Array.from(set).sort()];
    }, [pairOptions]);

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
            width: '100%',
            textAlign: 'left',
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px solid #ced4da',
            background: '#fff',
            cursor: 'pointer',
            color: '#1a1a1a',
            fontWeight: 400,
            fontSize: 15
          }}
        >
          {current ? current.symbol : 'Pair seçiniz'}
        </button>
        {open && (
          <div style={{ position: 'fixed', zIndex: 50, top: '12vh', left: '50%', transform: 'translateX(-50%)', background: '#fff', border: '1px solid #e9ecef', borderRadius: 14, boxShadow: '0 16px 40px rgba(0,0,0,.10)', padding: 14, width: 'clamp(260px, calc(100vw - 48px), 600px)' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {categories.map(c => (
                <button key={c} type="button" onClick={() => setCat(c)}
                  style={{
                    padding: '8px 12px', borderRadius: 999, border: '1px solid ' + (cat === c ? '#0d6efd' : '#e9ecef'),
                    background: cat === c ? '#e7f1ff' : '#fff', color: cat === c ? '#0d6efd' : '#495057', fontWeight: 700, fontSize: 13
                  }}
                >{c}</button>
              ))}
            </div>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <input
                type="text"
                placeholder="Ara (sembol / isim)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #e9ecef', fontSize: 16 }}
              />
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {filtered.map(opt => {
                const isDisabled = disabledList.includes(opt.symbol);
                return (
                  <button
                    key={opt.symbol}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => { if (!isDisabled) { onChange(opt.symbol); setOpen(false); } }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '12px 14px',
                      borderRadius: 12, border: '1px solid #f1f3f5', background: '#fff',
                      marginBottom: 8, color: isDisabled ? '#adb5bd' : '#212529', cursor: isDisabled ? 'not-allowed' : 'pointer', fontSize: 15
                    }}
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
              {!filtered.length && (
                <div style={{ color: '#6c757d', fontSize: 13, padding: 8 }}>Sonuç bulunamadı</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!week) return null;

  return (
    <div className="info-card" style={{ marginTop: '0.1rem' }}>
      <h3>Weekly Allocation</h3>
      {week.status !== 'open' ? (
        <p style={{ color: '#6c757d' }}>Allocation window is not open.</p>
      ) : (
        <form onSubmit={onSubmit} className="auth-form">
          {existing && (
            <div style={{ 
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', 
              borderRadius: 12, 
              padding: '12px 16px', 
              border: '1px solid #93c5fd',
              marginBottom: 16
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1e40af' }}>You have an existing allocation</div>
              <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 4 }}>Submitting will completely replace your previous selection.</div>
            </div>
          )}
          {rows.map((row, idx) => (
            <div key={`row_${idx}`} className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 140px auto', gap: 10, alignItems: 'start' }}>
              <PairSelect
                value={row.symbol}
                onChange={(v) => setRows(prev => prev.map((r, i) => i === idx ? { ...r, symbol: v } : r))}
                disabledList={rows.filter((_, i) => i !== idx).map(r => r.symbol)}
              />
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={row.weight}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    const v = raw === '' ? '' : String(Math.max(0, Math.min(100, Number(raw))));
                    setRows(prev => prev.map((r, i) => i === idx ? { ...r, weight: v } : r));
                  }}
                  style={{ width: '100%', padding: '8px 28px 8px 10px', borderRadius: 12, border: '1px solid #ced4da', fontSize: 16 }}
                />
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#6c757d', fontSize: 12 }}>%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-chip ghost"
                  onClick={() => setRows(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)}
                  disabled={rows.length <= 1}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 8 }}>
            <button
              type="button"
              className="btn-chip"
              onClick={() => {
                const available = pairOptions.find(p => !rows.some(r => r.symbol === p.symbol));
                if (available) setRows(prev => [...prev, { symbol: available.symbol, weight: '' }]);
              }}
              disabled={rows.length >= pairOptions.length}
            >
              + Add Pair
            </button>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '12px 16px', 
            borderRadius: 12,
            background: total === 100 ? '#f0fdf4' : (total > 100 ? '#fef2f2' : '#fffbeb'),
            border: `1px solid ${total === 100 ? '#bbf7d0' : (total > 100 ? '#fecaca' : '#fde68a')}`,
            marginTop: 12
          }}>
            <span style={{ color: total !== 100 ? '#dc3545' : '#16a34a', fontWeight: 600 }}>Total: {total}%</span>
            <span style={{ fontSize: 12, color: '#6c757d' }}>{total === 100 ? 'Ready to submit' : 'Must equal 100%'}</span>
          </div>
          <button type="submit" className="btn btn-primary" disabled={disabled} style={{ marginTop: 12, width: '100%' }}>{submitting ? 'Submitting...' : (existing ? 'Replace Allocation' : 'Submit Allocation')}</button>
        </form>
      )}
      {submitting && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: '#ffffff', padding: 20, borderRadius: 14, boxShadow: '0 12px 28px rgba(0,0,0,.25)', minWidth: 280, textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, margin: '0 auto 12px', border: '4px solid #e9ecef', borderTopColor: '#0d6efd', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <div style={{ fontWeight: 800, marginBottom: 4 }}>Yükleniyor…</div>
            <div style={{ color: '#6c757d' }}>Tercihleriniz kaydediliyor</div>
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
};

export default AllocationForm;


