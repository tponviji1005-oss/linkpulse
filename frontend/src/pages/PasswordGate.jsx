import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getLinks, verifyPassword } from '../api/links.js';

function PasswordGate() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const shortCode = searchParams.get('shortCode') || '';

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkInfo, setLinkInfo] = useState(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchLinkInfo() {
      try {
        const data = await getLinks();
        const links = Array.isArray(data) ? data : data.links || [];
        const found = links.find((l) => l.id === id);
        if (!cancelled && found) setLinkInfo(found);
      } catch {
        // Not logged in or link not found — continue anyway
      } finally {
        if (!cancelled) setFetching(false);
      }
    }

    fetchLinkInfo();
    return () => { cancelled = true; };
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await verifyPassword(id, password);
      toast.success('Access granted');
      window.location.href = result.redirectUrl;
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div className="gate-page">
        <div className="gate-card">
          <div className="gate-loading">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="gate-page">
      <div className="gate-card">
        <div className="gate-icon">&#128274;</div>
        <h2>This link is password-protected</h2>
        {shortCode && (
          <p className="gate-shortcode">/{shortCode}</p>
        )}
        {linkInfo && (
          <p className="gate-original" title={linkInfo.originalUrl}>
            {linkInfo.originalUrl}
          </p>
        )}
        <form onSubmit={handleSubmit} className="gate-form">
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input"
            autoFocus
          />
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Verifying...' : 'Continue'}
          </button>
        </form>
        <button
          className="btn btn-back gate-back"
          onClick={() => navigate('/login')}
        >
          &larr; Back to Login
        </button>
      </div>
    </div>
  );
}

export default PasswordGate;
