/**
 * Manually fetch 2026-W01 TEFAS data and save to database
 * This simulates what the scheduled function will do
 */

const admin = require('firebase-admin');
const tefasService = require('./tefasService');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

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

function getISOWeekId(date = new Date()) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
  const year = tmp.getUTCFullYear();
  return `${year}-W${String(weekNo).padStart(2, '0')}`;
}

async function fetchAndSaveWeek2026W01() {
  const weekId = '2026-W01';
  const marketRef = db.collection('marketData').doc(weekId);
  
  // Week 2026-W01: Monday 2025-12-29 to Friday 2026-01-02
  const weekStart = new Date('2025-12-29T00:00:00Z');
  const weekEnd = new Date('2026-01-02T23:59:59Z');
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🚀 FETCHING AND SAVING 2026-W01 TEFAS DATA`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Week ID: ${weekId}`);
  console.log(`Date Range: ${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`);
  console.log(`${'='.repeat(70)}\n`);
  
  try {
    // Get existing market data to preserve Yahoo data
    const existingData = (await marketRef.get()).data() || {};
    const existingYahooCount = Object.keys(existingData).filter(key => {
      const value = existingData[key];
      return value && typeof value === 'object' && value.source && value.source.includes('yahoo');
    }).length;
    
    console.log(`   Existing Yahoo instruments: ${existingYahooCount}`);
    console.log(`   Existing TEFAS instruments: ${Object.keys(existingData).filter(key => {
      const value = existingData[key];
      return value && typeof value === 'object' && value.source && (value.source.includes('hangikredi') || value.source.includes('tefas'));
    }).length}`);
    
    // Fetch TEFAS data from HangiKredi
    console.log(`\n📥 Fetching TEFAS data from HangiKredi...\n`);
    const tefasData = await tefasService.fetchTefasDataFromHangikredi(weekStart, weekEnd);
    
    const successCount = Object.values(tefasData).filter(
      d => d.returnPct !== null
    ).length;
    const totalCount = Object.keys(tefasData).length;
    const failCount = totalCount - successCount;
    const chartCount = Object.values(tefasData).filter(d => d.source === 'hangikredi-chart').length;
    
    console.log(`\n📊 Results: ${successCount}/${totalCount} successful, ${failCount} failed`);
    console.log(`📊 Chart Data (Real Weekly): ${chartCount}/${totalCount}`);
    
    if (successCount === 0) {
      throw new Error('No TEFAS data fetched from HangiKredi - empty result');
    }
    
    // SAFE UPDATE: Only update TEFAS instruments, preserve all other data
    const updatedData = { ...existingData };
    
    // Only update TEFAS instruments
    Object.keys(tefasData).forEach(code => {
      updatedData[code] = tefasData[code];
    });
    
    // Update metadata
    updatedData.fetchedAt = admin.firestore.FieldValue.serverTimestamp();
    if (!updatedData.sources) {
      updatedData.sources = [];
    }
    if (!updatedData.sources.includes('hangikredi')) {
      updatedData.sources.push('hangikredi');
    }
    
    // Update window info
    updatedData.window = {
      period1: weekStart.toISOString(),
      period2: weekEnd.toISOString(),
      tz: 'UTC',
      sources: updatedData.sources || ['hangikredi']
    };
    
    // SAFE: Use merge: true to preserve existing data
    await marketRef.set(updatedData, { merge: true });
    
    console.log(`\n✅ Updated marketData for ${weekId} (merge: true - Yahoo data preserved)`);
    
    // Verify Yahoo data is still there
    const afterUpdate = (await marketRef.get()).data() || {};
    const afterYahooCount = Object.keys(afterUpdate).filter(key => {
      const value = afterUpdate[key];
      return value && typeof value === 'object' && value.source && value.source.includes('yahoo');
    }).length;
    
    if (afterYahooCount !== existingYahooCount) {
      console.warn(`⚠️  Warning: Yahoo count changed from ${existingYahooCount} to ${afterYahooCount}`);
    } else {
      console.log(`✅ Verified: Yahoo data preserved (${afterYahooCount} instruments)`);
    }
    
    // Show summary
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 SUMMARY`);
    console.log(`${'='.repeat(70)}`);
    console.log(`✅ TEFAS instruments updated: ${successCount}`);
    console.log(`📊 Chart Data (Real Weekly): ${chartCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`💾 Yahoo instruments preserved: ${afterYahooCount}`);
    
    // Show sample results
    console.log(`\n📋 Sample TEFAS Results (first 5):`);
    Object.entries(tefasData).slice(0, 5).forEach(([code, data]) => {
      if (data.returnPct !== null) {
        console.log(`   ✅ ${code}: ${data.returnPct.toFixed(4)}% (${data.source || 'hangikredi'})`);
      }
    });
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ Data saved successfully to database!`);
    console.log(`${'='.repeat(70)}\n`);
    
    return {
      weekId,
      successCount,
      failCount,
      chartCount,
      yahooPreserved: afterYahooCount === existingYahooCount
    };
    
  } catch (error) {
    console.error(`\n❌ Error:`, error);
    console.error('Stack:', error.stack);
    throw error;
  }
}

if (require.main === module) {
  fetchAndSaveWeek2026W01()
    .then(() => {
      console.log('✅ Completed');
      process.exit(0);
    })
    .catch(error => {
      console.error(`\n💥 Fatal error:`, error);
      process.exit(1);
    });
}

module.exports = { fetchAndSaveWeek2026W01 };

