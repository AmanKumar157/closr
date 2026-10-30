import multer from 'multer';
import path from 'path';
import { ApiError } from '../utils/ApiError.js';

// Multer memory storage - files are kept as Buffers in memory and NEVER written to disk
const storage = multer.memoryStorage();

// Allowed MIME types and corresponding extensions for resume uploads
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword'
]);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.doc']);

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;

  const isExtensionValid = ALLOWED_EXTENSIONS.has(ext);
  const isMimeValid = ALLOWED_MIME_TYPES.has(mime);

  if (isExtensionValid && isMimeValid) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Invalid file type '${ext}'. Only PDF and DOCX files up to 5MB are accepted.`
      ),
      false
    );
  }
};

// 5 MB limit
export const uploadResume = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 Megabytes
  },
  fileFilter
}).single('resume');

/**
 * Express wrapper for multer to catch and format upload errors cleanly
 */
export const handleUpload = (req, res, next) => {
  uploadResume(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ApiError(400, 'File size exceeds 5MB limit. Please upload a smaller resume.'));
      }
      return next(new ApiError(400, `Upload error: ${err.message}`));
    } else if (err) {
      return next(err);
    }
    next();
  });
};

