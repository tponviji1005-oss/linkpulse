import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getLinks, bulkDelete, bulkActivate, bulkDeactivate } from '../api/links.js';
import DashboardStats from '../components/DashboardStats.jsx';
import CreateLinkForm from '../components/CreateLinkForm.jsx';
import TopLinks from '../components/TopLinks.jsx';
import LinksTable from '../components/LinksTable.jsx';
import SearchFilter from '../components/SearchFilter.jsx';
import Pagination from '../components/Pagination.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

function Dashboard() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [_bulkLoading, setBulkLoading] = useState(false);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (status) params.status = status;
      if (sort) params.sort = sort;
      const data = await getLinks(params);
      setLinks(data.data || []);
      setPagination(data.pagination || null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, sort]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  useEffect(() => {
    setPage(1);
  }, [search, status, sort]);

  useEffect(() => {
    setSelectedIds([]);
  }, [links]);

  function handleSearchChange(value) {
    setSearch(value);
  }

  function handleStatusChange(value) {
    setStatus(value);
  }

  function handleSortChange(value) {
    setSort(value);
  }

  function handleSelect(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleSelectAll() {
    if (selectedIds.length === links.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(links.map((l) => l.id));
    }
  }

  function handleBulkAction(action) {
    if (selectedIds.length === 0) {
      toast.error('No links selected');
      return;
    }

    const messages = {
      delete: {
        title: 'Delete Links',
        message: `Are you sure you want to delete ${selectedIds.length} link(s)? This action cannot be undone.`,
        confirmLabel: 'Delete',
        danger: true,
        action: async () => {
          setBulkLoading(true);
          try {
            await bulkDelete(selectedIds);
            toast.success(`${selectedIds.length} links deleted`);
            setSelectedIds([]);
            fetchLinks();
          } catch (err) {
            toast.error(err.message);
          } finally {
            setBulkLoading(false);
          }
        },
      },
      activate: {
        title: 'Activate Links',
        message: `Activate ${selectedIds.length} link(s)?`,
        confirmLabel: 'Activate',
        danger: false,
        action: async () => {
          setBulkLoading(true);
          try {
            await bulkActivate(selectedIds);
            toast.success(`${selectedIds.length} links activated`);
            setSelectedIds([]);
            fetchLinks();
          } catch (err) {
            toast.error(err.message);
          } finally {
            setBulkLoading(false);
          }
        },
      },
      deactivate: {
        title: 'Deactivate Links',
        message: `Deactivate ${selectedIds.length} link(s)?`,
        confirmLabel: 'Deactivate',
        danger: false,
        action: async () => {
          setBulkLoading(true);
          try {
            await bulkDeactivate(selectedIds);
            toast.success(`${selectedIds.length} links deactivated`);
            setSelectedIds([]);
            fetchLinks();
          } catch (err) {
            toast.error(err.message);
          } finally {
            setBulkLoading(false);
          }
        },
      },
    };

    setConfirmDialog(messages[action]);
  }

  return (
    <div className="dashboard">
      <DashboardStats />

      <div className="dashboard-row">
        <CreateLinkForm onCreated={fetchLinks} />
        <TopLinks />
      </div>

      <div className="dashboard-links-section">
        <div className="dashboard-links-header">
          <h2 className="dashboard-links-title">Your Links</h2>
          <Link to="/bulk" className="btn btn-sm btn-primary">
            Bulk Management
          </Link>
        </div>

        <SearchFilter
          search={search}
          status={status}
          sort={sort}
          onSearchChange={handleSearchChange}
          onStatusChange={handleStatusChange}
          onSortChange={handleSortChange}
        />

        {selectedIds.length > 0 && (
          <div className="bulk-actions-bar">
            <span className="bulk-selected-count">{selectedIds.length} selected</span>
            <div className="bulk-actions-buttons">
              <button className="btn btn-sm btn-primary" onClick={() => handleBulkAction('activate')}>
                Activate
              </button>
              <button className="btn btn-sm btn-page" onClick={() => handleBulkAction('deactivate')}>
                Deactivate
              </button>
              <button className="btn btn-sm btn-delete" onClick={() => handleBulkAction('delete')}>
                Delete
              </button>
              <button className="btn btn-sm btn-cancel" onClick={() => setSelectedIds([])}>
                Clear
              </button>
            </div>
          </div>
        )}

        <LinksTable
          links={links}
          onRefresh={fetchLinks}
          loading={loading}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
        />

        {pagination && (
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDialog}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message || ''}
        confirmLabel={confirmDialog?.confirmLabel}
        danger={confirmDialog?.danger}
        onConfirm={() => {
          confirmDialog?.action();
          setConfirmDialog(null);
        }}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
}

export default Dashboard;
