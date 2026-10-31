import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aiAnalysisOutputSchema,
  computeAnalysisCacheHash,
  calculateAtsMatchScore,
  analyzeResume,
  generateAtsResume
} from '../src/services/gemini.service.js';

test('ATS Match Score: mathematically calculates dynamic scores instead of static 45', () => {
  // Scenario A: Candidate with weak match missing 4 high-priority skills (e.g. Cloud Engineer without AWS/Docker)
  const weakMatchSkills = ['SQL', 'Git', 'OS'];
  const heavyGaps = [
    { skill: 'AWS', importance: 'high' },
    { skill: 'Docker', importance: 'high' },
    { skill: 'Kubernetes', importance: 'high' },
    { skill: 'Terraform', importance: 'high' },
    { skill: 'CI/CD', importance: 'medium' }
  ];
  const weakScore = calculateAtsMatchScore(weakMatchSkills, heavyGaps, 30);
  assert.ok(weakScore >= 25 && weakScore <= 40, `Weak match should score between 25-40%, got ${weakScore}%`);

  // Scenario B: Mid-level candidate with 6 matched skills and only 3 missing (e.g. Python Dev with web skills)
  const midMatchSkills = ['SQL', 'PostgreSQL', 'REST APIs', 'Node.js', 'Express', 'Git'];
  const moderateGaps = [
    { skill: 'Python', importance: 'high' },
    { skill: 'Django', importance: 'high' },
    { skill: 'Unit Testing', importance: 'medium' }
  ];
  const midScore = calculateAtsMatchScore(midMatchSkills, moderateGaps, 45);
  assert.ok(midScore >= 52 && midScore <= 68, `Mid-level match should score between 52-68%, got ${midScore}%`);

  // Scenario C: Highly qualified senior candidate matching 10 skills with 1 minor gap
  const seniorSkills = ['Python', 'Django', 'FastAPI', 'Flask', 'PostgreSQL', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'PyTest'];
  const minorGaps = [{ skill: 'GraphQL', importance: 'low' }];
  const seniorScore = calculateAtsMatchScore(seniorSkills, minorGaps, 90);
  assert.ok(seniorScore >= 85 && seniorScore <= 98, `Senior match should score 85-98%, got ${seniorScore}%`);

  // Assert that each scenario produces a distinct, non-static score
  assert.notEqual(weakScore, midScore, 'Weak and Mid match scores must not be identical');
  assert.notEqual(midScore, seniorScore, 'Mid and Senior match scores must not be identical');
  assert.ok(seniorScore > midScore && midScore > weakScore, 'Scores must strictly scale with qualifications');
});

test('AI Analysis Validator: accepts valid Gemini analysis JSON', () => {
  const validOutput = {
    matchScore: 82,
    extractedSkills: ['React', 'JavaScript', 'HTML5', 'CSS3', 'REST APIs'],
    matchedSkills: ['React', 'JavaScript', 'REST APIs'],
    missingSkills: [
      { skill: 'TypeScript', importance: 'high' },
      { skill: 'Docker', importance: 'medium' },
      { skill: 'GraphQL', importance: 'low' }
    ],
    weakSections: ['Projects lack measurable metrics and performance numbers.'],
    suggestions: ['Add links to deployed projects and mention bundle size optimizations.']
  };

  const result = aiAnalysisOutputSchema.safeParse(validOutput);
  assert.equal(result.success, true);
  assert.equal(result.data.matchScore, 82);
  assert.equal(result.data.missingSkills.length, 3);
  assert.equal(result.data.missingSkills[0].importance, 'high');
});

test('AI Analysis Validator: rejects out-of-range match score', () => {
  const invalidOutput = {
    matchScore: 125, // Score must be 0-100
    extractedSkills: [],
    matchedSkills: [],
    missingSkills: [],
    weakSections: [],
    suggestions: []
  };

  const result = aiAnalysisOutputSchema.safeParse(invalidOutput);
  assert.equal(result.success, false);
});

test('AI Analysis Validator: rejects invalid missing skill importance enum', () => {
  const invalidOutput = {
    matchScore: 70,
    extractedSkills: [],
    matchedSkills: [],
    missingSkills: [{ skill: 'Kafka', importance: 'urgent' }], // Not 'high'|'medium'|'low'
    weakSections: [],
    suggestions: []
  };

  const result = aiAnalysisOutputSchema.safeParse(invalidOutput);
  assert.equal(result.success, false);
});

test('Caching: computes deterministic SHA-256 hash for identical queries', () => {
  const resume = 'Experienced full stack developer with 3 years building web applications in Node and React.';
  const role = 'Senior React Developer';
  const jd = 'Looking for senior developer with React and Node skills.';

  const hash1 = computeAnalysisCacheHash(resume, role, jd);
  const hash2 = computeAnalysisCacheHash(resume, role, jd);
  const hashDifferent = computeAnalysisCacheHash(resume, 'Backend Engineer', jd);

  assert.equal(hash1, hash2);
  assert.notEqual(hash1, hashDifferent);
  assert.equal(typeof hash1, 'string');
  assert.equal(hash1.length, 64); // SHA-256 hex length
});

test('AI Service: fallback simulation produces valid schema-compliant structure', async () => {
  const mockResume = 'Built microservices using Node.js, Express, and MongoDB. Familiar with Git and JavaScript.';
  const result = await analyzeResume(mockResume, 'Full Stack Engineer', '');

  assert.ok(typeof result.matchScore === 'number');
  assert.ok(result.matchScore >= 0 && result.matchScore <= 100);
  assert.ok(Array.isArray(result.extractedSkills));
  assert.ok(Array.isArray(result.matchedSkills));
  assert.ok(Array.isArray(result.missingSkills));
  assert.ok(Array.isArray(result.weakSections));
  assert.ok(Array.isArray(result.suggestions));

  const validation = aiAnalysisOutputSchema.safeParse(result);
  assert.equal(validation.success, true);
});

test('Tailored ATS Resume: produces customized HTML incorporating target role, company, required skills, and candidate details', async () => {
  const resume = 'Aman Kumar\nEmail: aman@example.com\nPhone: (555) 123-4567\nExperienced developer building backend services in Python and Django.';
  const analysisContext = {
    targetRole: 'Senior DevOps Specialist',
    companyName: 'Zepto Technologies',
    requiredSkills: ['Docker', 'Kubernetes', 'Terraform', 'CI/CD Pipelines'],
    jobDescription: 'Seeking a Senior DevOps Specialist to architect Kubernetes clusters and automate Terraform deployments for Zepto Technologies.'
  };

  const html = await generateAtsResume(resume, analysisContext);
  assert.ok(typeof html === 'string' && html.length > 50, 'Must return valid HTML string');
  assert.ok(html.includes('Aman Kumar'), 'Must preserve candidate real name');
  assert.ok(html.includes('Senior DevOps Specialist') || html.includes('DevOps'), 'Must tailor to target role');
  assert.ok(html.includes('Zepto'), 'Must tailor to target company');
  assert.ok(html.includes('Docker') || html.includes('Kubernetes'), 'Must include required skills');
});

test('Tailored ATS Resume: student education is NOT converted to employer, and specific tools are included', async () => {
  const studentResume = `Aman Kumar
aman@example.com | 9876543210
Final-year Computer Science undergraduate seeking an Engineering Support internship.
EDUCATION
Bennett University
Bachelor of Engineering, Computer Science - CGPA: 8.17 | Aug 2023 - Expected Aug 2027
TECHNICAL SKILLS
Operating Systems concepts, Databases (SQL, PostgreSQL), REST APIs`;

  const tailoringInput = {
    targetRole: 'Engineering Support Specialist',
    companyName: 'Zepto',
    experienceLevel: 'Fresher / Student (0-1 yrs)',
    specificTools: ['Postman', 'Jira', 'Linux'],
    requiredSkills: ['SQL', 'REST APIs', 'Troubleshooting'],
    jobDescription: 'Looking for an Engineering Support Specialist with Postman, Jira, and SQL troubleshooting skills.'
  };

  const html = await generateAtsResume(studentResume, tailoringInput);
  assert.ok(typeof html === 'string');
  assert.ok(html.includes('Aman Kumar'), 'Preserves real candidate name');
  assert.ok(html.includes('Bennett University'), 'Preserves college name');
  assert.ok(html.includes('Postman') || html.includes('Jira'), 'Includes user requested specific tools');
  // Verify Bennett University is NOT an employer under Experience
  const expMatch = html.match(/<h2>Professional Experience<\/h2>[\s\S]*?Bennett University/i);
  assert.equal(expMatch, null, 'Bennett University must NOT be fabricated as an employer under Professional Experience');
});

