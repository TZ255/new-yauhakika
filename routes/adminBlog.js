import { Router } from 'express';
import BlogPost from '../models/blogPost.js';
import { pageMeta } from '../utils/meta.js';
import { runFootball365Ingestion } from '../utils/news/pipeline.js';
import { slugExistsInFilePosts } from '../utils/news/dedupe.js';
import { slugify } from '../utils/slugify.js';

const router = Router();

const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

function requireAdmin(req, res, next) {
  if (req.isAuthenticated?.() && req.user?.role === 'admin') return next();
  if (req.headers['hx-request']) return res.status(403).send('Admin access required');
  return res.redirect('/auth/login');
}

function parseTags(value = '') {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
}

async function ensureSlugAvailable(slug, postId) {
  const existing = await BlogPost.findOne({ slug, _id: { $ne: postId } }).lean();
  if (existing || (await slugExistsInFilePosts(slug))) {
    const err = new Error('Another post already uses this slug.');
    err.status = 409;
    throw err;
  }
}

async function loadDrafts() {
  return BlogPost.find({ status: 'draft' }).sort({ createdAt: -1 }).lean();
}

router.use(requireAdmin);

router.get('/', asyncRoute(async (req, res) => {
  const drafts = await loadDrafts();
  res.render('pages/admin-blog', {
    activeId: 'admin-blog',
    meta: pageMeta({
      title: 'Admin Blog Drafts',
      description: 'Review, edit and publish ingested football news drafts.',
      path: '/admin/blog/',
    }),
    drafts,
    selectedPost: drafts[0] || null,
    notice: null,
  });
}));

router.get('/drafts', asyncRoute(async (req, res) => {
  res.render('fragments/admin-blog-list', {
    layout: false,
    drafts: await loadDrafts(),
  });
}));

router.get('/:id/edit', asyncRoute(async (req, res, next) => {
  const post = await BlogPost.findById(req.params.id).lean();
  if (!post) return next();

  return res.render('fragments/admin-blog-editor', {
    layout: false,
    selectedPost: post,
    notice: null,
  });
}));

router.post('/:id/save', asyncRoute(async (req, res, next) => {
  const post = await BlogPost.findById(req.params.id);
  if (!post) return next();

  post.title = (req.body.title || '').trim();
  post.description = (req.body.description || '').trim();
  post.slug = slugify(req.body.slug || post.title);
  await ensureSlugAvailable(post.slug, post._id);
  post.badge = (req.body.badge || '').trim().toUpperCase();
  post.tags = parseTags(req.body.tags || '');
  post.heroImage = (req.body.heroImage || '').trim();
  post.body = req.body.body || '';
  post.reviewNotes = (req.body.reviewNotes || '').trim();
  post.updatedDate = new Date();
  post.reviewedBy = req.user._id;
  await post.save();

  return res.render('fragments/admin-blog-editor', {
    layout: false,
    selectedPost: post.toObject(),
    notice: { type: 'success', message: 'Draft saved.' },
  });
}));

router.post('/:id/publish', asyncRoute(async (req, res, next) => {
  const post = await BlogPost.findById(req.params.id);
  if (!post) return next();

  post.title = (req.body.title || post.title).trim();
  post.description = (req.body.description || post.description).trim();
  post.slug = slugify(req.body.slug || post.slug || post.title);
  await ensureSlugAvailable(post.slug, post._id);
  post.badge = (req.body.badge || post.badge || 'NEWS').trim().toUpperCase();
  post.tags = parseTags(req.body.tags || (post.tags || []).join(','));
  post.heroImage = (req.body.heroImage || post.heroImage || '').trim();
  post.body = req.body.body || post.body;
  post.reviewNotes = (req.body.reviewNotes || '').trim();
  post.status = 'published';
  post.publishedAt = new Date();
  post.pubDate = post.publishedAt;
  post.updatedDate = new Date();
  post.reviewedBy = req.user._id;
  await post.save();

  res.set('HX-Redirect', `/blog/${post.slug}`);
  return res.send('');
}));

router.post('/:id/archive', asyncRoute(async (req, res, next) => {
  const post = await BlogPost.findById(req.params.id);
  if (!post) return next();

  post.status = 'archived';
  post.reviewedBy = req.user._id;
  post.updatedDate = new Date();
  await post.save();

  return res.render('fragments/admin-blog-editor', {
    layout: false,
    selectedPost: null,
    notice: { type: 'warning', message: 'Draft archived.' },
  });
}));

router.post('/ingest/run', asyncRoute(async (req, res) => {
  const limit = Number(req.body.limit || 1);
  const url = (req.body.url || '').trim();
  const result = await runFootball365Ingestion({ limit, url: url || undefined, manual: true });
  const drafts = await loadDrafts();

  return res.render('fragments/admin-blog-ingest-result', {
    layout: false,
    result,
    drafts,
  });
}));

export default router;
