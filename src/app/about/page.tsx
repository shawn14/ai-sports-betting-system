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
          Every prediction can be traced back to specific inputs and calculations - no black boxes.
        </p>

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
                <strong>Regression to Mean</strong> - Raw scoring stats are regressed toward league average.
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
                calibrated per sport to reflect actual point differentials.
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-red-600 font-bold shrink-0">Step 5</span>
              <div>
                <strong>Home Field/Ice Advantage</strong> - Home teams get a bonus calibrated from
                historical data for each sport.
              </div>
            </div>
          </div>
        </div>

        {/* High Conviction Explained */}
        <div className="bg-green-50 rounded-xl p-6 border border-green-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">High Conviction Picks</h2>
          <p className="text-sm mb-4">
            Not all picks are created equal. High conviction picks are filtered based on criteria that
            have historically produced the best results:
          </p>
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span><strong>ATS/Spread:</strong></span>
              <span className="text-gray-600">Model aligned with Vegas favorite + Elo confirmation</span>
            </div>
            <div className="flex justify-between">
              <span><strong>Moneyline:</strong></span>
              <span className="text-gray-600">15%+ win probability edge over implied odds</span>
            </div>
            <div className="flex justify-between">
              <span><strong>Over/Under:</strong></span>
              <span className="text-gray-600">5+ point edge (NFL/NBA) or 1.5+ goal edge (NHL)</span>
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
            <li><strong>Scores & Stats:</strong> ESPN API (real-time)</li>
            <li><strong>Vegas Odds:</strong> ESPN API (spreads & totals)</li>
            <li><strong>Weather (NFL):</strong> Open-Meteo API (game-time forecasts)</li>
            <li><strong>Injuries (NFL):</strong> NFL.com injury reports</li>
          </ul>
        </div>

        <p className="text-sm text-gray-400 text-center pt-4">
          Prediction Matrix is designed for analytical and entertainment purposes. Always gamble responsibly.
        </p>
      </div>
    </div>
  );
}
