#!/usr/bin/env tsx

/**
 * Export Model Calculation Breakdown to CSV
 * Shows all TSR components and how predictions are calculated
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface Standing {
  team: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  homeWins: number;
  homeLosses: number;
  roadWins: number;
  roadLosses: number;
  confWins: number;
  confLosses: number;
  last5Wins: number;
  last5Losses: number;
}

interface Game {
  gameId: string;
  season: number;
  week: number;
  homeTeam: { name: string };
  awayTeam: { name: string };
  homeScore: number | null;
  awayScore: number | null;
  vegasSpread: number | null;
}

interface MatrixConfig {
  w_net: number;
  w_momentum: number;
  w_conf: number;
  w_home: number;
  w_off: number;
  w_def: number;
  regression_factor: number;
}

const DEFAULT_CONFIG: MatrixConfig = {
  w_net: 0.5,
  w_momentum: 0.3,
  w_conf: 0.2,
  w_home: 0.25,
  w_off: 0.4,
  w_def: 0.4,
  regression_factor: 0.85
};

function calculateLeagueAverages(standings: Standing[]) {
  let totalPF = 0;
  let totalPA = 0;
  let totalGames = 0;

  standings.forEach(team => {
    const gp = team.wins + team.losses + team.ties;
    totalPF += team.pointsFor;
    totalPA += team.pointsAgainst;
    totalGames += gp;
  });

  const avgPFpg = totalGames > 0 ? totalPF / totalGames : 0;
  const avgPApg = totalGames > 0 ? totalPA / totalGames : 0;

  return {
    avgPFpg,
    avgPApg,
    avgNetPG: avgPFpg - avgPApg
  };
}

function calculateTSRComponents(
  standing: Standing,
  isHome: boolean,
  leagueAvg: { avgPFpg: number; avgPApg: number; avgNetPG: number },
  config: MatrixConfig
) {
  const gp = standing.wins + standing.losses + standing.ties;
  if (gp === 0) return null;

  const pfpg = standing.pointsFor / gp;
  const papg = standing.pointsAgainst / gp;
  const netPG = pfpg - papg;
  const winPct = standing.wins / gp;

  // 1. Net Point Performance
  const netComponent = config.w_net * (netPG - leagueAvg.avgNetPG);

  // 2. Momentum (Last 5 vs Season)
  const last5GP = standing.last5Wins + standing.last5Losses;
  const last5Pct = last5GP > 0 ? standing.last5Wins / last5GP : winPct;
  const momentumComponent = config.w_momentum * (last5Pct - winPct);

  // 3. Conference Strength
  const confGP = standing.confWins + standing.confLosses;
  const confPct = confGP > 0 ? standing.confWins / confGP : 0.50;
  const confComponent = config.w_conf * (confPct - 0.50);

  // 4. Home Field Advantage
  let homeComponent = 0;
  if (isHome) {
    const homeGP = standing.homeWins + standing.homeLosses;
    const roadGP = standing.roadWins + standing.roadLosses;
    if (homeGP > 0 && roadGP > 0) {
      const homePct = standing.homeWins / homeGP;
      const roadPct = standing.roadWins / roadGP;
      const homeEdgeRaw = homePct - roadPct;
      homeComponent = config.w_home * homeEdgeRaw;
    }
  }

  // 5. Offensive Strength
  const offComponent = config.w_off * (pfpg - leagueAvg.avgPFpg);

  // 6. Defensive Strength
  const defComponent = config.w_def * (leagueAvg.avgPApg - papg);

  const tsr = netComponent + momentumComponent + confComponent + homeComponent + offComponent + defComponent;

  return {
    team: standing.team,
    record: `${standing.wins}-${standing.losses}`,
    ppg: pfpg.toFixed(2),
    pag: papg.toFixed(2),
    netPG: netPG.toFixed(2),
    winPct: (winPct * 100).toFixed(1),
    last5Pct: (last5Pct * 100).toFixed(1),
    confPct: (confPct * 100).toFixed(1),
    netComponent: netComponent.toFixed(2),
    momentumComponent: momentumComponent.toFixed(2),
    confComponent: confComponent.toFixed(2),
    homeComponent: homeComponent.toFixed(2),
    offComponent: offComponent.toFixed(2),
    defComponent: defComponent.toFixed(2),
    totalTSR: tsr.toFixed(2)
  };
}

function findTeam(standings: Standing[], teamName: string): Standing | null {
  let team = standings.find(s => s.team.toLowerCase() === teamName.toLowerCase());
  if (team) return team;

  team = standings.find(s =>
    teamName.toLowerCase().includes(s.team.toLowerCase()) ||
    s.team.toLowerCase().includes(teamName.toLowerCase())
  );

  return team || null;
}

async function main() {
  console.log('🔄 Generating model breakdown CSV...\n');

  const publicDir = path.join(process.cwd(), 'public', 'training');

  // Load game data
  const gamesData = JSON.parse(
    await fs.readFile(path.join(publicDir, 'nfl_training_data_2025_with_vegas.json'), 'utf-8')
  );

  const allGames: Game[] = gamesData.data
    .filter((g: any) => g.outcome?.homeScore !== null && g.week >= 2 && g.week <= 5)
    .map((g: any) => ({
      gameId: g.gameId,
      season: g.season,
      week: g.week,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      homeScore: g.outcome?.homeScore || null,
      awayScore: g.outcome?.awayScore || null,
      vegasSpread: g.lines?.spread || null
    }));

  console.log(`✅ Processing ${allGames.length} games (Weeks 2-5 sample)\n`);

  const rows: string[] = [];

  // CSV Header
  const header = [
    'Week',
    'Home_Team',
    'Away_Team',
    'Home_TSR',
    'Away_TSR',
    'TSR_Diff',
    'Raw_Spread',
    'Predicted_Spread',
    'Vegas_Spread',
    'Actual_Spread',
    'Home_Net',
    'Home_Momentum',
    'Home_Conf',
    'Home_Field',
    'Home_Off',
    'Home_Def',
    'Away_Net',
    'Away_Momentum',
    'Away_Conf',
    'Away_Off',
    'Away_Def'
  ].join(',');

  rows.push(header);

  for (const game of allGames) {
    const standingsWeek = game.week - 1;

    let standings: Standing[];
    try {
      standings = JSON.parse(
        await fs.readFile(
          path.join(publicDir, `standings_2025_w${standingsWeek}.json`),
          'utf-8'
        )
      );
    } catch (err) {
      continue;
    }

    const leagueAvg = calculateLeagueAverages(standings);

    const homeStanding = findTeam(standings, game.homeTeam.name);
    const awayStanding = findTeam(standings, game.awayTeam.name);

    if (!homeStanding || !awayStanding) continue;

    const homeBreakdown = calculateTSRComponents(homeStanding, true, leagueAvg, DEFAULT_CONFIG);
    const awayBreakdown = calculateTSRComponents(awayStanding, false, leagueAvg, DEFAULT_CONFIG);

    if (!homeBreakdown || !awayBreakdown) continue;

    const homeTSR = parseFloat(homeBreakdown.totalTSR);
    const awayTSR = parseFloat(awayBreakdown.totalTSR);
    const tsrDiff = homeTSR - awayTSR;
    const rawSpread = tsrDiff * 0.20;
    const predictedSpread = rawSpread * DEFAULT_CONFIG.regression_factor;
    const actualSpread = (game.homeScore || 0) - (game.awayScore || 0);

    const row = [
      game.week,
      game.homeTeam.name.split(' ').pop(),
      game.awayTeam.name.split(' ').pop(),
      homeBreakdown.totalTSR,
      awayBreakdown.totalTSR,
      tsrDiff.toFixed(2),
      rawSpread.toFixed(2),
      predictedSpread.toFixed(2),
      game.vegasSpread?.toFixed(2) || 'N/A',
      actualSpread.toFixed(2),
      homeBreakdown.netComponent,
      homeBreakdown.momentumComponent,
      homeBreakdown.confComponent,
      homeBreakdown.homeComponent,
      homeBreakdown.offComponent,
      homeBreakdown.defComponent,
      awayBreakdown.netComponent,
      awayBreakdown.momentumComponent,
      awayBreakdown.confComponent,
      awayBreakdown.offComponent,
      awayBreakdown.defComponent
    ].join(',');

    rows.push(row);
  }

  const csv = rows.join('\n');
  const outputPath = path.join(process.cwd(), 'model_calculation_breakdown.csv');
  await fs.writeFile(outputPath, csv);

  console.log(`✅ CSV exported to: ${outputPath}`);
  console.log(`📊 Total predictions: ${rows.length - 1}`);
  console.log(`\n📝 Column Guide:`);
  console.log(`   TSR Components (weighted contributions to final TSR):`);
  console.log(`   - Net: Net point differential vs league avg (weight: 0.5)`);
  console.log(`   - Momentum: Last 5 games vs season avg (weight: 0.3)`);
  console.log(`   - Conf: Conference win % vs 50% (weight: 0.2)`);
  console.log(`   - Home_Field: Home vs road performance (weight: 0.25, home team only)`);
  console.log(`   - Off: Offensive efficiency vs league avg (weight: 0.4)`);
  console.log(`   - Def: Defensive efficiency vs league avg (weight: 0.4)`);
  console.log(`\n   Spread Calculation:`);
  console.log(`   - TSR_Diff = Home_TSR - Away_TSR`);
  console.log(`   - Raw_Spread = TSR_Diff × 0.20`);
  console.log(`   - Predicted_Spread = Raw_Spread × 0.85 (regression factor)`);
}

main().catch(console.error);
