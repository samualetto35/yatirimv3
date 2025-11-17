/**
 * Test script to validate all instrument data fetching
 * Tests both Yahoo Finance and TEFAS data sources
 * 
 * Run with: node testDataFetching.js
 */

const { getAllYahooTickers, getAllTefasCodes } = require('./instruments');
const tefasService = require('./tefasService');

// Mock yahoo-finance2 for testing (you'll need to install it: npm install yahoo-finance2)
let yahooFinance;
try {
  yahooFinance = require('yahoo-finance2').default;
} catch (e) {
  console.error('⚠️  yahoo-finance2 not installed. Run: npm install yahoo-finance2');
  process.exit(1);
}

// Test configuration
const TEST_CONFIG = {
  // Test with a recent week
  testDate: new Date('2024-11-15'), // Adjust to a recent Friday
  maxConcurrent: 5, // Limit concurrent requests to avoid rate limiting
  timeout: 15000
};

/**
 * Get Monday of the week for a given date
 */
function getMondayUTC(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // If Sunday, go back 6 days, else go to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Test Yahoo Finance instrument
 */
async function testYahooInstrument(instrument) {
  const start = getMondayUTC(TEST_CONFIG.testDate);
  const end = new Date(TEST_CONFIG.testDate);
  
  try {
    console.log(`  📊 Testing ${instrument.code} (${instrument.ticker})...`);
    
    const queryOptions = { 
      period1: start, 
      period2: end, 
      interval: '1d' 
    };
    
    const result = await yahooFinance.historical(instrument.ticker, queryOptions);
    
    if (!result || result.length === 0) {
      // Fallback to quote
      const quote = await yahooFinance.quote(instrument.ticker);
      const price = quote.regularMarketPrice || 0;
      
      return {
        code: instrument.code,
        status: 'success',
        source: 'quote',
        data: {
          open: price,
          close: price,
          returnPct: 0,
          warning: 'No historical data, used current quote'
        }
      };
    }
    
    // Calculate open/close from historical data
    const sorted = result.sort((a, b) => new Date(a.date) - new Date(b.date));
    const filtered = sorted.filter(r => new Date(r.date) >= start);
    const use = filtered.length ? filtered : sorted;
    
    const first = use[0];
    const last = use[use.length - 1];
    const open = first.open || first.close || 0;
    const close = last.close || last.open || 0;
    const returnPct = open ? ((close - open) / open) * 100 : 0;
    
    return {
      code: instrument.code,
      status: 'success',
      source: 'historical',
      data: {
        open: Number(open.toFixed(4)),
        close: Number(close.toFixed(4)),
        returnPct: Number(returnPct.toFixed(4)),
        dataPoints: result.length
      }
    };
    
  } catch (error) {
    return {
      code: instrument.code,
      status: 'error',
      error: error.message,
      ticker: instrument.ticker
    };
  }
}

/**
 * Test TEFAS instrument
 */
async function testTefasInstrument(instrument) {
  const start = getMondayUTC(TEST_CONFIG.testDate);
  const end = new Date(TEST_CONFIG.testDate);
  
  try {
    console.log(`  📊 Testing ${instrument.code} (${instrument.name})...`);
    
    const result = await tefasService.getWeekOpenClose(instrument.code, start, end);
    
    if (result.open === null || result.close === null || result.returnPct === null) {
      return {
        code: instrument.code,
        status: 'error',
        error: result.error || 'Missing price data',
        data: result
      };
    }
    
    return {
      code: instrument.code,
      status: 'success',
      source: 'tefas',
      data: {
        open: result.open,
        close: result.close,
        returnPct: result.returnPct,
        openDate: result.openDate,
        closeDate: result.closeDate
      }
    };
    
  } catch (error) {
    return {
      code: instrument.code,
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Run tests in batches to avoid rate limiting
 */
async function runTestsInBatches(testFn, instruments, batchSize) {
  const results = [];
  
  for (let i = 0; i < instruments.length; i += batchSize) {
    const batch = instruments.slice(i, i + batchSize);
    console.log(`\n  Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(instruments.length / batchSize)}...`);
    
    const batchResults = await Promise.all(
      batch.map(inst => testFn(inst).catch(err => ({
        code: inst.code,
        status: 'error',
        error: err.message
      })))
    );
    
    results.push(...batchResults);
    
    // Wait between batches to avoid rate limiting
    if (i + batchSize < instruments.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return results;
}

/**
 * Analyze and display results
 */
function analyzeResults(results, instrumentType) {
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'error');
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📈 ${instrumentType} RESULTS`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log(`\n✅ SUCCESSFUL INSTRUMENTS:`);
    successful.forEach(r => {
      console.log(`  • ${r.code.padEnd(10)} | Open: $${r.data.open.toFixed(4).padStart(10)} | Close: $${r.data.close.toFixed(4).padStart(10)} | Return: ${r.data.returnPct.toFixed(2).padStart(6)}%`);
    });
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ FAILED INSTRUMENTS:`);
    failed.forEach(r => {
      console.log(`  • ${r.code.padEnd(10)} | Error: ${r.error}`);
    });
  }
  
  return {
    total: results.length,
    successful: successful.length,
    failed: failed.length,
    successRate: ((successful.length / results.length) * 100).toFixed(2)
  };
}

/**
 * Validate data structure matches expected format
 */
function validateDataStructure(results) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 DATA STRUCTURE VALIDATION`);
  console.log(`${'='.repeat(60)}`);
  
  const issues = [];
  
  results.forEach(r => {
    if (r.status !== 'success') return;
    
    const data = r.data;
    
    // Check required fields
    if (typeof data.open !== 'number') {
      issues.push(`${r.code}: 'open' is not a number`);
    }
    if (typeof data.close !== 'number') {
      issues.push(`${r.code}: 'close' is not a number`);
    }
    if (typeof data.returnPct !== 'number') {
      issues.push(`${r.code}: 'returnPct' is not a number`);
    }
    
    // Check for reasonable values
    if (data.open <= 0) {
      issues.push(`${r.code}: 'open' is not positive (${data.open})`);
    }
    if (data.close <= 0) {
      issues.push(`${r.code}: 'close' is not positive (${data.close})`);
    }
    
    // Check returnPct calculation
    const calculatedReturn = ((data.close - data.open) / data.open) * 100;
    const diff = Math.abs(calculatedReturn - data.returnPct);
    if (diff > 0.01) {
      issues.push(`${r.code}: returnPct calculation mismatch (expected ${calculatedReturn.toFixed(4)}, got ${data.returnPct})`);
    }
  });
  
  if (issues.length === 0) {
    console.log(`✅ All data structures are valid!`);
  } else {
    console.log(`❌ Found ${issues.length} issues:`);
    issues.forEach(issue => console.log(`  • ${issue}`));
  }
  
  return issues;
}

/**
 * Generate Firestore-compatible data structure
 */
function generateFirestoreStructure(yahooResults, tefasResults, weekId) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔥 FIRESTORE DATA STRUCTURE`);
  console.log(`${'='.repeat(60)}`);
  
  const start = getMondayUTC(TEST_CONFIG.testDate);
  const end = new Date(TEST_CONFIG.testDate);
  
  const marketData = {
    window: {
      period1: start.toISOString(),
      period2: end.toISOString(),
      tz: 'UTC',
      sources: ['yahoo-finance2', 'tefas']
    },
    fetchedAt: new Date().toISOString(),
  };
  
  // Add all successful instruments
  [...yahooResults, ...tefasResults].forEach(r => {
    if (r.status === 'success') {
      marketData[r.code] = {
        open: r.data.open,
        close: r.data.close,
        returnPct: r.data.returnPct,
        source: r.source
      };
    }
  });
  
  console.log(`\nSample Firestore document structure for marketData/${weekId}:`);
  console.log(JSON.stringify(marketData, null, 2).substring(0, 1000) + '...');
  
  return marketData;
}

/**
 * Main test function
 */
async function runTests() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 INSTRUMENT DATA FETCHING TEST`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Test Date: ${TEST_CONFIG.testDate.toISOString()}`);
  console.log(`Week Start (Monday): ${getMondayUTC(TEST_CONFIG.testDate).toISOString()}`);
  console.log(`${'='.repeat(60)}\n`);
  
  // Get all instruments
  const yahooInstruments = getAllYahooTickers();
  const tefasInstruments = getAllTefasCodes();
  
  console.log(`📋 Total instruments to test:`);
  console.log(`  • Yahoo Finance: ${yahooInstruments.length}`);
  console.log(`  • TEFAS: ${tefasInstruments.length}`);
  console.log(`  • Total: ${yahooInstruments.length + tefasInstruments.length}\n`);
  
  // Test Yahoo Finance instruments
  console.log(`\n🔵 Testing Yahoo Finance Instruments...`);
  const yahooResults = await runTestsInBatches(
    testYahooInstrument, 
    yahooInstruments, 
    TEST_CONFIG.maxConcurrent
  );
  
  const yahooStats = analyzeResults(yahooResults, 'YAHOO FINANCE');
  
  // Test TEFAS instruments
  console.log(`\n🟠 Testing TEFAS Instruments...`);
  const tefasResults = await runTestsInBatches(
    testTefasInstrument, 
    tefasInstruments, 
    TEST_CONFIG.maxConcurrent
  );
  
  const tefasStats = analyzeResults(tefasResults, 'TEFAS');
  
  // Validate data structures
  const allResults = [...yahooResults, ...tefasResults];
  const validationIssues = validateDataStructure(allResults);
  
  // Generate Firestore structure
  const weekId = '2024-W46'; // Example week ID
  const firestoreData = generateFirestoreStructure(yahooResults, tefasResults, weekId);
  
  // Final summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 FINAL SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Yahoo Finance:`);
  console.log(`  • Success Rate: ${yahooStats.successRate}%`);
  console.log(`  • Successful: ${yahooStats.successful}/${yahooStats.total}`);
  console.log(`\nTEFAS:`);
  console.log(`  • Success Rate: ${tefasStats.successRate}%`);
  console.log(`  • Successful: ${tefasStats.successful}/${tefasStats.total}`);
  console.log(`\nOverall:`);
  const totalSuccess = yahooStats.successful + tefasStats.successful;
  const totalInstruments = yahooStats.total + tefasStats.total;
  const overallSuccessRate = ((totalSuccess / totalInstruments) * 100).toFixed(2);
  console.log(`  • Success Rate: ${overallSuccessRate}%`);
  console.log(`  • Successful: ${totalSuccess}/${totalInstruments}`);
  console.log(`  • Data Structure Issues: ${validationIssues.length}`);
  
  if (overallSuccessRate >= 90 && validationIssues.length === 0) {
    console.log(`\n✅ ALL TESTS PASSED! Data fetching is production-ready.`);
    return true;
  } else {
    console.log(`\n⚠️  TESTS NEED ATTENTION. Please review failed instruments.`);
    return false;
  }
}

// Run tests
if (require.main === module) {
  runTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runTests, testYahooInstrument, testTefasInstrument };

