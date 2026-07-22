import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://hyundai-server.onrender.com/api';

function formatDuration(hours) {
  if (!hours || isNaN(hours)) return '0h 0m';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

function formatTime(dateString) {
  if (!dateString) return '—';
  let dStr = dateString;
  if (!dStr.includes('T')) dStr = dStr.replace(' ', 'T') + 'Z';
  return new Date(dStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(dateString) {
  if (!dateString) return '—';
  let dStr = dateString;
  if (!dStr.includes('T')) dStr = dStr.replace(' ', 'T') + 'Z';
  return new Date(dStr).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Expanded job card ──────────────────────────────────────────────────────────
function JobCard({ job }) {
  const [expanded, setExpanded] = useState(false);

  const pauses = Array.isArray(job.pauses) ? job.pauses : [];

  return (
    <li className="history-item history-item--expandable">
      {/* collapsed row */}
      <div
        className="history-item-summary"
        onClick={() => setExpanded(v => !v)}
        role="button"
        aria-expanded={expanded}
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setExpanded(v => !v)}
      >
        <div>
          <div className="history-ro">RO: {job.ro_number}</div>
          <div className="history-meta">
            Reg: {job.reg_number} &nbsp;·&nbsp; {formatDateTime(job.end_time)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="history-duration">{formatDuration(job.duration_hours)}</span>
          <span className={`expand-chevron ${expanded ? 'expand-chevron--open' : ''}`}>▼</span>
        </div>
      </div>

      {/* expanded detail */}
      {expanded && (
        <div className="history-item-detail">
          <div className="detail-grid">
            <div className="detail-cell">
              <span className="detail-label">Start Time</span>
              <span className="detail-value">{formatTime(job.start_time)}</span>
            </div>
            <div className="detail-cell">
              <span className="detail-label">End Time</span>
              <span className="detail-value">{formatTime(job.end_time)}</span>
            </div>
            <div className="detail-cell">
              <span className="detail-label">Production Time</span>
              <span className="detail-value detail-value--production">
                {formatDuration(job.duration_hours)}
              </span>
            </div>
            <div className="detail-cell">
              <span className="detail-label">Total Break Time</span>
              <span className="detail-value detail-value--break">
                {formatDuration(job.paused_hours)}
              </span>
            </div>
          </div>

          {pauses.length > 0 && (
            <div className="pauses-section">
              <div className="pauses-title">Break Breakdown</div>
              <table className="pauses-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Reason</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {pauses.map((p, i) => (
                    <tr key={p.id ?? i}>
                      <td>{i + 1}</td>
                      <td>{p.reason}</td>
                      <td>{formatTime(p.start_time)}</td>
                      <td>{formatTime(p.end_time)}</td>
                      <td>{formatDuration((p.duration_sec || 0) / 3600)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pauses.length === 0 && (
            <p className="no-pauses">No breaks recorded for this job.</p>
          )}
        </div>
      )}
    </li>
  );
}

// ── Export helpers ─────────────────────────────────────────────────────────────
function toCSV(rows) {
  const headers = ['Emp ID', 'Name', 'Total Jobs', 'Production Time (hrs)', 'Break Time (hrs)'];
  const lines = [
    headers.join(','),
    ...rows.map(r =>
      [
        r.emp_id,
        `"${r.name}"`,
        r.total_jobs,
        r.total_production_hours.toFixed(2),
        r.total_break_hours.toFixed(2),
      ].join(',')
    ),
  ];
  return lines.join('\n');
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
function Dashboard({ user, pausedJobs = [], onStartJob, onResumeJob, onStopJob }) {
  const [roNumber, setRoNumber]   = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [history, setHistory]     = useState([]);
  const [summary, setSummary]     = useState({ total_production_hours: 0, total_paused_hours: 0 });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchHistory();
    fetchSummary();
  }, [user.id]);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/jobs/history/${user.id}`);
      setHistory(res.data);
    } catch (err) {
      console.error('Failed to fetch history', err);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await axios.get(`${API_URL}/users/summary/${user.id}`);
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to fetch summary', err);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (roNumber.trim() && regNumber.trim()) {
      onStartJob(roNumber, regNumber);
    }
  };

  const handleExportToday = async () => {
    setExporting(true);
    try {
      const res  = await axios.get(`${API_URL}/reports/today`);
      const csv  = toCSV(res.data);
      const date = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `production_report_${date}.csv`);
    } catch (err) {
      alert('Export failed. Please try again.');
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      {/* Profile */}
      <div className="profile-section">
        <div className="profile-info">
          <h2>{user.name}</h2>
          <p>Employee ID: {user.username}</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="summary-container">
        <div className="summary-card">
          <div className="summary-value" style={{ color: 'var(--primary-color)' }}>
            {formatDuration(summary.total_production_hours)}
          </div>
          <div className="summary-label">Total Production Time</div>
        </div>
        <div className="summary-card">
          <div className="summary-value" style={{ color: 'var(--danger-color)' }}>
            {formatDuration(summary.total_paused_hours)}
          </div>
          <div className="summary-label">Total Break Time</div>
        </div>
      </div>

      {/* Start job form */}
      <div className="card">
        <h2 className="card-title">Start New Job</h2>
        <p className="card-subtitle">Enter vehicle details to start the timer</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">RO Number (Job Card)</label>
            <input
              type="text"
              className="form-input"
              value={roNumber}
              onChange={e => setRoNumber(e.target.value)}
              placeholder="e.g. RO-12345"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Vehicle Registration</label>
            <input
              type="text"
              className="form-input"
              value={regNumber}
              onChange={e => setRegNumber(e.target.value)}
              placeholder="e.g. TN90F7425"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">Start Job Timer</button>
        </form>
      </div>

      {/* Paused Jobs */}
      {pausedJobs.length > 0 && (
        <div className="history-section" style={{ marginTop: '2rem' }}>
          <div className="history-header">
            <h3 className="history-title" style={{ color: '#ffc107' }}>Paused Jobs</h3>
          </div>
          <ul className="history-list">
            {pausedJobs.map(job => (
              <li key={job.id} className="history-item" style={{ padding: '1rem', borderLeft: '4px solid #ffc107' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div className="history-ro">RO: {job.ro_number}</div>
                    <div className="history-meta">Reg: {job.reg_number}</div>
                    <div className="history-meta" style={{ marginTop: '4px', color: '#ffc107' }}>
                      Paused for: {job.pause_reason}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => onResumeJob(job.id)} 
                      className="btn btn-primary" 
                      style={{ padding: '0.5rem 1rem', backgroundColor: '#28a745' }}
                    >
                      Resume
                    </button>
                    <button 
                      onClick={() => onStopJob(job.id)} 
                      className="btn btn-danger" 
                      style={{ padding: '0.5rem 1rem' }}
                    >
                      Stop
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent jobs + export */}
      {history.length > 0 && (
        <div className="history-section">
          <div className="history-header">
            <h3 className="history-title">Recent Jobs</h3>
            <button
              className="btn-export"
              onClick={handleExportToday}
              disabled={exporting}
              title="Export today's production hours for all employees"
            >
              {exporting ? 'Exporting…' : '⬇ Export Today\'s Hours'}
            </button>
          </div>

          <ul className="history-list">
            {history.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </ul>
        </div>
      )}

      {/* Export button even when no history */}
      {history.length === 0 && (
        <div className="history-section" style={{ marginTop: '2rem' }}>
          <div className="history-header">
            <span />
            <button
              className="btn-export"
              onClick={handleExportToday}
              disabled={exporting}
              title="Export today's production hours for all employees"
            >
              {exporting ? 'Exporting…' : '⬇ Export Today\'s Hours'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Dashboard;
