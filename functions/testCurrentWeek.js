/**
 * Test fetching current week's TEFAS data from HangiKredi
 * Run this to test the deployed function logic
 */

const tefasService = require('./tefasService');
const { getAllTefasCodes } = require('./instruments');

function getMondayUTC(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setUTCDate(diff));
}

function getFridayUTC(date) {
  const monday = getMondayUTC(date);
  const friday = new Date(monday);
  friday.setUTCDate(friday.getUTCDate() + 4);
  return friday;
}

async function testCurrentWeek() {
  const now = new Date();
  const weekStart = getMondayUTC(now);
  const weekEnd = getFridayUTC(now);
  
  const weekId = `${weekStart.getUTCFullYear()}-W${String(Math.ceil((weekStart.getUTCDate() + new Date(weekStart.getUTCFullYear(), 0, 1).getUTCDay()) / 7)).padStart(2, '0')}`;
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 TESTING CURRENT WEEK TEFAS DATA FETCH`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Week ID: ${weekId}`);
  console.log(`Date Range: ${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`);
  console.log(`Today: ${now.toISOString().split('T')[0]}`);
  console.log(`${'='.repeat(70)}\n`);
  
  const allFunds = getAllTefasCodes();
  console.log(`📦 Testing ${allFunds.length} TEFAS funds...\n`);
  
  try {
    // Use the same function that will be called by the scheduled function
    const results = await tefasService.fetchTefasDataFromHangikredi(weekStart, weekEnd);
    
    const successCount = Object.values(results).filter(r => r.returnPct !== null).length;
    const failCount = Object.values(results).filter(r => r.returnPct === null).length;
    const chartCount = Object.values(results).filter(r => r.source === 'hangikredi-chart').length;
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 RESULTS SUMMARY`);
    console.log(`${'='.repeat(70)}`);
    console.log(`✅ Success: ${successCount}/${allFunds.length}`);
    console.log(`📊 Chart Data (Real Weekly): ${chartCount}/${allFunds.length}`);
    console.log(`❌ Failed: ${failCount}/${allFunds.length}`);
    console.log(`📈 Success Rate: ${((successCount / allFunds.length) * 100).toFixed(1)}%`);
    console.log(`📊 Chart Data Rate: ${((chartCount / allFunds.length) * 100).toFixed(1)}%`);
    
    // Show all results
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📋 DETAILED RESULTS`);
    console.log(`${'='.repeat(70)}\n`);
    
    Object.entries(results).forEach(([code, data]) => {
      if (data.returnPct !== null) {
        const source = data.source || 'unknown';
        const isChart = source === 'hangikredi-chart';
        const icon = isChart ? '✅' : '⚠️';
        console.log(`${icon} ${code}: ${data.returnPct.toFixed(4)}% (${source})`);
        if (data.open && data.close) {
          console.log(`   Open: ${data.open.toFixed(4)}, Close: ${data.close.toFixed(4)}`);
        }
      } else {
        console.log(`❌ ${code}: ${data.error || 'No data'}`);
      }
    });
    
    // Show failed funds
    const failedFunds = Object.entries(results).filter(([code, data]) => data.returnPct === null);
    if (failedFunds.length > 0) {
      console.log(`\n❌ FAILED FUNDS (${failedFunds.length}):`);
      failedFunds.forEach(([code, data]) => {
        console.log(`   ${code}: ${data.error || 'No return data'}`);
      });
    }
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ Test completed successfully!`);
    console.log(`${'='.repeat(70)}\n`);
    
    return {
      weekId,
      weekStart,
      weekEnd,
      successCount,
      failCount,
      chartCount,
      totalFunds: allFunds.length,
      results
    };
    
  } catch (error) {
    console.error(`\n❌ Error:`, error);
    console.error('Stack:', error.stack);
    throw error;
  }
}

if (require.main === module) {
  testCurrentWeek()
    .then((summary) => {
      console.log('✅ Test completed');
      process.exit(0);
    })
    .catch(error => {
      console.error(`\n💥 Fatal error:`, error);
      process.exit(1);
    });
}

module.exports = { testCurrentWeek };

