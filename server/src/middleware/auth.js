import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ENV } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { User } from '../models/User.js';
import { BlacklistedToken } from '../models/BlacklistedToken.js';

export const authMiddleware = asyncHandler(async (req, res, next) => {
  // Extract token strictly from HTTP-only cookie or Bearer Authorization header
  // Note: Query parameter token extraction is prohibited to prevent token leakage in server logs, history, and Referer headers
  let token = req.cookies?.token || req.cookies?.jwt;

  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Authentication required. No token provided.');
  }

  // Check if token has been blacklisted (user logged out) using SHA-256 hash
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const isBlacklisted = await BlacklistedToken.findOne({
    $or: [{ tokenHash }, { token }]
  });
  if (isBlacklisted) {
    throw new ApiError(401, 'Token has been revoked. Please log in again.');
  }

  // Verify JWT signature and expiration
  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      throw new ApiError(401, 'User associated with this token no longer exists.');
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Your session has expired. Please log in again.');
    }
    throw new ApiError(401, 'Invalid authentication token.');
  }
});

