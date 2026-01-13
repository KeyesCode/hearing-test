# Hearing Check

A production-ready Next.js 14 web application for non-medical hearing screening using the Web Audio API.

## Overview

Hearing Check is a client-side hearing screening tool that allows users to assess their hearing sensitivity across multiple frequencies. The application uses pure tones generated via the Web Audio API and implements a staircase threshold detection algorithm to determine hearing thresholds for each ear.

**⚠️ Important:** This is a screening tool only, not a medical diagnosis. Results are not calibrated and should not replace professional hearing evaluations.

## Features

- **Headphone Check**: Verifies left/right audio routing before testing
- **Environment Warning**: Reminds users to test in a quiet environment
- **Pure Tone Threshold Test**: Tests hearing at 6 frequencies (250, 500, 1000, 2000, 4000, 8000 Hz) for each ear
- **Staircase Algorithm**: Implements adaptive threshold detection
- **Audiogram Chart**: Displays results in a visual audiogram-style format
- **Local Storage**: Persists test results in the browser
- **Safe Audio Levels**: Starts at moderate levels with fade in/out to prevent clicks
- **Emergency Stop**: Allows users to immediately stop all audio

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Web Audio API** (AudioContext, OscillatorNode, GainNode, StereoPanner)
- **ESLint** & **Prettier**

## Getting Started

### Prerequisites

- Node.js 18+ and npm (or yarn/pnpm)

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
hearing-check/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── page.tsx      # Landing page
│   │   ├── test/         # Test page
│   │   ├── layout.tsx    # Root layout
│   │   └── globals.css   # Global styles
│   ├── components/       # React components
│   │   ├── TestWizard.tsx      # Multi-step test wizard
│   │   ├── AudiogramChart.tsx  # SVG audiogram visualization
│   │   └── DisclaimerBanner.tsx
│   └── lib/              # Core libraries
│       ├── audio/
│       │   └── audioEngine.ts  # Web Audio API wrapper
│       ├── test/
│       │   └── staircase.ts   # Threshold detection algorithm
│       ├── storage.ts         # localStorage persistence
│       └── types.ts           # TypeScript types
├── docs/                 # Documentation
└── README.md
```

## How It Works

### Audio Generation

The application uses the Web Audio API to generate pure sine wave tones:

1. **AudioContext**: Created on first user interaction (required by browsers)
2. **OscillatorNode**: Generates sine waves at specified frequencies
3. **GainNode**: Controls volume with attack/release envelope to prevent clicks
4. **StereoPanner**: Routes audio to left ear, right ear, or both

See `docs/audio-routing.md` for detailed technical documentation.

### Threshold Detection

The staircase algorithm adaptively finds hearing thresholds:

- Starts at a moderate level (-20 dB relative to reference)
- If user hears tone: decrease level by 6 dB (go quieter)
- If user doesn't hear: increase level by 3 dB (go louder)
- Stops after 4 reversals or 20 attempts per frequency
- Threshold is recorded as the final level

### Data Model

Test results are stored in localStorage with the following structure:

```typescript
interface TestResult {
  id: string;
  createdAt: string;
  deviceInfo: string;
  baselineVolumeInstructionAcknowledged: boolean;
  thresholds: {
    left: Record<Frequency, number | null>;
    right: Record<Frequency, number | null>;
  };
}
```

## Limitations

1. **No Calibration**: Results are relative, not calibrated to medical dB HL standards
2. **Device Variability**: Different devices, headphones, and audio drivers produce different results
3. **Environment Dependent**: Background noise affects accuracy
4. **Not Medical**: This is a screening tool only, not a diagnosis
5. **Browser Compatibility**: Requires modern browser with Web Audio API support

## Roadmap

Future enhancements may include:

- **Speech-in-Noise Test**: Additional test for speech understanding in noise
- **Headphone Calibration Profiles**: Pre-calibrated profiles for common headphone models
- **Backend Storage**: Optional cloud storage for test history
- **Export Results**: Download results as PDF or CSV
- **Mobile Optimization**: Enhanced mobile experience
- **Accessibility**: Screen reader support and keyboard navigation

## Browser Support

- Chrome/Edge (recommended)
- Safari (iOS 14+)
- Firefox
- Opera

Requires Web Audio API support and user gesture to initialize audio context.

## Safety Features

- Default audio levels are conservative (starts at -20 dB relative)
- Fade in/out envelope prevents audio clicks
- Emergency stop button immediately silences all audio
- AudioContext is properly initialized on user interaction
- Maximum level limits prevent dangerously loud sounds

## Contributing

This is a production-ready application. When contributing:

1. Follow TypeScript strict mode
2. Run `npm run lint` before committing
3. Run `npm run format` to format code
4. Test on multiple browsers
5. Ensure audio safety (no sudden loud sounds)

## License

This project is provided as-is for educational and screening purposes.

## Medical Disclaimer

**This tool is for screening purposes only and does not provide a medical diagnosis.** Results are not calibrated to medical standards and may vary significantly based on your device, headphones, and testing environment. If you have concerns about your hearing, experience hearing loss, or struggle to hear speech in noisy environments, please consult a licensed audiologist or healthcare provider for a professional evaluation.

