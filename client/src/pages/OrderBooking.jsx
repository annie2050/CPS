import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './OrderBooking.css'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'

function OrderBooking() {
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

  const customerGuid = user?.id || (() => {
    const userData = localStorage.getItem('user')
    return userData ? JSON.parse(userData)?.id : null
  })()

  const today = new Date().toISOString().split('T')[0]

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
        const token = localStorage.getItem('token')
        const headers = token ? { Authorization: `Bearer ${token}` } : {}

        const [productsRes, branchesRes] = await Promise.all([
          fetch('/api/dashboard/products', { headers }),
          fetch('/api/dashboard/branches', { headers }),
        ])

        const productsData = await productsRes.json()
        const branchesData = await branchesRes.json()

        if (productsData.success) setProducts(productsData.products)
        if (branchesData.success) setBranches(branchesData.branches)
      } catch (err) {
        console.error('Failed to fetch initial data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchInitialData()
  }, [])

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
      const res = await fetch('/api/dashboard/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          customerGuid: customerGuid,
          productGuid: formData.productGuid,
          productName: selectedProduct?.ProductN || '',
          unitGuid: formData.unitGuid,
          unitName: selectedUnit?.unitN || '',
          qty: Number(formData.qty),
          paymentTerm: formData.paymentTerm,
          bookingDate: formData.bookingDate,
          expectedDeliveryDates: validGridData,
          modeOfPayment: formData.modeOfPayment,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to create order')
      }

      setMessage({ type: 'success', text: 'Order created successfully!' })
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
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
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
          <h1>Place a New Order</h1>
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
            {saving ? 'Saving...' : 'Save Order'}
          </button>
        </form>
        <Footer />
      </div>
    </div>
  )
}

export default OrderBooking
