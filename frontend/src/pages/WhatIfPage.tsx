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

interface Props {
  wellId: string;
  dashboard: DashboardData | null;
}

const newsprintTipStyle = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #111111",
  boxShadow: "3px 3px 0px #111111",
  borderRadius: 0,
  fontSize: 11,
  fontFamily: "JetBrains Mono, monospace",
  color: "#111111",
};

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
    <div className="fade-in space-y-10">
      {/* Editorial Title Banner */}
      <div className="border-b-2 border-[#111111] pb-4">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#CC0000]">
          SCENARIO SIMULATION ENGINE · BOREHOLE {wellId}
        </span>
        <h2 className="mt-1 font-serif text-4xl sm:text-5xl font-black text-[#111111] uppercase">
          What-If Parametric Ledger
        </h2>
        <p className="mt-2 font-body text-sm text-[#525252] max-w-2xl leading-relaxed">
          Manipulate surface steam generation variables and rod string pumping parameters.
          Evaluate simulated downstream thermodynamic responses prior to field dispatch.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left Column: Sliders (4 cols) */}
        <div className="lg:col-span-5 border-2 border-[#111111] bg-white p-6 hard-shadow">
          <div className="flex items-center justify-between border-b-2 border-[#111111] pb-3">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#111111]">
              LEVER CONSOLE
            </span>
            <span className="bg-[#111111] text-white px-2 py-0.5 font-mono text-[9px] font-bold">
              7 CONTROLS
            </span>
          </div>

          <div className="mt-5 space-y-5">
            <SliderField
              label="Steam Volume"
              unit="t"
              value={params.steam_volume}
              onChange={(v) => update("steam_volume", v)}
              min={200}
              max={800}
            />
            <SliderField
              label="Injection Pressure"
              unit="bar"
              value={params.injection_pressure}
              onChange={(v) => update("injection_pressure", v)}
              min={5}
              max={12}
              step={0.5}
            />
            <SliderField
              label="Injection Duration"
              unit="h"
              value={params.injection_duration}
              onChange={(v) => update("injection_duration", v)}
              min={24}
              max={120}
            />
            <SliderField
              label="Soak Time"
              unit="h"
              value={params.soak_time}
              onChange={(v) => update("soak_time", v)}
              min={24}
              max={120}
            />
            <SliderField
              label="Stroke Length"
              unit="m"
              value={params.stroke_length}
              onChange={(v) => update("stroke_length", v)}
              min={1.5}
              max={3.5}
              step={0.1}
            />
            <SliderField
              label="Cadence (SPM)"
              value={params.spm}
              onChange={(v) => update("spm", v)}
              min={3}
              max={10}
              step={0.5}
            />
            <SliderField
              label="VFD Frequency"
              unit="%"
              value={params.vfd_setting}
              onChange={(v) => update("vfd_setting", v)}
              min={40}
              max={100}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-2 border-t border-[#111111] pt-4">
            <button
              type="button"
              onClick={runSimulate}
              disabled={loading}
              className="btn-primary flex-1 py-3"
            >
              {loading ? "Simulating Model…" : "Execute Simulation"}
            </button>
            {recommended && (
              <button
                type="button"
                onClick={() => setParams(recommended)}
                className="btn-secondary"
              >
                AI Presets
              </button>
            )}
            {base && (
              <button
                type="button"
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
                className="btn-ghost"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Simulation Outcomes (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {error && (
            <div className="border border-[#CC0000] bg-[#FFF5F5] p-4 font-mono text-xs text-[#CC0000]">
              SIMULATION ERROR: {error}
            </div>
          )}

          {!result && !loading && (
            <div className="border border-[#111111] bg-[#F5F5F5] p-12 text-center">
              <span className="font-mono text-xs uppercase tracking-widest text-[#737373]">
                READY FOR PARAMETRIC DISPATCH
              </span>
              <p className="mt-2 font-serif text-xl font-bold text-[#111111]">
                Adjust controls and click "Execute Simulation" to forecast wellbore behavior.
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* Outcome Ledger Cards */}
              <div className="border border-[#111111] bg-white p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#111111] pb-3">
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#CC0000]">
                      PROJECTED RESULT
                    </span>
                    <h3 className="font-serif text-2xl font-bold text-[#111111]">
                      Simulated Operating State
                    </h3>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#111111]">
                    EST. COST: ${result.estimated_operating_cost.toLocaleString()} / CYCLE
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
                  <ResultBox
                    label="Oil Offtake"
                    value={`${result.prediction.predicted_oil_rate_bopd.toFixed(1)} BOPD`}
                    highlight
                  />
                  <ResultBox
                    label="Reservoir Temp"
                    value={`${result.prediction.predicted_reservoir_temperature.toFixed(1)} °C`}
                  />
                  <ResultBox
                    label="SOR"
                    value={result.prediction.predicted_sor.toFixed(2)}
                  />
                  <ResultBox
                    label="Failure Hazard"
                    value={`${(result.prediction.predicted_failure_probability * 100).toFixed(1)}%`}
                    isAlert={result.prediction.predicted_failure_probability > 0.3}
                  />
                </div>

                {/* Warnings */}
                {result.warnings && result.warnings.length > 0 && (
                  <div className="mt-5 border-t border-[#CC0000] pt-3 space-y-1">
                    <span className="font-mono text-[10px] font-bold uppercase text-[#CC0000]">
                      CONSTRAINT VIOLATIONS:
                    </span>
                    {result.warnings.map((w, idx) => (
                      <div key={idx} className="font-mono text-xs text-[#CC0000]">
                        • {w}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 10-Day Cycle Timeline */}
              {timeline && (
                <div className="border border-[#111111] bg-white p-6">
                  <div className="border-b border-[#111111] pb-3 mb-4">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#CC0000]">
                      10-DAY POST-STEAM SOAK CHRONOLOGY
                    </span>
                    <h4 className="font-serif text-xl font-bold text-[#111111]">
                      Transient Production & Thermal Depletion Curve
                    </h4>
                  </div>

                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <AreaChart data={timeline.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="#E5E5E0" strokeDasharray="2 2" vertical={false} />
                        <XAxis
                          dataKey="cycle_day"
                          tick={{ fill: "#525252", fontSize: 10, fontFamily: "JetBrains Mono" }}
                          axisLine={{ stroke: "#111111" }}
                          tickLine={{ stroke: "#111111" }}
                        />
                        <YAxis
                          tick={{ fill: "#525252", fontSize: 10, fontFamily: "JetBrains Mono" }}
                          axisLine={{ stroke: "#111111" }}
                          tickLine={{ stroke: "#111111" }}
                          width={36}
                        />
                        <Tooltip contentStyle={newsprintTipStyle} />
                        <Legend wrapperStyle={{ fontSize: 11, fontFamily: "JetBrains Mono" }} />
                        <Area
                          type="monotone"
                          dataKey="oil_rate_bopd"
                          name="Oil (BOPD)"
                          stroke="#111111"
                          fill="#111111"
                          fillOpacity={0.1}
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="reservoir_temperature"
                          name="Temp (°C)"
                          stroke="#CC0000"
                          fill="#CC0000"
                          fillOpacity={0.08}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SliderField({
  label,
  value,
  unit = "",
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  unit?: string;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div className="font-mono text-xs">
      <div className="flex justify-between items-baseline mb-1">
        <span className="font-semibold text-[#111111]">{label}</span>
        <span className="font-bold text-[#111111]">
          {value}
          {unit && <span className="text-[#737373] font-normal"> {unit}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider"
      />
    </div>
  );
}

function ResultBox({
  label,
  value,
  highlight = false,
  isAlert = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  isAlert?: boolean;
}) {
  return (
    <div
      className={`border border-[#111111] p-3 ${
        highlight ? "bg-[#111111] text-[#F9F9F7]" : "bg-[#F9F9F7] text-[#111111]"
      }`}
    >
      <div className={`text-[9px] uppercase tracking-wider ${highlight ? "text-[#CC0000]" : "text-[#737373]"}`}>
        {label}
      </div>
      <div className={`mt-1 text-base font-bold ${isAlert ? "text-[#CC0000]" : ""}`}>
        {value}
      </div>
    </div>
  );
}
