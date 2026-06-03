import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { slugify } from '../slugify.js';
import BlogPost from '../../models/blogPost.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BLOG_DIR = path.join(__dirname, '../../content/blog');

export function normalizeUrl(url) {
  const parsed = new URL(url);
  parsed.hash = '';
  const removable = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
  removable.forEach((key) => parsed.searchParams.delete(key));
  parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
  return parsed.toString();
}

export function hashArticle({ canonicalUrl = '', title = '', text = '' }) {
  const normalizedText = `${canonicalUrl}\n${title}\n${text}`
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  return crypto.createHash('sha256').update(normalizedText).digest('hex');
}

export async function uniqueSlug(baseTitleOrSlug) {
  const base = slugify(baseTitleOrSlug || 'makala-ya-soka') || 'makala-ya-soka';
  let slug = base;
  let suffix = 2;

  while ((await BlogPost.exists({ slug })) || (await slugExistsInFilePosts(slug))) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export async function slugExistsInFilePosts(slug) {
  const entries = await fs.readdir(BLOG_DIR).catch((err) => {
    if (err.code === 'ENOENT') return [];
    throw err;
  });

  for (const file of entries) {
    if (!file.endsWith('.md')) continue;
    if (path.basename(file, '.md') === slug) return true;

    const raw = await fs.readFile(path.join(BLOG_DIR, file), 'utf8');
    const { data } = matter(raw);
    if (data.slug === slug) return true;
  }

  return false;
}
