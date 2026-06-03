import OpenAI from 'openai';
import { NEWS_REWRITE_SYSTEM_PROMPT, buildRewriteUserPrompt } from './prompts.js';
import { NEWS_MAX_OUTPUT_TOKENS, NEWS_OPENAI_MODEL } from './config.js';
import { normalizeGeneratedPost, parseRewriteJson, rewriteSchema } from './rewritePost.js';

export async function rewriteArticleToSwahili(article) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for news rewrite');
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: NEWS_OPENAI_MODEL,
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

  return normalizeGeneratedPost(parseRewriteJson(response.output_text, 'OpenAI'));
}
