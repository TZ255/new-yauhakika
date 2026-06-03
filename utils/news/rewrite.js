import { NEWS_REWRITE_AGENT } from './config.js';
import { geminiRewriteArticleToSwahili } from './geminiRewrite.js';
import { rewriteArticleToSwahili as openaiRewriteArticleToSwahili } from './openaiRewrite.js';

export async function rewriteArticleToSwahili(article) {
  if (NEWS_REWRITE_AGENT === 'gemini') {
    return geminiRewriteArticleToSwahili(article);
  }

  if (NEWS_REWRITE_AGENT === 'openai') {
    return openaiRewriteArticleToSwahili(article);
  }

  throw new Error(`Unsupported NEWS_REWRITE_AGENT "${NEWS_REWRITE_AGENT}". Use "openai" or "gemini".`);
}
