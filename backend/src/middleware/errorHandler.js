export function errorHandler(err, req, res, _next) {
  console.error('Error:', err);

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
    });
  }

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Duplicate entry', field: err.meta?.target });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Resource not found' });
  }

  // Default
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
}