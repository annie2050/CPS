import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchWithAuth } from '../authService'
import './OrderBookingDashboard.css'
import { DashboardSkeleton } from './Skeleton'
import { useQuery } from '@tanstack/react-query'

function OrderBookingDashboard({ customerGuid: propCustomerGuid }) {
  const navigate = useNavigate()
  const customerGuid = propCustomerGuid || (() => {
    const userData = localStorage.getItem('user')
    return userData ? JSON.parse(userData)?.sm19_unqid : null
  })()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboardData', customerGuid],
    queryFn: async () => {
      if (!customerGuid) throw new Error('No customer ID found')
      const [ordersRes, dashboardRes] = await Promise.all([
        fetchWithAuth(`/api/dashboard/orders?customerGuid=${encodeURIComponent(customerGuid)}`),
        fetchWithAuth(`/api/dashboard/dashboard-data?customerGuid=${encodeURIComponent(customerGuid)}`),
      ])

      const ordersData = await ordersRes.json()
      const dashData = await dashboardRes.json()

      if (!ordersRes.ok) throw new Error(ordersData?.message || 'Failed to load orders')
      
      return {
        orders: Array.isArray(ordersData.orders) ? ordersData.orders : [],
        dashboardData: dashData.data || null
      }
    },
    enabled: !!customerGuid,
  })

  // ... (rest of the component)

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

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="obd-error">
        <p>{error.message}</p>
      </div>
    )
  }

  const { orders, dashboardData } = data

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
