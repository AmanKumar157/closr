import { ApiError } from '../utils/ApiError.js';
import { ENV } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Handle standard errors not instantiated via ApiError
  if (!(error instanceof ApiError)) {
    // Mongoose duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0] || 'field';
      error = new ApiError(409, `An entry with this ${field} already exists.`, [{ field, message: `${field} already exists` }]);
    }
    // Mongoose validation error
    else if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors || {}).map((e) => ({
        field: e.path,
        message: e.message
      }));
      error = new ApiError(400, 'Database validation error', errors);
    }
    // Mongoose bad ObjectId / CastError
    else if (err.name === 'CastError') {
      error = new ApiError(400, `Resource not found with id of ${err.value}`);
    }
    // Generic fallback error
    else {
      const statusCode = err.statusCode || 500;
      const message = err.message || 'Internal Server Error';
      error = new ApiError(statusCode, message, [], err.stack);
    }
  }

  const response = {
    success: false,
    message: error.message,
    errors: error.errors || [],
    ...(ENV.NODE_ENV === 'development' ? { stack: error.stack } : {})
  };

  return res.status(error.statusCode || 500).json(response);
};

