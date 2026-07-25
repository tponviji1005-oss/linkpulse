import { useState } from 'react';
import { createLink } from '../api/links.js';

function CreateLinkForm({ onCreated }) {
  const [originalUrl, setOriginalUrl] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await createLink(originalUrl, customSlug || undefined);
      setOriginalUrl('');
      setCustomSlug('');
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="create-link-form" onSubmit={handleSubmit}>
      <h2>Create Short Link</h2>
      {error && <div className="error-msg">{error}</div>}
      <div className="form-row">
        <input
          type="url"
          placeholder="https://example.com/long-url"
          value={originalUrl}
          onChange={(e) => setOriginalUrl(e.target.value)}
          required
          className="input"
        />
        <input
          type="text"
          placeholder="Custom slug (optional)"
          value={customSlug}
          onChange={(e) => setCustomSlug(e.target.value)}
          className="input input-slug"
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating...' : 'Create'}
        </button>
      </div>
    </form>
  );
}

export default CreateLinkForm;
