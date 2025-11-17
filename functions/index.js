const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { getAllYahooTickers, getAllTefasCodes } = require('./instruments');
const tefasService = require('./tefasService');

try {
  admin.initializeApp();
} catch (e) {}

const db = admin.firestore();
const ADMIN_EMAILS = ['abdussamet.yildiz@sabanciuniv.edu'];

// ---------- Logging helper ----------
async function logEvent({ category, action, message, data = {}, user = null, weekId = null, severity = 'info', source = 'functions', outcome = 'success' }) {
  try {
    await db.collection('logs').add({
      category, // 'automation' | 'admin' | 'market' | 'allocation' | 'recompute' | 'auth'
      action,   // e.g., 'openWindow', 'closeWindow', 'fetchMarketData', 'settleWeek'
      message,
      data,
      weekId,
      user,
      severity,
      source,
      outcome,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error('Failed to write log', e);
  }
}

// Collections
// weeks: { id: '2025-W30', status: 'upcoming|open|closed|settled',
//          openAt: Timestamp, closeAt: Timestamp, settleAt: Timestamp,
//          startDate: Timestamp, endDate: Timestamp, pairs: ['TSLA','AAPL'] }
// marketData/{weekId}: { TSLA: { open, close, returnPct }, AAPL: {...} }
// allocations/{weekId}_{uid}: { uid, weekId, pairs: { TSLA: pct, AAPL: pct }, submittedAt, baseBalance, resultReturnPct, endBalance }
// balances/{uid}: { latestWeekId, latestBalance }

function getISOWeekId(date = new Date()) {
  // produces e.g. 2025-W30 (ISO week)
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

function getPrevISOWeekId(date = new Date()) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - 7);
  return getISOWeekId(d);
}

function parseWeekId(weekId) {
  // format YYYY-WNN
  const [yearStr, wn] = weekId.split('-W');
  return { year: Number(yearStr), week: Number(wn) };
}

async function ensureBalance(uid) {
  const balRef = db.collection('balances').doc(uid);
  const snap = await balRef.get();
  if (!snap.exists) {
    await balRef.set({ latestBalance: 100000, latestWeekId: null, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return 100000;
  }
  return snap.data().latestBalance || 100000;
}

async function upsertWeek(weekId, data) {
  const ref = db.collection('weeks').doc(weekId);
  // Get all available instrument codes
  const yahooInstruments = getAllYahooTickers().map(i => i.code);
  const tefasInstruments = getAllTefasCodes().map(i => i.code);
  const allInstruments = [...yahooInstruments, ...tefasInstruments];
  
  await ref.set({ pairs: allInstruments, ...data }, { merge: true });
}

// ---------- Market helpers (base + corrections) ----------
async function getEffectiveMarket(weekId) {
  const baseSnap = await db.collection('marketData').doc(weekId).get();
  const corrSnap = await db.collection('marketCorrections').doc(weekId).get();
  const base = baseSnap.exists ? baseSnap.data() : {};
  const corr = corrSnap.exists ? corrSnap.data() : {};
  
  function mergeOne(sym) {
    const b = base[sym] || {};
    const c = corr[sym] || {};
    // Priority: explicit correction.returnPct, else compute from corrected open/close, else base returnPct
    if (typeof c.returnPct === 'number') return { open: c.open ?? b.open, close: c.close ?? b.close, returnPct: c.returnPct };
    if (typeof c.open === 'number' && typeof c.close === 'number' && c.open) {
      const r = ((c.close - c.open) / c.open) * 100;
      return { open: c.open, close: c.close, returnPct: Number(r.toFixed(4)) };
    }
    return { open: b.open, close: b.close, returnPct: b.returnPct };
  }
  
  // Get all instrument codes from base and corrections
  const allSymbols = new Set([...Object.keys(base), ...Object.keys(corr)]);
  // Filter out metadata fields
  const metadataFields = ['window', 'fetchedAt', 'createdAt', 'updatedAt'];
  const instrumentSymbols = [...allSymbols].filter(s => !metadataFields.includes(s));
  
  // Build result object with all instruments
  const result = {};
  for (const sym of instrumentSymbols) {
    result[sym] = mergeOne(sym);
  }
  
  // Check if we have at least some valid data
  const hasValidData = Object.values(result).some(x => typeof x.returnPct === 'number');
  if (!hasValidData) return null;
  
  return result;
}

// Compute Monday 00:00 UTC for the week containing the provided date
function getMondayUTC(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // Sun=0, Mon=1, ...
  const diff = day === 0 ? -6 : 1 - day; // move back to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Batched write helper to avoid 500-writes-per-batch limit
function createBatcher() {
  let batch = db.batch();
  let opCount = 0;
  const commits = [];
  function rotateIfNeeded() {
    if (opCount >= 450) { // keep headroom under 500
      commits.push(batch.commit());
      batch = db.batch();
      opCount = 0;
    }
  }
  return {
    set(ref, data, options) {
      batch.set(ref, data, options);
      opCount += 1;
      rotateIfNeeded();
    },
    update(ref, data) {
      batch.update(ref, data);
      opCount += 1;
      rotateIfNeeded();
    },
    async flush() {
      if (opCount > 0) commits.push(batch.commit());
      if (commits.length) await Promise.all(commits);
    }
  };
}

// Scheduled: Friday 23:58 TRT - open next week allocation window (after settlement)
exports.openNextWeekWindow = functions.pubsub.schedule('58 23 * * FRI').timeZone('Europe/Istanbul').onRun(async () => {
  const now = new Date();
  const nextWeekId = getNextISOWeekId(now);

  // Open window Saturday 21:00 UTC, close Sunday 21:00 UTC
  const openAt = admin.firestore.Timestamp.fromDate(now);
  const closeDate = new Date(now); closeDate.setUTCHours(21); closeDate.setUTCDate(now.getUTCDate() + (now.getUTCDay() === 6 ? 1 : 1));
  const closeAt = admin.firestore.Timestamp.fromDate(closeDate);

  // Week period Monday 00:00 to Friday 21:00 UTC
  const startDate = new Date(now); startDate.setUTCDate(now.getUTCDate() + (8 - now.getUTCDay())); startDate.setUTCHours(0,0,0,0);
  const endDate = new Date(startDate); endDate.setUTCDate(startDate.getUTCDate() + 4); endDate.setUTCHours(21,0,0,0);

  await upsertWeek(nextWeekId, {
    id: nextWeekId,
    status: 'open',
    openAt,
    closeAt,
    startDate: admin.firestore.Timestamp.fromDate(startDate),
    endDate: admin.firestore.Timestamp.fromDate(endDate),
  });
  await logEvent({ category: 'automation', action: 'openWindow', message: `Opened allocation window for ${nextWeekId}`, data: { nextWeekId } });
  return null;
});

// Scheduled: Every Sunday 21:00 UTC - close allocation window
exports.closeCurrentAllocation = functions.pubsub.schedule('0 23 * * SUN').timeZone('Europe/Istanbul').onRun(async () => {
  const now = new Date();
  const nextWeekId = getISOWeekId(new Date(now.getTime() + 7*86400000));
  await upsertWeek(nextWeekId, { status: 'closed' });
  await logEvent({ category: 'automation', action: 'closeWindow', message: `Closed allocation window for ${nextWeekId}`, data: { nextWeekId } });
  return null;
});

// Scheduled: Every Friday 23:30 TRT (after US market close) - fetch market data for the current week
exports.fetchMarketData = functions.pubsub.schedule('30 23 * * FRI').timeZone('Europe/Istanbul').onRun(async () => {
  const yahooFinance = require('yahoo-finance2').default;
  const weekId = getISOWeekId();
  const marketRef = db.collection('marketData').doc(weekId);

  const end = new Date();
  const start = getMondayUTC(end);

  // Fetch Yahoo Finance instruments
  async function getYahooWeekOpenClose(ticker) {
    try {
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
      console.error(`Error fetching ${ticker}:`, error.message);
      return { open: null, close: null, returnPct: null, error: error.message };
    }
  }

  // Fetch all Yahoo instruments
  const yahooInstruments = getAllYahooTickers();
  const yahooPromises = yahooInstruments.map(async (inst) => {
    const data = await getYahooWeekOpenClose(inst.ticker);
    return { code: inst.code, data };
  });

  // Fetch all TEFAS instruments
  const tefasInstruments = getAllTefasCodes();
  const tefasPromises = tefasInstruments.map(async (inst) => {
    const data = await tefasService.getWeekOpenClose(inst.code, start, end);
    return { code: inst.code, data };
  });

  // Wait for all data
  const [yahooResults, tefasResults] = await Promise.all([
    Promise.all(yahooPromises),
    Promise.all(tefasPromises)
  ]);

  // Build market data object
  const marketData = {
    window: {
      period1: start.toISOString(),
      period2: end.toISOString(),
      tz: 'UTC',
      sources: ['yahoo-finance2', 'tefas']
    },
    fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Add Yahoo results
  yahooResults.forEach(({ code, data }) => {
    marketData[code] = data;
  });

  // Add TEFAS results
  tefasResults.forEach(({ code, data }) => {
    marketData[code] = data;
  });

  // Save to Firestore
  await marketRef.set(marketData, { merge: true });

  // Log summary
  const successCount = [...yahooResults, ...tefasResults].filter(r => r.data.returnPct !== null).length;
  const totalCount = yahooResults.length + tefasResults.length;
  
  await logEvent({ 
    category: 'market', 
    action: 'fetchMarketData', 
    message: `Stored market data for ${weekId}: ${successCount}/${totalCount} instruments`, 
    data: { 
      weekId, 
      yahooCount: yahooResults.length,
      tefasCount: tefasResults.length,
      successCount,
      totalCount
    } 
  });
  
  return null;
});

// Scheduled: Every Friday 23:45 TRT - settle week (after market data)
exports.settleWeek = functions.pubsub.schedule('45 23 * * FRI').timeZone('Europe/Istanbul').onRun(async () => {
  const weekId = getISOWeekId();
  const md = await getEffectiveMarket(weekId);
  if (!md) {
    console.warn('No effective market data for', weekId);
    return null;
  }

  const allocPrefix = `${weekId}_`;
  const allocsSnap = await db.collection('allocations').where('weekId', '==', weekId).get();
  const batch = createBatcher();
  const processedUids = new Set();

  for (const doc of allocsSnap.docs) {
    const alloc = doc.data();
    const uid = alloc.uid;
    processedUids.add(uid);
    const baseBalance = alloc.baseBalance ?? await ensureBalance(uid);
    
    // Get actual previous week end balance from weeklyBalances collection
    const prevWeekId = getPrevISOWeekId(weekId);
    let prevWeekEndBalance = baseBalance; // fallback to current baseBalance
    
    try {
      const prevWbRef = db.collection('weeklyBalances').doc(`${prevWeekId}_${uid}`);
      const prevWbSnap = await prevWbRef.get();
      if (prevWbSnap.exists && prevWbSnap.data()?.endBalance != null) {
        prevWeekEndBalance = prevWbSnap.data().endBalance;
      }
    } catch (e) {
      console.warn(`Could not fetch prev week balance for ${uid} in week ${prevWeekId}:`, e);
    }
    
    // Weighted return
    const tslaW = alloc.pairs?.TSLA ?? 0;
    const aaplW = alloc.pairs?.AAPL ?? 0;
    const retPct = (tslaW * (md.TSLA?.returnPct ?? 0) + aaplW * (md.AAPL?.returnPct ?? 0)) / Math.max(tslaW + aaplW, 1);
    const endBalance = baseBalance * (1 + retPct / 100);
    
    // Calculate week-over-week percentage based on actual previous week end balance
    const weekOverWeekPct = prevWeekEndBalance > 0 ? ((endBalance - prevWeekEndBalance) / prevWeekEndBalance) * 100 : retPct;

    batch.update(doc.ref, {
      resultReturnPct: retPct,
      endBalance,
      settledAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const balRef = db.collection('balances').doc(uid);
    batch.set(balRef, {
      latestWeekId: weekId,
      latestBalance: endBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Write weeklyBalances history document
    const wbRef = db.collection('weeklyBalances').doc(`${weekId}_${uid}`);
    batch.set(wbRef, {
      uid,
      weekId,
      baseBalance,
      endBalance,
      resultReturnPct: retPct,
      prevWeekEndBalance,
      weekOverWeekPct,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  await batch.flush();

  // Carry-forward for users without allocation: create weeklyBalances with 0% and advance latestWeekId
  try {
    const allBalancesSnap = await db.collection('balances').get();
    const cfBatch = createBatcher();
    const prevWeekId = getPrevISOWeekId(weekId);
    
    // Process carry-forward users in batches to avoid too many concurrent async operations
    const batchSize = 10;
    const allUids = Array.from(allBalancesSnap.docs.map(d => d.id)).filter(uid => !processedUids.has(uid));
    
    for (let i = 0; i < allUids.length; i += batchSize) {
      const batchUids = allUids.slice(i, i + batchSize);
      const carryForwardPromises = batchUids.map(async (uid) => {
        const bal = allBalancesSnap.docs.find(d => d.id === uid)?.data() || {};
        const base = bal.latestBalance != null ? bal.latestBalance : 100000;
        
        // Get actual previous week end balance for carry-forward users too
        let prevWeekEndBalance = base; // fallback to current balance
        
        try {
          const prevWbRef = db.collection('weeklyBalances').doc(`${prevWeekId}_${uid}`);
          const prevWbSnap = await prevWbRef.get();
          if (prevWbSnap.exists && prevWbSnap.data()?.endBalance != null) {
            prevWeekEndBalance = prevWbSnap.data().endBalance;
          }
        } catch (e) {
          console.warn(`Could not fetch prev week balance for carry-forward user ${uid} in week ${prevWeekId}:`, e);
        }
        
        const wbRef = db.collection('weeklyBalances').doc(`${weekId}_${uid}`);
        cfBatch.set(wbRef, {
          uid,
          weekId,
          baseBalance: base,
          endBalance: base,
          resultReturnPct: 0,
          prevWeekEndBalance,
          weekOverWeekPct: 0, // No change for carry-forward
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        cfBatch.set(db.collection('balances').doc(uid), {
          latestWeekId: weekId,
          latestBalance: base,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      });
      
      await Promise.all(carryForwardPromises);
    }
    
    await cfBatch.flush();
  } catch (e) {
    console.error('Carry-forward (no allocation) failed for', weekId, e);
  }
  await upsertWeek(weekId, { status: 'settled' });
  await logEvent({ category: 'automation', action: 'settleWeek', message: `Settled week ${weekId}`, data: { weekId, numAllocations: allocsSnap.size } });
  return null;
});

// Callable: submit allocation for open week
exports.submitAllocation = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.email_verified) {
    throw new functions.https.HttpsError('permission-denied', 'Email must be verified.');
  }

  const uid = context.auth.uid;
  const weekId = data.weekId;
  const pairs = data.pairs; // { TSLA: 0.6, AAPL: 0.4 }

  if (!weekId || !pairs) {
    throw new functions.https.HttpsError('invalid-argument', 'weekId and pairs are required');
  }

  const weekSnap = await db.collection('weeks').doc(weekId).get();
  if (!weekSnap.exists) throw new functions.https.HttpsError('failed-precondition', 'Week not found');
  const week = weekSnap.data();
  if (week.status !== 'open') throw new functions.https.HttpsError('failed-precondition', 'Allocation window is not open');

  const sum = (pairs.TSLA || 0) + (pairs.AAPL || 0);
  if (Math.abs(sum - 1) > 1e-6) throw new functions.https.HttpsError('invalid-argument', 'Weights must sum to 1');

  const baseBalance = await ensureBalance(uid);
  const ref = db.collection('allocations').doc(`${weekId}_${uid}`);
  await ref.set({
    uid,
    weekId,
    pairs,
    baseBalance,
    submittedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  await logEvent({ category: 'allocation', action: 'submitAllocation', message: `Allocation submitted for ${weekId}`, data: { weekId, pairs }, user: { uid, email: context.auth.token.email } });
  return { ok: true };
});

// Auth trigger: initialize user balance on creation
exports.onAuthCreate = functions.auth.user().onCreate(async (user) => {
  const uid = user.uid;
  const balRef = db.collection('balances').doc(uid);
  await balRef.set({ latestBalance: 100000, latestWeekId: null, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  await logEvent({ category: 'auth', action: 'onAuthCreate', message: `Seeded balance for ${uid}`, user: { uid, email: user.email } });
  return null;
});

// ---------- Admin callables for safe manual control ----------
function assertAdmin(context) {
  if (!context.auth || !context.auth.token?.email_verified) {
    throw new functions.https.HttpsError('permission-denied', 'Auth required');
  }
  const email = context.auth.token.email || '';
  if (!ADMIN_EMAILS.includes(email)) {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized');
  }
}

exports.adminCreateOrUpdateWeek = functions.https.onCall(async (data, context) => {
  assertAdmin(context);
  const { weekId, status, openAt, closeAt, startDate, endDate, correctionMode, reason } = data || {};
  if (!weekId || !status) throw new functions.https.HttpsError('invalid-argument', 'weekId and status required');
  // Guard: only allow forward transitions unless in correctionMode with reason
  const existing = await db.collection('weeks').doc(weekId).get();
  if (existing.exists) {
    const cur = existing.data().status;
    const order = ['upcoming', 'open', 'closed', 'settled'];
    const idxCur = order.indexOf(cur);
    const idxNew = order.indexOf(status);
    if (idxNew < idxCur && !correctionMode) {
      throw new functions.https.HttpsError('failed-precondition', 'Backward status change requires correctionMode with reason');
    }
    if (idxNew < idxCur && correctionMode && !reason) {
      throw new functions.https.HttpsError('invalid-argument', 'Provide reason for backward status change');
    }
  }
  await upsertWeek(weekId, {
    id: weekId,
    status,
    openAt: openAt ? admin.firestore.Timestamp.fromDate(new Date(openAt)) : undefined,
    closeAt: closeAt ? admin.firestore.Timestamp.fromDate(new Date(closeAt)) : undefined,
    startDate: startDate ? admin.firestore.Timestamp.fromDate(new Date(startDate)) : undefined,
    endDate: endDate ? admin.firestore.Timestamp.fromDate(new Date(endDate)) : undefined,
  });
  await logEvent({ category: 'admin', action: 'createOrUpdateWeek', message: `Admin created/updated ${weekId}`, data: { weekId, status }, user: { email: context.auth.token.email } });
  return { ok: true };
});

exports.adminCloseWeek = functions.https.onCall(async (data, context) => {
  assertAdmin(context);
  const { weekId } = data || {};
  if (!weekId) throw new functions.https.HttpsError('invalid-argument', 'weekId required');
  await upsertWeek(weekId, { status: 'closed' });
  await logEvent({ category: 'admin', action: 'closeWeek', message: `Admin closed ${weekId}`, data: { weekId }, user: { email: context.auth.token.email } });
  return { ok: true };
});

exports.adminFetchMarketData = functions.https.onCall(async (data, context) => {
  assertAdmin(context);
  const { weekId } = data || {};
  const targetWeek = weekId || getISOWeekId();
  const yahooFinance = require('yahoo-finance2').default;
  const end = new Date();
  const start = getMondayUTC(end);
  async function getWeekOpenClose(symbol) {
    const queryOptions = { period1: start, period2: end, interval: '1d' };
    const result = await yahooFinance.historical(symbol, queryOptions);
    if (!result || result.length === 0) {
      const quote = await yahooFinance.quote(symbol);
      const price = quote.regularMarketPrice || 0;
      return { open: price, close: price, returnPct: 0 };
    }
    const sorted = result.sort((a, b) => new Date(a.date) - new Date(b.date));
    const filtered = sorted.filter(r => new Date(r.date) >= start);
    const use = filtered.length ? filtered : sorted;
    const first = use[0];
    const last = use[use.length - 1];
    const open = first.open || first.close || 0;
    const close = last.close || last.open || 0;
    const returnPct = open ? ((close - open) / open) * 100 : 0;
    return { open, close, returnPct: Number(returnPct.toFixed(4)) };
  }
  const [tsla, aapl] = await Promise.all([
    getWeekOpenClose('TSLA'), getWeekOpenClose('AAPL')
  ]);
  await db.collection('marketData').doc(targetWeek).set({
    TSLA: tsla,
    AAPL: aapl,
    window: {
      period1: start.toISOString(),
      period2: end.toISOString(),
      tz: 'UTC',
      source: 'yahoo-finance2'
    },
    fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  await logEvent({ category: 'admin', action: 'fetchMarketData', message: `Admin fetched market data for ${targetWeek}`, data: { targetWeek, TSLA: tsla, AAPL: aapl }, user: { email: context.auth.token.email } });
  return { ok: true };
});

exports.adminSetMarketCorrection = functions.https.onCall(async (data, context) => {
  assertAdmin(context);
  const { weekId, TSLA, AAPL, note } = data || {};
  if (!weekId) throw new functions.https.HttpsError('invalid-argument', 'weekId required');
  const payload = {
    ...(TSLA ? { TSLA } : {}),
    ...(AAPL ? { AAPL } : {}),
    note: note || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: context.auth.token.email,
  };
  await db.collection('marketCorrections').doc(weekId).set(payload, { merge: true });
  await logEvent({ category: 'admin', action: 'setMarketCorrection', message: `Admin set correction for ${weekId}`, data: payload, user: { email: context.auth.token.email } });
  // Recompute will be triggered by onWrite below
  return { ok: true };
});

exports.adminSettleWeek = functions.https.onCall(async (data, context) => {
  assertAdmin(context);
  const { weekId } = data || {};
  if (!weekId) throw new functions.https.HttpsError('invalid-argument', 'weekId required');

  const mdSnap = await db.collection('marketData').doc(weekId).get();
  if (!mdSnap.exists) throw new functions.https.HttpsError('failed-precondition', 'No market data for week');
  const md = mdSnap.data();
  const allocsSnap = await db.collection('allocations').where('weekId', '==', weekId).get();
  const batch = createBatcher();
  const processedUids = new Set();
  for (const doc of allocsSnap.docs) {
    const alloc = doc.data();
    const uid = alloc.uid;
    processedUids.add(uid);
    const baseBalance = alloc.baseBalance ?? await ensureBalance(uid);
    
    // Get actual previous week end balance from weeklyBalances collection
    const prevWeekId = getPrevISOWeekId(weekId);
    let prevWeekEndBalance = baseBalance; // fallback to current baseBalance
    
    try {
      const prevWbRef = db.collection('weeklyBalances').doc(`${prevWeekId}_${uid}`);
      const prevWbSnap = await prevWbRef.get();
      if (prevWbSnap.exists && prevWbSnap.data()?.endBalance != null) {
        prevWeekEndBalance = prevWbSnap.data().endBalance;
      }
    } catch (e) {
      console.warn(`Could not fetch prev week balance for ${uid} in week ${prevWeekId}:`, e);
    }
    
    const tslaW = alloc.pairs?.TSLA ?? 0;
    const aaplW = alloc.pairs?.AAPL ?? 0;
    const retPct = (tslaW * (md.TSLA?.returnPct ?? 0) + aaplW * (md.AAPL?.returnPct ?? 0)) / Math.max(tslaW + aaplW, 1);
    const endBalance = baseBalance * (1 + retPct / 100);
    
    // Calculate week-over-week percentage based on actual previous week end balance
    const weekOverWeekPct = prevWeekEndBalance > 0 ? ((endBalance - prevWeekEndBalance) / prevWeekEndBalance) * 100 : retPct;
    
    batch.update(doc.ref, {
      resultReturnPct: retPct,
      endBalance,
      settledAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    batch.set(db.collection('balances').doc(uid), {
      latestWeekId: weekId,
      latestBalance: endBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // weeklyBalances history for admin settle
    const wbRef = db.collection('weeklyBalances').doc(`${weekId}_${uid}`);
    batch.set(wbRef, {
      uid,
      weekId,
      baseBalance,
      endBalance,
      resultReturnPct: retPct,
      prevWeekEndBalance,
      weekOverWeekPct,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  await batch.flush();

  // Carry-forward for users without allocation (admin settle)
  try {
    const allBalancesSnap = await db.collection('balances').get();
    const cfBatch = createBatcher();
    const prevWeekId = getPrevISOWeekId(weekId);
    
    // Process carry-forward users in batches to avoid too many concurrent async operations
    const batchSize = 10;
    const allUids = Array.from(allBalancesSnap.docs.map(d => d.id)).filter(uid => !processedUids.has(uid));
    
    for (let i = 0; i < allUids.length; i += batchSize) {
      const batchUids = allUids.slice(i, i + batchSize);
      const carryForwardPromises = batchUids.map(async (uid) => {
        const bal = allBalancesSnap.docs.find(d => d.id === uid)?.data() || {};
        const base = bal.latestBalance != null ? bal.latestBalance : 100000;
        
        // Get actual previous week end balance for carry-forward users too
        let prevWeekEndBalance = base; // fallback to current balance
        
        try {
          const prevWbRef = db.collection('weeklyBalances').doc(`${prevWeekId}_${uid}`);
          const prevWbSnap = await prevWbRef.get();
          if (prevWbSnap.exists && prevWbSnap.data()?.endBalance != null) {
            prevWeekEndBalance = prevWbSnap.data().endBalance;
          }
        } catch (e) {
          console.warn(`Could not fetch prev week balance for carry-forward user ${uid} in week ${prevWeekId}:`, e);
        }
        
        const wbRef = db.collection('weeklyBalances').doc(`${weekId}_${uid}`);
        cfBatch.set(wbRef, {
          uid,
          weekId,
          baseBalance: base,
          endBalance: base,
          resultReturnPct: 0,
          prevWeekEndBalance,
          weekOverWeekPct: 0, // No change for carry-forward
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        cfBatch.set(db.collection('balances').doc(uid), {
          latestWeekId: weekId,
          latestBalance: base,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      });
      
      await Promise.all(carryForwardPromises);
    }
    
    await cfBatch.flush();
  } catch (e) {
    console.error('Carry-forward (no allocation) failed for admin settle', weekId, e);
  }
  await upsertWeek(weekId, { status: 'settled' });
  await logEvent({ category: 'admin', action: 'settleWeek', message: `Admin settled ${weekId}`, data: { weekId, numAllocations: allocsSnap.size }, user: { email: context.auth.token.email } });
  return { ok: true };
});

// --------- Recompute pipeline (admin + trigger) ---------
async function listWeeksFrom(weekId) {
  // Prefer ordering by startDate when available
  const weeksSnap = await db.collection('weeks').get();
  const all = weeksSnap.docs.map(d => d.data()).filter(Boolean);
  // If no startDate, fall back to weekId sort
  const withStart = all.every(w => w.startDate);
  if (withStart) {
    all.sort((a, b) => a.startDate.toMillis() - b.startDate.toMillis());
  } else {
    all.sort((a, b) => {
      const pa = parseWeekId(a.id || '0-W0');
      const pb = parseWeekId(b.id || '0-W0');
      if (pa.year !== pb.year) return pa.year - pb.year;
      return pa.week - pb.week;
    });
  }
  const startIdx = all.findIndex(w => w.id === weekId);
  return startIdx >= 0 ? all.slice(startIdx) : [];
}

async function loadPrevBalancesMap(prevWeekId) {
  const map = new Map();
  if (!prevWeekId) return map;
  const prevAllocs = await db.collection('allocations').where('weekId', '==', prevWeekId).get();
  prevAllocs.forEach(d => {
    const a = d.data();
    if (a && a.uid != null && a.endBalance != null) {
      map.set(a.uid, a.endBalance);
    }
  });
  return map;
}

async function getStartingBalance(uid, cacheMap) {
  if (cacheMap.has(uid)) return cacheMap.get(uid);
  const balSnap = await db.collection('balances').doc(uid).get();
  const start = balSnap.exists && balSnap.data()?.latestBalance != null ? balSnap.data().latestBalance : 100000;
  cacheMap.set(uid, start);
  return start;
}

async function recomputeFromWeek(weekId) {
  const weeks = await listWeeksFrom(weekId);
  if (!weeks.length) return { ok: false, reason: 'No weeks from given id' };

  // Seed starting balances from previous week allocations when available
  const startIdx = 0;
  const prevWeekId = (() => {
    const first = weeks[0];
    if (first && first.startDate) {
      const prev = new Date(first.startDate.toDate());
      prev.setUTCDate(prev.getUTCDate() - 7);
      return getISOWeekId(prev);
    }
    return getPrevISOWeekId();
  })();

  const balanceMap = await loadPrevBalancesMap(prevWeekId);
  const touchedUsers = new Set();

  for (let i = startIdx; i < weeks.length; i++) {
    const wk = weeks[i];
    const md = await getEffectiveMarket(wk.id);
    if (!md) continue;
    const allocsSnap = await db.collection('allocations').where('weekId', '==', wk.id).get();
    if (allocsSnap.empty) {
      // No allocations this week: write carry-forward weeklyBalances for all users
      const allBalancesSnap = await db.collection('balances').get();
      const cfBatch = createBatcher();
      const currentPrevWeekId = getPrevISOWeekId(wk.id);
      
      // Process carry-forward users in batches to avoid too many concurrent async operations
      const batchSize = 10;
      const allUids = Array.from(allBalancesSnap.docs.map(d => d.id));
      
      for (let j = 0; j < allUids.length; j += batchSize) {
        const batchUids = allUids.slice(j, j + batchSize);
        const carryForwardPromises = batchUids.map(async (uid) => {
          const bal = allBalancesSnap.docs.find(d => d.id === uid)?.data() || {};
          const base = bal.latestBalance != null ? bal.latestBalance : 100000;
          
          // Get actual previous week end balance for carry-forward users too
          let prevWeekEndBalance = base; // fallback to current balance
          
          try {
            const prevWbRef = db.collection('weeklyBalances').doc(`${currentPrevWeekId}_${uid}`);
            const prevWbSnap = await prevWbRef.get();
            if (prevWbSnap.exists && prevWbSnap.data()?.endBalance != null) {
              prevWeekEndBalance = prevWbSnap.data().endBalance;
            }
          } catch (e) {
            console.warn(`Could not fetch prev week balance for carry-forward user ${uid} in week ${currentPrevWeekId}:`, e);
          }
          
          const wbRef = db.collection('weeklyBalances').doc(`${wk.id}_${uid}`);
          cfBatch.set(wbRef, {
            uid,
            weekId: wk.id,
            baseBalance: base,
            endBalance: base,
            resultReturnPct: 0,
            prevWeekEndBalance,
            weekOverWeekPct: 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          cfBatch.set(db.collection('balances').doc(uid), {
            latestWeekId: wk.id,
            latestBalance: base,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        });
        
        await Promise.all(carryForwardPromises);
      }
      await cfBatch.flush();
      await upsertWeek(wk.id, { status: 'settled' });
      continue;
    }
    const batch = createBatcher();
    allocsSnap.forEach(docSnap => {
      const alloc = docSnap.data();
      const uid = alloc.uid;
      touchedUsers.add(uid);
      const tslaW = alloc.pairs?.TSLA ?? 0;
      const aaplW = alloc.pairs?.AAPL ?? 0;
      const weightSum = tslaW + aaplW;
      const safeSum = weightSum === 0 ? 1 : weightSum; // prevent div by zero
      const retPct = (tslaW * (md.TSLA?.returnPct ?? 0) + aaplW * (md.AAPL?.returnPct ?? 0)) / safeSum;

      // Compute base from chain instead of trusting stored baseBalance
      // Seed from previous chain or balances/{uid} or default
      const base = balanceMap.has(uid) ? balanceMap.get(uid) : undefined;
      const computeBase = base != null ? base : undefined;
      const fallbackPromise = computeBase == null ? getStartingBalance(uid, balanceMap) : Promise.resolve(computeBase);

      // We use a closure to enqueue after fallback resolves
      // Since batch can't be awaited inside forEach, collect promises
      const p = Promise.resolve(fallbackPromise).then(async actualBase => {
        const endBalance = actualBase * (1 + (retPct || 0) / 100);
        balanceMap.set(uid, endBalance);
        
        // Get actual previous week end balance from weeklyBalances collection
        const currentPrevWeekId = getPrevISOWeekId(wk.id);
        let prevWeekEndBalance = actualBase; // fallback to current baseBalance
        
        try {
          const prevWbRef = db.collection('weeklyBalances').doc(`${currentPrevWeekId}_${uid}`);
          const prevWbSnap = await prevWbRef.get();
          if (prevWbSnap.exists && prevWbSnap.data()?.endBalance != null) {
            prevWeekEndBalance = prevWbSnap.data().endBalance;
          }
        } catch (e) {
          console.warn(`Could not fetch prev week balance for ${uid} in week ${currentPrevWeekId}:`, e);
        }
        
        // Calculate week-over-week percentage based on actual previous week end balance
        const weekOverWeekPct = prevWeekEndBalance > 0 ? ((endBalance - prevWeekEndBalance) / prevWeekEndBalance) * 100 : (retPct || 0);
        
        batch.update(docSnap.ref, {
          baseBalance: actualBase,
          resultReturnPct: retPct || 0,
          endBalance,
          settledAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // weeklyBalances history in recompute path
        const wbRef = db.collection('weeklyBalances').doc(`${wk.id}_${uid}`);
        batch.set(wbRef, {
          uid,
          weekId: wk.id,
          baseBalance: actualBase,
          endBalance,
          resultReturnPct: retPct || 0,
          prevWeekEndBalance,
          weekOverWeekPct,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      });
      // Attach promise marker on snapshot object for coordination
      docSnap._recomputePromise = p;
    });
    // Wait all per-doc promises to finish computing
    const waiters = allocsSnap.docs.map(d => d._recomputePromise).filter(Boolean);
    await Promise.all(waiters);
    await batch.flush();
    await upsertWeek(wk.id, { status: 'settled' });
  }

  // Update latest balances for touched users to the last processed week
  const lastWeek = weeks[weeks.length - 1];
  const balBatch = createBatcher();
  touchedUsers.forEach(uid => {
    const latest = balanceMap.get(uid);
    if (latest != null) {
      balBatch.set(db.collection('balances').doc(uid), {
        latestWeekId: lastWeek.id,
        latestBalance: latest,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  });
  await balBatch.flush();
  await logEvent({ category: 'recompute', action: 'recomputeFromWeek', message: `Recomputed from ${weeks[0].id} to ${weeks[weeks.length - 1].id}`, data: { start: weeks[0].id, end: weeks[weeks.length - 1].id } });
  return { ok: true };
}

exports.adminRecomputeFromWeek = functions.https.onCall(async (data, context) => {
  assertAdmin(context);
  const { weekId } = data || {};
  if (!weekId) throw new functions.https.HttpsError('invalid-argument', 'weekId required');
  const res = await recomputeFromWeek(weekId);
  if (!res.ok) throw new functions.https.HttpsError('failed-precondition', res.reason || 'recompute failed');
  await logEvent({ category: 'admin', action: 'recomputeFromWeek', message: `Admin triggered recompute from ${weekId}`, data: { weekId }, user: { email: context.auth.token.email } });
  return res;
});

// Auto-recompute on market data changes for a week
exports.onMarketDataWrite = functions.firestore.document('marketData/{weekId}').onWrite(async (change, context) => {
  const weekId = context.params.weekId;
  if (!weekId) return null;
  try {
    await recomputeFromWeek(weekId);
    await logEvent({ category: 'recompute', action: 'onMarketDataWrite', message: `Auto recompute from ${weekId} due to marketData write`, data: { weekId } });
  } catch (e) {
    console.error('Recompute failed for', weekId, e);
  }
  return null;
});

exports.onMarketCorrectionsWrite = functions.firestore.document('marketCorrections/{weekId}').onWrite(async (change, context) => {
  const weekId = context.params.weekId;
  if (!weekId) return null;
  try {
    await recomputeFromWeek(weekId);
    await logEvent({ category: 'recompute', action: 'onMarketCorrectionsWrite', message: `Auto recompute from ${weekId} due to marketCorrections write`, data: { weekId } });
  } catch (e) {
    console.error('Recompute failed for', weekId, e);
  }
  return null;
});


