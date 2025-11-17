import { useState } from 'react';
import './Dashboard.css';
import { toast } from 'react-toastify';
import {
  adminCreateOrUpdateWeek,
  adminCloseWeek,
  adminFetchMarketData,
  adminSettleWeek,
  adminRecomputeFromWeek,
} from '../services/adminService';

const AdminActions = () => {
  const [weekId, setWeekId] = useState('');
  const [openAt, setOpenAt] = useState('');
  const [closeAt, setCloseAt] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('open');
  const [busy, setBusy] = useState(false);

  const run = async (fn, payload, message) => {
    setBusy(true);
    try {
      await fn(payload);
      toast.success(message || 'Done');
    } catch (e) {
      toast.error(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Admin Actions</h1>
      </div>
      <div className="dashboard-content">
        <div className="info-card" style={{ marginBottom: '1rem' }}>
          <h3>Week Parameters</h3>
          <div className="auth-form">
            <div className="form-group">
              <label>weekId (e.g., 2025-W41)</label>
              <input value={weekId} onChange={(e) => setWeekId(e.target.value)} placeholder="YYYY-WNN" />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="open">open</option>
                <option value="closed">closed</option>
                <option value="settled">settled</option>
                <option value="upcoming">upcoming</option>
              </select>
            </div>
            <div className="form-group">
              <label>openAt (ISO, optional)</label>
              <input value={openAt} onChange={(e) => setOpenAt(e.target.value)} placeholder="2025-10-10T20:00:00+03:00" />
            </div>
            <div className="form-group">
              <label>closeAt (ISO, optional)</label>
              <input value={closeAt} onChange={(e) => setCloseAt(e.target.value)} placeholder="2025-10-12T23:00:00+03:00" />
            </div>
            <div className="form-group">
              <label>startDate (ISO, optional)</label>
              <input value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="2025-10-13T00:00:00+03:00" />
            </div>
            <div className="form-group">
              <label>endDate (ISO, optional)</label>
              <input value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="2025-10-17T21:00:00+03:00" />
            </div>
          </div>
        </div>

        <div className="info-card" style={{ display: 'grid', gap: '0.75rem' }}>
          <h3>Actions</h3>
          <button className="btn btn-primary" disabled={busy || !weekId} onClick={() => run(adminCreateOrUpdateWeek, { weekId, status, openAt, closeAt, startDate, endDate }, 'Week saved')}>
            Save Week
          </button>
          <button className="btn btn-primary" disabled={busy || !weekId} onClick={() => run(adminCloseWeek, { weekId }, 'Week closed')}>
            Close Week
          </button>
          <button className="btn btn-primary" disabled={busy} onClick={() => run(adminFetchMarketData, { weekId }, 'Market data fetched')}>
            Fetch Market Data (for weekId or current)
          </button>
          <button className="btn btn-primary" disabled={busy || !weekId} onClick={() => run(adminSettleWeek, { weekId }, 'Week settled')}>
            Settle Week
          </button>
          <button className="btn btn-primary" disabled={busy || !weekId} onClick={() => run(adminRecomputeFromWeek, { weekId }, 'Recompute started') }>
            Recompute From Week
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminActions;



