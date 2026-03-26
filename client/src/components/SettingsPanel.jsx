import React, { useState, useEffect } from 'react'

export default function SettingsPanel({ onClose }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [name, setName] = useState(user.name || '')
  const [email, setEmail] = useState(user.email || '')
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [])

  const toggleTheme = () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    setTheme(next)
    localStorage.setItem('theme', next)
  }

  const saveProfile = async () => {
    const token = localStorage.getItem('token')
    const id = user?.id
    if (!id) return
    try {
      const res = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ id, name, email })
      })
      const data = await res.json()
      if (data.success) {
        const updated = { ...user, name: data.user?.name ?? name, email: data.user?.email ?? email }
        localStorage.setItem('user', JSON.stringify(updated))
      }
    } catch (e) {
      console.error('Profile save error:', e)
    }
  }

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, width: '320px', height: '100%', background: 'var(--color-surface-0)', boxShadow: '-6px 0 20px rgba(0,0,0,.2)', zIndex: 10000, padding: 16 }} aria-label="Settings Panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Venue Settings</strong>
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 18 }}>✕</button>
      </div>
      <hr />
      <section>
        <h4 style={{ marginTop: 12 }}>Theme</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Current:</span>
          <span style={{ fontWeight: 600 }}>{theme.toUpperCase()}</span>
          <button className="btn btn-ghost" onClick={toggleTheme}>Toggle Theme</button>
        </div>
      </section>
      <hr />
      <section>
        <h4 style={{ marginTop: 12 }}>Profile</h4>
        <div className="field" style={{ marginTop: 6 }}>
          <label className="field-label">Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field" style={{ marginTop: 8 }}>
          <label className="field-label">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button style={{ marginTop: 12 }} className="btn btn-primary" onClick={saveProfile}>Save</button>
      </section>
    </div>
  )
}
