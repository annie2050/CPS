import { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { fetchWithAuth } from '../authService'
import { useToast } from '../context/ToastContext'

const orderSchema = z.object({
  productGuid: z.string().min(1, 'Product is required'),
  branchGuid: z.string().min(1, 'Branch is required'),
  qty: z.preprocess((val) => parseFloat(val), z.number().positive('Quantity must be greater than 0')),
  unitGuid: z.string().optional(),
  bookingDate: z.string().min(1, 'Booking date is required'),
  expectedDeliveryDate: z.string().optional(),
  strength: z.string().optional(),
  paymentTerm: z.string().optional(),
  modeOfPayment: z.string().optional(),
})

function NewOrder() {
  const [customerGuid, setCustomerGuid] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [lists, setLists] = useState({ products: [], branches: [], units: [] })
  const messageRef = useRef(null)
  
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  
  const queryParams = new URLSearchParams(location.search);
  const orderId = queryParams.get('orderId');

  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      bookingDate: new Date().toISOString().slice(0,10),
      qty: 1
    }
  })

  useEffect(() => {
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
      const res = await fetchWithAuth(`/api/orderbooking/orders/${orderId}`);
      const data = await res.json();
      if (data.success) {
        const order = data.order;
        Object.keys(order).forEach(key => {
          if (register.hasOwnProperty(key)) {
            setValue(key, order[key])
          }
        })
        setValue('bookingDate', order.bookingDate ? new Date(order.bookingDate).toISOString().slice(0,10) : '')
      } else {
        setError('Failed to load order details');
      }
    } catch (err) {
      setError('Error fetching order: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLists = async () => {
    try {
      const [p, b, u] = await Promise.all([
        fetchWithAuth('/api/dashboard/products'),
        fetchWithAuth(`/api/dashboard/branches?customerGuid=${encodeURIComponent(customerGuid)}`),
        fetchWithAuth('/api/dashboard/units'),
      ])
      const prod = await p.json()
      const branData = await b.json()
      const unt = await u.json()
      
      if (p.status === 401 || b.status === 401) {
        setError('Please log in again, your session has expired.')
        setTimeout(() => { window.location.href = '/login' }, 2000)
        return { products: [], branches: [], units: [] }
      }
      
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

  useEffect(() => {
    if (customerGuid) {
      fetchLists().then(setLists)
    }
  }, [customerGuid])

  const onSubmit = async (data) => {
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const payload = {
        customerGuid,
        ...data,
        expectedDeliveryDates: [{ date: data.expectedDeliveryDate || data.bookingDate }],
      }
      const method = orderId ? 'PUT' : 'POST';
      const url = orderId ? `/api/orderbooking/orders/${orderId}` : '/api/orderbooking/orders';
      
      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const resData = await res.json()
      if (!res.ok || !resData?.success) {
        const errorMsg = resData?.message || (orderId ? 'Failed to update order' : 'Failed to create order');
        setError(errorMsg)
        showToast(errorMsg, 'error')
        setTimeout(() => messageRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else {
        const successMsg = orderId ? 'Order updated successfully' : 'Order created successfully'
        setSuccess(successMsg)
        showToast(successMsg)
        setTimeout(() => {
            navigate('/dashboard', { replace: true })
        }, 1500)
      }
    } catch (err) {
      const errorMsg = (orderId ? 'Failed to update order: ' : 'Failed to create order: ') + (err?.message || 'Unknown error');
      setError(errorMsg)
      showToast('Error saving order', 'error')
      setTimeout(() => messageRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="new-order-container">
      <h2>{orderId ? 'Edit Order' : 'New Order'}</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="new-order-form">
        <div>
          <label htmlFor="productGuid">Product</label>
          <select id="productGuid" {...register('productGuid')} aria-invalid={!!errors.productGuid}>
            <option value="">Select product</option>
            {lists.products.map((p) => {
              const isSm206 = p.unqid === 'sm206_6' || p.unqid === 'sm206_2' || p.ProductN === 'sm206_6' || p.ProductN === 'sm206_2';
              const value = isSm206 ? 'sm206_2' : p.unqid;
              const displayName = isSm206 ? 'sm206_9' : (p.ProductN || p.unqid);
              return <option key={p.unqid} value={value}>{displayName}</option>
            })}
          </select>
          {errors.productGuid && <p className="error-msg">{errors.productGuid.message}</p>}
        </div>
        <div>
          <label htmlFor="branchGuid">Branch</label>
          <select id="branchGuid" {...register('branchGuid')} aria-invalid={!!errors.branchGuid}>
            <option value="">Select branch</option>
            {lists.branches.map((b) => (
              <option key={b.unqid} value={b.unqid}>{b.branch}</option>
            ))}
          </select>
          {errors.branchGuid && <p className="error-msg">{errors.branchGuid.message}</p>}
        </div>
        <div>
          <label htmlFor="qty">Quantity</label>
          <input id="qty" type="number" {...register('qty')} aria-invalid={!!errors.qty} />
          {errors.qty && <p className="error-msg">{errors.qty.message}</p>}
        </div>
        
        <button type="submit" disabled={loading}>{loading ? 'Processing...' : (orderId ? 'Update Order' : 'Create Order')}</button>
        
        <div ref={messageRef}>
            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}
        </div>
      </form>
    </div>
  )
}

export default NewOrder
