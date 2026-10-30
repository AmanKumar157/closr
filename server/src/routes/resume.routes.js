import { Router } from 'express';
import {
  generateResume,
  getResumePdf,
  getResumes,
  getResumeById
} from '../controllers/resume.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.use(authMiddleware);

router.post('/generate', aiLimiter, generateResume);
router.get('/', getResumes);
router.get('/:id/pdf', getResumePdf);
router.get('/:id', getResumeById);

export default router;
