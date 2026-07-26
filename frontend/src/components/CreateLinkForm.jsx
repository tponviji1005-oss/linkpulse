import { useState } from 'react';
import toast from 'react-hot-toast';
import { createLink } from '../api/links.js';

function CreateLinkForm({ onCreated }) {
  const [originalUrl, setOriginalUrl] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      await createLink(originalUrl);
      setOriginalUrl('');
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
    </form>
  );
}

export default CreateLinkForm;
