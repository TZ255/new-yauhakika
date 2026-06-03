import '../config/env.js';
import { connectDB } from '../config/db.js';
import { INGEST_BATCH_SIZE } from '../utils/news/config.js';
import { runFootball365Ingestion } from '../utils/news/pipeline.js';

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const url = readArg('--url');
const limit = Number(readArg('--limit') || INGEST_BATCH_SIZE);
const dryRun = process.argv.includes('--dry-run');

try {
  await connectDB();
  const result = await runFootball365Ingestion({ url, limit, dryRun, manual: true });
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
} catch (err) {
  console.error(err);
  process.exit(1);
}
