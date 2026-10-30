import { Router } from 'express';
import { getProgressSummary, getScoreHistory } from '../controllers/progress.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/summary', getProgressSummary);
router.get('/score-history', getScoreHistory);

export default router;
