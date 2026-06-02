import { useEffect, useMemo, useState, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const OrderBooking = lazy(() => import('./pages/OrderBooking'))
const ViewOrders = lazy(() => import('./pages/ViewOrders'))
const OrderStatus = lazy(() => import('./pages/OrderStatus'))
const NewOrder = lazy(() => import('./pages/NewOrder'))
const ReportComplaint = lazy(() => import('./pages/ReportComplaint'))
const AppDemo = lazy(() => import('./demo/AppDemo.jsx'))

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
        <Suspense fallback={<div className="loading-screen">Loading...</div>}>
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
              path="/view-orders" 
              element={
                isAuthenticated ? (
                  <ViewOrders />
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />
            <Route 
              path="/order-status" 
              element={
                isAuthenticated ? (
                  <OrderStatus />
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />
            <Route 
              path="/reports" 
              element={
                isAuthenticated ? (
                  <ReportComplaint />
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />
            <Route 
              path="/new-order" 
              element={
                isAuthenticated ? (
                  <NewOrder />
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
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
