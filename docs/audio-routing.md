# Audio Routing Technical Documentation

## Overview

The Hearing Check application uses the Web Audio API to generate pure tones and route them to specific ears (left, right, or both). This document explains how the audio routing works.

## Architecture

### Audio Graph

The audio signal flows through the following nodes:

```
OscillatorNode → GainNode (envelope) → GainNode (level) → StereoPanner → MasterGain → Destination
```

### Components

#### 1. AudioContext

The `AudioContext` is the foundation of all Web Audio API operations. It's created lazily on the first user interaction (required by browser autoplay policies).

```typescript
audioContext = new AudioContext();
```

#### 2. OscillatorNode

Generates a pure sine wave at the specified frequency:

```typescript
const oscillator = audioContext.createOscillator();
oscillator.type = "sine";
oscillator.frequency.value = frequency; // e.g., 1000 Hz
```

#### 3. Envelope GainNode

Controls the attack and release (fade in/out) to prevent audio clicks:

```typescript
const envelopeGain = audioContext.createGain();
// Attack: 0 → 1 over 10ms
envelopeGain.gain.setValueAtTime(0, now);
envelopeGain.gain.linearRampToValueAtTime(1, now + 0.01);
// Sustain: hold at 1
envelopeGain.gain.setValueAtTime(1, now + 0.01 + sustainTime);
// Release: 1 → 0 over 50ms
envelopeGain.gain.linearRampToValueAtTime(0, now + releaseTime);
```

#### 4. Level GainNode

Controls the overall volume based on the threshold test level:

```typescript
const levelGain = audioContext.createGain();
// Convert dB to linear gain
const linearGain = referenceGain * Math.pow(10, level / 20);
levelGain.gain.value = linearGain;
```

#### 5. StereoPanner

Routes audio to left ear, right ear, or both:

```typescript
const panNode = audioContext.createStereoPanner();
if (ear === "left") {
  panNode.pan.value = -1; // Full left
} else if (ear === "right") {
  panNode.pan.value = 1; // Full right
} else {
  panNode.pan.value = 0; // Center (both)
}
```

The `pan` property ranges from -1 (full left) to +1 (full right), with 0 being center.

#### 6. Master Gain

A global gain node that provides a safe default volume level:

```typescript
const masterGain = audioContext.createGain();
masterGain.gain.value = 0.5; // 50% of system volume
masterGain.connect(audioContext.destination);
```

## Tone Generation Flow

When `playTone()` is called:

1. **Initialize AudioContext** (if not already done)
2. **Create oscillator** at the specified frequency
3. **Create envelope gain** for fade in/out
4. **Create level gain** based on threshold test level
5. **Create stereo panner** based on target ear
6. **Connect nodes** in sequence
7. **Schedule envelope** (attack → sustain → release)
8. **Start oscillator** and schedule stop
9. **Clean up** when tone finishes

## Safety Features

### Volume Limits

- **Reference gain**: 0.3 (30% of system volume)
- **Level range**: -60 dB to 0 dB relative to reference
- **Minimum level**: -60 dB (very quiet, safe)
- **Maximum level**: 0 dB (reference level, moderate)

### Click Prevention

The envelope ensures smooth fade in/out:
- **Attack**: 10ms linear fade in
- **Release**: 50ms linear fade out
- Prevents sudden audio onsets that could cause clicks or discomfort

### Emergency Stop

All active oscillators and gain nodes are tracked. The `stopAll()` method:
- Immediately stops all oscillators
- Cancels all scheduled gain changes
- Sets all gain values to 0
- Clears active node arrays

## Browser Compatibility

### Web Audio API Support

- **Chrome/Edge**: Full support
- **Safari**: Full support (iOS 14+)
- **Firefox**: Full support
- **Opera**: Full support

### Autoplay Policy

Browsers require user interaction before audio can play. The application:
1. Waits for user gesture (button click)
2. Calls `audioContext.resume()` if suspended
3. Initializes audio on first test step

### Stereo Panning

The `StereoPannerNode` is well-supported in modern browsers. For older browsers, alternative approaches:
- Use `ChannelSplitterNode` and `ChannelMergerNode`
- Manually mix left/right channels

## Implementation Details

### Singleton Pattern

The `AudioEngine` class is exported as a singleton to ensure:
- Single AudioContext instance
- Shared master gain node
- Centralized audio management

### Promise-Based API

`playTone()` returns a Promise that resolves when the tone finishes:

```typescript
await audioEngine.playTone({
  frequency: 1000,
  ear: "left",
  level: -20,
  durationMs: 1000,
});
// Tone has finished playing
```

### Resource Cleanup

Oscillators and gain nodes are automatically cleaned up:
- `onended` event handler removes nodes from tracking arrays
- Prevents memory leaks from accumulated audio nodes

## Testing Audio Routing

To verify left/right routing works correctly:

1. Use wired headphones (not Bluetooth)
2. Run the headphone check step
3. Verify tone plays only in the expected ear
4. Check browser audio settings (ensure stereo output)

## Troubleshooting

### No Sound

- Check browser autoplay settings
- Verify AudioContext state (`audioContext.state`)
- Check system volume
- Ensure headphones are connected

### Wrong Ear

- Verify headphone connection (L/R swapped)
- Check browser audio settings
- Test with different headphones
- Verify `panNode.pan.value` is set correctly

### Audio Clicks

- Ensure envelope is applied (attack/release)
- Check that gain starts at 0
- Verify linear ramps are scheduled correctly

## Future Enhancements

Potential improvements to audio routing:

1. **Channel Splitter/Merger**: More explicit control for older browsers
2. **Binaural Beats**: Optional binaural audio for masking
3. **Calibration Tones**: Pre-test calibration at known frequencies
4. **Headphone Detection**: Attempt to detect headphone type
5. **Frequency Response Correction**: Compensate for headphone frequency response

