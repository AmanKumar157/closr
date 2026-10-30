import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aiAnalysisOutputSchema,
  computeAnalysisCacheHash,
  analyzeResume
} from '../src/services/gemini.service.js';

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
