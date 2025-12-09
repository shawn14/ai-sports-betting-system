'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HistoricalDataCollector } from '@/lib/training/dataCollector';
import { TrainingDataset, DataCollectionProgress } from '@/types';
import { Database, Download, Play, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react';

export default function TrainingPage() {
  const [collector] = useState(() => new HistoricalDataCollector());
  const [progress, setProgress] = useState<DataCollectionProgress>({
    totalGames: 0,
    gamesCollected: 0,
    currentSeason: 0,
    currentWeek: 0,
    status: 'idle'
  });
  const [dataset, setDataset] = useState<TrainingDataset | null>(null);
  const [selectedSeasons, setSelectedSeasons] = useState<number[]>([2022, 2023, 2024]);
  const [startWeek, setStartWeek] = useState(1);
  const [endWeek, setEndWeek] = useState(14);

  const startDataCollection = async () => {
    try {
      console.log('Starting data collection...');

      // Set up progress monitoring
      const progressInterval = setInterval(() => {
        const currentProgress = collector.getProgress();
        setProgress(currentProgress);

        if (currentProgress.status === 'completed' || currentProgress.status === 'error') {
          clearInterval(progressInterval);
        }
      }, 500);

      // Start collection
      const collectedDataset = await collector.collectSeasons(
        selectedSeasons,
        startWeek,
        endWeek
      );

      setDataset(collectedDataset);
      console.log('Data collection complete!', collectedDataset);

    } catch (error) {
      console.error('Error during data collection:', error);
      setProgress(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  const exportToJSON = async () => {
    if (!dataset) return;
    await collector.exportToJSON(dataset);
  };

  const saveToFirebase = async () => {
    if (!dataset) return;
    try {
      console.log('Saving to Firebase...');
      await collector.saveToFirebase(dataset);
      alert('Dataset saved to Firebase successfully!');
    } catch (error) {
      console.error('Error saving to Firebase:', error);
      alert('Failed to save to Firebase');
    }
  };

  const getProgressPercentage = () => {
    if (progress.totalGames === 0) return 0;
    return Math.round((progress.gamesCollected / progress.totalGames) * 100);
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'idle':
        return <Database className="w-6 h-6 text-slate-400" />;
      case 'collecting':
        return <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>;
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-400" />;
    }
  };

  const getStatusText = () => {
    switch (progress.status) {
      case 'idle':
        return 'Ready to collect data';
      case 'collecting':
        return `Collecting Season ${progress.currentSeason}, Week ${progress.currentWeek}...`;
      case 'completed':
        return 'Data collection completed!';
      case 'error':
        return `Error: ${progress.error}`;
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-4xl font-bold text-white flex items-center">
            <BarChart3 className="w-10 h-10 mr-3" />
            ML Training System
          </h1>
          <p className="text-slate-400 mt-2">
            Collect historical data and train machine learning models to optimize predictions
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 py-4">
            <Link href="/games" className="text-slate-400 hover:text-white transition pb-1">
              Games
            </Link>
            <Link href="/predictions" className="text-slate-400 hover:text-white transition pb-1">
              Predictions
            </Link>
            <Link href="/rankings" className="text-slate-400 hover:text-white transition pb-1">
              Rankings
            </Link>
            <Link href="/analytics" className="text-slate-400 hover:text-white transition pb-1">
              Analytics
            </Link>
            <Link href="/dashboard" className="text-slate-400 hover:text-white transition pb-1">
              Dashboard
            </Link>
            <Link href="/backtest" className="text-slate-400 hover:text-white transition pb-1">
              Backtest
            </Link>
            <Link href="/database" className="text-slate-400 hover:text-white transition pb-1">
              Database
            </Link>
            <Link href="/training" className="text-white font-semibold border-b-2 border-blue-500 pb-1">
              Training
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Data Collection Configuration */}
        <div className="bg-slate-800 rounded-lg p-6 mb-8">
          <h2 className="text-white font-semibold mb-4 flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Historical Data Collection
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Season Selection */}
            <div>
              <label className="text-slate-400 text-sm block mb-2">Seasons to Collect</label>
              <div className="space-y-2">
                {[2024, 2023, 2022, 2021].map(year => (
                  <label key={year} className="flex items-center text-white">
                    <input
                      type="checkbox"
                      checked={selectedSeasons.includes(year)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSeasons([...selectedSeasons, year].sort().reverse());
                        } else {
                          setSelectedSeasons(selectedSeasons.filter(s => s !== year));
                        }
                      }}
                      className="mr-2"
                      disabled={progress.status === 'collecting'}
                    />
                    {year} Season
                  </label>
                ))}
              </div>
            </div>

            {/* Week Range */}
            <div>
              <label className="text-slate-400 text-sm block mb-2">Week Range</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max="18"
                  value={startWeek}
                  onChange={(e) => setStartWeek(parseInt(e.target.value))}
                  className="w-20 bg-slate-900 text-white rounded px-3 py-2 border border-slate-700"
                  disabled={progress.status === 'collecting'}
                />
                <span className="text-slate-400">to</span>
                <input
                  type="number"
                  min="1"
                  max="18"
                  value={endWeek}
                  onChange={(e) => setEndWeek(parseInt(e.target.value))}
                  className="w-20 bg-slate-900 text-white rounded px-3 py-2 border border-slate-700"
                  disabled={progress.status === 'collecting'}
                />
              </div>
              <p className="text-slate-500 text-xs mt-2">
                Estimated: {selectedSeasons.length * (endWeek - startWeek + 1) * 16} games
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-end">
              <button
                onClick={startDataCollection}
                disabled={progress.status === 'collecting' || selectedSeasons.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition flex items-center justify-center"
              >
                <Play className="w-4 h-4 mr-2" />
                {progress.status === 'collecting' ? 'Collecting...' : 'Start Collection'}
              </button>
            </div>
          </div>

          <p className="text-slate-500 text-sm">
            This will fetch all completed games from the selected seasons and prepare training data with team stats, weather, and outcomes.
          </p>
        </div>

        {/* Progress Display */}
        {progress.status !== 'idle' && (
          <div className="bg-slate-800 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold flex items-center">
                {getStatusIcon()}
                <span className="ml-2">{getStatusText()}</span>
              </h2>
              <span className="text-white font-bold text-2xl">
                {getProgressPercentage()}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-900 rounded-full h-4 mb-4">
              <div
                className={`h-4 rounded-full transition-all duration-500 ${
                  progress.status === 'completed' ? 'bg-green-500' :
                  progress.status === 'error' ? 'bg-red-500' :
                  'bg-blue-500'
                }`}
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-slate-400 text-sm">Games Collected</div>
                <div className="text-white font-bold text-xl">{progress.gamesCollected}</div>
              </div>
              <div>
                <div className="text-slate-400 text-sm">Total Games</div>
                <div className="text-white font-bold text-xl">{progress.totalGames}</div>
              </div>
              <div>
                <div className="text-slate-400 text-sm">Current Season</div>
                <div className="text-white font-bold text-xl">{progress.currentSeason || '-'}</div>
              </div>
              <div>
                <div className="text-slate-400 text-sm">Current Week</div>
                <div className="text-white font-bold text-xl">{progress.currentWeek || '-'}</div>
              </div>
            </div>

            {progress.status === 'error' && (
              <div className="mt-4 bg-red-900/20 border border-red-700 rounded p-4 text-red-400">
                <strong>Error:</strong> {progress.error}
              </div>
            )}
          </div>
        )}

        {/* Dataset Summary */}
        {dataset && (
          <div className="bg-slate-800 rounded-lg p-6 mb-8">
            <h2 className="text-white font-semibold mb-4">Dataset Summary</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-slate-900 rounded-lg p-4">
                <div className="text-slate-400 text-sm mb-1">Total Games</div>
                <div className="text-white font-bold text-2xl">{dataset.metadata.totalGames}</div>
              </div>
              <div className="bg-slate-900 rounded-lg p-4">
                <div className="text-slate-400 text-sm mb-1">Seasons</div>
                <div className="text-white font-bold text-2xl">{dataset.metadata.seasons.join(', ')}</div>
              </div>
              <div className="bg-slate-900 rounded-lg p-4">
                <div className="text-slate-400 text-sm mb-1">Features</div>
                <div className="text-white font-bold text-2xl">{dataset.metadata.features.length}</div>
              </div>
              <div className="bg-slate-900 rounded-lg p-4">
                <div className="text-slate-400 text-sm mb-1">Version</div>
                <div className="text-white font-bold text-2xl">{dataset.metadata.version}</div>
              </div>
            </div>

            {/* Sample Data Preview */}
            <div className="mb-6">
              <h3 className="text-white font-medium mb-3">Sample Data (First 5 Games)</h3>
              <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-700">
                      <th className="text-left py-2">Game</th>
                      <th className="text-left py-2">Score</th>
                      <th className="text-left py-2">Home PPG</th>
                      <th className="text-left py-2">Away PPG</th>
                      <th className="text-left py-2">Spread</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataset.data.slice(0, 5).map((game, idx) => (
                      <tr key={idx} className="text-white border-b border-slate-800">
                        <td className="py-2">
                          {game.awayTeam.name} @ {game.homeTeam.name}
                        </td>
                        <td className="py-2">
                          {game.outcome.awayScore} - {game.outcome.homeScore}
                        </td>
                        <td className="py-2">{game.homeTeam.ppg.toFixed(1)}</td>
                        <td className="py-2">{game.awayTeam.ppg.toFixed(1)}</td>
                        <td className="py-2">{game.outcome.actualSpread > 0 ? '+' : ''}{game.outcome.actualSpread}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Export Actions */}
            <div className="flex space-x-4">
              <button
                onClick={exportToJSON}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export to JSON
              </button>
              <button
                onClick={saveToFirebase}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition flex items-center"
              >
                <Database className="w-4 h-4 mr-2" />
                Save to Firebase
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        {progress.status === 'idle' && !dataset && (
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-6">
            <h3 className="text-blue-400 font-semibold mb-3">How to Use the Training System</h3>
            <ol className="text-slate-300 space-y-2 text-sm list-decimal list-inside">
              <li>Select which seasons you want to collect (2022-2024 recommended for 800+ games)</li>
              <li>Choose the week range (weeks 1-14 have most stable data)</li>
              <li>Click &quot;Start Collection&quot; to fetch all historical games with team stats</li>
              <li>Wait for data collection to complete (may take several minutes due to API rate limits)</li>
              <li>Review the dataset summary and sample data</li>
              <li>Export to JSON for Python training scripts or save to Firebase for later use</li>
            </ol>
            <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded">
              <p className="text-yellow-400 text-sm">
                <strong>Note:</strong> Collecting data from multiple seasons may take 10-20 minutes due to
                API rate limits. The system will automatically handle retries and delays.
              </p>
            </div>
          </div>
        )}

        {/* Next Steps */}
        {dataset && (
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-6">
            <h3 className="text-green-400 font-semibold mb-3">Next Steps</h3>
            <div className="text-slate-300 space-y-2 text-sm">
              <p>✅ <strong>Data Collection Complete!</strong> You now have {dataset.metadata.totalGames} games ready for training.</p>
              <p><strong>To train the ML model:</strong></p>
              <ol className="list-decimal list-inside ml-4 space-y-1">
                <li>Export the dataset to JSON</li>
                <li>Use Python with XGBoost or scikit-learn to train models</li>
                <li>Optimize for ATS (Against The Spread) accuracy and ROI</li>
                <li>Export trained models to ONNX format</li>
                <li>Integrate back into this system for predictions</li>
              </ol>
              <p className="pt-2">
                <Link href="/backtest" className="text-blue-400 hover:text-blue-300 underline">
                  Run a backtest
                </Link> to see how the current model performs on this data.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
