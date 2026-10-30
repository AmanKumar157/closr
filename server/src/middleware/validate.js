import { ApiError } from '../utils/ApiError.js';

/**
 * Middleware factory for validating incoming requests against a Zod schema.
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body'|'query'|'params'} source - Request property to validate ('body', 'query', or 'params')
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req[source]);
      if (!result.success) {
        const errorDetails = result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));
        return next(new ApiError(400, 'Validation failed', errorDetails));
      }
      // Replace with parsed/sanitized data from Zod
      req[source] = result.data;
      next();
    } catch (err) {
      next(err);
    }
  };
};
