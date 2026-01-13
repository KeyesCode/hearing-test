"use client";

import type { Frequency, TestResult } from "@/lib/types";

interface AudiogramChartProps {
  thresholds: TestResult["thresholds"];
}

const FREQUENCIES: Frequency[] = [250, 500, 1000, 2000, 4000, 8000];
const CHART_WIDTH = 600;
const CHART_HEIGHT = 400;
const PADDING = { top: 40, right: 40, bottom: 60, left: 60 };
const PLOT_WIDTH = CHART_WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;

// Level range: -60 dB (top) to 0 dB (bottom)
const MIN_LEVEL = -60;
const MAX_LEVEL = 0;

function levelToY(level: number): number {
  const normalized = (level - MIN_LEVEL) / (MAX_LEVEL - MIN_LEVEL);
  return PADDING.top + normalized * PLOT_HEIGHT;
}

function frequencyToX(freq: Frequency, index: number): number {
  // Logarithmic spacing for frequencies
  const logFreqs = FREQUENCIES.map((f) => Math.log10(f));
  const minLog = logFreqs[0];
  const maxLog = logFreqs[logFreqs.length - 1];
  const logFreq = Math.log10(freq);
  const normalized = (logFreq - minLog) / (maxLog - minLog);
  return PADDING.left + normalized * PLOT_WIDTH;
}

export default function AudiogramChart({ thresholds }: AudiogramChartProps) {
  const leftPoints: Array<{ x: number; y: number; freq: Frequency }> = [];
  const rightPoints: Array<{ x: number; y: number; freq: Frequency }> = [];

  FREQUENCIES.forEach((freq, index) => {
    const x = frequencyToX(freq, index);
    const leftLevel = thresholds.left[freq];
    const rightLevel = thresholds.right[freq];

    if (leftLevel !== null && leftLevel !== undefined) {
      leftPoints.push({ x, y: levelToY(leftLevel), freq });
    }
    if (rightLevel !== null && rightLevel !== undefined) {
      rightPoints.push({ x, y: levelToY(rightLevel), freq });
    }
  });

  // Create path strings for lines
  const leftPath =
    leftPoints.length > 0
      ? leftPoints
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
          .join(" ")
      : "";
  const rightPath =
    rightPoints.length > 0
      ? rightPoints
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
          .join(" ")
      : "";

  return (
    <div className="w-full max-w-2xl mx-auto">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full h-auto border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
      >
        {/* Grid lines */}
        {[-60, -50, -40, -30, -20, -10, 0].map((level) => {
          const y = levelToY(level);
          return (
            <line
              key={level}
              x1={PADDING.left}
              y1={y}
              x2={CHART_WIDTH - PADDING.right}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          );
        })}

        {/* Y-axis labels (levels) */}
        {[-60, -50, -40, -30, -20, -10, 0].map((level) => {
          const y = levelToY(level);
          return (
            <text
              key={level}
              x={PADDING.left - 10}
              y={y + 4}
              textAnchor="end"
              className="text-xs fill-gray-600 dark:fill-gray-400"
            >
              {level}
            </text>
          );
        })}

        {/* X-axis labels (frequencies) */}
        {FREQUENCIES.map((freq, index) => {
          const x = frequencyToX(freq, index);
          return (
            <text
              key={freq}
              x={x}
              y={CHART_HEIGHT - PADDING.bottom + 20}
              textAnchor="middle"
              className="text-xs fill-gray-600 dark:fill-gray-400"
            >
              {freq}
            </text>
          );
        })}

        {/* Axes */}
        <line
          x1={PADDING.left}
          y1={PADDING.top}
          x2={PADDING.left}
          y2={CHART_HEIGHT - PADDING.bottom}
          stroke="#374151"
          strokeWidth="2"
        />
        <line
          x1={PADDING.left}
          y1={CHART_HEIGHT - PADDING.bottom}
          x2={CHART_WIDTH - PADDING.right}
          y2={CHART_HEIGHT - PADDING.bottom}
          stroke="#374151"
          strokeWidth="2"
        />

        {/* Left ear line */}
        {leftPath && (
          <path
            d={leftPath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Right ear line */}
        {rightPath && (
          <path
            d={rightPath}
            fill="none"
            stroke="#ef4444"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Left ear points */}
        {leftPoints.map((point) => (
          <circle
            key={`left-${point.freq}`}
            cx={point.x}
            cy={point.y}
            r="6"
            fill="#3b82f6"
            stroke="white"
            strokeWidth="2"
          />
        ))}

        {/* Right ear points */}
        {rightPoints.map((point) => (
          <circle
            key={`right-${point.freq}`}
            cx={point.x}
            cy={point.y}
            r="6"
            fill="#ef4444"
            stroke="white"
            strokeWidth="2"
          />
        ))}

        {/* Legend */}
        <g transform={`translate(${CHART_WIDTH - 150}, ${PADDING.top})`}>
          <line
            x1="0"
            y1="10"
            x2="30"
            y2="10"
            stroke="#3b82f6"
            strokeWidth="3"
          />
          <text
            x="35"
            y="14"
            className="text-xs fill-gray-700 dark:fill-gray-300"
          >
            Left Ear
          </text>
          <line
            x1="0"
            y1="30"
            x2="30"
            y2="30"
            stroke="#ef4444"
            strokeWidth="3"
          />
          <text
            x="35"
            y="34"
            className="text-xs fill-gray-700 dark:fill-gray-300"
          >
            Right Ear
          </text>
        </g>

        {/* Axis labels */}
        <text
          x={CHART_WIDTH / 2}
          y={CHART_HEIGHT - 10}
          textAnchor="middle"
          className="text-sm font-medium fill-gray-700 dark:fill-gray-300"
        >
          Frequency (Hz)
        </text>
        <text
          x={20}
          y={CHART_HEIGHT / 2}
          textAnchor="middle"
          transform={`rotate(-90, 20, ${CHART_HEIGHT / 2})`}
          className="text-sm font-medium fill-gray-700 dark:fill-gray-300"
        >
          Relative Level (dB)
        </text>
      </svg>
    </div>
  );
}

