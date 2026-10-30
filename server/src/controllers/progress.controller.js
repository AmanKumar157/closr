import { Roadmap } from '../models/Roadmap.js';
import { Analysis } from '../models/Analysis.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * @desc    Get overall learning progress summary
 * @route   GET /api/progress/summary
 * @access  Protected
 */
export const getProgressSummary = asyncHandler(async (req, res) => {
  // Find latest active roadmap
  const roadmap = await Roadmap.findOne({ userId: req.user._id }).sort({ createdAt: -1 });

  if (!roadmap) {
    return new ApiResponse(
      200,
      {
        hasRoadmap: false,
        overallPercentage: 0,
        totalMilestones: 0,
        completedMilestones: 0,
        currentWeek: 1,
        activeRoadmapId: null
      },
      'No active roadmap found'
    ).send(res);
  }

  let totalMilestones = 0;
  let completedMilestones = 0;
  let currentWeek = 1;
  let foundIncompleteWeek = false;

  for (const week of roadmap.weeks) {
    const weekTotal = week.milestones.length;
    const weekCompleted = week.milestones.filter((m) => m.completed).length;

    totalMilestones += weekTotal;
    completedMilestones += weekCompleted;

    if (!foundIncompleteWeek && weekCompleted < weekTotal) {
      currentWeek = week.weekNumber;
      foundIncompleteWeek = true;
    }
  }

  // If all completed, set current week to 12
  if (!foundIncompleteWeek && totalMilestones > 0) {
    currentWeek = 12;
  }

  const overallPercentage = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  return new ApiResponse(
    200,
    {
      hasRoadmap: true,
      activeRoadmapId: roadmap._id,
      targetRole: roadmap.targetRole,
      overallPercentage,
      totalMilestones,
      completedMilestones,
      currentWeek
    },
    'Progress summary fetched'
  ).send(res);
});

/**
 * @desc    Get score improvement history across analyses
 * @route   GET /api/progress/score-history?roadmapId=
 * @access  Protected
 */
export const getScoreHistory = asyncHandler(async (req, res) => {
  const { roadmapId } = req.query;

  const query = { userId: req.user._id };
  if (roadmapId) {
    query.roadmapId = roadmapId;
  }

  const analyses = await Analysis.find(query).sort({ createdAt: 1 });

  const scoreHistory = analyses.map((a) => ({
    analysisId: a._id,
    date: a.createdAt,
    matchScore: a.matchScore,
    missingSkillsCount: a.missingSkills?.length || 0,
    targetRole: a.targetRole
  }));

  return new ApiResponse(200, { scoreHistory }, 'Score progression history retrieved').send(res);
});

