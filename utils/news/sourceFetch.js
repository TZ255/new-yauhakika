import axios from 'axios';
import { NEWS_BROWSER_USER_AGENT, NEWS_FETCH_TIMEOUT_MS, NEWS_IMAGE_MAX_BYTES } from './config.js';

const FOOTBALL365_ORIGIN = 'https://www.football365.com';

function browserDocumentHeaders({ referer } = {}) {
  return {
    'User-Agent': NEWS_BROWSER_USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': referer ? 'same-origin' : 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    ...(referer ? { Referer: referer } : {}),
  };
}

function browserImageHeaders({ referer = FOOTBALL365_ORIGIN } = {}) {
  return {
    'User-Agent': NEWS_BROWSER_USER_AGENT,
    Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Fetch-Dest': 'image',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
    Referer: referer,
  };
}

function buildFetchError(err, url, kind) {
  const status = err.response?.status;
  const statusText = err.response?.statusText;
  const contentType = err.response?.headers?.['content-type'];
  const server = err.response?.headers?.server;
  const message = [
    `News ${kind} fetch failed`,
    status ? `status ${status}` : null,
    statusText,
    `url: ${url}`,
    err.message,
    contentType ? `content-type: ${contentType}` : null,
    server ? `server: ${server}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  const wrapped = new Error(message);
  wrapped.cause = err;
  wrapped.status = status;
  wrapped.url = url;
  return wrapped;
}

export async function fetchHtml(url, { referer } = {}) {
  let response;
  try {
    response = await axios.get(url, {
      timeout: NEWS_FETCH_TIMEOUT_MS,
      responseType: 'text',
      maxRedirects: 5,
      headers: browserDocumentHeaders({ referer }),
    });
  } catch (err) {
    throw buildFetchError(err, url, 'HTML');
  }

  return response.data;
}

export async function fetchBuffer(url, { maxBytes = NEWS_IMAGE_MAX_BYTES, referer } = {}) {
  let response;
  try {
    response = await axios.get(url, {
      timeout: NEWS_FETCH_TIMEOUT_MS,
      responseType: 'arraybuffer',
      maxContentLength: maxBytes,
      maxBodyLength: maxBytes,
      headers: browserImageHeaders({ referer }),
    });
  } catch (err) {
    throw buildFetchError(err, url, 'asset');
  }

  return {
    buffer: Buffer.from(response.data),
    contentType: response.headers['content-type'] || '',
  };
}
