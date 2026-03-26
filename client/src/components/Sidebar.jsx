import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import './Sidebar.css'

function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/dashboard' },
    { id: 'orderbooking', label: 'New Order', icon: '📦', path: '/orderbooking' },
  ]

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordMessage({ type: '', text: '' })

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }

    setPasswordLoading(true)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      })

      const data = await res.json()

      if (data.success) {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully!' })
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setTimeout(() => {
          setShowPasswordModal(false)
          setPasswordMessage({ type: '', text: '' })
        }, 2000)
      } else {
        setPasswordMessage({ type: 'error', text: data.message || 'Failed to change password' })
      }
    } catch (err) {
      setPasswordMessage({ type: 'error', text: 'An error occurred. Please try again.' })
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <>
      <div 
        className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <div className="sidebar-menu">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`sidebar-item`}
              onClick={() => navigate(item.path)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          {isOpen && (
            <>
              <button
                className="sidebar-item sidebar-settings-btn"
                onClick={() => setShowSettingsModal(true)}
              >
                <span className="sidebar-icon">⚙️</span>
                <span className="sidebar-label">Settings</span>
              </button>
              <div className="sidebar-venue">
                <span className="sidebar-icon">📍</span>
                <span className="sidebar-label">Guljag Industries</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-card settings-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Settings</h3>
            <p>Customize your preferences</p>

            <div className="settings-section">
              <h4>Appearance</h4>
              <div className="settings-item">
                <div className="settings-item-info">
                  <span className="settings-item-icon">{theme === 'light' ? '☀️' : '🌙'}</span>
                  <div>
                    <span className="settings-item-label">Theme</span>
                    <span className="settings-item-desc">
                      {theme === 'light' ? 'Light mode is active' : 'Dark mode is active'}
                    </span>
                  </div>
                </div>
                <button className="theme-toggle-btn" onClick={toggleTheme}>
                  {theme === 'light' ? '🌙' : '☀️'}
                </button>
              </div>
            </div>

            <div className="settings-section">
              <h4>Account</h4>
              <button 
                className="settings-action-btn"
                onClick={() => {
                  setShowSettingsModal(false)
                  setShowPasswordModal(true)
                }}
              >
                <span>🔑</span>
                <span>Change Password</span>
              </button>
            </div>

            <div className="modal-actions">
              <button className="modal-btn modal-btn-primary" onClick={() => setShowSettingsModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Change Password</h3>
            <p>Update your account password</p>

            {passwordMessage.text && (
              <div className={`modal-message ${passwordMessage.type}`}>
                {passwordMessage.text}
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                  placeholder="Enter current password"
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  placeholder="Enter new password"
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  placeholder="Confirm new password"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="modal-btn modal-btn-secondary" onClick={() => setShowPasswordModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="modal-btn modal-btn-primary" disabled={passwordLoading}>
                  {passwordLoading ? 'Updating...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default Sidebar
