import React, { useState } from 'react';
import { login, fetchWithAuth, logout } from '../authService.js';

export default function DashboardDemo() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      setLoading(false);
      setError(null);
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  const loadDashboard = async () => {
    setError(null);
    try {
      const res = await fetchWithAuth('/api/dashboard');
      if (!res.ok) {
        throw new Error('Failed to load dashboard');
      }
      const data = await res.json();
      setDashboard(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    await logout();
    setDashboard(null);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Demo: Guarded Dashboard with Silent Refresh</h2>
      <form onSubmit={handleLogin} style={{ marginBottom: 16 }}>
        <div>
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ marginRight: 8 }}
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ marginRight: 8 }}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </div>
      </form>
      <button onClick={loadDashboard} style={{ marginRight: 8 }}>Load Dashboard Data</button>
      <button onClick={handleLogout} style={{ marginRight: 8 }}>Logout</button>
      {error && (
        <div style={{ color: 'red', marginTop: 8 }}>{error}</div>
      )}
      {dashboard && (
        <pre style={{ marginTop: 12 }}>{JSON.stringify(dashboard, null, 2)}</pre>
      )}
    </div>
  );
}
