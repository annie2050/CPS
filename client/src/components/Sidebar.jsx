import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Sidebar.css'

function Sidebar({ activePage }) {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/dashboard' },
    { id: 'orderbooking', label: 'Order Booking', icon: '📦', path: '/orderbooking' },
  ]

  return (
    <div 
      className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <div className="sidebar-menu">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default Sidebar
