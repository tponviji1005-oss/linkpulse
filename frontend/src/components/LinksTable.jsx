function LinksTable({ links }) {
  if (!links.length) {
    return <p className="empty-msg">No links yet. Create your first short link above.</p>;
  }

  return (
    <div className="links-table-wrap">
      <table className="links-table">
        <thead>
          <tr>
            <th>Short URL</th>
            <th>Original URL</th>
            <th>Clicks</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {links.map((link) => (
            <tr key={link.id}>
              <td>
                <a
                  href={`http://localhost:5000/${link.shortCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="short-link"
                >
                  /{link.shortCode}
                </a>
              </td>
              <td className="original-url" title={link.originalUrl}>
                {link.originalUrl}
              </td>
              <td>{link._count?.clicks ?? link.clickCount ?? 0}</td>
              <td>{new Date(link.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default LinksTable;
