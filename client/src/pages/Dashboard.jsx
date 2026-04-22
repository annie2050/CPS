import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'
import Toast from '../components/Toast'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import OrderBookingDashboard from '../components/OrderBookingDashboard'

function Dashboard({ onLogout }) {
  const [user, setUser] = useState(() => {
    const userData = localStorage.getItem('user')
    return userData ? JSON.parse(userData) : null
  })
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    console.log('Auth Token:', localStorage.getItem('token'));
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  // Show a one-time login toast if a token exists
  useEffect(() => {
    const tokenExists = !!localStorage.getItem('token')
    const toastShown = localStorage.getItem('toastShown')
    if (tokenExists && !toastShown) {
      setShowToast(true)
      localStorage.setItem('toastShown', 'true')
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
      <Sidebar />
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
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Logout</h3>
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

      <main className="dashboard-content" style={{ paddingTop: 0 }}>
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
              <button className="quick-action-btn" onClick={() => navigate('/view-orders')}>
                <span className="quick-action-icon">📋</span>
                <span className="quick-action-text">View Orders</span>
              </button>
            </div>
          </div>
        </div>

        <OrderBookingDashboard customerGuid={user?.id} />
      </main>
      {showToast && (
        <Toast message="Logged in" duration={2500} onClose={() => setShowToast(false)} />
      )}
      <Footer />
    </div>
  )
}

export default Dashboard
