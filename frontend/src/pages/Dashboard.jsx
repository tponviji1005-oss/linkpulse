import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getLinks } from '../api/links.js';
import DashboardStats from '../components/DashboardStats.jsx';
import CreateLinkForm from '../components/CreateLinkForm.jsx';
import TopLinks from '../components/TopLinks.jsx';
import LinksTable from '../components/LinksTable.jsx';

function Dashboard() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLinks = useCallback(async () => {
    try {
      const data = await getLinks();
      setLinks(Array.isArray(data) ? data : data.links || []);
    } catch (err) {
      toast.error(err.message);
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

      {loading ? (
        <p className="empty-msg">Loading links...</p>
      ) : (
        <LinksTable links={links} onRefresh={fetchLinks} />
      )}
    </div>
  );
}

export default Dashboard;
