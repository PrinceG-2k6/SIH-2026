import type { Recommendation } from "../types";

const LABELS: Record<string, { title: string; blurb: string }> = {
  option_a_production: { title: "Production Maximizer", blurb: "Aggressive steam injection for peak crude offtake" },
  option_b_efficiency: { title: "Steam Conservation", blurb: "Minimized SOR to conserve thermodynamic reservoir energy" },
  option_c_reliability: { title: "Equipment Preserver", blurb: "Lowest mechanical stress and eliminated rod float" },
  balanced: { title: "Calibrated Equilibrium", blurb: "Multi-objective weighted Pareto optimum" },
  production_focus: { title: "Production Focus", blurb: "Higher crude offtake" },
  efficiency_focus: { title: "Steam Efficiency", blurb: "Optimized thermal economy" },
  reliability_focus: { title: "Reliability Focus", blurb: "Maximum mechanical life" },
};

interface Props {
  recommended: Recommendation;
  options: Recommendation[];
}

export function ParetoPanel({ recommended, options }: Props) {
  const display = options.length > 0 ? options : [recommended];
  const maxProd = Math.max(...display.map((o) => o.predicted_oil_rate_bopd), 1);
  const maxSor = Math.max(...display.map((o) => o.predicted_sor), 1);

  return (
    <section className="border border-[#111111] bg-[#FAF7EE] p-6 md:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[#111111] pb-4">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#C41212]">
            MULTI-OBJECTIVE OPTIMIZATION
          </span>
          <h3 className="mt-1 font-serif text-3xl font-bold text-[#111111]">
            Pareto Efficiency Alternatives
          </h3>
        </div>
        <p className="font-body text-xs text-[#4D483F] max-w-xl">
          Pareto frontier trade-offs evaluated across the multi-dimensional parameter search space.
          Choose between peak volumetric recovery, thermodynamic steam conservation, or downhole mechanical longevity.
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {display.map((opt, idx) => {
          const meta = LABELS[opt.label] ?? { title: opt.label, blurb: "" };
          const isRec = Math.abs(opt.score - recommended.score) < 1e-6;
          const pct = (opt.predicted_oil_rate_bopd / maxProd) * 100;
          const sorPct = (opt.predicted_sor / maxSor) * 100;
          const r = 34;
          const c = 2 * Math.PI * r;
          const dash = (c * pct) / 100;

          return (
            <div
              key={opt.label}
              className={`border ${
                isRec ? "border-2 border-[#111111] bg-[#EAE2D2]" : "border-[#111111] bg-[#FAF7EE]"
              } p-5 hard-shadow-hover relative`}
            >
              {isRec && (
                <div className="absolute top-0 right-0 bg-[#C41212] text-white font-mono text-[9px] font-bold uppercase px-2 py-0.5">
                  RECOMMENDED
                </div>
              )}

              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#6B655A]">
                    PORTFOLIO {String.fromCharCode(65 + idx)}
                  </div>
                  <h4 className="font-serif text-lg font-bold text-[#111111] mt-0.5">
                    {meta.title}
                  </h4>
                  <p className="mt-1 font-body text-xs text-[#4D483F] leading-tight">
                    {meta.blurb}
                  </p>
                </div>

                {/* Circular Meter */}
                <svg width="76" height="76" viewBox="0 0 80 80" className="gauge-ring shrink-0">
                  <circle cx="40" cy="40" r={r} fill="none" stroke="#D8D0BF" strokeWidth="5" />
                  <circle
                    cx="40"
                    cy="40"
                    r={r}
                    fill="none"
                    stroke={isRec ? "#C41212" : "#111111"}
                    strokeWidth="5"
                    strokeLinecap="square"
                    strokeDasharray={`${dash} ${c - dash}`}
                  />
                  <text
                    x="40"
                    y="42"
                    textAnchor="middle"
                    fill="#111111"
                    fontFamily="JetBrains Mono"
                    fontSize="11"
                    fontWeight="bold"
                    transform="rotate(90 40 40)"
                  >
                    {opt.predicted_oil_rate_bopd.toFixed(0)}
                  </text>
                  <text
                    x="40"
                    y="53"
                    textAnchor="middle"
                    fill="#6B655A"
                    fontFamily="JetBrains Mono"
                    fontSize="7"
                    transform="rotate(90 40 40)"
                  >
                    BOPD
                  </text>
                </svg>
              </div>

              {/* Parameter Metrics */}
              <div className="mt-5 border-t border-[#D8D0BF] pt-3 font-mono text-xs space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-[#6B655A]">Steam Consumption (SOR):</span>
                    <span className="font-bold text-[#111111]">{opt.predicted_sor.toFixed(2)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#D8D0BF]">
                    <div
                      className="h-full bg-[#111111]"
                      style={{ width: `${Math.min(100, sorPct)}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between text-[11px] pt-1">
                  <span className="text-[#6B655A]">Failure Hazard:</span>
                  <span
                    className={`font-bold ${
                      opt.predicted_failure_probability > 0.25 ? "text-[#C41212]" : "text-[#1b6a38]"
                    }`}
                  >
                    {(opt.predicted_failure_probability * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="flex justify-between text-[11px]">
                  <span className="text-[#6B655A]">Kinematic Schedule:</span>
                  <span className="text-[#111111]">
                    {opt.parameters.spm} SPM · {opt.parameters.stroke_length} m
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
