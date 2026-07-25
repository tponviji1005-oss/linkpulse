import { useState, useEffect, useCallback } from 'react';
import { getLinks } from '../api/links.js';
import DashboardStats from '../components/DashboardStats.jsx';
import CreateLinkForm from '../components/CreateLinkForm.jsx';
import TopLinks from '../components/TopLinks.jsx';
import LinksTable from '../components/LinksTable.jsx';

function Dashboard() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLinks = useCallback(async () => {
    try {
      setError('');
      const data = await getLinks();
      setLinks(Array.isArray(data) ? data : data.links || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  return (
    <div className="dashboard">
      <DashboardStats />

      <div className="dashboard-row">
        <CreateLinkForm onCreated={fetchLinks} />
        <TopLinks />
      </div>

      {error && <div className="error-msg">{error}</div>}

      {loading ? (
        <p className="empty-msg">Loading links...</p>
      ) : (
        <LinksTable links={links} onRefresh={fetchLinks} />
      )}
    </div>
  );
}

export default Dashboard;
