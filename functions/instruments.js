/**
 * Investment Instruments Configuration
 * Defines all available instruments with their data sources
 */

// Yahoo Finance instruments (can be fetched directly)
const YAHOO_INSTRUMENTS = {
  // BIST Indices (Turkish Stock Exchange)
  'XU100': {
    ticker: 'XU100.IS',
    name: 'BIST 100',
    currency: 'TRY',
    category: 'borsa',
    source: 'yahoo'
  },
  'XU030': {
    ticker: 'XU030.IS',
    name: 'BIST 30',
    currency: 'TRY',
    category: 'borsa',
    source: 'yahoo'
  },
  'XU050': {
    ticker: 'XU050.IS',
    name: 'BIST 50',
    currency: 'TRY',
    category: 'borsa',
    source: 'yahoo',
    note: 'XU500 Yahoo\'da yok, XU050 kullanılıyor'
  },
  'XBANK': {
    ticker: 'XBANK.IS',
    name: 'BIST Banka',
    currency: 'TRY',
    category: 'borsa',
    source: 'yahoo'
  },
  'XUSIN': {
    ticker: 'XUSIN.IS',
    name: 'BIST Sanayi',
    currency: 'TRY',
    category: 'borsa',
    source: 'yahoo'
  },

  // Forex
  'USDTRY': {
    ticker: 'TRY=X',
    name: 'USD/TRY',
    currency: 'TRY',
    category: 'doviz',
    source: 'yahoo',
    note: 'TRY=X returns USD price in TRY'
  },
  'EURTRY': {
    ticker: 'EURTRY=X',
    name: 'EUR/TRY',
    currency: 'TRY',
    category: 'doviz',
    source: 'yahoo'
  },

  // Precious Metals (in USD per ounce)
  'XAU': {
    ticker: 'GC=F',
    name: 'Altın (Ons)',
    currency: 'USD',
    category: '귀금속',
    source: 'yahoo',
    unit: 'ounce',
    note: 'Gold futures, needs conversion to gram via USDTRY'
  },
  'XAG': {
    ticker: 'SI=F',
    name: 'Gümüş (Ons)',
    currency: 'USD',
    category: 'emtia',
    source: 'yahoo',
    unit: 'ounce',
    note: 'Silver futures, needs conversion to gram via USDTRY'
  },

  // Crypto
  'BTC': {
    ticker: 'BTC-USD',
    name: 'Bitcoin',
    currency: 'USD',
    category: 'kripto',
    source: 'yahoo'
  },
  'ETH': {
    ticker: 'ETH-USD',
    name: 'Ethereum',
    currency: 'USD',
    category: 'kripto',
    source: 'yahoo'
  },
  'XRP': {
    ticker: 'XRP-USD',
    name: 'Ripple',
    currency: 'USD',
    category: 'kripto',
    source: 'yahoo'
  },

  // International Indices (proxies via ETFs)
  'SPX': {
    ticker: 'SPY',
    name: 'S&P 500 (Amerika)',
    currency: 'USD',
    category: 'yabanci_hisse',
    source: 'yahoo',
    note: 'SPY ETF as proxy for S&P 500'
  },
  'STOXX': {
    ticker: 'EZU',
    name: 'Euro Stoxx 50 (Avrupa)',
    currency: 'USD',
    category: 'yabanci_hisse',
    source: 'yahoo',
    note: 'EZU ETF as proxy for Euro Stoxx 50'
  },

  // Legacy (keep for backward compatibility)
  'TSLA': {
    ticker: 'TSLA',
    name: 'Tesla',
    currency: 'USD',
    category: 'hisse',
    source: 'yahoo'
  },
  'AAPL': {
    ticker: 'AAPL',
    name: 'Apple',
    currency: 'USD',
    category: 'hisse',
    source: 'yahoo'
  }
};

// TEFAS instruments (Turkish funds - requires web scraping or alternative API)
const TEFAS_INSTRUMENTS = {
  // Para Piyasası Fonları
  'NVB': {
    code: 'NVB',
    name: 'NEO PORTFÖY İKİNCİ PARA PİYASASI (TL) FON',
    currency: 'TRY',
    category: 'para_piyasasi',
    source: 'tefas'
  },
  'DCB': {
    code: 'DCB',
    name: 'DENİZ PORTFÖY PARA PİYASASI SERBEST (TL) FON',
    currency: 'TRY',
    category: 'para_piyasasi',
    source: 'tefas'
  },

  // Arbitraj Fonu
  'HDA': {
    code: 'HDA',
    name: 'HEDEF PORTFÖY DÖRDÜNCÜ İSTATİSTİKSEL ARBİTRAJ HİSSE SENEDİ FONU',
    currency: 'TRY',
    category: 'arbitraj',
    source: 'tefas'
  },

  // Borçlanma Araçları
  'AHU': {
    code: 'AHU',
    name: 'ATLAS PORTFÖY BİRİNCİ ÖZEL SEKTÖR BORÇLANMA ARAÇLARI FONU',
    currency: 'TRY',
    category: 'borclanma',
    source: 'tefas'
  },
  'FPK': {
    code: 'FPK',
    name: 'FİBA PORTFÖY KISA VADELİ BORÇLANMA ARAÇLARI (TL) FONU',
    currency: 'TRY',
    category: 'borclanma',
    source: 'tefas'
  },
  'APT': {
    code: 'APT',
    name: 'AK PORTFÖY ORTA VADELİ BORÇLANMA ARAÇLARI FONU',
    currency: 'TRY',
    category: 'borclanma',
    source: 'tefas'
  },
  'GUV': {
    code: 'GUV',
    name: 'GARANTI PORTFÖY UZUN VADELİ BORÇLANMA ARAÇLARI FONU',
    currency: 'TRY',
    category: 'borclanma',
    source: 'tefas'
  },

  // Altın Fonu
  'YKT': {
    code: 'YKT',
    name: 'YAPI KREDİ PORTFÖY ALTIN FONU',
    currency: 'TRY',
    category: 'altin',
    source: 'tefas'
  },

  // Döviz Fonu
  'DAS': {
    code: 'DAS',
    name: 'DENİZ PORTFÖY ONİKİNCİ SERBEST (DÖVİZ) FON',
    currency: 'TRY',
    category: 'doviz_fonu',
    source: 'tefas'
  },

  // Gümüş Fonu
  'DMG': {
    code: 'DMG',
    name: 'DENİZ PORTFÖY GÜMÜŞ FON SEPETİ FONU',
    currency: 'TRY',
    category: 'gumus',
    source: 'tefas'
  },

  // Eurobond Fonu
  'YBE': {
    code: 'YBE',
    name: 'YAPI KREDİ PORTFÖY EUROBOND (DOLAR) BORÇLANMA ARAÇLARI FONU',
    currency: 'USD',
    category: 'eurobond',
    source: 'tefas'
  },

  // Yabancı Hisse Fonları
  'AFA': {
    code: 'AFA',
    name: 'AK PORTFÖY AMERİKA YABANCI HİSSE SENEDİ FONU',
    currency: 'USD',
    category: 'yabanci_hisse_fonu',
    source: 'tefas'
  },
  'AFV': {
    code: 'AFV',
    name: 'AK PORTFÖY AVRUPA YABANCI HİSSE SENEDİ FONU',
    currency: 'EUR',
    category: 'yabanci_hisse_fonu',
    source: 'tefas'
  }
};

// Missing instruments (need alternative sources or will be excluded)
const MISSING_INSTRUMENTS = {
  'XTM25': {
    name: 'BIST Temettü 25',
    currency: 'TRY',
    category: 'borsa',
    status: 'unavailable',
    note: 'Not available on Yahoo Finance, need BIST API or alternative'
  }
};

// Helper functions
function getAllYahooTickers() {
  return Object.keys(YAHOO_INSTRUMENTS).map(key => ({
    code: key,
    ...YAHOO_INSTRUMENTS[key]
  }));
}

function getAllTefasCodes() {
  return Object.keys(TEFAS_INSTRUMENTS).map(key => ({
    code: key,
    ...TEFAS_INSTRUMENTS[key]
  }));
}

function getAllInstruments() {
  return {
    yahoo: getAllYahooTickers(),
    tefas: getAllTefasCodes(),
    missing: Object.keys(MISSING_INSTRUMENTS).map(key => ({
      code: key,
      ...MISSING_INSTRUMENTS[key]
    }))
  };
}

function getInstrumentByCode(code) {
  return YAHOO_INSTRUMENTS[code] || TEFAS_INSTRUMENTS[code] || MISSING_INSTRUMENTS[code] || null;
}

module.exports = {
  YAHOO_INSTRUMENTS,
  TEFAS_INSTRUMENTS,
  MISSING_INSTRUMENTS,
  getAllYahooTickers,
  getAllTefasCodes,
  getAllInstruments,
  getInstrumentByCode
};

