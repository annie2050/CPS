import React, { useEffect, useState } from 'react'

export default function Toast({ message, duration = 2500, onClose }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false)
      if (typeof onClose === 'function') onClose()
    }, duration)
    return () => clearTimeout(t)
  }, [duration, onClose])

  if (!visible) return null

  const style = {
    position: 'fixed',
    top: '16px',
    right: '16px',
    backgroundColor: '#323232',
    color: '#fff',
    padding: '12px 20px',
    borderRadius: '8px',
    boxShadow: '0 6px 16px rgba(0,0,0,.25)',
    zIndex: 9999,
    fontFamily: 'Arial, sans-serif'
  }

  return (
    <div style={style} role="status" aria-live="polite">
      {message}
    </div>
  )
}
