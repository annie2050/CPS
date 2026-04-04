import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import OrderBooking from './pages/OrderBooking'
import AppDemo from './demo/AppDemo.jsx'
import './index.css'

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'))

  const isAuthenticated = useMemo(() => !!token, [token])

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light'
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'token') {
        setToken(e.newValue)
      }
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const handleLogin = (nextToken) => {
    setToken(nextToken)
  }

  const handleLogout = () => {
    setToken(null)
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Login onLogin={handleLogin} />
              )
            }
          />
          <Route path="/demo" element={<AppDemo />} />
          <Route 
            path="/dashboard" 
            element={
              isAuthenticated ? (
                <Dashboard onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route 
            path="/orderbooking" 
            element={
              isAuthenticated ? (
                <OrderBooking />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route
            path="/"
            element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
