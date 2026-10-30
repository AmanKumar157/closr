import mongoose from 'mongoose';
import { Roadmap } from '../models/Roadmap.js';
import { Analysis } from '../models/Analysis.js';
import { Profile } from '../models/Profile.js';
import { generateRoadmap, swapResource } from '../services/gemini.service.js';
import { resolveResource } from '../services/resource.service.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * @desc    Generate a 12-week roadmap based on skill gap analysis
 * @route   POST /api/roadmap/generate
 * @access  Protected
 */
export const generateRoadmapController = asyncHandler(async (req, res) => {
  const { analysisId, remainingGapsOnly = false } = req.body;

  if (!analysisId) {
    throw new ApiError(400, 'Analysis ID is required to generate a roadmap.');
  }

  const analysis = await Analysis.findOne({
    _id: analysisId,
    userId: req.user._id
  });

  if (!analysis) {
    throw new ApiError(404, 'Analysis report not found.');
  }

  // Fetch user profile for preferredLanguage
  const profile = await Profile.findOne({ userId: req.user._id });
  const preferences = {
    preferredLanguage: profile?.preferredLanguage || 'en'
  };

  // Generate 12-week roadmap with AI
  const roadmapData = await generateRoadmap(analysis, preferences, remainingGapsOnly);

  // Automatically resolve resources for Week 1 immediately so user sees live resources
  if (roadmapData.weeks && roadmapData.weeks[0]) {
    for (const milestone of roadmapData.weeks[0].milestones) {
      if (milestone.resource) {
        milestone.resource.resolved = await resolveResource(milestone.resource);
      }
    }
  }

  // Save new Roadmap
  const roadmap = await Roadmap.create({
    userId: req.user._id,
    analysisId: analysis._id,
    targetRole: analysis.targetRole,
    weeks: roadmapData.weeks
  });

  // Link roadmapId back to Analysis
  analysis.roadmapId = roadmap._id;
  await analysis.save();

  return new ApiResponse(201, { roadmap }, '12-week roadmap generated successfully').send(res);
});

/**
 * @desc    Get all roadmaps for user
 * @route   GET /api/roadmap
 * @access  Protected
 */
export const getRoadmaps = asyncHandler(async (req, res) => {
  const roadmaps = await Roadmap.find({ userId: req.user._id }).sort({ createdAt: -1 });
  return new ApiResponse(200, { roadmaps }, 'Roadmaps fetched successfully').send(res);
});

/**
 * @desc    Get a specific roadmap by ID
 * @route   GET /api/roadmap/:id
 * @access  Protected
 */
export const getRoadmapById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'Invalid roadmap ID format.');
  }

  const roadmap = await Roadmap.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!roadmap) {
    throw new ApiError(404, 'Roadmap not found.');
  }

  return new ApiResponse(200, { roadmap }, 'Roadmap retrieved').send(res);
});

/**
 * @desc    Update milestone completion status
 * @route   PATCH /api/roadmap/:id/milestone
 * @access  Protected
 */
export const updateMilestoneCompletion = asyncHandler(async (req, res) => {
  const { weekNumber, milestoneIndex, completed } = req.body;

  const roadmap = await Roadmap.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!roadmap) {
    throw new ApiError(404, 'Roadmap not found.');
  }

  const week = roadmap.weeks.find((w) => w.weekNumber === Number(weekNumber));
  if (!week || !week.milestones[milestoneIndex]) {
    throw new ApiError(400, 'Invalid week number or milestone index.');
  }

  week.milestones[milestoneIndex].completed = Boolean(completed);
  week.milestones[milestoneIndex].completedAt = completed ? new Date() : null;

  await roadmap.save();

  return new ApiResponse(
    200,
    { milestone: week.milestones[milestoneIndex] },
    'Milestone updated successfully'
  ).send(res);
});

/**
 * @desc    Lazily resolve verified links for a specific week's resources
 * @route   POST /api/roadmap/:id/resources/resolve
 * @access  Protected
 */
export const resolveWeekResources = asyncHandler(async (req, res) => {
  const { weekNumber } = req.body;

  const roadmap = await Roadmap.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!roadmap) {
    throw new ApiError(404, 'Roadmap not found.');
  }

  const week = roadmap.weeks.find((w) => w.weekNumber === Number(weekNumber));
  if (!week) {
    throw new ApiError(400, `Week ${weekNumber} not found in roadmap.`);
  }

  // Resolve all milestones in this week that don't have resolved URLs yet
  for (const milestone of week.milestones) {
    if (milestone.resource && (!milestone.resource.resolved || !milestone.resource.resolved.url)) {
      milestone.resource.resolved = await resolveResource(milestone.resource);
    }
  }

  await roadmap.save();

  return new ApiResponse(200, { week }, `Resources for week ${weekNumber} resolved`).send(res);
});

/**
 * @desc    Swap a milestone resource with an alternative
 * @route   POST /api/roadmap/:id/resources/swap
 * @access  Protected
 */
export const swapMilestoneResource = asyncHandler(async (req, res) => {
  const { weekNumber, milestoneIndex } = req.body;

  const roadmap = await Roadmap.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!roadmap) {
    throw new ApiError(404, 'Roadmap not found.');
  }

  const week = roadmap.weeks.find((w) => w.weekNumber === Number(weekNumber));
  if (!week || !week.milestones[milestoneIndex]) {
    throw new ApiError(400, 'Invalid week or milestone index.');
  }

  const milestone = week.milestones[milestoneIndex];
  const oldResource = milestone.resource;

  // Ask AI for alternative resource
  const newResourceMeta = await swapResource(milestone, oldResource);

  // Resolve real link for the new resource
  const resolved = await resolveResource(newResourceMeta);

  milestone.resource = {
    ...newResourceMeta,
    status: 'not_started',
    resolved
  };

  await roadmap.save();

  return new ApiResponse(200, { resource: milestone.resource }, 'Resource swapped successfully').send(res);
});

/**
 * @desc    Update resource learning status (not_started, viewed, done)
 * @route   PATCH /api/roadmap/:id/resources/status
 * @access  Protected
 */
export const updateResourceStatus = asyncHandler(async (req, res) => {
  const { weekNumber, milestoneIndex, status } = req.body;

  if (!['not_started', 'viewed', 'done'].includes(status)) {
    throw new ApiError(400, "Status must be 'not_started', 'viewed', or 'done'.");
  }

  const roadmap = await Roadmap.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!roadmap) {
    throw new ApiError(404, 'Roadmap not found.');
  }

  const week = roadmap.weeks.find((w) => w.weekNumber === Number(weekNumber));
  if (!week || !week.milestones[milestoneIndex]) {
    throw new ApiError(400, 'Invalid week or milestone index.');
  }

  week.milestones[milestoneIndex].resource.status = status;
  // If resource marked done, also check milestone completion
  if (status === 'done' && !week.milestones[milestoneIndex].completed) {
    week.milestones[milestoneIndex].completed = true;
    week.milestones[milestoneIndex].completedAt = new Date();
  }

  await roadmap.save();

  return new ApiResponse(200, { milestone: week.milestones[milestoneIndex] }, 'Resource status updated').send(res);
});

