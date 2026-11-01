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

test('Document Manual Editing and Tailor Conversion: allows updating original doc text and tailoring with customResumeText', () => {
  let doc = {
    _id: 'doc_123',
    fileName: 'My_Resume.pdf',
    targetRole: 'Junior Developer',
    resumeText: 'Original unedited content without docker.'
  };

  // 1. Update document
  const updatedText = 'Updated content including Docker, Kubernetes, and React leadership.';
  const updatedRole = 'Senior Full Stack Lead';
  doc.resumeText = updatedText;
  doc.targetRole = updatedRole;

  assert.equal(doc.resumeText, updatedText);
  assert.equal(doc.targetRole, updatedRole);

  // 2. Tailoring logic with customResumeText priority
  const resolveTailorSource = (body) => {
    if (body.customResumeText && body.customResumeText.trim().length > 20) {
      return body.customResumeText.trim();
    }
    return 'fallback';
  };

  const source = resolveTailorSource({ customResumeText: doc.resumeText });
  assert.equal(source, updatedText);
});

test('Document Deduplication: collapses multiple role evaluations into unique physical document cards with allRoles badge', () => {
  const rawAnalyses = [
    {
      _id: 'a1',
      fileName: 'Aman_Kumar_Resume_.pdf',
      fileSize: 302899,
      targetRole: 'qa engineeer',
      resumeTextHash: 'hash_aman_primary',
      createdAt: new Date('2026-11-01T04:00:00Z')
    },
    {
      _id: 'a2',
      fileName: 'Aman_Kumar_Resume_.pdf',
      fileSize: 302899,
      targetRole: 'senior devops engineer',
      resumeTextHash: 'hash_aman_primary',
      createdAt: new Date('2026-11-01T04:10:00Z')
    },
    {
      _id: 'a3',
      fileName: 'Aman_Kumar_Resume_Engineering_Support.pdf',
      fileSize: 43622,
      targetRole: 'senior devops engineer',
      resumeTextHash: 'hash_aman_support',
      createdAt: new Date('2026-11-01T04:15:00Z')
    },
    {
      _id: 'a4',
      fileName: 'Aman_Kumar_Resume_.pdf',
      fileSize: 302899,
      targetRole: 'Aman Kumar',
      resumeTextHash: 'hash_aman_primary',
      createdAt: new Date('2026-11-01T04:20:00Z')
    },
    {
      _id: 'a5',
      fileName: 'Aman_Kumar_Resume_Engineering_Support.pdf',
      fileSize: 43622,
      targetRole: 'Aman Kumar Engineering Support',
      resumeTextHash: 'hash_aman_support',
      createdAt: new Date('2026-11-01T04:25:00Z')
    }
  ];

  const deduplicateAnalyses = (analysesList) => {
    if (!Array.isArray(analysesList)) return [];
    const cleanName = (name) => (name || '').toLowerCase().replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]/g, '');
    const map = new Map();

    for (const a of analysesList) {
      const cName = cleanName(a.fileName);
      const key = a.resumeTextHash || `${cName}_${a.fileSize || 0}`;

      if (!map.has(key)) {
        map.set(key, {
          ...a,
          duplicateIds: [a._id],
          allRoles: a.targetRole ? [a.targetRole] : []
        });
      } else {
        const existing = map.get(key);
        if (!existing.duplicateIds.includes(a._id)) {
          existing.duplicateIds.push(a._id);
        }
        if (a.targetRole && !existing.allRoles.includes(a.targetRole)) {
          existing.allRoles.push(a.targetRole);
        }
        if (new Date(a.createdAt) > new Date(existing.createdAt)) {
          existing.createdAt = a.createdAt;
        }
      }
    }

    return Array.from(map.values());
  };

  const uniqueDocs = deduplicateAnalyses(rawAnalyses);

  // Exactly 2 unique physical documents should be returned, instead of 5 duplicates
  assert.equal(uniqueDocs.length, 2);

  const doc1 = uniqueDocs.find((d) => d.fileName === 'Aman_Kumar_Resume_.pdf');
  assert.ok(doc1, 'Aman_Kumar_Resume_.pdf must exist');
  assert.equal(doc1.duplicateIds.length, 3, 'Must contain all 3 analysis IDs');
  assert.deepEqual(doc1.duplicateIds, ['a1', 'a2', 'a4']);
  assert.deepEqual(doc1.allRoles, ['qa engineeer', 'senior devops engineer', 'Aman Kumar']);

  const doc2 = uniqueDocs.find((d) => d.fileName === 'Aman_Kumar_Resume_Engineering_Support.pdf');
  assert.ok(doc2, 'Aman_Kumar_Resume_Engineering_Support.pdf must exist');
  assert.equal(doc2.duplicateIds.length, 2, 'Must contain 2 analysis IDs');
  assert.deepEqual(doc2.duplicateIds, ['a3', 'a5']);
  assert.deepEqual(doc2.allRoles, ['senior devops engineer', 'Aman Kumar Engineering Support']);
});

test('Cascade Deletion of Duplicates: deleting an original document purges all duplicates while preserving tailored resumes and roadmaps', () => {
  let analyses = [
    { _id: 'a1', fileName: 'Resume.pdf', resumeTextHash: 'hash1', fileSize: 100 },
    { _id: 'a2', fileName: 'Resume.pdf', resumeTextHash: 'hash1', fileSize: 100 },
    { _id: 'other_doc', fileName: 'Other.pdf', resumeTextHash: 'hash2', fileSize: 200 }
  ];
  let generatedResumes = [
    { _id: 'tailored_1', analysisId: 'a1', companyName: 'Google' },
    { _id: 'tailored_2', analysisId: 'a2', companyName: 'Meta' }
  ];
  let roadmaps = [
    { _id: 'rm_1', analysisId: 'a1', targetRole: 'DevOps' }
  ];

  // Simulating enhanced deleteAnalysis
  const targetDoc = analyses[0];
  const matchingAnalyses = analyses.filter(
    (a) => a._id === targetDoc._id || a.resumeTextHash === targetDoc.resumeTextHash
  );
  const targetIds = matchingAnalyses.map((a) => a._id);

  // 1. Unlink tailored resumes (never delete user tailored work!)
  generatedResumes = generatedResumes.map((r) =>
    targetIds.includes(r.analysisId) ? { ...r, analysisId: null } : r
  );

  // 2. Roadmaps are preserved!
  assert.equal(roadmaps.length, 1, 'Roadmaps must never be auto-deleted');

  // 3. Delete matching analyses
  analyses = analyses.filter((a) => !targetIds.includes(a._id));

  assert.equal(analyses.length, 1, 'Only non-matching documents should remain');
  assert.equal(analyses[0]._id, 'other_doc');
  assert.equal(generatedResumes.length, 2, 'Tailored resumes must remain intact with unlinked analysisId');
  assert.equal(generatedResumes[0].analysisId, null);
  assert.equal(generatedResumes[1].analysisId, null);
});

test('AI Automatic Resume Edit: applyDevEditFallback removes specified tools, adds requested tools, and retargets role', async () => {
  const { applyDevEditFallback } = await import('../src/services/gemini.service.js');

  const initialHtml = `
    <h1>Aman Kumar</h1>
    <p><strong>Senior Software Engineer</strong> candidate targeted for opportunities at TechCorp.</p>
    <h2>Technical Skills</h2>
    <p><strong>Core Competencies & Tools:</strong> React, Node.js, Postman, SQL, Git</p>
    <h2>Projects</h2>
    <ul>
      <li>Built a complaint-ticketing system with Postman API tests and Jira tracking.</li>
      <li>Architected database schemas using PostgreSQL.</li>
    </ul>
  `;

  // Case 1: User says "remove postman and its related things from my resume"
  const edited1 = applyDevEditFallback(initialHtml, 'remove postman and its related things from my resume', 'Software Engineer');
  assert.ok(!edited1.includes('Postman'), 'Postman must be stripped out completely');
  assert.ok(!edited1.includes('Postman API tests'), 'Bullet point mentioning Postman must be removed');
  assert.ok(edited1.includes('React'), 'Other skills like React must be preserved');
  assert.ok(edited1.includes('PostgreSQL'), 'Other projects must be preserved');

  // Case 2: User says "add Docker, Kubernetes into skills and change role to Cyber Security Analyst"
  const edited2 = applyDevEditFallback(
    initialHtml,
    'add Docker, Kubernetes to skills and change role to Cyber Security Analyst',
    'Cyber Security Analyst'
  );
  assert.ok(edited2.includes('Docker, Kubernetes'), 'Requested tools must be appended into skills');
  assert.ok(edited2.includes('Cyber Security Analyst'), 'Role must be updated in candidate description');
});


