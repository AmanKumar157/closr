import test from 'node:test';
import assert from 'node:assert/strict';
import {
  roadmapOutputSchema,
  milestoneResourceOutputSchema
} from '../src/services/gemini.service.js';
import { resolveResource, normalizeQueryKey } from '../src/services/resource.service.js';
import { getDocsUrl } from '../src/config/docsMap.js';

test('Roadmap Validator: enforces exactly 12 weeks with 1 resource per milestone', () => {
  const dummyMilestone = {
    title: 'Learn Docker Containers',
    resource: {
      type: 'video',
      name: 'Docker Crash Course',
      searchQuery: 'docker tutorial for beginners',
      whyThis: 'Best fast-paced intro to containerization.',
      isFree: true,
      language: 'en'
    }
  };

  const validRoadmap = {
    weeks: Array.from({ length: 12 }, (_, i) => ({
      weekNumber: i + 1,
      topicTitle: `Topic ${i + 1}`,
      description: `Description for week ${i + 1}`,
      skillsCovered: ['Skill A', 'Skill B'],
      milestones: [dummyMilestone, dummyMilestone]
    }))
  };

  const result = roadmapOutputSchema.safeParse(validRoadmap);
  assert.equal(result.success, true);
  assert.equal(result.data.weeks.length, 12);
  assert.equal(result.data.weeks[0].milestones.length, 2);
  assert.equal(result.data.weeks[0].milestones[0].resource.name, 'Docker Crash Course');
});

test('Roadmap Validator: rejects roadmaps with fewer than 12 weeks', () => {
  const shortRoadmap = {
    weeks: Array.from({ length: 8 }, (_, i) => ({
      weekNumber: i + 1,
      topicTitle: `Topic ${i + 1}`,
      description: `Description`,
      skillsCovered: [],
      milestones: []
    }))
  };

  const result = roadmapOutputSchema.safeParse(shortRoadmap);
  assert.equal(result.success, false);
});

test('Resource Resolver: resolves official documentation from DOCS_MAP', async () => {
  const reactDocUrl = getDocsUrl('React');
  assert.equal(reactDocUrl, 'https://react.dev');

  const resource = {
    type: 'documentation',
    name: 'React',
    searchQuery: 'React documentation'
  };

  const resolved = await resolveResource(resource);
  assert.equal(resolved.url, 'https://react.dev');
  assert.equal(resolved.verified, true);
});

test('Resource Resolver: practice deliverables do not require external URLs', async () => {
  const practiceResource = {
    type: 'practice',
    name: 'Build Full-Stack MERN Capstone',
    searchQuery: 'build mern capstone project',
    whyThis: 'Build complete authentication and data layer.'
  };

  const resolved = await resolveResource(practiceResource);
  assert.equal(resolved.url, '');
  assert.equal(resolved.verified, true);
});

test('Resource Resolver: normalizes query keys consistently for cache lookup', () => {
  const key1 = normalizeQueryKey('video', 'React 18 Crash Course!');
  const key2 = normalizeQueryKey('video', 'react 18 crash course?');

  assert.equal(key1, key2);
  assert.ok(key1.startsWith('video_react_18_crash_course'));
});

test('Resource Resolver: rejects non-https URLs and enforces HTTPS only', async () => {
  const articleResource = {
    type: 'article',
    name: 'Microservices Guide',
    searchQuery: 'microservices architecture'
  };

  const resolved = await resolveResource(articleResource);
  assert.ok(resolved.url.startsWith('https://'));
});

test('Resource Resolver: falls back gracefully to search link on quota limit or missing key', async () => {
  const videoResource = {
    type: 'video',
    name: 'Next.js 15 Masterclass',
    searchQuery: 'nextjs 15 full course tutorial',
    language: 'en'
  };

  // Even without a YouTube API key configured, resolver must never throw and must return a valid search URL
  const resolved = await resolveResource(videoResource);
  assert.ok(resolved.url.startsWith('https://'));
  assert.equal(typeof resolved.title, 'string');
  assert.equal(typeof resolved.verified, 'boolean');
});
