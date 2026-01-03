/**
 * Investment Instruments Configuration
 * Shared configuration for all available trading instruments
 * Synchronized with backend (functions/instruments.js)
 */

export const INSTRUMENT_CATEGORIES = {
  borsa: { name: 'Borsa (BIST)', icon: '📈', order: 1 },
  doviz: { name: 'Döviz', icon: '💱', order: 2 },
  kripto: { name: 'Kripto', icon: '₿', order: 3 },
  emtia: { name: 'Emtia &귀금속', icon: '🥇', order: 4 },
  yabanci_hisse: { name: 'Yabancı Endeksler', icon: '🌍', order: 5 },
  para_piyasasi: { name: 'Para Piyasası Fonları', icon: '💰', order: 6 },
  borclanma: { name: 'Borçlanma Araçları', icon: '📊', order: 7 },
  altin: { name: 'Altın Fonları', icon: '🏆', order: 8 },
  gumus: { name: 'Gümüş Fonları', icon: '🥈', order: 9 },
  doviz_fonu: { name: 'Döviz Fonları', icon: '💵', order: 10 },
  eurobond: { name: 'Eurobond Fonları', icon: '🌐', order: 11 },
  yabanci_hisse_fonu: { name: 'Yabancı Hisse Fonları', icon: '🗺️', order: 12 },
  arbitraj: { name: 'Arbitraj Fonları', icon: '⚖️', order: 13 },
  hisse: { name: 'Hisse Senetleri (Legacy)', icon: '📉', order: 99 },
};

// All available instruments
export const INSTRUMENTS = [
  // ============================================
  // YAHOO FINANCE INSTRUMENTS
  // ============================================
  
  // BIST Indices
  {
    code: 'XU100',
    name: 'BIST 100',
    fullName: 'Borsa İstanbul 100 Endeksi',
    category: 'borsa',
    currency: 'TRY',
    source: 'yahoo',
    ticker: 'XU100.IS',
    enabled: true,
    popular: true,
  },
  {
    code: 'XU030',
    name: 'BIST 30',
    fullName: 'Borsa İstanbul 30 Endeksi',
    category: 'borsa',
    currency: 'TRY',
    source: 'yahoo',
    ticker: 'XU030.IS',
    enabled: true,
  },
  {
    code: 'XU050',
    name: 'BIST 50',
    fullName: 'Borsa İstanbul 50 Endeksi',
    category: 'borsa',
    currency: 'TRY',
    source: 'yahoo',
    ticker: 'XU050.IS',
    enabled: true,
  },
  {
    code: 'XBANK',
    name: 'BIST Banka',
    fullName: 'Borsa İstanbul Banka Endeksi',
    category: 'borsa',
    currency: 'TRY',
    source: 'yahoo',
    ticker: 'XBANK.IS',
    enabled: true,
  },
  {
    code: 'XUSIN',
    name: 'BIST Sanayi',
    fullName: 'Borsa İstanbul Sanayi Endeksi',
    category: 'borsa',
    currency: 'TRY',
    source: 'yahoo',
    ticker: 'XUSIN.IS',
    enabled: true,
  },

  // Forex
  {
    code: 'USDTRY',
    name: 'USD/TRY',
    fullName: 'Amerikan Doları / Türk Lirası',
    category: 'doviz',
    currency: 'TRY',
    source: 'yahoo',
    ticker: 'TRY=X',
    enabled: true,
    popular: true,
  },
  {
    code: 'EURTRY',
    name: 'EUR/TRY',
    fullName: 'Euro / Türk Lirası',
    category: 'doviz',
    currency: 'TRY',
    source: 'yahoo',
    ticker: 'EURTRY=X',
    enabled: true,
    popular: true,
  },

  // Precious Metals (Futures)
  {
    code: 'XAU',
    name: 'Altın',
    fullName: 'Altın (Ons)',
    category: 'emtia',
    currency: 'USD',
    source: 'yahoo',
    ticker: 'GC=F',
    enabled: true,
    popular: true,
    note: 'Gold futures in USD per ounce',
  },
  {
    code: 'XAG',
    name: 'Gümüş',
    fullName: 'Gümüş (Ons)',
    category: 'emtia',
    currency: 'USD',
    source: 'yahoo',
    ticker: 'SI=F',
    enabled: true,
    note: 'Silver futures in USD per ounce',
  },

  // Cryptocurrency
  {
    code: 'BTC',
    name: 'Bitcoin',
    fullName: 'Bitcoin (BTC)',
    category: 'kripto',
    currency: 'USD',
    source: 'yahoo',
    ticker: 'BTC-USD',
    enabled: true,
    popular: true,
  },
  {
    code: 'ETH',
    name: 'Ethereum',
    fullName: 'Ethereum (ETH)',
    category: 'kripto',
    currency: 'USD',
    source: 'yahoo',
    ticker: 'ETH-USD',
    enabled: true,
    popular: true,
  },
  {
    code: 'XRP',
    name: 'Ripple',
    fullName: 'Ripple (XRP)',
    category: 'kripto',
    currency: 'USD',
    source: 'yahoo',
    ticker: 'XRP-USD',
    enabled: true,
  },

  // International Indices (via ETFs)
  {
    code: 'SPX',
    name: 'S&P 500',
    fullName: 'S&P 500 (SPY ETF)',
    category: 'yabanci_hisse',
    currency: 'USD',
    source: 'yahoo',
    ticker: 'SPY',
    enabled: true,
    popular: true,
    note: 'SPY ETF as proxy for S&P 500',
  },
  {
    code: 'STOXX',
    name: 'Euro Stoxx 50',
    fullName: 'Euro Stoxx 50 (EZU ETF)',
    category: 'yabanci_hisse',
    currency: 'USD',
    source: 'yahoo',
    ticker: 'EZU',
    enabled: true,
    note: 'EZU ETF as proxy for Euro Stoxx 50',
  },

  // Legacy instruments (keep for backward compatibility)
  {
    code: 'TSLA',
    name: 'Tesla',
    fullName: 'Tesla, Inc.',
    category: 'hisse',
    currency: 'USD',
    source: 'yahoo',
    ticker: 'TSLA',
    enabled: true,
  },
  {
    code: 'AAPL',
    name: 'Apple',
    fullName: 'Apple Inc.',
    category: 'hisse',
    currency: 'USD',
    source: 'yahoo',
    ticker: 'AAPL',
    enabled: true,
  },

  // ============================================
  // TEFAS INSTRUMENTS
  // ============================================

  // Para Piyasası (Money Market Funds)
  {
    code: 'NVB',
    name: 'NEO Para Piyasası',
    fullName: 'NEO PORTFÖY İKİNCİ PARA PİYASASI (TL) FON',
    category: 'para_piyasasi',
    currency: 'TRY',
    source: 'tefas',
    enabled: true, // ENABLED: HangiKredi scraping working
  },
  {
    code: 'DCB',
    name: 'Deniz Para Piyasası',
    fullName: 'DENİZ PORTFÖY PARA PİYASASI SERBEST (TL) FON',
    category: 'para_piyasasi',
    currency: 'TRY',
    source: 'tefas',
    enabled: true, // ENABLED: HangiKredi scraping working
  },

  // Arbitraj
  {
    code: 'HDA',
    name: 'Hedef Arbitraj',
    fullName: 'HEDEF PORTFÖY DÖRDÜNCÜ İSTATİSTİKSEL ARBİTRAJ HİSSE SENEDİ FONU',
    category: 'arbitraj',
    currency: 'TRY',
    source: 'tefas',
    enabled: true, // ENABLED: HangiKredi scraping working
  },

  // Borçlanma Araçları (Debt Instruments)
  {
    code: 'AHU',
    name: 'Atlas Borçlanma',
    fullName: 'ATLAS PORTFÖY BİRİNCİ ÖZEL SEKTÖR BORÇLANMA ARAÇLARI FONU',
    category: 'borclanma',
    currency: 'TRY',
    source: 'tefas',
    enabled: true, // ENABLED: HangiKredi scraping working
  },
  {
    code: 'FPK',
    name: 'Fiba Kısa Vadeli',
    fullName: 'FİBA PORTFÖY KISA VADELİ BORÇLANMA ARAÇLARI (TL) FONU',
    category: 'borclanma',
    currency: 'TRY',
    source: 'tefas',
    enabled: true, // ENABLED: HangiKredi scraping working
  },
  {
    code: 'APT',
    name: 'AK Orta Vadeli',
    fullName: 'AK PORTFÖY ORTA VADELİ BORÇLANMA ARAÇLARI FONU',
    category: 'borclanma',
    currency: 'TRY',
    source: 'tefas',
    enabled: true, // ENABLED: HangiKredi scraping working
  },
  {
    code: 'GUV',
    name: 'Garanti Uzun Vadeli',
    fullName: 'GARANTI PORTFÖY UZUN VADELİ BORÇLANMA ARAÇLARI FONU',
    category: 'borclanma',
    currency: 'TRY',
    source: 'tefas',
    enabled: true, // ENABLED: HangiKredi scraping working
  },

  // Altın Fonu (Gold Fund)
  {
    code: 'YKT',
    name: 'Yapı Kredi Altın',
    fullName: 'YAPI KREDİ PORTFÖY ALTIN FONU',
    category: 'altin',
    currency: 'TRY',
    source: 'tefas',
    enabled: true, // ENABLED: HangiKredi scraping working
    popular: true,
  },

  // Döviz Fonu (Forex Fund)
  {
    code: 'DAS',
    name: 'Deniz Döviz',
    fullName: 'DENİZ PORTFÖY ONİKİNCİ SERBEST (DÖVİZ) FON',
    category: 'doviz_fonu',
    currency: 'TRY',
    source: 'tefas',
    enabled: true, // ENABLED: HangiKredi scraping working
  },

  // Gümüş Fonu (Silver Fund)
  {
    code: 'DMG',
    name: 'Deniz Gümüş',
    fullName: 'DENİZ PORTFÖY GÜMÜŞ FON SEPETİ FONU',
    category: 'gumus',
    currency: 'TRY',
    source: 'tefas',
    enabled: true, // ENABLED: HangiKredi scraping working
  },

  // Eurobond Fonu
  {
    code: 'YBE',
    name: 'Yapı Kredi Eurobond',
    fullName: 'YAPI KREDİ PORTFÖY EUROBOND (DOLAR) BORÇLANMA ARAÇLARI FONU',
    category: 'eurobond',
    currency: 'USD',
    source: 'tefas',
    enabled: true, // ENABLED: HangiKredi scraping working
  },

  // Yabancı Hisse Fonları (Foreign Equity Funds)
  {
    code: 'AFA',
    name: 'AK Amerika',
    fullName: 'AK PORTFÖY AMERİKA YABANCI HİSSE SENEDİ FONU',
    category: 'yabanci_hisse_fonu',
    currency: 'USD',
    source: 'tefas',
    enabled: true, // ENABLED: HangiKredi scraping working
  },
  {
    code: 'AFV',
    name: 'AK Avrupa',
    fullName: 'AK PORTFÖY AVRUPA YABANCI HİSSE SENEDİ FONU',
    category: 'yabanci_hisse_fonu',
    currency: 'EUR',
    source: 'tefas',
    enabled: true, // ENABLED: HangiKredi scraping working
  },
];

// Helper functions

/**
 * Get all enabled instruments
 */
export const getEnabledInstruments = () => {
  return INSTRUMENTS.filter(inst => inst.enabled);
};

/**
 * Get instruments by category
 */
export const getInstrumentsByCategory = (category) => {
  return INSTRUMENTS.filter(inst => inst.enabled && inst.category === category);
};

/**
 * Get popular/featured instruments
 */
export const getPopularInstruments = () => {
  return INSTRUMENTS.filter(inst => inst.enabled && inst.popular);
};

/**
 * Get instrument by code
 */
export const getInstrumentByCode = (code) => {
  return INSTRUMENTS.find(inst => inst.code === code);
};

/**
 * Get all categories with their instruments count
 */
export const getCategoriesWithCount = () => {
  const enabledInstruments = getEnabledInstruments();
  const categoriesMap = new Map();
  
  enabledInstruments.forEach(inst => {
    if (!categoriesMap.has(inst.category)) {
      categoriesMap.set(inst.category, {
        ...INSTRUMENT_CATEGORIES[inst.category],
        key: inst.category,
        count: 0,
        instruments: [],
      });
    }
    const cat = categoriesMap.get(inst.category);
    cat.count++;
    cat.instruments.push(inst);
  });
  
  return Array.from(categoriesMap.values()).sort((a, b) => a.order - b.order);
};

/**
 * Format instrument for display
 */
export const formatInstrument = (instrument) => {
  if (!instrument) return null;
  
  const category = INSTRUMENT_CATEGORIES[instrument.category];
  return {
    ...instrument,
    categoryName: category?.name || instrument.category,
    categoryIcon: category?.icon || '📊',
    displayName: `${instrument.name} (${instrument.code})`,
    displayNameWithCurrency: `${instrument.name} (${instrument.code}) - ${instrument.currency}`,
  };
};

/**
 * Search instruments by query
 */
export const searchInstruments = (query) => {
  if (!query || query.trim().length === 0) {
    return getEnabledInstruments();
  }
  
  const lowerQuery = query.toLowerCase().trim();
  return INSTRUMENTS.filter(inst => {
    if (!inst.enabled) return false;
    
    return (
      inst.code.toLowerCase().includes(lowerQuery) ||
      inst.name.toLowerCase().includes(lowerQuery) ||
      inst.fullName.toLowerCase().includes(lowerQuery) ||
      inst.category.toLowerCase().includes(lowerQuery) ||
      INSTRUMENT_CATEGORIES[inst.category]?.name.toLowerCase().includes(lowerQuery)
    );
  });
};

/**
 * Get instrument source label
 */
export const getSourceLabel = (source) => {
  const labels = {
    yahoo: 'Yahoo Finance',
    tefas: 'TEFAS',
  };
  return labels[source] || source;
};

export default {
  INSTRUMENTS,
  INSTRUMENT_CATEGORIES,
  getEnabledInstruments,
  getInstrumentsByCategory,
  getPopularInstruments,
  getInstrumentByCode,
  getCategoriesWithCount,
  formatInstrument,
  searchInstruments,
  getSourceLabel,
};

