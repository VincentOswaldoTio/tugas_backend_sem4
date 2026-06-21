import multer from 'multer';

/**
 * Multer error handler middleware
 * Catches multer-specific errors (file size, file type, etc.)
 */
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Ukuran gambar terlalu besar. Maksimal 10 MB.'
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  } else if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};