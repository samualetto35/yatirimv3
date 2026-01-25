/**
 * Safe local test script for Fintables TEFAS data fetching
 * Tests without affecting existing data or week status
 * 
 * Run with: node testFintablesSafe.js
 */

const tefasService = require('./tefasService');
const { getAllTefasCodes } = require('./instruments');

// Test configuration
const TEST_CONFIG = {
  // Test with a recent week (adjust to a recent Friday)
  testDate: new Date('2025-01-03'), // Örnek: Son Cuma
  testFunds: ['AFA', 'NVB', 'DCB'], // Test için birkaç fon - tek tek test edilecek
  testAllFunds: false, // true yaparsanız tüm fonları test eder
};

/**
 * Get Monday of the week for a given date
 */
function getMondayUTC(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Test single fund price for a specific date (connection test)
 */
async function testSingleFundPrice(fundCode, date) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 TEST 1: Single Fund Price (Connection Test)`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Fund Code: ${fundCode}`);
  console.log(`Date: ${date.toISOString().split('T')[0]}`);
  console.log(`Note: This is just a connection test, not weekly return`);
  console.log(`${'='.repeat(70)}`);
  
  try {
    console.log(`⏳ Fetching from Fintables...`);
    const result = await tefasService.getFundPriceFromFintables(fundCode, date);
    
    if (result && result.price) {
      console.log(`\n✅ SUCCESS (Connection OK):`);
      console.log(`   Price: ${result.price}`);
      console.log(`   Date: ${result.date}`);
      console.log(`   Source: ${result.source}`);
      return { success: true, data: result };
    } else {
      console.log(`\n❌ FAILED: No price data returned`);
      console.log(`   Result:`, JSON.stringify(result, null, 2));
      return { success: false, error: 'No price data', result };
    }
  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
    if (error.stack) {
      console.log(`   Stack:`, error.stack.split('\n').slice(0, 3).join('\n'));
    }
    return { success: false, error: error.message };
  }
}

/**
 * Test week open/close for a single fund (WEEKLY RETURN)
 */
async function testWeekOpenClose(fundCode, weekStart, weekEnd) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 TEST 2: Weekly Return (Open/Close) for Single Fund`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Fund Code: ${fundCode}`);
  console.log(`Week Start (Monday - OPEN): ${weekStart.toISOString().split('T')[0]}`);
  console.log(`Week End (Friday - CLOSE): ${weekEnd.toISOString().split('T')[0]}`);
  console.log(`${'='.repeat(70)}`);
  
  try {
    console.log(`⏳ Fetching Monday price (OPEN)...`);
    const mondayData = await tefasService.getFundPriceFromFintables(fundCode, weekStart);
    
    if (!mondayData || !mondayData.price) {
      console.log(`\n❌ FAILED: Could not fetch Monday (OPEN) price`);
      console.log(`   Result:`, JSON.stringify(mondayData, null, 2));
      return { success: false, error: 'Missing Monday price', mondayData };
    }
    
    console.log(`   ✅ Monday (OPEN) price: ${mondayData.price} on ${mondayData.date}`);
    
    console.log(`\n⏳ Fetching Friday price (CLOSE)...`);
    let closeData = null;
    let daysBack = 0;
    
    while (!closeData && daysBack < 5) {
      const tryDate = new Date(weekEnd);
      tryDate.setDate(tryDate.getDate() - daysBack);
      console.log(`   Trying date: ${tryDate.toISOString().split('T')[0]} (${daysBack} days back)`);
      
      const data = await tefasService.getFundPriceFromFintables(fundCode, tryDate);
      
      if (data && data.price && data.price > 0) {
        closeData = data;
        console.log(`   ✅ Found Friday (CLOSE) price: ${closeData.price} on ${closeData.date}`);
        break;
      }
      daysBack++;
      
      // Small delay between attempts
      if (daysBack < 5) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!closeData || !closeData.price) {
      console.log(`\n❌ FAILED: Could not fetch Friday (CLOSE) price`);
      return { success: false, error: 'Missing close price', mondayData };
    }
    
    // Calculate weekly return percentage
    const returnPct = ((closeData.price - mondayData.price) / mondayData.price) * 100;
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ WEEKLY RETURN CALCULATION:`);
    console.log(`${'='.repeat(70)}`);
    console.log(`   Fund: ${fundCode}`);
    console.log(`   Monday (OPEN):  ${mondayData.price.toFixed(4)} (${mondayData.date})`);
    console.log(`   Friday (CLOSE): ${closeData.price.toFixed(4)} (${closeData.date})`);
    console.log(`   Weekly Return: ${returnPct.toFixed(4)}%`);
    console.log(`   Formula: ((${closeData.price} - ${mondayData.price}) / ${mondayData.price}) * 100`);
    console.log(`${'='.repeat(70)}`);
    
    return {
      success: true,
      data: {
        open: mondayData.price,
        close: closeData.price,
        returnPct: Number(returnPct.toFixed(4)),
        openDate: mondayData.date,
        closeDate: closeData.date,
        source: 'fintables'
      }
    };
    
  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test all funds batch (like production)
 */
async function testAllFunds(weekStart, weekEnd) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 TEST 3: All Funds Batch (Production-like)`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Week: ${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`);
  console.log(`${'='.repeat(70)}\n`);
  
  try {
    console.log(`⏳ Fetching all TEFAS funds from Fintables...`);
    console.log(`   This may take a few minutes...\n`);
    
    const allResults = await tefasService.fetchTefasDataFromFintables(weekStart, weekEnd);
    
    const successCount = Object.values(allResults).filter(
      r => r.returnPct !== null && r.open !== null && r.close !== null
    ).length;
    const totalCount = Object.keys(allResults).length;
    const failCount = totalCount - successCount;
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 BATCH TEST RESULTS`);
    console.log(`${'='.repeat(70)}`);
    console.log(`Total Funds: ${totalCount}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`Success Rate: ${((successCount / totalCount) * 100).toFixed(1)}%`);
    console.log(`${'='.repeat(70)}\n`);
    
    if (successCount > 0) {
      console.log(`✅ SUCCESSFUL FUNDS:`);
      Object.keys(allResults).forEach(code => {
        const data = allResults[code];
        if (data.returnPct !== null) {
          console.log(`   ${code.padEnd(6)} | Open: ${String(data.open).padStart(10)} | Close: ${String(data.close).padStart(10)} | Return: ${String(data.returnPct.toFixed(2) + '%').padStart(8)}`);
        }
      });
      console.log('');
    }
    
    if (failCount > 0) {
      console.log(`❌ FAILED FUNDS:`);
      Object.keys(allResults).forEach(code => {
        const data = allResults[code];
        if (data.returnPct === null) {
          console.log(`   ${code.padEnd(6)} | Error: ${data.error || 'Unknown error'}`);
        }
      });
      console.log('');
    }
    
    return {
      success: successCount > 0,
      successCount,
      totalCount,
      failCount,
      data: allResults
    };
    
  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
    if (error.stack) {
      console.log(`   Stack:`, error.stack.split('\n').slice(0, 5).join('\n'));
    }
    return { success: false, error: error.message };
  }
}

/**
 * Main test function - runs tests one by one
 */
async function runTests() {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🚀 FINTABLES TEFAS DATA FETCHING - SAFE LOCAL TEST`);
  console.log(`${'='.repeat(70)}`);
  console.log(`⚠️  This test does NOT modify any data`);
  console.log(`⚠️  Week status will NOT be changed`);
  console.log(`⚠️  Existing market data will NOT be affected`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Test Date: ${TEST_CONFIG.testDate.toISOString()}`);
  console.log(`Test Funds: ${TEST_CONFIG.testFunds.join(', ')}`);
  console.log(`Test All Funds: ${TEST_CONFIG.testAllFunds}`);
  console.log(`${'='.repeat(70)}\n`);
  
  const results = {
    singleFund: {},
    weekData: {},
    allFunds: null
  };
  
  const weekStart = getMondayUTC(TEST_CONFIG.testDate);
  const weekEnd = new Date(TEST_CONFIG.testDate);
  
  // TEST 1: Single fund price for today (connection test - optional)
  console.log(`\n${'#'.repeat(70)}`);
  console.log(`# TEST 1: Single Fund Price (Connection Test) - Optional`);
  console.log(`# This just tests if we can connect to Fintables`);
  console.log(`#${'#'.repeat(69)}\n`);
  
  for (let i = 0; i < TEST_CONFIG.testFunds.length; i++) {
    const fundCode = TEST_CONFIG.testFunds[i];
    console.log(`\n[${i + 1}/${TEST_CONFIG.testFunds.length}] Testing ${fundCode} connection...`);
    
    const result = await testSingleFundPrice(fundCode, new Date());
    results.singleFund[fundCode] = result;
    
    // Wait between requests (except for last one)
    if (i < TEST_CONFIG.testFunds.length - 1) {
      console.log(`\n⏳ Waiting 3 seconds before next test...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // TEST 2: Week open/close (WEEKLY RETURN - this is what we need!)
  console.log(`\n\n${'#'.repeat(70)}`);
  console.log(`# TEST 2: Weekly Return (Open/Close) - THIS IS THE IMPORTANT ONE`);
  console.log(`# This calculates the weekly return percentage`);
  console.log(`#${'#'.repeat(69)}\n`);
  
  for (let i = 0; i < TEST_CONFIG.testFunds.length; i++) {
    const fundCode = TEST_CONFIG.testFunds[i];
    console.log(`\n[${i + 1}/${TEST_CONFIG.testFunds.length}] Testing ${fundCode}...`);
    
    const result = await testWeekOpenClose(fundCode, weekStart, weekEnd);
    results.weekData[fundCode] = result;
    
    // Wait between requests (except for last one)
    if (i < TEST_CONFIG.testFunds.length - 1) {
      console.log(`\n⏳ Waiting 5 seconds before next test...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // TEST 3: All funds at once (if enabled)
  if (TEST_CONFIG.testAllFunds) {
    console.log(`\n\n${'#'.repeat(70)}`);
    console.log(`# TEST 3: All Funds Batch (Production-like)`);
    console.log(`#${'#'.repeat(69)}\n`);
    
    results.allFunds = await testAllFunds(weekStart, weekEnd);
  } else {
    console.log(`\n\n${'#'.repeat(70)}`);
    console.log(`# TEST 3: All Funds Batch - SKIPPED`);
    console.log(`# Set testAllFunds: true to enable this test`);
    console.log(`#${'#'.repeat(69)}\n`);
  }
  
  // Final Summary
  console.log(`\n\n${'='.repeat(70)}`);
  console.log(`📊 FINAL TEST SUMMARY`);
  console.log(`${'='.repeat(70)}`);
  
  const singleSuccess = Object.values(results.singleFund).filter(r => r.success).length;
  const weekSuccess = Object.values(results.weekData).filter(r => r.success).length;
  
  console.log(`\nTEST 1 - Single Fund Price (Connection Test):`);
  console.log(`   Successful: ${singleSuccess}/${TEST_CONFIG.testFunds.length}`);
  Object.keys(results.singleFund).forEach(code => {
    const r = results.singleFund[code];
    console.log(`   ${code}: ${r.success ? '✅' : '❌'} ${r.success ? `Price: ${r.data.price}` : `Error: ${r.error}`}`);
  });
  
  console.log(`\nTEST 2 - Weekly Return (Open/Close) - IMPORTANT:`);
  console.log(`   Successful: ${weekSuccess}/${TEST_CONFIG.testFunds.length}`);
  Object.keys(results.weekData).forEach(code => {
    const r = results.weekData[code];
    if (r.success) {
      console.log(`   ${code}: ✅ Open: ${r.data.open.toFixed(4)}, Close: ${r.data.close.toFixed(4)}, Weekly Return: ${r.data.returnPct.toFixed(4)}%`);
    } else {
      console.log(`   ${code}: ❌ Error: ${r.error}`);
    }
  });
  
  if (results.allFunds) {
    console.log(`\nTEST 3 - All Funds Batch:`);
    console.log(`   Successful: ${results.allFunds.successCount}/${results.allFunds.totalCount}`);
    console.log(`   Success Rate: ${((results.allFunds.successCount / results.allFunds.totalCount) * 100).toFixed(1)}%`);
  }
  
  console.log(`\n${'='.repeat(70)}`);
  
  const allPassed = singleSuccess === TEST_CONFIG.testFunds.length && 
                    weekSuccess === TEST_CONFIG.testFunds.length &&
                    (results.allFunds === null || results.allFunds.successCount > 0);
  
  if (allPassed) {
    console.log(`✅ ALL TESTS PASSED! Ready for deployment.`);
    console.log(`${'='.repeat(70)}\n`);
    process.exit(0);
  } else {
    console.log(`⚠️  SOME TESTS FAILED. Review errors above.`);
    console.log(`${'='.repeat(70)}\n`);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runTests()
    .catch(error => {
      console.error('\n💥 Fatal error:', error);
      console.error('Stack:', error.stack);
      process.exit(1);
    });
}

module.exports = { runTests, testSingleFundPrice, testWeekOpenClose, testAllFunds };

