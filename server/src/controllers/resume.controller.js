import mongoose from 'mongoose';
import { GeneratedResume } from '../models/GeneratedResume.js';
import { Analysis } from '../models/Analysis.js';
import { generateAtsResume } from '../services/gemini.service.js';
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

  // Generate ATS HTML with Gemini
  const html = await generateAtsResume(analysis.resumeText, analysis);

  const generatedResume = await GeneratedResume.create({
    userId: req.user._id,
    analysisId: analysis._id,
    html
  });

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

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="CareerPilot_ATS_Resume_${req.params.id}.pdf"`,
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
    .select('-html')
    .sort({ createdAt: -1 });

  return new ApiResponse(200, { resumes }, 'Resumes retrieved successfully').send(res);
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
  });

  if (!resume) {
    throw new ApiError(404, 'Resume not found.');
  }

  return new ApiResponse(200, { resume }, 'Resume retrieved').send(res);
});

