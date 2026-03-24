import { cn } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({ data, width = 60, height = 24, className }: SparklineProps) {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} className="flex items-center justify-center">
      <span className="text-xs text-muted-foreground">—</span>
    </div>;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const trend = data[data.length - 1] - data[0];

  // Build SVG polyline points
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  const strokeColor = trend >= 0 ? "#34d399" : "#f87171"; // emerald or red

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("flex-shrink-0", className)}
      data-testid="sparkline"
    >
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
      {/* End dot */}
      {data.length > 0 && (() => {
        const lastIdx = data.length - 1;
        const x = width;
        const y = height - ((data[lastIdx] - min) / range) * height;
        return (
          <circle
            cx={x}
            cy={y}
            r={2}
            fill={strokeColor}
          />
        );
      })()}
    </svg>
  );
}
