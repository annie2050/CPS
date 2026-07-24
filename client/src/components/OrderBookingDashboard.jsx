import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchWithAuth } from '../authService'
import './OrderBookingDashboard.css'
import { DashboardSkeleton } from './Skeleton'
import { useQuery } from '@tanstack/react-query'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

function OrderBookingDashboard({ customerGuid: propCustomerGuid }) {
  const navigate = useNavigate()
  const [showOrderHistory, setShowOrderHistory] = useState(false)
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

  const analytics = useMemo(() => {
    if (!data?.orders?.length) return null
    const orders = data.orders

    const totalSpent = orders.reduce((sum, o) => sum + Number(o.AMOUNT || 0), 0)
    const avgOrderValue = totalSpent / orders.length

    const productCounts = {}
    orders.forEach(o => {
      const p = o.PRODUCT || 'Unknown'
      productCounts[p] = (productCounts[p] || 0) + 1
    })
    const mostOrderedProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'

    const delivered = orders.filter(o => o.STATUS === 'Delivered').length
    const processing = orders.filter(o => o.STATUS === 'Processing').length
    const deliveryRate = orders.length ? (delivered / orders.length * 100) : 0

    const paidCount = orders.filter(o => o.PAYMENT === 'Paid').length
    const paymentRate = orders.length ? (paidCount / orders.length * 100) : 0

    return { totalSpent, avgOrderValue, mostOrderedProduct, deliveryRate, paymentRate, delivered, processing }
  }, [data])

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

  const doughnutData = analytics ? {
    labels: ['Delivered', 'Processing'],
    datasets: [{
      data: [analytics.delivered, analytics.processing],
      backgroundColor: ['#22c55e', '#f59e0b'],
      borderWidth: 0,
    }]
  } : null

  const doughnutOptions = {
    cutout: '70%',
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true }
    },
    maintainAspectRatio: false
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

      {/* Analytics Section */}
      {analytics && (
        <div className="obd-analytics">
          <h3 className="obd-section-title">Order Insights</h3>
          <div className="obd-analytics-grid">
            <div className="obd-analytics-card">
              <div className="obd-analytics-label">Total Spent</div>
              <div className="obd-analytics-value">Rs. {formatNumber(analytics.totalSpent)}</div>
            </div>
            <div className="obd-analytics-card">
              <div className="obd-analytics-label">Avg Order Value</div>
              <div className="obd-analytics-value">Rs. {formatNumber(analytics.avgOrderValue)}</div>
            </div>
            <div className="obd-analytics-card">
              <div className="obd-analytics-label">Most Ordered</div>
              <div className="obd-analytics-value obd-analytics-text">{analytics.mostOrderedProduct}</div>
            </div>
            <div className="obd-analytics-card">
              <div className="obd-analytics-label">Delivery Rate</div>
              <div className="obd-analytics-value">{analytics.deliveryRate.toFixed(1)}%</div>
            </div>
            <div className="obd-analytics-card">
              <div className="obd-analytics-label">Payment Health</div>
              <div className="obd-analytics-value">{analytics.paymentRate.toFixed(1)}%</div>
            </div>
            <div className="obd-analytics-card obd-chart-card">
              <div className="obd-analytics-label">Order Distribution</div>
              <div className="obd-chart-wrapper">
                {doughnutData && <Doughnut data={doughnutData} options={doughnutOptions} />}
              </div>
              <div className="obd-chart-legend">
                <span><span className="obd-dot obd-dot-delivered" /> Delivered ({analytics.delivered})</span>
                <span><span className="obd-dot obd-dot-processing" /> Processing ({analytics.processing})</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders Table with Toggle */}
      <div className="obd-table-container">
        <button
          className="obd-toggle-btn"
          onClick={() => setShowOrderHistory(prev => !prev)}
        >
          <span className="obd-toggle-icon">{showOrderHistory ? '▾' : '▸'}</span>
          Order History
          {!showOrderHistory && orders.length > 0 && (
            <span className="obd-toggle-count">({orders.length})</span>
          )}
        </button>
        
        {showOrderHistory && (
          orders.length === 0 ? (
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
          )
        )}
      </div>
    </div>
  )
}

export default OrderBookingDashboard
