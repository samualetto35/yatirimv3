/**
 * Test yahoo-finance2 v3 API
 */

const YahooFinance = require('yahoo-finance2').default;

async function testYahooV3() {
  console.log(`\n🧪 Testing yahoo-finance2 v3 API\n`);
  
  // Initialize v3 style
  const yahooFinance = new YahooFinance();
  
  const testTickers = ['AAPL', 'TSLA', 'BTC-USD'];
  
  for (const ticker of testTickers) {
    try {
      console.log(`📊 Testing ${ticker}...`);
      
      const quote = await yahooFinance.quote(ticker);
      
      if (quote) {
        const price = quote.regularMarketPrice || quote.price || 0;
        console.log(`   ✅ ${ticker}: Price=${price}`);
      } else {
        console.log(`   ⚠️  ${ticker}: No data`);
      }
    } catch (error) {
      console.error(`   ❌ ${ticker}: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Test chart() API
  console.log(`\n📊 Testing chart() API for AAPL...`);
  try {
    const start = new Date('2026-01-05T00:00:00Z');
    const end = new Date('2026-01-09T23:59:59Z');
    
    const result = await yahooFinance.chart('AAPL', {
      period1: Math.floor(start.getTime() / 1000),
      period2: Math.floor(end.getTime() / 1000),
      interval: '1d'
    });
    
    if (result && result.quotes && result.quotes.length > 0) {
      const sorted = result.quotes.sort((a, b) => new Date(a.date) - new Date(b.date));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const open = first.open || first.close || 0;
      const close = last.close || last.open || 0;
      const returnPct = open ? ((close - open) / open) * 100 : 0;
      
      console.log(`   ✅ AAPL: Open=${open.toFixed(2)}, Close=${close.toFixed(2)}, Return=${returnPct.toFixed(4)}%`);
    } else {
      console.log(`   ⚠️  AAPL chart: No data`);
    }
  } catch (error) {
    console.error(`   ❌ AAPL chart: ${error.message}`);
  }
  
  console.log(`\n✅ Test completed\n`);
}

testYahooV3()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
