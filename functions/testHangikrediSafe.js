/**
 * Safe local test script for HangiKredi TEFAS data fetching
 * Tests fetching weekly return data for all TEFAS funds
 * 
 * Run with: node testHangikrediSafe.js
 */

const tefasService = require('./tefasService');
const { getAllTefasCodes } = require('./instruments');

function getMondayUTC(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setUTCDate(diff));
}

function getFridayUTC(date) {
  const monday = getMondayUTC(date);
  const friday = new Date(monday);
  friday.setUTCDate(friday.getUTCDate() + 4); // Friday is 4 days after Monday
  return friday;
}

// Test configuration
const TEST_CONFIG = {
  // Test current week
  testCurrentWeek: true,
  // Test specific past weeks
  testPastWeeks: [
    '2025-12-30', // Week 2025-W52
    '2025-12-23', // Week 2025-W51
  ],
  // Test specific funds (empty = all funds)
  testFunds: [], // Empty = test all funds
  // Batch size for processing
  batchSize: 3
};

async function testSingleFund(fundCode, weekStart, weekEnd) {
  console.log(`\n  📊 Testing ${fundCode} for week ${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`);
  
  try {
    const fundData = await tefasService.getFundDataFromHangikredi(fundCode, weekEnd);
    
    if (fundData && fundData.returnPct !== null) {
      console.log(`    ✅ ${fundCode}: Return = ${fundData.returnPct.toFixed(4)}%`);
      if (fundData.price) {
        console.log(`       Price: ${fundData.price.toFixed(4)}, Open: ${fundData.open?.toFixed(4) || 'N/A'}, Close: ${fundData.close?.toFixed(4) || 'N/A'}`);
      }
      return {
        success: true,
        fundCode,
        data: fundData
      };
    } else {
      console.log(`    ❌ ${fundCode}: No return data`);
      return {
        success: false,
        fundCode,
        error: 'No return data'
      };
    }
  } catch (error) {
    console.log(`    ❌ ${fundCode}: Error - ${error.message}`);
    return {
      success: false,
      fundCode,
      error: error.message
    };
  }
}

async function testWeek(weekStart, weekEnd) {
  const weekId = `${weekStart.getUTCFullYear()}-W${String(Math.ceil((weekStart.getUTCDate() + new Date(weekStart.getUTCFullYear(), 0, 1).getUTCDay()) / 7)).padStart(2, '0')}`;
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📅 Testing Week: ${weekId}`);
  console.log(`   Date Range: ${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`);
  console.log(`${'='.repeat(70)}`);
  
  // Get all TEFAS funds or test specific ones
  const allFunds = TEST_CONFIG.testFunds.length > 0 
    ? getAllTefasCodes().filter(f => TEST_CONFIG.testFunds.includes(f.code))
    : getAllTefasCodes();
  
  console.log(`\n📦 Testing ${allFunds.length} funds...`);
  
  // Test batch fetch
  console.log(`\n🔍 Testing batch fetch (fetchTefasDataFromHangikredi)...`);
  const batchResults = await tefasService.fetchTefasDataFromHangikredi(weekStart, weekEnd);
  
  const successCount = Object.values(batchResults).filter(r => r.returnPct !== null).length;
  const failCount = Object.values(batchResults).filter(r => r.returnPct === null).length;
  
  console.log(`\n📊 Batch Results:`);
  console.log(`   ✅ Success: ${successCount}/${allFunds.length}`);
  console.log(`   ❌ Failed: ${failCount}/${allFunds.length}`);
  console.log(`   Success Rate: ${((successCount / allFunds.length) * 100).toFixed(1)}%`);
  
  // Show sample results
  console.log(`\n📋 Sample Results (first 10):`);
  Object.entries(batchResults).slice(0, 10).forEach(([code, data]) => {
    if (data.returnPct !== null) {
      console.log(`   ✅ ${code}: ${data.returnPct.toFixed(4)}% (Open: ${data.open?.toFixed(4) || 'N/A'}, Close: ${data.close?.toFixed(4) || 'N/A'})`);
    } else {
      console.log(`   ❌ ${code}: ${data.error || 'No data'}`);
    }
  });
  
  // Show failed funds
  const failedFunds = Object.entries(batchResults).filter(([code, data]) => data.returnPct === null);
  if (failedFunds.length > 0) {
    console.log(`\n❌ Failed Funds (${failedFunds.length}):`);
    failedFunds.slice(0, 10).forEach(([code, data]) => {
      console.log(`   ${code}: ${data.error || 'No return data'}`);
    });
    if (failedFunds.length > 10) {
      console.log(`   ... and ${failedFunds.length - 10} more`);
    }
  }
  
  return {
    weekId,
    weekStart,
    weekEnd,
    totalFunds: allFunds.length,
    successCount,
    failCount,
    successRate: ((successCount / allFunds.length) * 100).toFixed(1),
    results: batchResults
  };
}

async function runTests() {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🚀 HANGIKREDI TEFAS DATA TEST`);
  console.log(`${'='.repeat(70)}`);
  console.log(`\n📋 Test Configuration:`);
  console.log(`   Test Current Week: ${TEST_CONFIG.testCurrentWeek}`);
  console.log(`   Test Past Weeks: ${TEST_CONFIG.testPastWeeks.length} weeks`);
  console.log(`   Test Funds: ${TEST_CONFIG.testFunds.length > 0 ? TEST_CONFIG.testFunds.join(', ') : 'All funds'}`);
  console.log(`   Batch Size: ${TEST_CONFIG.batchSize}`);
  
  const allResults = [];
  
  // Test current week
  if (TEST_CONFIG.testCurrentWeek) {
    const now = new Date();
    const weekStart = getMondayUTC(now);
    const weekEnd = getFridayUTC(now);
    
    const result = await testWeek(weekStart, weekEnd);
    allResults.push(result);
    
    // Wait between tests
    if (TEST_CONFIG.testPastWeeks.length > 0) {
      console.log(`\n⏳ Waiting 3 seconds before next test...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Test past weeks
  for (const weekDateStr of TEST_CONFIG.testPastWeeks) {
    const weekDate = new Date(weekDateStr);
    const weekStart = getMondayUTC(weekDate);
    const weekEnd = getFridayUTC(weekDate);
    
    const result = await testWeek(weekStart, weekEnd);
    allResults.push(result);
    
    // Wait between tests
    if (TEST_CONFIG.testPastWeeks.indexOf(weekDateStr) < TEST_CONFIG.testPastWeeks.length - 1) {
      console.log(`\n⏳ Waiting 3 seconds before next test...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📊 SUMMARY`);
  console.log(`${'='.repeat(70)}`);
  
  allResults.forEach((result, index) => {
    console.log(`\n${index + 1}. Week ${result.weekId}:`);
    console.log(`   Date Range: ${result.weekStart.toISOString().split('T')[0]} to ${result.weekEnd.toISOString().split('T')[0]}`);
    console.log(`   Success: ${result.successCount}/${result.totalFunds} (${result.successRate}%)`);
    console.log(`   Failed: ${result.failCount}/${result.totalFunds}`);
  });
  
  const avgSuccessRate = allResults.length > 0
    ? (allResults.reduce((sum, r) => sum + parseFloat(r.successRate), 0) / allResults.length).toFixed(1)
    : 0;
  
  console.log(`\n📈 Average Success Rate: ${avgSuccessRate}%`);
  console.log(`\n${'='.repeat(70)}\n`);
}

if (require.main === module) {
  runTests()
    .then(() => {
      console.log('✅ Tests completed');
      process.exit(0);
    })
    .catch(error => {
      console.error(`\n💥 Fatal error:`, error);
      process.exit(1);
    });
}

module.exports = { testWeek, testSingleFund };

