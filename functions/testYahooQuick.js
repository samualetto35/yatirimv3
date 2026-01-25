/**
 * Quick test - only first 3 instruments
 */

const yahooFinance = require('yahoo-finance2').default;
const { getAllYahooTickers } = require('./instruments');

async function quickTest() {
  const start = new Date('2026-01-05T00:00:00Z');
  const end = new Date('2026-01-09T23:59:59Z');
  
  console.log(`\n🧪 Quick Test: First 3 Yahoo instruments only\n`);

  async function getYahooWeekOpenClose(ticker, retryCount = 0) {
    const maxRetries = 5;
    const retryDelay = 10000;
    
    try {
      if (retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      const queryOptions = { period1: start, period2: end, interval: '1d' };
      const result = await yahooFinance.historical(ticker, queryOptions);
      if (!result || result.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const quote = await yahooFinance.quote(ticker);
        const price = quote.regularMarketPrice || 0;
        return { open: price, close: price, returnPct: 0, source: 'quote' };
      }
      const sorted = result.sort((a, b) => new Date(a.date) - new Date(b.date));
      const filtered = sorted.filter(r => new Date(r.date) >= start);
      const use = filtered.length ? filtered : sorted;
      const first = use[0];
      const last = use[use.length - 1];
      const open = first.open || first.close || 0;
      const close = last.close || last.open || 0;
      const returnPct = open ? ((close - open) / open) * 100 : 0;
      return { open, close, returnPct: Number(returnPct.toFixed(4)), source: 'historical' };
    } catch (error) {
      const errorMsg = error.message || String(error);
      const isRateLimit = errorMsg.includes('Too Many Requests') || errorMsg.includes('429') || errorMsg.includes('rate limit');
      
      if (isRateLimit && retryCount < maxRetries) {
        const waitTime = retryDelay * (retryCount + 1);
        console.warn(`⚠️  Rate limit hit for ${ticker}, waiting ${(waitTime/1000).toFixed(0)}s before retry (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return getYahooWeekOpenClose(ticker, retryCount + 1);
      }
      
      console.error(`❌ Error fetching ${ticker}:`, errorMsg);
      return { open: null, close: null, returnPct: null, error: errorMsg };
    }
  }

  const yahooInstruments = getAllYahooTickers().slice(0, 3); // Only first 3
  const delayBetweenRequests = 5000;
  const results = [];
  
  for (let i = 0; i < yahooInstruments.length; i++) {
    const inst = yahooInstruments[i];
    console.log(`📦 ${i + 1}/${yahooInstruments.length}: ${inst.code} (${inst.ticker})`);
    
    const data = await getYahooWeekOpenClose(inst.ticker);
    results.push({ code: inst.code, data });
    
    if (data.returnPct !== null) {
      console.log(`   ✅ ${inst.code}: ${data.returnPct.toFixed(4)}%\n`);
    } else {
      console.log(`   ❌ ${inst.code}: Failed - ${data.error || 'Unknown'}\n`);
    }
    
    if (i < yahooInstruments.length - 1) {
      console.log(`⏳ Waiting 5s...\n`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
    }
  }
  
  const success = results.filter(r => r.data.returnPct !== null).length;
  console.log(`\n✅ Success: ${success}/${results.length}`);
  
  return success === results.length;
}

quickTest()
  .then(success => {
    if (success) {
      console.log('\n✅ Quick test PASSED');
      process.exit(0);
    } else {
      console.log('\n❌ Quick test FAILED');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
