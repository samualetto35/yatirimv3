/**
 * Test 2026-W01 data fetch and verify it works correctly
 */

const tefasService = require('./tefasService');
const { getAllTefasCodes } = require('./instruments');

function parseWeekId(weekId) {
  const [yearStr, wn] = weekId.split('-W');
  return { year: Number(yearStr), week: Number(wn) };
}

function getWeekDatesFromWeekId(weekId) {
  const { year, week } = parseWeekId(weekId);
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const jan1Day = jan1.getUTCDay() || 7;
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4.getUTCDay() || 7) + 1);
  const targetMonday = new Date(week1Monday);
  targetMonday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  targetMonday.setUTCHours(0, 0, 0, 0);
  const targetFriday = new Date(targetMonday);
  targetFriday.setUTCDate(targetMonday.getUTCDate() + 4);
  targetFriday.setUTCHours(23, 59, 59, 999);
  return { start: targetMonday, end: targetFriday };
}

async function testW01() {
  const weekId = '2026-W01';
  const { start, end } = getWeekDatesFromWeekId(weekId);
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 TESTING 2026-W01 DATA FETCH`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Week ID: ${weekId}`);
  console.log(`Monday: ${start.toISOString().split('T')[0]}`);
  console.log(`Friday: ${end.toISOString().split('T')[0]}`);
  console.log(`${'='.repeat(70)}\n`);
  
  const allFunds = getAllTefasCodes();
  console.log(`📦 Fetching data for ${allFunds.length} TEFAS funds...\n`);
  
  try {
    const results = await tefasService.fetchTefasDataFromHangikredi(start, end);
    
    const successCount = Object.values(results).filter(r => r.returnPct !== null).length;
    const chartCount = Object.values(results).filter(r => r.source === 'hangikredi-chart').length;
    const failCount = Object.values(results).filter(r => r.returnPct === null).length;
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 RESULTS`);
    console.log(`${'='.repeat(70)}`);
    console.log(`✅ Success: ${successCount}/${allFunds.length}`);
    console.log(`📊 Chart Data (Real Weekly): ${chartCount}/${allFunds.length}`);
    console.log(`❌ Failed: ${failCount}/${allFunds.length}`);
    
    console.log(`\n📋 All Results:`);
    Object.entries(results).forEach(([code, data]) => {
      if (data.returnPct !== null) {
        const source = data.source || 'unknown';
        const icon = source === 'hangikredi-chart' ? '✅' : '⚠️';
        console.log(`${icon} ${code}: ${data.returnPct.toFixed(4)}% (${source})`);
        if (data.open && data.close) {
          console.log(`   Open: ${data.open.toFixed(4)}, Close: ${data.close.toFixed(4)}`);
        }
      } else {
        console.log(`❌ ${code}: ${data.error || 'No data'}`);
      }
    });
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ Test completed!`);
    console.log(`\n📝 Next step: Call adminTestHangikredi with:`);
    console.log(`   weekId: "2026-W01"`);
    console.log(`   dryRun: false`);
    console.log(`${'='.repeat(70)}\n`);
    
    return results;
  } catch (error) {
    console.error(`\n❌ Error:`, error);
    throw error;
  }
}

if (require.main === module) {
  testW01()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(`\n💥 Fatal error:`, error);
      process.exit(1);
    });
}

module.exports = { testW01 };

