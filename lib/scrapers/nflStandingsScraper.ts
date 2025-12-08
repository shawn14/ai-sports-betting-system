import puppeteer from 'puppeteer';

export interface NFLStandingsData {
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
  last5Wins: number;
  last5Losses: number;
}

export class NFLStandingsScraper {
  /**
   * Scrape standings for a given season
   * @param season - Year (e.g., 2024, 2025)
   * @returns Array of team standings
   */
  static async scrapeStandings(season: number): Promise<NFLStandingsData[]> {
    const url = `https://www.nfl.com/standings/league/${season}/REG`;

    console.log(`Launching browser to scrape ${url}...`);
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

      // Wait for standings table to load
      await page.waitForSelector('.d3-o-table', { timeout: 30000 });

      // Extract table data - using string function to avoid tsx transpilation
      const standings = await page.evaluate(`
        (() => {
          const rows = document.querySelectorAll('.d3-o-table tbody tr');
          const result = [];

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.querySelectorAll('td');

            if (cells.length < 11) continue;

            // Helper to parse "6-2" format
            const parseRec = (str) => {
              if (!str || str === '-') return [0, 0];
              const parts = str.split('-');
              return [parseInt(parts[0]) || 0, parseInt(parts[1]) || 0];
            };

            // Clean team name - try multiple methods
            let teamName = '';
            const teamDiv = cells[0].querySelector('.d3-o-club-fullname');
            if (teamDiv) {
              teamName = teamDiv.textContent.trim();
            } else {
              const teamLink = cells[0].querySelector('a');
              teamName = teamLink ? (teamLink.getAttribute('aria-label') || teamLink.textContent.trim()) : cells[0].textContent.trim();
            }
            // Remove playoff indicators, extra whitespace, newlines
            teamName = teamName.replace(/[xyz*]/gi, '').replace(/\\s+/g, ' ').replace(/\\n/g, '').trim();

            // NFL.com column order: Team | W | L | T | PCT | PF | PA | Net Pts | Home | Road | Div | Pct | Conf | Pct | Non-Conf | Strk | Last 5
            const homeRec = parseRec(cells[8] ? cells[8].textContent : '0-0');
            const roadRec = parseRec(cells[9] ? cells[9].textContent : '0-0');
            const confRec = parseRec(cells[12] ? cells[12].textContent : '0-0');  // FIXED: was 11, now 12
            const last5Rec = parseRec(cells[16] ? cells[16].textContent : '0-0'); // FIXED: was 13, now 16

            result.push({
              team: teamName,
              wins: parseInt(cells[1].textContent) || 0,
              losses: parseInt(cells[2].textContent) || 0,
              ties: parseInt(cells[3].textContent) || 0,
              pointsFor: parseInt(cells[5].textContent.replace(/,/g, '')) || 0,
              pointsAgainst: parseInt(cells[6].textContent.replace(/,/g, '')) || 0,
              homeWins: homeRec[0],
              homeLosses: homeRec[1],
              roadWins: roadRec[0],
              roadLosses: roadRec[1],
              confWins: confRec[0],
              confLosses: confRec[1],
              last5Wins: last5Rec[0],
              last5Losses: last5Rec[1],
              conference: 'AFC',
              division: ''
            });
          }

          return result;
        })()
      `);

      await browser.close();

      // Filter out empty rows and log results
      const validStandings = standings.filter(s => s.team && s.team.length > 0);
      console.log(`Successfully scraped ${validStandings.length} teams`);

      return validStandings;
    } catch (error) {
      await browser.close();
      console.error('Error scraping standings:', error);
      throw error;
    }
  }

  /**
   * Calculate league averages for normalization
   */
  static calculateLeagueAverages(standings: NFLStandingsData[]): {
    avgPFpg: number;
    avgPApg: number;
    avgNetPG: number;
  } {
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
}
