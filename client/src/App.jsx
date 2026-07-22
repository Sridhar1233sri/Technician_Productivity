import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ActiveJob from './components/ActiveJob';
import AdminDashboard from './components/AdminDashboard';
import SupervisorDashboard from './components/SupervisorDashboard';
import Notifications from './components/Notifications';
import './index.css';

const API_URL = 'http://localhost:3001/api';

function App() {
  const [user, setUser] = useState(null);
  const [inProgressJobs, setInProgressJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      checkActiveJobs(parsedUser.id);
    } else {
      setLoading(false);
    }
  }, []);

  const checkActiveJobs = async (userId) => {
    try {
      const response = await axios.get(`${API_URL}/jobs/active/${userId}`);
      if (response.data && Array.isArray(response.data)) {
        setInProgressJobs(response.data);
      } else {
        setInProgressJobs([]);
      }
    } catch (err) {
      console.error('Failed to fetch active jobs', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (username) => {
    try {
      const response = await axios.post(`${API_URL}/login`, { username });
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
      await checkActiveJobs(response.data.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Login failed. Please try again.');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setInProgressJobs([]);
    localStorage.removeItem('user');
  };

  const handleStartJob = async (roNumber, regNumber) => {
    try {
      await axios.post(`${API_URL}/jobs/start`, {
        user_id: user.id,
        ro_number: roNumber,
        reg_number: regNumber
      });
      await checkActiveJobs(user.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start job.');
    }
  };

  const handlePauseJob = async (jobId, reason) => {
    try {
      await axios.post(`${API_URL}/jobs/pause/${jobId}`, { reason });
      await checkActiveJobs(user.id);
    } catch (err) {
      alert('Failed to pause job.');
    }
  };

  const handleResumeJob = async (jobId) => {
    try {
      await axios.post(`${API_URL}/jobs/resume/${jobId}`);
      await checkActiveJobs(user.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to resume job.');
    }
  };

  const handleStopJob = async (jobId) => {
    try {
      await axios.post(`${API_URL}/jobs/stop/${jobId}`);
      await checkActiveJobs(user.id);
    } catch (err) {
      alert('Failed to stop job.');
    }
  };

  if (loading) {
    return <div className="app-container"><div className="main-content">Loading...</div></div>;
  }

  const activeJob = inProgressJobs.find(job => job.status === 'ACTIVE');
  const pausedJobs = inProgressJobs.filter(job => job.status === 'PAUSED');

  return (
    <div className="app-container">
      {user && (
        <header>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img src="/logo.png" alt="Kovai Hyundai Logo" style={{ height: '40px', objectFit: 'contain' }} />
            <h1>Hyundai Service Center</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Notifications user={user} />
            <button onClick={handleLogout}>Logout ({user.name})</button>
          </div>
        </header>
      )}

      <main className="main-content">
        {!user ? (
          <Login onLogin={handleLogin} />
        ) : user.role === 'ADMIN' ? (
          <AdminDashboard user={user} />
        ) : user.role === 'SUPERVISOR' ? (
          <SupervisorDashboard user={user} />
        ) : activeJob ? (
          <ActiveJob 
            job={activeJob} 
            onStopJob={() => handleStopJob(activeJob.id)} 
            onPauseJob={(reason) => handlePauseJob(activeJob.id, reason)}
          />
        ) : (
          <Dashboard 
            user={user} 
            pausedJobs={pausedJobs}
            onStartJob={handleStartJob} 
            onResumeJob={handleResumeJob}
            onStopJob={handleStopJob}
          />
        )}
      </main>
    </div>
  );
}

export default App;
