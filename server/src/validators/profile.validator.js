import { z } from 'zod';

export const updateProfileSchema = z.object({
  currentSkills: z
    .array(z.string().trim().min(1, 'Skill cannot be empty'))
    .optional()
    .default([]),
  targetRole: z
    .string()
    .trim()
    .max(100, 'Target role cannot exceed 100 characters')
    .optional()
    .default(''),
  jobDescription: z
    .string()
    .trim()
    .max(10000, 'Job description cannot exceed 10,000 characters')
    .optional()
    .default(''),
  preferredLanguage: z
    .enum(['en', 'hi'], {
      errorMap: () => ({ message: "Preferred language must be either 'en' or 'hi'" })
    })
    .optional()
    .default('en')
});

