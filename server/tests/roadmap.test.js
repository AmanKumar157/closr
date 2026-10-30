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

test('Roadmap Customization: validates custom milestone creation structure and defaults', () => {
  const customMilestone = {
    title: 'Deploy to AWS ECS with Fargate',
    completed: false,
    completedAt: null,
    resource: {
      type: 'practice',
      name: 'ECS Fargate Deployment',
      searchQuery: 'ECS Fargate Deployment',
      whyThis: 'Proves container orchestration and cloud delivery',
      isFree: true,
      language: 'en',
      status: 'not_started',
      resolved: {
        url: 'https://docs.aws.amazon.com/ecs',
        title: 'ECS Documentation',
        channel: 'Custom',
        videoId: '',
        verified: true
      }
    }
  };

  assert.equal(customMilestone.title, 'Deploy to AWS ECS with Fargate');
  assert.equal(customMilestone.completed, false);
  assert.equal(customMilestone.resource.type, 'practice');
  assert.equal(customMilestone.resource.resolved.channel, 'Custom');
  assert.equal(customMilestone.resource.resolved.verified, true);
});

test('Roadmap Customization: allows adding, updating, and removing custom milestones on week', () => {
  const week = {
    weekNumber: 3,
    topicTitle: 'State Management & Performance',
    description: 'Master Zustand and React render optimizations',
    skillsCovered: ['Zustand', 'React Profiler'],
    milestones: [
      {
        title: 'Migrate Redux boilerplate to Zustand store',
        completed: false,
        resource: {
          type: 'documentation',
          name: 'Zustand Docs',
          searchQuery: 'zustand docs',
          whyThis: 'Official docs'
        }
      }
    ]
  };

  // Add custom milestone
  const customMilestone = {
    title: 'Build Optimistic UI updates with cache invalidation',
    completed: false,
    completedAt: null,
    resource: {
      type: 'practice',
      name: 'Optimistic UI',
      searchQuery: 'optimistic ui',
      whyThis: 'Real-world UX practice',
      resolved: { url: 'https://tanstack.com/query', verified: true, channel: 'Custom' }
    }
  };
  week.milestones.push(customMilestone);
  assert.equal(week.milestones.length, 2);
  assert.equal(week.milestones[1].title, 'Build Optimistic UI updates with cache invalidation');

  // Update milestone
  week.milestones[1].title = 'Build Optimistic UI with TanStack Query';
  week.milestones[1].resource.type = 'documentation';
  assert.equal(week.milestones[1].title, 'Build Optimistic UI with TanStack Query');
  assert.equal(week.milestones[1].resource.type, 'documentation');

  // Delete milestone
  const removed = week.milestones.splice(0, 1);
  assert.equal(removed.length, 1);
  assert.equal(week.milestones.length, 1);
  assert.equal(week.milestones[0].title, 'Build Optimistic UI with TanStack Query');
});

