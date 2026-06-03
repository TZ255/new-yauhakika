import { Router } from 'express';
import { loadPosts, getPostBySlug, renderMarkdown } from '../utils/blog.js';
import { pageMeta } from '../utils/meta.js';

const router = Router();
const PAGE_SIZE = 10;

async function listBlog(req, res) {
  const pageParam = req.params.page || req.query.page || '1';
  const page = Number.parseInt(pageParam, 10);
  if (!Number.isInteger(page) || page < 1) return res.redirect('/blog/');

  const posts = await loadPosts();
  const total = posts.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages) {
    return res.redirect(totalPages === 1 ? '/blog/' : `/blog/page/${totalPages}/`);
  }

  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pagePosts = posts.slice(start, end);

  res.render('pages/blog-list', {
    activeId: 'blog',
    meta: pageMeta({
      title: 'Makala Zetu',
      description: 'Makala za betting Tanzania',
      path: page > 1 ? `/blog/page/${page}/` : '/blog/',
    }),
    posts: pagePosts,
    pagination: {
      page,
      totalPages,
      prev: page > 1 ? page - 1 : null,
      next: page < totalPages ? page + 1 : null,
    },
  });
}

router.get('/', listBlog);
router.get('/page/:page', listBlog);
router.get('/page/:page/', listBlog);

router.get('/:slug', async (req, res, next) => {
  const { slug } = req.params;
  const post = await getPostBySlug(slug);
  if (!post) return next();

  const html = renderMarkdown(post.body);

  res.render('pages/blog-detail', {
    activeId: 'blog',
    meta: pageMeta({
      title: post.title,
      description: post.description,
      path: `/blog/${slug}/`,
      image: post.heroImage,
    }),
    extraStyles: '/css/v1-blog-post.css',
    post,
    content: html,
  });
});

export default router;
