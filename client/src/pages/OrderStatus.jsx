import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchWithAuth } from '../authService';
import './ViewOrders.css';

function OrderStatus() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };
  const [searchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get('orderId');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetchWithAuth('/api/orderbooking/updated');
        const data = await res.json();
        console.log('Cancelled orders response:', data);
        if (data.success) {
          setOrders(data.orders);
        } else {
          setError(data.message || 'Failed to fetch orders');
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const singleOrder = orderIdFromUrl ? orders.find(o => o.unqid === orderIdFromUrl) : null;

  return (
    <div className="view-orders-container">
      <div className="dashboard-nav">
        <h2>{singleOrder ? 'Order Status Details' : 'Order Status'}</h2>
        <div className="nav-user">
          <button className="back-btn" onClick={() => navigate('/view-orders')}>Back to Orders</button>
        </div>
      </div>
      
      <div className="dashboard-content">
        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : error ? (
          <div className="error-state">{error}</div>
        ) : singleOrder ? (
          <div className="orders-card">
            <div className="status-detail-card">
              <h3>Order: {singleOrder.unqid}</h3>
              <div className="detail-row">
                <strong>Status:</strong>
                <span className={`status-badge ${singleOrder.order_status || singleOrder.status}`}>
                  {singleOrder.order_status || singleOrder.status || 'N/A'}
                </span>
              </div>
              {singleOrder.cancel_reason && (
                <div className="detail-row">
                  <strong>Cancellation Reason:</strong>
                  <span>{singleOrder.cancel_reason}</span>
                </div>
              )}
              {singleOrder.order_statuss && (
                <div className="detail-row">
                  <strong>Remark:</strong>
                  <span>{singleOrder.order_statuss}</span>
                </div>
              )}
              <div className="detail-row">
                <strong>Booking Date:</strong>
                <span>{formatDate(singleOrder.booking_date)}</span>
              </div>
              <div className="detail-row">
                <strong>Payment Mode:</strong>
                <span>{singleOrder.payment_mode}</span>
              </div>
              <div className="detail-row">
                <strong>Quantity:</strong>
                <span>{singleOrder.total_qty}</span>
              </div>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">No updated orders found.</div>
        ) : (
          <div className="orders-card">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Booking Date</th>
                  <th>Payment Mode</th>
                  <th>Status</th>
                  <th>Reason / Remark</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.unqid}>
                    <td>{order.productName || order.products?.substring(0, 8) || '-'}</td>
                    <td>{formatDate(order.booking_date)}</td>
                    <td>{order.payment_mode}</td>
                    <td><span className={`status-badge ${order.order_status || order.status}`}>{order.order_status || order.status}</span></td>
                    <td className="reason-cell">
                      {order.cancel_reason || order.order_statuss || order.cancellation_reason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderStatus;