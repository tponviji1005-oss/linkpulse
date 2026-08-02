import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { deleteLink } from '../api/links.js';
import EditLinkModal from './EditLinkModal.jsx';
import QRCodeModal from './QRCodeModal.jsx';
import { healthMeta } from '../utils/health.js';

function StatusBadges({ link }) {
  const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
  const badges = [];

  if (link.isFlagged) {
    badges.push(<span key="flag" className="badge badge-flagged">&#9888; Flagged</span>);
  }
  if (link.hasPassword) {
    badges.push(<span key="pw" className="badge badge-protected">&#128274; Protected</span>);
  }
  if (link.expiresAt) {
    if (isExpired) {
      badges.push(<span key="exp" className="badge badge-expired">&#9200; Expired</span>);
    } else {
      badges.push(<span key="exp" className="badge badge-expiring">&#9200; Expiring</span>);
    }
  }

  return badges.length > 0 ? <span className="badge-group">{badges}</span> : null;
}

function LinksTable({ links, onRefresh, loading, selectedIds, onSelect, onSelectAll }) {
  const [editingLink, setEditingLink] = useState(null);
  const [qrLink, setQrLink] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();

  async function handleDelete(link) {
    const confirmed = window.confirm('Are you sure you want to delete this link?');
    if (!confirmed) return;

    setDeletingId(link.id);
    try {
      await deleteLink(link.id);
      toast.success('Link deleted');
      onRefresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="table-skeleton">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="table-skeleton-row">
            <div className="skeleton" style={{ width: '20%' }} />
            <div className="skeleton" style={{ width: '35%' }} />
            <div className="skeleton" style={{ width: '10%' }} />
            <div className="skeleton" style={{ width: '15%' }} />
            <div className="skeleton" style={{ width: '20%' }} />
          </div>
        ))}
      </div>
    );
  }

  if (!links.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">&#128279;</div>
        <h3>No links found</h3>
        <p>Create your first short link above, or adjust your filters.</p>
      </div>
    );
  }

  const allSelected = selectedIds && selectedIds.length === links.length && links.length > 0;
  const someSelected = selectedIds && selectedIds.length > 0 && selectedIds.length < links.length;

  return (
    <div className="links-table-wrap">
      <table className="links-table">
        <thead>
          <tr>
            {selectedIds !== undefined && (
              <th className="links-table-th-check">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={onSelectAll}
                  aria-label="Select all links"
                />
              </th>
            )}
            <th>Short URL</th>
            <th>Original URL</th>
            <th>Clicks</th>
            <th>Health</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {links.map((link) => (
            <tr key={link.id} className={selectedIds?.includes(link.id) ? 'row-selected' : ''}>
              {selectedIds !== undefined && (
                <td className="links-table-td-check">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(link.id)}
                    onChange={() => onSelect(link.id)}
                    aria-label={`Select link ${link.shortCode}`}
                  />
                </td>
              )}
              <td>
                <a
                  href={`${window.location.protocol}//${window.location.hostname}:5000/${link.shortCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="short-link"
                  aria-label={`Open short link /${link.shortCode} in new tab`}
                >
                  /{link.shortCode}
                </a>
                <StatusBadges link={link} />
              </td>
              <td className="original-url" title={link.originalUrl}>
                {link.originalUrl}
              </td>
              <td>{link._count?.clicks ?? link.clickCount ?? 0}</td>
              <td>
                {link.healthScore !== undefined ? (
                  <span className="health-cell">
                    <span className="health-emoji">{healthMeta(link.healthLabel).emoji}</span>
                    <span className="health-cell-score">{link.healthScore}</span>
                  </span>
                ) : (
                  <span className="health-cell-muted">&mdash;</span>
                )}
              </td>
              <td>{new Date(link.createdAt).toLocaleDateString()}</td>
              <td className="actions-cell">
                <button
                  className="btn btn-sm btn-qr"
                  onClick={() => setQrLink(link)}
                  disabled={deletingId === link.id}
                  aria-label={`Show QR code for /${link.shortCode}`}
                >
                  QR
                </button>
                <button
                  className="btn btn-sm btn-analytics"
                  onClick={() => navigate(`/analytics/${link.id}`, { state: link })}
                  disabled={deletingId === link.id}
                  aria-label={`View analytics for /${link.shortCode}`}
                >
                  Analytics
                </button>
                <button
                  className="btn btn-sm btn-edit"
                  onClick={() => setEditingLink(link)}
                  disabled={deletingId === link.id}
                  aria-label={`Edit /${link.shortCode}`}
                >
                  Edit
                </button>
                <button
                  className="btn btn-sm btn-delete"
                  onClick={() => handleDelete(link)}
                  disabled={deletingId === link.id}
                  aria-label={`Delete /${link.shortCode}`}
                >
                  {deletingId === link.id ? '...' : 'Delete'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editingLink && (
        <EditLinkModal
          link={editingLink}
          onClose={() => setEditingLink(null)}
          onSaved={onRefresh}
        />
      )}

      {qrLink && (
        <QRCodeModal
          link={qrLink}
          onClose={() => setQrLink(null)}
        />
      )}
    </div>
  );
}

export default LinksTable;
