const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');
const { BadRequestError } = require('./errorResponse');

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter to allow only certain file types
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new BadRequestError('Only image, PDF, and document files are allowed'));
  }
};

// Initialize multer with configuration
const upload = multer({
  storage: storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_UPLOAD) || 5 * 1024 * 1024 }, // 5MB default
  fileFilter: fileFilter,
});

// Middleware for handling single file upload
const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new BadRequestError('File size is too large. Maximum size is 5MB'));
        }
        return next(err);
      }
      next();
    });
  };
};

// Middleware for handling multiple file uploads
const uploadMultiple = (fieldName, maxCount = 5) => {
  return (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new BadRequestError('One or more files exceed the size limit of 5MB'));
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(new BadRequestError(`Maximum ${maxCount} files are allowed`));
        }
        return next(err);
      }
      next();
    });
  };
};

// Middleware for handling multiple fields with files
const uploadFields = (fields) => {
  return (req, res, next) => {
    upload.fields(fields)(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new BadRequestError('One or more files exceed the size limit'));
        }
        return next(err);
      }
      next();
    });
  };
};

// Helper to generate a unique filename
const generateUniqueFilename = (originalname) => {
  const ext = path.extname(originalname);
  return `${uuidv4()}${ext}`;
};

// Helper to get file extension
const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};

// Helper to validate file type
const isValidFileType = (filename, allowedTypes) => {
  const ext = getFileExtension(filename);
  return allowedTypes.includes(ext);
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  generateUniqueFilename,
  getFileExtension,
  isValidFileType,
};
