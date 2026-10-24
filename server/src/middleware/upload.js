import multer from 'multer';
import { HttpError } from '../utils/httpError.js';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxMb = Number(process.env.MAX_IMAGE_MB || 8);

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 4, fileSize: maxMb * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!allowedMimeTypes.has(file.mimetype)) return cb(new HttpError(400, 'Use JPG, PNG, or WebP images.'));
    cb(null, true);
  }
}).fields([
  { name: 'images', maxCount: 4 },
  { name: 'images[]', maxCount: 4 },
  { name: 'cropImage', maxCount: 1 },
]);
