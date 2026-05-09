import multer from 'multer';
import { config } from '../config.js';

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.uploads.maxBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image uploads are accepted'));
      return;
    }
    cb(null, true);
  },
});
