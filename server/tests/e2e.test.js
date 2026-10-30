import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { analyzeResume } from '../src/services/gemini.service.js';
import { generateRoadmap, swapResource, generateAtsResume } from '../src/services/gemini.service.js';
import { resolveResource } from '../src/services/resource.service.js';
import { generatePdfFromHtml, closeBrowser } from '../src/services/pdf.service.js';
import { extractResumeText } from '../src/services/parser.service.js';
import { updateProfileSchema } from '../src/validators/profile.validator.js';
import { registerSchema, loginSchema } from '../src/validators/auth.validator.js';

test('E2E Loop: 1. User Registration & Password Hashing', async () => {
  const registerPayload = {
    name: 'Sarah Connor',
    email: 'sarah.connor@example.com',
    password: 'TerminatorResistance2026!'
  };

  const validated = registerSchema.safeParse(registerPayload);
  assert.equal(validated.success, true);

  const hash = await bcrypt.hash(registerPayload.password, 10);
  const isValid = await bcrypt.compare(registerPayload.password, hash);
  assert.equal(isValid, true);
});

test('E2E Loop: 2. Profile Creation & Update Validation', () => {
  const profilePayload = {
    targetRole: 'Senior Full Stack Engineer',
    currentSkills: ['JavaScript', 'React', 'Node.js', 'Express', 'MongoDB'],
    jobDescription: 'Seeking expert MERN engineer with Docker and TypeScript experience.',
    preferredLanguage: 'en'
  };

  const validated = updateProfileSchema.safeParse(profilePayload);
  assert.equal(validated.success, true);
  assert.equal(validated.data.currentSkills.length, 5);
  assert.equal(validated.data.preferredLanguage, 'en');
});

test('E2E Loop: 3. Resume Text Extraction & Threshold Check', async () => {
  const resumeContent = `SARAH CONNOR - SENIOR SOFTWARE ENGINEER
Email: sarah@example.com | San Francisco, CA

PROFESSIONAL SUMMARY
Senior Full Stack Engineer with 4+ years developing high-throughput web applications in JavaScript, Node.js, Express, MongoDB, and React. Passionate about system scalability and clean code.

EXPERIENCE
Software Engineer - Cyberdyne Systems (2022 - Present)
- Developed and maintained critical microservices in Node.js and Express.
- Optimized MongoDB database queries, reducing average API latency by 40%.
- Created modular UI components in React and Tailwind CSS for internal security dashboard.

EDUCATION
B.S. in Computer Science - University of California (2021)`;

  const buffer = Buffer.from(resumeContent, 'utf-8');
  assert.ok(buffer.length >= 200);

  // Parser service rejects bad file type
  await assert.rejects(
    async () => extractResumeText(buffer, 'resume.exe', 'application/x-msdownload'),
    /Unsupported file format/
  );
});

test('E2E Loop: 4. AI Gap Analysis Generation & Output Contract', async () => {
  const resumeText = `Sarah Connor - Experienced developer in React, Node.js, MongoDB, Express, JavaScript, and REST APIs. Built enterprise dashboards and scalable APIs.`;
  const targetRole = 'Lead Full Stack Engineer';
  const jd = 'Must have TypeScript, Docker, CI/CD, and System Architecture experience.';

  const analysis = await analyzeResume(resumeText, targetRole, jd);

  assert.ok(analysis.matchScore >= 0 && analysis.matchScore <= 100);
  assert.ok(Array.isArray(analysis.extractedSkills));
  assert.ok(Array.isArray(analysis.matchedSkills));
  assert.ok(Array.isArray(analysis.missingSkills));
  assert.ok(Array.isArray(analysis.weakSections));
  assert.ok(Array.isArray(analysis.suggestions));

  // Check structure of missing skills (must include skill & importance enum)
  if (analysis.missingSkills.length > 0) {
    const firstGap = analysis.missingSkills[0];
    assert.ok(typeof firstGap.skill === 'string');
    assert.ok(['high', 'medium', 'low'].includes(firstGap.importance));
  }
});

test('E2E Loop: 5. 12-Week Roadmap Generation from Analysis', async () => {
  const mockAnalysis = {
    targetRole: 'Senior Full Stack Engineer',
    matchedSkills: ['React', 'Node.js', 'MongoDB', 'Express'],
    missingSkills: [
      { skill: 'TypeScript', importance: 'high' },
      { skill: 'Docker', importance: 'high' },
      { skill: 'CI/CD Pipelines', importance: 'medium' }
    ]
  };

  const roadmapData = await generateRoadmap(mockAnalysis, { preferredLanguage: 'en' }, false);

  assert.equal(roadmapData.weeks.length, 12);

  for (let i = 0; i < 12; i++) {
    const week = roadmapData.weeks[i];
    assert.equal(week.weekNumber, i + 1);
    assert.ok(week.topicTitle.length > 0);
    assert.ok(week.milestones.length >= 2 && week.milestones.length <= 4);

    // Verify exactly ONE resource per milestone
    for (const milestone of week.milestones) {
      assert.ok(milestone.title.length > 0);
      assert.ok(milestone.resource);
      assert.ok(['video', 'documentation', 'article', 'practice'].includes(milestone.resource.type));
      assert.ok(milestone.resource.name.length > 0);
      assert.ok(milestone.resource.searchQuery.length > 0);
    }
  }
});

test('E2E Loop: 6. Resource Resolver for Week 1 Deliverables', async () => {
  const resource1 = {
    type: 'documentation',
    name: 'TypeScript',
    searchQuery: 'typescript documentation'
  };

  const resolved = await resolveResource(resource1);
  assert.ok(resolved.url.startsWith('https://'));
  assert.equal(resolved.verified, true);
  assert.equal(resolved.url, 'https://www.typescriptlang.org/docs');
});

test('E2E Loop: 7. Resource Swap Functionality', async () => {
  const milestone = { title: 'Master Docker containerization basics' };
  const oldResource = {
    type: 'video',
    name: 'Old Video Tutorial',
    searchQuery: 'docker basics video',
    language: 'en'
  };

  const swapped = await swapResource(milestone, oldResource);
  assert.ok(swapped.name.length > 0);
  assert.ok(swapped.type);
  assert.ok(swapped.searchQuery.length > 0);
  assert.ok(swapped.whyThis.length > 0);
});

test('E2E Loop: 8. ATS Resume Generation & Puppeteer PDF Generation', async () => {
  const resumeText = 'Senior Full Stack Engineer with 4 years in React, Node.js, and MongoDB.';
  const analysis = {
    targetRole: 'Senior Full Stack Engineer',
    matchedSkills: ['React', 'Node.js', 'MongoDB'],
    suggestions: ['Highlight Docker containerization experience.']
  };

  const html = await generateAtsResume(resumeText, analysis);
  assert.ok(typeof html === 'string');
  assert.ok(html.includes('<html') || html.includes('<h1>') || html.includes('<div'));

  // Test Puppeteer generating PDF buffer
  const pdfBuffer = await generatePdfFromHtml(html);
  assert.ok(Buffer.isBuffer(pdfBuffer));
  assert.ok(pdfBuffer.length > 1000);

  // Check PDF magic header "%PDF-"
  const header = pdfBuffer.subarray(0, 5).toString('ascii');
  assert.equal(header, '%PDF-');
});

test('E2E Loop: 9. Side-by-Side Analysis Comparison Calculation', () => {
  const analysisA = {
    matchScore: 65,
    matchedSkills: ['JavaScript', 'HTML', 'CSS', 'Node.js'],
    missingSkills: [
      { skill: 'Docker', importance: 'high' },
      { skill: 'TypeScript', importance: 'high' },
      { skill: 'GraphQL', importance: 'medium' }
    ]
  };

  const analysisB = {
    matchScore: 85,
    matchedSkills: ['JavaScript', 'HTML', 'CSS', 'Node.js', 'Docker', 'TypeScript'],
    missingSkills: [{ skill: 'GraphQL', importance: 'medium' }]
  };

  const scoreDelta = analysisB.matchScore - analysisA.matchScore;
  assert.equal(scoreDelta, 20);

  const matchedSetA = new Set(analysisA.matchedSkills.map((s) => s.toLowerCase()));
  const newlyMatchedSkills = analysisB.matchedSkills.filter((s) => !matchedSetA.has(s.toLowerCase()));
  assert.deepEqual(newlyMatchedSkills, ['Docker', 'TypeScript']);

  const missingSetB = new Set(analysisB.missingSkills.map((m) => m.skill.toLowerCase()));
  const resolvedSkills = analysisA.missingSkills.filter((m) => !missingSetB.has(m.skill.toLowerCase()));
  assert.equal(resolvedSkills.length, 2);
  assert.equal(resolvedSkills[0].skill, 'Docker');
  assert.equal(resolvedSkills[1].skill, 'TypeScript');
});

// Clean up browser handle on test completion
after(async () => {
  await closeBrowser();
});
