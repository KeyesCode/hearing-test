"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { audioEngine } from "@/lib/audio/audioEngine";
import {
  createStaircase,
  processResponse,
  getCurrentLevel,
} from "@/lib/test/staircase";
import type { Frequency, Ear, TestResult } from "@/lib/types";
import { saveTestResult } from "@/lib/storage";
import AudiogramChart from "./AudiogramChart";

const FREQUENCIES: Frequency[] = [250, 500, 1000, 2000, 4000, 8000];

type Step =
  | "headphone-check"
  | "quiet-room"
  | "test-left"
  | "test-right"
  | "results";

interface TestState {
  headphoneCheckLeft: boolean;
  headphoneCheckRight: boolean;
  quietRoomConfirmed: boolean;
  leftThresholds: Record<Frequency, number | null>;
  rightThresholds: Record<Frequency, number | null>;
  currentEar: "left" | "right" | null;
  currentFrequencyIndex: number;
  staircaseState: ReturnType<typeof createStaircase> | null;
  testComplete: boolean;
}

export default function TestWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("headphone-check");
  const [testState, setTestState] = useState<TestState>({
    headphoneCheckLeft: false,
    headphoneCheckRight: false,
    quietRoomConfirmed: false,
    leftThresholds: {
      250: null,
      500: null,
      1000: null,
      2000: null,
      4000: null,
      8000: null,
    },
    rightThresholds: {
      250: null,
      500: null,
      1000: null,
      2000: null,
      4000: null,
      8000: null,
    },
    currentEar: null,
    currentFrequencyIndex: 0,
    staircaseState: null,
    testComplete: false,
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [canRepeat, setCanRepeat] = useState(true);
  const [emergencyStop, setEmergencyStop] = useState(false);

  // Initialize audio on mount
  useEffect(() => {
    audioEngine.initialize().catch(console.error);
    return () => {
      audioEngine.stopAll();
    };
  }, []);

  // Initialize staircase when starting a frequency test
  useEffect(() => {
    if (
      (step === "test-left" || step === "test-right") &&
      testState.staircaseState === null &&
      !testState.testComplete
    ) {
      const staircase = createStaircase();
      setTestState((prev) => ({
        ...prev,
        staircaseState: staircase,
      }));
    }
  }, [step, testState.staircaseState, testState.testComplete]);

  const playTone = useCallback(
    async (frequency: Frequency, ear: Ear, level: number) => {
      if (emergencyStop) return;
      setIsPlaying(true);
      setCanRepeat(false);
      try {
        await audioEngine.playTone({
          frequency,
          ear,
          level,
          durationMs: 1000,
        });
      } catch (error) {
        console.error("Error playing tone:", error);
      } finally {
        setIsPlaying(false);
        // Cooldown before allowing repeat
        setTimeout(() => setCanRepeat(true), 500);
      }
    },
    [emergencyStop]
  );

  const handleHeadphoneCheck = async (ear: "left" | "right") => {
    if (isPlaying) return;
    await playTone(1000, ear, -20);
  };

  const [headphoneCheckFailed, setHeadphoneCheckFailed] = useState(false);

  const handleHeadphoneResponse = (ear: "left" | "right", correct: boolean) => {
    if (ear === "left") {
      if (correct) {
        setTestState((prev) => ({
          ...prev,
          headphoneCheckLeft: true,
        }));
        setHeadphoneCheckFailed(false);
        // Move to right check
        setTimeout(() => {
          handleHeadphoneCheck("right");
        }, 500);
      } else {
        setHeadphoneCheckFailed(true);
      }
    } else {
      if (correct) {
        setTestState((prev) => ({
          ...prev,
          headphoneCheckRight: true,
        }));
        setHeadphoneCheckFailed(false);
        // Move to next step
        setTimeout(() => setStep("quiet-room"), 1000);
      } else {
        setHeadphoneCheckFailed(true);
      }
    }
  };

  const handleQuietRoomConfirm = () => {
    setTestState((prev) => ({
      ...prev,
      quietRoomConfirmed: true,
    }));
    setStep("test-left");
  };

  const handleTestResponse = async (response: "heard" | "notHeard") => {
    if (!testState.staircaseState) return;

    const { state, config } = testState.staircaseState;
    const result = processResponse(state, config, response);

    if (!result.shouldContinue && result.threshold !== null) {
      // Frequency complete
      const currentFreq = FREQUENCIES[testState.currentFrequencyIndex];
      const isLeft = step === "test-left";

      setTestState((prev) => {
        const newThresholds = isLeft
          ? { ...prev.leftThresholds }
          : { ...prev.rightThresholds };
        newThresholds[currentFreq] = result.threshold;

        const nextIndex = prev.currentFrequencyIndex + 1;

        if (nextIndex >= FREQUENCIES.length) {
          // Ear complete
          if (isLeft) {
            return {
              ...prev,
              leftThresholds: newThresholds,
              currentFrequencyIndex: 0,
              staircaseState: null,
            };
          } else {
            // Both ears complete
            return {
              ...prev,
              rightThresholds: newThresholds,
              testComplete: true,
            };
          }
        }

        // Next frequency
        const newStaircase = createStaircase();
        return {
          ...prev,
          [isLeft ? "leftThresholds" : "rightThresholds"]: newThresholds,
          currentFrequencyIndex: nextIndex,
          staircaseState: newStaircase,
        };
      });
    } else {
      // Continue with same frequency
      setTestState((prev) => ({
        ...prev,
        staircaseState: {
          ...prev.staircaseState!,
          state: result.newState,
        },
      }));
    }
  };

  // Auto-play next tone after response
  useEffect(() => {
    if (
      (step === "test-left" || step === "test-right") &&
      testState.staircaseState &&
      !isPlaying &&
      !testState.testComplete
    ) {
      const currentFreq = FREQUENCIES[testState.currentFrequencyIndex];
      const ear = step === "test-left" ? "left" : "right";
      const level = getCurrentLevel(testState.staircaseState.state);

      const timer = setTimeout(() => {
        playTone(currentFreq, ear, level);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [
    step,
    testState.staircaseState,
    testState.currentFrequencyIndex,
    isPlaying,
    testState.testComplete,
    playTone,
  ]);

  // Move to right ear when left is complete
  useEffect(() => {
    if (
      step === "test-left" &&
      testState.currentFrequencyIndex === 0 &&
      testState.staircaseState === null &&
      Object.values(testState.leftThresholds).some((v) => v !== null)
    ) {
      // Check if all left frequencies are done
      const allDone = FREQUENCIES.every(
        (f) => testState.leftThresholds[f] !== null
      );
      if (allDone) {
        setStep("test-right");
        setTestState((prev) => ({
          ...prev,
          currentFrequencyIndex: 0,
        }));
      }
    }
  }, [step, testState]);

  const [savedResult, setSavedResult] = useState<TestResult | null>(null);

  // Save results and show results page when complete
  useEffect(() => {
    if (testState.testComplete && step === "test-right") {
      const result: TestResult = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        deviceInfo: navigator.userAgent,
        baselineVolumeInstructionAcknowledged: true,
        thresholds: {
          left: testState.leftThresholds,
          right: testState.rightThresholds,
        },
      };
      saveTestResult(result);
      setSavedResult(result);
      setStep("results");
    }
  }, [testState.testComplete, step]);

  const handleEmergencyStop = () => {
    audioEngine.stopAll();
    setEmergencyStop(true);
    setIsPlaying(false);
    setTimeout(() => setEmergencyStop(false), 1000);
  };

  const currentFreq = FREQUENCIES[testState.currentFrequencyIndex];
  const progress =
    step === "test-left"
      ? (testState.currentFrequencyIndex / FREQUENCIES.length) * 100
      : step === "test-right"
        ? (50 +
            (testState.currentFrequencyIndex / FREQUENCIES.length) * 50)
        : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Progress bar */}
        {(step === "test-left" || step === "test-right") && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>
                Testing {step === "test-left" ? "Left" : "Right"} Ear
              </span>
              <span>
                {Math.round(progress)}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Emergency stop button */}
        {(step === "test-left" || step === "test-right") && (
          <div className="mb-4 text-center">
            <button
              onClick={handleEmergencyStop}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              🛑 Stop All Sound
            </button>
          </div>
        )}

        {/* Step 1: Headphone Check */}
        {step === "headphone-check" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Headphone Check</h2>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              We need to verify your headphones are working correctly. You
              should hear a tone in one ear at a time.
            </p>

            {!testState.headphoneCheckLeft && (
              <div>
                <p className="mb-4 font-medium">
                  Step 1: Listen for a tone in your LEFT ear
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => handleHeadphoneCheck("left")}
                    disabled={isPlaying}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPlaying ? "Playing..." : "Play Tone (Left)"}
                  </button>
                  <button
                    onClick={() => handleHeadphoneResponse("left", true)}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    ✓ I hear it in LEFT
                  </button>
                  <button
                    onClick={() => handleHeadphoneResponse("left", false)}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    ✗ Not in LEFT
                  </button>
                </div>
                {headphoneCheckFailed && !testState.headphoneCheckLeft && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-800 dark:text-red-200 font-medium mb-2">
                      Headphone check failed
                    </p>
                    <ul className="text-sm text-red-700 dark:text-red-300 list-disc list-inside space-y-1">
                      <li>Check that your headphones are properly connected</li>
                      <li>Verify left and right channels are working</li>
                      <li>Try unplugging and reconnecting your headphones</li>
                      <li>Check your device&apos;s audio settings</li>
                    </ul>
                    <button
                      onClick={() => {
                        setHeadphoneCheckFailed(false);
                        setTestState((prev) => ({
                          ...prev,
                          headphoneCheckLeft: false,
                          headphoneCheckRight: false,
                        }));
                      }}
                      className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            )}

            {testState.headphoneCheckLeft && !testState.headphoneCheckRight && (
              <div>
                <p className="mb-4 font-medium">
                  Step 2: Listen for a tone in your RIGHT ear
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => handleHeadphoneCheck("right")}
                    disabled={isPlaying}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPlaying ? "Playing..." : "Play Tone (Right)"}
                  </button>
                  <button
                    onClick={() => handleHeadphoneResponse("right", true)}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    ✓ I hear it in RIGHT
                  </button>
                  <button
                    onClick={() => handleHeadphoneResponse("right", false)}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    ✗ Not in RIGHT
                  </button>
                </div>
                {headphoneCheckFailed && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-800 dark:text-red-200 font-medium mb-2">
                      Headphone check failed
                    </p>
                    <ul className="text-sm text-red-700 dark:text-red-300 list-disc list-inside space-y-1">
                      <li>Check that your headphones are properly connected</li>
                      <li>Verify left and right channels are working</li>
                      <li>Try unplugging and reconnecting your headphones</li>
                      <li>Check your device&apos;s audio settings</li>
                    </ul>
                    <button
                      onClick={() => {
                        setHeadphoneCheckFailed(false);
                        setTestState((prev) => ({
                          ...prev,
                          headphoneCheckLeft: false,
                          headphoneCheckRight: false,
                        }));
                      }}
                      className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Quiet Room */}
        {step === "quiet-room" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Environment Check</h2>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 mb-6">
              <p className="text-yellow-800 dark:text-yellow-200">
                <strong>Important:</strong> For accurate results, please ensure
                you are in a quiet environment. Background noise can affect the
                test results.
              </p>
            </div>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              Are you in a quiet room with minimal background noise?
            </p>
            <button
              onClick={handleQuietRoomConfirm}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Yes, I'm in a quiet room
            </button>
          </div>
        )}

        {/* Step 3 & 4: Pure Tone Test */}
        {(step === "test-left" || step === "test-right") && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">
              Pure Tone Test - {step === "test-left" ? "Left" : "Right"} Ear
            </h2>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              Testing frequency: <strong>{currentFreq} Hz</strong>
            </p>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
              A tone will play automatically. Click &quot;Heard&quot; if you hear
              it, or &quot;Didn&apos;t hear&quot; if you don&apos;t. You can
              repeat the tone if needed.
            </p>

            <div className="flex flex-col gap-4">
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => playTone(currentFreq, step === "test-left" ? "left" : "right", getCurrentLevel(testState.staircaseState?.state || createStaircase().state))}
                  disabled={isPlaying || !canRepeat || emergencyStop}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPlaying ? "Playing..." : "Repeat Tone"}
                </button>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => handleTestResponse("heard")}
                  disabled={isPlaying}
                  className="px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
                >
                  ✓ Heard
                </button>
                <button
                  onClick={() => handleTestResponse("notHeard")}
                  disabled={isPlaying}
                  className="px-8 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
                >
                  ✗ Didn&apos;t hear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Results */}
        {step === "results" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Test Results</h2>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              Your hearing screening results are shown below. Remember, these
              are not medical results and should not replace a professional
              hearing evaluation.
            </p>

            <div className="mb-8">
              {savedResult && (
                <AudiogramChart thresholds={savedResult.thresholds} />
              )}
            </div>

            {savedResult && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Screening Interpretation</h3>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Note:</strong> These are rough screening suggestions only, not medical diagnoses.
                  </p>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>
                      • <strong>Normal-ish range:</strong> Thresholds above -30 dB (relative)
                    </p>
                    <p>
                      • <strong>Possible mild:</strong> Thresholds between -30 dB and -45 dB
                    </p>
                    <p>
                      • <strong>Possible moderate:</strong> Thresholds below -45 dB
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
                    Remember: Results vary by device, headphones, and environment. These ranges are approximate and for screening purposes only.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-6">
              <p className="text-blue-800 dark:text-blue-200">
                <strong>Next Steps:</strong> If you struggle to hear speech in
                noisy environments, experience ringing in your ears, or have
                concerns about your hearing, please consider scheduling a
                professional hearing evaluation with a licensed audiologist.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => router.push("/")}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Back to Home
              </button>
              <button
                onClick={() => {
                  router.push("/test");
                  window.location.reload();
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Take Test Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

