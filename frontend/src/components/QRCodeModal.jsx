import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { getLinkQRCode } from '../api/links.js';

function QRCodeModal({ link, onClose }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const overlayRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;

    async function fetchQR() {
      try {
        const blob = await getLinkQRCode(link.id);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      } catch (err) {
        if (!cancelled) setError(err.message);
        toast.error(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchQR();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [link.id]);

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

  function handleDownload() {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `qr-${link.shortCode}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handleCopyUrl() {
    const shortUrl = `${window.location.protocol}//${window.location.hostname}:5000/${link.shortCode}`;
    navigator.clipboard.writeText(shortUrl).then(
      () => toast.success('Short URL copied'),
      () => toast.error('Failed to copy'),
    );
  }

  const shortUrl = `${window.location.protocol}//${window.location.hostname}:5000/${link.shortCode}`;

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>QR Code</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="qr-modal-body">
          <p className="qr-short-url">{shortUrl}</p>

          {loading && (
            <div className="qr-preview qr-loading">
              <div className="qr-skeleton" />
            </div>
          )}

          {error && (
            <div className="qr-preview">
              <div className="error-msg">{error}</div>
            </div>
          )}

          {imageUrl && (
            <div className="qr-preview">
              <img src={imageUrl} alt={`QR code for /${link.shortCode}`} className="qr-image" />
            </div>
          )}

          <div className="qr-actions">
            <button
              className="btn btn-primary"
              onClick={handleDownload}
              disabled={loading || !!error}
            >
              Download PNG
            </button>
            <button
              className="btn btn-outline qr-copy-btn"
              onClick={handleCopyUrl}
            >
              Copy Short URL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QRCodeModal;
