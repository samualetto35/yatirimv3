import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Fetch all allocations (client-side analytics).
 * Requires Firestore rule: allow read if isVerified() for allocations.
 */
export const getAllocations = async () => {
  const ref = collection(db, 'allocations');
  const snap = await getDocs(ref);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.weekId || '').localeCompare(a.weekId || ''));
};

/**
 * Fetch all weekly balances for return analytics.
 */
export const getWeeklyBalancesAll = async () => {
  const ref = collection(db, 'weeklyBalances');
  const snap = await getDocs(ref);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.weekId || '').localeCompare(a.weekId || ''));
};

/**
 * Fetch all users for display names (uid -> username).
 */
export const getUsersMap = async () => {
  const ref = collection(db, 'users');
  const snap = await getDocs(ref);
  const map = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    if (data?.uid) map[data.uid] = data.username || data.email || data.uid;
  });
  return map;
};
