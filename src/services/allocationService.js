import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import { app, db } from '../firebase/config';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

export const submitAllocation = async ({ weekId, pairs }) => {
  const functions = getFunctions(app);
  const call = httpsCallable(functions, 'submitAllocation');
  const res = await call({ weekId, pairs });
  return res.data;
};

export const getUserAllocationForWeek = async (weekId, uid) => {
  if (!weekId || !uid) return null;
  const ref = doc(db, 'allocations', `${weekId}_${uid}`);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
};

export const getUserAllocations = async (uid, max = 20) => {
  if (!uid) return [];
  const ref = collection(db, 'allocations');
  
  // Try multiple approaches for reliability
  try {
    // Approach 1: Query with uid and weekId orderBy (requires index)
    const q = query(ref, where('uid', '==', uid), orderBy('weekId', 'desc'), limit(max));
    const snap = await getDocs(q);
    const results = snap.docs.map(d => d.data());
    if (results.length > 0) {
      console.log(`getUserAllocations: Found ${results.length} allocations via indexed query for ${uid}`);
      return results;
    }
  } catch (e) {
    console.warn('getUserAllocations: Indexed query failed, trying fallback:', e);
  }
  
  // Approach 2: Query without orderBy, sort client-side
  try {
    const q2 = query(ref, where('uid', '==', uid));
    const snap2 = await getDocs(q2);
    const results2 = snap2.docs
      .map(d => d.data())
      .filter(alloc => alloc.uid === uid && alloc.weekId) // Extra safety check
      .sort((a, b) => (b.weekId || '').localeCompare(a.weekId || ''))
      .slice(0, max);
    if (results2.length > 0) {
      console.log(`getUserAllocations: Found ${results2.length} allocations via fallback query for ${uid}`);
      return results2;
    }
  } catch (e) {
    console.warn('getUserAllocations: Fallback query failed, trying direct doc access:', e);
  }
  
  // Approach 3: As last resort, try to get all allocations and filter (very inefficient but reliable)
  // This should rarely be needed, but ensures we get the data
  try {
    const allSnap = await getDocs(ref);
    const allResults = allSnap.docs
      .map(d => {
        const data = d.data();
        // Also check if doc ID matches pattern: weekId_uid
        const docId = d.id;
        const matchesPattern = docId.includes('_') && docId.endsWith(`_${uid}`);
        return matchesPattern || data.uid === uid ? data : null;
      })
      .filter(Boolean)
      .filter(alloc => alloc.uid === uid && alloc.weekId)
      .sort((a, b) => (b.weekId || '').localeCompare(a.weekId || ''))
      .slice(0, max);
    if (allResults.length > 0) {
      console.log(`getUserAllocations: Found ${allResults.length} allocations via full scan for ${uid}`);
      return allResults;
    }
  } catch (e) {
    console.error('getUserAllocations: All approaches failed:', e);
  }
  
  console.warn(`getUserAllocations: No allocations found for ${uid}`);
  return [];
};


