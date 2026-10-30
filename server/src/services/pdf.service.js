import puppeteer from 'puppeteer';
import { ENV } from '../config/env.js';

let cachedBrowser = null;

/**
 * Gets or initializes a singleton Puppeteer browser instance
 */
const getBrowser = async () => {
  if (cachedBrowser && cachedBrowser.connected) {
    return cachedBrowser;
  }

  const isProduction = ENV.NODE_ENV === 'production';

  const launchOptions = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  };

  try {
    cachedBrowser = await puppeteer.launch(launchOptions);
    return cachedBrowser;
  } catch (err) {
    console.error('[PDF Service] Error launching Puppeteer browser:', err.message);
    throw err;
  }
};

/**
 * Generates an ATS-compliant PDF buffer from clean HTML
 * 
 * @param {string} html - Valid HTML string
 * @returns {Promise<Buffer>} PDF Buffer
 */
export const generatePdfFromHtml = async (html) => {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Set viewport and content
    await page.setContent(html, {
      waitUntil: ['load', 'networkidle0'],
      timeout: 30000
    });

    // Generate A4 PDF with 15mm margins and printBackground on
    const pdfBytes = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      }
    });

    return Buffer.from(pdfBytes);
  } finally {
    // Always close the tab/page to prevent memory leaks
    await page.close();
  }
};

/**
 * Closes the cached browser instance (used on graceful shutdown or in tests)
 */
export const closeBrowser = async () => {
  if (cachedBrowser) {
    try {
      await cachedBrowser.close();
    } catch (e) {
      // Ignore
    }
    cachedBrowser = null;
  }
};

