import * as cheerio from 'cheerio';
import { fetchHtml } from '../sourceFetch.js';
import { normalizeUrl } from '../dedupe.js';
import {
  FOOTBALL365_ALL_NEWS_URL,
  FOOTBALL365_ARTICLE_PATH_RE,
  FOOTBALL365_SOURCE_ID,
  FOOTBALL365_SOURCE_NAME,
} from '../config.js';

function absoluteUrl(href, base = FOOTBALL365_ALL_NEWS_URL) {
  if (!href) return '';
  try {
    return new URL(href, base).toString();
  } catch {
    return '';
  }
}

function cleanText(value = '') {
  return value.replace(/\s+/g, ' ').trim();
}

function extractDate($, scope) {
  const datetime =
    scope.find('time[datetime]').first().attr('datetime') ||
    scope.find('[datetime]').first().attr('datetime') ||
    scope.find('time').first().text();

  const date = datetime ? new Date(cleanText(datetime)) : null;
  return date && !Number.isNaN(date.getTime()) ? date : undefined;
}

export async function discoverFootball365Articles({ limit = 10 } = {}) {
  const html = await fetchHtml(FOOTBALL365_ALL_NEWS_URL);
  const $ = cheerio.load(html);
  const seen = new Set();
  const candidates = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    const url = absoluteUrl(href);
    if (!url) return;

    const parsed = new URL(url);
    if (parsed.hostname !== 'www.football365.com' || !FOOTBALL365_ARTICLE_PATH_RE.test(parsed.pathname)) return;

    const normalized = normalizeUrl(url);
    if (seen.has(normalized)) return;

    const title = cleanText($(el).text());
    if (!title || title.length < 12) return;

    const card = $(el).closest('article, li, div');
    const excerpt = cleanText(card.find('p').first().text());
    const author = cleanText(card.find('[rel="author"], .author, .byline').first().text());

    seen.add(normalized);
    candidates.push({
      source: FOOTBALL365_SOURCE_ID,
      sourceName: FOOTBALL365_SOURCE_NAME,
      title,
      url: normalized,
      excerpt,
      author,
      publishedAt: extractDate($, card),
    });
  });

  return candidates.slice(0, limit);
}

function removeNoise($) {
  [
    'script',
    'style',
    'noscript',
    'iframe',
    'aside',
    'nav',
    'form',
    '.related',
    '.latest',
    '.advert',
    '.ad',
    '.social',
    '.share',
    '[class*="related"]',
    '[class*="advert"]',
    '[class*="share"]',
    '[id*="related"]',
  ].forEach((selector) => $(selector).remove());
}

function extractArticleBody($) {
  const root =
    $('article').first().length
      ? $('article').first()
      : $('[class*="article"], main').first();

  const parts = [];
  root.find('p, h2, h3, li, blockquote').each((_, el) => {
    const text = cleanText($(el).text());
    if (!text) return;
    if (/^(read more|related articles|more football news|latest football news)/i.test(text)) return;
    parts.push(text);
  });

  return parts.join('\n\n');
}

export async function extractFootball365Article(url) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  removeNoise($);

  const canonical = normalizeUrl($('link[rel="canonical"]').attr('href') || url);
  const title = cleanText($('h1').first().text() || $('meta[property="og:title"]').attr('content'));
  const description = cleanText($('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content'));
  const author = cleanText($('[rel="author"], .author, .byline').first().text());
  const publishedAt = extractDate($, $('body'));
  const imageUrl =
    absoluteUrl($('meta[property="og:image"]').attr('content'), canonical) ||
    absoluteUrl($('article img').first().attr('src'), canonical);
  const imageAlt = cleanText($('article img').first().attr('alt') || title);
  const text = extractArticleBody($);

  return {
    source: FOOTBALL365_SOURCE_ID,
    sourceName: FOOTBALL365_SOURCE_NAME,
    sourceUrl: url,
    canonicalUrl: canonical,
    title,
    description,
    author,
    publishedAt,
    imageUrl,
    imageAlt,
    text,
  };
}
