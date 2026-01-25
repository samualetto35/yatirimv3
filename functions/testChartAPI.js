/**
 * Test chart() API instead of deprecated historical()
 */

const yahooFinance = require('yahoo-finance2').default;

async function testChartAPI() {
  const start = new Date('2026-01-05T00:00:00Z');
  const end = new Date('2026-01-09T23:59:59Z');
  
  console.log(`\n🧪 Testing chart() API (replacement for deprecated historical())\n`);
  
  const testTickers = ['AAPL', 'TSLA', 'BTC-USD'];
  
  for (const ticker of testTickers) {
    try {
      console.log(`\n📊 Testing ${ticker}...`);
      
      // Use chart() instead of historical()
      const result = await yahooFinance.chart(ticker, {
        period1: Math.floor(start.getTime() / 1000),
        period2: Math.floor(end.getTime() / 1000),
        interval: '1d'
      });
      
      if (result && result.quotes && result.quotes.length > 0) {
        const sorted = result.quotes.sort((a, b) => new Date(a.date) - new Date(b.date));
        const filtered = sorted.filter(r => new Date(r.date) >= start);
        const use = filtered.length ? filtered : sorted;
        const first = use[0];
        const last = use[use.length - 1];
        const open = first.open || first.close || 0;
        const close = last.close || last.open || 0;
        const returnPct = open ? ((close - open) / open) * 100 : 0;
        
        console.log(`   ✅ ${ticker}: Open=${open.toFixed(4)}, Close=${close.toFixed(4)}, Return=${returnPct.toFixed(4)}%`);
      } else {
        console.log(`   ⚠️  ${ticker}: No data returned`);
      }
    } catch (error) {
      console.error(`   ❌ ${ticker}: ${error.message}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n✅ Test completed\n`);
}

testChartAPI()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
