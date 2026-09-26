import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Legend,
} from "recharts";
import type { OperatingParameters, ThermalCouplingResponse } from "../types";
import { getThermalCoupling, simulateThermalCoupling } from "../services/api";

interface ThermalCouplingPanelProps {
  wellId: string;
  parameters?: OperatingParameters;
  className?: string;
}

export const ThermalCouplingPanel: React.FC<ThermalCouplingPanelProps> = ({
  wellId,
  parameters,
  className = "",
}) => {
  const [data, setData] = useState<ThermalCouplingResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cycleDays, setCycleDays] = useState<number>(45);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchData = async () => {
      try {
        let res: ThermalCouplingResponse;
        if (parameters) {
          res = await simulateThermalCoupling(wellId, parameters, cycleDays);
        } else {
          res = await getThermalCoupling(wellId, cycleDays);
        }
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load thermal coupling data");
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [wellId, parameters, cycleDays]);

  if (loading && !data) {
    return (
      <div className={`plate p-6 rounded-xl bg-slate-900/80 border border-slate-800 text-center ${className}`}>
        <div className="animate-spin inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mb-3"></div>
        <p className="text-slate-400 text-sm font-mono">Simulating CSS Thermal Dissipation & Viscosity Coupling...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`plate p-6 rounded-xl bg-slate-900/80 border border-red-500/30 text-red-400 text-sm font-mono ${className}`}>
        {error || "Unable to display Thermal Coupling data"}
      </div>
    );
  }

  const currentPoint =
    data.timeline.find((pt) => pt.cycle_day === data.current_cycle_day) || data.timeline[0];

  return (
    <div className={`plate p-6 rounded-xl bg-slate-950/90 border border-slate-800 shadow-2xl text-slate-100 ${className}`}>
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold tracking-tight text-amber-400 font-serif">
              CSS Thermal Decay & Viscosity Coupling Engine
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border ${
                data.resteam_trigger_recommended
                  ? "bg-red-500/20 text-red-400 border-red-500/50 animate-pulse"
                  : "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
              }`}
            >
              {data.resteam_trigger_recommended ? "RE-STEAMING TRIGGER RECOMMENDED" : "CYCLE ACTIVE"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Coupled Thermodynamics & Mechanical Settling Limits @ {data.well_name} (Baghewala Heavy Crude)
          </p>
        </div>

        {/* Days Horizon Select */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-slate-400">Cycle Days Horizon:</label>
          <select
            value={cycleDays}
            onChange={(e) => setCycleDays(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 rounded px-2.5 py-1.5 focus:border-amber-500 outline-none"
          >
            <option value={30}>30 Days</option>
            <option value={45}>45 Days</option>
            <option value={60}>60 Days</option>
          </select>
        </div>
      </div>

      {/* Decision Recommendation Banner */}
      <div
        className={`mb-6 p-4 rounded-lg text-xs font-mono border ${
          data.resteam_trigger_recommended
            ? "bg-red-950/70 border-red-800/90 text-red-200"
            : "bg-slate-900/90 border-slate-800 text-slate-300"
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`w-3 h-3 rounded-full mt-0.5 shrink-0 ${
              data.resteam_trigger_recommended ? "bg-red-500 animate-ping" : "bg-emerald-500"
            }`}
          />
          <div>
            <p className="font-bold text-sm text-amber-300 mb-1">
              Automated Re-Steaming Decision Recommendation
            </p>
            <p className="leading-relaxed">{data.trigger_message}</p>
          </div>
        </div>
      </div>

      {/* Multi-Metric Timeline Chart */}
      <div className="h-[340px] w-full mb-6 relative">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data.timeline} margin={{ top: 20, right: 30, bottom: 25, left: 10 }}>
            <defs>
              <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="oilGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="cycle_day"
              stroke="#64748b"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              label={{
                value: "CSS Production Cycle Elapsed Days",
                position: "insideBottom",
                offset: -15,
                fill: "#94a3b8",
                fontSize: 12,
              }}
            />
            <YAxis
              yAxisId="left"
              stroke="#ef4444"
              tick={{ fontSize: 11, fill: "#ef4444" }}
              domain={[30, 200]}
              label={{
                value: "Reservoir Temperature (°C) / BOPD",
                angle: -90,
                position: "insideLeft",
                offset: 5,
                fill: "#ef4444",
                fontSize: 11,
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#38bdf8"
              tick={{ fontSize: 11, fill: "#38bdf8" }}
              domain={[0, 15]}
              label={{
                value: "Max Allowable SPM / Energy $/bbl",
                angle: 90,
                position: "insideRight",
                offset: 5,
                fill: "#38bdf8",
                fontSize: 11,
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload;
                  return (
                    <div className="bg-slate-900 border border-slate-700 p-3 rounded shadow-xl text-xs font-mono space-y-1">
                      <p className="text-amber-400 font-bold">
                        Day {pt.cycle_day} ({pt.phase.toUpperCase()})
                      </p>
                      <p className="text-red-400">Temp: {pt.reservoir_temperature_c}°C</p>
                      <p className="text-sky-300">Viscosity: {pt.viscosity_cp} cP</p>
                      <p className="text-amber-300">Oil Rate: {pt.oil_rate_bopd} BOPD</p>
                      <p className="text-emerald-400">Max SPM Limit: {pt.max_allowable_spm} SPM</p>
                      <p className="text-purple-300">Energy Cost: ${pt.energy_per_barrel_usd}/bbl</p>
                      <p className="text-emerald-300">Daily Profit: ${pt.daily_net_margin_usd}/day</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "12px" }} />
            
            {/* Cut-Off Day Reference Line */}
            <ReferenceLine
              x={data.economic_cutoff_day}
              yAxisId="left"
              label={{
                value: `Economic Cutoff (Day ${data.economic_cutoff_day})`,
                fill: "#ef4444",
                fontSize: 11,
                position: "insideTopLeft",
              }}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth={2}
            />

            <Area
              yAxisId="left"
              type="monotone"
              dataKey="reservoir_temperature_c"
              name="Reservoir Temp (°C)"
              stroke="#ef4444"
              fill="url(#tempGrad)"
              strokeWidth={2}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="oil_rate_bopd"
              name="Oil Rate (BOPD)"
              stroke="#f59e0b"
              fill="url(#oilGrad)"
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="max_allowable_spm"
              name="Max Allowable SPM (Guardrail)"
              stroke="#10b981"
              strokeWidth={2.5}
              strokeDasharray="4 4"
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="energy_per_barrel_usd"
              name="Energy Cost ($/bbl)"
              stroke="#a855f7"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Engineering KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs font-mono">
        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <p className="text-slate-400 text-[11px]">Peak Steam Temp</p>
          <p className="text-base font-bold text-red-400 mt-0.5">
            {data.peak_temperature_c}°C
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Native Base: {String(data.assumptions.base_temp_c ?? 46)}°C</p>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <p className="text-slate-400 text-[11px]">Current Viscosity</p>
          <p className="text-base font-bold text-sky-400 mt-0.5">
            {currentPoint.viscosity_cp} <span className="text-xs font-normal text-slate-400">cP</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Cold Viscosity: {data.cold_viscosity_cp} cP</p>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <p className="text-slate-400 text-[11px]">Max Safe SPM Limit</p>
          <p className="text-base font-bold text-emerald-400 mt-0.5">
            {currentPoint.max_allowable_spm} <span className="text-xs font-normal text-slate-400">SPM</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Operating SPM: {data.current_operating_spm} SPM</p>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <p className="text-slate-400 text-[11px]">Economic Cut-off Day</p>
          <p className="text-base font-bold text-amber-400 mt-0.5">
            Day {data.economic_cutoff_day}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Current Day: Day {data.current_cycle_day}</p>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <p className="text-slate-400 text-[11px]">Energy Cost / bbl</p>
          <p className="text-base font-bold text-purple-400 mt-0.5">
            ${currentPoint.energy_per_barrel_usd}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Oil Price: ${String(data.assumptions.oil_price_usd ?? 75)}/bbl</p>
        </div>
      </div>
    </div>
  );
};
