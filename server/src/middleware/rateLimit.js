import rateLimit from 'express-rate-limit';

// Strict rate limit for auth endpoints to prevent brute force
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 auth requests per window
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    data: null
  },
  standardHeaders: true,
  legacyHeaders: false
});

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please slow down.',
    data: null
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Per-user rate limiter for AI-intensive routes (Resume Analysis, Roadmap Generation)
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // 25 AI calls per 15 minutes per user
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: {
    success: false,
    message: 'AI request limit reached. Please wait a few minutes before running another analysis.',
    data: null
  },
  standardHeaders: true,
  legacyHeaders: false
});

