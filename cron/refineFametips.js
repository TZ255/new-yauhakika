import cron from 'node-cron';
import fameTipsModel from '../models/fametips.js';
import fixturesModel from '../models/fixtures.js';

/**
 * Refine fametips by matching them against fixtures data.
 * Runs every hour in production only.
 */
function startRefineFametipsCron() {
 // if (process.env.NODE_ENV === 'production') return;
 return; // disable for now: reason: the fame scheduler rewriting everytime we update

  // Every hour
  cron.schedule('46 * * * *', async () => {
    console.log('[cron:refineFametips] Running...');
    try {
      // Today, tomorrow, day after tomorrow in Africa/Nairobi
      const tz = 'Africa/Nairobi';
      const days = [0, 1, 2].map(offset => {
        const d = new Date(Date.now() + offset * 86400000);
        const iso = d.toLocaleDateString('en-CA', { timeZone: tz }); // yyyy-mm-dd
        const [y, m, dd] = iso.split('-');
        return { iso, siku: `${dd}/${m}/${y}` }; // dd/mm/yyyy
      });

      const sikuList = days.map(d => d.siku);
      const isoList = days.map(d => d.iso);
      const sikuToIso = Object.fromEntries(days.map(d => [d.siku, d.iso]));

      console.log('[cron:refineFametips] Dates (siku):', sikuList);
      console.log('[cron:refineFametips] Dates (iso):', isoList);

      const unrefined = await fameTipsModel.find({ isRefined: false, siku: { $in: sikuList } }).lean();
      console.log(`[cron:refineFametips] Found ${unrefined.length} unrefined tips`);

      const bulkOps = [];

      for (const tip of unrefined) {
        const matchStr = tip.match || '';
        const parts = matchStr.split(/\s+-\s+|\s+vs\s+/i);
        const homeTeam = parts[0]?.trim();
        const awayTeam = parts[1]?.trim();
        if (!homeTeam || !awayTeam) continue;

        const isoDate = sikuToIso[tip.siku];
        if (!isoDate) continue;

        const homeEscaped = homeTeam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const awayEscaped = awayTeam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const fixtures = await fixturesModel.find({
          jsDate: isoDate,
          'match.home.name': { $regex: homeEscaped, $options: 'i' },
          'match.away.name': { $regex: awayEscaped, $options: 'i' }
        }).lean();

        if (fixtures.length !== 1) {
          console.log(`[cron:refineFametips] Skip "${homeTeam}" (${isoDate}) — ${fixtures.length} fixture matches`);
          continue;
        }

        const fixture = fixtures[0];
        bulkOps.push({
          updateOne: {
            filter: { _id: tip._id },
            update: {
              $set: {
                match: `${fixture.match.home.name} - ${fixture.match.away.name}`,
                league: fixture.league || tip.league,
                isRefined: true
              }
            }
          }
        });

        console.log(`[cron:refineFametips] Refined: ${matchStr} → ${fixture.match.home.name} - ${fixture.match.away.name}`);
      }

      if (bulkOps.length) {
        await fameTipsModel.bulkWrite(bulkOps);
        console.log(`[cron:refineFametips] Updated ${bulkOps.length} tips`);
      } else {
        console.log('[cron:refineFametips] No tips to refine');
      }
    } catch (err) {
      console.error('[cron:refineFametips] Error:', err.message);
    }
  }, {
    timezone: 'Africa/Nairobi'
  });

  console.log('[cron:refineFametips] Scheduled (every hour, Africa/Nairobi)');
}

export default startRefineFametipsCron;
