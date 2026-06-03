import { GoogleGenAI } from '@google/genai';
import { NEWS_REWRITE_SYSTEM_PROMPT, buildRewriteUserPrompt } from './prompts.js';
import { NEWS_GEMINI_MAX_OUTPUT_TOKENS, NEWS_GEMINI_MODEL } from './config.js';
import { normalizeGeneratedPost, parseRewriteJson, rewriteSchema } from './rewritePost.js';

async function generateGeminiRewrite(client, article) {
  return client.models.generateContent({
    model: NEWS_GEMINI_MODEL,
    contents: buildRewriteUserPrompt(article),
    config: {
      systemInstruction: NEWS_REWRITE_SYSTEM_PROMPT,
      maxOutputTokens: NEWS_GEMINI_MAX_OUTPUT_TOKENS,
      responseMimeType: 'application/json',
      responseJsonSchema: rewriteSchema,
    },
  });
}

export async function geminiRewriteArticleToSwahili(article) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required for Gemini news rewrite');
  }

  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await generateGeminiRewrite(client, article);

  try {
    return normalizeGeneratedPost(parseRewriteJson(response.text, 'Gemini'));
  } catch (err) {
    console.error('[gemini-rewrite:parse]', {
      message: err.message,
      responsePreview: (response.text || '').slice(0, 500),
    });
    throw err;
  }
}
