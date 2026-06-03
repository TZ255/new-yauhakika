import pLimit from 'p-limit';
import BlogPost from '../../models/blogPost.js';
import NewsIngest from '../../models/newsIngest.js';
import { discoverFootball365Articles, extractFootball365Article } from './sources/football365.js';
import { hashArticle, normalizeUrl, uniqueSlug } from './dedupe.js';
import { rewriteArticleToSwahili } from './openaiRewrite.js';
import { validateGeneratedPost } from './quality.js';
import { processAndUploadImage } from './images.js';
import {
  FOOTBALL365_SOURCE_ID,
  INGEST_BATCH_SIZE,
  INGEST_CONCURRENCY,
  INGEST_CRON_ENABLED,
  INGEST_DISCOVERY_SCAN_LIMIT,
  MIN_SOURCE_WORDS,
} from './config.js';

function ingestEnabled({ manual = false } = {}) {
  return manual || INGEST_CRON_ENABLED;
}

async function markFailed(record, err) {
  record.status = 'failed';
  record.errorMessage = err.message || String(err);
  record.lastAttemptAt = new Date();
  await record.save();
}

async function createDraftFromArticle(article, generated, image) {
  const slug = await uniqueSlug(generated.slug || generated.title);
  const now = new Date();
  return BlogPost.create({
    title: generated.title,
    slug,
    description: generated.description,
    body: generated.markdown,
    heroImage: image.secureUrl || '',
    heroImagePublicId: image.publicId || '',
    badge: generated.badge || 'NEWS',
    tags: generated.tags || ['soka'],
    status: 'draft',
    sourceType: 'ingested',
    sourceName: article.sourceName,
    sourceUrl: article.sourceUrl,
    sourceCanonicalUrl: article.canonicalUrl,
    sourcePublishedAt: article.publishedAt,
    updatedDate: now,
  });
}

export async function processFootball365Article(url) {
  const normalizedUrl = normalizeUrl(url);
  let record = await NewsIngest.findOne({ sourceUrl: normalizedUrl });
  if (record?.status === 'drafted') {
    return { status: 'skipped', reason: 'already drafted', url: normalizedUrl };
  }

  if (!record) {
    record = await NewsIngest.create({
      source: FOOTBALL365_SOURCE_ID,
      sourceUrl: normalizedUrl,
      canonicalUrl: normalizedUrl,
      status: 'discovered',
    });
  }

  record.attempts += 1;
  record.lastAttemptAt = new Date();
  await record.save();

  try {
    const article = await extractFootball365Article(normalizedUrl);
    if (!article.title || !article.text || article.text.split(/\s+/).length < MIN_SOURCE_WORDS) {
      record.status = 'skipped';
      record.errorMessage = 'Article extraction produced too little text';
      await record.save();
      return { status: 'skipped', reason: record.errorMessage, url: normalizedUrl };
    }

    const sourceHash = hashArticle(article);
    const duplicateHash = await NewsIngest.findOne({
      _id: { $ne: record._id },
      sourceHash,
      status: { $in: ['drafted', 'rewritten', 'image_uploaded'] },
    });
    if (duplicateHash) {
      record.status = 'skipped';
      record.sourceHash = sourceHash;
      record.errorMessage = 'Duplicate source hash';
      await record.save();
      return { status: 'skipped', reason: record.errorMessage, url: normalizedUrl };
    }

    record.canonicalUrl = article.canonicalUrl;
    record.sourceTitle = article.title;
    record.sourcePublishedAt = article.publishedAt;
    record.sourceHash = sourceHash;
    record.status = 'fetched';
    await record.save();

    const generated = await rewriteArticleToSwahili(article);
    const qualityErrors = validateGeneratedPost({ article, generated });
    if (qualityErrors.length) {
      record.status = 'failed';
      record.errorMessage = qualityErrors.join('; ');
      await record.save();
      return { status: 'failed', reason: record.errorMessage, url: normalizedUrl };
    }

    record.status = 'rewritten';
    await record.save();

    const imageSlug = await uniqueSlug(generated.slug || generated.title);
    const image = await processAndUploadImage({ imageUrl: article.imageUrl, slug: imageSlug });
    record.status = 'image_uploaded';
    record.cloudinaryPublicId = image.publicId;
    await record.save();

    const post = await createDraftFromArticle(article, generated, image);
    record.status = 'drafted';
    record.blogPostId = post._id;
    record.outputSlug = post.slug;
    await record.save();

    return { status: 'drafted', slug: post.slug, id: post._id.toString(), url: normalizedUrl };
  } catch (err) {
    await markFailed(record, err);
    return { status: 'failed', reason: err.message, url: normalizedUrl };
  }
}

async function selectUnpostedCandidates(candidates, limit) {
  const urls = candidates.map((candidate) => normalizeUrl(candidate.url));
  const [existingIngests, existingPosts] = await Promise.all([
    NewsIngest.find({
      sourceUrl: { $in: urls },
      status: { $in: ['drafted', 'rewritten', 'image_uploaded'] },
    })
      .select('sourceUrl')
      .lean(),
    BlogPost.find({
      sourceUrl: { $in: urls },
      status: { $in: ['draft', 'published'] },
    })
      .select('sourceUrl')
      .lean(),
  ]);
  const postedUrls = new Set([
    ...existingIngests.map((record) => normalizeUrl(record.sourceUrl)),
    ...existingPosts.map((post) => normalizeUrl(post.sourceUrl)),
  ]);
  const selected = [];

  for (const candidate of candidates) {
    const normalizedUrl = normalizeUrl(candidate.url);
    if (postedUrls.has(normalizedUrl)) continue;
    selected.push({ ...candidate, url: normalizedUrl });
    if (selected.length >= limit) break;
  }

  return selected;
}

export async function runFootball365Ingestion({ limit, url, dryRun = false, manual = false } = {}) {
  if (!ingestEnabled({ manual })) {
    return { disabled: true, results: [] };
  }

  if (dryRun) {
    const targetUrl = url || (await discoverFootball365Articles({ limit: 1 }))[0]?.url;
    if (!targetUrl) return { dryRun: true, article: null };
    const article = await extractFootball365Article(targetUrl);
    return { dryRun: true, article };
  }

  const max = Number(limit || INGEST_BATCH_SIZE);
  const candidates = url
    ? [{ url: normalizeUrl(url) }]
    : await selectUnpostedCandidates(
        await discoverFootball365Articles({ limit: Math.max(INGEST_DISCOVERY_SCAN_LIMIT, max) }),
        max
      );
  const limiter = pLimit(INGEST_CONCURRENCY);
  const results = await Promise.all(candidates.map((candidate) => limiter(() => processFootball365Article(candidate.url))));

  return { disabled: false, count: results.length, results };
}
