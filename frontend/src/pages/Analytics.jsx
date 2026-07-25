import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getLinkAnalytics } from '../api/links.js';

const CATEGORY_ORDER = {
  browser: ['Chrome', 'Firefox', 'Edge', 'Safari'],
  os: ['Windows', 'macOS', 'Linux', 'Android', 'iOS'],
  device: ['desktop', 'mobile', 'tablet'],
};

function sortBreakdown(obj, order) {
  const entries = Object.entries(obj);
  entries.sort((a, b) => {
    const ai = order.indexOf(a[0]);
    const bi = order.indexOf(b[0]);
    const aVal = ai === -1 ? order.length : ai;
    const bVal = bi === -1 ? order.length : bi;
    if (aVal !== bVal) return aVal - bVal;
    return b[1] - a[1];
  });
  return entries;
}

function BreakdownCard({ title, data, order }) {
  const entries = sortBreakdown(data, order);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);

  if (total === 0) {
    return (
      <div className="analytics-card">
        <h3 className="analytics-card-title">{title}</h3>
        <p className="empty-msg">No data available.</p>
      </div>
    );
  }

  return (
    <div className="analytics-card">
      <h3 className="analytics-card-title">{title}</h3>
      <ul className="breakdown-list">
        {entries.map(([label, count]) => (
          <li key={label} className="breakdown-item">
            <span className="breakdown-label">{label}</span>
            <span className="breakdown-value">{count}</span>
            <span className="breakdown-bar-track">
              <span
                className="breakdown-bar-fill"
                style={{ width: `${(count / total) * 100}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Analytics() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const linkInfo = location.state;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchAnalytics() {
      try {
        setError('');
        const result = await getLinkAnalytics(id);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAnalytics();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="analytics-page">
        <button className="btn btn-back" onClick={() => navigate('/dashboard')}>
          &larr; Back to Dashboard
        </button>
        <div className="analytics-loading">
          {[1, 2, 3].map((i) => (
            <div key={i} className="analytics-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-page">
        <button className="btn btn-back" onClick={() => navigate('/dashboard')}>
          &larr; Back to Dashboard
        </button>
        <div className="error-msg">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const hasClicks = data.totalClicks > 0;

  return (
    <div className="analytics-page">
      <button className="btn btn-back" onClick={() => navigate('/dashboard')}>
        &larr; Back to Dashboard
      </button>

      <div className="analytics-header">
        <div>
          <h1 className="analytics-title">
            {linkInfo?.shortCode ? `/${linkInfo.shortCode}` : 'Link Analytics'}
          </h1>
          {linkInfo?.originalUrl && (
            <p className="analytics-original" title={linkInfo.originalUrl}>
              {linkInfo.originalUrl}
            </p>
          )}
        </div>
        <div className="analytics-total">
          <span className="stat-value">{data.totalClicks}</span>
          <span className="stat-label">Total Clicks</span>
        </div>
      </div>

      {!hasClicks ? (
        <div className="analytics-card">
          <p className="empty-msg">No clicks recorded yet. Share your link to start collecting data.</p>
        </div>
      ) : (
        <div className="analytics-grid">
          <BreakdownCard
            title="Browser Breakdown"
            data={data.browserBreakdown}
            order={CATEGORY_ORDER.browser}
          />
          <BreakdownCard
            title="Operating System Breakdown"
            data={data.osBreakdown}
            order={CATEGORY_ORDER.os}
          />
          <BreakdownCard
            title="Device Breakdown"
            data={data.deviceBreakdown}
            order={CATEGORY_ORDER.device}
          />
        </div>
      )}
    </div>
  );
}

export default Analytics;
