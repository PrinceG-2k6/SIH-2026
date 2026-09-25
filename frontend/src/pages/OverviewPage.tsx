import type { DashboardData } from "../types";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { BenefitSummary } from "../components/BenefitSummary";
import { ExplainabilityPanel } from "../components/ExplainabilityPanel";
import { Gauge } from "../components/Gauge";
import { LiveStreamBar } from "../components/LiveStreamBar";
import { ParetoPanel } from "../components/ParetoPanel";
import { RecommendationPanel } from "../components/RecommendationPanel";
import { Sparkline } from "../components/Sparkline";
import { TrendCharts } from "../components/TrendCharts";

interface Props {
  data: DashboardData;
  wellId: string;
}

export function OverviewPage({ data, wellId }: Props) {
  const state = data.current_state;
  const pred = data.prediction;
  const cmp = data.comparison;
  const pareto = data.optimization.pareto_options?.length
    ? data.optimization.pareto_options
    : data.optimization.alternatives;

  const oilSeries = data.history.map((h) => h.oil_rate_bopd);
  const tempSeries = data.history.map((h) => h.reservoir_temperature);
  const failSeries = data.history.map((h) => h.failure_probability);
  const prodDelta = cmp.production_change_pct;

  const story =
    state.reservoir_temperature < 52 && state.oil_viscosity > 500
      ? "Cool subterranean reservoir temperatures and elevated bitumen viscosity demand immediate synchronized CSS thermal injection and SRP mechanical stroke tuning."
      : "Active CSS thermal soak and production phase. The autonomous optimizer dynamically balances volumetric crude recovery against steam-oil ratio (SOR) and rod floating hazards.";

  return (
    <div className="fade-in space-y-12">
      {/* Live Stream Bar */}
      <LiveStreamBar wellId={wellId} />

      {/* Hero Broadsheet Banner */}
      <section className="border-b-4 border-[#111111] pb-8">
        <div className="flex flex-wrap items-center justify-between border-b border-[#111111] pb-2 font-mono text-[10px] uppercase tracking-widest text-[#6B655A]">
          <span className="font-bold text-[#C41212]">OPERATIONAL DISPATCH · BOREHOLE {wellId}</span>
          <span>CSS STIMULATION CYCLE: #{state.css_cycle_id}</span>
          <span>FORMATION: JODHPUR SANDSTONE</span>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-12 items-start">
          {/* Main Production Metric & Lead Story (7 cols) */}
          <div className="lg:col-span-7 space-y-4 lg:border-r border-[#111111] lg:pr-8">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#4D483F]">
              CURRENT MEASURED OFFTAKE
            </span>

            <div className="flex items-baseline">
              <span className="font-serif text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight text-[#111111] leading-none">
                <AnimatedNumber value={state.oil_rate_bopd} decimals={1} />
              </span>
              <span className="ml-3 font-mono text-xl sm:text-2xl font-bold text-[#6B655A]">
                BOPD
              </span>
            </div>

            <div className="h-[2px] w-24 bg-[#C41212]" />

            <p className="font-body text-sm sm:text-base text-[#111111] leading-relaxed max-w-2xl text-justify">
              {story}
            </p>

            {/* Quick Index Metrics */}
            <div className="pt-4 flex flex-wrap items-center gap-8 border-t border-[#D8D0BF]">
              <div className="border border-[#111111] bg-[#FAF7EE] p-3 min-w-[140px]">
                <div className="font-mono text-[9px] uppercase tracking-wider text-[#6B655A]">
                  90-Day Trend
                </div>
                <div className="mt-1">
                  <Sparkline values={oilSeries} width={130} height={32} />
                </div>
              </div>

              <div className="border border-[#111111] bg-[#FAF7EE] p-3 min-w-[140px]">
                <div className="font-mono text-[9px] uppercase tracking-wider text-[#6B655A]">
                  AI vs Current
                </div>
                <div
                  className={`mt-1 font-mono text-xl font-bold ${
                    prodDelta >= 0 ? "text-[#1b6a38]" : "text-[#a65800]"
                  }`}
                >
                  {prodDelta >= 0 ? "+" : ""}
                  {prodDelta.toFixed(1)}%
                </div>
              </div>

              <div className="border border-[#111111] bg-[#FAF7EE] p-3 min-w-[140px]">
                <div className="font-mono text-[9px] uppercase tracking-wider text-[#6B655A]">
                  SOR Ratio
                </div>
                <div className="mt-1 font-mono text-xl font-bold text-[#111111]">
                  {state.sor.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Instrument Board with Gauges (5 cols) */}
          <div className="lg:col-span-5 border border-[#111111] bg-[#EAE2D2] p-5 hard-shadow">
            <div className="border-b border-[#111111] pb-2 flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#111111]">
                INSTRUMENT TELEMETRY CONSOLE
              </span>
              <span className="font-mono text-[9px] text-[#6B655A]">REAL-TIME</span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <Gauge
                value={state.reservoir_temperature}
                max={80}
                label="Thermal Core"
                unit="°C"
                tone="info"
                size={95}
              />
              <Gauge
                value={Math.min(state.oil_viscosity, 1200)}
                max={1200}
                label="Viscosity"
                unit="cP"
                tone="warn"
                size={95}
              />
              <Gauge
                value={state.failure_probability * 100}
                max={100}
                label="Hazard Risk"
                unit="%"
                tone={state.failure_probability > 0.3 ? "bad" : "good"}
                size={95}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#111111] pt-3">
              <div className="border border-[#111111] bg-[#FAF7EE] p-2">
                <div className="font-mono text-[9px] uppercase tracking-wider text-[#6B655A] mb-1">
                  Temp History
                </div>
                <Sparkline values={tempSeries} color="#111111" width={110} height={24} />
              </div>
              <div className="border border-[#111111] bg-[#FAF7EE] p-2">
                <div className="font-mono text-[9px] uppercase tracking-wider text-[#6B655A] mb-1">
                  Hazard History
                </div>
                <Sparkline values={failSeries} color="#C41212" width={110} height={24} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Telemetry Rail — Newspaper Columns with Collapsed Borders */}
      <section className="border border-[#111111] bg-[#FAF7EE]">
        <div className="border-b border-[#111111] bg-[#111111] text-[#FAF7EE] px-4 py-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest">
          <span>FIELD TELEMETRY LEDGER</span>
          <span>CALIBRATED TO OIL SPECIFICATIONS</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 divide-x divide-y sm:divide-y-0 divide-[#111111]">
          <VitalBox label="SOR" value={state.sor} decimals={2} />
          <VitalBox label="Energy/Bbl" value={state.energy_per_barrel} unit="kWh" decimals={2} />
          <VitalBox label="Pump η" value={state.pump_efficiency * 100} unit="%" decimals={1} />
          <VitalBox label="Rod Load" value={state.rod_load} unit="kN" decimals={1} />
          <VitalBox label="Cadence" value={state.spm} unit="SPM" decimals={1} />
          <VitalBox label="Stroke" value={state.stroke_length} unit="m" decimals={2} />
          <VitalBox label="Steam Vol." value={state.steam_volume} unit="t" decimals={0} />
          <VitalBox label="VFD Freq." value={state.vfd_setting} unit="%" decimals={0} />
        </div>
      </section>

      {/* Active Alerts Notice */}
      {data.alerts?.alert_count > 0 && (
        <div className="border-2 border-[#C41212] bg-[#F7EBEB] p-4 flex items-center justify-between font-mono text-xs text-[#C41212]">
          <div className="flex items-center space-x-2">
            <span className="bg-[#C41212] text-white px-2 py-0.5 font-bold uppercase text-[10px]">
              ACTION REQUIRED
            </span>
            <span className="font-bold">
              {data.alerts.alert_count} active anomaly condition(s) detected on {wellId}.
            </span>
          </div>
          <span className="text-[#111111] underline font-semibold">
            Review § 05 Risk & Alerts board
          </span>
        </div>
      )}

      {/* Field History Chronology */}
      <section>
        <div className="border-b-2 border-[#111111] pb-2 mb-6">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#C41212]">
            HISTORICAL CHRONOLOGY
          </span>
          <h3 className="font-serif text-3xl font-black text-[#111111] uppercase">
            Reservoir & Production Performance Records
          </h3>
        </div>
        <TrendCharts history={data.history} />
      </section>

      {/* Forecast Bridge */}
      <section className="border border-[#111111] bg-[#FAF7EE] p-6 md:p-8">
        <div className="grid gap-8 lg:grid-cols-2 items-start">
          <div className="space-y-3 lg:border-r border-[#111111] lg:pr-8">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#C41212]">
              BASELINE PROJECTION
            </span>
            <h4 className="font-serif text-2xl font-bold text-[#111111]">
              Un-optimized Extrapolation
            </h4>
            <div className="flex items-baseline font-mono">
              <span className="font-serif text-5xl font-bold text-[#111111]">
                <AnimatedNumber value={pred.predicted_oil_rate_bopd} decimals={1} />
              </span>
              <span className="ml-2 text-sm text-[#6B655A]">BOPD</span>
            </div>
            <p className="font-body text-xs text-[#4D483F] leading-relaxed">
              If operating levers remain unaltered: temperature projects to{" "}
              <span className="font-mono font-bold text-[#111111]">{pred.predicted_reservoir_temperature}°C</span>,
              viscosity at <span className="font-mono font-bold text-[#111111]">{pred.predicted_oil_viscosity.toFixed(0)} cP</span>,
              and steam efficiency at <span className="font-mono font-bold text-[#111111]">{pred.predicted_sor} SOR</span>.
            </p>
          </div>

          <div className="space-y-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#1b6a38]">
              OPTIMAL PREDICTED SETPOINTS
            </span>
            <h4 className="font-serif text-2xl font-bold text-[#111111]">
              Under Synchronous AI Governance
            </h4>
            <p className="font-body text-xs text-[#4D483F] leading-relaxed">
              With Steam at <span className="font-mono font-bold text-[#111111]">{data.optimization.recommended.parameters.steam_volume} t</span>,
              cadence at <span className="font-mono font-bold text-[#111111]">{data.optimization.recommended.parameters.spm} SPM</span>,
              and stroke at <span className="font-mono font-bold text-[#111111]">{data.optimization.recommended.parameters.stroke_length} m</span>:
            </p>
            <div className="border border-[#111111] bg-[#EAE2D2] p-4 font-mono text-xs space-y-1">
              <div className="flex justify-between">
                <span>Net Offtake Shift:</span>
                <span className={prodDelta >= 0 ? "font-bold text-[#1b6a38]" : "font-bold text-[#a65800]"}>
                  {prodDelta >= 0 ? "+" : ""}{prodDelta.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>SOR Consumption Change:</span>
                <span className="font-bold text-[#111111]">
                  {cmp.sor_change_pct >= 0 ? "+" : ""}{cmp.sor_change_pct.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Failure Risk Reduction:</span>
                <span className="font-bold text-[#1b6a38]">
                  {cmp.failure_risk_change_pct.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sub-panels */}
      <ParetoPanel recommended={data.optimization.recommended} options={pareto} />
      <BenefitSummary optimization={data.optimization} comparison={data.comparison} />
      <RecommendationPanel
        prediction={data.prediction}
        optimization={data.optimization}
        comparison={data.comparison}
      />
      <ExplainabilityPanel wellId={wellId} />
    </div>
  );
}

function VitalBox({
  label,
  value,
  unit,
  decimals = 1,
}: {
  label: string;
  value: number;
  unit?: string;
  decimals?: number;
}) {
  return (
    <div className="p-4 font-mono text-center">
      <div className="text-[9px] uppercase tracking-wider text-[#6B655A] font-bold">{label}</div>
      <div className="mt-1 text-lg font-bold text-[#111111]">
        <AnimatedNumber value={value} decimals={decimals} />
        {unit && <span className="ml-0.5 text-[10px] text-[#6B655A]"> {unit}</span>}
      </div>
    </div>
  );
}
