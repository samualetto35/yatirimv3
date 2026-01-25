/**
 * Test if quote() API works (simpler, less likely to be blocked)
 */

const yahooFinance = require('yahoo-finance2').default;

async function testQuoteOnly() {
  console.log(`\n🧪 Testing quote() API only (no historical data)\n`);
  
  const testTickers = ['AAPL', 'TSLA', 'BTC-USD', 'XU100.IS'];
  
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
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n✅ Test completed\n`);
}

testQuoteOnly()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
