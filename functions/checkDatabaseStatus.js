/**
 * Check database status for W01 and W02
 * Analyze what's happening with weeks and market data
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

function getISOWeekId(date = new Date()) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
  const year = tmp.getUTCFullYear();
  return `${year}-W${String(weekNo).padStart(2, '0')}`;
}

function getNextISOWeekId(date = new Date()) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + 7);
  return getISOWeekId(d);
}

async function checkDatabaseStatus() {
  const now = new Date();
  const currentWeekId = getISOWeekId(now);
  const nextWeekId = getNextISOWeekId(now);
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📊 DATABASE STATUS CHECK`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Today: ${now.toISOString().split('T')[0]}`);
  console.log(`Current Week ID (calculated): ${currentWeekId}`);
  console.log(`Next Week ID (calculated): ${nextWeekId}`);
  console.log(`${'='.repeat(70)}\n`);
  
  // Check W01
  console.log(`\n📅 CHECKING 2026-W01:`);
  const w01WeekRef = db.collection('weeks').doc('2026-W01');
  const w01MarketRef = db.collection('marketData').doc('2026-W01');
  
  const w01WeekSnap = await w01WeekRef.get();
  const w01MarketSnap = await w01MarketRef.get();
  
  if (w01WeekSnap.exists) {
    const w01WeekData = w01WeekSnap.data();
    console.log(`   Week Status: ${w01WeekData.status || 'unknown'}`);
    console.log(`   Start Date: ${w01WeekData.startDate?.toDate?.()?.toISOString() || 'N/A'}`);
    console.log(`   End Date: ${w01WeekData.endDate?.toDate?.()?.toISOString() || 'N/A'}`);
  } else {
    console.log(`   ⚠️  Week document does not exist`);
  }
  
  if (w01MarketSnap.exists) {
    const w01MarketData = w01MarketSnap.data();
    const tefasCount = Object.keys(w01MarketData).filter(key => {
      const value = w01MarketData[key];
      return value && typeof value === 'object' && value.source && (value.source.includes('hangikredi') || value.source.includes('tefas'));
    }).length;
    const yahooCount = Object.keys(w01MarketData).filter(key => {
      const value = w01MarketData[key];
      return value && typeof value === 'object' && value.source && value.source.includes('yahoo');
    }).length;
    const totalInstruments = Object.keys(w01MarketData).filter(key => 
      key !== 'window' && key !== 'fetchedAt' && key !== 'sources'
    ).length;
    
    console.log(`   Market Data: ✅ Exists`);
    console.log(`   TEFAS Instruments: ${tefasCount}`);
    console.log(`   Yahoo Instruments: ${yahooCount}`);
    console.log(`   Total Instruments: ${totalInstruments}`);
    console.log(`   Sources: ${w01MarketData.sources?.join(', ') || 'N/A'}`);
    console.log(`   Fetched At: ${w01MarketData.fetchedAt?.toDate?.()?.toISOString() || 'N/A'}`);
    
    // Check sample TEFAS data
    const sampleTefas = Object.entries(w01MarketData).find(([key, value]) => 
      value && typeof value === 'object' && value.source && value.source.includes('hangikredi')
    );
    if (sampleTefas) {
      console.log(`   Sample TEFAS (${sampleTefas[0]}): returnPct=${sampleTefas[1].returnPct}, source=${sampleTefas[1].source}`);
    }
  } else {
    console.log(`   ⚠️  Market Data document does not exist`);
  }
  
  // Check W02
  console.log(`\n📅 CHECKING 2026-W02:`);
  const w02WeekRef = db.collection('weeks').doc('2026-W02');
  const w02MarketRef = db.collection('marketData').doc('2026-W02');
  
  const w02WeekSnap = await w02WeekRef.get();
  const w02MarketSnap = await w02MarketRef.get();
  
  if (w02WeekSnap.exists) {
    const w02WeekData = w02WeekSnap.data();
    console.log(`   Week Status: ${w02WeekData.status || 'unknown'}`);
    console.log(`   ⚠️  PROBLEM: W02 status is "${w02WeekData.status}" but we're still in W01!`);
    if (w02WeekData.status === 'settled') {
      console.log(`   ❌ CRITICAL: W02 is marked as settled but it shouldn't be!`);
    }
    console.log(`   Start Date: ${w02WeekData.startDate?.toDate?.()?.toISOString() || 'N/A'}`);
    console.log(`   End Date: ${w02WeekData.endDate?.toDate?.()?.toISOString() || 'N/A'}`);
  } else {
    console.log(`   ✅ Week document does not exist (correct - W02 hasn't started yet)`);
  }
  
  if (w02MarketSnap.exists) {
    const w02MarketData = w02MarketSnap.data();
    console.log(`   ⚠️  Market Data exists for W02 (shouldn't exist yet)`);
    console.log(`   Fetched At: ${w02MarketData.fetchedAt?.toDate?.()?.toISOString() || 'N/A'}`);
  } else {
    console.log(`   ✅ Market Data does not exist (correct - W02 hasn't started yet)`);
  }
  
  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📋 SUMMARY`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Current Week: ${currentWeekId}`);
  console.log(`W01 Status: ${w01WeekSnap.exists ? w01WeekSnap.data().status : 'does not exist'}`);
  console.log(`W02 Status: ${w02WeekSnap.exists ? w02WeekSnap.data().status : 'does not exist'}`);
  
  if (w02WeekSnap.exists && w02WeekSnap.data().status === 'settled') {
    console.log(`\n❌ PROBLEM DETECTED: W02 is marked as settled but we're still in W01!`);
    console.log(`   This needs to be fixed manually.`);
  }
  
  console.log(`${'='.repeat(70)}\n`);
}

if (require.main === module) {
  checkDatabaseStatus()
    .then(() => {
      console.log('✅ Check completed');
      process.exit(0);
    })
    .catch(error => {
      console.error(`\n💥 Fatal error:`, error);
      process.exit(1);
    });
}

module.exports = { checkDatabaseStatus };

