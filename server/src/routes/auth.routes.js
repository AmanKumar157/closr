import { Router } from 'express';
import { register, login, logout, getMe } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';

const router = Router();

// Apply auth rate limiting to all auth endpoints
router.use(authLimiter);

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, getMe);

export default router;

