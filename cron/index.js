import startRefineFametipsCron from './refineFametips.js';
import startFootballNewsCron from './footballNews.js';

export function startCronJobs() {
  startRefineFametipsCron();
  startFootballNewsCron();
}
