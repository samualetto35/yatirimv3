import { useMemo } from 'react';

const LeaderboardFilterBar = ({ selected, onSelect, search, onSearch }) => {
  const items = useMemo(() => ([
    { key: 'latest', label: 'Son Hafta' },
    { key: 'overall', label: 'Portföy Büyüklüğü' },
    { key: 'month', label: 'Son 4 Hafta' },
    { key: 'byweek', label: 'Haftaya Göre' },
    { key: 'winrate', label: 'WinRate' },
  ]), []);

  const handleSelect = (k) => {
    // If winrate not implemented yet, fall back to latest to avoid empty state
    if (k === 'winrate') {
      onSelect?.('latest');
    } else {
      onSelect?.(k);
    }
  };

  return (
    <div className="info-card" style={{ marginTop: 12 }}>
      <h3 style={{ fontSize: '1.05rem' }}>Sıralama</h3>
      <div className="pill-tabs" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {items.map(it => (
          <button
            key={it.key}
            type="button"
            className={`chip-tab ${selected === it.key ? 'active' : ''}`}
            onClick={() => handleSelect(it.key)}
          >
            {it.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <input
          type="text"
          placeholder="Kullanıcı adı ara…"
          value={search}
          onChange={(e) => onSearch?.(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 16, border: '1px solid #ced4da', fontSize: 14 }}
        />
      </div>
    </div>
  );
};

export default LeaderboardFilterBar;


