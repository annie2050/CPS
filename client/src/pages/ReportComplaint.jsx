import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchWithAuth } from '../authService'
import './ReportComplaint.css'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'

function ReportComplaint() {
  const [orders, setOrders] = useState([])
  const [formData, setFormData] = useState({
    orderId: '',
    category: '',
    message: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetchWithAuth('/api/orderbooking/list');
        const data = await res.json()
        if (data.success) {
          setOrders(data.orders)
        }
      } catch (err) {
        console.error('Failed to fetch orders for report:', err)
      }
    }
    fetchOrders()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const res = await fetchWithAuth('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })
      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'Complaint raised successfully!' })
        setFormData({ orderId: '', category: '', message: '' })
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to raise complaint' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error connecting to server' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="report-page-container">
      <Sidebar />
      <div className="report-page-content">
        <nav className="report-nav">
          <h1>Raise a Complaint</h1>
          <button onClick={() => navigate('/dashboard')} className="back-btn">Back to Dashboard</button>
        </nav>

        {message.text && (
          <div className={`report-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="report-form-wrapper">
          <form className="report-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Related Order (Optional)</label>
              <select 
                value={formData.orderId} 
                onChange={(e) => setFormData({...formData, orderId: e.target.value})}
              >
                <option value="">No specific order</option>
                {orders.map(order => (
                  <option key={order.unqid} value={order.unqid}>
                    Order {order.unqid.slice(0, 8)}... - {order.products}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Complaint Category</label>
              <select 
                required
                value={formData.category} 
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                <option value="">Select Category</option>
                <option value="Delivery Issue">Delivery Issue</option>
                <option value="Product Quality">Product Quality</option>
                <option value="Billing/Payment">Billing/Payment</option>
                <option value="Customer Service">Customer Service</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Detailed Message</label>
              <textarea 
                required
                rows="5"
                value={formData.message} 
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                placeholder="Please describe your issue in detail..."
              />
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </form>
        </div>
        <Footer />
      </div>
    </div>
  )
}

export default ReportComplaint
