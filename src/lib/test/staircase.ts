import type { StaircaseState } from "../types";

export interface StaircaseConfig {
  initialLevel: number; // Starting level in dB
  stepSizeDown: number; // dB step when decreasing (user heard it)
  stepSizeUp: number; // dB step when increasing (user didn't hear it)
  minLevel: number; // Minimum level (safety limit)
  maxLevel: number; // Maximum level (safety limit)
  maxReversals: number; // Stop after this many reversals
  maxAttempts: number; // Maximum total attempts per frequency
}

const DEFAULT_CONFIG: StaircaseConfig = {
  initialLevel: -20, // Start at moderate level (20 dB below reference)
  stepSizeDown: 6, // Decrease by 6 dB if heard
  stepSizeUp: 3, // Increase by 3 dB if not heard
  minLevel: -60, // Don't go quieter than 60 dB below reference
  maxLevel: 0, // Don't go louder than reference
  maxReversals: 4, // Stop after 4 reversals
  maxAttempts: 20, // Maximum 20 attempts per frequency
};

/**
 * Initialize a new staircase state
 */
export function createStaircase(config: Partial<StaircaseConfig> = {}): {
  state: StaircaseState;
  config: StaircaseConfig;
} {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  return {
    state: {
      currentLevel: fullConfig.initialLevel,
      stepSize: fullConfig.stepSizeDown,
      direction: "down",
      reversals: 0,
      attempts: 0,
      lastResponse: null,
      threshold: null,
    },
    config: fullConfig,
  };
}

/**
 * Process a response and update the staircase state
 * @returns Updated state and whether the test should continue
 */
export function processResponse(
  state: StaircaseState,
  config: StaircaseConfig,
  response: "heard" | "notHeard"
): {
  newState: StaircaseState;
  shouldContinue: boolean;
  threshold: number | null;
} {
  const newState = { ...state };
  newState.attempts += 1;
  newState.lastResponse = response;

  // Check if we've exceeded max attempts
  if (newState.attempts >= config.maxAttempts) {
    newState.threshold = newState.currentLevel;
    return {
      newState,
      shouldContinue: false,
      threshold: newState.threshold,
    };
  }

  // Detect reversal: direction changed
  const previousDirection = newState.direction;
  let reversalDetected = false;

  if (response === "heard") {
    // User heard it, decrease level (go quieter)
    newState.direction = "down";
    newState.currentLevel = Math.max(
      config.minLevel,
      newState.currentLevel - config.stepSizeDown
    );
    newState.stepSize = config.stepSizeDown;
  } else {
    // User didn't hear it, increase level (go louder)
    newState.direction = "up";
    newState.currentLevel = Math.min(
      config.maxLevel,
      newState.currentLevel + config.stepSizeUp
    );
    newState.stepSize = config.stepSizeUp;
  }

  // Check for reversal
  if (previousDirection !== newState.direction && state.lastResponse !== null) {
    reversalDetected = true;
    newState.reversals += 1;
  }

  // Stop if we've reached max reversals
  if (newState.reversals >= config.maxReversals) {
    // Threshold is the average of reversal points, but for simplicity,
    // we'll use the current level after sufficient reversals
    newState.threshold = newState.currentLevel;
    return {
      newState,
      shouldContinue: false,
      threshold: newState.threshold,
    };
  }

  return {
    newState,
    shouldContinue: true,
    threshold: null,
  };
}

/**
 * Get the current level for the next tone presentation
 */
export function getCurrentLevel(state: StaircaseState): number {
  return state.currentLevel;
}

