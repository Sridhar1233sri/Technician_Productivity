import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

function Notifications({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user && user.id) {
      fetchNotifications();
      // Poll every minute
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_URL}/notifications/${user.id}`);
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const handleMarkAsRead = async (id) => {
    // Optimistically update
    const notif = notifications.find(n => n.id === id);
    if (notif && notif.is_read) return;

    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    try {
      await axios.post(`${API_URL}/notifications/${id}/read`);
    } catch (err) {
      console.error('Failed to mark notification as read', err);
      // Revert if failed
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 0 } : n));
    }
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div style={{ position: 'relative', marginRight: '1rem' }}>
      <button 
        onClick={toggleDropdown} 
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          padding: '0.5rem',
          fontSize: '1.5rem'
        }}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '0',
            right: '0',
            backgroundColor: '#dc3545',
            color: 'white',
            borderRadius: '50%',
            padding: '2px 6px',
            fontSize: '0.75rem',
            fontWeight: 'bold'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: '0',
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          width: '300px',
          maxHeight: '400px',
          overflowY: 'auto',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          zIndex: 1000
        }}>
          <h4 style={{ margin: 0, padding: '1rem', borderBottom: '1px solid #eee', backgroundColor: '#f8f9fa' }}>
            Notifications
          </h4>
          {notifications.length === 0 ? (
            <p style={{ padding: '1rem', margin: 0, color: '#666', textAlign: 'center' }}>No notifications.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {notifications.map(n => (
                <li key={n.id} style={{ 
                  padding: '1rem', 
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer',
                  backgroundColor: n.is_read ? '#ffffff' : '#fffcf2'
                }}
                onClick={() => handleMarkAsRead(n.id)}
                >
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#333' }}>{n.message}</p>
                  <small style={{ color: '#888' }}>
                    {new Date(n.created_at).toLocaleString()}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default Notifications;
