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

test('Duplicate Prevention: duplicate detection rejects identical or similar resume with 409 ApiError', () => {
  const existingAnalyses = [
    {
      _id: 'analysis_001',
      fileName: 'Uploaded Resume.pdf',
      targetRole: 'MERN STACK developer',
      resumeTextHash: crypto.createHash('sha256').update('Full resume text of Aman').digest('hex'),
      cacheHash: 'cache_hash_001'
    }
  ];

  const checkDuplicate = (newFileName, newText, newCacheHash) => {
    const cleanName = (name) => (name || '').toLowerCase().replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]/g, '');
    const currentCleanName = cleanName(newFileName);
    const resumeTextHash = crypto.createHash('sha256').update(newText.trim()).digest('hex');

    const duplicate = existingAnalyses.find((a) => {
      if (a.resumeTextHash && a.resumeTextHash === resumeTextHash) return true;
      if (a.cacheHash && a.cacheHash === newCacheHash) return true;
      if (currentCleanName && cleanName(a.fileName) === currentCleanName) return true;
      return false;
    });

    if (duplicate) {
      throw new ApiError(
        409,
        `Duplicate resume detected: "${newFileName}" (or a file with similar name "${duplicate.fileName}" / identical content) has already been uploaded for "${duplicate.targetRole}".`
      );
    }
  };

  // 1. Same file name with underscore
  assert.throws(
    () => checkDuplicate('Uploaded_Resume.pdf', 'Different text', 'hash_unique'),
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /Duplicate resume detected/);
      return true;
    }
  );

  // 2. Same text content but renamed file
  assert.throws(
    () => checkDuplicate('Completely_New_Name.pdf', 'Full resume text of Aman', 'hash_unique_2'),
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /Duplicate resume detected/);
      return true;
    }
  );

  // 3. Genuinely new resume succeeds without error
  assert.doesNotThrow(() => {
    checkDuplicate('Jane_Doe_Resume.pdf', 'Entirely different content of Jane', 'cache_hash_jane');
  });
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
