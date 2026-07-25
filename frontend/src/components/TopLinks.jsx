import { useState, useEffect } from 'react';
import { getTopLinks } from '../api/links.js';

function TopLinks() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchTopLinks() {
      try {
        setError('');
        const data = await getTopLinks();
        if (!cancelled) setLinks(data.topLinks || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTopLinks();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="top-links-card">
        <h2 className="top-links-title">Top Performing Links</h2>
        <div className="top-links-loading">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="top-links-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="top-links-card">
        <h2 className="top-links-title">Top Performing Links</h2>
        <div className="error-msg">{error}</div>
      </div>
    );
  }

  return (
    <div className="top-links-card">
      <h2 className="top-links-title">Top Performing Links</h2>
      {links.length === 0 ? (
        <p className="empty-msg">No links yet. Create your first short link to see stats here.</p>
      ) : (
        <ul className="top-links-list">
          {links.map((link) => (
            <li key={link.id} className="top-links-item">
              <div className="top-links-info">
                <a
                  href={`http://localhost:5000/${link.shortCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="short-link"
                >
                  /{link.shortCode}
                </a>
                <span className="top-links-original" title={link.originalUrl}>
                  {link.originalUrl}
                </span>
              </div>
              <span className="top-links-clicks">{link.clickCount}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TopLinks;
