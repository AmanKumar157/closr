import { Router } from 'express';
import {
  generateRoadmapController,
  getRoadmaps,
  getRoadmapById,
  updateMilestoneCompletion,
  resolveWeekResources,
  swapMilestoneResource,
  updateResourceStatus,
  addCustomMilestone,
  updateCustomMilestone,
  deleteCustomMilestone,
  deleteRoadmap
} from '../controllers/roadmap.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.use(authMiddleware);

// Generate 12-week roadmap (AI rate limited)
router.post('/generate', aiLimiter, generateRoadmapController);

// Roadmap queries
router.get('/', getRoadmaps);
router.get('/:id', getRoadmapById);
router.delete('/:id', deleteRoadmap);

// Milestone completion status
router.patch('/:id/milestone', updateMilestoneCompletion);

// Resource operations
router.post('/:id/resources/resolve', resolveWeekResources);
router.post('/:id/resources/swap', aiLimiter, swapMilestoneResource);
router.patch('/:id/resources/status', updateResourceStatus);

// Custom milestone / step customization (Feature: User Plan Customization)
router.post('/:id/weeks/:weekNumber/milestones', addCustomMilestone);
router.put('/:id/weeks/:weekNumber/milestones/:milestoneIndex', updateCustomMilestone);
router.delete('/:id/weeks/:weekNumber/milestones/:milestoneIndex', deleteCustomMilestone);

export default router;

