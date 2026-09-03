import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { simulateScenario, simulateTimeline } from "../services/api";
import type { DashboardData, OperatingParameters, SimulateResponse, TimelineResponse } from "../types";
import { DEFAULT_PARAMS } from "../types";
import { Gauge } from "../components/Gauge";

interface Props {
  wellId: string;
  dashboard: DashboardData | null;
}

export function WhatIfPage({ wellId, dashboard }: Props) {
  const base = dashboard?.current_state;
  const recommended = dashboard?.optimization.recommended.parameters;
  const [params, setParams] = useState<OperatingParameters>(DEFAULT_PARAMS);
  const [result, setResult] = useState<SimulateResponse | null>(null);
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (base) {
      setParams({
        steam_volume: base.steam_volume,
        injection_pressure: base.injection_pressure,
        injection_duration: base.injection_duration,
        soak_time: base.soak_time,
        stroke_length: base.stroke_length,
        spm: base.spm,
        vfd_setting: base.vfd_setting,
      });
    }
  }, [base]);

  const update = (key: keyof OperatingParameters, value: number) => {
    setParams((p) => ({ ...p, [key]: value }));
  };

  const runSimulate = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sim, tl] = await Promise.all([
        simulateScenario(wellId, params),
        simulateTimeline(wellId, params, 10),
      ]);
      setResult(sim);
      setTimeline(tl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <span className="tick-mark" />
          <p className="eyebrow text-[var(--accent)]">Scenario engine</p>
        </div>
        <h2 className="serif mt-2 text-4xl font-semibold text-[var(--ink)]">What-if</h2>
        <p className="mt-2 max-w-xl text-sm text-[var(--ink-muted)]">
          Tune CSS and SRP levers, then simulate outcomes against current operation.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <section className="plate p-5">
          <p className="eyebrow text-[var(--accent)]">Controls</p>
          <div className="mt-5 space-y-5">
            <SliderField label="Steam volume" unit="t" value={params.steam_volume} onChange={(v) => update("steam_volume", v)} min={200} max={800} />
            <SliderField label="Injection pressure" unit="bar" value={params.injection_pressure} onChange={(v) => update("injection_pressure", v)} min={5} max={12} step={0.5} />
            <SliderField label="Injection duration" unit="h" value={params.injection_duration} onChange={(v) => update("injection_duration", v)} min={24} max={120} />
            <SliderField label="Soak time" unit="h" value={params.soak_time} onChange={(v) => update("soak_time", v)} min={24} max={120} />
            <SliderField label="Stroke length" unit="m" value={params.stroke_length} onChange={(v) => update("stroke_length", v)} min={1.5} max={3.5} step={0.1} />
            <SliderField label="SPM" value={params.spm} onChange={(v) => update("spm", v)} min={3} max={10} step={0.5} />
            <SliderField label="VFD" unit="%" value={params.vfd_setting} onChange={(v) => update("vfd_setting", v)} min={40} max={100} />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={runSimulate} disabled={loading} className="btn-primary">
              {loading ? "Simulating…" : "Simulate"}
            </button>
            {recommended && (
              <button type="button" onClick={() => setParams(recommended)} className="btn-ghost">
                AI setpoints
              </button>
            )}
            {base && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() =>
                  setParams({
                    steam_volume: base.steam_volume,
                    injection_pressure: base.injection_pressure,
                    injection_duration: base.injection_duration,
                    soak_time: base.soak_time,
                    stroke_length: base.stroke_length,
                    spm: base.spm,
                    vfd_setting: base.vfd_setting,
                  })
                }
              >
                Reset
              </button>
            )}
          </div>
        </section>

        <section className="plate p-6">
          {error && <p className="mb-3 text-sm text-[var(--bad)]">{error}</p>}
          {!result && !loading && (
            <div className="flex h-48 items-center justify-center">
              <p className="mono text-sm text-[var(--ink-faint)]">Run Simulate to evaluate this operating point</p>
            </div>
          )}
          {loading && <p className="mono text-sm text-[var(--ink-muted)]">Evaluating prediction models…</p>}
          {result && (
            <>
              <p className="eyebrow text-[var(--accent)]">Simulation results</p>
              <div className="mt-6 flex flex-wrap justify-around gap-4">
                <Gauge value={result.prediction.predicted_oil_rate_bopd} max={80} label="Production" unit="BOPD" tone="accent" />
                <Gauge value={result.prediction.predicted_reservoir_temperature} max={80} label="Temp" unit="°C" tone="info" />
                <Gauge value={result.prediction.predicted_sor} max={10} label="SOR" />
                <Gauge
                  value={result.prediction.predicted_failure_probability * 100}
                  max={100}
                  label="Failure"
                  unit="%"
                  tone={result.prediction.predicted_failure_probability > 0.3 ? "bad" : "good"}
                />
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4 border-t border-[var(--line)] pt-5 md:grid-cols-4">
                <Stat label="Est. cost" value={`${result.estimated_operating_cost}`} unit="₹" />
                <Stat label="Prod Δ" value={`${result.comparison_vs_current.production_change_pct}`} unit="%" />
                <Stat label="SOR Δ" value={`${result.comparison_vs_current.sor_change}`} />
                <Stat label="Energy/bbl" value={`${result.prediction.predicted_energy_per_barrel}`} />
              </div>
              {result.warnings.length > 0 && (
                <ul className="mt-5 space-y-2 border-t border-[var(--line)] pt-4 text-xs text-[var(--warn)]">
                  {result.warnings.map((w) => (
                    <li key={w}>— {w}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>

      {timeline && (
        <section className="plate p-6">
          <p className="eyebrow text-[var(--accent)]">CSS cycle timeline</p>
          <div className="mt-4 h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={timeline.points}>
                <defs>
                  <linearGradient id="tlOil" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d4a05a" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#d4a05a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(232,226,214,0.05)" vertical={false} />
                <XAxis dataKey="cycle_day" tick={{ fill: "#6b665c", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b665c", fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ background: "#08090b", border: "1px solid rgba(212,160,90,0.3)", borderRadius: 0, fontFamily: "JetBrains Mono" }} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#9a9488" }} />
                <Area type="monotone" dataKey="oil_rate_bopd" stroke="#d4a05a" fill="url(#tlOil)" name="Oil BOPD" strokeWidth={2} />
                <Area type="monotone" dataKey="reservoir_temperature" stroke="#7a9bb8" fill="transparent" name="Temp °C" strokeWidth={1.75} />
                <Area type="monotone" dataKey="failure_probability" stroke="#c45c4a" fill="transparent" name="Failure" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}

function SliderField({
  label,
  unit,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  unit?: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex justify-between gap-2">
        <span className="eyebrow">{label}</span>
        <span className="mono text-xs text-[var(--accent)]">
          {value}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <input
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className="mono mt-1 text-[var(--ink)]">
        {value}
        {unit && <span className="ml-1 text-[10px] text-[var(--ink-faint)]">{unit}</span>}
      </div>
    </div>
  );
}
