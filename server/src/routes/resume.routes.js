import { Router } from 'express';
import {
  generateResume,
  getResumePdf,
  getResumes,
  getResumeById,
  updateResume,
  tailorResumeForJob,
  deleteResume
} from '../controllers/resume.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.use(authMiddleware);

router.post('/generate', aiLimiter, generateResume);
router.post('/tailor', aiLimiter, tailorResumeForJob);
router.get('/', getResumes);
router.get('/:id/pdf', getResumePdf);
router.get('/:id', getResumeById);
router.put('/:id', updateResume);
router.delete('/:id', deleteResume);

export default router;

