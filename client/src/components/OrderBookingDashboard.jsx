import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchWithAuth } from '../authService'
import './OrderBookingDashboard.css'

function OrderBookingDashboard({ customerGuid: propCustomerGuid }) {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])

  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const customerGuid = propCustomerGuid || (() => {
    const userData = localStorage.getItem('user')
    return userData ? JSON.parse(userData)?.sm19_unqid : null
  })()

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      if (!customerGuid) {
        setError('No customer ID found')
        setLoading(false)
        return
      }

      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')
      try {
        const [ordersRes, dashboardRes] = await Promise.all([
          fetchWithAuth(`/api/dashboard/orders?customerGuid=${encodeURIComponent(customerGuid)}`),
          fetchWithAuth(`/api/dashboard/dashboard-data?customerGuid=${encodeURIComponent(customerGuid)}`),
        ])

        const ordersData = await ordersRes.json()
        const dashData = await dashboardRes.json()

        if (!ordersRes.ok) {
          throw new Error(ordersData?.message || 'Failed to load orders')
        }

        if (!cancelled) {
          setOrders(Array.isArray(ordersData.orders) ? ordersData.orders : [])
          setDashboardData(dashData.data || null)
        }
      } catch (e) {
        console.error('Error loading data:', e)
        if (!cancelled) {
          const message = e.message === 'Invalid or expired token.' ? 'Please log in again, your session has expired' : (e.message || 'Failed to load data')
          setError(message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    const onRefresh = () => {

      if (!cancelled) fetchData()
    }
    window.addEventListener('dashboard_refresh', onRefresh)
    return () => {
      cancelled = true
      window.removeEventListener('dashboard_refresh', onRefresh)
    }
  }, [customerGuid])

  const formatNumber = (n) => {
    return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }

  const getStatusClass = (status) => {
    if (status === 'Delivered') return 'status-delivered'
    if (status === 'Processing') return 'status-processing'
    return ''
  }

  const getPaymentClass = (payment) => {
    if (payment === 'Paid') return 'payment-paid'
    if (payment === 'Overdue') return 'payment-overdue'
    return ''
  }

  if (loading) {
    return (
      <div className="obd-loading">
        <div className="obd-loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="obd-error">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="obd-container">
      {/* Summary Cards */}
      <div className="obd-summary-grid">

        <div className="obd-summary-card">
          <div className="obd-summary-label">Total Orders</div>
          <div className="obd-summary-value">{formatNumber(dashboardData?.TOTAL_ORDERS)}</div>
        </div>
        <div className="obd-summary-card">
          <div className="obd-summary-label">Pending Orders</div>
          <div className="obd-summary-value">{formatNumber(dashboardData?.PENDING_ORDERS)}</div>
        </div>
        <div className="obd-summary-card">
          <div className="obd-summary-label">Overdue Amount</div>
          <div className="obd-summary-value obd-summary-currency">Rs. {formatNumber(dashboardData?.OVERDUE_AMOUNT)}</div>
        </div>
        <div className="obd-summary-card">
          <div className="obd-summary-label">Total Due</div>
          <div className="obd-summary-value obd-summary-currency">Rs. {formatNumber(dashboardData?.DUE_AMOUNT)}</div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="obd-table-container">
        <h3 className="obd-table-title">Order History</h3>
        
        {orders.length === 0 ? (
          <div className="obd-empty">
            <p>No orders found</p>
          </div>
        ) : (
          <table className="obd-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Product</th>
                <th>Status</th>
                <th>Qty (KG)</th>
                <th>Amount (Rs.)</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, index) => (
                <tr key={index}>
                  <td>{order.ORDER_ID}</td>
                  <td>{order.PRODUCT || '-'}</td>
                  <td>
                    <span className={`obd-badge ${getStatusClass(order.STATUS)}`}>
                      {order.STATUS}
                    </span>
                  </td>
                  <td>{formatNumber(order.QTY)}</td>
                  <td className="obd-amount">Rs. {formatNumber(order.AMOUNT)}</td>
                  <td>
                    <span className={`obd-badge ${getPaymentClass(order.PAYMENT)}`}>
                      {order.PAYMENT}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default OrderBookingDashboard
