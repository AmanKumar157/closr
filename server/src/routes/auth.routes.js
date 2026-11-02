import { Router } from 'express';
import { register, login, logout, getMe } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';

const router = Router();

// Apply auth rate limiting specifically to login & register (brute-force defense), NOT to session check (/me)
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, getMe);

export default router;

