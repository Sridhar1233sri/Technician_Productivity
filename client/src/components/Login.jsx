import React, { useState } from 'react';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      onLogin(username);
    }
  };

  return (
    <div className="card">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <img src="/logo.png" alt="Kovai Hyundai Logo" style={{ height: '60px', objectFit: 'contain', marginBottom: '1rem' }} />
        <h2 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1.5rem' }}>Kovai Hyundai Service Center</h2>
        <h3 style={{ margin: '0.25rem 0 0 0', fontWeight: '500', color: '#666', fontSize: '1.1rem' }}>Productivity Tracker</h3>
      </div>
      
      <p className="card-subtitle" style={{ textAlign: 'center' }}>Enter your employee ID to continue</p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="username">Employee ID</label>
          <input 
            type="text" 
            id="username"
            className="form-input" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. tech01"
            autoComplete="off"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary">Login</button>
      </form>
    </div>
  );
}

export default Login;
