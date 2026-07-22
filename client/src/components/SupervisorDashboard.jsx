import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://hyundai-server.onrender.com/api';

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

function SupervisorDashboard({ user }) {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('daily');
  const [reportData, setReportData] = useState([]);

  useEffect(() => {
    fetchReport(period);
  }, [period]);

  const fetchReport = async (selectedPeriod) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/reports/productivity?period=${selectedPeriod}`);
      setReportData(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (reportData.length === 0) {
      alert("No data to download.");
      return;
    }
    const csv = toCSV(reportData);
    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `${period}_productivity_report_${date}.csv`);
  };

  return (
    <div>
      <div className="profile-section">
        <div className="profile-info">
          <h2>{user.name}</h2>
          <p>Role: {user.role}</p>
        </div>
      </div>

      <div className="card card-wide">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="card-title">Technician Productivity Reports</h2>
            <p className="card-subtitle">View and download consolidated reports for all technicians</p>
          </div>
          <div>
            <select 
              className="form-input" 
              value={period} 
              onChange={e => setPeriod(e.target.value)}
              style={{ padding: '0.5rem', width: 'auto' }}
            >
              <option value="daily">Daily Report (Today)</option>
              <option value="weekly">Weekly Report (Last 7 Days)</option>
              <option value="monthly">Monthly Report (This Month)</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
          {loading ? (
            <p>Loading report data...</p>
          ) : (
            <table className="pauses-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '10px' }}>Emp ID</th>
                  <th style={{ padding: '10px' }}>Name</th>
                  <th style={{ padding: '10px' }}>Total Jobs</th>
                  <th style={{ padding: '10px' }}>Production Time (hrs)</th>
                  <th style={{ padding: '10px' }}>Break Time (hrs)</th>
                </tr>
              </thead>
              <tbody>
                {reportData.length > 0 ? (
                  reportData.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px' }}>{row.emp_id}</td>
                      <td style={{ padding: '10px' }}>{row.name}</td>
                      <td style={{ padding: '10px' }}>{row.total_jobs}</td>
                      <td style={{ padding: '10px' }}>{row.total_production_hours.toFixed(2)}</td>
                      <td style={{ padding: '10px' }}>{row.total_break_hours.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ padding: '10px', textAlign: 'center' }}>
                      No data available for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleDownload}
            disabled={loading || reportData.length === 0}
          >
            ⬇ Download {period.charAt(0).toUpperCase() + period.slice(1)} Report
          </button>
        </div>
      </div>
    </div>
  );
}

export default SupervisorDashboard;
