import { GoogleGenAI, Type } from '@google/genai';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { z } from 'zod';
import { ENV } from '../config/env.js';
import { PROMPTS } from './prompts.js';
import { Analysis } from '../models/Analysis.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Zod schema to validate structured JSON output from Gemini.
 * Mentor note: LLMs can occasionally return unexpected keys or omit required fields.
 * Zod gives us a strict runtime boundary that guarantees our frontend and database
 * always receive a predictable shape.
 */
export const aiAnalysisOutputSchema = z.object({
  matchScore: z.number().int().min(0).max(100),
  extractedSkills: z.array(z.string().trim()).default([]),
  matchedSkills: z.array(z.string().trim()).default([]),
  missingSkills: z
    .array(
      z.object({
        skill: z.string().trim(),
        importance: z.enum(['high', 'medium', 'low']).default('medium')
      })
    )
    .default([]),
  weakSections: z.array(z.string().trim()).default([]),
  suggestions: z.array(z.string().trim()).default([])
});

/**
 * Gemini response schema definition for structured output.
 * Mentor note: responseSchema forces Gemini's decoder to adhere to this JSON structure
 * at the token-generation level, drastically reducing malformed responses.
 */
const analysisResponseSchema = {
  type: Type.OBJECT,
  properties: {
    matchScore: { type: Type.INTEGER, description: 'ATS match score from 0 to 100' },
    extractedSkills: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Skills explicitly mentioned or demonstrated in the resume'
    },
    matchedSkills: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Candidate skills that align with the target role'
    },
    missingSkills: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          skill: { type: Type.STRING, description: 'Skill name' },
          importance: {
            type: Type.STRING,
            enum: ['high', 'medium', 'low'],
            description: 'Criticality of this skill for the target position'
          }
        },
        required: ['skill', 'importance']
      },
      description: 'Key skills required by the role that are absent in the resume'
    },
    weakSections: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Sections in the resume needing improvement (e.g. lack of quantified impact)'
    },
    suggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Concrete, actionable steps to boost ATS score and interview readiness'
    }
  },
  required: ['matchScore', 'extractedSkills', 'matchedSkills', 'missingSkills', 'weakSections', 'suggestions']
};

/**
 * Helper to compute a deterministic SHA-256 hash for cache lookups
 */
export const computeAnalysisCacheHash = (resumeText, targetRole, jobDescription = '') => {
  return crypto
    .createHash('sha256')
    .update(`${resumeText.trim()}|${targetRole.trim().toLowerCase()}|${(jobDescription || '').trim().toLowerCase()}`)
    .digest('hex');
};

/**
 * Sleep helper for exponential backoff retries
 */
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Exponential backoff wrapper for API rate-limiting (429 / 503 errors)
 */
const callWithRetry = async (fn, maxRetries = 3, initialDelayMs = 1000) => {
  let delay = initialDelayMs;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRateLimit = err?.status === 429 || err?.message?.includes('429');
      const isServerUnavailable = err?.status === 503 || err?.message?.includes('503');
      const isRetryable = isRateLimit || isServerUnavailable;

      if (isRetryable && attempt < maxRetries) {
        console.warn(`[Gemini API] Encountered ${err.status || 'transient error'}. Retrying in ${delay}ms (Attempt ${attempt}/${maxRetries})...`);
        await wait(delay);
        delay *= 2; // Exponential backoff: 1s -> 2s -> 4s
      } else {
        throw err;
      }
    }
  }
};

/**
 * Sanitize text fields returned by AI before persisting
 */
const sanitizeAnalysisResult = (result) => {
  return {
    matchScore: Math.max(0, Math.min(100, Math.round(result.matchScore))),
    extractedSkills: (result.extractedSkills || []).map((s) => s.trim()).filter(Boolean),
    matchedSkills: (result.matchedSkills || []).map((s) => s.trim()).filter(Boolean),
    missingSkills: (result.missingSkills || []).map((m) => ({
      skill: m.skill.trim(),
      importance: ['high', 'medium', 'low'].includes(m.importance) ? m.importance : 'medium'
    })),
    weakSections: (result.weakSections || []).map((w) => w.trim()).filter(Boolean),
    suggestions: (result.suggestions || []).map((s) => s.trim()).filter(Boolean)
  };
};

/**
 * Analyze candidate resume against target role / JD using Gemini
 * 
 * @param {string} resumeText - Extracted text of candidate resume
 * @param {string} targetRole - Desired job title
 * @param {string} jobDescription - Optional target job description
 * @returns {Promise<object>} Structured analysis object
 */
export const analyzeResume = async (resumeText, targetRole, jobDescription = '') => {
  if (!resumeText || resumeText.length < 50) {
    throw new ApiError(400, 'Resume text is insufficient for analysis.');
  }
  if (!targetRole) {
    throw new ApiError(400, 'Target role is required for resume analysis.');
  }

  // 1. Check MongoDB Cache: If an identical resume + role + JD query was analyzed before, return cached result
  const cacheHash = computeAnalysisCacheHash(resumeText, targetRole, jobDescription);
  if (mongoose.connection.readyState === 1) {
    const cachedAnalysis = await Analysis.findOne({ cacheHash }).select('-__v');
    if (cachedAnalysis) {
      console.log(`[Cache Hit] Serving cached resume analysis for hash: ${cacheHash}`);
      return {
        matchScore: cachedAnalysis.matchScore,
        extractedSkills: cachedAnalysis.extractedSkills,
        matchedSkills: cachedAnalysis.matchedSkills,
        missingSkills: cachedAnalysis.missingSkills,
        weakSections: cachedAnalysis.weakSections,
        suggestions: cachedAnalysis.suggestions,
        isCached: true,
        cacheHash
      };
    }
  }

  // Fallback heuristic simulation if GEMINI_API_KEY is not yet configured in local development
  if (!ENV.GEMINI_API_KEY || ENV.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.warn('[Gemini Service] GEMINI_API_KEY not configured. Generating high-fidelity development analysis.');
    return generateDevAnalysisFallback(resumeText, targetRole, jobDescription, cacheHash);
  }

  // 2. Initialize Google GenAI client
  const ai = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY });
  const prompt = PROMPTS.formatAnalyzeResumePrompt({ resumeText, targetRole, jobDescription });

  // 3. Retry loop for Schema validation (retries up to 2 times on Zod parse failure)
  const maxSchemaValidationRetries = 2;
  let lastValidationError = null;

  for (let attempt = 1; attempt <= maxSchemaValidationRetries + 1; attempt++) {
    try {
      // Execute with exponential backoff on 429/503
      const response = await callWithRetry(async () => {
        return await ai.models.generateContent({
          model: ENV.GEMINI_MODEL, // Never hardcoded, read from environment
          contents: prompt,
          config: {
            systemInstruction: PROMPTS.ANALYZE_RESUME_SYSTEM,
            temperature: 0.25, // Controlled temperature (0.2-0.3) for factual, deterministic analysis
            responseMimeType: 'application/json',
            responseSchema: analysisResponseSchema
          }
        });
      });

      const rawJson = response.text;
      if (!rawJson) {
        throw new Error('Gemini returned an empty response.');
      }

      const parsedData = JSON.parse(rawJson);

      // Validate against strict Zod schema
      const validationResult = aiAnalysisOutputSchema.safeParse(parsedData);
      if (!validationResult.success) {
        console.warn(`[Gemini Validation] Attempt ${attempt} failed schema validation:`, validationResult.error.message);
        lastValidationError = validationResult.error;
        continue; // Retry generation
      }

      const sanitizedResult = sanitizeAnalysisResult(validationResult.data);
      return {
        ...sanitizedResult,
        isCached: false,
        cacheHash
      };
    } catch (err) {
      console.error(`[Gemini Error] Attempt ${attempt} error:`, err.message);
      lastValidationError = err;
      if (attempt > maxSchemaValidationRetries) break;
      await wait(1000);
    }
  }

  throw new ApiError(
    502,
    `AI analysis failed after multiple attempts: ${lastValidationError?.message || 'Invalid model response'}`
  );
};

/**
 * Intelligent dev-mode fallback when no Gemini API key is provided
 */
function generateDevAnalysisFallback(resumeText, targetRole, jobDescription, cacheHash) {
  const commonTech = [
    'React', 'Node.js', 'Express', 'MongoDB', 'JavaScript', 'TypeScript',
    'HTML', 'CSS', 'Tailwind CSS', 'Redux', 'Git', 'Docker', 'AWS', 'REST APIs',
    'PostgreSQL', 'Python', 'Next.js', 'GraphQL', 'CI/CD'
  ];

  const lowerResume = resumeText.toLowerCase();
  const extractedSkills = commonTech.filter((tech) => lowerResume.includes(tech.toLowerCase()));
  if (extractedSkills.length === 0) {
    extractedSkills.push('JavaScript', 'Git', 'Web Development');
  }

  const roleKeywords = targetRole.toLowerCase().split(/\s+/);
  const matchedSkills = extractedSkills.slice(0, Math.ceil(extractedSkills.length * 0.7));
  const missingPool = commonTech.filter((tech) => !extractedSkills.includes(tech));

  const missingSkills = [
    { skill: missingPool[0] || 'TypeScript', importance: 'high' },
    { skill: missingPool[1] || 'Docker', importance: 'high' },
    { skill: missingPool[2] || 'CI/CD', importance: 'medium' },
    { skill: missingPool[3] || 'System Architecture', importance: 'low' }
  ];

  const matchScore = Math.min(88, Math.max(52, Math.round((matchedSkills.length / (matchedSkills.length + missingSkills.length)) * 100)));

  return {
    matchScore,
    extractedSkills,
    matchedSkills,
    missingSkills,
    weakSections: [
      'Project descriptions lack measurable business impact or performance metrics.',
      'Work experience does not highlight experience with automated testing and continuous integration.',
      'Professional summary could be more focused on your target role as ' + targetRole + '.'
    ],
    suggestions: [
      'Quantify results in previous projects (e.g. "improved load time by 35%", "reduced API latency").',
      'Add a dedicated technical skills section grouped by frontend, backend, database, and devops.',
      'Bridge key gaps in containerization (Docker) and TypeScript to match modern ATS criteria for ' + targetRole + '.'
    ],
    isCached: false,
    cacheHash
  };
}

/**
 * Roadmap Zod Schemas
 */
export const milestoneResourceOutputSchema = z.object({
  type: z.enum(['video', 'documentation', 'article', 'practice']),
  name: z.string().trim().min(1),
  searchQuery: z.string().trim().min(1),
  whyThis: z.string().trim().min(1),
  isFree: z.boolean().default(true),
  language: z.enum(['en', 'hi']).default('en')
});

export const milestoneOutputSchema = z.object({
  title: z.string().trim().min(1),
  resource: milestoneResourceOutputSchema
});

export const weekOutputSchema = z.object({
  weekNumber: z.number().int().min(1).max(12),
  topicTitle: z.string().trim().min(1),
  description: z.string().trim().min(1),
  skillsCovered: z.array(z.string().trim()).default([]),
  milestones: z.array(milestoneOutputSchema).min(1).max(5)
});

export const roadmapOutputSchema = z.object({
  weeks: z.array(weekOutputSchema).length(12)
});

/**
 * Gemini responseSchema for 12-week Roadmap
 */
const roadmapResponseSchema = {
  type: Type.OBJECT,
  properties: {
    weeks: {
      type: Type.ARRAY,
      description: 'Exactly 12 weeks of structured learning milestones',
      items: {
        type: Type.OBJECT,
        properties: {
          weekNumber: { type: Type.INTEGER, description: 'Week index from 1 to 12' },
          topicTitle: { type: Type.STRING, description: 'Core theme for the week' },
          description: { type: Type.STRING, description: 'Learning goals and deliverables for this week' },
          skillsCovered: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Skills learned or practiced this week'
          },
          milestones: {
            type: Type.ARRAY,
            description: '2 to 4 concrete action items with deliverables',
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: 'Milestone task deliverable' },
                resource: {
                  type: Type.OBJECT,
                  description: 'Exactly one curated resource for this milestone',
                  properties: {
                    type: {
                      type: Type.STRING,
                      enum: ['video', 'documentation', 'article', 'practice'],
                      description: 'Type of resource'
                    },
                    name: { type: Type.STRING, description: 'Well-known name of the resource or tutorial' },
                    searchQuery: { type: Type.STRING, description: '3 to 8 word search query to locate it' },
                    whyThis: { type: Type.STRING, description: 'Why this resource under 20 words' },
                    isFree: { type: Type.BOOLEAN, description: 'Whether the resource is free' },
                    language: { type: Type.STRING, enum: ['en', 'hi'], description: 'Language preference' }
                  },
                  required: ['type', 'name', 'searchQuery', 'whyThis', 'isFree', 'language']
                }
              },
              required: ['title', 'resource']
            }
          }
        },
        required: ['weekNumber', 'topicTitle', 'description', 'skillsCovered', 'milestones']
      }
    }
  },
  required: ['weeks']
};

/**
 * Generate 12-Week Roadmap from Skill Gaps
 */
export const generateRoadmap = async (analysis, preferences = {}, remainingGapsOnly = false) => {
  const { targetRole, missingSkills = [], matchedSkills = [] } = analysis;
  const preferredLanguage = preferences.preferredLanguage || 'en';

  const skillsToTarget = missingSkills.map((m) => `${m.skill} (Importance: ${m.importance})`);

  const userPrompt = `TARGET ROLE:
${targetRole}

SKILL GAPS TO CLOSE:
${skillsToTarget.length > 0 ? skillsToTarget.join(', ') : 'Advanced system architecture and production design'}

ALREADY KNOWN SKILLS:
${matchedSkills.slice(0, 8).join(', ') || 'Core programming'}

PREFERRED RESOURCE LANGUAGE:
${preferredLanguage} (If 'hi', prioritize Hindi video tutorials where available)

REMAINING GAPS ONLY MODE:
${remainingGapsOnly ? 'YES - Focus strictly on the remaining missing skills' : 'NO'}

Create exactly 12 weeks. Each week must have 2 to 4 milestones. Each milestone must have exactly ONE resource. Output resource type, a real well-known resource NAME, a 3-8 word SEARCH QUERY and a whyThis under 20 words. NEVER output URLs.`;

  if (!ENV.GEMINI_API_KEY || ENV.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.warn('[Gemini Service] Using dev-mode simulated 12-week roadmap generator.');
    return generateDevRoadmapFallback(targetRole, missingSkills, preferredLanguage);
  }

  const ai = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY });
  const maxRetries = 2;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const response = await callWithRetry(async () => {
        return await ai.models.generateContent({
          model: ENV.GEMINI_MODEL,
          contents: userPrompt,
          config: {
            systemInstruction: PROMPTS.ROADMAP_SYSTEM,
            temperature: 0.6,
            responseMimeType: 'application/json',
            responseSchema: roadmapResponseSchema
          }
        });
      });

      const parsed = JSON.parse(response.text);
      const validation = roadmapOutputSchema.safeParse(parsed);
      if (!validation.success) {
        console.warn(`[Roadmap Validation] Attempt ${attempt} failed:`, validation.error.message);
        lastError = validation.error;
        continue;
      }

      return validation.data;
    } catch (err) {
      console.error(`[Roadmap Error] Attempt ${attempt}:`, err.message);
      lastError = err;
      if (attempt > maxRetries) break;
      await wait(1000);
    }
  }

  throw new ApiError(502, `Failed to generate 12-week roadmap: ${lastError?.message || 'Invalid model output'}`);
};

/**
 * AI Resource Swap (Swap out a milestone's resource)
 */
export const swapResource = async (milestone, excludedResource) => {
  const userPrompt = `MILESTONE DELIVERABLE:
${milestone.title}

PREVIOUS RESOURCE (DO NOT RE-USE THIS ONE):
Name: ${excludedResource?.name || ''}
Type: ${excludedResource?.type || ''}
Query: ${excludedResource?.searchQuery || ''}

Provide a different, high quality alternative resource for this deliverable. Return JSON with keys: type, name, searchQuery, whyThis, isFree, language.`;

  if (!ENV.GEMINI_API_KEY || ENV.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    return {
      type: excludedResource?.type === 'video' ? 'documentation' : 'video',
      name: `Alternative Resource for ${milestone.title}`,
      searchQuery: `${milestone.title} crash course tutorial`,
      whyThis: 'Comprehensive alternative with practical hands-on examples.',
      isFree: true,
      language: excludedResource?.language || 'en'
    };
  }

  const ai = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY });
  const swapResponseSchema = {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING, enum: ['video', 'documentation', 'article', 'practice'] },
      name: { type: Type.STRING },
      searchQuery: { type: Type.STRING },
      whyThis: { type: Type.STRING },
      isFree: { type: Type.BOOLEAN },
      language: { type: Type.STRING, enum: ['en', 'hi'] }
    },
    required: ['type', 'name', 'searchQuery', 'whyThis', 'isFree', 'language']
  };

  const response = await callWithRetry(async () => {
    return await ai.models.generateContent({
      model: ENV.GEMINI_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: 'You are a career mentor. Recommend an alternative learning resource. Output JSON only. NEVER output URLs.',
        temperature: 0.7,
        responseMimeType: 'application/json',
        responseSchema: swapResponseSchema
      }
    });
  });

  const parsed = JSON.parse(response.text);
  return milestoneResourceOutputSchema.parse(parsed);
};

/**
 * Generate ATS-Friendly HTML Resume
 */
export const generateAtsResume = async (resumeText, analysis) => {
  const userPrompt = `CANDIDATE ORIGINAL RESUME:
${resumeText}

TARGET ROLE:
${analysis.targetRole}

MATCHED STRENGTHS:
${analysis.matchedSkills?.join(', ') || 'Full stack engineering'}

SUGGESTIONS TO INCORPORATE:
${analysis.suggestions?.join('; ') || 'Quantify impact'}

Rewrite this resume as clean, semantic HTML according to ATS standards. Return raw HTML only.`;

  if (!ENV.GEMINI_API_KEY || ENV.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    return generateDevAtsHtmlFallback(analysis.targetRole, resumeText);
  }

  const ai = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY });
  const response = await callWithRetry(async () => {
    return await ai.models.generateContent({
      model: ENV.GEMINI_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: PROMPTS.ATS_RESUME_SYSTEM,
        temperature: 0.3
      }
    });
  });

  let rawHtml = response.text || '';
  rawHtml = rawHtml.replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim();
  return rawHtml;
};

/**
 * Dev fallback 12-week roadmap generator
 */
function generateDevRoadmapFallback(targetRole, missingSkills, language) {
  const gapNames = (missingSkills || []).map((m) => m.skill);
  const weeks = [];

  const coreTopics = [
    { title: 'Core Foundations & Architectural Patterns', gap: gapNames[0] || 'TypeScript' },
    { title: 'Advanced Typing & Data Modeling', gap: gapNames[0] || 'TypeScript' },
    { title: 'Containerization & Microservices Basics', gap: gapNames[1] || 'Docker' },
    { title: 'Multi-Container Workflows & Docker Compose', gap: gapNames[1] || 'Docker' },
    { title: 'Automated Testing & Quality Assurance', gap: gapNames[2] || 'Jest Testing' },
    { title: 'Continuous Integration & Deployment (CI/CD)', gap: gapNames[2] || 'GitHub Actions' },
    { title: 'Scalable Database Design & Indexing', gap: gapNames[3] || 'Database Tuning' },
    { title: 'Security Best Practices, Auth & Rate Limiting', gap: 'API Security' },
    { title: 'State Management & Realtime Communication', gap: 'WebSockets & Caching' },
    { title: 'Full-Stack Integration Capstone (Part 1)', gap: targetRole },
    { title: 'Full-Stack Integration Capstone (Part 2)', gap: targetRole },
    { title: 'ATS Portfolio Polish, Live Deployment & Interview Prep', gap: 'Production Launch' }
  ];

  for (let i = 1; i <= 12; i++) {
    const topic = coreTopics[i - 1];
    weeks.push({
      weekNumber: i,
      topicTitle: topic.title,
      description: `Master ${topic.gap} and apply it to industry-standard deliverables for ${targetRole}.`,
      skillsCovered: [topic.gap, 'Production Engineering'],
      milestones: [
        {
          title: `Milestone ${i}.1: Study concepts of ${topic.gap}`,
          completed: false,
          resource: {
            type: 'video',
            name: `${topic.gap} Full Course for Beginners`,
            searchQuery: `${topic.gap} full tutorial beginner to intermediate`,
            whyThis: `Top-rated free crash course covering practical ${topic.gap}.`,
            isFree: true,
            language: language || 'en',
            status: 'not_started',
            resolved: {}
          }
        },
        {
          title: `Milestone ${i}.2: Review official documentation & best practices`,
          completed: false,
          resource: {
            type: 'documentation',
            name: topic.gap,
            searchQuery: `${topic.gap} documentation`,
            whyThis: 'Official docs give the most accurate and up-to-date syntax.',
            isFree: true,
            language: language || 'en',
            status: 'not_started',
            resolved: {}
          }
        },
        {
          title: `Milestone ${i}.3: Build hands-on mini deliverable using ${topic.gap}`,
          completed: false,
          resource: {
            type: 'practice',
            name: `${topic.gap} Mini Project`,
            searchQuery: `build mini project with ${topic.gap}`,
            whyThis: `Build and test a miniature practical module implementing ${topic.gap}.`,
            isFree: true,
            language: language || 'en',
            status: 'not_started',
            resolved: {}
          }
        }
      ]
    });
  }

  return { weeks };
}

/**
 * Dev fallback HTML resume generator
 */
function generateDevAtsHtmlFallback(targetRole, resumeText) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; line-height: 1.5; color: #111; max-width: 800px; margin: 0 auto; padding: 20px; font-size: 11pt; }
  h1 { font-size: 20pt; text-align: center; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }
  .contact { text-align: center; font-size: 10pt; margin-bottom: 20px; color: #444; }
  h2 { font-size: 13pt; border-bottom: 1px solid #333; padding-bottom: 2px; margin-top: 18px; margin-bottom: 8px; text-transform: uppercase; }
  .item-header { display: flex; justify-content: space-between; font-weight: bold; margin-top: 8px; }
  .item-sub { display: flex; justify-content: space-between; font-style: italic; font-size: 10pt; margin-bottom: 4px; }
  ul { margin: 4px 0 10px 18px; padding: 0; }
  li { margin-bottom: 3px; }
</style>
</head>
<body>
  <h1>Alex Morgan</h1>
  <div class="contact">alex.morgan@example.com | (555) 234-5678 | San Francisco, CA | github.com/alexmorgan | linkedin.com/in/alexmorgan</div>
  
  <h2>Professional Summary</h2>
  <p>Results-driven ${targetRole} with proven expertise designing and delivering high-performance full-stack web applications. Skilled in modern JavaScript, React, Node.js, and cloud deployments, with a strong focus on clean architecture, ATS alignment, and scalable API design.</p>
  
  <h2>Technical Skills</h2>
  <p><strong>Languages & Frameworks:</strong> JavaScript (ES6+), TypeScript, React, Node.js, Express, HTML5, CSS3, Tailwind CSS<br>
  <strong>Databases & Tools:</strong> MongoDB, PostgreSQL, Mongoose, Git, Docker, RESTful APIs, Jest</p>
  
  <h2>Professional Experience</h2>
  <div class="item-header"><span>Software Engineer</span><span>Tech Innovations Inc.</span></div>
  <div class="item-sub"><span>Full-Stack Development</span><span>2022 - Present</span></div>
  <ul>
    <li>Architected responsive web applications using React and Node.js, decreasing client load latency by 28%.</li>
    <li>Built robust RESTful microservices with Express and MongoDB, serving over 100,000 monthly active users.</li>
    <li>Collaborated across agile engineering teams to conduct peer reviews and optimize CI/CD release pipelines.</li>
  </ul>
  
  <h2>Key Projects</h2>
  <div class="item-header"><span>CareerPilot AI Web Platform</span><span>2024</span></div>
  <ul>
    <li>Engineered an AI-powered resume and roadmap engine with real-time skill-gap resolution and ATS PDF generation.</li>
    <li>Implemented secure authentication with JWT in httpOnly cookies, rate limiting, and automated test coverage.</li>
  </ul>
  
  <h2>Education</h2>
  <div class="item-header"><span>B.S. in Computer Science</span><span>State University</span></div>
</body>
</html>`;
}
