export const NEWS_FETCH_TIMEOUT_MS = 15000;
export const NEWS_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const NEWS_BROWSER_USER_AGENT = 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:151.0) Gecko/20100101 Firefox/151.0';

export const FOOTBALL365_SOURCE_ID = 'football365';
export const FOOTBALL365_SOURCE_NAME = 'Football365';
export const FOOTBALL365_ALL_NEWS_URL = 'https://www.football365.com/all-the-news';
export const FOOTBALL365_ARTICLE_PATH_RE = /^\/news\/[^?#]+/;

export const NEWS_REWRITE_AGENT = 'gemini'; // 'openai' or 'gemini'
export const NEWS_OPENAI_MODEL = 'gpt-5.4-mini';
export const NEWS_GEMINI_MODEL = 'gemini-3.5-flash';
export const NEWS_MODEL = NEWS_REWRITE_AGENT === 'gemini' ? NEWS_GEMINI_MODEL : NEWS_OPENAI_MODEL;
export const NEWS_MAX_OUTPUT_TOKENS = 8000;
export const NEWS_GEMINI_MAX_OUTPUT_TOKENS = 12000;

export const INGEST_CRON_ENABLED = true;
export const INGEST_CRON_SCHEDULE = '6 * * * *'; // every hour at a minute 6
export const INGEST_CRON_TIMEZONE = 'Africa/Dar_es_Salaam';
export const INGEST_BATCH_SIZE = 2;
export const INGEST_DISCOVERY_SCAN_LIMIT = 10;
export const INGEST_CONCURRENCY = 2;

export const MIN_SOURCE_WORDS = 180;

export const CLOUDINARY_CLOUD_NAME = 'daucejhsa';
export const CLOUDINARY_FOLDER = 'blog/football-news';
export const NEWS_IMAGE_WIDTH = 1280;
export const NEWS_IMAGE_HEIGHT = 720;
export const NEWS_IMAGE_QUALITY = 82;
