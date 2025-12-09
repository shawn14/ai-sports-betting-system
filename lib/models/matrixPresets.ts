import { MatrixConfig } from './matrixPredictor';

/**
 * Matrix Prediction Presets
 *
 * These are pre-configured weight settings for different prediction philosophies.
 * Users can select a preset or customize their own weights.
 */

export const MATRIX_PRESETS: Record<string, MatrixConfig> = {
  /**
   * BALANCED - Equal weight to all factors
   * Good all-around preset for general use
   */
  balanced: {
    w_net: 5.0,
    w_momentum: 3.0,
    w_conf: 2.0,
    w_home: 2.5,
    w_off: 4.0,
    w_def: 4.0,
    w_recency_total: 0.3,
    total_boost: 0,
    volatility: 1.0,
    regression_factor: 0.85  // 15% dampening prevents extreme spreads
  },

  /**
   * OFFENSIVE - Emphasizes offensive performance
   * Best for high-scoring matchups and offensive-minded teams
   */
  offensive: {
    w_net: 4.0,
    w_momentum: 4.0,
    w_conf: 1.0,
    w_home: 2.0,
    w_off: 8.0,
    w_def: 2.0,
    w_recency_total: 0.5,
    total_boost: 2.0,
    volatility: 1.5,
    regression_factor: 0.85
  },

  /**
   * DEFENSIVE - Emphasizes defensive performance
   * Best for defensive battles and low-scoring games
   */
  defensive: {
    w_net: 6.0,
    w_momentum: 2.0,
    w_conf: 2.0,
    w_home: 3.0,
    w_off: 2.0,
    w_def: 8.0,
    w_recency_total: 0.3,
    total_boost: -2.0,
    volatility: 0.8,
    regression_factor: 0.85
  },

  /**
   * MOMENTUM - Heavy weight on recent performance
   * Best for riding hot/cold streaks
   */
  momentum: {
    w_net: 3.0,
    w_momentum: 8.0,
    w_conf: 1.0,
    w_home: 2.0,
    w_off: 4.0,
    w_def: 4.0,
    w_recency_total: 0.7,
    total_boost: 0,
    volatility: 1.2,
    regression_factor: 0.85
  },

  /**
   * HOME ADVANTAGE - Emphasizes home field advantage
   * Best for teams with strong home performance
   */
  homeAdvantage: {
    w_net: 4.0,
    w_momentum: 3.0,
    w_conf: 2.0,
    w_home: 5.0,
    w_off: 3.0,
    w_def: 3.0,
    w_recency_total: 0.3,
    total_boost: 0,
    volatility: 1.0,
    regression_factor: 0.85
  },

  /**
   * CONFERENCE STRENGTH - Emphasizes conference performance
   * Best for conference games and playoff implications
   */
  conferenceStrength: {
    w_net: 4.0,
    w_momentum: 2.0,
    w_conf: 6.0,
    w_home: 2.0,
    w_off: 4.0,
    w_def: 4.0,
    w_recency_total: 0.3,
    total_boost: 0,
    volatility: 1.0,
    regression_factor: 0.85
  }
};

/**
 * Default preset to use if none specified
 */
export const DEFAULT_PRESET = 'balanced';

/**
 * Get a preset by name, returns balanced if not found
 */
export function getPreset(presetName: string): MatrixConfig {
  return MATRIX_PRESETS[presetName] || MATRIX_PRESETS[DEFAULT_PRESET];
}

/**
 * Get list of all preset names
 */
export function getPresetNames(): string[] {
  return Object.keys(MATRIX_PRESETS);
}

/**
 * Validate that a config has all required fields and values are in valid ranges
 */
export function validateConfig(config: MatrixConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields exist
  const requiredFields: (keyof MatrixConfig)[] = [
    'w_net', 'w_momentum', 'w_conf', 'w_home',
    'w_off', 'w_def', 'w_recency_total', 'total_boost', 'volatility', 'regression_factor'
  ];

  for (const field of requiredFields) {
    if (config[field] === undefined || config[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate ranges
  if (config.w_net < 0 || config.w_net > 10) errors.push('w_net must be between 0 and 10');
  if (config.w_momentum < 0 || config.w_momentum > 10) errors.push('w_momentum must be between 0 and 10');
  if (config.w_conf < 0 || config.w_conf > 10) errors.push('w_conf must be between 0 and 10');
  if (config.w_home < 0 || config.w_home > 5) errors.push('w_home must be between 0 and 5');
  if (config.w_off < -10 || config.w_off > 10) errors.push('w_off must be between -10 and 10');
  if (config.w_def < -10 || config.w_def > 10) errors.push('w_def must be between -10 and 10');
  if (config.w_recency_total < 0 || config.w_recency_total > 1) errors.push('w_recency_total must be between 0 and 1');
  if (config.total_boost < -10 || config.total_boost > 10) errors.push('total_boost must be between -10 and 10');
  if (config.volatility < 0 || config.volatility > 2) errors.push('volatility must be between 0 and 2');
  if (config.regression_factor < 0 || config.regression_factor > 1) errors.push('regression_factor must be between 0 and 1');

  return {
    valid: errors.length === 0,
    errors
  };
}
