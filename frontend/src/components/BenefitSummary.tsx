import type { ComparisonResponse, OptimizeResponse } from "../types";
import { AnimatedNumber } from "./AnimatedNumber";

interface Props {
  optimization: OptimizeResponse;
  comparison: ComparisonResponse;
}

export function BenefitSummary({ optimization, comparison }: Props) {
  const rec = optimization.recommended;

  return (
    <section className="fade-in relative overflow-hidden plate p-8 md:p-10">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 opacity-[0.06]">
        <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="xMaxYMid slice">
          <path d="M20 100 L80 0 L100 0 L100 100 Z" fill="currentColor" />
        </svg>
      </div>
      <p className="eyebrow text-[var(--accent)]">Closing the loop</p>
      <h3 className="serif mt-2 text-4xl font-semibold text-[var(--ink)]">Expected benefit</h3>
      <p className="mt-3 max-w-2xl text-sm text-[var(--ink-muted)]">{comparison.summary}</p>

      <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <Delta label="Production" value={comparison.production_change_pct} goodWhenPositive />
        <Delta label="SOR" value={comparison.sor_change_pct} goodWhenPositive={false} />
        <Delta label="Failure risk" value={comparison.failure_risk_change_pct} goodWhenPositive={false} />
        <div>
          <div className="eyebrow">Recommended rate</div>
          <div className="mono mt-2 text-4xl text-[var(--ink)]">
            <AnimatedNumber value={rec.predicted_oil_rate_bopd} decimals={1} />
            <span className="ml-2 text-sm text-[var(--ink-faint)]">BOPD</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Delta({
  label,
  value,
  goodWhenPositive,
}: {
  label: string;
  value: number;
  goodWhenPositive: boolean;
}) {
  const good = goodWhenPositive ? value > 0 : value < 0;
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className={`mono mt-2 text-4xl ${good ? "text-[var(--good)]" : "text-[var(--warn)]"}`}>
        {value >= 0 ? "+" : ""}
        <AnimatedNumber value={value} decimals={1} />%
      </div>
      <div className="mt-3 h-0.5 w-16" style={{ background: good ? "var(--good)" : "var(--warn)" }} />
    </div>
  );
}
