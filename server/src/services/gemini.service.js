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
