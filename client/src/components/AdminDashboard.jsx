import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://hyundai-server.onrender.com/api';

function AdminDashboard({ user }) {
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('TECHNICIAN');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/users`);
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!username.trim() || !name.trim()) return;
    
    try {
      await axios.post(`${API_URL}/users`, { username, name, role });
      setUsername('');
      setName('');
      setRole('TECHNICIAN');
      alert('User created successfully!');
      fetchUsers();
    } catch (err) {
      alert('Failed to create user. The username might already exist.');
    }
  };

  return (
    <div>
      <div className="profile-section">
        <div className="profile-info">
          <h2>{user.name}</h2>
          <p>Role: {user.role}</p>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Create New User</h2>
        <form onSubmit={handleCreateUser}>
          <div className="form-group">
            <label className="form-label">Employee ID (Username)</label>
            <input 
              type="text" 
              className="form-input" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select 
              className="form-input" 
              value={role} 
              onChange={e => setRole(e.target.value)}
            >
              <option value="TECHNICIAN">Technician</option>
              <option value="SUPERVISOR">Floor Supervisor</option>
              <option value="ADMIN">Super Admin</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary">Create User</button>
        </form>
      </div>

      <div className="card card-wide" style={{ marginTop: '2rem' }}>
        <h3 className="history-title">System Users</h3>
        <ul className="history-list">
          {users.map(u => (
            <li key={u.id} className="history-item">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong>{u.name}</strong> ({u.username})
                </div>
                <div>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '0.8rem',
                    background: u.role === 'ADMIN' ? '#dc3545' : u.role === 'SUPERVISOR' ? '#17a2b8' : '#6c757d',
                    color: 'white' 
                  }}>
                    {u.role}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default AdminDashboard;
