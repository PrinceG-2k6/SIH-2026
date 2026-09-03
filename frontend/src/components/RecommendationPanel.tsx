import type { ComparisonResponse, OptimizeResponse, PredictResponse } from "../types";

interface Props {
  prediction: PredictResponse;
  optimization: OptimizeResponse;
  comparison: ComparisonResponse;
}

export function RecommendationPanel({ prediction, optimization, comparison }: Props) {
  const rec = optimization.recommended;
  const p = rec.parameters;

  return (
    <div className="fade-in space-y-14">
      <section className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="eyebrow text-[var(--accent)]">Detailed setpoints</p>
          <h3 className="serif mt-2 text-3xl font-semibold text-[var(--ink)]">Recommended CSS + SRP</h3>
          <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5">
            <Param k="Steam volume" v={`${p.steam_volume} t`} />
            <Param k="Injection pressure" v={`${p.injection_pressure} bar`} />
            <Param k="Injection duration" v={`${p.injection_duration} h`} />
            <Param k="Soak time" v={`${p.soak_time} h`} />
            <Param k="Stroke length" v={`${p.stroke_length} m`} />
            <Param k="SPM" v={`${p.spm}`} />
            <Param k="VFD" v={`${p.vfd_setting} %`} />
            <Param k="Expected oil" v={`${rec.predicted_oil_rate_bopd} BOPD`} />
          </div>
        </div>
        <div className="plate-inset p-6">
          <p className="eyebrow text-[var(--accent)]">Models in play</p>
          <p className="mt-3 text-sm text-[var(--ink-muted)]">
            <span className="mono text-[var(--ink)]">{prediction.model_production}</span> (production)
            {" · "}
            <span className="mono text-[var(--ink)]">{prediction.model_failure}</span> (failure)
          </p>
          <div className="mt-6 space-y-4">
            {optimization.explanation.map((line) => (
              <p key={line} className="flex gap-3 text-sm leading-relaxed text-[var(--ink-muted)]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                {line}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h3 className="serif text-3xl font-semibold text-[var(--ink)]">Current vs recommended</h3>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">{comparison.summary}</p>
        <div className="mt-8 overflow-x-auto plate">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[rgba(212,160,90,0.04)]">
                <th className="eyebrow px-5 py-4 font-medium">Metric</th>
                <th className="eyebrow px-5 py-4 font-medium">Current</th>
                <th className="eyebrow px-5 py-4 font-medium">Recommended</th>
                <th className="eyebrow px-5 py-4 font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              <CompareRow label="Production" current={comparison.current.production_bopd} rec={comparison.recommended.production_bopd} unit=" BOPD" />
              <CompareRow label="SOR" current={comparison.current.sor} rec={comparison.recommended.sor} invert />
              <CompareRow label="Energy / bbl" current={comparison.current.energy_per_barrel} rec={comparison.recommended.energy_per_barrel} invert />
              <CompareRow label="Failure risk" current={comparison.current.failure_probability * 100} rec={comparison.recommended.failure_probability * 100} invert unit="%" />
              <CompareRow label="Pump η" current={comparison.current.pump_efficiency * 100} rec={comparison.recommended.pump_efficiency * 100} unit="%" />
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Param({ k, v }: { k: string; v: string }) {
  return (
    <div className="border-l border-[var(--accent)] pl-3">
      <div className="eyebrow">{k}</div>
      <div className="mono mt-1 text-[var(--ink)]">{v}</div>
    </div>
  );
}

function CompareRow({
  label,
  current,
  rec,
  invert = false,
  unit = "",
}: {
  label: string;
  current: number;
  rec: number;
  invert?: boolean;
  unit?: string;
}) {
  const delta = rec - current;
  const pct = current !== 0 ? (delta / current) * 100 : 0;
  const improved = invert ? delta < 0 : delta > 0;
  return (
    <tr className="border-b border-[var(--line)]">
      <td className="px-5 py-3.5 text-[var(--ink-muted)]">{label}</td>
      <td className="mono px-5 py-3.5">{current.toFixed(2)}{unit}</td>
      <td className="mono px-5 py-3.5">{rec.toFixed(2)}{unit}</td>
      <td className={`mono px-5 py-3.5 ${improved ? "text-[var(--good)]" : delta === 0 ? "text-[var(--ink-faint)]" : "text-[var(--warn)]"}`}>
        {delta >= 0 ? "+" : ""}
        {delta.toFixed(2)}
        {unit} ({pct >= 0 ? "+" : ""}
        {pct.toFixed(1)}%)
      </td>
    </tr>
  );
}
