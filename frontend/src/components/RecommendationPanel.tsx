import type { ComparisonResponse, OptimizeResponse, PredictResponse } from "../types";

interface Props {
  prediction: PredictResponse;
  optimization: OptimizeResponse;
  comparison: ComparisonResponse;
}

export function RecommendationPanel({ prediction, optimization, comparison }: Props) {
  const rec = optimization.recommended;
  const p = rec.parameters;

  const tableRows = [
    { metric: "Oil Offtake", cur: `${comparison.current.production_bopd.toFixed(1)} BOPD`, rec: `${comparison.recommended.production_bopd.toFixed(1)} BOPD`, chg: comparison.production_change_pct, isGoodWhenPos: true },
    { metric: "Steam-to-Oil (SOR)", cur: comparison.current.sor.toFixed(2), rec: comparison.recommended.sor.toFixed(2), chg: comparison.sor_change_pct, isGoodWhenPos: false },
    { metric: "Failure Probability", cur: `${(comparison.current.failure_probability * 100).toFixed(1)}%`, rec: `${(comparison.recommended.failure_probability * 100).toFixed(1)}%`, chg: comparison.failure_risk_change_pct, isGoodWhenPos: false },
    { metric: "Energy / Barrel", cur: `${comparison.current.energy_per_barrel.toFixed(1)} kWh`, rec: `${comparison.recommended.energy_per_barrel.toFixed(1)} kWh` },
    { metric: "Reservoir Temperature", cur: `${comparison.current.reservoir_temperature.toFixed(1)} °C`, rec: `${comparison.recommended.reservoir_temperature.toFixed(1)} °C` },
    { metric: "Oil Viscosity", cur: `${comparison.current.oil_viscosity.toFixed(0)} cP`, rec: `${comparison.recommended.oil_viscosity.toFixed(0)} cP` },
    { metric: "Pump Efficiency", cur: `${(comparison.current.pump_efficiency * 100).toFixed(1)}%`, rec: `${(comparison.recommended.pump_efficiency * 100).toFixed(1)}%` },
    { metric: "Peak Rod Load", cur: `${comparison.current.rod_load.toFixed(1)} kN`, rec: `${comparison.recommended.rod_load.toFixed(1)} kN` },
  ];

  return (
    <div className="space-y-12">
      {/* Setpoints & Models In Play */}
      <section className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left Column: Recommended Setpoints */}
        <div className="lg:col-span-7 border-2 border-[#111111] bg-white p-6 hard-shadow">
          <div className="flex items-center justify-between border-b-2 border-[#111111] pb-3">
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#CC0000]">
                RECOMMENDED OPERATING SETPOINTS
              </span>
              <h3 className="font-serif text-2xl font-bold text-[#111111]">
                Optimal CSS & SRP Schedule
              </h3>
            </div>
            <span className="bg-[#111111] text-white px-2 py-1 font-mono text-[10px] font-bold uppercase">
              SCORE: {rec.score.toFixed(3)}
            </span>
          </div>

          {/* Grid of parameters with collapsed borders */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 border-l border-t border-[#111111]">
            <ParamBox label="Steam Volume" value={`${p.steam_volume} t`} />
            <ParamBox label="Injection Press." value={`${p.injection_pressure} bar`} />
            <ParamBox label="Injection Duration" value={`${p.injection_duration} h`} />
            <ParamBox label="Soak Period" value={`${p.soak_time} h`} />
            <ParamBox label="Stroke Length" value={`${p.stroke_length} m`} />
            <ParamBox label="Pumping Cadence" value={`${p.spm} SPM`} />
            <ParamBox label="VFD Frequency" value={`${p.vfd_setting} %`} />
            <ParamBox label="Target Oil Rate" value={`${rec.predicted_oil_rate_bopd.toFixed(1)} BOPD`} highlight />
          </div>
        </div>

        {/* Right Column: AI Model Rationale */}
        <div className="lg:col-span-5 border border-[#111111] bg-[#F5F5F5] p-6">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#CC0000]">
            DECISION RATIONALE
          </span>
          <h4 className="mt-1 font-serif text-xl font-bold text-[#111111]">
            Surrogate Models in Synthesis
          </h4>
          <p className="mt-2 font-mono text-xs text-[#525252]">
            Production Engine: <span className="font-bold text-[#111111]">{prediction.model_production}</span><br />
            Failure Risk Classifier: <span className="font-bold text-[#111111]">{prediction.model_failure}</span>
          </p>

          <div className="mt-4 border-t border-[#111111] pt-3 space-y-2.5">
            {optimization.explanation.map((line, idx) => (
              <div key={idx} className="flex items-start gap-2.5 font-body text-xs text-[#111111] leading-relaxed">
                <span className="font-mono font-bold text-[#CC0000] mt-0.5">§{idx + 1}</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Ledger */}
      <section className="border border-[#111111] bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[#111111] pb-3">
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#CC0000]">
              VERIFICATION LEDGER
            </span>
            <h3 className="font-serif text-2xl font-bold text-[#111111]">
              Current Baseline vs AI Recommended Equilibrium
            </h3>
          </div>
          <p className="font-mono text-xs text-[#525252] max-w-md">
            {comparison.summary}
          </p>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left font-mono text-xs border border-[#111111]">
            <thead>
              <tr className="border-b border-[#111111] bg-[#111111] text-[#F9F9F7]">
                <th className="px-4 py-3 uppercase tracking-wider font-bold">Operational Metric</th>
                <th className="px-4 py-3 uppercase tracking-wider font-bold">Current Point</th>
                <th className="px-4 py-3 uppercase tracking-wider font-bold">Recommended Point</th>
                <th className="px-4 py-3 uppercase tracking-wider font-bold">Net Deviation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E0]">
              {tableRows.map((row, i) => {
                const isEven = i % 2 === 0;
                let chgColor = "text-[#111111]";
                if (row.chg !== undefined) {
                  const isGood = row.isGoodWhenPos ? row.chg > 0 : row.chg < 0;
                  chgColor = isGood ? "text-[#1b6a38] font-bold" : "text-[#CC0000] font-bold";
                }

                return (
                  <tr key={row.metric} className={isEven ? "bg-white" : "bg-[#F9F9F7]"}>
                    <td className="px-4 py-3 font-semibold text-[#111111] border-r border-[#E5E5E0]">
                      {row.metric}
                    </td>
                    <td className="px-4 py-3 text-[#525252] border-r border-[#E5E5E0]">
                      {row.cur}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#111111] border-r border-[#E5E5E0]">
                      {row.rec}
                    </td>
                    <td className={`px-4 py-3 ${chgColor}`}>
                      {row.chg !== undefined ? (
                        <>
                          {row.chg >= 0 ? "+" : ""}
                          {row.chg.toFixed(1)}%
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ParamBox({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`border-r border-b border-[#111111] p-3 font-mono ${
        highlight ? "bg-[#111111] text-[#F9F9F7]" : "bg-white text-[#111111]"
      }`}
    >
      <div className={`text-[9px] uppercase tracking-wider ${highlight ? "text-[#CC0000]" : "text-[#737373]"}`}>
        {label}
      </div>
      <div className="mt-1 text-sm font-bold tracking-tight">
        {value}
      </div>
    </div>
  );
}
