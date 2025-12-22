const NFL_BLOB_URL = 'https://0luulmjdaimldet9.public.blob.vercel-storage.com/prediction-matrix-data.json';
const NBA_BLOB_URL = 'https://0luulmjdaimldet9.public.blob.vercel-storage.com/nba-prediction-data.json';

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  if (args.has('--nfl')) return ['nfl'];
  if (args.has('--nba')) return ['nba'];
  return ['nfl', 'nba'];
}

function bucketize(value) {
  const abs = Math.abs(value);
  if (abs === 0) return '0';
  if (abs <= 0.5) return '0.5';
  if (abs <= 1) return '1';
  if (abs <= 1.5) return '1.5';
  if (abs <= 2) return '2';
  if (abs <= 2.5) return '2.5';
  return '3+';
}

function fmtPct(n) {
  return `${(n * 100).toFixed(1)}%`;
}

function summarizeBucket(bucketStats) {
  const rows = Array.from(bucketStats.entries()).sort((a, b) => {
    const order = ['0', '0.5', '1', '1.5', '2', '2.5', '3+'];
    return order.indexOf(a[0]) - order.indexOf(b[0]);
  });
  for (const [bucket, stats] of rows) {
    const total = stats.win + stats.loss + stats.push;
    const winPct = total > 0 ? stats.win / total : 0;
    console.log(
      `  |move| ${bucket.padEnd(3)} -> ATS ${stats.win}-${stats.loss}-${stats.push} (${fmtPct(winPct)})`
    );
  }
}

function computeAtsResult(actualSpread, vegasSpread, pickHome) {
  const homeMargin = -actualSpread;
  const ats = homeMargin + vegasSpread;
  if (ats === 0) return 'push';
  const homeCovers = ats > 0;
  return pickHome ? (homeCovers ? 'win' : 'loss') : (homeCovers ? 'loss' : 'win');
}

function updateStats(stats, result) {
  if (result === 'win') stats.win += 1;
  else if (result === 'loss') stats.loss += 1;
  else stats.push += 1;
}

async function analyzeSport(label, url) {
  console.log(`\n=== ${label.toUpperCase()} LINE MOVEMENT BACKTEST ===`);
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Failed to fetch ${label} blob: ${response.status}`);
    return;
  }
  const data = await response.json();
  const historicalOdds = data.historicalOdds || {};
  const results = data.backtest?.results || [];

  const bucketsAligned = new Map();
  const bucketsAgainst = new Map();
  const bucketsAll = new Map();
  let totalWithMove = 0;
  let totalAll = 0;

  for (const result of results) {
    const odds = historicalOdds[result.gameId];
    if (!odds || odds.openingSpread === undefined) continue;

    const opening = odds.openingSpread;
    const closing = odds.closingSpread ?? odds.lastSeenSpread ?? odds.vegasSpread;
    if (opening === undefined || closing === undefined) continue;

    const move = Math.round((closing - opening) * 2) / 2;
    const bucket = bucketize(move);

    const vegasSpread = result.vegasSpread ?? odds.vegasSpread;
    if (vegasSpread === undefined) continue;
    if (result.actualSpread === undefined) continue;
    if (result.predictedSpread === undefined) continue;

    const pickHome = result.predictedSpread < vegasSpread;
    const atsResult = result.atsResult || computeAtsResult(result.actualSpread, vegasSpread, pickHome);

    totalAll += 1;
    if (move !== 0) totalWithMove += 1;

    const allStats = bucketsAll.get(bucket) || { win: 0, loss: 0, push: 0 };
    updateStats(allStats, atsResult);
    bucketsAll.set(bucket, allStats);

    if (move !== 0) {
      const moveTowardHome = move < 0;
      const aligned = (moveTowardHome && pickHome) || (!moveTowardHome && !pickHome);
      const target = aligned ? bucketsAligned : bucketsAgainst;
      const stats = target.get(bucket) || { win: 0, loss: 0, push: 0 };
      updateStats(stats, atsResult);
      target.set(bucket, stats);
    }
  }

  console.log(`Games w/ opening line: ${totalAll}`);
  console.log(`Games w/ movement: ${totalWithMove}`);
  console.log('\nAll games by movement magnitude:');
  summarizeBucket(bucketsAll);

  console.log('\nAligned with movement:');
  summarizeBucket(bucketsAligned);

  console.log('\nAgainst movement:');
  summarizeBucket(bucketsAgainst);
}

async function main() {
  const sports = parseArgs();
  if (sports.includes('nfl')) {
    await analyzeSport('nfl', NFL_BLOB_URL);
  }
  if (sports.includes('nba')) {
    await analyzeSport('nba', NBA_BLOB_URL);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
