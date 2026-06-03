import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import matter from 'gray-matter';
import { marked } from 'marked';
import { slugify } from './slugify.js';
import BlogPost from '../models/blogPost.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BLOG_DIR = path.join(__dirname, '../content/blog');

export async function loadPosts() {
  const [filePosts, dbPosts] = await Promise.all([loadFilePosts(), loadPublishedDbPosts()]);

  return [...dbPosts, ...filePosts].sort((a, b) => b.pubDate - a.pubDate);
}

async function loadFilePosts() {
  const entries = await fs.readdir(BLOG_DIR).catch((err) => {
    if (err.code === 'ENOENT') return [];
    throw err;
  });
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
      status: 'published',
      sourceType: 'filesystem',
    });
  }

  return posts;
}

async function loadPublishedDbPosts() {
  if (mongoose.connection.readyState !== 1) return [];

  const posts = await BlogPost.find({ status: 'published' })
    .sort({ pubDate: -1, createdAt: -1 })
    .lean()
    .catch((err) => {
      console.error('[blog] Failed to load database posts:', err.message);
      return [];
    });

  return posts.map((post) => ({
    id: post._id.toString(),
    title: post.title,
    slug: post.slug,
    description: post.description || '',
    pubDate: post.pubDate || post.publishedAt || post.createdAt || new Date(),
    updatedDate: post.updatedDate || post.updatedAt,
    heroImage: post.heroImage || '',
    badge: post.badge,
    tags: post.tags || [],
    body: post.body || '',
    status: post.status,
    sourceType: post.sourceType,
    sourceName: post.sourceName,
    sourceUrl: post.sourceUrl,
  }));
}

export async function getPostBySlug(slug) {
  if (mongoose.connection.readyState !== 1) {
    const filePosts = await loadFilePosts();
    return filePosts.find((post) => post.slug === slug);
  }

  const dbPost = await BlogPost.findOne({ slug, status: 'published' })
    .lean()
    .catch((err) => {
      console.error('[blog] Failed to load database post:', err.message);
      return null;
    });
  if (dbPost) {
    return {
      id: dbPost._id.toString(),
      title: dbPost.title,
      slug: dbPost.slug,
      description: dbPost.description || '',
      pubDate: dbPost.pubDate || dbPost.publishedAt || dbPost.createdAt || new Date(),
      updatedDate: dbPost.updatedDate || dbPost.updatedAt,
      heroImage: dbPost.heroImage || '',
      badge: dbPost.badge,
      tags: dbPost.tags || [],
      body: dbPost.body || '',
      status: dbPost.status,
      sourceType: dbPost.sourceType,
      sourceName: dbPost.sourceName,
      sourceUrl: dbPost.sourceUrl,
    };
  }

  const filePosts = await loadFilePosts();
  return filePosts.find((post) => post.slug === slug);
}

export function renderMarkdown(md) {
  return marked.parse(md || '');
}
