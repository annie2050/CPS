import { useEffect, useMemo, useState } from 'react'
import './OrderBookingDashboard.css'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

function parseDdMmYyyyToDate(value) {
  if (!value || typeof value !== 'string') return null
  const [dd, mm, yyyy] = value.split('-').map((x) => Number(x))
  if (!dd || !mm || !yyyy) return null
  const d = new Date(yyyy, mm - 1, dd)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatNumber(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0'
  return n.toLocaleString()
}

function monthKey(dateObj) {
  if (!dateObj) return null
  const y = dateObj.getFullYear()
  const m = String(dateObj.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function monthLabelFromKey(key) {
  const [y, m] = key.split('-').map((x) => Number(x))
  const d = new Date(y, (m || 1) - 1, 1)
  return d.toLocaleString(undefined, { month: 'short', year: 'numeric' })
}

export default function OrderBookingDashboard({ customerGuid }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [activeMonth, setActiveMonth] = useState('ALL')
  const [search, setSearch] = useState('')
  const [expandedBookingNo, setExpandedBookingNo] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const token = localStorage.getItem('token')
        const url = customerGuid
          ? `/api/dashboard/orders?customerGuid=${encodeURIComponent(customerGuid)}`
          : '/api/dashboard/orders'

        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data?.message || 'Failed to load orders')
        }
        if (!cancelled) {
          setOrders(Array.isArray(data.orders) ? data.orders : [])
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load orders')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [customerGuid])

  const monthOptions = useMemo(() => {
    const keys = new Set()
    for (const o of orders) {
      const d = parseDdMmYyyyToDate(o.bookingDate)
      const k = monthKey(d)
      if (k) keys.add(k)
    }
    return Array.from(keys).sort()
  }, [orders])

  useEffect(() => {
    // If user filtered to a month that no longer exists, reset to ALL
    if (activeMonth !== 'ALL' && !monthOptions.includes(activeMonth)) {
      setActiveMonth('ALL')
    }
  }, [activeMonth, monthOptions])

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter((o) => {
      const d = parseDdMmYyyyToDate(o.bookingDate)
      const mk = monthKey(d)
      if (activeMonth !== 'ALL' && mk !== activeMonth) return false

      if (!q) return true
      const bookingNo = String(o.bookingNo ?? '').toLowerCase()
      const product = String(o.productName ?? '').toLowerCase()
      const customer = String(o.customerName ?? '').toLowerCase()
      return bookingNo.includes(q) || product.includes(q) || customer.includes(q)
    })
  }, [orders, activeMonth, search])

  const metrics = useMemo(() => {
    const totalOrders = filteredOrders.length
    const totalNetQty = filteredOrders.reduce((sum, o) => sum + (Number(o.netQty) || 0), 0)
    const avgQty = totalOrders ? totalNetQty / totalOrders : 0

    let largest = null
    for (const o of filteredOrders) {
      const n = Number(o.netQty) || 0
      if (!largest || n > (Number(largest.netQty) || 0)) {
        largest = o
      }
    }

    return {
      totalOrders,
      totalNetQty,
      avgQty,
      largest,
    }
  }, [filteredOrders])

  const chartData = useMemo(() => {
    const labels = filteredOrders.map((o) => String(o.bookingNo ?? ''))
    const data = filteredOrders.map((o) => Number(o.netQty) || 0)
    return {
      labels,
      datasets: [
        {
          label: 'Net Qty (KG)',
          data,
          backgroundColor: 'rgba(102, 126, 234, 0.55)',
          borderColor: 'rgba(102, 126, 234, 1)',
          // borderWidth removed to satisfy logical-property lint rule
        },
      ],
    }
  }, [filteredOrders])

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'bottom' },
        title: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${formatNumber(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (v) => Number(v).toLocaleString(),
          },
        },
      },
    }
  }, [])

  const toggleExpanded = (bookingNo) => {
    setExpandedBookingNo((prev) => (prev === bookingNo ? null : bookingNo))
  }

  return (
    <section className="obd-wrap">
      <div className="obd-header">
        <h2 className="obd-title">Order Booking Dashboard</h2>
        <p className="obd-subtitle">Track bookings, quantities, and trends.</p>
      </div>

      <div className="obd-metrics">
        <div className="obd-metric-card">
          <div className="obd-metric-label">Total Orders</div>
          <div className="obd-metric-value">{formatNumber(metrics.totalOrders)}</div>
        </div>
        <div className="obd-metric-card">
          <div className="obd-metric-label">Total Qty (KG)</div>
          <div className="obd-metric-value">{formatNumber(metrics.totalNetQty)}</div>
        </div>
        <div className="obd-metric-card">
          <div className="obd-metric-label">Avg Qty / Order</div>
          <div className="obd-metric-value">{formatNumber(metrics.avgQty)}</div>
        </div>
        <div className="obd-metric-card">
          <div className="obd-metric-label">Largest Order</div>
          <div className="obd-metric-value">
            {metrics.largest
              ? `${formatNumber(metrics.largest.netQty)} (${metrics.largest.bookingNo})`
              : '—'}
          </div>
        </div>
      </div>

      <div className="obd-filters">
        <div className="obd-filter-buttons">
          <button
            className={`obd-btn ${activeMonth === 'ALL' ? 'is-active' : ''}`}
            onClick={() => setActiveMonth('ALL')}
            type="button"
          >
            All
          </button>
          {monthOptions.map((k) => (
            <button
              key={k}
              className={`obd-btn ${activeMonth === k ? 'is-active' : ''}`}
              onClick={() => setActiveMonth(k)}
              type="button"
            >
              {monthLabelFromKey(k)}
            </button>
          ))}
        </div>

        <div className="obd-search">
          <input
            className="obd-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search booking, product, customer..."
          />
        </div>
      </div>

      {loading ? (
        <div className="obd-skeleton">
          <div className="obd-skeleton-row">
            <div className="obd-skeleton-card" />
            <div className="obd-skeleton-card" />
            <div className="obd-skeleton-card" />
            <div className="obd-skeleton-card" />
          </div>
          <div className="obd-skeleton-grid">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="obd-skeleton-order" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="obd-empty">
          <div className="obd-empty-title">Couldn’t load orders</div>
          <div className="obd-empty-subtitle">{error}</div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="obd-empty">
          <div className="obd-empty-title">No orders found</div>
          <div className="obd-empty-subtitle">Try adjusting filters or search.</div>
        </div>
      ) : (
        <>
          <div className="obd-chart-card">
            <div className="obd-chart-title">Net Qty (KG) per Booking</div>
            <div className="obd-chart">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          <div className="obd-grid">
            {filteredOrders.map((o) => {
              const bookingNo = String(o.bookingNo ?? '')
              const isExpanded = expandedBookingNo === bookingNo
              return (
                <div
                  key={`${bookingNo}-${o.productGuid || o.productName || ''}`}
                  className={`obd-order-card ${isExpanded ? 'is-selected' : ''}`}
                  onClick={() => toggleExpanded(bookingNo)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') toggleExpanded(bookingNo)
                  }}
                >
                  <div className="obd-order-top">
                    <span className="obd-badge">{bookingNo}</span>
                    <span className="obd-date">{o.bookingDate}</span>
                  </div>

                  <div className="obd-order-main">
                    <div className="obd-product">{o.productName || '—'}</div>
                    <div className="obd-branch">{o.branchName || '—'}</div>
                  </div>

                  <div className="obd-order-bottom">
                    <div className="obd-qty">
                      <span className="obd-qty-value">{formatNumber(o.netQty)}</span>{' '}
                      <span className="obd-qty-unit">{o.unitName || ''}</span>
                    </div>
                    <span className="obd-pill">{o.paymentTerm || '—'}</span>
                  </div>

                  {isExpanded && (
                    <div className="obd-details" onClick={(e) => e.stopPropagation()}>
                      <div className="obd-details-head">
                        <div className="obd-details-title">Details</div>
                        <button
                          type="button"
                          className="obd-close"
                          onClick={() => setExpandedBookingNo(null)}
                        >
                          Close
                        </button>
                      </div>
                      <div className="obd-details-grid">
                        <div><span>Date:</span> {o.bookingDate}</div>
                        <div><span>Customer:</span> {o.customerName || '—'}</div>
                        <div><span>Branch:</span> {o.branchName || '—'}</div>
                        <div><span>Product:</span> {o.productName || '—'}</div>
                        <div><span>Qty:</span> {formatNumber(o.qty)}</div>
                        <div><span>Net Qty:</span> {formatNumber(o.netQty)} {o.unitName || ''}</div>
                        <div><span>Strength:</span> {o.strength ?? '—'}</div>
                        <div><span>Payment Term:</span> {o.paymentTerm || '—'}</div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}

