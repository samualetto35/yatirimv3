import { useEffect, useRef } from 'react';

const TVEconomicCalendar = () => {
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
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
    script.innerHTML = JSON.stringify({
      colorTheme: 'light',
      isTransparent: true,
      locale: 'tr',
      countryFilter: 'tr',
      importanceFilter: '-1,0,1',
      width: '100%',
      height: '520'
    });
    ref.current.appendChild(script);
    return () => {
      if (ref.current) ref.current.innerHTML = '';
    };
  }, []);

  return (
    <div className="info-card mt-card no-sticky" style={{ overflow: 'hidden' }}>
      <h3>Türkiye Finans Takvimi</h3>
      <div className="tradingview-widget-container" ref={ref} />
    </div>
  );
};

export default TVEconomicCalendar;


