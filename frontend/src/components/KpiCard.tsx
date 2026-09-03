interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  tone?: "default" | "good" | "warn" | "bad";
}

const toneBorder = {
  default: "border-[var(--line)]",
  good: "border-[rgba(111,159,122,0.35)]",
  warn: "border-[rgba(201,162,39,0.4)]",
  bad: "border-[rgba(196,92,74,0.45)]",
};

const toneValue = {
  default: "text-[var(--ink)]",
  good: "text-[var(--good)]",
  warn: "text-[var(--warn)]",
  bad: "text-[var(--bad)]",
};

export function KpiCard({ label, value, unit, tone = "default" }: KpiCardProps) {
  return (
    <div className={`border-l-2 bg-[rgba(18,20,26,0.55)] px-3 py-3 ${toneBorder[tone]}`}>
      <div className="label-caps">{label}</div>
      <div className={`kpi-value mt-1 ${toneValue[tone]}`}>
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-[var(--ink-faint)]">{unit}</span>}
      </div>
    </div>
  );
}
