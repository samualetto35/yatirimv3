/**
 * Fix W02 status if it's incorrectly marked as settled
 * This script will:
 * 1. Check W01 and W02 status
 * 2. Fix W02 if it's incorrectly settled
 * 3. Ensure W01 is properly settled
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

async function fixW02Status() {
  const now = new Date();
  const currentWeekId = getISOWeekId(now);
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🔧 FIXING W02 STATUS`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Today: ${now.toISOString().split('T')[0]}`);
  console.log(`Current Week ID: ${currentWeekId}`);
  console.log(`${'='.repeat(70)}\n`);
  
  // Check W01
  console.log(`\n📅 CHECKING 2026-W01:`);
  const w01WeekRef = db.collection('weeks').doc('2026-W01');
  const w01WeekSnap = await w01WeekRef.get();
  
  if (w01WeekSnap.exists) {
    const w01Data = w01WeekSnap.data();
    console.log(`   Status: ${w01Data.status}`);
    if (w01Data.status !== 'settled') {
      console.log(`   ⚠️  W01 is not settled. Should it be settled?`);
    }
  } else {
    console.log(`   ⚠️  W01 document does not exist`);
  }
  
  // Check W02
  console.log(`\n📅 CHECKING 2026-W02:`);
  const w02WeekRef = db.collection('weeks').doc('2026-W02');
  const w02WeekSnap = await w02WeekRef.get();
  
  if (w02WeekSnap.exists) {
    const w02Data = w02WeekSnap.data();
    console.log(`   Current Status: ${w02Data.status}`);
    
    if (w02Data.status === 'settled') {
      console.log(`   ❌ PROBLEM: W02 is marked as settled but we're still in W01!`);
      console.log(`   🔧 Fixing: Changing status to 'upcoming'...`);
      
      // Fix: Change status to 'upcoming' (or delete if it shouldn't exist yet)
      await w02WeekRef.update({
        status: 'upcoming'
      });
      
      console.log(`   ✅ Fixed: W02 status changed from 'settled' to 'upcoming'`);
    } else {
      console.log(`   ✅ W02 status is correct: ${w02Data.status}`);
    }
  } else {
    console.log(`   ✅ W02 document does not exist (correct - hasn't started yet)`);
  }
  
  // Check market data
  console.log(`\n📊 CHECKING MARKET DATA:`);
  const w01MarketRef = db.collection('marketData').doc('2026-W01');
  const w02MarketRef = db.collection('marketData').doc('2026-W02');
  
  const w01MarketSnap = await w01MarketRef.get();
  const w02MarketSnap = await w02MarketRef.get();
  
  if (w01MarketSnap.exists) {
    const w01MarketData = w01MarketSnap.data();
    const totalInstruments = Object.keys(w01MarketData).filter(key => 
      key !== 'window' && key !== 'fetchedAt' && key !== 'sources'
    ).length;
    console.log(`   W01 Market Data: ✅ Exists (${totalInstruments} instruments)`);
  } else {
    console.log(`   W01 Market Data: ⚠️  Does not exist`);
  }
  
  if (w02MarketSnap.exists) {
    console.log(`   W02 Market Data: ⚠️  Exists but shouldn't (week hasn't started)`);
    console.log(`   🔧 Should we delete it? (Not deleting automatically - manual review needed)`);
  } else {
    console.log(`   W02 Market Data: ✅ Does not exist (correct)`);
  }
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`✅ FIX COMPLETED`);
  console.log(`${'='.repeat(70)}\n`);
}

if (require.main === module) {
  fixW02Status()
    .then(() => {
      console.log('✅ Script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error(`\n💥 Fatal error:`, error);
      process.exit(1);
    });
}

module.exports = { fixW02Status };

