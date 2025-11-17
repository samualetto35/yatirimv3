import { useEffect, useRef } from 'react';

const TVTickerTape = () => {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'tradingview-widget-container__widget';
    ref.current.appendChild(container);
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: 'BITSTAMP:BTCUSD', title: 'Bitcoin' },
        { proName: 'BINANCE:BTCTRY', title: 'BTCTRY' },
        { proName: 'FX:EURTRY', title: 'EURTRY' },
        { proName: 'FX:USDTRY', title: 'USDTRY' },
        { proName: 'FX_IDC:XAUTRY', title: 'GOLDTRY' },
      ],
      colorTheme: 'light',
      locale: 'tr',
      largeChartUrl: '',
      isTransparent: true,
      showSymbolLogo: true,
      displayMode: 'adaptive',
    });
    ref.current.appendChild(script);
    return () => {
      // Cleanup: remove widget container to avoid null querySelector errors in re-mounts
      if (ref.current) ref.current.innerHTML = '';
    };
  }, []);

  return (
    <div className="info-card no-frame" style={{ overflow: 'hidden', paddingTop: 0, marginBottom: 8 }}>
      <div className="tradingview-widget-container" ref={ref} />
    </div>
  );
};

export default TVTickerTape;


