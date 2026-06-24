import './Skeleton.css';

export function DashboardSkeleton() {
  return (
    <div className="obd-container">
      <div className="obd-summary-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton skeleton-card"></div>
        ))}
      </div>
      <div className="obd-table-container">
        <div className="skeleton skeleton-table-row" style={{marginBottom: '20px'}}></div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton skeleton-table-row"></div>
        ))}
      </div>
    </div>
  );
}
