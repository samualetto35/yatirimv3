/**
 * Test all Yahoo instruments with v3 API
 */

const YahooFinance = require('yahoo-finance2').default;
const { getAllYahooTickers } = require('./instruments');

async function testAllYahoo() {
  console.log(`\n🧪 Testing all Yahoo instruments with v3 API\n`);
  
  const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });
  
  const start = new Date('2026-01-05T00:00:00Z');
  const end = new Date('2026-01-09T23:59:59Z');
  
  const yahooInstruments = getAllYahooTickers();
  console.log(`   Fetching ${yahooInstruments.length} Yahoo Finance instruments...\n`);
  
  const results = [];
  const startTime = Date.now();
  
  for (let i = 0; i < yahooInstruments.length; i++) {
    const inst = yahooInstruments[i];
    console.log(`📦 ${i + 1}/${yahooInstruments.length}: ${inst.code} (${inst.ticker})`);
    
    try {
      // Try chart() API
      const result = await yahooFinance.chart(inst.ticker, {
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
        
        console.log(`   ✅ ${inst.code}: ${returnPct.toFixed(4)}%`);
        results.push({ code: inst.code, success: true, returnPct });
      } else {
        console.log(`   ⚠️  ${inst.code}: No data`);
        results.push({ code: inst.code, success: false, error: 'No data' });
      }
    } catch (error) {
      console.error(`   ❌ ${inst.code}: ${error.message}`);
      results.push({ code: inst.code, success: false, error: error.message });
    }
    
    // Delay between requests
    if (i < yahooInstruments.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  const successCount = results.filter(r => r.success).length;
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 SUMMARY`);
  console.log(`${'='.repeat(50)}`);
  console.log(`✅ Success: ${successCount}/${results.length}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`${'='.repeat(50)}\n`);
  
  if (successCount < results.length) {
    console.log(`❌ Failed instruments:`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.code}: ${r.error}`);
    });
  }
  
  return successCount === results.length;
}

testAllYahoo()
  .then(success => {
    if (success) {
      console.log('\n✅ All tests PASSED');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests FAILED');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
