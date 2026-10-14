import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchWithAuth } from '../authService'
import { useToast } from '../context/ToastContext'
import Sidebar from '../components/Sidebar'
import './ProductEnquiries.css'

function ProductEnquiries() {
  const [enquiries, setEnquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [qty, setQty] = useState('')
  const [unit, setUnit] = useState('MT')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [remarks, setRemarks] = useState('')
  const [availabilityInfo, setAvailabilityInfo] = useState(null)
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [units, setUnits] = useState([])

  const { showToast } = useToast()
  const navigate = useNavigate()

  const fetchEnquiries = async () => {
    try {
      setLoading(true)
      const res = await fetchWithAuth('/api/enquiries')
      const data = await res.json()
      if (data.success) {
        setEnquiries(data.enquiries || [])
      } else {
        setError(data.message || 'Failed to fetch enquiries')
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch enquiries')
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await fetchWithAuth('/api/dashboard/products')
      const data = await res.json()
      if (data.success) {
        setProducts(data.products || [])
      }
    } catch (err) {
      console.error('Failed to fetch products for enquiry:', err)
    }
  }

  const fetchUnits = async () => {
    try {
      const res = await fetchWithAuth('/api/enquiries/units')
      const data = await res.json()
      if (data.success) {
        setUnits(data.units || [])
      }
    } catch (err) {
      console.error('Failed to fetch units:', err)
    }
  }

  useEffect(() => {
    fetchEnquiries()
    fetchProducts()
    fetchUnits()
  }, [])

  const handleProductChange = async (e) => {
    const prodGuid = e.target.value
    setSelectedProduct(prodGuid)
    if (!prodGuid) {
      setAvailabilityInfo(null)
      return
    }

    setCheckingAvailability(true)
    try {
      const res = await fetchWithAuth(`/api/enquiries/check-availability?productGuid=${prodGuid}`)
      const data = await res.json()
      if (data.success && data.availability) {
        setAvailabilityInfo(data.availability)
        if (data.availability.unit) {
          setUnit(data.availability.unit)
        }
      }
    } catch (err) {
      console.error('Check availability error:', err)
    } finally {
      setCheckingAvailability(false)
    }
  }

  const handleSubmitEnquiry = async (e) => {
    e.preventDefault()
    if (!selectedProduct || !qty || !deliveryDate) {
      showToast('Please fill all required fields (Product, Qty, Delivery Date)', 'error')
      return
    }

    const prodObj = products.find(p => p.unqid === selectedProduct)

    setSubmitting(true)
    try {
      const res = await fetchWithAuth('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productGuid: selectedProduct,
          productName: prodObj?.ProductN || 'Product',
          isAvailable: availabilityInfo ? availabilityInfo.isAvailable : true,
          availabilityStatus: availabilityInfo ? availabilityInfo.availabilityStatus : 'Available',
          qty: Number(qty),
          unit,
          deliveryDate,
          remarks
        })
      })
      const data = await res.json()
      if (data.success) {
        showToast('Enquiry submitted successfully', 'success')
        setSelectedProduct('')
        setQty('')
        setDeliveryDate('')
        setRemarks('')
        setAvailabilityInfo(null)
        fetchEnquiries()
      } else {
        showToast(data.message || 'Failed to submit enquiry', 'error')
      }
    } catch (err) {
      showToast('Failed to submit enquiry', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}-${month}-${year}`
  }

  return (
    <div className="view-orders-container">
      <Sidebar />
      <div className="dashboard-nav">
        <h2>Product Enquiries</h2>
        <div className="nav-user">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>
      </div>

      <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Inline Enquiry Form */}
        <div className="orders-card" style={{ padding: '32px' }}>
          <h3 style={{ marginTop: '0', marginBottom: '8px', color: 'var(--text-primary)' }}>New Product Enquiry</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Check product availability, required quantity, and desired delivery date.</p>

          <form onSubmit={handleSubmitEnquiry}>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>Select Product *</label>
              <select
                value={selectedProduct}
                onChange={handleProductChange}
                required
              >
                <option value="">-- Choose Product --</option>
                {products.map((p) => (
                  <option key={p.unqid} value={p.unqid}>
                    {p.ProductN}
                  </option>
                ))}
              </select>
            </div>

            {checkingAvailability && (
              <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '15px' }}>Checking product availability...</p>
            )}

            {availabilityInfo && (
              <div style={{ backgroundColor: 'rgba(40, 167, 69, 0.1)', border: '1px solid rgba(40, 167, 69, 0.2)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
                <p style={{ margin: '0', color: '#28a745', fontWeight: '600' }}>
                  Availability Status: {availabilityInfo.availabilityStatus || (availabilityInfo.isAvailable ? 'Available' : 'Not Available')}
                </p>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Quantity Needed *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  required
                  placeholder="e.g. 100"
                />
              </div>

              <div className="form-group">
                <label>Unit</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  {units.map((u, i) => (
                    <option key={i} value={u}>{u}</option>
                  ))}
                  {!units.includes(unit) && <option value={unit}>{unit}</option>}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Delivery Date Needed *</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label>Remarks / Special Instructions</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows="3"
                placeholder="Any specific requirement..."
              ></textarea>
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={submitting}
            >
              {submitting ? 'Submitting Enquiry...' : 'Submit Enquiry'}
            </button>
          </form>
        </div>

        {/* Enquiries Grid */}
        <div className="orders-card">
          <div style={{ padding: '24px 24px 16px 24px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: '0', color: 'var(--text-primary)', fontSize: '20px', fontWeight: '600' }}>Your Enquiries History</h3>
          </div>

          {loading ? (
            <div className="loading-state">Loading enquiries...</div>
          ) : error ? (
            <div className="error-state">{error}</div>
          ) : enquiries.length === 0 ? (
            <div className="empty-state">
              <p>No product enquiries found.</p>
            </div>
          ) : (
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Enquiry ID</th>
                  <th>Product</th>
                  <th>Availability</th>
                  <th>Quantity Needed</th>
                  <th>Delivery Date</th>
                  <th>Remarks</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((enq) => (
                  <tr key={enq.unqid}>
                    <td>{enq.unqid}</td>
                    <td><strong>{enq.productName}</strong></td>
                    <td>
                      <span className={`status-badge ${enq.isAvailable ? 'delivered' : 'cancelled'}`}>
                        {enq.availabilityStatus || (enq.isAvailable ? 'Available' : 'Not Available')}
                      </span>
                    </td>
                    <td>{enq.qty} {enq.unit}</td>
                    <td>{formatDate(enq.deliveryDate)}</td>
                    <td>{enq.remarks || '-'}</td>
                    <td>
                      <span className="status-badge processed">{enq.status || 'Pending'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductEnquiries
