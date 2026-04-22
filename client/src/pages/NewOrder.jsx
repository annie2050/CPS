import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

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
  const location = useLocation()
  
  const queryParams = new URLSearchParams(location.search);
  const orderId = queryParams.get('orderId');

  useEffect(() => {
    // Load current user to get customerGuid
    const user = localStorage.getItem('user')
    if (user) {
      try { setCustomerGuid(JSON.parse(user).id) } catch {}
    }
  }, [])

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/orderbooking/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const order = data.order;
        setProductGuid(order.productGuid || '');
        setBranchGuid(order.branchGuid || '');
        setQty(order.qty || 1);
        setUnitGuid(order.unitGuid || '');
        setBookingDate(order.bookingDate ? new Date(order.bookingDate).toISOString().slice(0,10) : '');
        setPaymentTerm(order.paymentTerm || '');
        setModeOfPayment(order.modeOfPayment || '');
        // Note: we only support a single main item in the basic form for now
      } else {
        setError('Failed to load order details');
      }
    } catch (err) {
      setError('Error fetching order: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Minimal fetch helpers (no error logs on production)
  const fetchLists = async () => {
    const token = localStorage.getItem('token')
    if (!token) return { products: [], branches: [], units: [] }
    const headers = { 'Authorization': `Bearer ${token}` }
    try {
      const [p, b, u] = await Promise.all([
        fetch('/api/dashboard/products', { headers }),
        fetch(`/api/dashboard/branches?customerGuid=${encodeURIComponent(customerGuid)}`, { headers }),
        fetch('/api/dashboard/units', { headers }),
      ])
      const prod = await p.json()
      const branData = await b.json()
      const unt = await u.json()
      
      // Check for expired session
      if (p.status === 401 || b.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setError('Please log in again, your session has expired.')
        setTimeout(() => { window.location.href = '/login' }, 2000)
        return { products: [], branches: [], units: [] }
      }
      
      // Normalize branches from dashboard/branches response
      const branches = Array.isArray(branData?.branches)
        ? branData.branches.map((br) => ({
            unqid: br.unqid ?? br.UNQID ?? br.UNQid ?? br.UNQ ?? br.unqID,
            branch: br.BranchN ?? br.Branch ?? br.BRANCH ?? br.branch ?? br.Dname
          }))
        : []
        
      return { products: prod?.products ?? [], branches, units: unt?.units ?? [] }
    } catch {
      return { products: [], branches: [], units: [] }
    }
  }

  const [lists, setLists] = useState({ products: [], branches: [], units: [] })
  // Load dropdown lists once customerGuid is available
  useEffect(() => {
    if (customerGuid) {
      fetchLists().then(setLists)
    }
  }, [customerGuid])

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
      const method = orderId ? 'PUT' : 'POST';
      const url = orderId ? `/api/orderbooking/orders/${orderId}` : '/api/orderbooking/orders';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        setError(data?.message || (orderId ? 'Failed to update order' : 'Failed to create order'))
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError((orderId ? 'Failed to update order: ' : 'Failed to create order: ') + (err?.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="new-order-container">
      <h2>{orderId ? 'Edit Order' : 'New Order'}</h2>
      <form onSubmit={handleSubmit} className="new-order-form">
        <div>
          <label>Product</label>
          <select value={productGuid} onChange={(e) => setProductGuid(e.target.value)} required>
            <option value="">Select product</option>
            {lists.products.map((p) => (
              <option key={p.unqid} value={p.unqid}>{p.ProductN || p.unqid}</option>
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
        <button type="submit" disabled={loading}>{loading ? 'Processing...' : (orderId ? 'Update Order' : 'Create Order')}</button>
      </form>
    </div>
  )
}

export default NewOrder

