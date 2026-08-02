import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { updateLink, updateGeoRules, updateDeviceRules, updateABVariants } from '../api/links.js';

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
  const [maxClicks, setMaxClicks] = useState(link.maxClicks ?? '');
  const [hasMaxClicks, setHasMaxClicks] = useState(link.maxClicks != null);
  const [password, setPassword] = useState('');
  const [removePassword, setRemovePassword] = useState(false);
  const [geoRules, setGeoRules] = useState(
    (link.geoRules || []).map((r) => ({ countryCode: r.countryCode || '', destinationUrl: r.destinationUrl || '' })),
  );
  const [deviceRules, setDeviceRules] = useState(
    (link.deviceRules || []).map((r) => ({ deviceType: r.deviceType || 'mobile', destinationUrl: r.destinationUrl || '' })),
  );
  const [abVariants, setABVariants] = useState(
    (link.abVariants || []).map((v) => ({ label: v.label || '', destinationUrl: v.destinationUrl || '', weight: v.weight ?? '' })),
  );
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef(null);

  const initialGeoRules = (link.geoRules || [])
    .map((r) => `${r.countryCode || ''}:${r.destinationUrl || ''}`)
    .sort()
    .join('|');

  const initialDeviceRules = (link.deviceRules || [])
    .map((r) => `${r.deviceType || ''}:${r.destinationUrl || ''}`)
    .sort()
    .join('|');

  const initialABVariants = (link.abVariants || [])
    .map((v) => `${v.label || ''}:${v.destinationUrl || ''}:${v.weight ?? ''}`)
    .sort()
    .join('|');

  const abWeightTotal = abVariants.reduce((sum, v) => sum + (Number(v.weight) || 0), 0);
  const hasABVariants = abVariants.some((v) => v.destinationUrl.trim() || v.weight !== '');
  const abTotalValid = !hasABVariants || abWeightTotal === 100;

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

  function addGeoRule() {
    setGeoRules([...geoRules, { countryCode: '', destinationUrl: '' }]);
  }

  function removeGeoRule(idx) {
    setGeoRules(geoRules.filter((_, i) => i !== idx));
  }

  function updateGeoRule(idx, field, value) {
    setGeoRules(geoRules.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  function addDeviceRule() {
    setDeviceRules([...deviceRules, { deviceType: 'mobile', destinationUrl: '' }]);
  }

  function removeDeviceRule(idx) {
    setDeviceRules(deviceRules.filter((_, i) => i !== idx));
  }

  function updateDeviceRule(idx, field, value) {
    setDeviceRules(deviceRules.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  function addABVariant() {
    setABVariants([...abVariants, { label: '', destinationUrl: '', weight: '' }]);
  }

  function removeABVariant(idx) {
    setABVariants(abVariants.filter((_, i) => i !== idx));
  }

  function updateABVariant(idx, field, value) {
    setABVariants(abVariants.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const validRules = geoRules.filter((r) => r.countryCode.trim() && r.destinationUrl.trim());

      if (validRules.some((r) => !/^[A-Za-z]{2}$/.test(r.countryCode.trim()))) {
        throw new Error('Country codes must be exactly 2 letters (e.g. US, IN)');
      }

      const currentGeoRules = validRules
        .map((r) => `${r.countryCode.trim().toUpperCase()}:${r.destinationUrl.trim()}`)
        .sort()
        .join('|');

      const validDeviceRules = deviceRules.filter((r) => r.deviceType && r.destinationUrl.trim());
      const currentDeviceRules = validDeviceRules
        .map((r) => `${r.deviceType}:${r.destinationUrl.trim()}`)
        .sort()
        .join('|');

      const validABVariants = abVariants.filter((v) => v.destinationUrl.trim() || v.weight !== '' || v.label.trim());
      if (validABVariants.length > 0) {
        if (validABVariants.length < 2) {
          throw new Error('A/B testing requires at least 2 variants');
        }
        const sum = validABVariants.reduce((s, v) => s + Number(v.weight), 0);
        if (validABVariants.some((v) => !Number.isInteger(Number(v.weight)) || Number(v.weight) <= 0)) {
          throw new Error('Each variant weight must be a positive whole number');
        }
        if (sum !== 100) {
          throw new Error(`Variant weights must sum to 100 (currently ${sum})`);
        }
      }
      const currentABVariants = validABVariants
        .map((v) => `${v.label.trim()}:${v.destinationUrl.trim()}:${Number(v.weight)}`)
        .sort()
        .join('|');

      const data = {
        originalUrl,
        title: title || undefined,
        isActive,
        expiresAt: hasExpiry && expiresAt ? expiresAt : null,
        maxClicks: hasMaxClicks && maxClicks ? Number(maxClicks) : null,
      };

      if (removePassword) {
        data.password = '';
      } else if (password) {
        data.password = password;
      }

      if (currentGeoRules !== initialGeoRules) {
        await updateGeoRules(
          link.id,
          validRules.map((r) => ({
            countryCode: r.countryCode.trim().toUpperCase(),
            destinationUrl: r.destinationUrl.trim(),
          })),
        );
      }

      if (currentDeviceRules !== initialDeviceRules) {
        await updateDeviceRules(
          link.id,
          validDeviceRules.map((r) => ({
            deviceType: r.deviceType,
            destinationUrl: r.destinationUrl.trim(),
          })),
        );
      }

      if (currentABVariants !== initialABVariants) {
        await updateABVariants(
          link.id,
          validABVariants.map((v) => ({
            label: v.label.trim() || undefined,
            destinationUrl: v.destinationUrl.trim(),
            weight: Number(v.weight),
          })),
        );
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
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-link-modal-title"
      >
        <div className="modal-header">
          <h2 id="edit-link-modal-title">Edit Link</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close dialog">&times;</button>
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
                id="edit-has-max-clicks"
                checked={hasMaxClicks}
                onChange={(e) => setHasMaxClicks(e.target.checked)}
              />
              <label htmlFor="edit-has-max-clicks">Set click limit</label>
            </div>
            {hasMaxClicks && (
              <input
                type="number"
                min="1"
                className="input"
                placeholder="Unlimited"
                value={maxClicks}
                onChange={(e) => setMaxClicks(e.target.value)}
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
          <div className="modal-label">
            <div className="modal-checkbox-row">
              <label htmlFor="edit-remove-pw">Geo redirects (optional)</label>
            </div>
            {geoRules.map((rule, idx) => (
              <div key={idx} className="geo-rule-row">
                <input
                  type="text"
                  className="input geo-rule-code"
                  maxLength="2"
                  placeholder="US"
                  value={rule.countryCode}
                  onChange={(e) => updateGeoRule(idx, 'countryCode', e.target.value.toUpperCase())}
                  aria-label={`Geo rule ${idx + 1} country code`}
                />
                <input
                  type="url"
                  className="input"
                  placeholder="https://destination.example"
                  value={rule.destinationUrl}
                  onChange={(e) => updateGeoRule(idx, 'destinationUrl', e.target.value)}
                  aria-label={`Geo rule ${idx + 1} destination URL`}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-delete"
                  onClick={() => removeGeoRule(idx)}
                  aria-label={`Remove geo rule ${idx + 1}`}
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-sm" onClick={addGeoRule}>
              + Add rule
            </button>
            <p className="modal-hint">
              Visitors matching a country code are sent to its destination URL. Others use the default URL.
            </p>
          </div>
          <div className="modal-label">
            <div className="modal-checkbox-row">
              <label>Device redirects (optional)</label>
            </div>
            {deviceRules.map((rule, idx) => (
              <div key={idx} className="geo-rule-row">
                <select
                  className="input geo-rule-code"
                  value={rule.deviceType}
                  onChange={(e) => updateDeviceRule(idx, 'deviceType', e.target.value)}
                  aria-label={`Device rule ${idx + 1} device type`}
                >
                  <option value="mobile">mobile</option>
                  <option value="desktop">desktop</option>
                  <option value="tablet">tablet</option>
                </select>
                <input
                  type="url"
                  className="input"
                  placeholder="https://destination.example"
                  value={rule.destinationUrl}
                  onChange={(e) => updateDeviceRule(idx, 'destinationUrl', e.target.value)}
                  aria-label={`Device rule ${idx + 1} destination URL`}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-delete"
                  onClick={() => removeDeviceRule(idx)}
                  aria-label={`Remove device rule ${idx + 1}`}
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-sm" onClick={addDeviceRule}>
              + Add rule
            </button>
            <p className="modal-hint">
              Visitors on a matching device type are sent to its destination URL. Geo rules take priority when both match.
            </p>
          </div>
          <div className="modal-label">
            <div className="modal-checkbox-row">
              <label>A/B testing (optional)</label>
            </div>
            {abVariants.map((variant, idx) => (
              <div key={idx} className="geo-rule-row">
                <input
                  type="text"
                  className="input geo-rule-code"
                  placeholder="Label"
                  value={variant.label}
                  onChange={(e) => updateABVariant(idx, 'label', e.target.value)}
                  aria-label={`Variant ${idx + 1} label`}
                />
                <input
                  type="url"
                  className="input"
                  placeholder="https://destination.example"
                  value={variant.destinationUrl}
                  onChange={(e) => updateABVariant(idx, 'destinationUrl', e.target.value)}
                  aria-label={`Variant ${idx + 1} destination URL`}
                />
                <input
                  type="number"
                  className="input geo-rule-code"
                  min="1"
                  max="100"
                  placeholder="%"
                  value={variant.weight}
                  onChange={(e) => updateABVariant(idx, 'weight', e.target.value)}
                  aria-label={`Variant ${idx + 1} weight percentage`}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-delete"
                  onClick={() => removeABVariant(idx)}
                  aria-label={`Remove variant ${idx + 1}`}
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-sm" onClick={addABVariant}>
              + Add variant
            </button>
            <p className="modal-hint">
              Visitors are split by weight and stay on the same variant. Geo and device rules take priority.
            </p>
            {hasABVariants && (
              <p className={`modal-hint ${abTotalValid ? '' : 'ab-total-invalid'}`}>
                Running total: {abWeightTotal}% {abTotalValid ? '' : '(must sum to 100)'}
              </p>
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
            <button type="submit" className="btn btn-primary" disabled={loading || !abTotalValid}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditLinkModal;
