import type { Ear, PlayToneOptions } from "../types";

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private activeGainNodes: GainNode[] = [];
  private masterGain: GainNode | null = null;
  private isInitialized = false;

  /**
   * Initialize AudioContext on first user gesture (required by browsers)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.audioContext?.state === "running") {
      return;
    }

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    if (!this.masterGain) {
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0.5; // Safe default volume
    }

    this.isInitialized = true;
  }

  /**
   * Stop all currently playing sounds immediately
   */
  stopAll(): void {
    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch (e) {
        // Oscillator may already be stopped
      }
    });
    this.activeGainNodes.forEach((gain) => {
      try {
        gain.gain.cancelScheduledValues(this.audioContext!.currentTime);
        gain.gain.setValueAtTime(0, this.audioContext!.currentTime);
      } catch (e) {
        // Ignore errors
      }
    });
    this.activeOscillators = [];
    this.activeGainNodes = [];
  }

  /**
   * Play a pure tone with fade in/out to avoid clicks
   * @param options Tone parameters
   * @returns Promise that resolves when tone finishes playing
   */
  async playTone(options: PlayToneOptions): Promise<void> {
    if (!this.audioContext || !this.masterGain) {
      await this.initialize();
    }

    if (!this.audioContext || !this.masterGain) {
      throw new Error("AudioContext failed to initialize");
    }

    const {
      frequency,
      ear,
      level,
      durationMs = 1000,
    } = options;

    // Attack and release times (in seconds)
    const attackTime = 0.01; // 10ms fade in
    const releaseTime = 0.05; // 50ms fade out
    const sustainTime = (durationMs / 1000) - attackTime - releaseTime;

    // Convert relative dB level to linear gain
    // level is in dB relative to reference (0 dB = reference, negative = quieter)
    // Reference level is set to a safe moderate volume
    const referenceGain = 0.3; // Safe reference level
    const linearGain = referenceGain * Math.pow(10, level / 20);

    // Create oscillator
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    // Create gain node for envelope (attack/release)
    const envelopeGain = this.audioContext.createGain();
    envelopeGain.gain.value = 0;

    // Create pan node for left/right routing
    const panNode = this.audioContext.createStereoPanner();
    if (ear === "left") {
      panNode.pan.value = -1; // Full left
    } else if (ear === "right") {
      panNode.pan.value = 1; // Full right
    } else {
      panNode.pan.value = 0; // Center (both)
    }

    // Create level gain node (for volume control)
    const levelGain = this.audioContext.createGain();
    levelGain.gain.value = linearGain;

    // Connect: oscillator -> envelope -> level -> pan -> master -> destination
    oscillator.connect(envelopeGain);
    envelopeGain.connect(levelGain);
    levelGain.connect(panNode);
    panNode.connect(this.masterGain);

    // Store references for cleanup
    this.activeOscillators.push(oscillator);
    this.activeGainNodes.push(envelopeGain);

    const now = this.audioContext.currentTime;

    // Envelope: attack -> sustain -> release
    envelopeGain.gain.setValueAtTime(0, now);
    envelopeGain.gain.linearRampToValueAtTime(1, now + attackTime);
    envelopeGain.gain.setValueAtTime(1, now + attackTime + sustainTime);
    envelopeGain.gain.linearRampToValueAtTime(0, now + attackTime + sustainTime + releaseTime);

    // Start oscillator
    oscillator.start(now);
    oscillator.stop(now + attackTime + sustainTime + releaseTime);

    // Clean up when done
    oscillator.onended = () => {
      this.activeOscillators = this.activeOscillators.filter((osc) => osc !== oscillator);
      this.activeGainNodes = this.activeGainNodes.filter((gain) => gain !== envelopeGain);
    };

    // Return promise that resolves when tone finishes
    return new Promise((resolve) => {
      oscillator.onended = () => {
        this.activeOscillators = this.activeOscillators.filter((osc) => osc !== oscillator);
        this.activeGainNodes = this.activeGainNodes.filter((gain) => gain !== envelopeGain);
        resolve();
      };
    });
  }

  /**
   * Get the current AudioContext state
   */
  getState(): AudioContextState | null {
    return this.audioContext?.state || null;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopAll();
    if (this.audioContext) {
      this.audioContext.close().catch(() => {
        // Ignore errors on cleanup
      });
      this.audioContext = null;
    }
    this.masterGain = null;
    this.isInitialized = false;
  }
}

// Export singleton instance
export const audioEngine = new AudioEngine();

