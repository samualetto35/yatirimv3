import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

export const getWeek = async (weekId) => {
  const ref = doc(db, 'weeks', weekId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
};

export const getActiveOrUpcomingWeek = async () => {
  const weeksRef = collection(db, 'weeks');
  // Fetch candidates; client-side pick ensures correct target for countdown
  const q = query(weeksRef, where('status', 'in', ['open', 'closed', 'upcoming']));
  const snap = await getDocs(q);
  const all = snap.docs.map(d => d.data());
  if (!all.length) return null;

  const toMillis = (ts) => (ts?.toMillis?.() ?? ts?.toDate?.()?.getTime?.() ?? null);

  const openWeeks = all.filter(w => w.status === 'open');
  if (openWeeks.length) {
    // If multiple open (shouldn't happen), choose the one closing soonest
    openWeeks.sort((a, b) => (toMillis(a?.endDate) ?? Infinity) - (toMillis(b?.endDate) ?? Infinity));
    return openWeeks[0];
  }

  const upcoming = all.filter(w => w.status === 'upcoming').filter(w => toMillis(w?.openAt) != null);
  if (upcoming.length) {
    // Choose the nearest upcoming open time in the future
    upcoming.sort((a, b) => (toMillis(a.openAt) ?? Infinity) - (toMillis(b.openAt) ?? Infinity));
    return upcoming[0];
  }

  const closed = all.filter(w => w.status === 'closed');
  if (closed.length) {
    // Choose most recent closed (largest endDate)
    closed.sort((a, b) => (toMillis(b?.endDate) ?? -Infinity) - (toMillis(a?.endDate) ?? -Infinity));
    return closed[0];
  }
  return null;
};


