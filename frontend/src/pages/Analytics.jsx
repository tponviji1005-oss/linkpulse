import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getAdvancedAnalytics } from '../api/links.js';
import { AnalyticsSkeleton } from '../components/Skeleton.jsx';
import { healthMeta } from '../utils/health.js';
import { getPredictionColor } from '../utils/prediction.js';
import { getPriorityColor } from '../utils/dashboardSummary.js';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'all', label: 'All Time' },
];

const CHART_COLORS = [
  '#4361ee', '#7209b7', '#f72585', '#4cc9f0', '#4895ef',
  '#560bad', '#b5179e', '#3a0ca3', '#4361ee', '#4cc9f0',
  '#06d6a0', '#ffd166', '#ef476f', '#118ab2', '#073b4c',
];

function KPICard({ label, value }) {
  return (
    <div className="stat-card">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function ChartCard({ title, children, className }) {
  return (
    <div className={`analytics-card ${className || ''}`}>
      <h3 className="analytics-card-title">{title}</h3>
      {children}
    </div>
  );
}

function BreakdownList({ data }) {
  const entries = useMemo(() => Object.entries(data), [data]);
  const total = useMemo(() => entries.reduce((sum, [, v]) => sum + v, 0), [entries]);

  if (total === 0) {
    return <p className="empty-msg">No data available.</p>;
  }

  return (
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
  );
}

function HourlyHeatmap({ data }) {
  const maxClicks = useMemo(() => Math.max(...data.map((d) => d.clicks), 1), [data]);

  return (
    <div className="hourly-heatmap" role="img" aria-label="Hourly click distribution">
      {data.map((d) => {
        const intensity = d.clicks / maxClicks;
        return (
          <div key={d.hour} className="heatmap-cell" title={`${d.hour}:00 - ${d.clicks} clicks`}>
            <div
              className="heatmap-fill"
              style={{
                backgroundColor: `rgba(67, 97, 238, ${Math.max(intensity * 0.9, 0.05)})`,
              }}
            />
            <span className="heatmap-label">{d.hour}</span>
          </div>
        );
      })}
    </div>
  );
}

function PieChartBreakdown({ data }) {
  const entries = useMemo(() => Object.entries(data), [data]);
  const total = useMemo(() => entries.reduce((sum, [, v]) => sum + v, 0), [entries]);
  const chartData = useMemo(
    () => entries.map(([name, value]) => ({ name, value })),
    [entries],
  );

  if (total === 0) {
    return <p className="empty-msg">No data available.</p>;
  }

  return (
    <div className="pie-chart-container">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [`${value} clicks`, name]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
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
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('all');

  const fetchAnalytics = useCallback(async (p) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAdvancedAnalytics(id, p);
      setData(result);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAnalytics(period);
  }, [period, fetchAnalytics]);

  function handlePeriodChange(newPeriod) {
    setPeriod(newPeriod);
  }

  if (loading && !data) {
    return (
      <div className="analytics-page">
        <button className="btn btn-back" onClick={() => navigate('/dashboard')} aria-label="Back to Dashboard">
          &larr; Back to Dashboard
        </button>
        <AnalyticsSkeleton />
      </div>
    );
  }

  if (!data && error) {
    return (
      <div className="analytics-page">
        <button className="btn btn-back" onClick={() => navigate('/dashboard')} aria-label="Back to Dashboard">
          &larr; Back to Dashboard
        </button>
        <div className="analytics-card">
          <div className="empty-state">
            <div className="empty-state-icon">&#9888;</div>
            <h3>Could not load analytics</h3>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={() => fetchAnalytics(period)}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="analytics-page">
      <button className="btn btn-back" onClick={() => navigate('/dashboard')} aria-label="Back to Dashboard">
        &larr; Back to Dashboard
      </button>

      <div className="analytics-header">
        <div>
          <h1 className="analytics-title">
            {data.link?.shortCode ? `/${data.link.shortCode}` : linkInfo?.shortCode ? `/${linkInfo.shortCode}` : 'Link Analytics'}
          </h1>
          {data.link?.originalUrl && (
            <p className="analytics-original" title={data.link.originalUrl}>
              {data.link.originalUrl}
            </p>
          )}
        </div>
        <div className="period-selector">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              className={`btn btn-sm ${period === p.value ? 'btn-primary' : 'btn-page'}`}
              onClick={() => handlePeriodChange(p.value)}
              disabled={loading}
              aria-pressed={period === p.value}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="loading-overlay" role="status" aria-live="polite">
          <span className="spinner" />
        </div>
      )}

      {data.link?.isFlagged && (
        <div className="analytics-warning" role="alert">
          <span className="analytics-warning-icon">&#9888;</span>
          Suspicious traffic detected
        </div>
      )}

      {data.dashboardSummary && (
        <div className="analytics-card executive-card">
          <h3 className="analytics-card-title">&#129302; AI Executive Summary</h3>
          <h4 className="executive-title">{data.dashboardSummary.title}</h4>
          <p className="executive-overview">{data.dashboardSummary.overview}</p>
          <div className="executive-priority">
            <span className="executive-priority-label">Priority</span>
            <span className={`executive-priority-badge priority-${getPriorityColor(data.dashboardSummary.priority)}`}>
              {data.dashboardSummary.priority}
            </span>
          </div>
          <ul className="executive-highlights">
            {data.dashboardSummary.highlights.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="analytics-kpi-grid">
        <KPICard label="Total Clicks" value={data.totalClicks} />
        <KPICard label="Unique Visitors" value={data.uniqueClicks} />
        <KPICard label="Real Clicks" value={data.realClicks} />
        <KPICard label="Bot Clicks" value={data.botClicks} />
      </div>

      {data.healthScore !== undefined && (
        <div className="health-card">
          <span className={`health-dot ${healthMeta(data.healthLabel).className}`} aria-hidden="true" />
          <div className="health-card-info">
            <span className="health-card-title">Health Score</span>
            <span className="health-card-score">{data.healthScore} / 100</span>
            <span className="health-card-sub">{data.healthLabel}</span>
          </div>
        </div>
      )}

      {data.summary && (
        <div className="analytics-card recommendations-card">
          <h3 className="analytics-card-title">AI Recommendations</h3>
          <p className="ai-summary">{data.summary}</p>
          <ul className="recommendation-list">
            {data.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {data.prediction && (
        <div className="analytics-card prediction-card">
          <h3 className="analytics-card-title">&#128200; Performance Prediction</h3>
          <div className="prediction-grid">
            <div className="prediction-metric">
              <span className="prediction-label">Predicted Next 7 Days</span>
              <span className="prediction-value">{data.prediction.predictedClicks}</span>
              <span className="prediction-unit">Clicks</span>
            </div>
            <div className="prediction-metric">
              <span className="prediction-label">Trend</span>
              <span className={`prediction-trend ${getPredictionColor(data.prediction.trend)}`}>
                {data.prediction.trend}
              </span>
            </div>
            <div className="prediction-metric">
              <span className="prediction-label">Confidence</span>
              <span className="prediction-value">{data.prediction.confidence}%</span>
            </div>
          </div>
          <p className="prediction-message">{data.prediction.message}</p>
        </div>
      )}

      {data.trafficInsights && (
        <div className="analytics-card traffic-card">
          <h3 className="analytics-card-title">&#127758; Smart Traffic Insights</h3>
          <div className="traffic-grid">
            <div className="traffic-item">
              <span className="traffic-label">Best Hour</span>
              <span className="traffic-value">{data.trafficInsights.bestHour || '\u2014'}</span>
            </div>
            <div className="traffic-item">
              <span className="traffic-label">Best Day</span>
              <span className="traffic-value">{data.trafficInsights.bestDay || '\u2014'}</span>
            </div>
            <div className="traffic-item">
              <span className="traffic-label">Best Device</span>
              <span className="traffic-value">{data.trafficInsights.bestDevice || '\u2014'}</span>
            </div>
            <div className="traffic-item">
              <span className="traffic-label">Best Browser</span>
              <span className="traffic-value">{data.trafficInsights.bestBrowser || '\u2014'}</span>
            </div>
            <div className="traffic-item">
              <span className="traffic-label">Best Country</span>
              <span className="traffic-value">{data.trafficInsights.bestCountry || '\u2014'}</span>
            </div>
            <div className="traffic-item">
              <span className="traffic-label">Best Referrer</span>
              <span className="traffic-value">{data.trafficInsights.bestReferrer || '\u2014'}</span>
            </div>
          </div>
          <p className="traffic-message">{data.trafficInsights.insight}</p>
        </div>
      )}

      {data.optimization && (
        <div className="analytics-card optimization-card">
          <h3 className="analytics-card-title">&#9881; Link Optimization</h3>
          <div className="optimization-score-row">
            <span className="optimization-score">{data.optimization.optimizationScore}</span>
            <span className="optimization-label">{data.optimization.optimizationLabel}</span>
          </div>
          <ul className="optimization-list">
            {data.optimization.improvements.map((item, i) => (
              <li key={i}>&#10003; {item}</li>
            ))}
          </ul>
        </div>
      )}

      {data.totalClicks === 0 ? (
        <div className="analytics-card">
          <div className="empty-state">
            <div className="empty-state-icon">&#128200;</div>
            <h3>No clicks yet</h3>
            <p>Share your link to start collecting analytics data.</p>
          </div>
        </div>
      ) : (
        <>
          <ChartCard title="Click Trend" className="analytics-chart-full">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="clicks" stroke="#4361ee" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Weekly Trend" className="analytics-chart-full">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="clicks" fill="#4361ee" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Monthly Trend" className="analytics-chart-full">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="clicks" fill="#7209b7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Hourly Distribution" className="analytics-chart-full">
            <HourlyHeatmap data={data.hourlyDistribution} />
          </ChartCard>

          <div className="analytics-grid-3">
            <ChartCard title="Browser Breakdown">
              <PieChartBreakdown data={data.browserBreakdown} />
            </ChartCard>
            <ChartCard title="Operating System">
              <PieChartBreakdown data={data.osBreakdown} />
            </ChartCard>
            <ChartCard title="Device Breakdown">
              <PieChartBreakdown data={data.deviceBreakdown} />
            </ChartCard>
          </div>

          <div className="analytics-grid-2">
            <ChartCard title="Top Referrers">
              <BreakdownList data={data.referrerBreakdown} />
            </ChartCard>
            <ChartCard title="Top Countries">
              <BreakdownList data={data.countryBreakdown} />
            </ChartCard>
          </div>

          <div className="analytics-comparison-grid">
            <ChartCard title="Bot vs Real">
              <div className="comparison-bars">
                <div className="comparison-row">
                  <span className="comparison-label">Real</span>
                  <div className="comparison-track">
                    <div
                      className="comparison-fill comparison-fill-human"
                      style={{ width: data.totalClicks ? `${(data.humanClicks / data.totalClicks) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="comparison-value">{data.humanClicks}</span>
                </div>
                <div className="comparison-row">
                  <span className="comparison-label">Bot</span>
                  <div className="comparison-track">
                    <div
                      className="comparison-fill comparison-fill-bot"
                      style={{ width: data.totalClicks ? `${(data.botClicks / data.totalClicks) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="comparison-value">{data.botClicks}</span>
                </div>
              </div>
            </ChartCard>
            <ChartCard title="Protected vs Public">
              <div className="comparison-bars">
                <div className="comparison-row">
                  <span className="comparison-label">Public</span>
                  <div className="comparison-track">
                    <div
                      className="comparison-fill comparison-fill-public"
                      style={{ width: data.totalClicks ? `${(data.publicClicks / data.totalClicks) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="comparison-value">{data.publicClicks}</span>
                </div>
                <div className="comparison-row">
                  <span className="comparison-label">Protected</span>
                  <div className="comparison-track">
                    <div
                      className="comparison-fill comparison-fill-protected"
                      style={{ width: data.totalClicks ? `${(data.protectedClicks / data.totalClicks) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="comparison-value">{data.protectedClicks}</span>
                </div>
              </div>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}

export default Analytics;
