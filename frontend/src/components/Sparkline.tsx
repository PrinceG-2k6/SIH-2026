/** Tiny inline sparkline styled with Newsprint ink precision */
export function Sparkline({
  values,
  color = "#111111",
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
        strokeWidth="1.75"
        strokeLinejoin="miter"
        strokeLinecap="square"
        points={pts}
      />
      <rect
        x={width - 2}
        y={height - ((last - min) / span) * (height - 4) - 4}
        width="4"
        height="4"
        fill={up ? "#1b6a38" : "#CC0000"}
      />
    </svg>
  );
}
