export default function DashboardLoading() {
  return <main className="customer-page"><div className="customer-container" aria-label="Memuat dashboard" aria-busy="true">
    <div className="skeleton-heading"><span className="skeleton-line skeleton-kicker" /><span className="skeleton-line skeleton-title" /><span className="skeleton-line skeleton-copy" /></div>
    <div className="skeleton-summary"><span className="skeleton-line skeleton-kicker" /><div className="skeleton-summary-grid"><span /><span /><span /></div></div>
    <div className="skeleton-section"><span className="skeleton-line skeleton-title-small" /><span /><span /><span /></div>
  </div></main>;
}
