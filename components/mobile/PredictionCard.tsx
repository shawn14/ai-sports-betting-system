interface PredictionCardProps {
  prediction: {
    gameId: string;
    week: number;
    homeTeam: string;
    awayTeam: string;
    homeTeamLogo?: string;
    awayTeamLogo?: string;
    predictedHomeScore: number;
    predictedAwayScore: number;
    predictedSpread: number;
    predictedTotal: number;
    predictedWinner: string;
    confidence: number;
    gameTime: Date;
    status: string;
    actualHomeScore?: number;
    actualAwayScore?: number;
    actualWinner?: string;
    vegasSpread?: number;
    vegasTotal?: number;
  };
}

export default function PredictionCard({ prediction }: PredictionCardProps) {
  const formatGameTime = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const isComplete = prediction.status === 'completed' &&
    prediction.actualHomeScore !== undefined &&
    prediction.actualAwayScore !== undefined;

  // Calculate results if game is complete
  const actualTotal = isComplete ? (prediction.actualHomeScore! + prediction.actualAwayScore!) : 0;
  const actualSpread = isComplete ? (prediction.actualHomeScore! - prediction.actualAwayScore!) : 0;

  const moneylineWin = isComplete && prediction.actualWinner === prediction.predictedWinner;

  // ATS: Beat or tie Vegas
  let spreadWin = false;
  if (isComplete && prediction.vegasSpread !== null && prediction.vegasSpread !== undefined) {
    const vegasError = Math.abs(prediction.vegasSpread - actualSpread);
    const ourError = Math.abs(prediction.predictedSpread - actualSpread);
    spreadWin = ourError <= vegasError;
  }

  // O/U: Predict correct side of line
  let totalWin = false;
  if (isComplete && prediction.vegasTotal !== null && prediction.vegasTotal !== undefined) {
    const predictedOver = prediction.predictedTotal > prediction.vegasTotal;
    const actualOver = actualTotal > prediction.vegasTotal;
    totalWin = predictedOver === actualOver;
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-3">
      {/* Header: Game Time & Status */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-gray-600">
          {formatGameTime(prediction.gameTime)}
        </span>
        <span className={`text-xs font-semibold uppercase px-2 py-1 rounded ${
          isComplete ? 'bg-gray-100 text-gray-700' : 'bg-blue-50 text-blue-700'
        }`}>
          {isComplete ? 'Final' : prediction.status}
        </span>
      </div>

      {/* Teams & Scores - Primary Info */}
      <div className="space-y-2 mb-3">
        {/* Away Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {prediction.awayTeamLogo && (
              <img src={prediction.awayTeamLogo} alt={prediction.awayTeam} className="w-8 h-8" />
            )}
            <span className="font-semibold text-base">{prediction.awayTeam}</span>
          </div>
          <div className="flex items-center gap-2">
            {isComplete && (
              <span className="text-xl font-bold text-gray-900">{prediction.actualAwayScore}</span>
            )}
            <span className="text-sm text-gray-500">
              ({prediction.predictedAwayScore.toFixed(0)})
            </span>
          </div>
        </div>

        {/* Home Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {prediction.homeTeamLogo && (
              <img src={prediction.homeTeamLogo} alt={prediction.homeTeam} className="w-8 h-8" />
            )}
            <span className="font-semibold text-base">{prediction.homeTeam}</span>
          </div>
          <div className="flex items-center gap-2">
            {isComplete && (
              <span className="text-xl font-bold text-gray-900">{prediction.actualHomeScore}</span>
            )}
            <span className="text-sm text-gray-500">
              ({prediction.predictedHomeScore.toFixed(0)})
            </span>
          </div>
        </div>
      </div>

      {/* Prediction Details - Grid */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
        {/* Confidence */}
        <div>
          <div className="text-xs text-gray-500 mb-1">Confidence</div>
          <div className="text-sm font-semibold text-blue-600">
            {prediction.confidence}%
          </div>
        </div>

        {/* Predicted Winner */}
        <div>
          <div className="text-xs text-gray-500 mb-1">Predicted Winner</div>
          <div className="text-sm font-semibold text-gray-900">
            {prediction.predictedWinner}
          </div>
          {isComplete && (
            <div className={`text-xs font-bold mt-0.5 ${moneylineWin ? 'text-green-600' : 'text-red-600'}`}>
              {moneylineWin ? '✓ WIN' : '✗ LOSS'}
            </div>
          )}
        </div>

        {/* Spread */}
        <div>
          <div className="text-xs text-gray-500 mb-1">Predicted Spread</div>
          <div className="text-sm font-semibold text-gray-900">
            {prediction.homeTeam.split(' ').pop()} {prediction.predictedSpread > 0 ? '+' : ''}{prediction.predictedSpread.toFixed(1)}
          </div>
          {isComplete && (
            <>
              <div className="text-xs text-gray-500">
                Actual: {actualSpread > 0 ? '+' : ''}{actualSpread.toFixed(1)}
              </div>
              <div className={`text-xs font-bold mt-0.5 ${spreadWin ? 'text-green-600' : 'text-red-600'}`}>
                {spreadWin ? '✓ WIN' : '✗ LOSS'}
              </div>
            </>
          )}
        </div>

        {/* Vegas Spread */}
        <div>
          <div className="text-xs text-gray-500 mb-1">Vegas Spread</div>
          {prediction.vegasSpread !== undefined && prediction.vegasSpread !== null ? (
            <div className="text-sm font-semibold text-purple-600">
              {prediction.homeTeam.split(' ').pop()} {prediction.vegasSpread > 0 ? '+' : ''}{prediction.vegasSpread.toFixed(1)}
            </div>
          ) : (
            <div className="text-sm text-gray-400">—</div>
          )}
        </div>

        {/* Total */}
        <div>
          <div className="text-xs text-gray-500 mb-1">Total</div>
          {prediction.vegasTotal !== undefined && prediction.vegasTotal !== null ? (
            <>
              <div className="text-sm font-semibold text-gray-900">
                {prediction.predictedTotal > prediction.vegasTotal ? 'OVER' : 'UNDER'} {prediction.predictedTotal.toFixed(1)}
              </div>
              <div className="text-xs text-gray-500">
                Line: {prediction.vegasTotal.toFixed(1)}
              </div>
            </>
          ) : (
            <div className="text-sm font-semibold text-gray-900">{prediction.predictedTotal.toFixed(1)}</div>
          )}
          {isComplete && (
            <>
              <div className="text-xs text-gray-500">
                Actual: {actualTotal.toFixed(1)}
              </div>
              <div className={`text-xs font-bold mt-0.5 ${totalWin ? 'text-green-600' : 'text-red-600'}`}>
                {totalWin ? '✓ WIN' : '✗ LOSS'}
              </div>
            </>
          )}
        </div>

        {/* Results Summary (completed games only) */}
        {isComplete && (
          <div>
            <div className="text-xs text-gray-500 mb-1">Results</div>
            <div className="flex gap-2">
              <span className={`text-sm font-bold ${moneylineWin ? 'text-green-600' : 'text-red-600'}`}>
                ML: {moneylineWin ? '✓' : '✗'}
              </span>
              <span className={`text-sm font-bold ${spreadWin ? 'text-green-600' : 'text-red-600'}`}>
                ATS: {spreadWin ? '✓' : '✗'}
              </span>
              <span className={`text-sm font-bold ${totalWin ? 'text-green-600' : 'text-red-600'}`}>
                O/U: {totalWin ? '✓' : '✗'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
