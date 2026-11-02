import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ENV } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ApiError } from './utils/ApiError.js';
import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import analysisRoutes from './routes/analysis.routes.js';
import roadmapRoutes from './routes/roadmap.routes.js';
import progressRoutes from './routes/progress.routes.js';
import resumeRoutes from './routes/resume.routes.js';

const app = express();

// Secure HTTP headers with Helmet - allow embedding PDFs in iframes from trusted client
app.use(
  helmet({
    frameguard: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false
  })
);

// Cross-Origin Resource Sharing with credentials enabled for httpOnly cookies
const allowedOrigins = [
  ENV.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173'
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || (ENV.NODE_ENV === 'development' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))) {
        return callback(null, true);
      }
      return callback(new ApiError(403, `CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Body parsers and cookie parser
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'closr API is running smoothly',
    timestamp: new Date().toISOString()
  });
});

// Feature Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/resume', resumeRoutes);

// Catch-all for undefined routes
app.use('*', (req, res, next) => {
  next(new ApiError(404, `API route '${req.originalUrl}' does not exist.`));
});

// Centralized error handler
app.use(errorHandler);

export default app;

