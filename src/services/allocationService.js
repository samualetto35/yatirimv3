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
  try {
    const q = query(ref, where('uid', '==', uid), orderBy('weekId', 'desc'), limit(max));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  } catch (e) {
    const snap = await getDocs(query(ref, where('uid', '==', uid)));
    return snap.docs.map(d => d.data()).sort((a, b) => (b.weekId || '').localeCompare(a.weekId || '')).slice(0, max);
  }
};


