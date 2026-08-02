import { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { csvUpload, exportCSV, bulkCreateLinks } from '../api/links.js';

function BulkManagement() {
  const [mode, setMode] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [bulkText, setBulkText] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      setUploading(true);
      setResult(null);
      setUploadProgress('Uploading file...');
      csvUpload(file)
        .then((data) => {
          setResult(data);
          if (data.totalFailed > 0) {
            toast.success(`Imported ${data.totalCreated} links, ${data.totalFailed} failed`);
          } else {
            toast.success(`Successfully imported ${data.totalCreated} links`);
          }
        })
        .catch((err) => {
          toast.error(err.message);
        })
        .finally(() => {
          setUploading(false);
          setUploadProgress('');
        });
    } else {
      toast.error('Please upload a CSV file');
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  async function handleFileUpload(file) {
    setUploading(true);
    setResult(null);
    setUploadProgress('Uploading file...');

    try {
      setUploadProgress('Processing CSV...');
      const data = await csvUpload(file);
      setResult(data);
      if (data.totalFailed > 0) {
        toast.success(`Imported ${data.totalCreated} links, ${data.totalFailed} failed`);
      } else {
        toast.success(`Successfully imported ${data.totalCreated} links`);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
    e.target.value = '';
  }

  async function handleBulkCreate() {
    const urls = bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (urls.length === 0) {
      toast.error('Please enter at least one URL');
      return;
    }

    if (urls.length > 50) {
      toast.error('Maximum 50 URLs per bulk create');
      return;
    }

    const links = urls.map((url) => ({ originalUrl: url }));

    setUploading(true);
    setResult(null);

    try {
      const data = await bulkCreateLinks(links);
      setResult(data);
      if (data.totalFailed > 0) {
        toast.success(`Created ${data.totalCreated} links, ${data.totalFailed} failed`);
      } else {
        toast.success(`Successfully created ${data.totalCreated} links`);
      }
      setBulkText('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleExport() {
    try {
      const blob = await exportCSV();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'linkpulse-export.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('CSV exported successfully');
    } catch (err) {
      toast.error(err.message);
    }
  }

  function downloadFailedCSV() {
    if (!result || !result.failed || result.failed.length === 0) return;
    const rows = result.failed.map((f) => `Row ${f.row},"${f.originalUrl}","${f.error}"`);
    const csv = 'Row,URL,Error\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'linkpulse-failed.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bulk-page">
      <div className="bulk-header">
        <div>
          <h1 className="bulk-title">Bulk Management</h1>
          <p className="bulk-subtitle">Import, create, and export links in bulk</p>
        </div>
        <Link to="/dashboard" className="btn btn-page">&larr; Back to Dashboard</Link>
      </div>

      <div className="bulk-actions-grid">
        <button
          className={`bulk-action-card ${mode === 'csv' ? 'bulk-action-active' : ''}`}
          onClick={() => { setMode('csv'); setResult(null); }}
        >
          <div className="bulk-action-icon">&#128206;</div>
          <h3>CSV Upload</h3>
          <p>Upload a CSV file with URLs to create multiple links at once</p>
        </button>
        <button
          className={`bulk-action-card ${mode === 'text' ? 'bulk-action-active' : ''}`}
          onClick={() => { setMode('text'); setResult(null); }}
        >
          <div className="bulk-action-icon">&#128221;</div>
          <h3>Bulk Create</h3>
          <p>Paste multiple URLs, one per line, to create short links</p>
        </button>
        <button className="bulk-action-card" onClick={handleExport}>
          <div className="bulk-action-icon">&#128190;</div>
          <h3>Export CSV</h3>
          <p>Download all your links as a CSV file for backup or analysis</p>
        </button>
      </div>

      {mode === 'csv' && (
        <div className="bulk-section">
          <h2 className="bulk-section-title">Upload CSV File</h2>
          <p className="bulk-section-desc">
            CSV must have a column named <code>url</code>, <code>originalUrl</code>, or <code>original_url</code>.
            Optional columns: <code>title</code>, <code>password</code>, <code>expiresAt</code>.
          </p>
          <div
            className={`csv-dropzone ${dragOver ? 'csv-dropzone-active' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Upload CSV file. Drag and drop or press Enter to browse."
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            {uploading ? (
              <div className="csv-dropzone-loading">
                <div className="spinner" />
                <p>{uploadProgress}</p>
              </div>
            ) : (
              <>
                <div className="csv-dropzone-icon">&#128228;</div>
                <p className="csv-dropzone-text">Drag and drop a CSV file here, or click to browse</p>
                <p className="csv-dropzone-hint">Maximum 100 rows, 5MB file size limit</p>
              </>
            )}
          </div>
        </div>
      )}

      {mode === 'text' && (
        <div className="bulk-section">
          <h2 className="bulk-section-title">Bulk Create from Text</h2>
          <p className="bulk-section-desc">Enter one URL per line. Maximum 50 URLs at a time.</p>
          <textarea
            className="input bulk-textarea"
            placeholder={'https://example.com/page-1\nhttps://example.com/page-2\nhttps://example.com/page-3'}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={8}
            disabled={uploading}
          />
          <div className="bulk-text-actions">
            <span className="bulk-text-count">
              {bulkText.split('\n').filter((l) => l.trim()).length} URLs
            </span>
            <button
              className="btn btn-primary"
              onClick={handleBulkCreate}
              disabled={uploading || !bulkText.trim()}
            >
              {uploading ? 'Creating...' : 'Create Links'}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="bulk-section bulk-result">
          <h2 className="bulk-section-title">Results</h2>
          <div className="bulk-result-summary">
            <div className="bulk-result-stat bulk-result-success">
              <span className="bulk-result-number">{result.totalCreated}</span>
              <span className="bulk-result-label">Created</span>
            </div>
            <div className="bulk-result-stat bulk-result-fail">
              <span className="bulk-result-number">{result.totalFailed}</span>
              <span className="bulk-result-label">Failed</span>
            </div>
          </div>

          {result.created && result.created.length > 0 && (
            <div className="bulk-result-table-wrap">
              <h3 className="bulk-result-subtitle">Created Links</h3>
              <table className="links-table bulk-result-table">
                <thead>
                  <tr>
                    <th>Short Code</th>
                    <th>Original URL</th>
                    <th>Title</th>
                  </tr>
                </thead>
                <tbody>
                  {result.created.map((link) => (
                    <tr key={link.id}>
                      <td><span className="short-link">/{link.shortCode}</span></td>
                      <td className="original-url" title={link.originalUrl}>{link.originalUrl}</td>
                      <td>{link.title || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.failed && result.failed.length > 0 && (
            <div className="bulk-result-table-wrap">
              <div className="bulk-result-subtitle-row">
                <h3 className="bulk-result-subtitle">Failed Rows</h3>
                <button className="btn btn-sm btn-edit" onClick={downloadFailedCSV}>
                  Download Failed CSV
                </button>
              </div>
              <table className="links-table bulk-result-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>URL</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {result.failed.map((f, i) => (
                    <tr key={i}>
                      <td>{f.row}</td>
                      <td className="original-url" title={f.originalUrl}>{f.originalUrl}</td>
                      <td className="bulk-error-text">{f.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BulkManagement;
