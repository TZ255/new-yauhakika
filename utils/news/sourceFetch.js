import axios from 'axios';
import { NEWS_BROWSER_USER_AGENT, NEWS_FETCH_TIMEOUT_MS, NEWS_IMAGE_MAX_BYTES } from './config.js';

export async function fetchHtml(url) {
  const response = await axios.get(url, {
    timeout: NEWS_FETCH_TIMEOUT_MS,
    responseType: 'text',
    maxRedirects: 5,
    headers: {
      'User-Agent': NEWS_BROWSER_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  return response.data;
}

export async function fetchBuffer(url, { maxBytes = NEWS_IMAGE_MAX_BYTES } = {}) {
  const response = await axios.get(url, {
    timeout: NEWS_FETCH_TIMEOUT_MS,
    responseType: 'arraybuffer',
    maxContentLength: maxBytes,
    maxBodyLength: maxBytes,
    headers: {
      'User-Agent': NEWS_BROWSER_USER_AGENT,
      Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    },
  });

  return {
    buffer: Buffer.from(response.data),
    contentType: response.headers['content-type'] || '',
  };
}
