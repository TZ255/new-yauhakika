import { Router } from 'express';
import { SITE, STATIC_PAGES } from '../config/site.js';
import { loadPosts } from '../utils/blog.js';

const router = Router();

router.get('/rss.xml', async (req, res) => {
  const posts = (await loadPosts()).slice(0, 30);
  const items = posts
    .map(
      (post) => `
      <item>
        <title><![CDATA[${post.title}]]></title>
        <link>${SITE.url}/blog/${post.slug}/</link>
        <guid>${SITE.url}/blog/${post.slug}</guid>
        <description><![CDATA[${post.description}]]></description>
        <pubDate>${new Date(post.pubDate).toUTCString()}</pubDate>
      </item>`
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <title>${SITE.name}</title>
      <link>${SITE.url}</link>
      <description>${SITE.description}</description>
      ${items}
    </channel>
  </rss>`;

  res.set('Content-Type', 'application/xml');
  res.send(xml);
});

router.get('/sitemap.xml', async (req, res) => {
  const posts = await loadPosts();

  const urls = [...STATIC_PAGES, ...posts.map((p) => `/blog/${p.slug}/`)];

  const body = urls
    .map(
      (url) => `
    <url>
      <loc>${SITE.url}${url}</loc>
    </url>`
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${body}
  </urlset>`;

  res.set('Content-Type', 'application/xml');
  res.send(xml);
});

router.get('/goto/:slug', (req, res) => {
  const affiliates = {
    leonbet: `https://k56thc2itt.com/?serial=44835&creative_id=1061&anid=`,
    betwinner: `https://bw-prm.com/afcon-2025-lite/?p=%2Fregistration%2F&id=29lf`
  };
  
  const { slug } = req.params;
  const url = affiliates[slug] || `https://bet-link.top/${slug}/register`;
  
  res.redirect(url);
});

export default router;
