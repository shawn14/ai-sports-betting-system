/**
 * Build historical week-by-week standings from ESPN game data
 *
 * This script processes completed games sequentially to create
 * standings snapshots as of the end of each week.
 *
 * Usage:
 *   npx tsx scripts/buildHistoricalStandings.ts 2024 1 18
 *   (builds standings for weeks 1-18 of 2024 season)
 */

import { NFLAPI } from '../lib/api/nfl';
import { NFLStandingsData } from '../lib/scrapers/nflStandingsScraper';
import * as fs from 'fs/promises';
import * as path from 'path';

interface TeamStats {
  team: string;
  conference: 'AFC' | 'NFC';
  division: string;
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
  last5Results: ('W' | 'L' | 'T')[];
}

const NFL_TEAMS = {
  // AFC East
  'Buffalo Bills': { conference: 'AFC', division: 'East' },
  'Miami Dolphins': { conference: 'AFC', division: 'East' },
  'New England Patriots': { conference: 'AFC', division: 'East' },
  'New York Jets': { conference: 'AFC', division: 'East' },

  // AFC North
  'Baltimore Ravens': { conference: 'AFC', division: 'North' },
  'Cincinnati Bengals': { conference: 'AFC', division: 'North' },
  'Cleveland Browns': { conference: 'AFC', division: 'North' },
  'Pittsburgh Steelers': { conference: 'AFC', division: 'North' },

  // AFC South
  'Houston Texans': { conference: 'AFC', division: 'South' },
  'Indianapolis Colts': { conference: 'AFC', division: 'South' },
  'Jacksonville Jaguars': { conference: 'AFC', division: 'South' },
  'Tennessee Titans': { conference: 'AFC', division: 'South' },

  // AFC West
  'Denver Broncos': { conference: 'AFC', division: 'West' },
  'Kansas City Chiefs': { conference: 'AFC', division: 'West' },
  'Las Vegas Raiders': { conference: 'AFC', division: 'West' },
  'Los Angeles Chargers': { conference: 'AFC', division: 'West' },

  // NFC East
  'Dallas Cowboys': { conference: 'NFC', division: 'East' },
  'New York Giants': { conference: 'NFC', division: 'East' },
  'Philadelphia Eagles': { conference: 'NFC', division: 'East' },
  'Washington Commanders': { conference: 'NFC', division: 'East' },

  // NFC North
  'Chicago Bears': { conference: 'NFC', division: 'North' },
  'Detroit Lions': { conference: 'NFC', division: 'North' },
  'Green Bay Packers': { conference: 'NFC', division: 'North' },
  'Minnesota Vikings': { conference: 'NFC', division: 'North' },

  // NFC South
  'Atlanta Falcons': { conference: 'NFC', division: 'South' },
  'Carolina Panthers': { conference: 'NFC', division: 'South' },
  'New Orleans Saints': { conference: 'NFC', division: 'South' },
  'Tampa Bay Buccaneers': { conference: 'NFC', division: 'South' },

  // NFC West
  'Arizona Cardinals': { conference: 'NFC', division: 'West' },
  'Los Angeles Rams': { conference: 'NFC', division: 'West' },
  'San Francisco 49ers': { conference: 'NFC', division: 'West' },
  'Seattle Seahawks': { conference: 'NFC', division: 'West' },
} as const;

async function main() {
  const season = parseInt(process.argv[2] || '2024');
  const startWeek = parseInt(process.argv[3] || '1');
  const endWeek = parseInt(process.argv[4] || '18');

  console.log(`\n🏈 Building historical standings for ${season} season (Weeks ${startWeek}-${endWeek})\n`);

  // Initialize team stats
  const teamStats: Record<string, TeamStats> = {};

  for (const [teamName, info] of Object.entries(NFL_TEAMS)) {
    teamStats[teamName] = {
      team: teamName,
      conference: info.conference as 'AFC' | 'NFC',
      division: info.division,
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      homeWins: 0,
      homeLosses: 0,
      roadWins: 0,
      roadLosses: 0,
      confWins: 0,
      confLosses: 0,
      last5Results: []
    };
  }

  // Process each week sequentially
  for (let week = 1; week <= endWeek; week++) {
    console.log(`Processing Week ${week}...`);

    const games = await NFLAPI.getWeekGames(season, week);
    const completedGames = games.filter(g => g.status === 'completed');

    if (completedGames.length === 0) {
      console.log(`  ⚠️  No completed games for Week ${week}`);
      continue;
    }

    // Update stats for each completed game
    for (const game of completedGames) {
      const homeTeam = game.homeTeam.name;
      const awayTeam = game.awayTeam.name;
      const homeScore = game.homeScore || 0;
      const awayScore = game.awayScore || 0;

      if (!teamStats[homeTeam] || !teamStats[awayTeam]) {
        console.log(`  ⚠️  Unknown team: ${homeTeam} or ${awayTeam}`);
        continue;
      }

      // Update scores
      teamStats[homeTeam].pointsFor += homeScore;
      teamStats[homeTeam].pointsAgainst += awayScore;
      teamStats[awayTeam].pointsFor += awayScore;
      teamStats[awayTeam].pointsAgainst += homeScore;

      // Determine winner
      let homeResult: 'W' | 'L' | 'T';
      let awayResult: 'W' | 'L' | 'T';

      if (homeScore > awayScore) {
        homeResult = 'W';
        awayResult = 'L';
        teamStats[homeTeam].wins++;
        teamStats[homeTeam].homeWins++;
        teamStats[awayTeam].losses++;
        teamStats[awayTeam].roadLosses++;
      } else if (awayScore > homeScore) {
        homeResult = 'L';
        awayResult = 'W';
        teamStats[homeTeam].losses++;
        teamStats[homeTeam].homeLosses++;
        teamStats[awayTeam].wins++;
        teamStats[awayTeam].roadWins++;
      } else {
        homeResult = 'T';
        awayResult = 'T';
        teamStats[homeTeam].ties++;
        teamStats[awayTeam].ties++;
      }

      // Update last 5
      teamStats[homeTeam].last5Results.push(homeResult);
      if (teamStats[homeTeam].last5Results.length > 5) {
        teamStats[homeTeam].last5Results.shift();
      }

      teamStats[awayTeam].last5Results.push(awayResult);
      if (teamStats[awayTeam].last5Results.length > 5) {
        teamStats[awayTeam].last5Results.shift();
      }

      // Update conference records (same conference matchup)
      const homeConf = teamStats[homeTeam].conference;
      const awayConf = teamStats[awayTeam].conference;

      if (homeConf === awayConf) {
        if (homeResult === 'W') {
          teamStats[homeTeam].confWins++;
          teamStats[awayTeam].confLosses++;
        } else if (homeResult === 'L') {
          teamStats[homeTeam].confLosses++;
          teamStats[awayTeam].confWins++;
        }
      }
    }

    // Save standings snapshot for this week (if >= startWeek)
    if (week >= startWeek) {
      const standings: NFLStandingsData[] = Object.values(teamStats).map(team => ({
        team: team.team,
        conference: team.conference,
        division: team.division,
        wins: team.wins,
        losses: team.losses,
        ties: team.ties,
        pointsFor: team.pointsFor,
        pointsAgainst: team.pointsAgainst,
        homeWins: team.homeWins,
        homeLosses: team.homeLosses,
        roadWins: team.roadWins,
        roadLosses: team.roadLosses,
        confWins: team.confWins,
        confLosses: team.confLosses,
        last5Wins: team.last5Results.filter(r => r === 'W').length,
        last5Losses: team.last5Results.filter(r => r === 'L').length
      }));

      // Save to JSON
      const outputDir = path.join(process.cwd(), 'public', 'training');
      await fs.mkdir(outputDir, { recursive: true });

      const outputPath = path.join(outputDir, `standings_${season}_w${week}.json`);
      await fs.writeFile(outputPath, JSON.stringify(standings, null, 2));

      console.log(`  ✅ Saved: standings_${season}_w${week}.json (${completedGames.length} games processed)`);
    }

    // Small delay to be respectful to ESPN API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n✅ Complete! Generated standings for Weeks ${startWeek}-${endWeek} of ${season} season\n`);
}

main().catch(console.error);
