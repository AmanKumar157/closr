import { Router } from 'express';
import {
  createAnalysis,
  getAnalyses,
  getAnalysisById,
  compareAnalyses
} from '../controllers/analysis.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { handleUpload } from '../middleware/upload.js';
import { aiLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Protect all analysis routes
router.use(authMiddleware);

// Create new analysis (multipart with resume file) - rate limited per user
router.post('/', aiLimiter, handleUpload, createAnalysis);

// Get list of analyses for user
router.get('/', getAnalyses);

// Compare two analyses
router.get('/compare', compareAnalyses);

// Get analysis details by ID
router.get('/:id', getAnalysisById);

export default router;

