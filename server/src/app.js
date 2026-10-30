import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ENV } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ApiError } from './utils/ApiError.js';
import authRoutes from './routes/auth.routes.js';

const app = express();

// Secure HTTP headers with Helmet
app.use(helmet());

// Cross-Origin Resource Sharing with credentials enabled for httpOnly cookies
app.use(
  cors({
    origin: ENV.CLIENT_URL,
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
    message: 'CareerPilot API is running smoothly',
    timestamp: new Date().toISOString()
  });
});

// Feature Routes
app.use('/api/auth', authRoutes);

// Catch-all for undefined routes
app.use('*', (req, res, next) => {
  next(new ApiError(404, `API route '${req.originalUrl}' does not exist.`));
});

// Centralized error handler
app.use(errorHandler);

export default app;
