import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { BlacklistedToken } from '../models/BlacklistedToken.js';
import { ENV } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Helper to generate JWT token for a user
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name
    },
    ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN }
  );
};

/**
 * Standard cookie options for JWT token
 */
const getCookieOptions = () => ({
  httpOnly: true,
  secure: ENV.NODE_ENV === 'production',
  sameSite: ENV.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
});

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, 'An account with this email address already exists.');
  }

  // Hash password with 12 salt rounds (>= 10 as per security guidelines)
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create new user
  const user = await User.create({
    name,
    email,
    passwordHash
  });

  const token = generateToken(user);
  res.cookie('token', token, getCookieOptions());

  return new ApiResponse(
    201,
    {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || '',
        createdAt: user.createdAt
      },
      token
    },
    'Account registered successfully'
  ).send(res);
});

/**
 * @desc    Log in an existing user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Retrieve user including passwordHash for comparison
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const token = generateToken(user);
  res.cookie('token', token, getCookieOptions());

  return new ApiResponse(
    200,
    {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || '',
        createdAt: user.createdAt
      },
      token
    },
    'Logged in successfully'
  ).send(res);
});

/**
 * @desc    Log out current user & blacklist JWT token
 * @route   POST /api/auth/logout
 * @access  Protected
 */
export const logout = asyncHandler(async (req, res) => {
  const token = req.token;

  if (token) {
    try {
      // Decode token to get exact expiration time for TTL index
      const decoded = jwt.decode(token);
      const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Save token in blacklist collection
      await BlacklistedToken.create({
        token,
        expiresAt
      });
    } catch (err) {
      console.error('[Logout] Failed to blacklist token:', err.message);
    }
  }

  // Clear httpOnly cookie
  res.clearCookie('token', {
    httpOnly: true,
    secure: ENV.NODE_ENV === 'production',
    sameSite: ENV.NODE_ENV === 'production' ? 'none' : 'lax'
  });

  return new ApiResponse(200, null, 'Logged out successfully').send(res);
});

/**
 * @desc    Get currently logged in user info
 * @route   GET /api/auth/me
 * @access  Protected
 */
export const getMe = asyncHandler(async (req, res) => {
  return new ApiResponse(200, { user: req.user }, 'Current user profile fetched').send(res);
});

