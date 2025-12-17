import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { marked } from 'marked';
import { slugify } from './slugify.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BLOG_DIR = path.join(__dirname, '../content/blog');

export async function loadPosts() {
  const entries = await fs.readdir(BLOG_DIR);
  const posts = [];

  for (const file of entries) {
    if (!file.endsWith('.md')) continue;
    const fullPath = path.join(BLOG_DIR, file);
    const raw = await fs.readFile(fullPath, 'utf8');
    const { data, content } = matter(raw);

    const title = data.title || path.basename(file, path.extname(file));
    const slug = data.slug || slugify(title);
    const description = data.description || '';
    const pubDate = data.pubDate ? new Date(data.pubDate) : new Date();
    const updatedDate = data.updatedDate ? new Date(data.updatedDate) : undefined;

    posts.push({
      title,
      slug,
      description,
      pubDate,
      updatedDate,
      heroImage: data.heroImage || '',
      badge: data.badge,
      tags: data.tags || [],
      body: content,
    });
  }

  return posts.sort((a, b) => b.pubDate - a.pubDate);
}

export async function getPostBySlug(slug) {
  const posts = await loadPosts();
  return posts.find((post) => post.slug === slug);
}

export function renderMarkdown(md) {
  return marked.parse(md || '');
}
