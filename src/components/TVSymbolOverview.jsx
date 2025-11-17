import { useEffect, useRef } from 'react';

const TVSymbolOverview = () => {
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
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';
    script.innerHTML = JSON.stringify({
      lineWidth: 2,
      lineType: 0,
      chartType: 'area',
      fontColor: 'rgb(106, 109, 120)',
      gridLineColor: 'rgba(46, 46, 46, 0.06)',
      volumeUpColor: 'rgba(34, 171, 148, 0.5)',
      volumeDownColor: 'rgba(247, 82, 95, 0.5)',
      backgroundColor: '#ffffff',
      widgetFontColor: '#0F0F0F',
      upColor: '#22ab94',
      downColor: '#f7525f',
      borderUpColor: '#22ab94',
      borderDownColor: '#f7525f',
      wickUpColor: '#22ab94',
      wickDownColor: '#f7525f',
      colorTheme: 'light',
      isTransparent: true,
      locale: 'tr',
      chartOnly: false,
      scalePosition: 'right',
      scaleMode: 'Normal',
      fontFamily: '-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif',
      valuesTracking: '1',
      changeMode: 'price-and-percent',
      symbols: [
        ['OANDA:XAUUSD|1D'],
        ['FX_IDC:XAUTRY|1D'],
        ['BITSTAMP:BTCUSD|1D'],
        ['BINANCE:BTCTRY|1D'],
        ['FX:USDTRY|1D'],
        ['FX:EURTRY|1D'],
        ['BINANCE:ETHUSDT|1D'],
        ['BITSTAMP:XRPUSD|1D']
      ],
      dateRanges: ['1d|1', '1w|15', '1m|30', '3m|60', '12m|1D', '60m|1W', 'all|1M'],
      fontSize: '10',
      headerFontSize: 'medium',
      autosize: true,
      width: '100%',
      height: '420',
      noTimeScale: false,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false
    });
    ref.current.appendChild(script);
  }, []);

  return (
    <div className="info-card no-frame" style={{ overflow: 'hidden' }}>
      <div className="tradingview-widget-container" ref={ref} />
    </div>
  );
};

export default TVSymbolOverview;



