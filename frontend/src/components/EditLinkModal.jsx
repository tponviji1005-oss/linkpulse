import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { updateLink } from '../api/links.js';

function formatDatetimeLocal(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EditLinkModal({ link, onClose, onSaved }) {
  const [originalUrl, setOriginalUrl] = useState(link.originalUrl);
  const [title, setTitle] = useState(link.title || '');
  const [isActive, setIsActive] = useState(link.isActive);
  const [expiresAt, setExpiresAt] = useState(formatDatetimeLocal(link.expiresAt));
  const [hasExpiry, setHasExpiry] = useState(!!link.expiresAt);
  const [password, setPassword] = useState('');
  const [removePassword, setRemovePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef(null);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        originalUrl,
        title: title || undefined,
        isActive,
        expiresAt: hasExpiry && expiresAt ? expiresAt : null,
      };

      if (removePassword) {
        data.password = '';
      } else if (password) {
        data.password = password;
      }

      await updateLink(link.id, data);
      toast.success('Link updated');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Edit Link</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <label className="modal-label">
            Original URL
            <input
              type="url"
              className="input"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              required
            />
          </label>
          <label className="modal-label">
            Title
            <input
              type="text"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Optional title"
            />
          </label>
          <div className="modal-label">
            <div className="modal-checkbox-row">
              <input
                type="checkbox"
                id="edit-has-expiry"
                checked={hasExpiry}
                onChange={(e) => setHasExpiry(e.target.checked)}
              />
              <label htmlFor="edit-has-expiry">Set expiration</label>
            </div>
            {hasExpiry && (
              <input
                type="datetime-local"
                className="input"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            )}
          </div>
          <div className="modal-label">
            <div className="modal-checkbox-row">
              <input
                type="checkbox"
                id="edit-remove-pw"
                checked={removePassword}
                onChange={(e) => { setRemovePassword(e.target.checked); if (e.target.checked) setPassword(''); }}
                disabled={!link.hasPassword}
              />
              <label htmlFor="edit-remove-pw">Remove password</label>
            </div>
            {!removePassword && (
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={link.hasPassword ? 'Leave blank to keep current' : 'Optional password'}
              />
            )}
          </div>
          <label className="modal-label modal-checkbox">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Active
          </label>
          <div className="modal-actions">
            <button type="button" className="btn btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditLinkModal;
