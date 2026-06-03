import { slugify } from '../slugify.js';

export const rewriteSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    slug: { type: 'string' },
    tags: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 6,
    },
    badge: { type: 'string' },
    markdown: { type: 'string' },
    qualityWarnings: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['title', 'description', 'slug', 'tags', 'badge', 'markdown', 'qualityWarnings'],
};

export function parseRewriteJson(text, providerName) {
  if (!text) throw new Error(`${providerName} response did not include text output`);

  const cleanText = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');

  let parsed = JSON.parse(cleanText);
  if (typeof parsed === 'string' && parsed.trim().startsWith('{')) {
    parsed = JSON.parse(parsed);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${providerName} response JSON must be an object, not ${typeof parsed}`);
  }

  return parsed;
}

function normalizeMarkdown(markdown) {
  if (typeof markdown !== 'string') return '';

  return markdown
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n');
}

export function normalizeGeneratedPost(output) {
  if (!output.title || !output.description || !output.markdown) {
    throw new Error('Rewrite response is missing title, description, or markdown');
  }

  output.markdown = normalizeMarkdown(output.markdown);
  output.slug = slugify(output.slug || output.title);
  output.tags = (output.tags || [])
    .map((tag) => slugify(tag).replace(/-/g, ''))
    .filter(Boolean)
    .slice(0, 6);
  output.badge = (output.badge || 'NEWS').toUpperCase().slice(0, 16);

  return output;
}
