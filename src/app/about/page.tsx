'use client';

import { useState, useEffect } from 'react';

interface BacktestResult {
  gameId: string;
  atsResult?: 'win' | 'loss' | 'push';
  ouVegasResult?: 'win' | 'loss' | 'push';
  ouResult?: 'win' | 'loss' | 'push';
  mlResult?: 'win' | 'loss';
  vegasSpread?: number;
  vegasTotal?: number;
  predictedSpread: number;
  predictedTotal: number;
  homeWinProb: number;
  conviction?: {
    isHighConviction?: boolean;
  };
}

interface SportStats {
  all: {
    ats: { w: number; l: number; p: number };
    ml: { w: number; l: number };
    ou: { w: number; l: number; p: number };
  };
  highConv: {
    ats: { w: number; l: number; p: number };
    ml: { w: number; l: number };
    ou: { w: number; l: number; p: number };
  };
  gamesWithOdds: number;
}

function computeStats(results: BacktestResult[], sport: 'nfl' | 'nba' | 'nhl'): SportStats {
  const all = {
    ats: { w: 0, l: 0, p: 0 },
    ml: { w: 0, l: 0 },
    ou: { w: 0, l: 0, p: 0 },
  };
  const highConv = {
    ats: { w: 0, l: 0, p: 0 },
    ml: { w: 0, l: 0 },
    ou: { w: 0, l: 0, p: 0 },
  };

  let gamesWithOdds = 0;

  // Sport-specific thresholds
  const ouThreshold = sport === 'nhl' ? 1.5 : 5; // 1.5 goals for NHL, 5 pts for NBA/NFL
  const atsThreshold = sport === 'nhl' ? 0.75 : undefined; // NHL uses spread edge, others use conviction flag

  for (const r of results) {
    if (r.vegasSpread === undefined) continue;
    gamesWithOdds++;

    // All picks
    if (r.atsResult === 'win') all.ats.w++;
    else if (r.atsResult === 'loss') all.ats.l++;
    else if (r.atsResult === 'push') all.ats.p++;

    if (r.mlResult === 'win') all.ml.w++;
    else if (r.mlResult === 'loss') all.ml.l++;

    const ouRes = r.ouVegasResult || r.ouResult;
    if (ouRes === 'win') all.ou.w++;
    else if (ouRes === 'loss') all.ou.l++;
    else if (ouRes === 'push') all.ou.p++;

    // High conviction calculations
    const spreadEdge = r.vegasSpread !== undefined ? Math.abs(r.predictedSpread - r.vegasSpread) : 0;
    const totalEdge = r.vegasTotal !== undefined ? Math.abs(r.predictedTotal - r.vegasTotal) : 0;
    const mlEdge = Math.abs(r.homeWinProb - 0.5) * 100;

    // High conviction ATS
    const isHighConvAts = sport === 'nhl'
      ? spreadEdge >= atsThreshold!
      : r.conviction?.isHighConviction === true;

    if (isHighConvAts && r.atsResult) {
      if (r.atsResult === 'win') highConv.ats.w++;
      else if (r.atsResult === 'loss') highConv.ats.l++;
      else highConv.ats.p++;
    }

    // High conviction O/U
    if (totalEdge >= ouThreshold && ouRes) {
      if (ouRes === 'win') highConv.ou.w++;
      else if (ouRes === 'loss') highConv.ou.l++;
      else highConv.ou.p++;
    }

    // High conviction ML (15%+ edge for all sports)
    if (mlEdge >= 15 && r.mlResult) {
      if (r.mlResult === 'win') highConv.ml.w++;
      else highConv.ml.l++;
    }
  }

  return { all, highConv, gamesWithOdds };
}

function pct(w: number, l: number): string {
  const total = w + l;
  if (total === 0) return '0.0';
  return ((w / total) * 100).toFixed(1);
}

function StatBox({ label, w, l, p, highlight }: { label: string; w: number; l: number; p?: number; highlight?: boolean }) {
  const winPct = parseFloat(pct(w, l));
  const isGood = winPct >= 52.4;
  const record = p && p > 0 ? `${w}-${l}-${p}` : `${w}-${l}`;

  return (
    <div className={`text-center p-3 rounded-lg ${highlight ? (isGood ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200') : ''}`}>
      <div className="text-[10px] text-gray-500 uppercase mb-1">{label}</div>
      <div className={`text-xl font-bold ${isGood ? 'text-green-600' : 'text-gray-600'}`}>
        {pct(w, l)}%
      </div>
      <div className="text-[10px] text-gray-400">{record}</div>
    </div>
  );
}

export default function AboutPage() {
  const [nflStats, setNflStats] = useState<SportStats | null>(null);
  const [nbaStats, setNbaStats] = useState<SportStats | null>(null);
  const [nhlStats, setNhlStats] = useState<SportStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [nflRes, nbaRes, nhlRes] = await Promise.all([
          fetch('/prediction-data.json').then(r => r.json()).catch(() => null),
          fetch('/nba-prediction-data.json').then(r => r.json()).catch(() => null),
          fetch('/nhl-prediction-data.json').then(r => r.json()).catch(() => null),
        ]);

        if (nflRes?.backtest) {
          setNflStats(computeStats(nflRes.backtest, 'nfl'));
        }
        if (nbaRes?.backtest) {
          setNbaStats(computeStats(nbaRes.backtest, 'nba'));
        }
        if (nhlRes?.backtest) {
          setNhlStats(computeStats(nhlRes.backtest, 'nhl'));
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">How Prediction Matrix Works</h1>

      <div className="space-y-8 text-gray-600">
        <p className="text-lg">
          Prediction Matrix is a transparent, data-driven sports prediction system covering NFL, NBA, and NHL.
          Every prediction can be traced back to specific inputs and calculations - click any game card to see exactly how the numbers were generated.
        </p>

        {/* Glass Box Feature */}
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Full Calculation Transparency</h2>
          <p className="text-sm mb-3">
            Click any game card on the picks page to see the complete &quot;glass box&quot; breakdown:
          </p>
          <ul className="text-sm space-y-1.5 text-gray-600">
            <li>• Team Elo ratings and how they translate to point spreads</li>
            <li>• Offensive and defensive stats with regression adjustments</li>
            <li>• Step-by-step score calculation with exact formulas</li>
            <li>• Edge analysis showing our prediction vs Vegas lines</li>
            <li>• Win probability calculations from Elo differential</li>
          </ul>
        </div>

        {/* Live Stats Section */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Season Performance</h2>
          <p className="text-sm text-gray-500 mb-6">
            Live results from this season. High conviction picks are filtered to our best situations.
            Break-even at -110 odds is 52.4%.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* NFL */}
              {nflStats && nflStats.gamesWithOdds > 0 && (
                <div className="border-b border-gray-100 pb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg font-bold text-gray-900">NFL</span>
                    <span className="text-xs text-gray-400">({nflStats.gamesWithOdds} games)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-2">All Picks</div>
                      <div className="grid grid-cols-3 gap-2">
                        <StatBox label="ATS" w={nflStats.all.ats.w} l={nflStats.all.ats.l} p={nflStats.all.ats.p} />
                        <StatBox label="ML" w={nflStats.all.ml.w} l={nflStats.all.ml.l} />
                        <StatBox label="O/U" w={nflStats.all.ou.w} l={nflStats.all.ou.l} p={nflStats.all.ou.p} />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-green-600 uppercase mb-2">High Conviction</div>
                      <div className="grid grid-cols-3 gap-2">
                        <StatBox label="ATS" w={nflStats.highConv.ats.w} l={nflStats.highConv.ats.l} p={nflStats.highConv.ats.p} highlight />
                        <StatBox label="ML" w={nflStats.highConv.ml.w} l={nflStats.highConv.ml.l} highlight />
                        <StatBox label="O/U" w={nflStats.highConv.ou.w} l={nflStats.highConv.ou.l} p={nflStats.highConv.ou.p} highlight />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* NBA */}
              {nbaStats && nbaStats.gamesWithOdds > 0 && (
                <div className="border-b border-gray-100 pb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg font-bold text-gray-900">NBA</span>
                    <span className="text-xs text-gray-400">({nbaStats.gamesWithOdds} games)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-2">All Picks</div>
                      <div className="grid grid-cols-3 gap-2">
                        <StatBox label="ATS" w={nbaStats.all.ats.w} l={nbaStats.all.ats.l} p={nbaStats.all.ats.p} />
                        <StatBox label="ML" w={nbaStats.all.ml.w} l={nbaStats.all.ml.l} />
                        <StatBox label="O/U" w={nbaStats.all.ou.w} l={nbaStats.all.ou.l} p={nbaStats.all.ou.p} />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-green-600 uppercase mb-2">High Conviction</div>
                      <div className="grid grid-cols-3 gap-2">
                        <StatBox label="ATS" w={nbaStats.highConv.ats.w} l={nbaStats.highConv.ats.l} p={nbaStats.highConv.ats.p} highlight />
                        <StatBox label="ML" w={nbaStats.highConv.ml.w} l={nbaStats.highConv.ml.l} highlight />
                        <StatBox label="O/U" w={nbaStats.highConv.ou.w} l={nbaStats.highConv.ou.l} p={nbaStats.highConv.ou.p} highlight />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* NHL */}
              {nhlStats && nhlStats.gamesWithOdds > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg font-bold text-gray-900">NHL</span>
                    <span className="text-xs text-gray-400">({nhlStats.gamesWithOdds} games)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-2">All Picks</div>
                      <div className="grid grid-cols-3 gap-2">
                        <StatBox label="Puck Line" w={nhlStats.all.ats.w} l={nhlStats.all.ats.l} p={nhlStats.all.ats.p} />
                        <StatBox label="ML" w={nhlStats.all.ml.w} l={nhlStats.all.ml.l} />
                        <StatBox label="O/U" w={nhlStats.all.ou.w} l={nhlStats.all.ou.l} p={nhlStats.all.ou.p} />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-green-600 uppercase mb-2">High Conviction</div>
                      <div className="grid grid-cols-3 gap-2">
                        <StatBox label="Puck Line" w={nhlStats.highConv.ats.w} l={nhlStats.highConv.ats.l} p={nhlStats.highConv.ats.p} highlight />
                        <StatBox label="ML" w={nhlStats.highConv.ml.w} l={nhlStats.highConv.ml.l} highlight />
                        <StatBox label="O/U" w={nhlStats.highConv.ou.w} l={nhlStats.highConv.ou.l} p={nhlStats.highConv.ou.p} highlight />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Core Model */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">The Prediction Model</h2>
          <div className="space-y-4 text-sm">
            <div className="flex gap-3">
              <span className="text-red-600 font-bold shrink-0">Step 1</span>
              <div>
                <strong>Elo Ratings</strong> - Each team has a power rating (starting at 1500) that updates
                after every game. Wins against strong teams boost your rating more; losses to weak teams
                hurt more. This captures &quot;who&apos;s actually good&quot; better than win-loss records.
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-red-600 font-bold shrink-0">Step 2</span>
              <div>
                <strong>Regression to Mean</strong> - Raw scoring stats are regressed 30% toward league average.
                This prevents overreacting to small samples - a team that scored big early probably won&apos;t
                maintain that pace all season.
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-red-600 font-bold shrink-0">Step 3</span>
              <div>
                <strong>Matchup Calculation</strong> - Each team&apos;s predicted score combines their
                offensive output and opponent&apos;s defensive performance. This creates matchup-specific
                predictions rather than generic power ratings.
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-red-600 font-bold shrink-0">Step 4</span>
              <div>
                <strong>Elo Adjustment</strong> - The Elo difference between teams adjusts the predicted scores,
                calibrated per sport (NFL: 100 Elo = 11 pts, NBA: 100 Elo = 4.25 pts, NHL: 100 Elo = 2 goals).
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-red-600 font-bold shrink-0">Step 5</span>
              <div>
                <strong>Home Advantage</strong> - Home teams get a calibrated bonus
                (NFL: 3.25 pts, NBA: 3.5 pts, NHL: 0.3 goals).
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-red-600 font-bold shrink-0">Step 6</span>
              <div>
                <strong>Spread Regression</strong> - Predicted spreads are shrunk 45% toward zero to reduce
                overconfidence. A raw 14-point spread becomes ~7.7 points.
              </div>
            </div>
          </div>
        </div>

        {/* Sport-Specific Models */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sport-Specific Models</h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="font-bold text-red-600 mb-2">NFL</div>
              <ul className="space-y-1 text-gray-600 text-xs">
                <li>• Weather impact on totals</li>
                <li>• QB injury adjustments (-3 pts)</li>
                <li>• Divisional game tracking</li>
                <li>• Late season detection</li>
                <li>• Elo mismatch analysis</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="font-bold text-orange-600 mb-2">NBA</div>
              <ul className="space-y-1 text-gray-600 text-xs">
                <li>• Rest day advantages</li>
                <li>• Back-to-back detection</li>
                <li>• Spread-adjusted ATS</li>
                <li>• Higher-scoring baseline (113 PPG)</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="font-bold text-blue-600 mb-2">NHL</div>
              <ul className="space-y-1 text-gray-600 text-xs">
                <li>• Lower-scoring model (3.0 GPG)</li>
                <li>• Puck line analysis</li>
                <li>• Elo gap filtering</li>
                <li>• Goal-based thresholds</li>
              </ul>
            </div>
          </div>
        </div>

        {/* High Conviction Explained */}
        <div className="bg-green-50 rounded-xl p-6 border border-green-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">High Conviction Picks</h2>
          <p className="text-sm mb-4">
            Not all picks are created equal. High conviction picks are filtered based on criteria that
            have historically produced the best results. These are the picks we&apos;re most confident in.
          </p>
          <div className="text-sm space-y-3">
            <div>
              <div className="font-semibold text-gray-900 mb-1">ATS / Spread / Puck Line</div>
              <ul className="text-xs text-gray-600 space-y-0.5">
                <li>• <strong>NFL:</strong> 60%+ situation present (divisional, late season, large spread, Elo mismatch) AND not medium spread (3.5-6.5)</li>
                <li>• <strong>NBA:</strong> Model agrees with Vegas on the favorite AND spread edge confirms direction</li>
                <li>• <strong>NHL:</strong> Spread edge ≥0.75 goals AND Elo gap ≥80 points</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-gray-900 mb-1">Moneyline</div>
              <p className="text-xs text-gray-600">15%+ win probability edge over implied 50/50 (all sports)</p>
            </div>
            <div>
              <div className="font-semibold text-gray-900 mb-1">Over/Under</div>
              <ul className="text-xs text-gray-600 space-y-0.5">
                <li>• <strong>NFL/NBA:</strong> 5+ point edge vs Vegas total</li>
                <li>• <strong>NHL:</strong> 1.5+ goal edge vs Vegas total</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Vegas Line Locking */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Vegas Lines & Fair Comparison</h2>
          <p className="text-sm">
            Vegas lines are locked 1 hour before game time. This ensures we&apos;re comparing our predictions
            against the lines that were actually available to bettors, not lines that moved after
            late-breaking news. Once locked, lines don&apos;t change even if Vegas adjusts theirs.
          </p>
        </div>

        {/* Data Sources */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Sources</h2>
          <ul className="text-sm space-y-2">
            <li><strong>Teams & Schedules:</strong> ESPN API (all sports)</li>
            <li><strong>Scores & Results:</strong> ESPN Scoreboard API (real-time updates)</li>
            <li><strong>Vegas Odds:</strong> ESPN Odds API (spreads, totals, moneylines - no API key needed)</li>
            <li><strong>Weather (NFL):</strong> OpenWeather API (game-time forecasts for outdoor stadiums)</li>
            <li><strong>Injuries (NFL):</strong> NFL.com injury reports (QB out = -3 pts)</li>
          </ul>
          <p className="text-xs text-gray-400 mt-3">
            Data syncs every 2 hours (NFL) or 30 minutes (NBA/NHL). Vegas lines lock 1 hour before game time.
          </p>
        </div>

        <p className="text-sm text-gray-400 text-center pt-4">
          Prediction Matrix is designed for analytical and entertainment purposes. Always gamble responsibly.
        </p>
      </div>
    </div>
  );
}
