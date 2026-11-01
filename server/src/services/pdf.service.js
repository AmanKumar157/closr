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

  const launchOptions = {
    headless: 'new',
    pipe: true, // Use stdio pipes instead of loopback WebSocket to prevent Windows port contention and sandbox blocks
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions'
    ]
  };

  try {
    cachedBrowser = await puppeteer.launch(launchOptions);
    cachedBrowser.on('disconnected', () => {
      cachedBrowser = null;
    });
    return cachedBrowser;
  } catch (err) {
    cachedBrowser = null;
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
  let browser;
  try {
    browser = await getBrowser();
  } catch (err) {
    cachedBrowser = null;
    browser = await getBrowser();
  }

  const page = await browser.newPage();

  try {
    // Set viewport and content with reasonable timeout
    await page.setContent(html || '<html><body><p>ATS Resume</p></body></html>', {
      waitUntil: ['load', 'domcontentloaded'],
      timeout: 15000
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
  } catch (err) {
    console.error('[PDF Service] Error rendering PDF page:', err.message);
    try {
      await browser.close();
    } catch (_) {}
    cachedBrowser = null;
    throw err;
  } finally {
    // Always close the tab/page to prevent memory leaks
    try {
      await page.close();
    } catch (_) {}
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

