import { Router } from 'express';
import BlogPost from '../models/blogPost.js';
import { pageMeta } from '../utils/meta.js';
import { runFootball365Ingestion } from '../utils/news/pipeline.js';
import { slugExistsInFilePosts } from '../utils/news/dedupe.js';
import { slugify } from '../utils/slugify.js';
import { renderMarkdown } from '../utils/blog.js';

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

async function renderAdminBlogPage(res, { layout = undefined, notice = null, selectedPost = undefined } = {}) {
  const drafts = await loadDrafts();
  const locals = {
    activeId: 'admin-blog',
    meta: pageMeta({
      title: 'Admin Blog Drafts',
      description: 'Review, edit and publish ingested football news drafts.',
      path: '/admin/blog/',
    }),
    drafts,
    selectedPost: selectedPost !== undefined ? selectedPost : drafts[0] || null,
    notice,
  };
  if (layout !== undefined) locals.layout = layout;

  return res.render('pages/admin-blog', locals);
}

router.use(requireAdmin);

router.get('/', asyncRoute(async (req, res) => {
  const selectedPost = req.query.edit ? await BlogPost.findById(req.query.edit).lean().catch(() => null) : undefined;

  return renderAdminBlogPage(res, {
    layout: req.headers['hx-request'] ? false : undefined,
    selectedPost,
    notice: req.query.published ? { type: 'success', message: 'Post published.' } : null,
  });
}));

router.get('/drafts', asyncRoute(async (req, res) => {
  res.render('fragments/admin-blog-list', {
    layout: false,
    drafts: await loadDrafts(),
  });
}));

router.get('/draft/:slug', asyncRoute(async (req, res, next) => {
  const post = await BlogPost.findOne({ slug: req.params.slug, status: 'draft' }).lean();
  if (!post) return next();

  const previewPost = {
    ...post,
    pubDate: post.pubDate || post.createdAt || new Date(),
  };

  return res.render('pages/blog-detail', {
    activeId: 'admin-blog',
    meta: pageMeta({
      title: previewPost.title,
      description: previewPost.description,
      path: `/admin/blog/draft/${previewPost.slug}/`,
      image: previewPost.heroImage,
    }),
    extraStyles: '/css/v1-blog-post.css',
    post: previewPost,
    content: renderMarkdown(previewPost.body),
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
    notice: { type: 'success', message: post.status === 'published' ? 'Post saved.' : 'Draft saved.' },
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

  if (!req.headers['hx-request']) return res.redirect('/admin/blog?published=1');

  res.set(
    'HX-Location',
    JSON.stringify({
      path: '/admin/blog?published=1',
      target: '#admin-blog-page',
      swap: 'outerHTML',
    })
  );
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
  const requestedLimit = Number.parseInt(req.body.limit || '1', 10);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 5) : 1;
  const url = (req.body.url || '').trim();
  let result;
  let error = null;

  try {
    result = await runFootball365Ingestion({ limit, url: url || undefined, manual: true });
  } catch (err) {
    console.error('[admin-blog:ingest-run]', err);
    error = {
      message: err.message || 'Ingestion failed unexpectedly.',
    };
  }

  const drafts = await loadDrafts();

  return res.render('fragments/admin-blog-ingest-result', {
    layout: false,
    result,
    error,
    drafts,
  });
}));

export default router;
