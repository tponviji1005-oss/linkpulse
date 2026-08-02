function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);

  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="pagination" role="navigation" aria-label="Pagination">
      <button
        className="btn btn-sm btn-page"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
      >
        Prev
      </button>
      {start > 1 && (
        <>
          <button className="btn btn-sm btn-page" onClick={() => onPageChange(1)} aria-label="Go to page 1">1</button>
          {start > 2 && <span className="pagination-ellipsis">...</span>}
        </>
      )}
      {pages.map((p) => (
        <button
          key={p}
          className={`btn btn-sm btn-page ${p === page ? 'btn-page-active' : ''}`}
          onClick={() => onPageChange(p)}
          aria-label={`Go to page ${p}`}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="pagination-ellipsis">...</span>}
          <button className="btn btn-sm btn-page" onClick={() => onPageChange(totalPages)} aria-label={`Go to page ${totalPages}`}>{totalPages}</button>
        </>
      )}
      <button
        className="btn btn-sm btn-page"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
      >
        Next
      </button>
    </div>
  );
}

export default Pagination;
