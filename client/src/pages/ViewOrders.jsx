import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../authService';
import './ViewOrders.css';

function ViewOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetchWithAuth('/api/orderbooking/list');
        const data = await res.json();
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

  const updateOrder = async (id) => {
    navigate(`/orderbooking?orderId=${id}`);
  };

  const deleteOrder = async (id) => {
      if (confirm("Are you sure?")) {
          try {
            await fetchWithAuth(`/api/orderbooking/orders/${id}`, {
                method: 'DELETE',
            });
            window.location.reload();
          } catch (err) {
            alert('Failed to delete order');
          }
      }
  };

  return (
    <div className="view-orders-container">
      <div className="dashboard-nav">
        <h2>My Orders</h2>
        <div className="nav-user">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>
      </div>
      
      <div className="dashboard-content">
        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : error ? (
          <div className="error-state">{error}</div>
        ) : (
          <div className="orders-card">
            <table className="orders-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Booking Date</th>
              <th>Payment Mode</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.unqid}>
                <td title={order.products}>{order.products}</td>
                <td>{order.total_qty}</td>
                <td>{new Date(order.booking_date).toLocaleDateString()}</td>
                <td>{order.payment_mode}</td>
                <td><span className="status-badge">Placed</span></td>
                 <td className="actions-cell">
                     <div className="actions-wrapper">
                         <button className="action-btn edit" onClick={() => updateOrder(order.unqid)}>Edit</button>
                         <button className="action-btn delete" onClick={() => deleteOrder(order.unqid)}>Delete</button>
                     </div>
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

export default ViewOrders;
