import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'
import OrderBookingDashboard from '../components/OrderBookingDashboard'

function Dashboard({ onLogout }) {
  const [user, setUser] = useState(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const userData = localStorage.getItem('user')

    console.log(userData);
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const confirmLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    onLogout?.()
    navigate('/login', { replace: true })
  }

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <h2>Customer Portal</h2>
        <div className="nav-user">
          <span>Welcome, {user?.name || user?.email}</span>
          <button onClick={() => setShowLogoutConfirm(true)} className="logout-button">
            Logout
          </button>
        </div>
      </nav>

      {showLogoutConfirm && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-title"
        >
          <div className="modal-card">
            <h3 id="logout-title">Logout</h3>
            <p>Are you sure that you want to logout?</p>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn modal-btn-secondary"
                onClick={() => setShowLogoutConfirm(false)}
              >
                No
              </button>
              <button
                type="button"
                className="modal-btn modal-btn-danger"
                onClick={confirmLogout}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

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

        <OrderBookingDashboard customerGuid={user?.id} />
      </main>
    </div>
  )
}

export default Dashboard
