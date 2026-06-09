import { useState } from 'react'
import { fetchWithAuth } from '../authService'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import './UserManagement.css'

function UserManagement() {
  const [user] = useState(() => {
    const userData = localStorage.getItem('user')
    return userData ? JSON.parse(userData) : null
  })
  const [formData, setFormData] = useState({ 
    email: '', password: '', fullName: '', role: 'MANAGER', phone: ''
  })
  const [notification, setNotification] = useState(null)

  const showNotification = (message, type) => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      showNotification('Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, a number, and a symbol.', 'error');
      return;
    }
    try {
      const res = await fetchWithAuth('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()

      if (data.success) {
        showNotification(data.message, 'success')
        setFormData({ email: '', password: '', fullName: '', role: 'MANAGER', phone: '' })
      } else {
        showNotification(data.message || 'Error saving user', 'error')
      }
    } catch (err) {
      console.error('Error saving user:', err)
      showNotification('Server error', 'error')
    }
  }

  return (
    <div className="user-page-container">
      <Sidebar />
      <div className="user-page-content">
        <div className="user-page-header">
          <h1>Add New User</h1>
        </div>
        
        {notification && (
          <div className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="user-form">
          <input type="text" placeholder="Full Name" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} required />
          <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
          <input type="password" placeholder="Password (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol)" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
          <input type="text" placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
          <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button type="submit" disabled={user?.role !== 'MANAGER'}>Add User</button>
        </form>
      </div>
      <Footer />
    </div>
  )
}

export default UserManagement
