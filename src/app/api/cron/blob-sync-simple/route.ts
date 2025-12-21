import { NextResponse } from 'next/server';
import { put, head } from '@vercel/blob';
import { fetchNFLTeams, fetchNFLSchedule, fetchAllCompletedGames } from '@/services/espn';
import { updateEloAfterGame } from '@/services/elo';
import { Team } from '@/types';

// Constants
const LEAGUE_AVG_PPG = 22;
const ELO_TO_POINTS = 0.0593;
const HOME_FIELD_ADVANTAGE = 2.28;
const ELO_HOME_ADVANTAGE = 48;
const SPREAD_REGRESSION = 0.55;
const ELO_CAP = 4;

interface TeamData {
  id: string;
  name: string;
  abbreviation: string;
  eloRating: number;
  ppg?: number;
  ppgAllowed?: number;
}

interface BlobState {
  generated: string;
  teams: TeamData[];
  processedGameIds: string[];
  games: unknown[];
  recentGames: unknown[];
  backtest: {
    summary: {
      totalGames: number;
      spread: { wins: number; losses: number; pushes: number; winPct: number };
      moneyline: { wins: number; losses: number; winPct: number };
      overUnder: { wins: number; losses: number; pushes: number; winPct: number };
    };
    results: unknown[];
  };
}

function predictScore(
  homeElo: number,
  awayElo: number,
  homePPG: number,
  homePPGAllowed: number,
  awayPPG: number,
  awayPPGAllowed: number
) {
  const regress = (stat: number) => stat * 0.7 + LEAGUE_AVG_PPG * 0.3;
  let homeScore = (regress(homePPG) + regress(awayPPGAllowed)) / 2;
  let awayScore = (regress(awayPPG) + regress(homePPGAllowed)) / 2;

  const eloDiff = homeElo - awayElo;
  let eloAdj = (eloDiff * ELO_TO_POINTS) / 2;
  if (ELO_CAP > 0) {
    eloAdj = Math.max(-ELO_CAP / 2, Math.min(ELO_CAP / 2, eloAdj));
  }

  homeScore += eloAdj + HOME_FIELD_ADVANTAGE / 2;
  awayScore -= eloAdj - HOME_FIELD_ADVANTAGE / 2;

  return {
    homeScore: Math.round(homeScore * 10) / 10,
    awayScore: Math.round(awayScore * 10) / 10,
  };
}

function calculateSpread(homeScore: number, awayScore: number): number {
  const rawSpread = awayScore - homeScore;
  return Math.round(rawSpread * (1 - SPREAD_REGRESSION) * 2) / 2;
}

async function fetchExistingBlob(): Promise<BlobState | null> {
  try {
    const blobInfo = await head('prediction-matrix-data.json');
    if (!blobInfo?.url) return null;
    const response = await fetch(blobInfo.url);
    return await response.json();
  } catch {
    return null;
  }
}

export async function GET() {
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  try {
    // 1. Read existing blob state
    log('Checking existing blob state...');
    const existingState = await fetchExistingBlob();

    const isFirstRun = !existingState || !existingState.processedGameIds?.length;
    log(isFirstRun ? 'First run - will process all games' : `Found ${existingState.processedGameIds.length} processed games`);

    // 2. Build team map from existing state or fresh from ESPN
    const teamsMap = new Map<string, TeamData>();

    if (existingState?.teams?.length) {
      // Use existing Elo ratings
      for (const team of existingState.teams) {
        teamsMap.set(team.id, team);
      }
      log(`Loaded ${teamsMap.size} teams with existing Elos`);
    } else {
      // First run - fetch fresh from ESPN
      log('Fetching NFL teams from ESPN...');
      const espnTeams = await fetchNFLTeams();
      for (const team of espnTeams) {
        if (!team.id) continue;
        teamsMap.set(team.id, {
          id: team.id,
          name: team.name || '',
          abbreviation: team.abbreviation || '',
          eloRating: 1500, // Start fresh
          ppg: team.ppg,
          ppgAllowed: team.ppgAllowed,
        });
      }
      log(`Fetched ${teamsMap.size} teams (starting Elo: 1500)`);
    }

    // Also update PPG stats from ESPN (these change weekly)
    const espnTeams = await fetchNFLTeams();
    for (const team of espnTeams) {
      if (!team.id) continue;
      const existing = teamsMap.get(team.id);
      if (existing) {
        existing.ppg = team.ppg;
        existing.ppgAllowed = team.ppgAllowed;
      }
    }

    // 3. Get processed game IDs set
    const processedGameIds = new Set<string>(existingState?.processedGameIds || []);

    // 4. Fetch completed games
    let completedGames;
    if (isFirstRun) {
      log('Fetching all completed games (first run)...');
      completedGames = await fetchAllCompletedGames();
    } else {
      log('Fetching current week games...');
      completedGames = (await fetchNFLSchedule()).filter(g => g.status === 'final');
    }

    // Filter to only unprocessed games
    const newGames = completedGames.filter(g => g.id && !processedGameIds.has(g.id));
    log(`Found ${newGames.length} new completed games to process`);

    // Sort chronologically
    newGames.sort((a, b) => new Date(a.gameTime || 0).getTime() - new Date(b.gameTime || 0).getTime());

    // 5. Process new games - update Elos and track results
    let spreadWins = existingState?.backtest?.summary?.spread?.wins || 0;
    let spreadLosses = existingState?.backtest?.summary?.spread?.losses || 0;
    let spreadPushes = existingState?.backtest?.summary?.spread?.pushes || 0;
    let mlWins = existingState?.backtest?.summary?.moneyline?.wins || 0;
    let mlLosses = existingState?.backtest?.summary?.moneyline?.losses || 0;
    let ouWins = existingState?.backtest?.summary?.overUnder?.wins || 0;
    let ouLosses = existingState?.backtest?.summary?.overUnder?.losses || 0;
    let ouPushes = existingState?.backtest?.summary?.overUnder?.pushes || 0;

    const newBacktestResults: unknown[] = [];

    for (const game of newGames) {
      if (game.homeScore === undefined || game.awayScore === undefined) continue;
      if (!game.id || !game.homeTeamId || !game.awayTeamId) continue;

      const homeTeam = teamsMap.get(game.homeTeamId);
      const awayTeam = teamsMap.get(game.awayTeamId);
      if (!homeTeam || !awayTeam) continue;

      const homeElo = homeTeam.eloRating;
      const awayElo = awayTeam.eloRating;

      // Predict using current Elo
      const { homeScore: predHome, awayScore: predAway } = predictScore(
        homeElo, awayElo,
        homeTeam.ppg || LEAGUE_AVG_PPG, homeTeam.ppgAllowed || LEAGUE_AVG_PPG,
        awayTeam.ppg || LEAGUE_AVG_PPG, awayTeam.ppgAllowed || LEAGUE_AVG_PPG
      );

      const predictedSpread = calculateSpread(predHome, predAway);
      const predictedTotal = predHome + predAway;
      const adjustedHomeElo = homeElo + ELO_HOME_ADVANTAGE;
      const homeWinProb = 1 / (1 + Math.pow(10, (awayElo - adjustedHomeElo) / 400));

      const actualHomeScore = game.homeScore;
      const actualAwayScore = game.awayScore;
      const actualSpread = actualAwayScore - actualHomeScore;
      const actualTotal = actualHomeScore + actualAwayScore;
      const homeWon = actualHomeScore > actualAwayScore;

      const spreadPick = predictedSpread < 0 ? 'home' : 'away';
      const mlPick = homeWinProb > 0.5 ? 'home' : 'away';

      let spreadResult: 'win' | 'loss' | 'push';
      if (spreadPick === 'home') {
        spreadResult = actualSpread < predictedSpread ? 'win' : actualSpread > predictedSpread ? 'loss' : 'push';
      } else {
        spreadResult = actualSpread > predictedSpread ? 'win' : actualSpread < predictedSpread ? 'loss' : 'push';
      }

      const mlResult = (mlPick === 'home' && homeWon) || (mlPick === 'away' && !homeWon) ? 'win' : 'loss';
      const ouPickActual: 'over' | 'under' = predictedTotal > 44 ? 'over' : 'under';
      let ouResult: 'win' | 'loss' | 'push';
      if (ouPickActual === 'over') {
        ouResult = actualTotal > 44 ? 'win' : actualTotal < 44 ? 'loss' : 'push';
      } else {
        ouResult = actualTotal < 44 ? 'win' : actualTotal > 44 ? 'loss' : 'push';
      }

      // Update totals
      if (spreadResult === 'win') spreadWins++;
      else if (spreadResult === 'loss') spreadLosses++;
      else spreadPushes++;
      if (mlResult === 'win') mlWins++;
      else mlLosses++;
      if (ouResult === 'win') ouWins++;
      else if (ouResult === 'loss') ouLosses++;
      else ouPushes++;

      newBacktestResults.push({
        gameId: game.id,
        gameTime: game.gameTime || '',
        week: game.week,
        homeTeam: homeTeam.abbreviation,
        awayTeam: awayTeam.abbreviation,
        homeElo, awayElo,
        predictedHomeScore: predHome,
        predictedAwayScore: predAway,
        predictedSpread: Math.round(predictedSpread * 2) / 2,
        predictedTotal: Math.round(predictedTotal * 2) / 2,
        homeWinProb: Math.round(homeWinProb * 100) / 100,
        actualHomeScore, actualAwayScore,
        actualSpread, actualTotal, homeWon,
        spreadPick, spreadResult,
        mlPick, mlResult,
        ouPick: ouPickActual, ouResult,
      });

      // Update Elo for next game
      const { homeNewElo, awayNewElo } = updateEloAfterGame(
        { id: game.homeTeamId, eloRating: homeElo } as Team,
        { id: game.awayTeamId, eloRating: awayElo } as Team,
        actualHomeScore, actualAwayScore
      );
      homeTeam.eloRating = homeNewElo;
      awayTeam.eloRating = awayNewElo;

      // Mark as processed
      processedGameIds.add(game.id);
    }

    log(`Processed ${newGames.length} new games. Spread: ${spreadWins}-${spreadLosses}`);

    // 6. Merge backtest results (new + existing)
    const allBacktestResults = [
      ...newBacktestResults,
      ...(existingState?.backtest?.results || []),
    ];

    // 7. Fetch upcoming games and generate predictions
    log('Fetching upcoming games...');
    const upcomingGames = await fetchNFLSchedule();
    const upcoming = upcomingGames.filter(g => g.status !== 'final');
    log(`Found ${upcoming.length} upcoming games`);

    const gamesWithPredictions = [];
    for (const game of upcoming) {
      if (!game.id || !game.homeTeamId || !game.awayTeamId) continue;
      const homeTeam = teamsMap.get(game.homeTeamId);
      const awayTeam = teamsMap.get(game.awayTeamId);
      if (!homeTeam || !awayTeam) continue;

      const { homeScore: predHome, awayScore: predAway } = predictScore(
        homeTeam.eloRating, awayTeam.eloRating,
        homeTeam.ppg || LEAGUE_AVG_PPG, homeTeam.ppgAllowed || LEAGUE_AVG_PPG,
        awayTeam.ppg || LEAGUE_AVG_PPG, awayTeam.ppgAllowed || LEAGUE_AVG_PPG
      );

      const adjustedHomeElo = homeTeam.eloRating + ELO_HOME_ADVANTAGE;
      const homeWinProb = 1 / (1 + Math.pow(10, (awayTeam.eloRating - adjustedHomeElo) / 400));

      gamesWithPredictions.push({
        game: {
          ...game,
          homeTeam: { id: homeTeam.id, name: homeTeam.name, abbreviation: homeTeam.abbreviation },
          awayTeam: { id: awayTeam.id, name: awayTeam.name, abbreviation: awayTeam.abbreviation },
        },
        prediction: {
          gameId: game.id,
          predictedHomeScore: predHome,
          predictedAwayScore: predAway,
          predictedSpread: calculateSpread(predHome, predAway),
          predictedTotal: predHome + predAway,
          homeWinProbability: homeWinProb,
          confidence: 0.5,
        },
      });
    }

    // 8. Build blob data
    const spreadTotal = spreadWins + spreadLosses;
    const mlTotal = mlWins + mlLosses;
    const ouTotal = ouWins + ouLosses;

    const blobData: BlobState = {
      generated: new Date().toISOString(),
      teams: Array.from(teamsMap.values()).sort((a, b) => b.eloRating - a.eloRating),
      processedGameIds: Array.from(processedGameIds),
      games: gamesWithPredictions.sort((a, b) =>
        new Date(a.game.gameTime || 0).getTime() - new Date(b.game.gameTime || 0).getTime()
      ),
      recentGames: allBacktestResults.slice(0, 10).map((r: any) => ({
        id: r.gameId,
        homeTeam: { abbreviation: r.homeTeam },
        awayTeam: { abbreviation: r.awayTeam },
        homeScore: r.actualHomeScore,
        awayScore: r.actualAwayScore,
        gameTime: r.gameTime,
        status: 'final',
        week: r.week,
      })),
      backtest: {
        summary: {
          totalGames: processedGameIds.size,
          spread: { wins: spreadWins, losses: spreadLosses, pushes: spreadPushes, winPct: spreadTotal > 0 ? Math.round((spreadWins / spreadTotal) * 1000) / 10 : 0 },
          moneyline: { wins: mlWins, losses: mlLosses, winPct: mlTotal > 0 ? Math.round((mlWins / mlTotal) * 1000) / 10 : 0 },
          overUnder: { wins: ouWins, losses: ouLosses, pushes: ouPushes, winPct: ouTotal > 0 ? Math.round((ouWins / ouTotal) * 1000) / 10 : 0 },
        },
        results: allBacktestResults,
      },
    };

    // 9. Upload
    const jsonString = JSON.stringify(blobData);
    log(`Uploading to blob... (${Math.round(jsonString.length / 1024)}KB)`);

    const blob = await put('prediction-matrix-data.json', jsonString, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    log(`Done! ${blob.url}`);

    return NextResponse.json({
      success: true,
      blobUrl: blob.url,
      stats: {
        teams: teamsMap.size,
        newGamesProcessed: newGames.length,
        totalGamesProcessed: processedGameIds.size,
        upcomingGames: gamesWithPredictions.length,
        spreadRecord: `${spreadWins}-${spreadLosses} (${spreadTotal > 0 ? Math.round((spreadWins / spreadTotal) * 1000) / 10 : 0}%)`,
      },
      logs,
    });
  } catch (error) {
    console.error('Blob sync error:', error);
    return NextResponse.json({
      error: 'Blob sync failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      logs,
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
