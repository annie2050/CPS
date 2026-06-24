import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout as logoutRequest } from '../authService'
import './Dashboard.css'
import { useToast } from '../context/ToastContext'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import OrderBookingDashboard from '../components/OrderBookingDashboard'

function Dashboard({ onLogout }) {
  const [user, setUser] = useState(() => {
    const userData = localStorage.getItem('user')
    return userData ? JSON.parse(userData) : null
  })
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const navigate = useNavigate()
  const { showToast } = useToast()

  useEffect(() => {
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
      showToast("Logged in")
      localStorage.setItem('toastShown', 'true')
    }
  }, [showToast])

  const confirmLogout = async () => {
    try {
      await logoutRequest()
    } catch (err) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
    onLogout?.()
    navigate('/login', { replace: true })
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <nav className="dashboard-nav">
        <h2>Customer Portal</h2>
        <div className="nav-user">
          <span>Welcome, {user?.company}, {user?.name}</span>
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
          <div className="quick-actions-card">
            <h3>Quick Actions</h3>
            <div className="quick-actions">
              <button className="quick-action-btn primary" onClick={() => navigate('/orderbooking')}>
                <span className="quick-action-icon">+</span>
                <span className="quick-action-text">New Order</span>
              </button>
              <button className="quick-action-btn" onClick={() => navigate('/view-orders')}>
                <span className="quick-action-icon">#</span>
                <span className="quick-action-text">View Orders</span>
              </button>
              <button className="quick-action-btn" onClick={() => navigate('/order-status')}>
                <span className="quick-action-icon">S</span>
                <span className="quick-action-text">Order Status</span>
              </button>
            </div>
          </div>
        </div>

        <OrderBookingDashboard customerGuid={user?.sm19_unqid} />
      </main>
      <Footer />
    </div>
  )
}

export default Dashboard
