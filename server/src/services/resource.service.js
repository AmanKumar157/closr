import https from 'https';
import mongoose from 'mongoose';
import { ResourceCache } from '../models/ResourceCache.js';
import { getDocsUrl } from '../config/docsMap.js';
import { ENV } from '../config/env.js';

/**
 * Normalizes query string for caching keys
 */
export const normalizeQueryKey = (type, query) => {
  const clean = (query || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 80);
  return `${type}_${clean}`;
};

/**
 * Makes an HTTPS GET request returning parsed JSON
 */
const httpsGetJson = (url) => {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        });
      })
      .on('error', (err) => reject(err));
  });
};

/**
 * Searches YouTube Data API v3 with quota protection and fallback
 */
export const searchYouTubeVideo = async (searchQuery, language = 'en') => {
  if (!ENV.YOUTUBE_API_KEY || ENV.YOUTUBE_API_KEY === 'your_youtube_api_key_here') {
    // Graceful fallback to YouTube direct search URL if API key is not configured
    const encoded = encodeURIComponent(searchQuery);
    return {
      url: `https://www.youtube.com/results?search_query=${encoded}`,
      title: `${searchQuery} Tutorial`,
      channel: 'YouTube Video Search',
      videoId: '',
      verified: false
    };
  }

  try {
    const encodedQuery = encodeURIComponent(searchQuery);
    const lang = language === 'hi' ? 'hi' : 'en';
    const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=3&relevanceLanguage=${lang}&q=${encodedQuery}&key=${ENV.YOUTUBE_API_KEY}`;

    const data = await httpsGetJson(apiUrl);
    const item = data.items?.[0];

    if (item && item.id?.videoId) {
      const videoId = item.id.videoId;
      return {
        url: `https://www.youtube.com/watch?v=${videoId}`,
        title: item.snippet?.title || searchQuery,
        channel: item.snippet?.channelTitle || 'YouTube Channel',
        videoId,
        verified: true
      };
    }
  } catch (err) {
    console.warn(`[YouTube API Warning] Search failed for "${searchQuery}": ${err.message}. Falling back to search URL.`);
  }

  // Fallback search link
  const fallbackQuery = encodeURIComponent(searchQuery);
  return {
    url: `https://www.youtube.com/results?search_query=${fallbackQuery}`,
    title: `${searchQuery} Tutorial`,
    channel: 'YouTube Search',
    videoId: '',
    verified: false
  };
};

/**
 * Resolves a milestone's resource into a verified or search-backed link
 * 
 * @param {object} resource - Resource metadata from milestone
 * @returns {Promise<object>} Resolved link and metadata
 */
export const resolveResource = async (resource) => {
  const { type, name, searchQuery, language = 'en' } = resource;

  // 1. Practice deliverables do not require external URLs
  if (type === 'practice') {
    return {
      url: '',
      title: name || 'Hands-on Deliverable Project',
      channel: 'Self-guided Project Brief',
      videoId: '',
      verified: true
    };
  }

  // 2. Check MongoDB ResourceCache
  const cacheKey = normalizeQueryKey(type, searchQuery || name);
  if (mongoose.connection.readyState === 1) {
    try {
      const cached = await ResourceCache.findOne({ key: cacheKey });
      if (cached && cached.resolved?.url) {
        return cached.resolved;
      }
    } catch (err) {
      console.warn('[ResourceCache Warning] Cache read error:', err.message);
    }
  }

  let resolved = null;

  // 3. Resolve by type
  if (type === 'video') {
    resolved = await searchYouTubeVideo(searchQuery || name, language);
  } else if (type === 'documentation') {
    // Check known official docs in DOCS_MAP
    const officialDoc = getDocsUrl(name) || getDocsUrl(searchQuery);
    if (officialDoc) {
      resolved = {
        url: officialDoc,
        title: `${name} Official Documentation`,
        channel: 'Official Documentation',
        videoId: '',
        verified: true
      };
    } else {
      // Fallback to verified search link
      const enc = encodeURIComponent(`${searchQuery || name} official documentation`);
      resolved = {
        url: `https://www.google.com/search?q=${enc}`,
        title: `${name} Documentation Search`,
        channel: 'Web Search',
        videoId: '',
        verified: false
      };
    }
  } else if (type === 'article') {
    const enc = encodeURIComponent(`${searchQuery || name} tutorial guide`);
    resolved = {
      url: `https://www.google.com/search?q=${enc}`,
      title: `${name} Article Guide`,
      channel: 'Web Article',
      videoId: '',
      verified: false
    };
  } else {
    resolved = {
      url: `https://www.google.com/search?q=${encodeURIComponent(searchQuery || name)}`,
      title: name,
      channel: 'Web Search',
      videoId: '',
      verified: false
    };
  }

  // Security: Enforce HTTPS only (never accept unencrypted http)
  if (resolved.url && !resolved.url.startsWith('https://')) {
    resolved.url = resolved.url.replace(/^http:\/\//i, 'https://');
  }

  // 4. Save into ResourceCache
  if (mongoose.connection.readyState === 1) {
    try {
      await ResourceCache.findOneAndUpdate(
        { key: cacheKey },
        { $set: { key: cacheKey, resolved, createdAt: new Date() } },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.warn('[ResourceCache Warning] Cache write error:', err.message);
    }
  }

  return resolved;
};
