import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Simple New Order page that posts to the server to create a new order
function NewOrder() {
  const [customerGuid, setCustomerGuid] = useState(null)
  const [productGuid, setProductGuid] = useState('')
  const [branchGuid, setBranchGuid] = useState('')
  const [qty, setQty] = useState(1)
  const [unitGuid, setUnitGuid] = useState('')
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().slice(0,10))
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
  const [strength, setStrength] = useState('')
  const [paymentTerm, setPaymentTerm] = useState('')
  const [modeOfPayment, setModeOfPayment] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Load current user to get customerGuid
    const user = localStorage.getItem('user')
    if (user) {
      try { setCustomerGuid(JSON.parse(user).id) } catch {}
    }
  }, [])

  // Minimal fetch helpers (no error logs on production)
  const fetchLists = async () => {
    const token = localStorage.getItem('token')
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined
    try {
      const [p, b, u] = await Promise.all([
        fetch('/api/dashboard/products', { headers }),
        fetch('/api/dashboard/branches', { headers }),
        fetch('/api/dashboard/units', { headers }),
      ])
      const prod = await p.json()
      const bran = await b.json()
      const unt = await u.json()
      return { products: prod?.products ?? [], branches: bran?.branches ?? [], units: unt?.units ?? [] }
    } catch {
      return { products: [], branches: [], units: [] }
    }
  }

  const [lists, setLists] = useState({ products: [], branches: [], units: [] })
  useEffect(() => {
    fetchLists().then(setLists)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        customerGuid,
        productGuid,
        productName: '',
        branchGuid,
        branchName: '',
        qty,
        netQty: 0,
        unitGuid,
        unitName: '',
        strength,
        paymentTerm,
        bookingDate,
        expectedDeliveryDates: [{ date: expectedDeliveryDate || bookingDate }],
        modeOfPayment
      }
      const token = localStorage.getItem('token')
      const res = await fetch('/api/orderbooking/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        setError(data?.message || 'Failed to create order')
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError('Failed to create order: ' + (err?.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="new-order-container">
      <h2>New Order</h2>
      <form onSubmit={handleSubmit} className="new-order-form">
        <div>
          <label>Product</label>
          <select value={productGuid} onChange={(e) => setProductGuid(e.target.value)} required>
            <option value="">Select product</option>
            {lists.products.map((p) => (
              <option key={p.unqid} value={p.unqid}>{p.productName || p.unqid}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Branch</label>
          <select value={branchGuid} onChange={(e) => setBranchGuid(e.target.value)} required>
            <option value="">Select branch</option>
            {lists.branches.map((b) => (
              <option key={b.unqid} value={b.unqid}>{b.branch}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Quantity</label>
          <input type="number" value={qty} onChange={(e) => setQty(parseFloat(e.target.value))} required />
        </div>
        <div>
          <label>Unit</label>
          <select value={unitGuid} onChange={(e) => setUnitGuid(e.target.value)}>
            <option value="">Select unit</option>
            {lists.units.map((u) => (
              <option key={u.unqid} value={u.unqid}>{u.unitName}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Booking Date</label>
          <input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
        </div>
        <div>
          <label>Expected Delivery Date</label>
          <input type="date" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} />
        </div>
        <div>
          <label>Strength</label>
          <input value={strength} onChange={(e) => setStrength(e.target.value)} />
        </div>
        <div>
          <label>Payment Term</label>
          <input value={paymentTerm} onChange={(e) => setPaymentTerm(e.target.value)} />
        </div>
        <div>
          <label>Mode of Payment</label>
          <input value={modeOfPayment} onChange={(e) => setModeOfPayment(e.target.value)} />
        </div>
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Order'}</button>
      </form>
    </div>
  )
}

export default NewOrder
