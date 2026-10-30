import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/profile.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema } from '../validators/profile.validator.js';

const router = Router();

// Protect all profile routes
router.use(authMiddleware);

router.get('/', getProfile);
router.put('/', validate(updateProfileSchema), updateProfile);

export default router;
