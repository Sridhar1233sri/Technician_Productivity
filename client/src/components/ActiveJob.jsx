import React, { useState } from 'react';

function ActiveJob({ job, onStopJob, onPauseJob, onResumeJob }) {
  const [isPausing, setIsPausing] = useState(false);
  const [pauseReason, setPauseReason] = useState('');

  const formatStartTime = (dateString) => {
    if (!dateString) return '';
    let dStr = dateString;
    if (!dStr.includes('T')) dStr = dStr.replace(' ', 'T') + 'Z';
    const date = new Date(dStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handlePauseConfirm = () => {
    if (!pauseReason) {
      alert("Please select a reason for pausing.");
      return;
    }
    onPauseJob(pauseReason);
    setIsPausing(false);
    setPauseReason('');
  };

  return (
    <div className="card">
      <h2 className="card-title">
        {job.status === 'PAUSED' ? 'Job Paused' : 'Job In Progress'}
      </h2>
      <p className="card-subtitle">
        {job.status === 'PAUSED' 
          ? `Currently paused for: ${job.pause_reason}` 
          : 'Work has started on this vehicle'}
      </p>

      <div className="job-details">
        <div className="job-details-row">
          <span className="job-label">RO Number</span>
          <span className="job-value">{job.ro_number}</span>
        </div>
        <div className="job-details-row">
          <span className="job-label">Vehicle Reg</span>
          <span className="job-value">{job.reg_number}</span>
        </div>
        <div className="job-details-row" style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)' }}>
          <span className="job-label">Started At</span>
          <span className="job-value">{formatStartTime(job.start_time)}</span>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        <p>Click stop when the job is completed to calculate total hours.</p>
      </div>

      {job.status === 'PAUSED' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button onClick={onResumeJob} className="btn btn-primary" style={{ backgroundColor: '#28a745' }}>
            Resume Job
          </button>
          <button onClick={onStopJob} className="btn btn-danger">
            Stop Job
          </button>
        </div>
      ) : isPausing ? (
        <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', border: '1px solid #e9ecef' }}>
          <label className="form-label" style={{ marginBottom: '0.5rem' }}>Select Pause Reason:</label>
          <select 
            className="form-input" 
            value={pauseReason} 
            onChange={(e) => setPauseReason(e.target.value)}
            style={{ marginBottom: '1rem' }}
          >
            <option value="" disabled>-- Select Reason --</option>
            <option value="Parts Taking">Parts Taking</option>
            <option value="Lunch break">Lunch break</option>
            <option value="Rest room break">Rest room break</option>
            <option value="Others">Others</option>
          </select>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handlePauseConfirm} className="btn btn-primary" style={{ flex: 1 }}>
              Confirm Pause
            </button>
            <button onClick={() => setIsPausing(false)} className="btn" style={{ flex: 1, backgroundColor: '#e9ecef', color: '#1a1a1a' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button onClick={() => setIsPausing(true)} className="btn btn-primary" style={{ backgroundColor: '#ffc107', color: '#000' }}>
            Pause Job
          </button>
          <button onClick={onStopJob} className="btn btn-danger">
            Stop Job
          </button>
        </div>
      )}
    </div>
  );
}

export default ActiveJob;
