function errorHandler(err, req, res, next) {
  console.error('[SpendWise Error Handler]:', err.stack || err.message || err);

  const statusCode = err.statusCode || res.statusCode >= 400 ? res.statusCode : 500;
  const message = err.message || 'Internal Server Error';

  if (req.originalUrl.startsWith('/api/')) {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
    });
  }

  res.status(statusCode).render('error', {
    pageTitle: 'Error | SpendWise',
    statusCode,
    message,
    currentUser: res.locals.currentUser || null
  });
}

module.exports = { errorHandler };
