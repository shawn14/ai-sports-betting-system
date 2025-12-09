import { MatrixConfig } from './matrixPredictor';

/**
 * Model Registry Interface
 *
 * Tracks all prediction models used in the system for version control,
 * A/B testing, and performance tracking.
 */

export interface ModelPerformance {
  // Accuracy metrics
  ats_accuracy?: number;           // Against The Spread win rate (%)
  spread_mae?: number;              // Mean Absolute Error for spread predictions
  total_mae?: number;               // Mean Absolute Error for total predictions

  // Financial metrics
  roi_percent?: number;             // Return on Investment (%)
  roi_units?: number;               // Profit in units

  // Confidence calibration
  confidence_calibration?: number;  // How well confidence scores match actual accuracy

  // Sample size
  games_predicted?: number;         // Number of games used for metrics
  evaluation_period?: string;       // Time period (e.g., "2024-2025 season")
}

export interface ModelMetadata {
  modelId: string;                  // Unique identifier (e.g., "matrix-tsr-balanced")
  version: string;                  // Semantic version (e.g., "1.0.0")
  type: 'matrix' | 'ml' | 'hybrid'; // Model type
  preset?: string;                  // Preset name if using Matrix (e.g., "balanced")

  // Configuration
  config: MatrixConfig | Record<string, any>; // Model-specific config

  // Performance tracking
  performance: ModelPerformance;

  // Metadata
  description?: string;             // Human-readable description
  isActive: boolean;                // Whether this model is currently used
  createdAt: string;                // ISO timestamp
  updatedAt?: string;               // ISO timestamp

  // Training data info (if applicable)
  trainingData?: {
    datasetId?: string;
    games?: number;
    dateRange?: [string, string];
  };
}

export interface ModelRegistryDocument extends ModelMetadata {
  // Firestore document structure
}

/**
 * Generate a model ID from type and preset
 */
export function generateModelId(type: string, preset?: string): string {
  if (preset) {
    return `${type}-${preset}`;
  }
  return type;
}

/**
 * Parse a model ID to extract type and preset
 */
export function parseModelId(modelId: string): { type: string; preset?: string } {
  const parts = modelId.split('-');
  if (parts.length === 1) {
    return { type: parts[0] };
  }
  return {
    type: parts[0],
    preset: parts.slice(1).join('-')
  };
}

/**
 * Get the current active model ID for a given type
 */
export const ACTIVE_MODELS = {
  matrix: 'matrix-balanced',  // Default Matrix model
} as const;
