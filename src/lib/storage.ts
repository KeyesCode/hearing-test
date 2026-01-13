import type { TestResult, StoredResults } from "./types";

const STORAGE_KEY = "hearing-check-results";
const STORAGE_VERSION = "1.0.0";

/**
 * Save a test result to localStorage
 */
export function saveTestResult(result: TestResult): void {
  if (typeof window === "undefined") return;

  try {
    const stored = loadStoredResults();
    stored.lastResult = result;
    stored.history.unshift(result);
    // Keep only last 10 results
    if (stored.history.length > 10) {
      stored.history = stored.history.slice(0, 10);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (error) {
    console.error("Failed to save test result:", error);
  }
}

/**
 * Load stored results from localStorage
 */
export function loadStoredResults(): StoredResults {
  if (typeof window === "undefined") {
    return {
      version: STORAGE_VERSION,
      lastResult: null,
      history: [],
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {
        version: STORAGE_VERSION,
        lastResult: null,
        history: [],
      };
    }

    const parsed = JSON.parse(stored) as StoredResults;
    // Validate and migrate if needed
    if (parsed.version !== STORAGE_VERSION) {
      // Future: add migration logic here
      return {
        version: STORAGE_VERSION,
        lastResult: null,
        history: [],
      };
    }

    return parsed;
  } catch (error) {
    console.error("Failed to load stored results:", error);
    return {
      version: STORAGE_VERSION,
      lastResult: null,
      history: [],
    };
  }
}

/**
 * Get the last test result
 */
export function getLastResult(): TestResult | null {
  const stored = loadStoredResults();
  return stored.lastResult;
}

/**
 * Clear all stored results
 */
export function clearStoredResults(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear stored results:", error);
  }
}

