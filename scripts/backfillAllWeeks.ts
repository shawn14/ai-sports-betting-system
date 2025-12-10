import { db } from '../lib/firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { NFLAPI } from '../lib/api/nfl';
import { NFLStandingsData } from '../lib/scrapers/nflStandingsScraper';
import { MatrixConfig, LeagueAverages } from '../lib/models/matrixPredictor';
import * as fs from 'fs/promises';
import * as path from 'path';

const DEFAULT_CONFIG: MatrixConfig = {
  w_net: 5.0,
  w_momentum: 3.0,
  w_conf: 2.0,
  w_home: 2.5,
  w_off: 4.0,
  w_def: 4.0,
  w_recency_total: 0.3,
  total_boost: 0,
  volatility: 1.0,
  regression_factor: 0.85
};

async function backfillAllWeeks() {
  console.log('\n=== Backfilling Predictions for Weeks 1-14 ===\n');

  const season = 2025;
  let totalPredictions = 0;
  let totalResults = 0;
  let totalSkipped = 0;

  for (let week = 1; week <= 14; week++) {
    console.log(`\n--- Processing Week ${week} ---`);

    try {
      // 1. Load standings data
      const jsonPath = path.join(process.cwd(), 'public', 'training', `standings_${season}_w${week}.json`);
      const jsonData = await fs.readFile(jsonPath, 'utf-8');
      const standings: NFLStandingsData[] = JSON.parse(jsonData);
      console.log(`  ✅ Loaded standings for Week ${week}`);

      // 2. Calculate league averages
      const leagueAvg = calculateLeagueAverages(standings);

      // 3. Fetch completed games
      const games = await NFLAPI.getWeekGames(season, week);
      const completedGames = games.filter(g => g.status === 'completed' && g.homeScore !== null && g.awayScore !== null);
      console.log(`  ✅ Found ${completedGames.length} completed games`);

      // 4. Generate predictions for each game
      for (const game of completedGames) {
        try {
          // Find team standings
          const homeStandings = findTeamStandings(standings, game.homeTeam.name);
          const awayStandings = findTeamStandings(standings, game.awayTeam.name);

          if (!homeStandings || !awayStandings) {
            console.log(`  ⚠️  Missing standings for ${game.awayTeam.name} @ ${game.homeTeam.name}`);
            totalSkipped++;
            continue;
          }

          // Calculate TSR
          const homeTSR = calculateTSR(homeStandings, true, leagueAvg, DEFAULT_CONFIG);
          const awayTSR = calculateTSR(awayStandings, false, leagueAvg, DEFAULT_CONFIG);

          // Calculate predictions
          const tsrDiff = homeTSR - awayTSR;
          const rawSpread = tsrDiff * 0.20;
          const predictedSpread = rawSpread * DEFAULT_CONFIG.regression_factor;
          const predictedTotal = calculateTotal(homeStandings, awayStandings, leagueAvg, DEFAULT_CONFIG);
          const scores = calculateExactScores(predictedTotal, predictedSpread, DEFAULT_CONFIG.volatility);
          const confidence = calculateConfidence(homeTSR, awayTSR);

          // Save prediction to Firestore
          await setDoc(doc(db, 'predictions', game.id), {
            gameId: game.id,
            season,
            week,
            homeTeam: game.homeTeam.name,
            awayTeam: game.awayTeam.name,
            predictedScore: {
              home: scores.home,
              away: scores.away
            },
            predictedSpread,
            predictedTotal,
            predictedWinner: scores.home > scores.away ? 'home' : 'away',
            confidence,
            gameTime: game.gameTime,
            timestamp: new Date()
          });

          // Calculate result
          const actualHomeScore = game.homeScore!;
          const actualAwayScore = game.awayScore!;
          const actualSpread = actualHomeScore - actualAwayScore;
          const actualTotal = actualHomeScore + actualAwayScore;

          const actualWinner = actualHomeScore > actualAwayScore ? 'home' : 'away';
          const predictedWinner = scores.home > scores.away ? 'home' : 'away';
          const winnerCorrect = actualWinner === predictedWinner;

          const spreadError = Math.abs(predictedSpread - actualSpread);
          const spreadCovered = spreadError <= 7;

          const totalOver = actualTotal > predictedTotal;

          // Save result to Firestore
          const result = {
            gameId: game.id,
            season,
            week,
            predictedHomeScore: scores.home,
            predictedAwayScore: scores.away,
            predictedSpread,
            predictedTotal,
            predictedWinner,
            actualHomeScore,
            actualAwayScore,
            actualSpread,
            actualTotal,
            actualWinner,
            winnerCorrect,
            spreadCovered,
            totalOver,
            spreadError,
            totalError: Math.abs(predictedTotal - actualTotal),
            confidence,
            game: {
              homeTeam: game.homeTeam,
              awayTeam: game.awayTeam,
              gameTime: game.gameTime,
              venue: game.venue
            },
            timestamp: new Date()
          };

          await setDoc(doc(db, 'results', game.id), result);

          totalPredictions++;
          totalResults++;

          if (totalPredictions % 10 === 0) {
            console.log(`  Created ${totalPredictions} predictions so far...`);
          }
        } catch (gameError: any) {
          console.error(`  ❌ Error processing game ${game.id}:`, gameError.message);
          totalSkipped++;
        }
      }

      console.log(`  ✅ Week ${week} complete: ${completedGames.length} games processed`);
    } catch (weekError: any) {
      console.error(`  ❌ Error processing Week ${week}:`, weekError.message);
      totalSkipped += 1;
    }
  }

  console.log('\n=== Backfill Complete! ===\n');
  console.log(`  Predictions created: ${totalPredictions}`);
  console.log(`  Results created: ${totalResults}`);
  console.log(`  Skipped: ${totalSkipped}`);
  console.log('\n✅ Analytics page should now show full season data!\n');
}

// Helper functions (from hybrid-predictions route)

function calculateLeagueAverages(standings: NFLStandingsData[]): LeagueAverages {
  let totalPF = 0;
  let totalPA = 0;
  let totalGames = 0;

  standings.forEach(team => {
    const gp = team.wins + team.losses + team.ties;
    totalPF += team.pointsFor;
    totalPA += team.pointsAgainst;
    totalGames += gp;
  });

  const avgPFpg = totalGames > 0 ? totalPF / totalGames : 21.5;
  const avgPApg = totalGames > 0 ? totalPA / totalGames : 21.5;

  return {
    avgPFpg,
    avgPApg,
    avgNetPG: avgPFpg - avgPApg
  };
}

function findTeamStandings(standings: NFLStandingsData[], teamName: string): NFLStandingsData | null {
  let team = standings.find(s => s.team.toLowerCase() === teamName.toLowerCase());
  if (!team) {
    team = standings.find(s =>
      s.team.toLowerCase().includes(teamName.toLowerCase()) ||
      teamName.toLowerCase().includes(s.team.toLowerCase())
    );
  }
  return team || null;
}

function calculateTSR(
  standings: NFLStandingsData,
  isHome: boolean,
  leagueAvg: LeagueAverages,
  config: MatrixConfig
): number {
  const gp = standings.wins + standings.losses + standings.ties;
  if (gp === 0) return 0;

  const pfpg = standings.pointsFor / gp;
  const papg = standings.pointsAgainst / gp;
  const netPG = pfpg - papg;
  const winPct = standings.wins / gp;

  const netComponent = config.w_net * (netPG - leagueAvg.avgNetPG);

  const last5GP = standings.last5Wins + standings.last5Losses;
  const last5Pct = last5GP > 0 ? standings.last5Wins / last5GP : winPct;
  const momentumComponent = config.w_momentum * (last5Pct - winPct);

  const confGP = standings.confWins + standings.confLosses;
  const confPct = confGP > 0 ? standings.confWins / confGP : 0.50;
  const confComponent = config.w_conf * (confPct - 0.50);

  let homeComponent = 0;
  if (isHome) {
    const homeGP = standings.homeWins + standings.homeLosses;
    const roadGP = standings.roadWins + standings.roadLosses;

    if (homeGP > 0 && roadGP > 0) {
      const homePct = standings.homeWins / homeGP;
      const roadPct = standings.roadWins / roadGP;
      homeComponent = config.w_home * (homePct - roadPct);
    }
  }

  const offComponent = config.w_off * (pfpg - leagueAvg.avgPFpg);
  const defComponent = config.w_def * (leagueAvg.avgPApg - papg);

  const tsr = netComponent + momentumComponent + confComponent + homeComponent + offComponent + defComponent;

  return tsr;
}

function calculateTotal(
  homeStandings: NFLStandingsData,
  awayStandings: NFLStandingsData,
  leagueAvg: LeagueAverages,
  config: MatrixConfig
): number {
  const homeGP = homeStandings.wins + homeStandings.losses + homeStandings.ties;
  const awayGP = awayStandings.wins + awayStandings.losses + awayStandings.ties;

  if (homeGP === 0 || awayGP === 0) return 45;

  const home_PF_ppg = homeStandings.pointsFor / homeGP;
  const home_PA_ppg = homeStandings.pointsAgainst / homeGP;
  const away_PF_ppg = awayStandings.pointsFor / awayGP;
  const away_PA_ppg = awayStandings.pointsAgainst / awayGP;

  const homeOffEff = home_PF_ppg / leagueAvg.avgPFpg;
  const homeDefEff = leagueAvg.avgPApg / home_PA_ppg;
  const awayOffEff = away_PF_ppg / leagueAvg.avgPFpg;
  const awayDefEff = leagueAvg.avgPApg / away_PA_ppg;

  const homeExpected = leagueAvg.avgPFpg * homeOffEff * (1 / awayDefEff);
  const awayExpected = leagueAvg.avgPFpg * awayOffEff * (1 / homeDefEff);

  const rawTotal = homeExpected + awayExpected;
  const dampenedTotal = rawTotal * 0.95;
  const finalTotal = dampenedTotal + config.total_boost;

  return Math.max(30, Math.min(70, finalTotal));
}

function calculateExactScores(
  total: number,
  margin: number,
  volatility: number
): { home: number; away: number } {
  const favoredScore = (total + Math.abs(margin)) / 2;
  const underdogScore = (total - Math.abs(margin)) / 2;

  const home = margin >= 0 ? Math.round(favoredScore) : Math.round(underdogScore);
  const away = margin >= 0 ? Math.round(underdogScore) : Math.round(favoredScore);

  return { home, away };
}

function calculateConfidence(homeTSR: number, awayTSR: number): number {
  const tsrGap = Math.abs(homeTSR - awayTSR);
  const rawConfidence = 50 + (tsrGap * 0.5);
  return Math.min(95, Math.max(50, rawConfidence));
}

// Run the backfill
backfillAllWeeks().catch(console.error);
