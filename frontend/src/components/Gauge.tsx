/** Circular progress meter styled with Newsprint editorial precision */
export function Gauge({
  value,
  max = 100,
  label,
  unit = "",
  tone = "accent",
  size = 110,
}: {
  value: number;
  max?: number;
  label: string;
  unit?: string;
  tone?: "accent" | "good" | "warn" | "bad" | "info";
  size?: number;
}) {
  const colors = {
    accent: "#C41212",
    good: "#1b6a38",
    warn: "#a65800",
    bad: "#C41212",
    info: "#111111",
  };
  const stroke = colors[tone] || "#111111";
  const r = 38;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value / max));
  const dash = c * pct;

  return (
    <div className="flex flex-col items-center justify-center p-3 border border-[#111111] bg-[#FAF7EE] min-w-[120px]">
      <svg width={size} height={size} viewBox="0 0 100 100" className="gauge-ring">
        {/* Background Track */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="#D8D0BF" strokeWidth="6" />
        {/* Progress Value */}
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="square"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ transition: "stroke-dasharray 600ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="-mt-[4.2rem] mb-6 text-center">
        <div className="font-mono text-lg font-bold text-[#111111]">
          {typeof value === "number" ? value.toFixed(value >= 100 ? 0 : 1) : value}
          <span className="text-[10px] text-[#6B655A]"> {unit}</span>
        </div>
        <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#4D483F]">
          {label}
        </div>
      </div>
    </div>
  );
}
