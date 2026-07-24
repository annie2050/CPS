import { useState, useEffect, useCallback } from 'react'
import { fetchWithAuth } from '../authService'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import './UserManagement.css'

const ROLE_LABELS = {
  HOD: 'Head of Department',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
  TEMP: 'Temporary',
  PART_TIME: 'Part-time',
}

const ROLE_HIERARCHY = {
  HOD: 80,
  MANAGER: 60,
  EMPLOYEE: 40,
  TEMP: 20,
  PART_TIME: 10,
}

function getManageableRoles(actorRole) {
  const actorLevel = ROLE_HIERARCHY[actorRole] || 0
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, level]) => actorLevel > level)
    .map(([role]) => role)
}

const emptyForm = { fullName: '', email: '', password: '', phone: '', role: '' }

function UserManagement() {
  const [user] = useState(() => {
    const userData = localStorage.getItem('user')
    return userData ? JSON.parse(userData) : null
  })

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [formData, setFormData] = useState({ ...emptyForm })
  const [editTarget, setEditTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const showNotification = useCallback((message, type) => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetchWithAuth('/api/users')
      const data = await res.json()
      if (data.success) {
        setUsers(data.users)
      } else {
        showNotification(data.message || 'Failed to load users', 'error')
      }
    } catch (err) {
      showNotification('Failed to load users', 'error')
    } finally {
      setLoading(false)
    }
  }, [showNotification])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const manageableRoles = user ? getManageableRoles(user.role) : []

  const handleAdd = async (e) => {
    e.preventDefault()
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    if (!passwordRegex.test(formData.password)) {
      showNotification('Password must be at least 8 characters with uppercase, lowercase, number, and symbol.', 'error')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetchWithAuth('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (data.success) {
        showNotification('User added successfully', 'success')
        setShowAddModal(false)
        setFormData({ ...emptyForm })
        fetchUsers()
      } else {
        showNotification(data.message || 'Error adding user', 'error')
      }
    } catch (err) {
      showNotification('Server error', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (target) => {
    setEditTarget(target)
    setFormData({
      fullName: target.full_name || '',
      email: target.email || '',
      phone: target.phone || '',
      role: target.role || '',
      password: '',
    })
    setShowEditModal(true)
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetchWithAuth(`/api/users/${editTarget.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
        }),
      })
      const data = await res.json()
      if (data.success) {
        showNotification('User updated successfully', 'success')
        setShowEditModal(false)
        setEditTarget(null)
        setFormData({ ...emptyForm })
        fetchUsers()
      } else {
        showNotification(data.message || 'Error updating user', 'error')
      }
    } catch (err) {
      showNotification('Server error', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!showDeleteConfirm) return
    setSubmitting(true)
    try {
      const res = await fetchWithAuth(`/api/users/${showDeleteConfirm.user_id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        showNotification('User deleted successfully', 'success')
        setShowDeleteConfirm(null)
        fetchUsers()
      } else {
        showNotification(data.message || 'Error deleting user', 'error')
      }
    } catch (err) {
      showNotification('Server error', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const canAddUser = manageableRoles.length > 0

  return (
    <div className="user-page-container">
      <Sidebar />
      <div className="user-page-content">
        <div className="user-page-header">
          <h1>Add Role</h1>
          {canAddUser && (
            <button className="add-user-btn" onClick={() => { setFormData({ ...emptyForm, role: manageableRoles[0] }); setShowAddModal(true) }}>
              + Add User
            </button>
          )}
        </div>

        {notification && (
          <div className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        )}

        {loading ? (
          <div className="user-loading">Loading users...</div>
        ) : (
          <div className="user-table-wrapper">
            <table className="user-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="user-table-empty">No users found</td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.user_id}>
                      <td>{u.full_name}</td>
                      <td>{u.email}</td>
                      <td>{u.phone}</td>
                      <td><span className="role-badge">{ROLE_LABELS[u.role] || u.role}</span></td>
                      <td className="actions-cell">
                        <button
                          className="action-btn edit-btn"
                          disabled={!u.manageable}
                          title={u.manageable ? 'Edit user' : 'You cannot edit this user'}
                          onClick={() => openEdit(u)}
                        >
                          Edit
                        </button>
                        <button
                          className="action-btn delete-btn"
                          disabled={!u.manageable}
                          title={u.manageable ? 'Delete user' : 'You cannot delete this user'}
                          onClick={() => setShowDeleteConfirm(u)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Footer />

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Add User</h2>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required placeholder="Min 8 chars, upper, lower, number, symbol" />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} required>
                  {manageableRoles.map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-btn modal-btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn modal-btn-primary" disabled={submitting}>{submitting ? 'Adding...' : 'Add User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Edit User</h2>
            <form onSubmit={handleEdit}>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} required>
                  {manageableRoles.map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-btn modal-btn-secondary" onClick={() => { setShowEditModal(false); setEditTarget(null) }}>Cancel</button>
                <button type="submit" className="modal-btn modal-btn-primary" disabled={submitting}>{submitting ? 'Updating...' : 'Update User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="modal-card modal-confirm" onClick={(e) => e.stopPropagation()}>
            <h2>Confirm Delete</h2>
            <p>Are you sure you want to delete <strong>{showDeleteConfirm.full_name}</strong>?</p>
            <div className="modal-actions">
              <button type="button" className="modal-btn modal-btn-secondary" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
              <button type="button" className="modal-btn modal-btn-danger" onClick={handleDelete} disabled={submitting}>{submitting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement
