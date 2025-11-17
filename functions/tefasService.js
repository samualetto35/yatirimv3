/**
 * TEFAS (Türkiye Elektronik Fon Alım Satım Platformu) Data Service
 * Fetches fund prices from TEFAS website
 */

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Fetch fund price from TEFAS
 * @param {string} fundCode - Fund code (e.g., 'NVB', 'DCB')
 * @param {Date} date - Target date (defaults to today)
 * @returns {Promise<{price: number, date: string}>}
 */
async function getFundPrice(fundCode, date = new Date()) {
  try {
    // TEFAS public API endpoint (unofficial)
    // Format: YYYY-MM-DD
    const dateStr = date.toISOString().split('T')[0];
    
    // Method 1: Try fonbul.com API (unofficial but reliable)
    try {
      const fonbulUrl = `https://www.fonbul.com/api/DB/${fundCode}/BasicInfo`;
      const response = await axios.get(fonbulUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json'
        },
        timeout: 10000
      });
      
      if (response.data && response.data.Price) {
        return {
          price: parseFloat(response.data.Price),
          date: response.data.Date || dateStr,
          source: 'fonbul'
        };
      }
    } catch (fonbulError) {
      console.log(`Fonbul failed for ${fundCode}, trying TEFAS direct...`);
    }

    // Method 2: Try TEFAS direct scraping
    const tefasUrl = `https://www.tefas.gov.tr/FonKarsilastirma.aspx`;
    const response = await axios.post(tefasUrl, {
      fontip: 'YAT',
      sfontur: '',
      fonkod: fundCode,
      fongrup: '',
      bastarih: dateStr,
      bittarih: dateStr,
      fonturkod: '',
      fonunvantip: ''
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const priceText = $('#MainContent_TextBoxFiyat').val() || 
                     $('input[id*="Fiyat"]').val() ||
                     $('.price-value').first().text().trim();
    
    if (priceText) {
      const price = parseFloat(priceText.replace(',', '.'));
      if (!isNaN(price) && price > 0) {
        return {
          price,
          date: dateStr,
          source: 'tefas_scrape'
        };
      }
    }

    throw new Error(`No price data found for ${fundCode}`);

  } catch (error) {
    console.error(`Error fetching ${fundCode}:`, error.message);
    return {
      price: null,
      date: date.toISOString().split('T')[0],
      error: error.message,
      source: 'error'
    };
  }
}

/**
 * Fetch multiple funds in parallel
 * @param {string[]} fundCodes - Array of fund codes
 * @param {Date} date - Target date
 * @returns {Promise<Object>} - Object with fund codes as keys
 */
async function getMultipleFundPrices(fundCodes, date = new Date()) {
  const promises = fundCodes.map(code => 
    getFundPrice(code, date).catch(err => ({
      price: null,
      date: date.toISOString().split('T')[0],
      error: err.message,
      source: 'error'
    }))
  );

  const results = await Promise.all(promises);
  
  const data = {};
  fundCodes.forEach((code, index) => {
    data[code] = results[index];
  });

  return data;
}

/**
 * Get week open and close prices for a fund
 * @param {string} fundCode - Fund code
 * @param {Date} weekStart - Monday of the week
 * @param {Date} weekEnd - Friday/Sunday of the week
 * @returns {Promise<{open: number, close: number, returnPct: number}>}
 */
async function getWeekOpenClose(fundCode, weekStart, weekEnd) {
  try {
    // Get Monday price (open)
    const mondayData = await getFundPrice(fundCode, weekStart);
    
    // Get Friday price (close) - try Friday, if not available try Thursday, Wednesday...
    let closeData = null;
    let daysBack = 0;
    
    while (!closeData && daysBack < 5) {
      const tryDate = new Date(weekEnd);
      tryDate.setDate(tryDate.getDate() - daysBack);
      const data = await getFundPrice(fundCode, tryDate);
      
      if (data.price && data.price > 0) {
        closeData = data;
        break;
      }
      daysBack++;
    }

    if (!mondayData.price || !closeData || !closeData.price) {
      return {
        open: null,
        close: null,
        returnPct: null,
        error: 'Missing price data'
      };
    }

    const returnPct = ((closeData.price - mondayData.price) / mondayData.price) * 100;

    return {
      open: mondayData.price,
      close: closeData.price,
      returnPct: Number(returnPct.toFixed(4)),
      openDate: mondayData.date,
      closeDate: closeData.date
    };

  } catch (error) {
    console.error(`Error fetching week data for ${fundCode}:`, error.message);
    return {
      open: null,
      close: null,
      returnPct: null,
      error: error.message
    };
  }
}

// Alternative: Use fonzip.com API (another unofficial source)
async function getFundPriceFromFonzip(fundCode) {
  try {
    const url = `https://www.fonzip.com/TR/Funds/Detail/${fundCode}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const priceText = $('.fund-price').first().text().trim() ||
                     $('[data-price]').attr('data-price');
    
    if (priceText) {
      const price = parseFloat(priceText.replace(',', '.'));
      if (!isNaN(price) && price > 0) {
        return {
          price,
          date: new Date().toISOString().split('T')[0],
          source: 'fonzip'
        };
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

module.exports = {
  getFundPrice,
  getMultipleFundPrices,
  getWeekOpenClose,
  getFundPriceFromFonzip
};

