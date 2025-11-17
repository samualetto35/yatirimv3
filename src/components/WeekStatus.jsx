import { useEffect, useState } from 'react';
import { getActiveOrUpcomingWeek } from '../services/weekService';

const formatCountdown = (ms) => {
  if (ms <= 0) return '0h 0m 0s';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${h}h ${m}m ${r}s`;
};

const WeekStatus = () => {
  const [week, setWeek] = useState(null);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    (async () => {
      const w = await getActiveOrUpcomingWeek();
      setWeek(w || null);
    })();
  }, []);

  useEffect(() => {
    if (!week) return;
    let target = null;
    if (week.status === 'open') target = week.closeAt?.toDate?.() || null;
    if (week.status === 'closed' || week.status === 'upcoming') target = week.openAt?.toDate?.() || null;
    if (!target) return;
    const id = setInterval(() => {
      const ms = target.getTime() - Date.now();
      setCountdown(formatCountdown(ms));
    }, 1000);
    return () => clearInterval(id);
  }, [week]);

  if (!week) return null;

  return null;
};

export default WeekStatus;


