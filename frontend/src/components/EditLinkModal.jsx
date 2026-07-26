import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { updateLink } from '../api/links.js';

function EditLinkModal({ link, onClose, onSaved }) {
  const [originalUrl, setOriginalUrl] = useState(link.originalUrl);
  const [title, setTitle] = useState(link.title || '');
  const [isActive, setIsActive] = useState(link.isActive);
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
      await updateLink(link.id, {
        originalUrl,
        title: title || undefined,
        isActive,
      });
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
