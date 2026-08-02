function SearchFilter({ search, status, sort, onSearchChange, onStatusChange, onSortChange }) {
  return (
    <div className="search-filter">
      <div className="search-filter-row">
        <div className="search-input-wrap">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by URL, short code, or title..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="input search-input"
            aria-label="Search links"
          />
          {search && (
            <button className="search-clear" onClick={() => onSearchChange('')} type="button" aria-label="Clear search">
              &times;
            </button>
          )}
        </div>
        <div className="filter-group">
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="input filter-select"
            aria-label="Filter by status"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="protected">Protected</option>
            <option value="public">Public</option>
            <option value="expired">Expired</option>
          </select>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className="input filter-select"
            aria-label="Sort links"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="most_clicked">Most Clicked</option>
            <option value="least_clicked">Least Clicked</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default SearchFilter;
