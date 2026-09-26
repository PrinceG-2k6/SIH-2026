/** Tiny inline sparkline from a number series */
export function Sparkline({
  values,
  color = "var(--accent)",
  width = 120,
  height = 28,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / span) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  const last = values[values.length - 1];
  const first = values[0];
  const up = last >= first;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={pts}
        opacity={0.9}
      />
      <circle
        cx={width}
        cy={height - ((last - min) / span) * (height - 4) - 2}
        r="2.5"
        fill={up ? "var(--good)" : "var(--warn)"}
      />
    </svg>
  );
}
