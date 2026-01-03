/**
 * TEFAS (Türkiye Elektronik Fon Alım Satım Platformu) Data Service
 * Fetches fund prices from TEFAS website
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Create axios instance with Cloud Functions-optimized config
const axiosInstance = axios.create({
  timeout: 30000, // 30 seconds for Cloud Functions
  maxRedirects: 5,
  validateStatus: function (status) {
    return status >= 200 && status < 400; // Accept 2xx and 3xx
  },
  // Cloud Functions için özel header'lar
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'max-age=0',
    'DNT': '1'
  }
});

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

/**
 * Fetch fund price from Fintables with retry mechanism
 * @param {string} fundCode - Fund code (e.g., 'NVB', 'DCB', 'AFA')
 * @param {Date} date - Target date (defaults to today)
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<{price: number, date: string}>}
 */
async function getFundPriceFromFintables(fundCode, date = new Date(), retries = 3) {
  const dateStr = date.toISOString().split('T')[0];
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Fintables URL - adjust based on actual site
      const fintablesUrl = `https://fintables.com/fon/${fundCode}`;
      // OR: `https://www.fintables.com/fund/${fundCode}`
      
      console.log(`[Attempt ${attempt}/${retries}] Fetching from Fintables: ${fintablesUrl} for ${fundCode}`);
      
      const response = await axiosInstance.get(fintablesUrl, {
        headers: {
          'Referer': 'https://fintables.com/',
          'Origin': 'https://fintables.com'
        }
      });
      
      // Check if we got a valid response
      if (!response.data || response.data.length === 0) {
        throw new Error('Empty response from Fintables');
      }
      
      // Check for redirect or error pages
      if (response.request?.res?.responseUrl && 
          !response.request.res.responseUrl.includes(fundCode.toLowerCase())) {
        console.log(`Redirected to: ${response.request.res.responseUrl}`);
      }
      
      const $ = cheerio.load(response.data);
      
      // Try multiple selectors with detailed logging
      const selectors = [
        // Data attributes
        () => $('[data-price]').attr('data-price'),
        () => $('[data-birim-pay]').attr('data-birim-pay'),
        () => $('[data-fiyat]').attr('data-fiyat'),
        () => $('[data-nav]').attr('data-nav'),
        
        // Class-based
        () => $('.fund-price').first().text().trim(),
        () => $('.birim-pay').first().text().trim(),
        () => $('.price').first().text().trim(),
        () => $('.fiyat').first().text().trim(),
        () => $('.nav').first().text().trim(),
        () => $('.nav-value').first().text().trim(),
        () => $('.fund-nav').first().text().trim(),
        
        // ID-based
        () => $('#fund-price').text().trim(),
        () => $('#birim-pay').text().trim(),
        () => $('#price').text().trim(),
        () => $('#nav').text().trim(),
        
        // Table cells
        () => $('td:contains("Birim Pay")').next().text().trim(),
        () => $('td:contains("Fiyat")').next().text().trim(),
        () => $('td:contains("NAV")').next().text().trim(),
        () => $('th:contains("Birim Pay")').parent().find('td').first().text().trim(),
        
        // Generic number patterns
        () => {
          const numbers = $('body').find('*').filter((i, el) => {
            const text = $(el).text().trim();
            return /^\d+[.,]\d{2,4}$/.test(text) && parseFloat(text.replace(',', '.')) > 0.1;
          }).first().text().trim();
          return numbers || null;
        },
        
        // JSON-LD structured data
        () => {
          try {
            const jsonLd = $('script[type="application/ld+json"]').html();
            if (jsonLd) {
              const data = JSON.parse(jsonLd);
              return data.price || data.birimPay || data.offers?.price || null;
            }
          } catch (e) {
            return null;
          }
          return null;
        }
      ];
      
      let priceText = null;
      for (const selector of selectors) {
        try {
          const result = selector();
          if (result && result.toString().trim().length > 0) {
            priceText = result.toString().trim();
            console.log(`✅ Found price text for ${fundCode} using selector: "${priceText}"`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!priceText) {
        // Debug: log HTML structure
        const bodyText = $('body').text().substring(0, 500);
        const title = $('title').text();
        console.log(`❌ No price found for ${fundCode}. Page title: "${title}", Body sample: "${bodyText}"`);
        
        // Check if we got an error page
        if (title.toLowerCase().includes('error') || 
            title.toLowerCase().includes('404') ||
            bodyText.toLowerCase().includes('not found') ||
            bodyText.toLowerCase().includes('bulunamadı')) {
          throw new Error(`Page not found for ${fundCode}`);
        }
        
        if (attempt < retries) {
          console.log(`Retrying in ${attempt * 2} seconds...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          continue;
        }
        
        return null;
      }
      
      // Clean and parse price
      const cleanText = priceText
        .toString()
        .replace(/[^\d,.-]/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
      
      const price = parseFloat(cleanText);
      
      if (!isNaN(price) && price > 0) {
        console.log(`✅ Successfully parsed price for ${fundCode}: ${price}`);
        return {
          price,
          date: dateStr,
          source: 'fintables'
        };
      } else {
        console.log(`❌ Invalid price parsed for ${fundCode}: "${priceText}" -> "${cleanText}" -> ${price}`);
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          continue;
        }
      }
      
    } catch (error) {
      console.error(`[Attempt ${attempt}/${retries}] Fintables error for ${fundCode}:`, error.message);
      
      if (error.response) {
        console.error(`Response status: ${error.response.status}`);
        console.error(`Response headers:`, JSON.stringify(error.response.headers));
        if (error.response.status === 403 || error.response.status === 429) {
          // Rate limited or blocked - wait longer
          const waitTime = attempt * 5000;
          console.log(`Rate limited/blocked. Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        console.log(`Timeout error. Retrying in ${attempt * 2} seconds...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
      }
      
      if (attempt === retries) {
        console.error(`All retry attempts failed for ${fundCode}`);
        return null;
      }
    }
  }
  
  return null;
}

/**
 * Extract chart data from HangiKredi HTML and calculate weekly return for a specific week
 * @param {string} html - HTML content
 * @param {Date} weekStart - Monday of the target week
 * @param {Date} weekEnd - Friday of the target week
 * @returns {Promise<{open: number, close: number, returnPct: number} | null>}
 */
async function extractWeeklyDataFromChart(html, weekStart, weekEnd) {
  try {
    // Find chart data in HTML (might be escaped)
    // Chart format: "chart":[{"date":"202512260000","dateText":"26/12/2025","last":3.761423,...},...]
    let chartStart = html.indexOf('chart');
    if (chartStart < 0) {
      return null;
    }
    
    // Extract chart section
    const chartSection = html.substring(chartStart, chartStart + 5000);
    
    // Unescape the JSON
    const unescaped = chartSection.replace(/\\"/g, '"').replace(/\\\//g, '/');
    
    // Find chart array
    const jsonMatch = unescaped.match(/chart":\[(.*?)\]/);
    if (!jsonMatch) {
      return null;
    }
    
    // Parse chart data
    const jsonStr = '[' + jsonMatch[1] + ']';
    let chartData = null;
    try {
      chartData = JSON.parse(jsonStr);
    } catch (e) {
      console.log(`Chart parse error: ${e.message}`);
      return null;
    }
    
    if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
      return null;
    }
    
    
    // Convert weekStart and weekEnd to YYYYMMDD format for comparison
    const weekStartStr = `${weekStart.getUTCFullYear()}${String(weekStart.getUTCMonth() + 1).padStart(2, '0')}${String(weekStart.getUTCDate()).padStart(2, '0')}`;
    const weekEndStr = `${weekEnd.getUTCFullYear()}${String(weekEnd.getUTCMonth() + 1).padStart(2, '0')}${String(weekEnd.getUTCDate()).padStart(2, '0')}`;
    
    // Find Monday (open) and Friday (close) prices in the chart
    let mondayData = null;
    let fridayData = null;
    
    for (const item of chartData) {
      const itemDate = item.date || item.dateStr || '';
      // Chart dates are in format YYYYMMDDHHMM
      const dateOnly = itemDate.substring(0, 8);
      
      if (dateOnly === weekStartStr && !mondayData) {
        mondayData = {
          date: dateOnly,
          price: parseFloat(item.last || item.close || item.price || 0)
        };
      }
      
      if (dateOnly === weekEndStr && !fridayData) {
        fridayData = {
          date: dateOnly,
          price: parseFloat(item.last || item.close || item.price || 0)
        };
      }
      
      // If we found both, we're done
      if (mondayData && fridayData) {
        break;
      }
    }
    
    // If we have both Monday and Friday, calculate return
    if (mondayData && fridayData && mondayData.price > 0) {
      const returnPct = ((fridayData.price - mondayData.price) / mondayData.price) * 100;
      return {
        open: mondayData.price,
        close: fridayData.price,
        returnPct: Number(returnPct.toFixed(4)),
        openDate: weekStart.toISOString().split('T')[0],
        closeDate: weekEnd.toISOString().split('T')[0]
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error extracting chart data: ${error.message}`);
    return null;
  }
}

/**
 * Fetch fund price and weekly return from HangiKredi.com
 * URL format: https://www.hangikredi.com/yatirim-araclari/fon/{FUND_CODE}
 * @param {string} fundCode - Fund code (e.g., 'NVB', 'AFA')
 * @param {Date} date - Target date (for reference, defaults to current week)
 * @param {Date} weekStart - Optional: Monday of the target week (for historical data)
 * @param {Date} weekEnd - Optional: Friday of the target week (for historical data)
 * @returns {Promise<{price: number, returnPct: number, date: string, open: number, close: number}>}
 */
async function getFundDataFromHangikredi(fundCode, date = new Date(), weekStart = null, weekEnd = null) {
  try {
    const url = `https://www.hangikredi.com/yatirim-araclari/fon/${fundCode.toLowerCase()}`;
    
    console.log(`Fetching from HangiKredi: ${url} for ${fundCode}`);
    
    const response = await axiosInstance.get(url, {
      headers: {
        'Referer': 'https://www.hangikredi.com/',
        'Origin': 'https://www.hangikredi.com'
      }
    });
    
    if (!response.data || response.data.length === 0) {
      throw new Error('Empty response from HangiKredi');
    }
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // HangiKredi embeds JSON data in script tags with Next.js format
    // Look for the fund data in the HTML
    let price = null;
    let returnPct = null;
    let updateDate = null;
    
    // Method 1: Extract price - search for "last" near fund code
    // Try both escaped and unescaped versions
    const codePatterns = [
      `"code":"${fundCode.toUpperCase()}"`,
      `"code":\\"${fundCode.toUpperCase()}\\"`,
      `\\"code\\":\\"${fundCode.toUpperCase()}\\"`
    ];
    
    for (const codePattern of codePatterns) {
      const codeIndex = html.indexOf(codePattern);
      if (codeIndex > 0) {
        // Look for "last" in the next 500 characters
        const section = html.substring(codeIndex, codeIndex + 500);
        const lastPatterns = [
          /"last":\\?"([\d,.-]+)\\?"/,
          /"last":"([\d,.-]+)"/,
          /\\"last\\":\\"([\d,.-]+)\\?"/
        ];
        
        for (const lastPattern of lastPatterns) {
          const lastMatch = section.match(lastPattern);
          if (lastMatch) {
            price = parseFloat(lastMatch[1].replace(/\./g, '').replace(',', '.'));
            console.log(`✅ Found price: ${price}`);
            break;
          }
        }
        if (price) break;
      }
    }
    
    // Method 2: Extract weekly return from performanceSection
    // Find performanceSection and look for fund code in items array
    const perfPatterns = [
      '"performanceSection"',
      '\\"performanceSection\\"'
    ];
    
    for (const perfPattern of perfPatterns) {
      const perfIndex = html.indexOf(perfPattern);
      if (perfIndex > 0) {
        // Get a large section around performanceSection
        const perfSection = html.substring(perfIndex, perfIndex + 5000);
        
        // Find fund code in this section (try all patterns)
        for (const codePattern of codePatterns) {
          const fundCodeIndex = perfSection.indexOf(codePattern);
          if (fundCodeIndex > 0) {
            // Look for changePercent near the fund code (within 200 chars)
            const fundSection = perfSection.substring(fundCodeIndex, fundCodeIndex + 200);
            const changePatterns = [
              /"changePercent":([\d.-]+)/,
              /\\"changePercent\\":([\d.-]+)/
            ];
            
            for (const changePattern of changePatterns) {
              const changeMatch = fundSection.match(changePattern);
              if (changeMatch) {
                const value = parseFloat(changeMatch[1]);
                // Weekly returns are usually between -50% and 50%
                if (value >= -50 && value <= 50) {
                  returnPct = value;
                  console.log(`✅ Found weekly return: ${returnPct}%`);
                  break;
                }
              }
            }
            if (returnPct !== null) break;
          }
        }
        if (returnPct !== null) break;
      }
    }
    
    // Method 3: Direct search - find fund code and changePercent anywhere in HTML
    if (returnPct === null) {
      // Find all occurrences of fund code (try all patterns)
      const codePositions = [];
      for (const codePattern of codePatterns) {
        let searchIndex = 0;
        while ((searchIndex = html.indexOf(codePattern, searchIndex)) > 0) {
          codePositions.push(searchIndex);
          searchIndex += 1;
        }
      }
      
      // For each occurrence, check if there's a changePercent nearby
      for (const pos of codePositions) {
        const section = html.substring(pos, pos + 300);
        const changePatterns = [
          /"changePercent":([\d.-]+)/,
          /\\"changePercent\\":([\d.-]+)/
        ];
        
        for (const changePattern of changePatterns) {
          const changeMatch = section.match(changePattern);
          if (changeMatch) {
            const value = parseFloat(changeMatch[1]);
            if (value >= -50 && value <= 50) {
              returnPct = value;
              console.log(`✅ Found weekly return (direct search): ${returnPct}%`);
              break;
            }
          }
        }
        if (returnPct !== null) break;
      }
    }
    
    // Method 3: Look for date range and calculate from chart data
    // "Performans kıyaslaması 03.12.2025 - 02.01.2026 tarihleri arasında"
    const dateRangeMatch = html.match(/Performans kıyaslaması\s+(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/);
    if (dateRangeMatch) {
      updateDate = dateRangeMatch[2]; // End date
      console.log(`✅ Found date range: ${dateRangeMatch[1]} to ${dateRangeMatch[2]}`);
    }
    
    // Method 4: If weekStart and weekEnd are provided, try to extract from chart data
    // This allows fetching historical weekly data (similar to Yahoo Finance)
    if (weekStart && weekEnd) {
      console.log(`📅 Attempting to extract historical data for week ${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`);
      const chartData = await extractWeeklyDataFromChart(html, weekStart, weekEnd);
      if (chartData && chartData.returnPct !== null) {
        console.log(`✅ Found historical weekly data from chart: ${chartData.returnPct.toFixed(4)}%`);
        return {
          price: chartData.close,
          returnPct: chartData.returnPct,
          date: chartData.closeDate,
          source: 'hangikredi-chart',
          open: chartData.open,
          close: chartData.close,
          openDate: chartData.openDate,
          closeDate: chartData.closeDate
        };
      } else {
        console.log(`⚠️  Could not extract historical data from chart for specified week`);
      }
    }
    
    // Method 5: Try to extract from chart data if we have price but no return (fallback)
    if (price && !returnPct) {
      // Look for chart array with dates and prices
      const chartMatch = html.match(/"chart":\[([^\]]+)\]/);
      if (chartMatch) {
        // Try to find first and last prices in the week
        // This is more complex, skip for now
      }
    }
    
    // If we found at least returnPct, return it
    if (returnPct !== null) {
      let open = null;
      let close = null;
      
      if (price) {
        // Calculate open from close and return
        open = price / (1 + returnPct / 100);
        close = price;
      }
      
      return {
        price: price,
        returnPct: Number(returnPct.toFixed(4)),
        date: updateDate ? updateDate.split('.').reverse().join('-') : date.toISOString().split('T')[0],
        source: 'hangikredi',
        open: open,
        close: close
      };
    }
    
    // If we only have price, return it
    if (price) {
      return {
        price: price,
        returnPct: null,
        date: updateDate ? updateDate.split('.').reverse().join('-') : date.toISOString().split('T')[0],
        source: 'hangikredi'
      };
    }
    
    return null;
  } catch (error) {
    console.error(`HangiKredi error for ${fundCode}:`, error.message);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
    }
    return null;
  }
}

/**
 * Fetch all TEFAS funds from HangiKredi.com
 * @param {Date} weekStart - Monday of the week
 * @param {Date} weekEnd - Friday of the week
 * @returns {Promise<Object>} - Object with fund codes as keys and {open, close, returnPct} as values
 */
async function fetchTefasDataFromHangikredi(weekStart, weekEnd) {
  const { getAllTefasCodes } = require('./instruments');
  const tefasInstruments = getAllTefasCodes();
  const results = {};
  
  console.log(`Fetching TEFAS data from HangiKredi for ${tefasInstruments.length} funds...`);
  console.log(`Week: ${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`);
  
  let successCount = 0;
  let failCount = 0;
  
  // Process in smaller batches
  const batchSize = 3;
  for (let i = 0; i < tefasInstruments.length; i += batchSize) {
    const batch = tefasInstruments.slice(i, i + batchSize);
    console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tefasInstruments.length / batchSize)}: ${batch.map(b => b.code).join(', ')}`);
    
    const batchPromises = batch.map(async (inst) => {
      try {
        // Get fund data from HangiKredi with week range (similar to Yahoo Finance)
        // This allows fetching historical weekly data from chart
        const fundData = await getFundDataFromHangikredi(inst.code, weekEnd, weekStart, weekEnd);
        
        if (fundData && fundData.returnPct !== null) {
          // We have weekly return percentage from HangiKredi
          const open = fundData.open || null;
          const close = fundData.close || fundData.price || null;
          
          results[inst.code] = {
            open: open,
            close: close,
            returnPct: fundData.returnPct,
            openDate: fundData.openDate || weekStart.toISOString().split('T')[0],
            closeDate: fundData.closeDate || weekEnd.toISOString().split('T')[0],
            source: fundData.source || 'hangikredi',
            note: open === null ? 'Weekly return from HangiKredi, prices not available' : (fundData.source === 'hangikredi-chart' ? 'Data from chart (historical)' : 'Prices estimated from return%')
          };
          
          successCount++;
          console.log(`✅ ${inst.code}: Weekly Return = ${fundData.returnPct.toFixed(4)}%${open ? `, Open=${open.toFixed(4)}, Close=${close.toFixed(4)}` : ''} (${fundData.source || 'hangikredi'})`);
          return { code: inst.code, success: true };
        } else {
          results[inst.code] = {
            open: null,
            close: null,
            returnPct: null,
            error: fundData ? 'No return data from HangiKredi' : 'No data from HangiKredi'
          };
          failCount++;
          console.log(`❌ ${inst.code}: No return data from HangiKredi`);
          return { code: inst.code, success: false };
        }
      } catch (error) {
        console.error(`❌ Error fetching ${inst.code}:`, error.message);
        results[inst.code] = {
          open: null,
          close: null,
          returnPct: null,
          error: error.message
        };
        failCount++;
        return { code: inst.code, success: false };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    console.log(`Batch completed: ${batchResults.filter(r => r.success).length}/${batch.length} successful`);
    
    // Wait between batches
    if (i + batchSize < tefasInstruments.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`\n📊 HangiKredi fetch completed: ${successCount}/${tefasInstruments.length} successful, ${failCount} failed`);
  
  return results;
}

/**
 * Fetch all TEFAS funds from Fintables comparison page
 * Uses the comparison page which shows weekly returns directly
 * URL format: https://fintables.com/fon-karsilastirma?funds=NVB,AHU,JOT
 * @param {Date} weekStart - Monday of the week (for reference, not used in API)
 * @param {Date} weekEnd - Friday of the week (for reference, not used in API)
 * @returns {Promise<Object>} - Object with fund codes as keys and {open, close, returnPct} as values
 */
async function fetchTefasDataFromFintables(weekStart, weekEnd) {
  const { getAllTefasCodes } = require('./instruments');
  const tefasInstruments = getAllTefasCodes();
  const results = {};
  
  console.log(`Fetching TEFAS data from Fintables comparison page for ${tefasInstruments.length} funds...`);
  console.log(`Week: ${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`);
  console.log(`Note: This is a snapshot - data must be fetched on Friday and saved to database`);
  
  // Get all fund codes
  const fundCodes = tefasInstruments.map(inst => inst.code);
  
  // Build URL with all fund codes
  const fundsParam = fundCodes.join(',');
  const comparisonUrl = `https://fintables.com/fon-karsilastirma?funds=${fundsParam}`;
  
  console.log(`Fetching from: ${comparisonUrl.substring(0, 100)}...`);
  
  try {
    const response = await axiosInstance.get(comparisonUrl, {
      headers: {
        'Referer': 'https://fintables.com/',
        'Origin': 'https://fintables.com'
      }
    });
    
    if (!response.data || response.data.length === 0) {
      throw new Error('Empty response from Fintables comparison page');
    }
    
    const $ = cheerio.load(response.data);
    
    // Find the table with fund comparison data
    // Look for "1 Hafta" column which contains weekly returns
    let foundData = false;
    
    // Try to find the table rows - use for...of instead of forEach to support await
    const rows = $('table tr, .table tr, [class*="table"] tr').toArray();
    
    for (const row of rows) {
      const $row = $(row);
      const cells = $row.find('td, th');
      const rowText = $row.text();
      
      // Check each fund code
      for (const fundCode of fundCodes) {
        if (rowText.includes(fundCode) && !results[fundCode]) {
          // This row contains our fund
          // Find the "1 Hafta" return value
          let returnValue = null;
          
          // Pattern 1: Look for percentage in cells after fund code
          cells.each((cellIndex, cell) => {
            const cellText = $(cell).text().trim();
            const percentMatch = cellText.match(/(\d+[,.]\d+)\s*%?/);
            if (percentMatch && !returnValue) {
              const numValue = parseFloat(percentMatch[1].replace(',', '.'));
              // Weekly returns are usually small (0-10%), so filter reasonable values
              if (numValue >= -50 && numValue <= 50) {
                returnValue = numValue;
              }
            }
          });
          
          // Pattern 2: Look for "1 Hafta" header and get corresponding cell
          const headerRow = $row.prevAll('tr').first();
          if (headerRow.length > 0) {
            headerRow.find('th, td').each((headerIndex, header) => {
              const headerText = $(header).text().trim();
              if (headerText.includes('1 Hafta') || headerText.includes('1Hafta') || headerText.includes('Hafta')) {
                const returnCell = cells.eq(headerIndex);
                const returnText = returnCell.text().trim();
                const percentMatch = returnText.match(/(\d+[,.]\d+)\s*%?/);
                if (percentMatch) {
                  returnValue = parseFloat(percentMatch[1].replace(',', '.'));
                }
              }
            });
          }
          
          // Pattern 3: Look for data attributes
          const dataReturn = $row.find('[data-return], [data-weekly-return], [data-1hafta]').attr('data-return') ||
                            $row.find('[data-return], [data-weekly-return], [data-1hafta]').attr('data-weekly-return') ||
                            $row.find('[data-return], [data-weekly-return], [data-1hafta]').attr('data-1hafta');
          if (dataReturn) {
            returnValue = parseFloat(dataReturn.replace(',', '.'));
          }
          
          if (returnValue !== null) {
            // We have the return percentage
            // Try to get current price to estimate open/close (optional)
            const currentPriceData = await getFundPriceFromFintables(fundCode, weekEnd).catch(() => null);
            const currentPrice = currentPriceData?.price || null;
            
            let open = null;
            let close = null;
            
            if (currentPrice) {
              // Calculate backwards: open = close / (1 + return/100)
              open = currentPrice / (1 + returnValue / 100);
              close = currentPrice;
            }
            
            results[fundCode] = {
              open: open,
              close: close,
              returnPct: Number(returnValue.toFixed(4)),
              openDate: weekStart.toISOString().split('T')[0],
              closeDate: weekEnd.toISOString().split('T')[0],
              source: 'fintables_comparison',
              note: open === null ? 'Only return% available from comparison page' : 'Prices estimated from return% and current price'
            };
            
            foundData = true;
            console.log(`✅ ${fundCode}: Weekly Return = ${returnValue.toFixed(4)}%${open ? `, Open=${open.toFixed(4)}, Close=${close.toFixed(4)}` : ' (return% only)'}`);
          }
        }
      }
    }
    
    // If table parsing didn't work, try alternative approach
    if (!foundData) {
      console.log(`⚠️  Table parsing didn't find data, trying alternative selectors...`);
      
      // Alternative: Look for JSON data in script tags
      $('script').each((index, script) => {
        const scriptText = $(script).html();
        if (scriptText && scriptText.includes('funds') && scriptText.includes('return')) {
          try {
            // Try to extract JSON
            const jsonMatch = scriptText.match(/\{[\s\S]*"funds"[\s\S]*\}/);
            if (jsonMatch) {
              const data = JSON.parse(jsonMatch[0]);
              // Process the data structure
              console.log(`Found JSON data structure`);
            }
          } catch (e) {
            // Not valid JSON, continue
          }
        }
      });
    }
    
    // For funds we didn't find, mark as failed
    fundCodes.forEach(code => {
      if (!results[code]) {
        results[code] = {
          open: null,
          close: null,
          returnPct: null,
          error: 'Not found in comparison page'
        };
      }
    });
    
    const successCount = Object.values(results).filter(r => r.returnPct !== null).length;
    const failCount = Object.values(results).filter(r => r.returnPct === null).length;
    
    console.log(`\n📊 Fintables comparison page fetch completed: ${successCount}/${fundCodes.length} successful, ${failCount} failed`);
    
    return results;
    
  } catch (error) {
    console.error(`❌ Error fetching from Fintables comparison page:`, error.message);
    
    // Fallback: mark all as failed
    fundCodes.forEach(code => {
      results[code] = {
        open: null,
        close: null,
        returnPct: null,
        error: error.message
      };
    });
    
    return results;
  }
}

module.exports = {
  getFundPrice,
  getMultipleFundPrices,
  getWeekOpenClose,
  getFundPriceFromFonzip,
  getFundPriceFromFintables,
  fetchTefasDataFromFintables,
  getFundDataFromHangikredi,
  fetchTefasDataFromHangikredi
};

