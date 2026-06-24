import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../authService';
import './ViewOrders.css';

function ViewOrders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [orders, setOrders] = useState([]);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const filteredOrders = orders.filter(order => 
    (order.productName || order.products || '').toLowerCase().includes(debouncedSearch.toLowerCase())
  );

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

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetchWithAuth('/api/orderbooking/list');
        const data = await res.json();
        if (data.success) {
          const placedOrders = data.orders.filter(o => !o.order_status || o.order_status === 'placed' || o.order_status === '' || o.order_status === 'new');
          setOrders(placedOrders);
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

  const reorderOrder = async (id) => {
    navigate(`/orderbooking?orderId=${id}&reorder=true`);
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

const getStatusBadge = (order) => {
    if (order.order_status === 'cancelled') {
      return <span className="status-badge cancelled" onClick={() => navigate(`/order-status?orderId=${order.unqid}`)} style={{cursor:'pointer'}}>Cancelled</span>;
    }
    if (order.order_status === 'delivered') {
      return <span className="status-badge delivered" onClick={() => navigate(`/order-status?orderId=${order.unqid}`)} style={{cursor:'pointer'}}>Delivered</span>;
    }
    if (order.order_status === 'processed') {
      return <span className="status-badge processed" onClick={() => navigate(`/order-status?orderId=${order.unqid}`)} style={{cursor:'pointer'}}>Processed</span>;
    }
    if (order.order_status === 'new') {
      return <span className="status-badge new" onClick={() => navigate(`/order-status?orderId=${order.unqid}`)} style={{cursor:'pointer'}}>New</span>;
    }
    return <span className="status-badge">Placed</span>;
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
        <div className="search-bar">
            <input 
              type="text" 
              placeholder="Search by product..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : error ? (
          <div className="error-state">{error}</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">No orders found.</div>
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
            {filteredOrders.map(order => (
              <tr key={order.unqid}>
                <td>{order.productName || order.products}</td>
                <td>{order.total_qty}</td>
                <td>{formatDate(order.booking_date)}</td>
                <td>{order.payment_mode}</td>
                <td>{getStatusBadge(order)}</td>
                 <td className="actions-cell">
                      <div className="actions-wrapper">
                          <button className="action-btn edit" onClick={() => updateOrder(order.unqid)}>Edit</button>
                          <button className="action-btn reorder" onClick={() => reorderOrder(order.unqid)}>Reorder</button>
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
