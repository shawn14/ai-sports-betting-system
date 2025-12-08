'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MatrixConfig } from '@/lib/models/matrixPredictor';
import { MATRIX_PRESETS, getPresetNames, validateConfig } from '@/lib/models/matrixPresets';
import { Settings, Save, RotateCcw, CheckCircle, AlertCircle, Home } from 'lucide-react';

export default function MatrixConfigPage() {
  const [config, setConfig] = useState<MatrixConfig>(MATRIX_PRESETS.balanced);
  const [selectedPreset, setSelectedPreset] = useState('balanced');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Load saved config from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('matrix_config');
    if (saved) {
      try {
        const savedConfig = JSON.parse(saved);
        setConfig(savedConfig);
        setSelectedPreset('custom');
      } catch (error) {
        console.error('Failed to load saved config:', error);
      }
    }
  }, []);

  const handlePresetChange = (presetName: string) => {
    if (presetName === 'custom') return;

    setConfig(MATRIX_PRESETS[presetName]);
    setSelectedPreset(presetName);
    setSaveMessage(null);
    setValidationErrors([]);
  };

  const handleConfigChange = (key: keyof MatrixConfig, value: number) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    setSelectedPreset('custom');
    setSaveMessage(null);

    // Validate
    const validation = validateConfig(newConfig);
    setValidationErrors(validation.errors);
  };

  const handleSave = () => {
    const validation = validateConfig(config);

    if (!validation.valid) {
      setValidationErrors(validation.errors);
      setSaveMessage('Configuration has errors. Please fix them before saving.');
      return;
    }

    localStorage.setItem('matrix_config', JSON.stringify(config));
    localStorage.setItem('matrix_preset', selectedPreset);
    setSaveMessage('Configuration saved successfully!');
    setValidationErrors([]);

    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleReset = () => {
    setConfig(MATRIX_PRESETS.balanced);
    setSelectedPreset('balanced');
    localStorage.removeItem('matrix_config');
    localStorage.removeItem('matrix_preset');
    setSaveMessage('Reset to balanced preset');
    setValidationErrors([]);

    setTimeout(() => setSaveMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="bg-slate-900/50 border-b border-slate-700 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="h-8 w-8 text-blue-400" />
              <div>
                <h1 className="text-3xl font-bold text-white">Matrix Configuration</h1>
                <p className="text-slate-400 text-sm">Customize prediction weights and parameters</p>
              </div>
            </div>
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              <Home className="h-4 w-4" />
              Home
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Save Message */}
        {saveMessage && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            validationErrors.length > 0
              ? 'bg-red-900/50 border border-red-700'
              : 'bg-green-900/50 border border-green-700'
          }`}>
            {validationErrors.length > 0 ? (
              <AlertCircle className="h-5 w-5 text-red-400" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-400" />
            )}
            <span className={validationErrors.length > 0 ? 'text-red-200' : 'text-green-200'}>
              {saveMessage}
            </span>
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
            <h3 className="text-red-300 font-semibold mb-2">Configuration Errors:</h3>
            <ul className="list-disc list-inside text-red-200 text-sm space-y-1">
              {validationErrors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Preset Selection */}
        <div className="mb-8 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Preset Selection</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {getPresetNames().map((presetName) => (
              <button
                key={presetName}
                onClick={() => handlePresetChange(presetName)}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  selectedPreset === presetName
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {presetName.charAt(0).toUpperCase() + presetName.slice(1).replace(/([A-Z])/g, ' $1')}
              </button>
            ))}
            {selectedPreset === 'custom' && (
              <div className="px-4 py-3 rounded-lg font-medium bg-purple-600 text-white">
                Custom
              </div>
            )}
          </div>
        </div>

        {/* Configuration Sliders */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-6">Weight Configuration</h2>

          <div className="space-y-6">
            {/* TSR Components */}
            <div>
              <h3 className="text-lg font-medium text-blue-300 mb-4">TSR Components (0-10)</h3>
              <div className="space-y-4">
                <WeightSlider
                  label="Net Point Performance"
                  description="Weight for net points per game differential"
                  value={config.w_net}
                  min={0}
                  max={10}
                  step={0.5}
                  onChange={(v) => handleConfigChange('w_net', v)}
                />
                <WeightSlider
                  label="Momentum"
                  description="Weight for recent form (Last 5 vs season)"
                  value={config.w_momentum}
                  min={0}
                  max={10}
                  step={0.5}
                  onChange={(v) => handleConfigChange('w_momentum', v)}
                />
                <WeightSlider
                  label="Conference Strength"
                  description="Weight for conference record performance"
                  value={config.w_conf}
                  min={0}
                  max={10}
                  step={0.5}
                  onChange={(v) => handleConfigChange('w_conf', v)}
                />
                <WeightSlider
                  label="Home Field Advantage"
                  description="Weight for home vs road performance (0-5)"
                  value={config.w_home}
                  min={0}
                  max={5}
                  step={0.5}
                  onChange={(v) => handleConfigChange('w_home', v)}
                />
              </div>
            </div>

            {/* Offensive/Defensive */}
            <div>
              <h3 className="text-lg font-medium text-green-300 mb-4">Offensive & Defensive Weights (-10 to +10)</h3>
              <div className="space-y-4">
                <WeightSlider
                  label="Offensive Strength"
                  description="Weight for points scored per game"
                  value={config.w_off}
                  min={-10}
                  max={10}
                  step={0.5}
                  onChange={(v) => handleConfigChange('w_off', v)}
                />
                <WeightSlider
                  label="Defensive Strength"
                  description="Weight for points allowed per game (inverted)"
                  value={config.w_def}
                  min={-10}
                  max={10}
                  step={0.5}
                  onChange={(v) => handleConfigChange('w_def', v)}
                />
              </div>
            </div>

            {/* Total Calculation */}
            <div>
              <h3 className="text-lg font-medium text-yellow-300 mb-4">Total Score Calculation</h3>
              <div className="space-y-4">
                <WeightSlider
                  label="Recency Weight"
                  description="Blend between recent and season scoring (0-1)"
                  value={config.w_recency_total}
                  min={0}
                  max={1}
                  step={0.1}
                  onChange={(v) => handleConfigChange('w_recency_total', v)}
                />
                <WeightSlider
                  label="Total Boost/Penalty"
                  description="Manual adjustment to predicted total (-10 to +10)"
                  value={config.total_boost}
                  min={-10}
                  max={10}
                  step={0.5}
                  onChange={(v) => handleConfigChange('total_boost', v)}
                />
                <WeightSlider
                  label="Score Volatility"
                  description="Multiplier for score variance (0-2)"
                  value={config.volatility}
                  min={0}
                  max={2}
                  step={0.1}
                  onChange={(v) => handleConfigChange('volatility', v)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-lg"
          >
            <Save className="h-5 w-5" />
            Save Configuration
          </button>
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            <RotateCcw className="h-5 w-5" />
            Reset to Balanced
          </button>
        </div>

        {/* Info Panel */}
        <div className="mt-8 bg-blue-900/30 border border-blue-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-300 mb-3">How It Works</h3>
          <div className="text-slate-300 space-y-2 text-sm">
            <p>• <strong>TSR (Team Strength Rating):</strong> The core algorithm combines 6 weighted components to rate each team's strength</p>
            <p>• <strong>Predicted Spread:</strong> Home TSR - Away TSR gives the predicted point margin</p>
            <p>• <strong>Predicted Total:</strong> Cross-blends offensive and defensive stats with recency weighting</p>
            <p>• <strong>Edge Detection:</strong> Compares ML predictions to Vegas lines to find betting value</p>
            <p>• Saved configurations persist across sessions and apply to all predictions</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface WeightSliderProps {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function WeightSlider({ label, description, value, min, max, step, onChange }: WeightSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div>
          <label className="text-white font-medium">{label}</label>
          <p className="text-slate-400 text-xs">{description}</p>
        </div>
        <span className="text-blue-400 font-mono font-semibold text-lg min-w-[60px] text-right">
          {value.toFixed(1)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      <div className="flex justify-between text-xs text-slate-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
