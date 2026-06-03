import OpenAI from 'openai';
import { NEWS_REWRITE_SYSTEM_PROMPT, buildRewriteUserPrompt } from './prompts.js';
import { NEWS_MAX_OUTPUT_TOKENS, NEWS_MODEL } from './config.js';
import { slugify } from '../slugify.js';

const rewriteSchema = {
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

function parseResponseJson(response) {
  const text = response.output_text;
  if (!text) throw new Error('OpenAI response did not include output_text');
  return JSON.parse(text);
}

export async function rewriteArticleToSwahili(article) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for news rewrite');
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: NEWS_MODEL,
    instructions: NEWS_REWRITE_SYSTEM_PROMPT,
    input: buildRewriteUserPrompt(article),
    max_output_tokens: NEWS_MAX_OUTPUT_TOKENS,
    text: {
      format: {
        type: 'json_schema',
        name: 'swahili_news_post',
        strict: true,
        schema: rewriteSchema,
      },
    },
  });

  const output = parseResponseJson(response);
  output.slug = slugify(output.slug || output.title);
  output.tags = (output.tags || []).map((tag) => slugify(tag).replace(/-/g, '')).filter(Boolean).slice(0, 6);
  output.badge = (output.badge || 'NEWS').toUpperCase().slice(0, 16);

  return output;
}
