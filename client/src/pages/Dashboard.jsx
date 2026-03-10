import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

function Dashboard() {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <h2>Customer Portal</h2>
        <div className="nav-user">
          <span>Welcome, {user?.name || user?.email}</span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </nav>

      <main className="dashboard-content">
        <div className="welcome-card">
          <h1>Welcome to Customer Portal</h1>
          <p>You have successfully logged in.</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <h3>Profile</h3>
            <p>Email: {user?.email}</p>
            <p>Name: {user?.name || 'Not set'}</p>
          </div>
          <div className="stat-card">
            <h3>Status</h3>
            <p className="status-active">Active</p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
