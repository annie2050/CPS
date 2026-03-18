import { useState, useEffect } from 'react'
import './OrderBookingForm.css'

function OrderBookingForm({ customerGuid, customerName }) {
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
    netQty: '',
    strength: '',
  })

  const [products, setProducts] = useState([])
  const [manufacturers, setManufacturers] = useState([])
  const [categories, setCategories] = useState([])
  const [units, setUnits] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [rate, setRate] = useState(0)

  const [gridData, setGridData] = useState([
    { date: '', qty: '' }
  ])

  useEffect(() => {
    async function fetchData() {
      try {
        const token = localStorage.getItem('token')
        const headers = token ? { Authorization: `Bearer ${token}` } : {}

        const [productsRes, manuRes, catRes, unitsRes, branchesRes] = await Promise.all([
          fetch('/api/dashboard/products', { headers }),
          fetch('/api/dashboard/manufacturers', { headers }),
          fetch('/api/dashboard/categories', { headers }),
          fetch('/api/dashboard/units', { headers }),
          fetch('/api/dashboard/branches', { headers }),
        ])

        const productsData = await productsRes.json()
        const manuData = await manuRes.json()
        const catData = await catRes.json()
        const unitsData = await unitsRes.json()
        const branchesData = await branchesRes.json()

        if (productsData.success) setProducts(productsData.products)
        if (manuData.success) setManufacturers(manuData.manufacturers)
        if (catData.success) setCategories(catData.categories)
        if (unitsData.success) setUnits(unitsData.units)
        if (branchesData.success) setBranches(branchesData.branches)
      } catch (err) {
        console.error('Failed to fetch dropdown data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    async function fetchRate() {
      if (!formData.productGuid || !formData.manuGuid) {
        setRate(0)
        return
      }
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(
          `/api/dashboard/rate-master?productGuid=${formData.productGuid}&manuGuid=${formData.manuGuid}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        )
        const data = await res.json()
        if (data.success) {
          setRate(data.rate || 0)
        }
      } catch (err) {
        console.error('Failed to fetch rate:', err)
      }
    }
    fetchRate()
  }, [formData.productGuid, formData.manuGuid])

  const handleChange = (e) => {
    const { name, value } = e.target
    console.log('handleChange:', name, 'value:', JSON.stringify(value))
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (name === 'productGuid' && value) {
      // Clean the value - remove any surrounding quotes
      const cleanValue = String(value).replace(/^['"]+|['"]+$/g, '')
      console.log('Fetching details for product:', cleanValue)
      fetchProductDetails(cleanValue)
    }
  }

  const fetchProductDetails = async (productGuid) => {
    try {
      const token = localStorage.getItem('token')
      console.log('Token:', token ? 'exists' : 'missing')
      
      const res = await fetch(
        `/api/dashboard/product-details?productGuid=${productGuid}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )
      const data = await res.json()
      console.log('API Response:', data)
      
      if (data.success && data.details) {
        console.log('Details received:', data.details)
        const updates = {
          manuGuid: data.details.manufactureid || '',
          categoryGuid: data.details.categoryunqid || '',
          unitGuid: data.details.unit || '',
        }
        console.log('Setting formData:', updates)
        setFormData((prev) => ({ ...prev, ...updates }))
        // Ensure option lists contain the returned IDs for reliable binding
        if (data.details.manufactureid && data.details.manufacurename) {
          setManufacturers((prev) => {
            const exists = prev?.some((m) => m.unqid === data.details.manufactureid)
            if (!exists) return [...prev, { unqid: data.details.manufactureid, manuName: data.details.manufacurename }]
            return prev
          })
        }
        if (data.details.categoryunqid && data.details.category) {
          setCategories((prev) => {
            const exists = prev?.some((c) => c.unqid === data.details.categoryunqid)
            if (!exists) return [...prev, { unqid: data.details.categoryunqid, category: data.details.category }]
            return prev
          })
        }
        if (data.details.unit && data.details.unitname) {
          setUnits((prev) => {
            const exists = prev?.some((u) => u.unqid === data.details.unit)
            if (!exists) return [...prev, { unqid: data.details.unit, unitName: data.details.unitname }]
            return prev
          })
        }
        // Ensure dropdowns have the returned IDs as options (fallback UX)
        if (data.details.manufactureid && data.details.manufacurename) {
          setManufacturers((prev) => {
            const exists = prev?.some((m) => m.unqid === data.details.manufactureid)
            if (!exists) return [...prev, { unqid: data.details.manufactureid, manuName: data.details.manufacurename }]
            return prev
          })
        }
        if (data.details.categoryunqid && data.details.category) {
          setCategories((prev) => {
            const exists = prev?.some((c) => c.unqid === data.details.categoryunqid)
            if (!exists) return [...prev, { unqid: data.details.categoryunqid, category: data.details.category }]
            return prev
          })
        }
        if (data.details.unit && data.details.unitname) {
          setUnits((prev) => {
            const exists = prev?.some((u) => u.unqid === data.details.unit)
            if (!exists) return [...prev, { unqid: data.details.unit, unitName: data.details.unitname }]
            return prev
          })
        }
      } else {
        console.log('API call failed: success=', data.success, 'has details=', !!data.details)
      }
    } catch (err) {
      console.error('Error:', err)
    }
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
    const selectedUnit = units.find((u) => u.unqid === formData.unitGuid)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/dashboard/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          customerGuid,
          productGuid: formData.productGuid,
          productName: selectedProduct?.productName || '',
          unitGuid: formData.unitGuid,
          unitName: selectedUnit?.unitName || '',
          qty: Number(formData.qty),
          netQty: Number(formData.netQty || formData.qty),
          strength: formData.strength,
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
        unitGuid: '',
        rate: '',
        modeOfPayment: '',
        paymentTerm: '',
        validTillDays: '',
        qty: '',
        netQty: '',
        strength: '',
      })
      setGridData([{ date: '', qty: '' }])
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const getMinValidTillDate = () => {
    if (!formData.bookingDate) return ''
    const date = new Date(formData.bookingDate)
    date.setDate(date.getDate() + (parseInt(formData.validTillDays) || 0))
    return date.toISOString().split('T')[0]
  }

  if (loading) {
    return <div className="order-form-loading">Loading...</div>
  }

  return (
    <div className="order-form-container">
      <div className="order-form-card">
        <h2 className="order-form-title">Order Booking - {customerName}</h2>

        {message.text && (
          <div className={`order-form-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="order-form">
          <div className="order-form-section">
            <h3 className="order-form-section-title">Order Details</h3>
            <div className="order-form-grid">
              <div className="order-form-group">
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

              <div className="order-form-group">
                <label htmlFor="productGuid">Product</label>
                <select
                  id="productGuid"
                  name="productGuid"
                  value={formData.productGuid}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Product</option>
                  {products.map((p) => (
                    <option key={p.unqid} value={p.unqid}>{p.ProductN || p.productName}</option>
                  ))}
                </select>
              </div>

              <div className="order-form-group">
                <label htmlFor="branchGuid">Branch</label>
                <select
                  id="branchGuid"
                  name="branchGuid"
                  value={formData.branchGuid}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Branch</option>
                  {branches.map((b) => (
                    <option key={b.unqid} value={b.unqid}>{b.branch}</option>
                  ))}
                </select>
              </div>

              <div className="order-form-group">
                <label htmlFor="manuGuid">Manufacturer</label>
                <select
                  id="manuGuid"
                  name="manuGuid"
                  value={formData.manuGuid}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Manufacturer</option>
                  {manufacturers.map((m) => (
                    <option key={m.unqid} value={m.unqid}>{m.manuName}</option>
                  ))}
                </select>
              </div>

              <div className="order-form-group">
                <label htmlFor="categoryGuid">Category</label>
                <select
                  id="categoryGuid"
                  name="categoryGuid"
                  value={formData.categoryGuid}
                  onChange={handleChange}
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.unqid} value={c.unqid}>{c.category}</option>
                  ))}
                </select>
              </div>

              <div className="order-form-group">
                <label htmlFor="unitGuid">Unit</label>
                <select
                  id="unitGuid"
                  name="unitGuid"
                  value={formData.unitGuid}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Unit</option>
                  {units.map((u) => (
                    <option key={u.unqid} value={u.unqid}>{u.unitName}</option>
                  ))}
                </select>
              </div>

              <div className="order-form-group">
                <label htmlFor="rate">Rate</label>
                <input
                  type="number"
                  id="rate"
                  name="rate"
                  value={rate}
                  onChange={handleChange}
                  step="0.01"
                  readOnly
                />
              </div>

              <div className="order-form-group">
                <label htmlFor="modeOfPayment">Mode of Payment</label>
                <select
                  id="modeOfPayment"
                  name="modeOfPayment"
                  value={formData.modeOfPayment}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Mode</option>
                  <option value="Cash">Cash</option>
                  <option value="Credit">Credit</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div className="order-form-group">
                <label htmlFor="paymentTerm">Payment Term</label>
                <select
                  id="paymentTerm"
                  name="paymentTerm"
                  value={formData.paymentTerm}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Term</option>
                  <option value="Immediate">Immediate</option>
                  <option value="Net 7 Days">Net 7 Days</option>
                  <option value="Net 15 Days">Net 15 Days</option>
                  <option value="Net 30 Days">Net 30 Days</option>
                  <option value="Net 45 Days">Net 45 Days</option>
                  <option value="Net 60 Days">Net 60 Days</option>
                </select>
              </div>

              <div className="order-form-group">
                <label htmlFor="validTillDays">Valid Till</label>
                <select
                  id="validTillDays"
                  name="validTillDays"
                  value={formData.validTillDays}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Days</option>
                  <option value="7">7 Days</option>
                  <option value="10">10 Days</option>
                  <option value="15">15 Days</option>
                  <option value="30">30 Days</option>
                </select>
              </div>

              <div className="order-form-group">
                <label htmlFor="qty">Quantity</label>
                <input
                  type="number"
                  id="qty"
                  name="qty"
                  value={formData.qty}
                  onChange={handleChange}
                  placeholder="Enter quantity"
                  required
                />
              </div>

              <div className="order-form-group">
                <label htmlFor="netQty">Net Quantity</label>
                <input
                  type="number"
                  id="netQty"
                  name="netQty"
                  value={formData.netQty}
                  onChange={handleChange}
                  placeholder="Enter net quantity"
                />
              </div>

              <div className="order-form-group">
                <label htmlFor="strength">Strength</label>
                <input
                  type="text"
                  id="strength"
                  name="strength"
                  value={formData.strength}
                  onChange={handleChange}
                  placeholder="Enter strength"
                />
              </div>
            </div>
          </div>

          <div className="order-form-section">
            <h3 className="order-form-section-title">Delivery Schedule</h3>
            <div className="order-form-grid-header">
              <div className="grid-col">Expected Delivery Date</div>
              <div className="grid-col">Quantity</div>
              <div className="grid-col grid-col-action">Action</div>
            </div>
            {gridData.map((row, index) => (
              <div key={index} className="order-form-grid-row">
                <div className="grid-col">
                  <input
                    type="date"
                    value={row.date}
                    onChange={(e) => handleGridChange(index, 'date', e.target.value)}
                    min={formData.bookingDate}
                    required
                  />
                </div>
                <div className="grid-col">
                  <input
                    type="number"
                    value={row.qty}
                    onChange={(e) => handleGridChange(index, 'qty', e.target.value)}
                    placeholder="Qty"
                    required
                  />
                </div>
                <div className="grid-col grid-col-action">
                  <button
                    type="button"
                    className="grid-delete-btn"
                    onClick={() => deleteRow(index)}
                    disabled={gridData.length === 1}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="grid-add-btn" onClick={addRow}>
              + Add Row
            </button>
          </div>

          <button type="submit" className="order-form-submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Order'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default OrderBookingForm
