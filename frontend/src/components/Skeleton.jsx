function Skeleton({ className, count = 1, height, width }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={`skeleton ${className || ''}`}
          style={{ height: height || undefined, width: width || undefined }}
        />
      ))}
    </>
  );
}

function StatCardSkeleton() {
  return (
    <div className="stat-card stat-card-loading">
      <div className="stat-skeleton" />
      <div className="stat-skeleton stat-skeleton-label" />
    </div>
  );
}

function TableSkeleton({ rows = 5 }) {
  return (
    <div className="table-skeleton">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="table-skeleton-row">
          <div className="skeleton" style={{ width: '20%' }} />
          <div className="skeleton" style={{ width: '40%' }} />
          <div className="skeleton" style={{ width: '10%' }} />
          <div className="skeleton" style={{ width: '15%' }} />
          <div className="skeleton" style={{ width: '15%' }} />
        </div>
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="card-skeleton">
      <div className="skeleton" style={{ height: '24px', width: '40%', marginBottom: '16px' }} />
      <div className="skeleton" style={{ height: '16px', width: '80%', marginBottom: '8px' }} />
      <div className="skeleton" style={{ height: '16px', width: '60%', marginBottom: '8px' }} />
      <div className="skeleton" style={{ height: '16px', width: '70%' }} />
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="analytics-skeleton-grid">
      <div className="analytics-skeleton-kpi">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="analytics-skeleton-chart">
        <div className="skeleton" style={{ height: '300px' }} />
      </div>
      <div className="analytics-skeleton-charts">
        <div className="skeleton" style={{ height: '200px' }} />
        <div className="skeleton" style={{ height: '200px' }} />
      </div>
    </div>
  );
}

export { Skeleton, StatCardSkeleton, TableSkeleton, CardSkeleton, AnalyticsSkeleton };
