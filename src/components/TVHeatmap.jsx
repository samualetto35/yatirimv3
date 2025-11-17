import { useEffect, useRef } from 'react';

const TVHeatmap = () => {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    // Clean previous widget if any
    ref.current.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'tradingview-widget-container__widget';
    ref.current.appendChild(container);
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js';
    script.innerHTML = JSON.stringify({
      dataSource: 'Crypto',
      blockSize: 'market_cap_calc',
      blockColor: '24h_close_change|5',
      locale: 'tr',
      symbolUrl: '',
      colorTheme: 'light',
      hasTopBar: false,
      isDataSetEnabled: false,
      isZoomEnabled: false,
      hasSymbolTooltip: true,
      isMonoSize: false,
      width: '100%',
      height: '480'
    });
    ref.current.appendChild(script);
  }, []);

  return (
    <div className="info-card no-frame" style={{ overflow: 'hidden' }}>
      <h3>Kripto Isı Haritası - 24 saat</h3>
      <div className="tradingview-widget-container" ref={ref} />
    </div>
  );
};

export default TVHeatmap;


