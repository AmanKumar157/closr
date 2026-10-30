import { Analysis } from '../models/Analysis.js';
import { Profile } from '../models/Profile.js';
import { extractResumeText } from '../services/parser.service.js';
import { analyzeResume } from '../services/gemini.service.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * @desc    Upload resume and perform AI gap analysis
 * @route   POST /api/analysis
 * @access  Protected
 */
export const createAnalysis = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Please upload a resume file (PDF or DOCX).');
  }

  // 1. Extract and clean resume text
  const resumeText = await extractResumeText(
    req.file.buffer,
    req.file.originalname,
    req.file.mimetype
  );

  // 2. Resolve target role and job description
  let { targetRole, jobDescription, previousAnalysisId, roadmapId } = req.body;

  // Retrieve user profile to check defaults and prefill condition
  const profile = await Profile.findOne({ userId: req.user._id });
  if (!targetRole && profile?.targetRole) {
    targetRole = profile.targetRole;
  }
  if (!jobDescription && profile?.jobDescription) {
    jobDescription = profile.jobDescription;
  }

  if (!targetRole || !targetRole.trim()) {
    throw new ApiError(400, 'Target role is required to evaluate skill gaps.');
  }

  // 3. Run Gemini AI Resume Gap Analysis
  const aiResult = await analyzeResume(resumeText, targetRole.trim(), jobDescription?.trim() || '');

  const fileName = req.file.originalname || 'Uploaded_Resume.pdf';
  const fileSize = req.file.size || 0;
  const fileBuffer = req.file.buffer;
  const fileContentType = req.file.mimetype || 'application/pdf';

  // Check if an identical analysis already exists for this user (avoid duplicate uploads)
  const existingAnalysis = await Analysis.findOne({
    userId: req.user._id,
    cacheHash: aiResult.cacheHash
  });

  if (existingAnalysis) {
    // Refresh with latest file buffer and name without creating a duplicate record
    existingAnalysis.fileName = fileName;
    existingAnalysis.fileSize = fileSize;
    if (fileBuffer) {
      existingAnalysis.fileBuffer = fileBuffer;
      existingAnalysis.fileContentType = fileContentType;
      existingAnalysis.hasOriginalPdf = true;
    }
    await existingAnalysis.save();

    if (profile) {
      profile.lastUploadedResume = {
        fileName,
        fileSize,
        uploadedAt: new Date(),
        analysisId: existingAnalysis._id
      };
      await profile.save();
    }

    return new ApiResponse(
      200,
      { analysis: existingAnalysis, isCached: true, isDuplicate: true },
      `Existing analysis found for "${fileName}". Reused to avoid duplicate upload.`
    ).send(res);
  }

  // 4. Save analysis document to MongoDB
  const analysis = await Analysis.create({
    userId: req.user._id,
    fileName,
    fileSize,
    fileBuffer,
    fileContentType,
    hasOriginalPdf: Boolean(fileBuffer && fileBuffer.length > 0),
    resumeText,
    targetRole: targetRole.trim(),
    jobDescription: jobDescription?.trim() || '',
    matchScore: aiResult.matchScore,
    extractedSkills: aiResult.extractedSkills,
    matchedSkills: aiResult.matchedSkills,
    missingSkills: aiResult.missingSkills,
    weakSections: aiResult.weakSections,
    suggestions: aiResult.suggestions,
    previousAnalysisId: previousAnalysisId || null,
    roadmapId: roadmapId || null,
    cacheHash: aiResult.cacheHash
  });

  // 5. Update user profile with latest uploaded resume & auto-prefill empty skills
  if (profile) {
    profile.lastUploadedResume = {
      fileName,
      fileSize,
      uploadedAt: new Date(),
      analysisId: analysis._id
    };

    if (!profile.currentSkills || profile.currentSkills.length === 0) {
      if (aiResult.extractedSkills && aiResult.extractedSkills.length > 0) {
        profile.currentSkills = aiResult.extractedSkills;
        if (!profile.targetRole) {
          profile.targetRole = targetRole.trim();
        }
        console.log(`[Profile Prefill] Auto-populated profile with ${aiResult.extractedSkills.length} extracted skills.`);
      }
    }
    await profile.save();
  }

  return new ApiResponse(
    201,
    { analysis, isCached: aiResult.isCached },
    'Resume analysis completed successfully'
  ).send(res);
});

/**
 * @desc    Get all analyses for current user
 * @route   GET /api/analysis
 * @access  Protected
 */
export const getAnalyses = asyncHandler(async (req, res) => {
  const analyses = await Analysis.find({ userId: req.user._id })
    .select('-resumeText -fileBuffer') // Omit large resume text and fileBuffer for summary list
    .sort({ createdAt: -1 });

  return new ApiResponse(200, { analyses }, 'Analyses fetched successfully').send(res);
});

/**
 * @desc    Get a specific analysis by ID
 * @route   GET /api/analysis/:id
 * @access  Protected
 */
export const getAnalysisById = asyncHandler(async (req, res) => {
  const analysis = await Analysis.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!analysis) {
    throw new ApiError(404, 'Analysis report not found.');
  }

  return new ApiResponse(200, { analysis }, 'Analysis details fetched').send(res);
});

/**
 * @desc    Compare two analyses side-by-side
 * @route   GET /api/analysis/compare?a=ID&b=ID
 * @access  Protected
 */
export const compareAnalyses = asyncHandler(async (req, res) => {
  const { a: idA, b: idB } = req.query;

  if (!idA || !idB) {
    throw new ApiError(400, 'Both query parameters "a" and "b" (analysis IDs) are required for comparison.');
  }

  const [analysisA, analysisB] = await Promise.all([
    Analysis.findOne({ _id: idA, userId: req.user._id }),
    Analysis.findOne({ _id: idB, userId: req.user._id })
  ]);

  if (!analysisA || !analysisB) {
    throw new ApiError(404, 'One or both analyses could not be found.');
  }

  // Calculate skill progression and score delta
  const scoreDelta = analysisB.matchScore - analysisA.matchScore;

  const matchedSetA = new Set(analysisA.matchedSkills.map((s) => s.toLowerCase()));
  const matchedSetB = new Set(analysisB.matchedSkills.map((s) => s.toLowerCase()));

  const newlyMatchedSkills = analysisB.matchedSkills.filter((s) => !matchedSetA.has(s.toLowerCase()));

  const missingSetB = new Set(analysisB.missingSkills.map((m) => m.skill.toLowerCase()));
  const resolvedSkills = analysisA.missingSkills.filter((m) => !missingSetB.has(m.skill.toLowerCase()));

  return new ApiResponse(
    200,
    {
      comparison: {
        scoreA: analysisA.matchScore,
        scoreB: analysisB.matchScore,
        scoreDelta,
        newlyMatchedSkills,
        resolvedSkills,
        analysisA,
        analysisB
      }
    },
    'Analyses compared successfully'
  ).send(res);
});

/**
 * @desc    Stream original uploaded resume PDF file directly for in-app viewing
 * @route   GET /api/analysis/:id/file
 * @access  Protected
 */
export const getOriginalResumePdf = asyncHandler(async (req, res) => {
  const analysis = await Analysis.findOne({
    _id: req.params.id,
    userId: req.user._id
  }).select('+fileBuffer');

  if (!analysis) {
    throw new ApiError(404, 'Analysis report not found.');
  }

  if (!analysis.fileBuffer) {
    throw new ApiError(404, 'Original PDF file was not stored for this older upload.');
  }

  res.set({
    'Content-Type': analysis.fileContentType || 'application/pdf',
    'Content-Disposition': `inline; filename="${analysis.fileName || 'original_resume.pdf'}"`,
    'Content-Length': analysis.fileBuffer.length
  });

  return res.end(analysis.fileBuffer);
});


