#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

const backtestData = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), 'public/training/backtest_results_2025.json'),
    'utf-8'
  )
);

// CSV Header
const header = [
  'Week',
  'Home',
  'Away',
  'Predicted_Home',
  'Predicted_Away',
  'Actual_Home',
  'Actual_Away',
  'Our_Spread',
  'Vegas_Spread',
  'Actual_Spread',
  'Our_Error',
  'Vegas_Error',
  'Winner_Correct',
  'ATS_Correct'
].join(',');

const rows = backtestData.allResults.map((game: any) => {
  const vegasError = game.vegasSpread !== null
    ? Math.abs(game.vegasSpread - game.actualSpread).toFixed(2)
    : 'N/A';

  return [
    game.week,
    game.homeTeam,
    game.awayTeam,
    game.predictedHome,
    game.predictedAway,
    game.actualHome,
    game.actualAway,
    game.predictedSpread.toFixed(2),
    game.vegasSpread !== null ? game.vegasSpread.toFixed(2) : 'N/A',
    game.actualSpread.toFixed(2),
    game.spreadError.toFixed(2),
    vegasError,
    game.winnerCorrect ? 'YES' : 'NO',
    game.atsCorrect !== null ? (game.atsCorrect ? 'YES' : 'NO') : 'N/A'
  ].join(',');
});

const csv = [header, ...rows].join('\n');

const outputPath = path.join(process.cwd(), 'backtest_ats_analysis.csv');
fs.writeFileSync(outputPath, csv);

console.log(`✅ CSV exported to: ${outputPath}`);
console.log(`📊 Total games: ${backtestData.allResults.length}`);

// Summary stats
const gamesWithVegas = backtestData.allResults.filter((g: any) => g.vegasSpread !== null);
const atsWins = gamesWithVegas.filter((g: any) => g.atsCorrect === true).length;
const atsLosses = gamesWithVegas.filter((g: any) => g.atsCorrect === false).length;

console.log(`\n📈 ATS Summary:`);
console.log(`   Games with Vegas lines: ${gamesWithVegas.length}`);
console.log(`   ATS Wins: ${atsWins}`);
console.log(`   ATS Losses: ${atsLosses}`);
console.log(`   ATS Win Rate: ${((atsWins / gamesWithVegas.length) * 100).toFixed(1)}%`);
