import React from "react";
import { HistogramBin } from "../../types/api";

interface SparklineProps {
  bins?: HistogramBin[];
  values?: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  bins,
  values,
  width = 80,
  height = 24,
  color = "#06B6D4",
  className = "",
}) => {
  let counts: number[] = [];

  if (bins && bins.length > 0) {
    counts = bins.map((b) => b.count);
  } else if (values && values.length > 0) {
    counts = values;
  }

  if (counts.length === 0) {
    return <div className={`h-[${height}px] w-[${width}px] bg-slate-800/40 rounded ${className}`} />;
  }

  const maxVal = Math.max(...counts, 1);
  const barWidth = Math.max(2, (width - (counts.length - 1) * 2) / counts.length);

  return (
    <svg width={width} height={height} className={`overflow-visible ${className}`}>
      {counts.map((val, idx) => {
        const barHeight = Math.max(2, (val / maxVal) * (height - 2));
        const x = idx * (barWidth + 2);
        const y = height - barHeight;
        return (
          <rect
            key={idx}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            fill={color}
            opacity={0.85}
            rx={1}
          />
        );
      })}
    </svg>
  );
};
