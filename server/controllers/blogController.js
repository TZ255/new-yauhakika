import { loadPosts, getPostBySlug, renderMarkdown } from '../utils/blog.js';
import { pageMeta } from '../utils/meta.js';

const PAGE_SIZE = 10;

export async function listBlog(req, res) {
  const page = Number(req.params.page || req.query.page || 1);
  const posts = await loadPosts();
  const total = posts.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pagePosts = posts.slice(start, end);

  res.render('pages/blog-list', {
    activeId: 'blog',
    meta: pageMeta({
      title: 'Makala Zetu',
      description: 'Makala za betting Tanzania',
      path: page > 1 ? `/blog/page/${page}` : '/blog',
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

export async function showBlog(req, res, next) {
  const { slug } = req.params;
  const post = await getPostBySlug(slug);
  if (!post) return next();

  const html = renderMarkdown(post.body);

  res.render('pages/blog-detail', {
    activeId: 'blog',
    meta: pageMeta({
      title: post.title,
      description: post.description,
      path: `/blog/${slug}`,
      image: post.heroImage,
    }),
    post,
    content: html,
  });
}
