import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { ApiError } from '../src/utils/ApiError.js';

test('Duplicate Prevention: cleanName normalizes filenames to catch similar names', () => {
  const cleanName = (name) => (name || '').toLowerCase().replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]/g, '');

  const variant1 = 'Uploaded Resume.pdf';
  const variant2 = 'Uploaded_Resume.pdf';
  const variant3 = 'uploaded resume.PDF';
  const variant4 = 'Uploaded-Resume.docx';
  const variant5 = '  uploaded_resume.pdf  ';

  assert.equal(cleanName(variant1), 'uploadedresume');
  assert.equal(cleanName(variant2), 'uploadedresume');
  assert.equal(cleanName(variant3), 'uploadedresume');
  assert.equal(cleanName(variant4), 'uploadedresume');
  assert.equal(cleanName(variant5), 'uploadedresume');

  // All variants must match the cleanName
  assert.equal(cleanName(variant1), cleanName(variant2));
  assert.equal(cleanName(variant2), cleanName(variant3));
  assert.equal(cleanName(variant3), cleanName(variant4));
  assert.equal(cleanName(variant4), cleanName(variant5));
});

test('Duplicate Prevention: SHA-256 hash detects identical resume text content', () => {
  const textA = 'Aman Kumar\nMERN Stack Developer with React, Node, Express, MongoDB experience.';
  const textB = '  Aman Kumar\nMERN Stack Developer with React, Node, Express, MongoDB experience.  \n';
  const textC = 'Different text for another candidate';

  const hashA = crypto.createHash('sha256').update(textA.trim()).digest('hex');
  const hashB = crypto.createHash('sha256').update(textB.trim()).digest('hex');
  const hashC = crypto.createHash('sha256').update(textC.trim()).digest('hex');

  assert.equal(hashA, hashB, 'Trimmed texts must have identical SHA-256 hashes');
  assert.notEqual(hashA, hashC, 'Different texts must have different SHA-256 hashes');
});

test('Duplicate Prevention: duplicate detection rejects identical resume for SAME target role, but allows for DIFFERENT target roles', () => {
  const existingAnalyses = [
    {
      _id: 'analysis_001',
      fileName: 'Aman_Kumar_Resume_Engineering_Support.pdf',
      targetRole: 'java developer',
      resumeTextHash: crypto.createHash('sha256').update('Full resume text of Aman').digest('hex'),
      cacheHash: 'cache_hash_001'
    }
  ];

  const checkDuplicate = (newFileName, newText, newCacheHash, newRole, overwrite = false) => {
    if (overwrite) return; // Overwrite bypasses duplicate check
    const cleanName = (name) => (name || '').toLowerCase().replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]/g, '');
    const currentCleanName = cleanName(newFileName);
    const resumeTextHash = crypto.createHash('sha256').update(newText.trim()).digest('hex');
    const normalizedTargetRole = (newRole || '').trim().toLowerCase();

    const duplicate = existingAnalyses.find((a) => {
      const isSameRole = (a.targetRole || '').trim().toLowerCase() === normalizedTargetRole;
      if (!isSameRole) return false; // Different role is allowed!
      if (a.resumeTextHash && a.resumeTextHash === resumeTextHash) return true;
      if (a.cacheHash && a.cacheHash === newCacheHash) return true;
      if (currentCleanName && cleanName(a.fileName) === currentCleanName) return true;
      return false;
    });

    if (duplicate) {
      throw new ApiError(
        409,
        `Duplicate resume detected: "${newFileName}" has already been analyzed for "${duplicate.targetRole}".`
      );
    }
  };

  // 1. Same resume uploaded for DIFFERENT role (python developer vs java developer) -> MUST SUCCEED!
  assert.doesNotThrow(() => {
    checkDuplicate('Aman_Kumar_Resume_Engineering_Support.pdf', 'Full resume text of Aman', 'cache_hash_001', 'python developer');
  }, 'Uploading the same resume file for a different target role must succeed!');

  // 2. Same resume uploaded for the SAME role (java developer) -> MUST BE REJECTED with 409!
  assert.throws(
    () => checkDuplicate('Aman_Kumar_Resume_Engineering_Support.pdf', 'Full resume text of Aman', 'cache_hash_001', 'java developer'),
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /Duplicate resume detected/);
      return true;
    }
  );

  // 3. Same file with minor name change for the SAME role -> MUST BE REJECTED!
  assert.throws(
    () => checkDuplicate('Aman-Kumar-Resume-Engineering-Support.pdf', 'Different text', 'hash_unique', 'Java Developer'),
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /Duplicate resume detected/);
      return true;
    }
  );

  // 4. Overwrite flag set to true -> MUST SUCCEED even for same role!
  assert.doesNotThrow(() => {
    checkDuplicate('Aman_Kumar_Resume_Engineering_Support.pdf', 'Full resume text of Aman', 'cache_hash_001', 'java developer', true);
  }, 'Overwrite flag must allow re-analysis for the same role');
});

test('Cascade Deletion Simulation: deleting analysis removes all associated resumes and roadmaps', () => {
  const analysisId = 'analysis_123';
  let analyses = [{ _id: analysisId, fileName: 'Resume.pdf' }];
  let generatedResumes = [
    { _id: 'res_1', analysisId, companyName: 'Master Resume' },
    { _id: 'res_2', analysisId, companyName: 'Google Tailored' }
  ];
  let roadmaps = [{ _id: 'road_1', analysisId, targetRole: 'MERN Developer' }];
  let profile = { lastUploadedResume: { analysisId, fileName: 'Resume.pdf' } };

  // Cascade delete logic
  generatedResumes = generatedResumes.filter((r) => r.analysisId !== analysisId);
  roadmaps = roadmaps.filter((r) => r.analysisId !== analysisId);
  analyses = analyses.filter((a) => a._id !== analysisId);
  if (profile.lastUploadedResume?.analysisId === analysisId) {
    const latestRemaining = analyses[analyses.length - 1];
    profile.lastUploadedResume = latestRemaining
      ? { analysisId: latestRemaining._id, fileName: latestRemaining.fileName }
      : null;
  }

  assert.equal(analyses.length, 0, 'Analysis must be deleted');
  assert.equal(generatedResumes.length, 0, 'All linked resumes must be deleted');
  assert.equal(roadmaps.length, 0, 'All linked roadmaps must be deleted');
  assert.equal(profile.lastUploadedResume, null, 'Profile pointer must be reset to null when empty');
});

test('Cascade Deletion Simulation: deleting resume with cascade=true removes parent analysis and roadmaps', () => {
  const analysisId = 'analysis_456';
  let analyses = [{ _id: analysisId, fileName: 'Aman.pdf' }];
  let generatedResumes = [{ _id: 'res_primary', analysisId, companyName: 'Aman.pdf' }];
  let roadmaps = [{ _id: 'road_456', analysisId, targetRole: 'Full Stack' }];
  let profile = { lastUploadedResume: { analysisId, fileName: 'Aman.pdf' } };

  const deleteResume = (resumeId, cascade) => {
    const target = generatedResumes.find((r) => r._id === resumeId);
    if (!target) return;
    const aId = target.analysisId;
    generatedResumes = generatedResumes.filter((r) => r._id !== resumeId);

    if (cascade && aId) {
      analyses = analyses.filter((a) => a._id !== aId);
      roadmaps = roadmaps.filter((r) => r.analysisId !== aId);
      generatedResumes = generatedResumes.filter((r) => r.analysisId !== aId);
      if (profile.lastUploadedResume?.analysisId === aId) {
        profile.lastUploadedResume = null;
      }
    }
  };

  deleteResume('res_primary', true);

  assert.equal(generatedResumes.length, 0);
  assert.equal(analyses.length, 0);
  assert.equal(roadmaps.length, 0);
  assert.equal(profile.lastUploadedResume, null);
});

test('Pre-Uploaded Resume Selection: reuses existing resumeText and metadata without needing file upload', () => {
  const mockBaseAnalysis = {
    _id: 'analysis_existing_789',
    userId: 'user_123',
    fileName: 'Aman_Kumar_Original_Resume.pdf',
    fileSize: 45678,
    fileContentType: 'application/pdf',
    resumeText: 'Aman Kumar, Full Stack Engineer skilled in Node.js, React, MongoDB.',
    hasOriginalPdf: true
  };

  // Simulation of createAnalysis resolution logic
  const resolveResumeData = (req) => {
    let resumeText = '';
    let fileName = '';
    let fileSize = 0;

    if (req.file) {
      resumeText = 'Extracted text from buffer';
      fileName = req.file.originalname;
      fileSize = req.file.size;
    } else if (req.body.existingAnalysisId) {
      if (req.body.existingAnalysisId === mockBaseAnalysis._id) {
        resumeText = mockBaseAnalysis.resumeText;
        fileName = mockBaseAnalysis.fileName;
        fileSize = mockBaseAnalysis.fileSize;
      } else {
        throw new ApiError(404, 'Selected pre-uploaded resume not found.');
      }
    } else {
      throw new ApiError(400, 'Please upload a resume file (PDF or DOCX) or select a pre-uploaded resume.');
    }

    return { resumeText, fileName, fileSize };
  };

  // Case 1: Pre-uploaded resume selection
  const resultSaved = resolveResumeData({
    file: null,
    body: { existingAnalysisId: 'analysis_existing_789' }
  });
  assert.equal(resultSaved.fileName, 'Aman_Kumar_Original_Resume.pdf');
  assert.equal(resultSaved.resumeText, mockBaseAnalysis.resumeText);
  assert.equal(resultSaved.fileSize, 45678);

  // Case 2: Fresh file upload
  const resultUpload = resolveResumeData({
    file: { originalname: 'New_Resume.pdf', size: 12345 },
    body: {}
  });
  assert.equal(resultUpload.fileName, 'New_Resume.pdf');
  assert.equal(resultUpload.fileSize, 12345);

  // Case 3: Neither provided throws 400
  assert.throws(
    () => resolveResumeData({ file: null, body: {} }),
    /Please upload a resume file/
  );
});

