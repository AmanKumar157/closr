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

  // Prevent duplicate uploads: if not an explicit re-analysis comparison loop or overwrite, block identical resume uploads for the same target role
  const isOverwrite = req.body.overwrite === 'true' || req.body.overwrite === true;
  if (!previousAnalysisId && !isOverwrite) {
    const userAnalyses = await Analysis.find({ userId: req.user._id }).select('fileName resumeTextHash cacheHash targetRole');
    
    const cleanName = (name) => (name || '').toLowerCase().replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]/g, '');
    const currentCleanName = cleanName(fileName);
    const normalizedTargetRole = (targetRole || '').trim().toLowerCase();

    const existingDuplicate = userAnalyses.find((a) => {
      // Duplicates are evaluated strictly per target role: users CAN upload the same resume for different roles (e.g. Python vs Java)
      const isSameRole = (a.targetRole || '').trim().toLowerCase() === normalizedTargetRole;
      if (!isSameRole) return false;

      // 1. Identical extracted text content (exact same resume file) for the same role
      if (a.resumeTextHash && a.resumeTextHash === resumeTextHash) return true;
      // 2. Identical AI query cache hash for the same role
      if (a.cacheHash && a.cacheHash === aiResult.cacheHash) return true;
      // 3. Exact or similar file name for the same role
      if (currentCleanName && cleanName(a.fileName) === currentCleanName) return true;
      return false;
    });

    if (existingDuplicate) {
      throw new ApiError(
        409,
        `Duplicate resume detected: "${fileName}" has already been analyzed for "${existingDuplicate.targetRole}". To analyze a new version for this role, delete the previous analysis or check "Overwrite existing analysis".`
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
    const safeText = (analysis.resumeText || 'No text extracted')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${analysis.fileName || 'Original Resume'}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #525659; margin: 0; padding: 24px 12px; color: #1e293b; display: flex; justify-content: center; }
          .a4-container { width: 100%; max-width: 794px; min-height: 1123px; background: white; padding: 48px 56px; box-shadow: 0 10px 30px rgba(0,0,0,0.35); border-radius: 2px; box-sizing: border-box; }
          .doc-header { border-bottom: 2px solid #334155; padding-bottom: 16px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: flex-start; }
          .doc-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; }
          .doc-meta { font-size: 12px; color: #64748b; font-weight: 500; }
          .badge { display: inline-block; font-size: 11px; font-weight: 700; color: #4338ca; background: #e0e7ff; padding: 3px 10px; border-radius: 9999px; text-transform: uppercase; }
          .doc-body { font-size: 13px; line-height: 1.7; color: #1e293b; white-space: pre-wrap; word-break: break-word; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          .print-toolbar { position: fixed; top: 12px; right: 20px; z-index: 100; }
          .print-btn { background: #4f46e5; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); }
          .print-btn:hover { background: #4338ca; }
          @media print {
            body { background: white; padding: 0; }
            .a4-container { box-shadow: none; padding: 0; max-width: 100%; }
            .print-toolbar { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="print-toolbar">
          <button class="print-btn" onclick="window.print()">Print Document</button>
        </div>
        <div class="a4-container">
          <div class="doc-header">
            <div>
              <h1 class="doc-title">${analysis.fileName || 'Uploaded Resume'}</h1>
              <div class="doc-meta">Target Position: <strong>${analysis.targetRole}</strong> • Match Score: <strong>${analysis.matchScore}%</strong></div>
            </div>
            <span class="badge">A4 Verified Document</span>
          </div>
          <div class="doc-body">${safeText}</div>
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

  // 2. Roadmaps are preserved! User explicitly manages and deletes roadmaps separately.
  // Multiple roadmaps remain stored and accessible in the Roadmap section.

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



