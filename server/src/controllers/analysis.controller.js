import crypto from 'crypto';
import mongoose from 'mongoose';
import { Analysis } from '../models/Analysis.js';
import { GeneratedResume } from '../models/GeneratedResume.js';
import { Roadmap } from '../models/Roadmap.js';
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

  // Compute resume text hash to detect duplicate uploads
  const resumeTextHash = crypto.createHash('sha256').update(resumeText.trim()).digest('hex');

  // Prevent duplicate uploads: if not an explicit re-analysis comparison loop, block identical resume uploads or same/similar filenames
  if (!previousAnalysisId) {
    const userAnalyses = await Analysis.find({ userId: req.user._id }).select('fileName resumeTextHash cacheHash targetRole');
    
    const cleanName = (name) => (name || '').toLowerCase().replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]/g, '');
    const currentCleanName = cleanName(fileName);

    const existingDuplicate = userAnalyses.find((a) => {
      // 1. Identical extracted text content (exact same resume file)
      if (a.resumeTextHash && a.resumeTextHash === resumeTextHash) return true;
      // 2. Identical AI query cache hash
      if (a.cacheHash && a.cacheHash === aiResult.cacheHash) return true;
      // 3. Exact or similar file name (e.g. "Uploaded_Resume.pdf" vs "Uploaded Resume.pdf")
      if (currentCleanName && cleanName(a.fileName) === currentCleanName) return true;
      return false;
    });

    if (existingDuplicate) {
      throw new ApiError(
        409,
        `Duplicate resume detected: "${fileName}" (or a file with similar name "${existingDuplicate.fileName}" / identical content) has already been uploaded for "${existingDuplicate.targetRole}". To analyze a new version, please delete the previous resume first, or upload an updated file.`
      );
    }
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
    resumeTextHash,
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
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'Invalid analysis ID format.');
  }

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
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'Invalid analysis ID format.');
  }

  const analysis = await Analysis.findOne({
    _id: req.params.id,
    userId: req.user._id
  }).select('+fileBuffer');

  if (!analysis) {
    throw new ApiError(404, 'Analysis report not found.');
  }

  if (!analysis.fileBuffer) {
    res.set('Content-Type', 'text/html');
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #334155; padding: 40px 20px; text-align: center; }
          .card { max-width: 500px; margin: 40px auto; background: white; padding: 32px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          h2 { color: #0f172a; margin-top: 0; font-size: 20px; }
          p { font-size: 14px; line-height: 1.6; color: #64748b; }
          .badge { display: inline-block; padding: 4px 12px; background: #e0e7ff; color: #4338ca; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">Older Resume Upload</div>
          <h2>Original PDF Preview Not Available</h2>
          <p>This resume was uploaded in an earlier session before PDF archiving was active.</p>
          <p>All newly uploaded resumes retain full in-app PDF previewing.</p>
        </div>
      </body>
      </html>
    `);
  }

  res.set({
    'Content-Type': analysis.fileContentType || 'application/pdf',
    'Content-Disposition': `inline; filename="${analysis.fileName || 'original_resume.pdf'}"`,
    'Content-Length': analysis.fileBuffer.length
  });

  return res.end(analysis.fileBuffer);
});

/**
 * @desc    Permanently delete an analysis and CASCADE delete all linked ATS resumes & roadmaps
 * @route   DELETE /api/analysis/:id
 * @access  Protected
 */
export const deleteAnalysis = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'Invalid analysis ID format.');
  }

  const analysis = await Analysis.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!analysis) {
    throw new ApiError(404, 'Analysis report not found.');
  }

  // 1. Delete all generated ATS resumes linked to this analysis
  await GeneratedResume.deleteMany({
    userId: req.user._id,
    analysisId: analysis._id
  });

  // 2. Delete any 12-week roadmap linked to this analysis
  await Roadmap.deleteMany({
    userId: req.user._id,
    analysisId: analysis._id
  });

  // 3. Delete the analysis document itself
  await Analysis.deleteOne({ _id: analysis._id });

  // 4. Update Profile.lastUploadedResume if it points to this analysis
  const profile = await Profile.findOne({ userId: req.user._id });
  if (profile?.lastUploadedResume?.analysisId?.toString() === analysis._id.toString()) {
    const latestRemaining = await Analysis.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (latestRemaining) {
      profile.lastUploadedResume = {
        fileName: latestRemaining.fileName,
        fileSize: latestRemaining.fileSize,
        uploadedAt: latestRemaining.createdAt,
        analysisId: latestRemaining._id
      };
    } else {
      profile.lastUploadedResume = null;
    }
    await profile.save();
  }

  return new ApiResponse(
    200,
    null,
    `Resume "${analysis.fileName}" and all associated data completely removed from app.`
  ).send(res);
});



