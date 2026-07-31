import { useState } from 'react';
import toast from 'react-hot-toast';
import { createLink } from '../api/links.js';

function CreateLinkForm({ onCreated }) {
  const [originalUrl, setOriginalUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [aliasError, setAliasError] = useState('');
  const [password, setPassword] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [maxClicks, setMaxClicks] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setAliasError('');

    try {
      await createLink(originalUrl, {
        customAlias: customAlias.trim() || undefined,
        password: password || undefined,
        expiresAt: expiresAt || undefined,
        maxClicks: maxClicks ? Number(maxClicks) : undefined,
      });
      setOriginalUrl('');
      setCustomAlias('');
      setPassword('');
      setExpiresAt('');
      setMaxClicks('');
      setShowOptions(false);
      toast.success('Link created');
      onCreated();
    } catch (err) {
      if (err.status === 409 || /alias/i.test(err.message)) {
        setAliasError(err.message);
      } else {
        toast.error(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="create-link-form" onSubmit={handleSubmit}>
      <h2>Create Short Link</h2>
      <div className="form-row">
        <input
          type="url"
          placeholder="https://example.com/long-url"
          value={originalUrl}
          onChange={(e) => setOriginalUrl(e.target.value)}
          required
          className="input"
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating...' : 'Create'}
        </button>
      </div>
      <button
        type="button"
        className="btn btn-sm btn-options-toggle"
        onClick={() => setShowOptions(!showOptions)}
      >
        {showOptions ? 'Hide options' : 'Protection options'}
      </button>
      {showOptions && (
        <div className="form-options">
          <label className="form-option-label">
            Custom alias (optional)
            <input
              type="text"
              placeholder="e.g. my-summer-sale"
              value={customAlias}
              onChange={(e) => {
                setCustomAlias(e.target.value);
                setAliasError('');
              }}
              className="input"
            />
            {aliasError && <span className="form-field-error">{aliasError}</span>}
            <span className="form-field-hint">
              3-20 characters, letters, numbers, hyphens, underscores only
            </span>
          </label>
          <label className="form-option-label">
            Expiration
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="input"
            />
          </label>
          <label className="form-option-label">
            Maximum Clicks (optional)
            <input
              type="number"
              min="1"
              placeholder="Unlimited"
              value={maxClicks}
              onChange={(e) => setMaxClicks(e.target.value)}
              className="input"
            />
          </label>
          <label className="form-option-label">
            Password
            <input
              type="password"
              placeholder="Optional password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </label>
        </div>
      )}
    </form>
  );
}

export default CreateLinkForm;
