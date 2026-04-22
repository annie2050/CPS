import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { fetchWithAuth } from '../authService'
import './OrderBooking.css'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'

function OrderBooking() {
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const orderId = queryParams.get('orderId')
  const isEditMode = !!orderId
  const today = new Date().toISOString().split('T')[0]

  const [user, setUser] = useState(() => {
    const userData = localStorage.getItem('user')
    return userData ? JSON.parse(userData) : null
  })
  const [products, setProducts] = useState([])
  const [branches, setBranches] = useState([])
  const [manufacturers, setManufacturers] = useState([])
  const [categories, setCategories] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [rate, setRate] = useState(0)
  const [loadingDropdowns, setLoadingDropdowns] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchOrderDetails() {
      if (!isEditMode) return
      setLoading(true)
      try {
        const res = await fetchWithAuth(`/api/orderbooking/orders/${orderId}`)
        const data = await res.json()
        if (data.success && data.order) {
          const order = data.order
          
          let validTillDays = '';
          if (order.validTill && order.bookingDate) {
            const vt = new Date(order.validTill);
            const bd = new Date(order.bookingDate);
            const diffTime = Math.abs(vt - bd);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            validTillDays = diffDays.toString();
          }

          setFormData(prev => ({
            ...prev,
            bookingDate: order.bookingDate ? new Date(order.bookingDate).toISOString().split('T')[0] : today,
            productGuid: order.productGuid || '',
            unitGuid: order.unitGuid || '',
            branchGuid: order.branchGuid || '',
            modeOfPayment: order.modeOfPayment || '',
            paymentTerm: order.paymentTerm || '',
            qty: order.qty || '',
            validTillDays: validTillDays
          }))
          if (order.items && order.items.length > 0) {
            setGridData(order.items.map(item => ({
              date: item.deliveryDate ? new Date(item.deliveryDate).toISOString().split('T')[0] : '',
              qty: item.qty || ''
            })))
          }
        } else {
          setMessage({ type: 'error', text: data.message || 'Failed to load order details' })
        }
      } catch (err) {
        console.error('Failed to fetch order details:', err)
        setMessage({ type: 'error', text: 'Error loading order details' })
      } finally {
        setLoading(false)
      }
    }
    fetchOrderDetails()
  }, [isEditMode, orderId])

  const customerGuid = user?.id || (() => {
    const userData = localStorage.getItem('user')
    return userData ? JSON.parse(userData)?.id : null
  })()

  const [formData, setFormData] = useState({
    bookingDate: today,
    productGuid: '',
    manuGuid: '',
    categoryGuid: '',
    unitGuid: '',
    branchGuid: '',
    rate: '',
    modeOfPayment: '',
    paymentTerm: '',
    validTillDays: '',
    qty: '',
  })

  const [gridData, setGridData] = useState([
    { date: '', qty: '' }
  ])

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [productsRes, branchesRes] = await Promise.all([
          fetchWithAuth('/api/dashboard/products'),
          fetchWithAuth(`/api/dashboard/branches?customerGuid=${encodeURIComponent(customerGuid)}`),
        ])
        const productsData = await productsRes.json()
        const branchesData = await branchesRes.json()
        if (productsData.success) setProducts(productsData.products)
        // Normalize branches to the shape used by the UI: { unqid, BranchN }
        let mappedBranches = []
        if (branchesData?.branches && Array.isArray(branchesData.branches)) {
          mappedBranches = branchesData.branches.map((b) => ({ 
            unqid: b.unqid ?? b.UNQID ?? b.UNQID2 ?? b.UNQ, 
            BranchN: b.BranchN ?? b.Branch ?? b.BRANCH ?? b.branch ?? b.Dname
          }))
        } else if (Array.isArray(branchesData)) {
          mappedBranches = branchesData.map((b) => ({ 
            unqid: b.unqid ?? b.UNQID, 
            BranchN: b.BranchN ?? b.Branch ?? b.Dname ?? '' 
          }))
        }
        if (Array.isArray(mappedBranches)) setBranches(mappedBranches)
      } catch (err) {
        console.error('Failed to fetch initial data:', err)
      } finally {
        setLoading(false)
      }
    }
    if (customerGuid) {
      fetchInitialData()
    }
  }, [customerGuid])


  useEffect(() => {
    async function fetchProductDetails() {
      if (!formData.productGuid) {
        setManufacturers([])
        setCategories([])
        setUnits([])
        setRate(0)
        return
      }

      setLoadingDropdowns(true)
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(
          `/api/dashboard/product-details?productGuid=${formData.productGuid}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        )
        const data = await res.json()
        if (data.success) {
          setManufacturers(data.manufacturers || [])
          setCategories(data.categories || [])
          setUnits(data.units || [])
          
          if (data.manufacturers.length === 1) {
            setFormData(prev => ({ ...prev, manuGuid: data.manufacturers[0].unqid }))
          }
          if (data.categories.length === 1) {
            setFormData(prev => ({ ...prev, categoryGuid: data.categories[0].unqid }))
          }
          if (data.units.length === 1) {
            setFormData(prev => ({ ...prev, unitGuid: data.units[0].unitGuid }))
          }
        }
      } catch (err) {
        console.error('Failed to fetch product details:', err)
      } finally {
        setLoadingDropdowns(false)
      }
    }
    fetchProductDetails()
  }, [formData.productGuid])

  useEffect(() => {
    async function fetchRate() {
      if (!formData.productGuid || !formData.branchGuid || !formData.modeOfPayment) {
        setRate(0)
        setFormData(prev => ({ ...prev, rate: '' }))
        return
      }
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(
          `/api/dashboard/rate?productGuid=${formData.productGuid}&branchGuid=${formData.branchGuid}&mode=${formData.modeOfPayment}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        )
        const data = await res.json()
        if (data.success) {
          setRate(data.rate || 0)
          setFormData(prev => ({ ...prev, rate: data.rate || 0 }))
        }
      } catch (err) {
        console.error('Failed to fetch rate:', err)
      }
    }
    fetchRate()
  }, [formData.productGuid, formData.branchGuid, formData.modeOfPayment])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleGridChange = (index, field, value) => {
    const newGrid = [...gridData]
    newGrid[index][field] = value
    setGridData(newGrid)
  }

  const addRow = () => {
    setGridData([...gridData, { date: '', qty: '' }])
  }

  const deleteRow = (index) => {
    if (gridData.length > 1) {
      setGridData(gridData.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })

    const validGridData = gridData.filter((row) => row.date && row.qty)
    if (validGridData.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one delivery schedule.' })
      setSaving(false)
      return
    }

    const selectedProduct = products.find((p) => p.unqid === formData.productGuid)
    const selectedUnit = units.find((u) => u.unitGuid === formData.unitGuid)

    try {
      const token = localStorage.getItem('token')
      
      const bookingDateObj = new Date(formData.bookingDate);
      let validTillDate = new Date(bookingDateObj);
      if (formData.validTillDays) {
        validTillDate.setDate(bookingDateObj.getDate() + parseInt(formData.validTillDays));
      } else {
        validTillDate.setDate(bookingDateObj.getDate() + 30);
      }
      const validTill = validTillDate.toISOString();

      const res = await fetch(isEditMode ? `/api/orderbooking/orders/${orderId}` : '/api/orderbooking/orders', {
        method: isEditMode ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          customerGuid: customerGuid,
          productGuid: formData.productGuid,
          manuGuid: formData.manuGuid,
          categoryGuid: formData.categoryGuid,
          unitGuid: formData.unitGuid,
          rate: Number(rate),
          qty: Number(formData.qty),
          paymentTerm: formData.paymentTerm,
          bookingDate: formData.bookingDate,
          validTill: validTill,
          items: validGridData.map(item => ({
            deliveryDate: item.date,
            qty: Number(item.qty)
          })),
          modeOfPayment: formData.modeOfPayment,
          branchGuid: formData.branchGuid
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.message || (isEditMode ? 'Failed to update order' : 'Failed to create order'))
      }

      setMessage({ type: 'success', text: isEditMode ? 'Order updated successfully!' : 'Order created successfully!' })
      window.scrollTo(0, 0)
      
      if (!isEditMode) {
        setFormData({
          bookingDate: today,
          productGuid: '',
          manuGuid: '',
          categoryGuid: '',
          unitGuid: '',
          branchGuid: '',
          rate: '',
          modeOfPayment: '',
          paymentTerm: '',
          validTillDays: '',
          qty: '',
        })
        setGridData([{ date: '', qty: '' }])
        setManufacturers([])
        setCategories([])
        setUnits([])
        setRate(0)
      } else {
        // In edit mode, we might want to navigate away or just keep the data
        setTimeout(() => navigate('/view-orders'), 2000)
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
      window.scrollTo(0, 0)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="order-page-loading">Loading...</div>
  }

  return (
    <div className="order-page-container">
      <Sidebar />
      <nav className="order-page-nav">
        <h2>Customer Portal</h2>
        <div className="nav-user">
          <span>Welcome, {user?.name || user?.email}</span>
          <button onClick={() => navigate('/dashboard')} className="nav-btn">
            Dashboard
          </button>
        </div>
      </nav>

       <div className="order-page-content">
         <div className="order-page-header">
           <h1>{isEditMode ? 'Edit Order' : 'Place a New Order'}</h1>
         </div>

         {message.text && (
          <div className={`order-form-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <form className="order-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3 className="form-section-title">Order Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="bookingDate">Booking Date</label>
                <input
                  type="date"
                  id="bookingDate"
                  name="bookingDate"
                  value={formData.bookingDate}
                  onChange={handleChange}
                  min={today}
                  max={today}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="productGuid">Product *</label>
                <select
                  id="productGuid"
                  name="productGuid"
                  value={formData.productGuid}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select</option>
                  {products.map((p) => (
                    <option key={p.unqid} value={p.unqid}>{p.ProductN}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="manuGuid">Manufacturer</label>
                <select
                  id="manuGuid"
                  name="manuGuid"
                  value={formData.manuGuid}
                  onChange={handleChange}
                  disabled={!formData.productGuid || loadingDropdowns}
                >
                  <option value="">Select</option>
                  {manufacturers.map((m) => (
                    <option key={m.unqid} value={m.unqid}>{m.ManufactureN}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="categoryGuid">Category</label>
                <select
                  id="categoryGuid"
                  name="categoryGuid"
                  value={formData.categoryGuid}
                  onChange={handleChange}
                  disabled={!formData.productGuid}
                >
                  <option value="">Select</option>
                  {categories.map((c) => (
                    <option key={c.unqid} value={c.unqid}>{c.CategoryN}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="unitGuid">Unit</label>
                <select
                  id="unitGuid"
                  name="unitGuid"
                  value={formData.unitGuid}
                  onChange={handleChange}
                  disabled={!formData.productGuid}
                >
                  <option value="">Select</option>
                  {units.map((u) => (
                    <option key={u.unitGuid} value={u.unitGuid}>{u.unitN}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="qty">Quantity *</label>
                <input
                  type="number"
                  id="qty"
                  name="qty"
                  value={formData.qty}
                  onChange={handleChange}
                  placeholder="Qty"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="paymentTerm">Payment Term *</label>
                <select
                  id="paymentTerm"
                  name="paymentTerm"
                  value={formData.paymentTerm}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select</option>
                  <option value="Immediate">Immediate</option>
                  <option value="Net 7 Days">Net 7 Days</option>
                  <option value="Net 15 Days">Net 15 Days</option>
                  <option value="Net 30 Days">Net 30 Days</option>
                  <option value="Net 45 Days">Net 45 Days</option>
                  <option value="Net 60 Days">Net 60 Days</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="validTillDays">Valid Till</label>
                <select
                  id="validTillDays"
                  name="validTillDays"
                  value={formData.validTillDays}
                  onChange={handleChange}
                >
                  <option value="">Select</option>
                  <option value="7">7 Days</option>
                  <option value="10">10 Days</option>
                  <option value="15">15 Days</option>
                  <option value="30">30 Days</option>
                </select>
              </div>
            </div>

            <div className="form-row-inline">
              <div className="form-group">
                <label htmlFor="branchGuid">Branch *</label>
                <select
                  id="branchGuid"
                  name="branchGuid"
                  value={formData.branchGuid}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select</option>
                  {branches.map((b) => (
                    <option key={b.unqid} value={b.unqid}>{b.BranchN}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="modeOfPayment">Mode *</label>
                <select
                  id="modeOfPayment"
                  name="modeOfPayment"
                  value={formData.modeOfPayment}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select</option>
                  <option value="Cash">Cash</option>
                  <option value="Credit">Credit</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="rateDisplay">Rate</label>
                <input
                  type="number"
                  id="rateDisplay"
                  value={rate}
                  step="0.01"
                  readOnly
                  disabled
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Delivery Schedule</h3>
            <div className="delivery-grid">
              <div className="delivery-header">
                <span>Expected Delivery Date</span>
                <span>Quantity</span>
                <span>Action</span>
              </div>
              {gridData.map((row, index) => (
                <div key={index} className="delivery-row">
                  <input
                    type="date"
                    value={row.date}
                    onChange={(e) => handleGridChange(index, 'date', e.target.value)}
                    min={formData.bookingDate}
                    required
                  />
                  <input
                    type="number"
                    value={row.qty}
                    onChange={(e) => handleGridChange(index, 'qty', e.target.value)}
                    placeholder="Qty"
                    required
                  />
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() => deleteRow(index)}
                    disabled={gridData.length === 1}
                  >
                    Delete
                  </button>
                </div>
              ))}
              <button type="button" className="add-row-btn" onClick={addRow}>
                + Add Row
              </button>
            </div>
          </div>

           <button type="submit" className="order-form-submit" disabled={saving}>
             {saving ? 'Saving...' : (isEditMode ? 'Update Order' : 'Save Order')}
           </button>
         </form>
         <Footer />
       </div>
     </div>
   )
 }

export default OrderBooking
