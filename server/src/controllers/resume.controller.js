import mongoose from 'mongoose';
import { GeneratedResume } from '../models/GeneratedResume.js';
import { Analysis } from '../models/Analysis.js';
import { Roadmap } from '../models/Roadmap.js';
import { Profile } from '../models/Profile.js';
import { extractResumeText } from '../services/parser.service.js';
import { generateAtsResume, editResumeWithAi } from '../services/gemini.service.js';
import { generatePdfFromHtml } from '../services/pdf.service.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * @desc    Generate an ATS-compliant resume HTML and save
 * @route   POST /api/resume/generate
 * @access  Protected
 */
export const generateResume = asyncHandler(async (req, res) => {
  const { analysisId } = req.body;

  if (!analysisId) {
    throw new ApiError(400, 'Analysis ID is required to generate ATS resume.');
  }

  const analysis = await Analysis.findOne({
    _id: analysisId,
    userId: req.user._id
  });

  if (!analysis) {
    throw new ApiError(404, 'Analysis report not found.');
  }

  // Prevent creating duplicate resumes for the same base analysis
  const existingResume = await GeneratedResume.findOne({
    userId: req.user._id,
    analysisId: analysis._id,
    $or: [
      { companyName: 'General Application' },
      { companyName: 'Master Resume' },
      { companyName: '' },
      { companyName: analysis.fileName }
    ]
  }).populate('analysisId', 'fileName targetRole matchScore hasOriginalPdf resumeText');

  if (existingResume) {
    // Backfill any missing metadata on existing resume
    if (!existingResume.targetRole || existingResume.targetRole === 'Target Role') {
      existingResume.targetRole = analysis.targetRole;
    }
    if (!existingResume.companyName || existingResume.companyName === 'General Application') {
      existingResume.companyName = analysis.fileName || 'Master Resume';
    }
    await existingResume.save();

    return new ApiResponse(
      200,
      { resume: existingResume, isDuplicate: true },
      'Existing ATS resume loaded (duplicate avoided)'
    ).send(res);
  }

  // Generate ATS HTML with Gemini
  const html = await generateAtsResume(analysis.resumeText, analysis);

  const generatedResume = await GeneratedResume.create({
    userId: req.user._id,
    analysisId: analysis._id,
    companyName: analysis.fileName || 'Master Resume',
    targetRole: analysis.targetRole,
    template: 'modern',
    html
  });

  await generatedResume.populate('analysisId', 'fileName targetRole matchScore hasOriginalPdf resumeText');

  return new ApiResponse(
    201,
    { resume: generatedResume },
    'ATS resume HTML generated successfully'
  ).send(res);
});

/**
 * @desc    Download generated resume as PDF (rendered with Puppeteer)
 * @route   GET /api/resume/:id/pdf
 * @access  Protected
 */
export const getResumePdf = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'Invalid resume ID format.');
  }

  const generatedResume = await GeneratedResume.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!generatedResume) {
    throw new ApiError(404, 'Generated resume not found.');
  }

  // Render PDF using Puppeteer
  const pdfBuffer = await generatePdfFromHtml(generatedResume.html);

  const disposition = req.query.inline === 'true' ? 'inline' : 'attachment';
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `${disposition}; filename="CareerPilot_ATS_Resume_${req.params.id}.pdf"`,
    'Content-Length': pdfBuffer.length
  });

  return res.end(pdfBuffer);
});

/**
 * @desc    Get all generated resumes for user
 * @route   GET /api/resume
 * @access  Protected
 */
export const getResumes = asyncHandler(async (req, res) => {
  const resumes = await GeneratedResume.find({ userId: req.user._id })
    .populate('analysisId', 'fileName targetRole matchScore hasOriginalPdf')
    .select('-html')
    .sort({ createdAt: -1 });

  // Enrich any older records with real analysis metadata (file name and target role)
  const enrichedResumes = resumes.map((r) => {
    const doc = r.toObject();
    if (!doc.targetRole || doc.targetRole === 'Target Role') {
      doc.targetRole = doc.analysisId?.targetRole || 'Software Developer';
    }
    if (!doc.companyName || doc.companyName === 'General Application') {
      doc.companyName = doc.analysisId?.fileName || 'Master Resume';
    }
    return doc;
  });

  return new ApiResponse(200, { resumes: enrichedResumes }, 'Resumes retrieved successfully').send(res);
});

/**
 * @desc    Get single generated resume with HTML preview
 * @route   GET /api/resume/:id
 * @access  Protected
 */
export const getResumeById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'Invalid resume ID format.');
  }

  const resume = await GeneratedResume.findOne({
    _id: req.params.id,
    userId: req.user._id
  }).populate('analysisId', 'fileName targetRole matchScore hasOriginalPdf resumeText');

  if (!resume) {
    throw new ApiError(404, 'Resume not found.');
  }

  if (!resume.targetRole || resume.targetRole === 'Target Role') {
    resume.targetRole = resume.analysisId?.targetRole || 'Software Developer';
  }
  if (!resume.companyName || resume.companyName === 'General Application') {
    resume.companyName = resume.analysisId?.fileName || 'Master Resume';
  }

  return new ApiResponse(200, { resume }, 'Resume retrieved').send(res);
});

/**
 * @desc    Update resume content (interactive live editing) or template
 * @route   PUT /api/resume/:id
 * @access  Protected
 */
export const updateResume = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'Invalid resume ID format.');
  }

  const { html, template, companyName, targetRole } = req.body;

  const resume = await GeneratedResume.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!resume) {
    throw new ApiError(404, 'Resume not found.');
  }

  if (html !== undefined) resume.html = html;
  if (template !== undefined && ['modern', 'classic', 'compact'].includes(template)) {
    resume.template = template;
  }
  if (companyName !== undefined) resume.companyName = companyName.trim();
  if (targetRole !== undefined) resume.targetRole = targetRole.trim();

  await resume.save();

  return new ApiResponse(200, { resume }, 'Resume updated successfully').send(res);
});

/**
 * @desc    Automatically modify a resume with AI using natural language instructions
 * @route   POST /api/resume/:id/ai-edit
 * @access  Protected
 */
export const aiEditResume = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'Invalid resume ID format.');
  }

  const { instructions } = req.body;
  if (!instructions || !instructions.trim()) {
    throw new ApiError(400, 'Please provide the instructions or changes you want AI to make.');
  }

  const resume = await GeneratedResume.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!resume) {
    throw new ApiError(404, 'Resume not found.');
  }

  // Run AI resume editor
  const updatedHtml = await editResumeWithAi(
    resume.html,
    instructions.trim(),
    resume.targetRole
  );

  resume.html = updatedHtml;
  await resume.save();

  return new ApiResponse(
    200,
    { resume },
    'Resume modified by AI according to your instructions!'
  ).send(res);
});

/**
 * @desc    Tailor a separate ATS resume for a specific job opening without disrupting others
 * @route   POST /api/resume/tailor
 * @access  Protected
 */
export const tailorResumeForJob = asyncHandler(async (req, res) => {
  const {
    baseAnalysisId,
    baseResumeId,
    customResumeText,
    companyName,
    targetRole,
    experienceLevel,
    experienceDetails,
    specificTools,
    requiredSkills,
    jobDescription,
    editInstructions
  } = req.body;

  if (!targetRole || !targetRole.trim()) {
    throw new ApiError(400, 'Target role is required.');
  }

  let sourceResumeText = '';
  let linkedAnalysisId = null;

  if (customResumeText && customResumeText.trim().length > 20) {
    sourceResumeText = customResumeText.trim();
    if (baseAnalysisId && mongoose.Types.ObjectId.isValid(baseAnalysisId)) {
      linkedAnalysisId = baseAnalysisId;
    }
  } else if (req.file) {
    sourceResumeText = await extractResumeText(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
  } else if (baseResumeId && mongoose.Types.ObjectId.isValid(baseResumeId)) {
    const baseResume = await GeneratedResume.findOne({
      _id: baseResumeId,
      userId: req.user._id
    }).populate('analysisId');
    if (baseResume) {
      linkedAnalysisId = baseResume.analysisId?._id || null;
      sourceResumeText = baseResume.analysisId?.resumeText || baseResume.html?.replace(/<[^>]+>/g, ' ') || '';
    }
  } else if (baseAnalysisId && mongoose.Types.ObjectId.isValid(baseAnalysisId)) {
    const analysis = await Analysis.findOne({
      _id: baseAnalysisId,
      userId: req.user._id
    });
    if (analysis) {
      linkedAnalysisId = analysis._id;
      sourceResumeText = analysis.resumeText || '';
    }
  }

  // If no source resume text from file or previous resume, fall back to Profile
  if (!sourceResumeText || sourceResumeText.trim().length < 20) {
    const profile = await Profile.findOne({ userId: req.user._id });
    const profileSkills = profile?.currentSkills?.join(', ') || 'Software Engineering, Problem Solving';
    sourceResumeText = `${req.user.name || 'Candidate Professional'}\n${req.user.email || ''}\nTarget Role: ${targetRole}\nSkills: ${profileSkills}\n${profile?.jobDescription || ''}`;
  }

  // Parse required skills from array or comma-separated string
  let parsedSkills = [];
  if (Array.isArray(requiredSkills)) {
    parsedSkills = requiredSkills.map((s) => String(s).trim()).filter(Boolean);
  } else if (typeof requiredSkills === 'string' && requiredSkills.trim()) {
    parsedSkills = requiredSkills
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Parse specific tools requested by user to add to resume
  let parsedTools = [];
  if (Array.isArray(specificTools)) {
    parsedTools = specificTools.map((s) => String(s).trim()).filter(Boolean);
  } else if (typeof specificTools === 'string' && specificTools.trim()) {
    parsedTools = specificTools
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Create isolated analysis context targeting this specific company opening
  const targetAnalysis = {
    targetRole: targetRole.trim(),
    companyName: companyName?.trim() || 'Custom Application',
    experienceLevel: experienceLevel?.trim() || 'Fresher / Student (0-1 yrs)',
    experienceDetails: experienceDetails?.trim() || '',
    specificTools: parsedTools,
    requiredSkills: parsedSkills,
    jobDescription: jobDescription?.trim() || '',
    editInstructions: editInstructions?.trim() || '',
    matchedSkills: parsedSkills.slice(0, 8),
    suggestions: [
      `Tailored specifically for ${companyName ? `${companyName} - ` : ''}${targetRole.trim()}`
    ]
  };

  const html = await generateAtsResume(sourceResumeText, targetAnalysis);

  const tailoredResume = await GeneratedResume.create({
    userId: req.user._id,
    analysisId: linkedAnalysisId || null,
    companyName: companyName?.trim() || 'Custom Application',
    targetRole: targetRole.trim(),
    template: 'modern',
    html
  });

  return new ApiResponse(
    201,
    { resume: tailoredResume },
    'Tailored ATS resume created successfully'
  ).send(res);
});

/**
 * @desc    Delete a tailored resume (deletes ONLY this specific tailored resume, never the original uploaded resume or roadmap)
 * @route   DELETE /api/resume/:id
 * @access  Protected
 */
export const deleteResume = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'Invalid resume ID format.');
  }

  const resume = await GeneratedResume.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!resume) {
    throw new ApiError(404, 'Resume not found.');
  }

  // Delete ONLY this specific generated resume document
  await GeneratedResume.deleteOne({ _id: resume._id });

  return new ApiResponse(
    200,
    null,
    'Tailored ATS resume deleted successfully.'
  ).send(res);
});


