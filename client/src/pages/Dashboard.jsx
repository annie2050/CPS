import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './Dashboard.css'
import Sidebar from '../components/Sidebar'
import OrderBookingDashboard from '../components/OrderBookingDashboard'

function Dashboard({ onLogout }) {
  const [user, setUser] = useState(() => {
    const userData = localStorage.getItem('user')
    return userData ? JSON.parse(userData) : null
  })
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [activePage, setActivePage] = useState('dashboard')
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (location.pathname === '/orderbooking') {
      navigate('/orderbooking', { replace: true })
    }
  }, [location.pathname, navigate])

  useEffect(() => {
    const userData = localStorage.getItem('user')
    console.log('User data from localStorage:', userData)
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
      <Sidebar activePage={activePage} />
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
        <div className="dashboard-header">
          <div className="welcome-card">
            <h1>Welcome to Customer Portal</h1>
            <p>You have successfully logged in.</p>
          </div>
          
          <div className="quick-actions-card">
            <h3>Quick Actions</h3>
            <div className="quick-actions">
              <button className="quick-action-btn primary" onClick={() => navigate('/orderbooking')}>
                <span className="quick-action-icon">➕</span>
                <span className="quick-action-text">New Order</span>
              </button>
              <button className="quick-action-btn" onClick={() => navigate('/dashboard')}>
                <span className="quick-action-icon">📊</span>
                <span className="quick-action-text">View Orders</span>
              </button>
            </div>
          </div>
        </div>

        <OrderBookingDashboard customerGuid={user?.id} />
      </main>
    </div>
  )
}

export default Dashboard
