function StatCardSkeleton() {
  return (
    <div className="stat-card stat-card-loading">
      <div className="stat-skeleton" />
      <div className="stat-skeleton stat-skeleton-label" />
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

function HealthCardSkeleton() {
  return (
    <div className="health-card health-card-loading">
      <span className="health-dot skeleton" aria-hidden="true" />
      <div className="health-card-info">
        <div className="skeleton" style={{ height: '14px', width: '120px', marginBottom: '8px' }} />
        <div className="skeleton" style={{ height: '20px', width: '80px' }} />
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="analytics-skeleton-grid">
      <div className="analytics-skeleton-exec">
        <CardSkeleton />
      </div>
      <div className="analytics-skeleton-kpi">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="analytics-skeleton-health">
        <HealthCardSkeleton />
      </div>
      <div className="analytics-skeleton-cards">
        <CardSkeleton />
        <CardSkeleton />
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

export { StatCardSkeleton, AnalyticsSkeleton };
