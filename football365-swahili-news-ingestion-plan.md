# Plan: Football365 Swahili News Ingestion

**Generated**: 2026-06-03  
**Estimated Complexity**: High

## Overview

Build a scheduled ingestion pipeline that discovers recent football articles, fetches only new unique articles, extracts clean article text and a hero image, sends the article facts to OpenAI's Responses API with `gpt-5.4`, receives a structured Swahili Markdown post, processes the image with metadata stripped, uploads the processed image to Cloudinary, and writes the final Markdown post into `content/blog/`.

Important compliance note: Football365's current terms prohibit automated extraction, scraping, republication, and AI use without written authorization. The robust implementation should therefore have a hard `NEWS_INGEST_ENABLED=false` default and only run against Football365 after written permission or another authorized content arrangement exists. Removing image metadata does not make a copyrighted image unique or licensed. If permission is not available, use the same pipeline with an authorized source, licensed images, or manually supplied article URLs/content.

## Architecture

Use a separate service layer, not route handlers:

- `cron/footballNews.js` starts the scheduled job.
- `utils/news/sources/football365.js` discovers and extracts source articles.
- `utils/news/openaiRewrite.js` rewrites/translates into structured Swahili output.
- `utils/news/images.js` downloads, normalizes, strips metadata, and uploads images.
- `utils/news/posts.js` writes Markdown frontmatter/content atomically.
- `models/newsIngest.js` stores source URL, canonical URL, source hash, output slug, Cloudinary public ID, status, attempts, and errors.
- `scripts/ingest-football-news.js` runs the job manually for local testing and deployment one-offs.

Keep `utils/blog.js` unchanged unless generated post frontmatter requires new optional fields. Existing blog rendering already reads Markdown from `content/blog/*.md`.

## Prerequisites

- Written authorization or licensed content agreement for automated Football365 access and reuse.
- `OPENAI_API_KEY`.
- `OPENAI_NEWS_MODEL=gpt-5.4`.
- Cloudinary credentials via `CLOUDINARY_URL` or `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- Persistent production filesystem for `content/blog`, or a deployment decision to store generated posts elsewhere and sync them into the app.
- New dependencies: `openai`, `cheerio`, `cloudinary`, `sharp`, `robots-parser`, `p-limit`.
- Optional dependency: `html-to-text` or `@mozilla/readability` if selectors become brittle.

## Sprint 1: Compliance Gate and State Model

**Goal**: Make ingestion impossible to run accidentally and add durable idempotency.

**Demo/Validation**:
- Running the script with `NEWS_INGEST_ENABLED` unset exits without network calls.
- Duplicate source URLs are recorded once.

### Task 1.1: Add Environment Contract

- **Location**: `.env.example` if present, `config/env.js`, README or deployment docs
- **Description**: Document and validate:
  - `NEWS_INGEST_ENABLED`
  - `NEWS_INGEST_SOURCE=football365`
  - `NEWS_INGEST_CRON`
  - `NEWS_INGEST_MAX_ARTICLES`
  - `OPENAI_API_KEY`
  - `OPENAI_NEWS_MODEL`
  - `CLOUDINARY_URL`
- **Dependencies**: None
- **Acceptance Criteria**:
  - Job refuses to run unless `NEWS_INGEST_ENABLED=true`.
  - Startup logs show whether the job is disabled, enabled, or misconfigured.
- **Validation**: Manual script run with enabled/disabled env values.

### Task 1.2: Add Ingest State Model

- **Location**: `models/newsIngest.js`
- **Description**: Create a Mongoose schema with:
  - `source`: string
  - `sourceUrl`: unique string
  - `canonicalUrl`: string
  - `sourcePublishedAt`: Date
  - `sourceTitle`: string
  - `sourceHash`: string
  - `status`: `discovered | fetched | rewritten | image_uploaded | published | skipped | failed`
  - `outputSlug`: unique sparse string
  - `outputPath`: string
  - `cloudinaryPublicId`: string
  - `errorMessage`: string
  - `attempts`: number
  - timestamps
- **Dependencies**: None
- **Acceptance Criteria**:
  - Unique index prevents two rows for the same canonical URL.
  - Failed records can be retried without creating duplicates.
- **Validation**: Small model test or script that upserts the same URL twice.

### Task 1.3: Add Source Policy Check

- **Location**: `utils/news/policy.js`
- **Description**: Before fetching content, check `robots.txt` and require an explicit env flag proving content authorization, for example `FOOTBALL365_AUTHORIZED=true`.
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - The job exits if `FOOTBALL365_AUTHORIZED` is not true.
  - The job logs the reason as a compliance block, not a technical failure.
- **Validation**: Manual script run with and without the flag.

## Sprint 2: Discovery and Extraction

**Goal**: Reliably discover article URLs and extract clean source data with fixture-based tests.

**Demo/Validation**:
- A saved listing fixture returns article candidates.
- A saved article fixture returns title, date, author, plain text, and image URL.

### Task 2.1: Add Football365 Discovery

- **Location**: `utils/news/sources/football365.js`
- **Description**: Fetch `https://www.football365.com/all-the-news`, parse article cards with Cheerio, normalize URLs, and return candidates with title, URL, excerpt, author, published date, and tags when available.
- **Dependencies**: Sprint 1
- **Acceptance Criteria**:
  - Only `https://www.football365.com/...` article URLs are accepted.
  - Pagination is optional in v1; default to the first page and `NEWS_INGEST_MAX_ARTICLES`.
  - Discovery is rate-limited and has timeout/retry handling.
- **Validation**: Fixture test plus one manual authorized fetch.

### Task 2.2: Add Article Extraction

- **Location**: `utils/news/sources/football365.js`
- **Description**: Fetch each article URL and extract:
  - canonical URL
  - title
  - author
  - published date
  - main image URL and alt text
  - plain article text
  - source links mentioned in the article
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Navigation, related articles, tables, comments, sharing links, ads, and sidebars are excluded.
  - Text length below a minimum threshold is marked `skipped`.
  - Extraction works from static HTML without browser automation.
- **Validation**: Fixture test that asserts no "Related Articles", "Latest Football News", or sidebar content appears in extracted text.

### Task 2.3: Add Source Hashing and Duplicate Detection

- **Location**: `utils/news/dedupe.js`, `models/newsIngest.js`
- **Description**: Hash canonical URL plus normalized title/body to detect both URL duplicates and near-identical republished content.
- **Dependencies**: Task 2.2
- **Acceptance Criteria**:
  - Previously published URL is skipped.
  - Same article with changed tracking params resolves to one canonical URL.
- **Validation**: Fixture test with querystring variants and duplicate titles.

## Sprint 3: OpenAI Rewrite to Structured Markdown

**Goal**: Generate high-quality Swahili posts in a predictable schema.

**Demo/Validation**:
- Given a fixed extracted article fixture, the rewrite function returns valid JSON matching the schema and writes no raw HTML.

### Task 3.1: Add OpenAI Responses Client

- **Location**: `utils/news/openaiRewrite.js`
- **Description**: Use the official OpenAI Node SDK and `client.responses.create()` with `model: process.env.OPENAI_NEWS_MODEL || 'gpt-5.4'`.
- **Dependencies**: Task 2.2
- **Acceptance Criteria**:
  - Uses a strict JSON schema response format for:
    - `title`
    - `description`
    - `slug`
    - `tags`
    - `badge`
    - `markdown`
    - `sourceAttribution`
    - `qualityWarnings`
  - Retries transient API failures with backoff.
  - Refuses output that contains copied English paragraphs or HTML blocks.
- **Validation**: Unit test with mocked OpenAI response and schema validation.

### Task 3.2: Write the Editorial Prompt

- **Location**: `utils/news/prompts.js`
- **Description**: Prompt the model to write an original Swahili news article based on facts, not a paragraph-by-paragraph translation. Require:
  - natural Tanzanian Swahili
  - 600-900 words unless source is too short
  - no copied English paragraphs
  - no invented quotes, fees, injuries, clubs, or dates
  - source attribution line at the end
  - betting-neutral tone unless the article naturally relates to betting context
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - Output is Markdown only inside the `markdown` field.
  - Frontmatter fields are separate JSON fields, not embedded in Markdown.
- **Validation**: Snapshot review from one fixture.

### Task 3.3: Add Quality Guardrails

- **Location**: `utils/news/quality.js`
- **Description**: Add checks before publishing:
  - Markdown has no `<script>`, `<iframe>`, inline event handlers, or copied HTML.
  - Markdown has a reasonable heading structure.
  - Description length is SEO-friendly.
  - Similarity against source text is below a conservative threshold.
  - Required attribution is present.
- **Dependencies**: Task 3.2
- **Acceptance Criteria**:
  - Failed quality checks mark the record `failed` or `skipped`.
  - No post file is written when quality fails.
- **Validation**: Tests with intentionally bad model output.

## Sprint 4: Image Processing and Cloudinary Upload

**Goal**: Upload an optimized, metadata-stripped image and store its Cloudinary URL in frontmatter.

**Demo/Validation**:
- Given a fixture image with EXIF data, output image has no EXIF metadata and uploads to a deterministic Cloudinary folder.

### Task 4.1: Add Image Download Validation

- **Location**: `utils/news/images.js`
- **Description**: Download image with timeout and size limits. Accept only safe image content types and reject SVG/scriptable content.
- **Dependencies**: Task 2.2
- **Acceptance Criteria**:
  - Rejects missing, oversized, unsupported, or non-image responses.
  - Handles relative and absolute image URLs.
- **Validation**: Mock HTTP tests for content type and size.

### Task 4.2: Strip Metadata and Normalize Image

- **Location**: `utils/news/images.js`
- **Description**: Use `sharp(buffer).rotate().resize(...).webp({ quality: 82 }).toBuffer()` without metadata-preserving options. This normalizes orientation, strips metadata, and produces a web-friendly asset.
- **Dependencies**: Task 4.1
- **Acceptance Criteria**:
  - Output image is WebP.
  - EXIF, XMP, IPTC, GPS, and original camera metadata are absent.
  - Image still renders correctly after orientation normalization.
- **Validation**: Test image before/after metadata check with `sharp().metadata()`.

### Task 4.3: Upload to Cloudinary

- **Location**: `utils/news/images.js`
- **Description**: Upload processed image via Cloudinary Node SDK `upload_stream` or REST upload. Use:
  - folder: `blog/football-news`
  - public ID: generated post slug
  - overwrite: false
  - resource type: image
  - tags: `football-news`, source name
- **Dependencies**: Task 4.2
- **Acceptance Criteria**:
  - Upload returns `secure_url` and `public_id`.
  - Existing public ID conflict causes slug suffixing, not overwrite.
  - Cloudinary public ID is stored on `newsIngest`.
- **Validation**: Manual upload in staging Cloudinary folder.

## Sprint 5: Markdown Post Writer

**Goal**: Write generated Swahili posts into the existing blog content format.

**Demo/Validation**:
- A generated post appears on `/blog/`, `/blog/:slug`, `/rss.xml`, and `/sitemap.xml` using existing routes.

### Task 5.1: Create Frontmatter Builder

- **Location**: `utils/news/posts.js`
- **Description**: Build frontmatter compatible with existing `utils/blog.js`:
  - `title`
  - `description`
  - `pubDate`
  - `updatedDate`
  - `heroImage`
  - `slug`
  - `tags`
  - `badge`
  - optional `sourceName`
  - optional `sourceUrl`
- **Dependencies**: Sprint 3, Sprint 4
- **Acceptance Criteria**:
  - Existing blog loader can read generated posts without changes.
  - `heroImage` is the Cloudinary secure URL.
- **Validation**: Run `loadPosts()` and confirm generated post sorts correctly.

### Task 5.2: Add Atomic Markdown Write

- **Location**: `utils/news/posts.js`, `content/blog/`
- **Description**: Write to a temp file in `content/blog`, then rename to `${slug}.md`. Check for existing files before writing.
- **Dependencies**: Task 5.1
- **Acceptance Criteria**:
  - Partial files are not left behind on failures.
  - Slug collisions produce `slug-2`, `slug-3`, etc.
- **Validation**: File write test with duplicate slugs.

### Task 5.3: Update Generated Record

- **Location**: `utils/news/pipeline.js`
- **Description**: After successful write, update `newsIngest` status to `published` with output path and slug.
- **Dependencies**: Task 5.2
- **Acceptance Criteria**:
  - Published record can be audited back to its source URL.
  - Failed image or post write does not mark published.
- **Validation**: Integration test with mocked OpenAI and Cloudinary.

## Sprint 6: Cron, Script, Observability

**Goal**: Run safely in production and debuggably in staging.

**Demo/Validation**:
- Manual script processes one fixture or one authorized live article.
- Cron runs only when enabled and logs each state transition.

### Task 6.1: Add Pipeline Orchestrator

- **Location**: `utils/news/pipeline.js`
- **Description**: Compose discovery, dedupe, extraction, rewrite, image upload, and post write. Use low concurrency: discovery serial, article processing concurrency 1-2.
- **Dependencies**: Sprints 1-5
- **Acceptance Criteria**:
  - A failure on one article does not stop the batch.
  - Per-article status is persisted.
  - Rate limits and transient failures use exponential backoff.
- **Validation**: Integration test with two successes and one forced failure.

### Task 6.2: Add Manual Script

- **Location**: `scripts/ingest-football-news.js`
- **Description**: CLI entrypoint with options:
  - `--dry-run`
  - `--limit 1`
  - `--url <article-url>`
  - `--fixtures`
- **Dependencies**: Task 6.1
- **Acceptance Criteria**:
  - `--dry-run` performs extraction and rewrite but does not upload or write files.
  - `--url` can process one authorized article for debugging.
- **Validation**: Run local dry-run with fixtures.

### Task 6.3: Add Cron Registration

- **Location**: `cron/footballNews.js`, `cron/index.js`
- **Description**: Register a scheduled job using `node-cron`, with timezone `Africa/Dar_es_Salaam`. Default schedule should be conservative, for example every 2-4 hours.
- **Dependencies**: Task 6.1
- **Acceptance Criteria**:
  - Cron is disabled unless `NEWS_INGEST_ENABLED=true`.
  - A simple in-process lock prevents overlapping runs.
- **Validation**: Local short-interval test with `NEWS_INGEST_CRON=*/5 * * * *`.

### Task 6.4: Add Logs and Alert Hooks

- **Location**: `utils/news/logger.js`, optional existing notification helpers
- **Description**: Log structured events for discovery count, skipped count, published count, failures, OpenAI usage, and Cloudinary upload result.
- **Dependencies**: Task 6.1
- **Acceptance Criteria**:
  - Production logs identify source URL and status for each article.
  - No API keys or full article bodies are logged.
- **Validation**: Manual script log review.

## Testing Strategy

- Unit tests:
  - URL normalization
  - listing extraction from fixture HTML
  - article text extraction from fixture HTML
  - duplicate detection
  - OpenAI schema validation
  - Markdown frontmatter generation
  - slug collision handling
  - image metadata stripping
- Integration tests:
  - full pipeline with mocked HTTP, OpenAI, and Cloudinary
  - retry and failure status paths
- Manual staging checks:
  - `node scripts/ingest-football-news.js --fixtures --dry-run`
  - `node scripts/ingest-football-news.js --limit 1 --dry-run`
  - verify generated post appears in `/blog/`, `/rss.xml`, and `/sitemap.xml`

## Operational Rules

- Default to one or two articles per run until quality is proven.
- Do not publish if source extraction confidence is low.
- Do not publish if OpenAI output includes unsupported claims or raw HTML.
- Do not overwrite existing Markdown posts or Cloudinary assets.
- Preserve source attribution in the generated post.
- Keep OpenAI temperature low and use structured output.
- Store enough state in Mongo to audit what happened after a deployment.
- Make generated posts reviewable before auto-publish by adding `NEWS_INGEST_AUTOPUBLISH=false` mode if editorial review is needed.

## Potential Risks & Gotchas

- **Terms and copyright**: Football365 currently requires written authorization for scraping, AI analysis, and republication. Mitigation: make authorization a launch blocker and support authorized/manual sources.
- **Image rights**: Stripping metadata does not create a unique/licensed image. Mitigation: upload source images only when licensed; otherwise use a licensed image provider, Cloudinary stock/source asset, or no hero image.
- **Runtime filesystem**: Writing to `content/blog` in production may not survive redeploys on some hosts. Mitigation: confirm persistent disk, commit generated posts through a controlled publishing workflow, or add a database-backed post store later.
- **HTML structure drift**: Football365 selectors can change. Mitigation: fixture tests, extraction confidence score, and fail-closed behavior.
- **Duplicate news**: Same story may appear under different URLs. Mitigation: canonical URL plus normalized content hash and title similarity.
- **Model drift**: Model output can vary. Mitigation: JSON schema, quality gates, low temperature, snapshots if available, and manual review mode.
- **Cost spikes**: Rewriting full articles can consume tokens. Mitigation: per-run limit, source text truncation policy, usage logs, and daily cap.
- **Cloudinary conflicts**: Same slug can collide. Mitigation: `overwrite: false`, slug suffixing, and record public IDs.

## Rollback Plan

- Set `NEWS_INGEST_ENABLED=false` to stop all scheduled ingestion.
- Delete or unpublish generated Markdown files from `content/blog`.
- Remove uploaded Cloudinary assets by stored `cloudinaryPublicId`.
- Mark related `newsIngest` records as `skipped` or `rolled_back`.
- If a generated post was indexed, regenerate sitemap/RSS naturally after file removal and request search console recrawl if needed.

## Recommended First Implementation Order

1. Build state model and disabled-by-default cron/script.
2. Build fixture-based discovery and extraction.
3. Build mocked OpenAI structured rewrite.
4. Build image processing/upload.
5. Build atomic Markdown writer.
6. Run one staging dry-run.
7. Enable manual review mode.
8. Only then enable scheduled production ingestion after authorization is confirmed.

## Source Notes

- Football365 all-news page currently exposes recent article links, titles, authors, dates, excerpts, and pagination at `https://www.football365.com/all-the-news`.
- Football365 article pages currently expose title, author/date, article image, body content, related articles, and latest-news/sidebar sections.
- Football365 terms currently prohibit automated scraping, extraction, AI analysis, and republication without written authorization: `https://www.football365.com/terms-conditions`.
- OpenAI Responses API supports creating model responses with text/image inputs and structured JSON output: `https://platform.openai.com/docs/api-reference/responses`.
- OpenAI `gpt-5.4` documentation lists Responses API support and structured outputs support: `https://developers.openai.com/api/docs/models/gpt-5.4`.
- Cloudinary Node documentation supports programmatic uploads and `upload_stream`: `https://cloudinary.com/documentation/node_image_and_video_upload`.
- Sharp output documentation says default output strips metadata when metadata-preserving options are not used: `https://sharp.pixelplumbing.com/api-output/`.
