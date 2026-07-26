import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getDashboard } from '../api/links.js';

function DashboardStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      try {
        const data = await getDashboard();
        if (!cancelled) setStats(data);
      } catch (err) {
        toast.error(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStats();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="stats-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stat-card stat-card-loading">
            <div className="stat-skeleton" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: 'Total Links', value: stats.totalLinks },
    { label: 'Total Clicks', value: stats.totalClicks },
    { label: 'Active Links', value: stats.activeLinks },
    { label: 'Inactive Links', value: stats.inactiveLinks },
  ];

  return (
    <div className="stats-grid">
      {cards.map((card) => (
        <div key={card.label} className="stat-card">
          <span className="stat-value">{card.value}</span>
          <span className="stat-label">{card.label}</span>
        </div>
      ))}
    </div>
  );
}

export default DashboardStats;
