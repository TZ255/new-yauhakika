import cron from 'node-cron';
import { runFootball365Ingestion } from '../utils/news/pipeline.js';
import { INGEST_CRON_ENABLED, INGEST_CRON_SCHEDULE, INGEST_CRON_TIMEZONE } from '../utils/news/config.js';

let running = false;

export default function startFootballNewsCron() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[cron:footballNews] Disabled outside production');
    return;
  }

  if (!INGEST_CRON_ENABLED) {
    console.log('[cron:footballNews] Disabled');
    return;
  }

  cron.schedule(
    INGEST_CRON_SCHEDULE,
    async () => {
      if (running) {
        console.log('[cron:footballNews] Previous run still active, skipping');
        return;
      }

      running = true;
      console.log('[cron:footballNews] Running...');
      try {
        const result = await runFootball365Ingestion();
        console.log(`[cron:footballNews] Finished: ${JSON.stringify(result.results || [])}`);
      } catch (err) {
        console.error('[cron:footballNews] Error:', err.message);
      } finally {
        running = false;
      }
    },
    { timezone: INGEST_CRON_TIMEZONE }
  );

  console.log(`[cron:footballNews] Scheduled (${INGEST_CRON_SCHEDULE}, ${INGEST_CRON_TIMEZONE})`);
}
