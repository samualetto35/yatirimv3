/**
 * Test all TEFAS funds to verify we can extract real weekly returns from chart data
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

async function testAllFunds() {
  const allFunds = getAllTefasCodes();
  const now = new Date();
  const weekStart = getMondayUTC(now);
  const weekEnd = getFridayUTC(now);
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 TESTING ALL TEFAS FUNDS FOR WEEKLY RETURN`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Week: ${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`);
  console.log(`Total funds: ${allFunds.length}\n`);
  
  const results = [];
  let chartSuccessCount = 0;
  let performanceSectionCount = 0;
  let failCount = 0;
  
  // Process in batches
  const batchSize = 3;
  for (let i = 0; i < allFunds.length; i += batchSize) {
    const batch = allFunds.slice(i, i + batchSize);
    console.log(`📦 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allFunds.length / batchSize)}: ${batch.map(f => f.code).join(', ')}`);
    
    const batchPromises = batch.map(async (fund) => {
      try {
        const data = await tefasService.getFundDataFromHangikredi(fund.code, weekEnd, weekStart, weekEnd);
        
        if (data && data.returnPct !== null) {
          const source = data.source || 'unknown';
          const isFromChart = source === 'hangikredi-chart';
          
          if (isFromChart) {
            chartSuccessCount++;
          } else {
            performanceSectionCount++;
          }
          
          results.push({
            code: fund.code,
            success: true,
            returnPct: data.returnPct,
            open: data.open,
            close: data.close,
            source: source,
            isFromChart: isFromChart,
            note: isFromChart ? '✅ Chart (real weekly)' : '⚠️ PerformanceSection (1-month, not weekly)'
          });
          
          const status = isFromChart ? '✅' : '⚠️';
          console.log(`   ${status} ${fund.code}: ${data.returnPct.toFixed(4)}% (${source})`);
          
          return { code: fund.code, success: true, isFromChart };
        } else {
          failCount++;
          results.push({
            code: fund.code,
            success: false,
            error: 'No data'
          });
          console.log(`   ❌ ${fund.code}: No data`);
          return { code: fund.code, success: false };
        }
      } catch (error) {
        failCount++;
        results.push({
          code: fund.code,
          success: false,
          error: error.message
        });
        console.log(`   ❌ ${fund.code.code}: Error - ${error.message}`);
        return { code: fund.code, success: false };
      }
    });
    
    await Promise.all(batchPromises);
    
    // Wait between batches
    if (i + batchSize < allFunds.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📊 SUMMARY`);
  console.log(`${'='.repeat(70)}`);
  console.log(`\n✅ Chart (Real Weekly Return): ${chartSuccessCount}/${allFunds.length}`);
  console.log(`⚠️  PerformanceSection (1-Month Return): ${performanceSectionCount}/${allFunds.length}`);
  console.log(`❌ Failed: ${failCount}/${allFunds.length}`);
  console.log(`\n📈 Success Rate: ${((chartSuccessCount + performanceSectionCount) / allFunds.length * 100).toFixed(1)}%`);
  console.log(`📊 Chart Data Rate: ${(chartSuccessCount / allFunds.length * 100).toFixed(1)}%`);
  
  // Show detailed results
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📋 DETAILED RESULTS`);
  console.log(`${'='.repeat(70)}\n`);
  
  // Group by source
  const chartResults = results.filter(r => r.isFromChart);
  const perfResults = results.filter(r => r.success && !r.isFromChart);
  const failedResults = results.filter(r => !r.success);
  
  if (chartResults.length > 0) {
    console.log(`\n✅ CHART DATA (Real Weekly Return) - ${chartResults.length} funds:`);
    chartResults.forEach(r => {
      console.log(`   ${r.code}: ${r.returnPct.toFixed(4)}% (Open: ${r.open?.toFixed(4) || 'N/A'}, Close: ${r.close?.toFixed(4) || 'N/A'})`);
    });
  }
  
  if (perfResults.length > 0) {
    console.log(`\n⚠️  PERFORMANCE SECTION (1-Month Return, NOT Weekly) - ${perfResults.length} funds:`);
    perfResults.forEach(r => {
      console.log(`   ${r.code}: ${r.returnPct.toFixed(4)}% (${r.note})`);
    });
  }
  
  if (failedResults.length > 0) {
    console.log(`\n❌ FAILED - ${failedResults.length} funds:`);
    failedResults.forEach(r => {
      console.log(`   ${r.code}: ${r.error || 'No data'}`);
    });
  }
  
  console.log(`\n${'='.repeat(70)}\n`);
  
  return {
    total: allFunds.length,
    chartSuccess: chartSuccessCount,
    performanceSection: performanceSectionCount,
    failed: failCount,
    results: results
  };
}

if (require.main === module) {
  testAllFunds()
    .then((summary) => {
      console.log('✅ Test completed');
      process.exit(0);
    })
    .catch(error => {
      console.error(`\n💥 Fatal error:`, error);
      process.exit(1);
    });
}

module.exports = { testAllFunds };

