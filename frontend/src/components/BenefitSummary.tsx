import type { ComparisonResponse, OptimizeResponse } from "../types";
import { AnimatedNumber } from "./AnimatedNumber";

interface Props {
  optimization: OptimizeResponse;
  comparison: ComparisonResponse;
}

export function BenefitSummary({ optimization, comparison }: Props) {
  const rec = optimization.recommended;

  return (
    <section className="border-4 border-[#111111] bg-[#FAF7EE] p-6 md:p-8 relative">
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b-2 border-[#111111] pb-3">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#C41212]">
            ECONOMIC & OPERATIONAL AUDIT
          </span>
          <h3 className="mt-1 font-serif text-3xl font-black text-[#111111] uppercase">
            Quantified Field Benefit
          </h3>
        </div>
        <p className="font-body text-xs text-[#4D483F] max-w-md">
          {comparison.summary}
        </p>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <DeltaBox label="Net Production Uplift" value={comparison.production_change_pct} goodWhenPositive />
        <DeltaBox label="SOR Steam Reduction" value={comparison.sor_change_pct} goodWhenPositive={false} />
        <DeltaBox label="Equipment Risk Reduction" value={comparison.failure_risk_change_pct} goodWhenPositive={false} />
        
        <div className="border border-[#111111] bg-[#EAE2D2] p-4">
          <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#6B655A]">
            Target Production Point
          </div>
          <div className="mt-2 font-mono text-3xl font-bold text-[#111111]">
            <AnimatedNumber value={rec.predicted_oil_rate_bopd} decimals={1} />
            <span className="ml-1 text-xs font-normal text-[#6B655A]">BOPD</span>
          </div>
          <div className="mt-2 font-mono text-[10px] text-[#1b6a38] font-semibold">
            MAXIMUM DISPATCHABLE CAPACITY
          </div>
        </div>
      </div>
    </section>
  );
}

function DeltaBox({
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
    <div className="border border-[#111111] bg-[#FAF7EE] p-4">
      <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#6B655A]">
        {label}
      </div>
      <div className={`mt-2 font-mono text-3xl font-bold ${good ? "text-[#1b6a38]" : "text-[#C41212]"}`}>
        {value >= 0 ? "+" : ""}
        <AnimatedNumber value={value} decimals={1} />%
      </div>
      <div className={`mt-3 h-1 w-12 ${good ? "bg-[#1b6a38]" : "bg-[#C41212]"}`} />
    </div>
  );
}
