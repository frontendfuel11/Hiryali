import multer from 'multer';
import mongoose from 'mongoose';

export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 8 MB or smaller.' : err.message;
    return res.status(400).json({ message });
  }
  if (err instanceof mongoose.Error.ValidationError) return res.status(400).json({ message: err.message });
  if (err?.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: status >= 500 ? 'Something went wrong. Please try again.' : err.message });
}
