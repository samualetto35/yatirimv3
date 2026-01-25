import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase/config';

const functions = getFunctions(app);

export const adminCreateOrUpdateWeek = async (payload) => {
  const fn = httpsCallable(functions, 'adminCreateOrUpdateWeek');
  const res = await fn(payload);
  return res.data;
};

export const adminCloseWeek = async ({ weekId }) => {
  const fn = httpsCallable(functions, 'adminCloseWeek');
  const res = await fn({ weekId });
  return res.data;
};

export const adminFetchMarketData = async ({ weekId }) => {
  const fn = httpsCallable(functions, 'adminFetchMarketData');
  const res = await fn({ weekId });
  return res.data;
};

export const adminSettleWeek = async ({ weekId }) => {
  const fn = httpsCallable(functions, 'adminSettleWeek');
  const res = await fn({ weekId });
  return res.data;
};

export const adminRecomputeFromWeek = async ({ weekId }) => {
  const fn = httpsCallable(functions, 'adminRecomputeFromWeek');
  const res = await fn({ weekId });
  return res.data;
};

export const adminListUsers = async () => {
  const fn = httpsCallable(functions, 'adminListUsers');
  const res = await fn();
  return res.data;
};

export const adminDeleteUser = async ({ uid, deleteAllocations = false }) => {
  const fn = httpsCallable(functions, 'adminDeleteUser');
  const res = await fn({ uid, deleteAllocations });
  return res.data;
};

export const adminGetUserDetails = async (uid) => {
  const fn = httpsCallable(functions, 'adminGetUserDetails');
  const res = await fn({ uid });
  return res.data;
};

