/**
 * Test script for Yahoo Finance rate limiting
 * Tests the batch processing and delay logic
 */

const yahooFinance = require('yahoo-finance2').default;
const { getAllYahooTickers } = require('./instruments');

async function testYahooFetch() {
  const start = new Date('2026-01-05T00:00:00Z');
  const end = new Date('2026-01-09T23:59:59Z');
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 Testing Yahoo Finance Rate Limit Protection`);
  console.log(`   Date range: ${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`);
  console.log(`${'='.repeat(70)}\n`);

  // Fetch Yahoo Finance instruments with retry and rate limiting
  async function getYahooWeekOpenClose(ticker, retryCount = 0) {
    const maxRetries = 3;
    const retryDelay = 5000; // 5 seconds between retries
    
    try {
      // Add delay between requests to avoid rate limiting (even on first try)
      if (retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay per request
      }
      
      const queryOptions = { period1: start, period2: end, interval: '1d' };
      const result = await yahooFinance.historical(ticker, queryOptions);
      if (!result || result.length === 0) {
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
        console.warn(`⚠️  Rate limit hit for ${ticker}, waiting ${waitTime}ms before retry (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return getYahooWeekOpenClose(ticker, retryCount + 1);
      }
      
      console.error(`❌ Error fetching ${ticker}:`, errorMsg);
      return { open: null, close: null, returnPct: null, error: errorMsg };
    }
  }

  // Fetch all Yahoo instruments with batch processing
  const yahooInstruments = getAllYahooTickers();
  console.log(`   Fetching ${yahooInstruments.length} Yahoo Finance instruments in smaller batches...\n`);
  
  const batchSize = 2; // 2 instruments per batch
  const delayBetweenBatches = 5000; // 5 seconds between batches
  const yahooResults = [];
  const startTime = Date.now();
  
  for (let i = 0; i < yahooInstruments.length; i += batchSize) {
    const batch = yahooInstruments.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(yahooInstruments.length / batchSize);
    
    console.log(`   📦 Processing batch ${batchNum}/${totalBatches}: ${batch.map(b => b.code).join(', ')}`);
    
    // Process sequentially within batch to avoid rate limits
    const batchResults = [];
    for (const inst of batch) {
      const data = await getYahooWeekOpenClose(inst.ticker);
      batchResults.push({ code: inst.code, data });
      if (data.returnPct !== null) {
        console.log(`      ✅ ${inst.code}: ${data.returnPct.toFixed(4)}%`);
      } else {
        console.log(`      ❌ ${inst.code}: Failed - ${data.error || 'Unknown error'}`);
      }
    }
    
    yahooResults.push(...batchResults);
    
    // Add delay between batches (except for the last batch)
    if (i + batchSize < yahooInstruments.length) {
      console.log(`   ⏳ Waiting ${delayBetweenBatches}ms before next batch...\n`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log(`\n   ✅ Completed fetching ${yahooResults.length} Yahoo instruments`);
  console.log(`   ⏱️  Total time: ${duration} seconds\n`);
  
  // Summary
  const successCount = yahooResults.filter(r => r.data.returnPct !== null).length;
  const failCount = yahooResults.length - successCount;
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📊 SUMMARY`);
  console.log(`${'='.repeat(70)}`);
  console.log(`✅ Successful: ${successCount}/${yahooResults.length}`);
  console.log(`❌ Failed: ${failCount}/${yahooResults.length}`);
  console.log(`⏱️  Duration: ${duration} seconds`);
  console.log(`${'='.repeat(70)}\n`);
  
  if (failCount > 0) {
    console.log(`❌ Failed instruments:`);
    yahooResults.forEach(({ code, data }) => {
      if (data.returnPct === null) {
        console.log(`   - ${code}: ${data.error || 'Unknown error'}`);
      }
    });
    console.log();
  }
  
  return {
    success: successCount === yahooResults.length,
    successCount,
    failCount,
    totalCount: yahooResults.length,
    duration: parseFloat(duration),
    results: yahooResults
  };
}

// Run test
if (require.main === module) {
  testYahooFetch()
    .then(result => {
      if (result.success) {
        console.log('✅ Test PASSED - All instruments fetched successfully');
        process.exit(0);
      } else {
        console.log(`⚠️  Test PARTIAL - ${result.failCount} instruments failed`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Test FAILED:', error);
      process.exit(1);
    });
}

module.exports = { testYahooFetch };
