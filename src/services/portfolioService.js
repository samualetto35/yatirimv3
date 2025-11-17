import { collection, doc, getDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

export const getUserBalance = async (uid) => {
  if (!uid) return null;
  const ref = doc(db, 'balances', uid);
  try {
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    if (e?.code === 'permission-denied') return null;
    throw e;
  }
};

export const getWeeklyBalancesByUser = async (uid, max = 52) => {
  if (!uid) return [];
  const ref = collection(db, 'weeklyBalances');
  try {
    const q = query(ref, where('uid', '==', uid), orderBy('weekId', 'asc'), limit(max));
    const snap = await getDocs(q);
    const rows = snap.docs.map(d => d.data());
    if (rows.length > 0) return rows;
    // If no rows, attempt a broader fetch and filter client-side (dev fallback)
    try {
      const allSnap = await getDocs(ref);
      return allSnap.docs.map(d => d.data()).filter(r => r?.uid === uid).sort((a, b) => (a.weekId || '').localeCompare(b.weekId || '')).slice(0, max);
    } catch (_) {
      return rows;
    }
  } catch (e) {
    if (e?.code === 'permission-denied') return [];
    // Index not ready → fallback without orderBy then sort client-side
    try {
      const snap = await getDocs(query(ref, where('uid', '==', uid)));
      const rows = snap.docs.map(d => d.data()).sort((a, b) => (a.weekId || '').localeCompare(b.weekId || ''));
      if (rows.length > 0) return rows;
      // As last resort, fetch all and filter
      try {
        const allSnap = await getDocs(ref);
        const allRows = allSnap.docs.map(d => d.data()).filter(r => r?.uid === uid).sort((a, b) => (a.weekId || '').localeCompare(b.weekId || ''));
        if (allRows.length > 0) return allRows.slice(0, max);
        // Try direct docId lookup by recent weeks
        try {
          const recent = await getRecentSettledWeeks(Math.min(max, 60));
          const ids = recent.map(w => w.id).filter(Boolean);
          const collected = [];
          for (const weekId of ids) {
            const docId = `${weekId}_${uid}`;
            try {
              const ds = await getDoc(doc(db, 'weeklyBalances', docId));
              if (ds.exists()) collected.push(ds.data());
            } catch (_) {}
          }
          return collected.sort((a, b) => (a.weekId || '').localeCompare(b.weekId || ''));
        } catch (_) {
          return allRows;
        }
      } catch (_) {
        return rows;
      }
    } catch (e2) {
      if (e2?.code === 'permission-denied') return [];
      throw e2;
    }
  }
};

export const getLatestSettledWeek = async () => {
  const ref = collection(db, 'weeks');
  try {
    const q = query(ref, where('status', '==', 'settled'), orderBy('endDate', 'desc'), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const result = snap.docs[0].data();
      console.log('Found latest settled week:', result.id, 'status:', result.status);
      return result;
    }
  } catch (e) {
    console.warn('Index query failed for settled weeks, trying fallback:', e);
    const snap = await getDocs(query(ref, where('status', '==', 'settled')));
    const all = snap.docs.map(d => d.data());
    all.sort((a, b) => (b?.endDate?.toMillis?.() || 0) - (a?.endDate?.toMillis?.() || 0));
    if (all[0]) {
      console.log('Fallback found latest settled week:', all[0].id, 'status:', all[0].status);
      return all[0];
    }
  }
  
  // If no settled weeks found, let's check what weeks exist
  console.warn('No settled weeks found, checking all weeks...');
  try {
    const allWeeksSnap = await getDocs(ref);
    const allWeeks = allWeeksSnap.docs.map(d => d.data());
    console.log(`Found ${allWeeks.length} total weeks:`, allWeeks.map(w => ({ id: w.id, status: w.status })));
    
    // If no settled weeks, try to find the most recent week regardless of status
    if (allWeeks.length > 0) {
      const sorted = allWeeks.sort((a, b) => (b?.endDate?.toMillis?.() || 0) - (a?.endDate?.toMillis?.() || 0));
      const latest = sorted[0];
      console.log('Using most recent week as fallback:', latest.id, 'status:', latest.status);
      return latest;
    }
  } catch (e) {
    console.error('Error checking all weeks:', e);
  }
  
  return null;
};

export const getRecentSettledWeeks = async (k = 4) => {
  const ref = collection(db, 'weeks');
  try {
    const q = query(ref, where('status', '==', 'settled'), orderBy('endDate', 'desc'), limit(k));
    const snap = await getDocs(q);
    const settledWeeks = snap.docs.map(d => d.data());
    console.log(`Found ${settledWeeks.length} settled weeks:`, settledWeeks.map(w => ({ id: w.id, status: w.status })));
    return settledWeeks;
  } catch (e) {
    console.warn('Index query failed for recent settled weeks, trying fallback:', e);
    const snap = await getDocs(query(ref, where('status', '==', 'settled')));
    const all = snap.docs.map(d => d.data());
    all.sort((a, b) => (b?.endDate?.toMillis?.() || 0) - (a?.endDate?.toMillis?.() || 0));
    const result = all.slice(0, k);
    console.log(`Fallback found ${result.length} settled weeks:`, result.map(w => ({ id: w.id, status: w.status })));
    return result;
  }
};

export const getMarketData = async (weekId) => {
  if (!weekId) return null;
  const ref = doc(db, 'marketData', weekId);
  try {
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    if (e?.code === 'permission-denied') return null;
    throw e;
  }
};

export const getLeaderboardByLatestWeek = async (max = 25) => {
  const latest = await getLatestSettledWeek();
  if (!latest) {
    console.warn('No latest settled week found');
    return { week: null, rows: [] };
  }
  console.log('Latest settled week:', latest.id);
  const ref = collection(db, 'weeklyBalances');
  
  try {
    // Try the indexed query first
    const q = query(ref, where('weekId', '==', latest.id), orderBy('resultReturnPct', 'desc'), limit(max));
    const snap = await getDocs(q);
    const rows = snap.docs.map(d => d.data());
    console.log(`Found ${rows.length} weekly balance records for week ${latest.id}`);
    return { week: latest.id, rows };
  } catch (e) {
    console.warn('Index query failed, trying fallback without orderBy:', e);
    
    try {
      // Fallback: query without orderBy, then sort client-side
      const fallbackQuery = query(ref, where('weekId', '==', latest.id));
      const snap = await getDocs(fallbackQuery);
      const rows = snap.docs.map(d => d.data()).sort((a, b) => (Number(b?.resultReturnPct || 0) - Number(a?.resultReturnPct || 0))).slice(0, max);
      console.log(`Fallback found ${rows.length} weekly balance records for week ${latest.id}`);
      return { week: latest.id, rows };
    } catch (e2) {
      console.error('Fallback query also failed:', e2);
      
      // Last resort: try to get all weeklyBalances and filter client-side
      try {
        const allSnap = await getDocs(ref);
        const allRows = allSnap.docs.map(d => d.data()).filter(r => r.weekId === latest.id);
        const rows = allRows.sort((a, b) => (Number(b?.resultReturnPct || 0) - Number(a?.resultReturnPct || 0))).slice(0, max);
        console.log(`Last resort found ${rows.length} weekly balance records for week ${latest.id}`);
        return { week: latest.id, rows };
      } catch (e3) {
        console.error('All query attempts failed:', e3);
        return { week: latest.id, rows: [] };
      }
    }
  }
};

export const getLeaderboardByOverallBalance = async (max = 25) => {
  try {
    // Fetch all users then left-join with balances; fallback to seed 100k
    const usersSnap = await getDocs(collection(db, 'users'));
    const balancesSnap = await getDocs(collection(db, 'balances'));
    console.log(`Found ${usersSnap.docs.length} users and ${balancesSnap.docs.length} balance records`);
    const uidToBalance = new Map();
    balancesSnap.docs.forEach(d => { uidToBalance.set(d.id, d.data()); });
    const rows = usersSnap.docs.map(u => {
      const uid = u.id;
      const bal = uidToBalance.get(uid) || {};
      const latest = Number(bal.latestBalance);
      const latestBalance = Number.isFinite(latest) ? latest : 100000;
      return { uid, latestBalance };
    }).sort((a, b) => Number(b.latestBalance || 0) - Number(a.latestBalance || 0));
    console.log(`Overall leaderboard returning ${rows.length} users`);
    return rows.slice(0, max);
  } catch (e) {
    console.warn('Overall leaderboard query blocked (rules?):', e?.message || e);
    return [];
  }
};

export const getLeaderboardByRecentWeeks = async (k = 4, max = 25) => {
  const weeks = await getRecentSettledWeeks(k);
  console.log(`getLeaderboardByRecentWeeks: Found ${weeks.length} weeks`);
  if (!weeks.length) {
    console.warn('No settled weeks found for recent weeks leaderboard');
    return { weeks: [], rows: [] };
  }
  const ids = weeks.map(w => w.id);
  console.log(`Getting leaderboard for weeks: ${ids.join(', ')}`);
  
  // Firestore 'in' supports up to 10 values which fits k<=10
  const ref = collection(db, 'weeklyBalances');
  
  try {
    const q = query(ref, where('weekId', 'in', ids));
    const snap = await getDocs(q);
    const map = new Map();
    snap.docs.forEach(d => {
      const wb = d.data();
      const uid = wb.uid;
      if (!map.has(uid)) map.set(uid, { uid, product: 1, weeks: 0 });
      const cur = map.get(uid);
      const factor = 1 + (Number(wb.resultReturnPct || 0) / 100);
      cur.product *= factor;
      cur.weeks += 1;
    });
    const rows = Array.from(map.values()).map(r => ({
      uid: r.uid,
      periodReturnPct: (r.product - 1) * 100,
      weeks: r.weeks,
    })).sort((a, b) => b.periodReturnPct - a.periodReturnPct).slice(0, max);
    console.log(`Recent weeks leaderboard returning ${rows.length} users`);
    return { weeks: ids, rows };
  } catch (e) {
    console.error('Query failed for recent weeks leaderboard:', e);
    
    // Fallback: get all weeklyBalances and filter client-side
    try {
      const allSnap = await getDocs(ref);
      const allRows = allSnap.docs.map(d => d.data()).filter(r => ids.includes(r.weekId));
      const map = new Map();
      allRows.forEach(wb => {
        const uid = wb.uid;
        if (!map.has(uid)) map.set(uid, { uid, product: 1, weeks: 0 });
        const cur = map.get(uid);
        const factor = 1 + (Number(wb.resultReturnPct || 0) / 100);
        cur.product *= factor;
        cur.weeks += 1;
      });
      const rows = Array.from(map.values()).map(r => ({
        uid: r.uid,
        periodReturnPct: (r.product - 1) * 100,
        weeks: r.weeks,
      })).sort((a, b) => b.periodReturnPct - a.periodReturnPct).slice(0, max);
      console.log(`Fallback recent weeks leaderboard returning ${rows.length} users`);
      return { weeks: ids, rows };
    } catch (e2) {
      console.error('All query attempts failed for recent weeks leaderboard:', e2);
      return { weeks: ids, rows: [] };
    }
  }
};

export const getWeeklyLeaderboardByWeek = async (weekId, max = 100) => {
  if (!weekId) {
    console.warn('No weekId provided to getWeeklyLeaderboardByWeek');
    return [];
  }
  console.log(`Getting weekly leaderboard for week: ${weekId}`);
  const ref = collection(db, 'weeklyBalances');
  
  try {
    // Try the indexed query first
    const q = query(ref, where('weekId', '==', weekId), orderBy('resultReturnPct', 'desc'), limit(max));
    const snap = await getDocs(q);
    const rows = snap.docs.map(d => d.data());
    console.log(`Found ${rows.length} weekly balance records for week ${weekId}`);
    return rows;
  } catch (e) {
    console.warn(`Index query failed for week ${weekId}, trying fallback without orderBy:`, e);
    
    try {
      // Fallback: query without orderBy, then sort client-side
      const fallbackQuery = query(ref, where('weekId', '==', weekId));
      const snap = await getDocs(fallbackQuery);
      const rows = snap.docs.map(d => d.data()).sort((a, b) => Number(b?.resultReturnPct || 0) - Number(a?.resultReturnPct || 0)).slice(0, max);
      console.log(`Fallback found ${rows.length} weekly balance records for week ${weekId}`);
      return rows;
    } catch (e2) {
      console.error(`Fallback query also failed for week ${weekId}:`, e2);
      
      // Last resort: try to get all weeklyBalances and filter client-side
      try {
        const allSnap = await getDocs(ref);
        const allRows = allSnap.docs.map(d => d.data()).filter(r => r.weekId === weekId);
        const rows = allRows.sort((a, b) => Number(b?.resultReturnPct || 0) - Number(a?.resultReturnPct || 0)).slice(0, max);
        console.log(`Last resort found ${rows.length} weekly balance records for week ${weekId}`);
        return rows;
      } catch (e3) {
        console.error(`All query attempts failed for week ${weekId}:`, e3);
        return [];
      }
    }
  }
};

// Annualized leaderboard: average weekly return * 52
export const getLeaderboardByAnnualizedReturn = async (max = 25, weeksLookback = 26) => {
  try {
    // Use only recent settled weeks to avoid full-collection scans (rules-friendly)
    const weeks = await getRecentSettledWeeks(Math.min(weeksLookback, 10)); // respect Firestore 'in' limit
    if (!weeks.length) return [];
    const ids = weeks.map(w => w.id);
    const ref = collection(db, 'weeklyBalances');
    const snap = await getDocs(query(ref, where('weekId', 'in', ids)));

    const map = new Map(); // uid -> { sumPct, weeks }
    snap.docs.forEach(d => {
      const wb = d.data();
      const uid = wb?.uid;
      const pct = Number(wb?.resultReturnPct);
      if (!uid || !Number.isFinite(pct)) return;
      if (!map.has(uid)) map.set(uid, { uid, sumPct: 0, weeks: 0 });
      const cur = map.get(uid);
      cur.sumPct += pct;
      cur.weeks += 1;
    });
    const rows = Array.from(map.values()).map(r => {
      const avgWeekly = r.weeks > 0 ? (r.sumPct / r.weeks) : 0;
      const periodReturnPct = avgWeekly * 52; // simple linear annualization
      return { uid: r.uid, periodReturnPct, weeks: r.weeks };
    }).sort((a, b) => Number(b.periodReturnPct || 0) - Number(a.periodReturnPct || 0));
    return rows.slice(0, max);
  } catch (e) {
    console.warn('Annualized leaderboard query blocked (rules?):', e?.message || e);
    return [];
  }
};

export const getLeaderboardByWinRate = async (k = 12, max = 25) => {
  // WinRate = wins / total over last k settled weeks
  const weeks = await getRecentSettledWeeks(Math.min(k, 10));
  if (!weeks.length) return [];
  const ids = weeks.map(w => w.id);
  const ref = collection(db, 'weeklyBalances');
  try {
    const snap = await getDocs(query(ref, where('weekId', 'in', ids)));
    const map = new Map(); // uid -> { wins, total }
    snap.docs.forEach(d => {
      const wb = d.data();
      const uid = wb?.uid;
      const pct = Number(wb?.resultReturnPct);
      if (!uid || !Number.isFinite(pct)) return;
      if (!map.has(uid)) map.set(uid, { uid, wins: 0, total: 0 });
      const cur = map.get(uid);
      cur.total += 1;
      if (pct > 0) cur.wins += 1;
    });
    const rows = Array.from(map.values()).map(r => ({
      uid: r.uid,
      periodReturnPct: r.total > 0 ? (r.wins / r.total) * 100 : 0, // reuse same display field
      weeks: r.total,
    })).sort((a, b) => Number(b.periodReturnPct || 0) - Number(a.periodReturnPct || 0));
    return rows.slice(0, max);
  } catch (e) {
    console.warn('WinRate leaderboard query blocked (rules?):', e?.message || e);
    return [];
  }
};

// Test function to check weeklyBalances access
export const testWeeklyBalancesAccess = async () => {
  try {
    console.log('Testing weeklyBalances collection access...');
    const ref = collection(db, 'weeklyBalances');
    const snap = await getDocs(ref);
    console.log(`✅ Successfully accessed weeklyBalances collection. Found ${snap.docs.length} documents.`);
    
    if (snap.docs.length > 0) {
      const sampleDoc = snap.docs[0].data();
      console.log('Sample document structure:', Object.keys(sampleDoc));
      console.log('Sample document data:', sampleDoc);
    }
    
    return { success: true, count: snap.docs.length };
  } catch (e) {
    console.error('❌ Failed to access weeklyBalances collection:', e);
    return { success: false, error: e.message };
  }
};


