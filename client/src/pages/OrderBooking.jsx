import { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { fetchWithAuth } from '../authService'
import './OrderBooking.css'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'

function OrderBooking() {
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const orderId = queryParams.get('orderId')
  const isReorder = queryParams.get('reorder') === 'true'
  const isEditMode = !!orderId && !isReorder
  const today = new Date().toISOString().split('T')[0]
  const messageRef = useRef(null)

  const [user, setUser] = useState(() => {
    const userData = localStorage.getItem('user')
    return userData ? JSON.parse(userData) : null
  })
  
  const customerGuid = user?.sm19_unqid;
  
  const [products, setProducts] = useState([])
  const [branches, setBranches] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [baseRate, setBaseRate] = useState(0)
  const [rate, setRate] = useState(0)
  const [loadingDropdowns, setLoadingDropdowns] = useState(false)
  const [localRequestRate, setLocalRequestRate] = useState('')
  const navigate = useNavigate()
  
  useEffect(() => {
    async function fetchOrderDetails() {
      if (!orderId) return
      setLoading(true)
      try {
        const res = await fetchWithAuth(`/api/orderbooking/orders/${orderId}`)
        const data = await res.json()
        if (data.success && data.order) {
          const order = data.order
          setFormData(prev => ({
            ...prev,
            bookingDate: isReorder ? today : (order.bookingDate ? new Date(order.bookingDate).toISOString().split('T')[0] : today),
            productGuid: order.productGuid || '',
            unitGuid: order.unitGuid || '',
            modeOfPayment: order.modeOfPayment || '',
            paymentDays: order.paymentTerm || '',
            qty: order.qty || '',
            rate: order.rate || '',
            requestRate: order.requestRate ?? '',
            validTillDate: isReorder ? new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0] : (order.validTill ? new Date(order.validTill).toISOString().split('T')[0] : '')
          }))
          setBaseRate(order.rate || 0)
          setRate(order.rate || 0)
          setLocalRequestRate(order.requestRate ?? '')
          if (order.items && order.items.length > 0) {
            setGridData(order.items.map(item => ({
              date: isReorder ? today : (item.deliveryDate ? new Date(item.deliveryDate).toISOString().split('T')[0] : ''),
              qty: item.qty || '',
              requestRate: item.requestRate ?? item.request_rate ?? null
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
  }, [orderId, isReorder])
  
  const [formData, setFormData] = useState({
    bookingDate: today,
    productGuid: '',
    unitGuid: '',
    rate: '',
    requestRate: '',
    modeOfPayment: '',
    paymentDays: '',
    validTillDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
    qty: '',
  })


  const [gridData, setGridData] = useState([
    { date: '', qty: '', requestRate: '' }
  ])

  useEffect(() => {
    if (formData.modeOfPayment === 'Cash') {
      setFormData(prev => ({ ...prev, paymentDays: 'Net 7 Days' }))
    }
  }, [formData.modeOfPayment])

  useEffect(() => {
    const parseDays = (daysStr) => {
      if (daysStr === 'Immediate') return 0
      const match = daysStr.match(/(\d+)/)
      return match ? parseInt(match[1], 10) : 0
    }

    if (baseRate > 0 && formData.paymentDays) {
      const days = parseDays(formData.paymentDays)
      const interest = baseRate * 0.18 * (days / 365)
      setRate(parseFloat((baseRate + interest).toFixed(2)))
    } else {
      setRate(baseRate)
    }
  }, [baseRate, formData.paymentDays])

  useEffect(() => {
    async function fetchRate() {
      if (!formData.productGuid || !formData.modeOfPayment || branches.length === 0) {
        setBaseRate(0)
        return
      }
      const branchGuid = branches[0].unqid;
      try {
        const res = await fetchWithAuth(
          `/api/dashboard/rate?productGuid=${formData.productGuid}&branchGuid=${branchGuid}&mode=${formData.modeOfPayment}`
        )
        const data = await res.json()
        if (data.success) {
          setBaseRate(data.rate || 0)
        }
      } catch (err) {
        console.error('Failed to fetch rate:', err)
      }
    }
    fetchRate()
  }, [formData.productGuid, formData.modeOfPayment, branches])

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [productsRes, branchesRes, unitsRes] = await Promise.all([
          fetchWithAuth('/api/dashboard/products'),
          fetchWithAuth(`/api/dashboard/branches?customerGuid=${encodeURIComponent(customerGuid)}`),
          fetchWithAuth('/api/dashboard/units')
        ])
        const productsData = await productsRes.json()
        const branchesData = await branchesRes.json()
        const unitsData = await unitsRes.json()
        
        if (productsData.success) setProducts(productsData.products)
        if (unitsData.success) setUnits(unitsData.units)
        
        if (branchesData.success) {
           const mappedBranches = branchesData.branches.map((b) => ({ 
             unqid: b.unqid ?? b.UNQID ?? b.UNQID2 ?? b.UNQ, 
             BranchN: b.BranchN ?? b.Branch ?? b.BRANCH ?? b.branch ?? b.Dname
           }))
           setBranches(mappedBranches)
        }
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



  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'requestRate') {
      setFormData(prev => ({ ...prev, requestRate: value }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleGridChange = (index, field, value) => {
    const newGrid = [...gridData]
    newGrid[index][field] = value
    setGridData(newGrid)
  }

  const addRow = () => {
    setGridData([...gridData, { date: '', qty: '', requestRate: formData.requestRate || '' }])
  }

  useEffect(() => {
    setGridData(prevGrid => prevGrid.map(row => {
      if (row.requestRate === '' || row.requestRate === null || row.requestRate === undefined) {
        return { ...row, requestRate: formData.requestRate || '' };
      }
      return row;
    }))
  }, [formData.requestRate])

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
      setTimeout(() => messageRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      return
    }

    const totalGridQty = validGridData.reduce((sum, row) => sum + Number(row.qty), 0)
    const mainQty = Number(formData.qty)
    if (totalGridQty !== mainQty) {
      setMessage({ type: 'error', text: 'Total quantity in delivery schedule (' + totalGridQty + ') must equal the order quantity (' + mainQty + ').' })
      setSaving(false)
      setTimeout(() => messageRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      return
    }

    const selectedProduct = products.find((p) => p.unqid === formData.productGuid)
    const selectedUnit = units.find((u) => u.unitGuid === formData.unitGuid)

    try {
      const token = localStorage.getItem('token')
      
      const bookingDateObj = new Date(formData.bookingDate);
      const validTill = new Date(formData.validTillDate).toISOString();

      const res = await fetchWithAuth(isEditMode ? '/api/orderbooking/orders/' + orderId : '/api/orderbooking/orders', {
        method: isEditMode ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerGuid: customerGuid,
          productGuid: formData.productGuid,
          unitGuid: formData.unitGuid,
          rate: Number(rate),
          requestRate: formData.requestRate ? Number(formData.requestRate) : null,
          qty: Number(formData.qty),
          paymentDays: formData.paymentDays,
          bookingDate: formData.bookingDate,
          validTill: validTill,
          items: validGridData.map(item => ({
            deliveryDate: item.date,
            qty: Number(item.qty),
            requestRate: Number(item.requestRate) || null
          })),
          modeOfPayment: formData.modeOfPayment,
          branchGuid: branches.length > 0 ? branches[0].unqid : 'default',
          manuGuid: '00000000-0000-0000-0000-000000000000',
          categoryGuid: '00000000-0000-0000-0000-000000000000'
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.message || (isEditMode ? 'Failed to update order' : 'Failed to create order'))
      }

      setMessage({ type: 'success', text: isEditMode ? 'Order updated successfully!' : 'Order created successfully!' })
      
      if (!isEditMode) {
        setFormData({
          bookingDate: today,
          productGuid: '',
          unitGuid: '',
          rate: '',
          requestRate: '',
          modeOfPayment: '',
          paymentDays: '',
          validTillDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
          qty: '',
        })
        setLocalRequestRate('')
        setGridData([{ date: '', qty: '', requestRate: '' }])
        setUnits([])
        setRate(0)
      } else {
        setTimeout(() => navigate('/view-orders'), 2000)
      }
      setTimeout(() => messageRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
      setTimeout(() => messageRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
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
          <span>Welcome, {user?.name} ({user?.company})</span>
          <button onClick={() => navigate('/dashboard')} className="nav-btn">
            Dashboard
          </button>
        </div>
      </nav>

       <div className="order-page-content">
         <div className="order-page-header">
           <h1>{isEditMode ? 'Edit Order' : 'Place a New Order'}</h1>
         </div>

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
                     <option key={u.unqid} value={u.unqid}>{u.unitN}</option>
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
                 <label htmlFor="paymentDays">Payment Days *</label>
                 <select
                   id="paymentDays"
                   name="paymentDays"
                   value={formData.paymentDays}
                   onChange={handleChange}
                   disabled={formData.modeOfPayment === 'Cash'}
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
                 <label htmlFor="validTillDate">Valid Till</label>
                 <input
                   type="date"
                   id="validTillDate"
                   name="validTillDate"
                   value={formData.validTillDate}
                   onChange={handleChange}
                   min={formData.bookingDate}
                 />
               </div>
             </div>

             <div className="form-row-inline">
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

               <div className="form-group">
                 <label htmlFor="requestRate">Request Rate</label>
                 <input
                   type="number"
                   id="requestRate"
                   name="requestRate"
                   value={localRequestRate}
                   onChange={(e) => {
                     setLocalRequestRate(e.target.value)
                     setFormData(prev => ({ ...prev, requestRate: e.target.value }))
                   }}
                   placeholder="Enter request rate"
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
                 <span>Request Rate</span>
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
                   <input
                     type="number"
                     value={row.requestRate || ''}
                     onChange={(e) => handleGridChange(index, 'requestRate', e.target.value)}
                     placeholder="Req Rate"
                     step="0.01"
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
           
           <div ref={messageRef}>
             {message.text && (
              <div className={`order-form-message ${message.type}`}>
                {message.text}
              </div>
            )}
           </div>
         </form>
         <Footer />
       </div>
     </div>
   )
 }

export default OrderBooking
