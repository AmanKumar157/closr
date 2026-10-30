import { Profile } from '../models/Profile.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * @desc    Get current user profile
 * @route   GET /api/profile
 * @access  Protected
 */
export const getProfile = asyncHandler(async (req, res) => {
  let profile = await Profile.findOne({ userId: req.user._id });

  // Lazily create profile if not already instantiated
  if (!profile) {
    profile = await Profile.create({
      userId: req.user._id,
      currentSkills: [],
      targetRole: '',
      jobDescription: '',
      preferredLanguage: 'en'
    });
  }

  return new ApiResponse(200, { profile }, 'Profile retrieved successfully').send(res);
});

/**
 * @desc    Update current user profile
 * @route   PUT /api/profile
 * @access  Protected
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { currentSkills, targetRole, jobDescription, preferredLanguage } = req.body;

  // Deduplicate and trim skills array
  const sanitizedSkills = Array.isArray(currentSkills)
    ? [...new Set(currentSkills.map((s) => s.trim()).filter(Boolean))]
    : [];

  const profile = await Profile.findOneAndUpdate(
    { userId: req.user._id },
    {
      $set: {
        currentSkills: sanitizedSkills,
        targetRole: targetRole !== undefined ? targetRole.trim() : '',
        jobDescription: jobDescription !== undefined ? jobDescription.trim() : '',
        preferredLanguage: preferredLanguage || 'en'
      }
    },
    { new: true, upsert: true, runValidators: true }
  );

  return new ApiResponse(200, { profile }, 'Profile updated successfully').send(res);
});
