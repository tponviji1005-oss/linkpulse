const errorHandler = (err, req, res, next) => {
  console.error(err.stack || err.message);

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request payload too large' });
  }

  if (err.message === 'Only CSV files are allowed') {
    return res.status(400).json({ error: err.message });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum size is 5MB' });
  }

  const statusCode = err.statusCode || 500;

  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error';

  res.status(statusCode).json({ error: message });
};

module.exports = errorHandler;
