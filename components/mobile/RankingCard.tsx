'use client';

import { useState } from 'react';
import { ChevronDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface RankingCardProps {
  team: {
    team: string;
    conference: 'AFC' | 'NFC';
    division: string;
    record: string;
    tsr: number;
    netPoints: number;
    momentum: number;
    conferenceScore: number;
    homeAdvantage: number;
    offensive: number;
    defensive: number;
    rank: number;
    trend: 'up' | 'down' | 'same';
  };
}

function StatCell({ label, value, positive = true }: { label: string; value: string; positive?: boolean }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className={`text-sm font-semibold ${positive ? 'text-gray-900' : 'text-gray-700'}`}>
        {value}
      </div>
    </div>
  );
}

export default function RankingCard({ team }: RankingCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getTrendIcon = () => {
    if (team.trend === 'up') return <TrendingUp className="w-3 h-3 text-green-600" />;
    if (team.trend === 'down') return <TrendingDown className="w-3 h-3 text-red-600" />;
    return <Minus className="w-3 h-3 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (team.trend === 'up') return 'text-green-600';
    if (team.trend === 'down') return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-3">
      {/* Header - Always Visible */}
      <div className="flex items-center justify-between mb-3">
        {/* Rank & Team */}
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold text-gray-400">
            #{team.rank}
          </div>
          <div>
            <div className="font-semibold text-base text-gray-900">{team.team}</div>
            <div className="text-xs text-gray-500">
              {team.conference} {team.division} | {team.record}
            </div>
          </div>
        </div>

        {/* TSR Score & Trend */}
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            <div className="text-xs text-gray-500">TSR</div>
            {getTrendIcon()}
          </div>
          <div className={`text-xl font-bold ${getTrendColor()}`}>
            {team.tsr.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Key Stats - Grid (Always Visible) */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200">
        <StatCell
          label="Net Pts"
          value={team.netPoints >= 0 ? `+${team.netPoints.toFixed(1)}` : team.netPoints.toFixed(1)}
        />
        <StatCell
          label="Offense"
          value={team.offensive >= 0 ? `+${team.offensive.toFixed(1)}` : team.offensive.toFixed(1)}
        />
        <StatCell
          label="Defense"
          value={team.defensive >= 0 ? `+${team.defensive.toFixed(1)}` : team.defensive.toFixed(1)}
        />
      </div>

      {/* Expand Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full mt-3 pt-3 border-t border-gray-200 text-sm text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1 active:bg-gray-50 rounded px-2 py-2 min-h-[44px]"
      >
        {expanded ? 'Show Less' : 'Show More Stats'}
        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-3">
          <StatCell
            label="Momentum"
            value={team.momentum >= 0 ? `+${team.momentum.toFixed(1)}` : team.momentum.toFixed(1)}
          />
          <StatCell
            label="Home Adv"
            value={team.homeAdvantage >= 0 ? `+${team.homeAdvantage.toFixed(1)}` : team.homeAdvantage.toFixed(1)}
          />
          <StatCell
            label="Conference"
            value={team.conferenceScore >= 0 ? `+${team.conferenceScore.toFixed(1)}` : team.conferenceScore.toFixed(1)}
          />
          <StatCell
            label="Division"
            value={team.division}
            positive={false}
          />
        </div>
      )}
    </div>
  );
}
