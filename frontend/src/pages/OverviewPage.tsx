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
      ? "Cool reservoir, elevated viscosity — CSS heat and SRP tuning must move together."
      : "Producing CSS cycle. The optimizer balances offtake against SOR and rod risk.";

  return (
    <div className="fade-in space-y-14 pb-12">
      <LiveStreamBar wellId={wellId} />

      {/* Hero composition */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-8 top-0 h-full w-1/2 opacity-[0.07]">
          <svg viewBox="0 0 200 200" className="h-full w-full" preserveAspectRatio="xMaxYMid slice">
            <circle cx="140" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="140" cy="80" r="48" fill="none" stroke="currentColor" strokeWidth="0.5" />
            <path d="M140 10 L140 150 M70 80 L210 80" stroke="currentColor" strokeWidth="0.4" />
          </svg>
        </div>

        <div className="flex items-center gap-3">
          <span className="tick-mark" />
          <p className="eyebrow text-[var(--accent)]">
            Baghewala · {wellId} · CSS cycle {state.css_cycle_id}
          </p>
        </div>

        <div className="mt-6 grid items-end gap-12 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <p className="serif text-[clamp(3.5rem,8vw,5.5rem)] font-semibold leading-[0.92] tracking-tight text-[var(--ink)]">
              <AnimatedNumber value={state.oil_rate_bopd} decimals={1} />
              <span className="ml-3 align-baseline font-sans text-xl font-normal tracking-normal text-[var(--ink-faint)]">
                BOPD
              </span>
            </p>
            <div className="hairline mt-5 max-w-md" />
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-[var(--ink-muted)]">{story}</p>
            <div className="mt-8 flex flex-wrap items-end gap-10">
              <div>
                <p className="eyebrow mb-2">90-day offtake</p>
                <Sparkline values={oilSeries} width={180} height={40} />
              </div>
              <div>
                <p className="eyebrow">AI vs current</p>
                <p className={`mono mt-1 text-2xl ${prodDelta >= 0 ? "text-[var(--good)]" : "text-[var(--warn)]"}`}>
                  {prodDelta >= 0 ? "+" : ""}
                  {prodDelta.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="plate diagonal-cut p-6">
            <p className="eyebrow text-[var(--accent)]">Instrument board</p>
            <div className="mt-4 flex flex-wrap justify-around gap-2">
              <Gauge
                value={state.reservoir_temperature}
                max={80}
                label="Temp"
                unit="°C"
                tone="info"
                size={100}
              />
              <Gauge
                value={Math.min(state.oil_viscosity, 1200)}
                max={1200}
                label="Viscosity"
                unit="cP"
                tone="accent"
                size={100}
              />
              <Gauge
                value={state.failure_probability * 100}
                max={100}
                label="Fail risk"
                unit="%"
                tone={state.failure_probability > 0.3 ? "bad" : "good"}
                size={100}
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-4 border-t border-[var(--line)] pt-4">
              <MiniSpark label="Temp trail" values={tempSeries} color="var(--info)" />
              <MiniSpark label="Risk trail" values={failSeries} color="var(--bad)" />
            </div>
          </div>
        </div>
      </section>

      {/* Telemetry rail — continuous, not cards */}
      <section className="relative">
        <div className="absolute left-0 top-0 h-full w-px bg-[var(--accent)] opacity-40" />
        <div className="flex flex-wrap gap-x-12 gap-y-7 border-y border-[var(--line)] py-7 pl-5">
          <Vital label="SOR" value={state.sor} decimals={2} />
          <Vital label="Energy / bbl" value={state.energy_per_barrel} decimals={2} />
          <Vital label="Pump η" value={state.pump_efficiency * 100} unit="%" decimals={1} />
          <Vital label="Rod load" value={state.rod_load} unit="kN" decimals={1} />
          <Vital label="SPM" value={state.spm} decimals={1} />
          <Vital label="Stroke" value={state.stroke_length} unit="m" decimals={2} />
          <Vital label="Steam" value={state.steam_volume} unit="t" decimals={0} />
          <Vital label="VFD" value={state.vfd_setting} unit="%" decimals={0} />
        </div>
      </section>

      {data.alerts?.alert_count > 0 && (
        <p className="text-sm">
          <span className="text-[var(--bad)]">{data.alerts.alert_count} active alerts</span>
          <span className="text-[var(--ink-faint)]"> — open Alerts for severity detail</span>
        </p>
      )}

      <p className="mono text-[10px] tracking-wide text-[var(--ink-faint)]">{data.demo_disclaimer}</p>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-[var(--accent)]">Chronology</p>
            <h3 className="serif mt-1 text-3xl font-semibold text-[var(--ink)]">Field history</h3>
          </div>
        </div>
        <div className="mt-8 plate p-5 md:p-7">
          <TrendCharts history={data.history} />
        </div>
      </section>

      {/* Forecast bridge — typographic, not boxes */}
      <section className="grid gap-10 border-t border-[var(--line)] pt-12 lg:grid-cols-2">
        <div>
          <p className="eyebrow text-[var(--accent)]">Model forecast</p>
          <p className="serif mt-3 text-5xl font-semibold leading-none text-[var(--ink)]">
            <AnimatedNumber value={pred.predicted_oil_rate_bopd} decimals={1} />
            <span className="ml-2 font-sans text-base font-normal text-[var(--ink-faint)]">BOPD</span>
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[var(--ink-muted)]">
            At current settings: temp{" "}
            <span className="mono text-[var(--ink)]">{pred.predicted_reservoir_temperature}°C</span>
            , viscosity{" "}
            <span className="mono text-[var(--ink)]">{pred.predicted_oil_viscosity.toFixed(0)} cP</span>
            , SOR <span className="mono text-[var(--ink)]">{pred.predicted_sor}</span>.
          </p>
        </div>
        <div className="plate-inset p-6">
          <p className="eyebrow text-[var(--accent)]">If AI setpoints applied</p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--ink-muted)]">
            Steam{" "}
            <span className="mono text-[var(--ink)]">{data.optimization.recommended.parameters.steam_volume} t</span>
            {" · "}
            SPM <span className="mono text-[var(--ink)]">{data.optimization.recommended.parameters.spm}</span>
            {" · "}
            stroke{" "}
            <span className="mono text-[var(--ink)]">
              {data.optimization.recommended.parameters.stroke_length} m
            </span>
            . Production{" "}
            <span className={prodDelta >= 0 ? "text-[var(--good)]" : "text-[var(--warn)]"}>
              {prodDelta >= 0 ? "+" : ""}
              {prodDelta.toFixed(1)}%
            </span>
            , SOR{" "}
            <span className="mono">
              {cmp.sor_change_pct >= 0 ? "+" : ""}
              {cmp.sor_change_pct.toFixed(1)}%
            </span>
            .
          </p>
          <ul className="mt-5 space-y-3">
            {data.optimization.explanation.slice(0, 3).map((line) => (
              <li key={line} className="flex gap-3 text-sm text-[var(--ink-muted)]">
                <span className="mt-2 h-px w-4 shrink-0 bg-[var(--accent)]" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

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

function MiniSpark({ label, values, color }: { label: string; values: number[]; color: string }) {
  return (
    <div>
      <p className="eyebrow mb-1">{label}</p>
      <Sparkline values={values} color={color} width={100} height={28} />
    </div>
  );
}

function Vital({
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
    <div>
      <div className="eyebrow">{label}</div>
      <div className="mono mt-1.5 text-xl text-[var(--ink)]">
        <AnimatedNumber value={value} decimals={decimals} />
        {unit && <span className="ml-1 text-[10px] text-[var(--ink-faint)]">{unit}</span>}
      </div>
    </div>
  );
}
