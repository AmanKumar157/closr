import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import path from 'path';
import { ApiError } from '../utils/ApiError.js';

export const MIN_RESUME_CHAR_COUNT = 200;

/**
 * Clean and normalize extracted resume text
 * @param {string} rawText
 * @returns {string}
 */
const sanitizeExtractedText = (rawText) => {
  return rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    // Replace 3 or more consecutive newlines with 2 newlines
    .replace(/\n{3,}/g, '\n\n')
    // Remove control characters except standard line breaks
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
};

/**
 * Extracts plain text from an uploaded file Buffer (PDF or DOCX).
 * Rejects image-only/scanned files under 200 characters.
 * 
 * @param {Buffer} buffer - File buffer from Multer memory storage
 * @param {string} originalName - Original filename with extension
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<string>} Cleaned resume text
 */
export const extractResumeText = async (buffer, originalName = '', mimeType = '') => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new ApiError(400, 'Invalid file buffer provided for text extraction.');
  }

  const ext = path.extname(originalName).toLowerCase();
  let extractedText = '';

  try {
    if (ext === '.pdf' || mimeType === 'application/pdf') {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy();
      extractedText = result?.text || '';
    } else if (
      ext === '.docx' ||
      ext === '.doc' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result?.value || '';
    } else {
      throw new ApiError(400, `Unsupported file format '${ext}'. Please upload a PDF or DOCX resume.`);
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(400, `Failed to parse resume file: ${err.message}`);
  }

  const cleanedText = sanitizeExtractedText(extractedText);

  // Friendly error for scanned / image-based PDFs or empty files
  if (cleanedText.length < MIN_RESUME_CHAR_COUNT) {
    throw new ApiError(
      422,
      `We could not extract readable text from your file (${cleanedText.length} characters detected). ` +
      `If this is a scanned PDF image or an image-heavy export, please upload a standard text-based PDF or DOCX file (at least 200 characters).`
    );
  }

  return cleanedText;
};

