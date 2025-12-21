import fametipsModel from '../../models/fametips.js';
import correctScoreModel from '../../models/correctScoreModel.js';
import vipModel from '../../models/vip.js';
import MikekaTipsModel from '../../models/mikeka-tips.js';

const TZ = 'Africa/Nairobi';

function dateStrings() {
  const now = new Date();
  const today = now.toLocaleDateString('en-GB', { timeZone: TZ });

  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const yesterday = yest.toLocaleDateString('en-GB', { timeZone: TZ });

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toLocaleDateString('en-GB', { timeZone: TZ });

  return { today, yesterday, tomorrow };
}

function emptyBuckets() {
  return { jana: [], leo: [], kesho: [] };
}

function normalizePrediction(prediction) {
  switch ((prediction || '').toUpperCase()) {
    case 'HOME WIN':
      return '1';
    case 'AWAY WIN':
      return '2';
    case 'DRAW':
      return 'X';
    case 'YES':
      return 'BTTS: Yes';
    case 'NO':
      return 'BTTS: No';
    default:
      return prediction;
  }
}

function mapTip(doc, prediction) {
  const normalized = normalizePrediction(prediction || doc.bet || doc.tip);
  return {
    match: doc.match,
    league: doc.league,
    prediction: normalized,
    kickoff: doc.time,
    dateLabel: doc.siku || doc.date,
    explanation: doc.expl,
  };
}

export async function getMegaTips() {
  const { today, yesterday, tomorrow } = dateStrings();
  const docs = await fametipsModel
    .find({ siku: { $in: [today, yesterday, tomorrow] } })
    .sort('time')
    .lean()
    .cache(600);

  const buckets = emptyBuckets();
  docs.forEach((doc) => {
    if (doc.siku === today) buckets.leo.push(mapTip(doc));
    if (doc.siku === yesterday) buckets.jana.push(mapTip(doc));
    if (doc.siku === tomorrow) buckets.kesho.push(mapTip(doc));
  });

  return buckets;
}

export async function getOver15Tips() {
  const { today, yesterday, tomorrow } = dateStrings();
  const overHome = ['3:0', '3:1', '4:0', '4:1', '4:2', '4:3', '5:0', '5:1', '5:2', '5:3'];
  const overAway = ['0:3', '1:3', '1:4', '2:4', '3:4', '0:4', '1:5', '2:5', '3:5', '0:5'];
  const docs = await correctScoreModel
    .find({ siku: { $in: [today, yesterday, tomorrow] }, tip: { $in: [...overHome, ...overAway] }, time: { $gt: '12:00' } })
    .sort('time')
    .lean()
    .cache(600);

  const buckets = emptyBuckets();
  docs.forEach((doc) => {
    const tip = mapTip(doc, 'Over 1.5');
    if (doc.siku === today) buckets.leo.push(tip);
    if (doc.siku === yesterday) buckets.jana.push(tip);
    if (doc.siku === tomorrow) buckets.kesho.push(tip);
  });

  return buckets;
}

export async function getBttsTips() {
  const { today, yesterday, tomorrow } = dateStrings();
  const yymmdd_today = today.split('/').reverse().join('-');
  const yymmdd_yesterday = yesterday.split('/').reverse().join('-');
  const yymmdd_tomorrow = tomorrow.split('/').reverse().join('-');

  const days = [yymmdd_today, yymmdd_yesterday, yymmdd_tomorrow];
  const bttsScores = ['1:3', '2:3', '2:2', '3:2', '1:4', '2:4', '4:2', '4:3']
  const bttsNo = ["0:0", "1:0"]

  const docs = await MikekaTipsModel
    .find({ date: { $in: days }, score: { $in: [...bttsScores, ...bttsNo] } })
    .sort('time')
    .lean()
    .cache(600);

  const buckets = emptyBuckets();
  docs.forEach((doc) => {
    const tip = mapTip(doc, bttsScores.includes(doc.score) ? 'BTTS: Yes' : 'BTTS: No');
    if (doc.date === yymmdd_today) buckets.leo.push(tip);
    if (doc.date === yymmdd_yesterday) buckets.jana.push(tip);
    if (doc.date === yymmdd_tomorrow) buckets.kesho.push(tip);
  });

  return buckets;
}

export async function getHt15Tips() {
  const { today, yesterday, tomorrow } = dateStrings();
  const under = ['0:0', '1:0', '0:1', '1:1'];
  const over = ['4:2', '2:4', '5:1', '5:2'];
  const docs = await correctScoreModel
    .find({ siku: { $in: [today, yesterday, tomorrow] }, tip: { $in: [...under, ...over] } })
    .sort('time')
    .lean()
    .cache(600);

  const buckets = emptyBuckets();
  docs.forEach((doc) => {
    let prediction = doc.tip;
    if (under.includes(doc.tip)) prediction = 'Under 1.5 HT';
    if (over.includes(doc.tip)) prediction = 'Over 1.5 HT';
    const tip = mapTip(doc, prediction);
    if (doc.siku === today) buckets.leo.push(tip);
    if (doc.siku === yesterday) buckets.jana.push(tip);
    if (doc.siku === tomorrow) buckets.kesho.push(tip);
  });

  return buckets;
}

export async function getVipTips() {
  const { today, yesterday, tomorrow } = dateStrings();
  const docs = await vipModel
    .find({ date: { $in: [today, yesterday, tomorrow] } })
    .sort('time')
    .lean();

  const buckets = emptyBuckets();
  docs.forEach((doc) => {
    const tip = mapTip(doc, doc.tip);
    if (doc.date === today) buckets.leo.push(tip);
    if (doc.date === yesterday) buckets.jana.push(tip);
    if (doc.date === tomorrow) buckets.kesho.push(tip);
  });

  return buckets;
}
