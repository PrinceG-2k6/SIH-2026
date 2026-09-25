interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  tone?: "default" | "good" | "warn" | "bad";
}

const toneStyles = {
  default: "border-l-4 border-l-[#111111]",
  good: "border-l-4 border-l-[#1b6a38]",
  warn: "border-l-4 border-l-[#a65800]",
  bad: "border-l-4 border-l-[#CC0000]",
};

const toneValue = {
  default: "text-[#111111]",
  good: "text-[#1b6a38]",
  warn: "text-[#a65800]",
  bad: "text-[#CC0000]",
};

export function KpiCard({ label, value, unit, tone = "default" }: KpiCardProps) {
  return (
    <div className={`border border-[#111111] bg-[#F9F9F7] px-4 py-3 ${toneStyles[tone]}`}>
      <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#525252]">
        {label}
      </div>
      <div className={`mt-1 font-mono text-2xl font-bold ${toneValue[tone]}`}>
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-[#737373]">{unit}</span>}
      </div>
    </div>
  );
}
