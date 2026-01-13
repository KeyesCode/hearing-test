export type Ear = "left" | "right" | "both";

export type Frequency = 250 | 500 | 1000 | 2000 | 4000 | 8000;

export interface TestResult {
  id: string;
  createdAt: string;
  deviceInfo: string;
  baselineVolumeInstructionAcknowledged: boolean;
  thresholds: {
    left: Record<Frequency, number | null>;
    right: Record<Frequency, number | null>;
  };
}

export interface StoredResults {
  version: string;
  lastResult: TestResult | null;
  history: TestResult[];
}

export interface StaircaseState {
  currentLevel: number;
  stepSize: number;
  direction: "down" | "up";
  reversals: number;
  attempts: number;
  lastResponse: "heard" | "notHeard" | null;
  threshold: number | null;
}

export interface PlayToneOptions {
  frequency: number;
  ear: Ear;
  level: number; // Relative level in dB (0 = reference, negative = quieter)
  durationMs?: number;
}

