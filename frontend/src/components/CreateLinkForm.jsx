import { useState } from 'react';
import toast from 'react-hot-toast';
import { createLink } from '../api/links.js';

function CreateLinkForm({ onCreated }) {
  const [originalUrl, setOriginalUrl] = useState('');
  const [password, setPassword] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      await createLink(originalUrl, {
        password: password || undefined,
        expiresAt: expiresAt || undefined,
      });
      setOriginalUrl('');
      setPassword('');
      setExpiresAt('');
      setShowOptions(false);
      toast.success('Link created');
      onCreated();
    } catch (err) {
      toast.error(err.message);
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
            Expiration
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
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
