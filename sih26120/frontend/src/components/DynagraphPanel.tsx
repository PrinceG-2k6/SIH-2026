import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Legend,
} from "recharts";
import type { DynagraphResponse, OperatingParameters } from "../types";
import { getDynagraph, simulateDynagraph } from "../services/api";

interface DynagraphPanelProps {
  wellId: string;
  parameters?: OperatingParameters;
  className?: string;
}

export const DynagraphPanel: React.FC<DynagraphPanelProps> = ({
  wellId,
  parameters,
  className = "",
}) => {
  const [data, setData] = useState<DynagraphResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [faultOverride, setFaultOverride] = useState<string>("none");

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchCard = async () => {
      try {
        let res: DynagraphResponse;
        if (parameters || faultOverride !== "none") {
          res = await simulateDynagraph(
            wellId,
            parameters,
            faultOverride === "none" ? undefined : faultOverride
          );
        } else {
          res = await getDynagraph(wellId);
        }
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load dynagraph data");
          setLoading(false);
        }
      }
    };

    fetchCard();
    return () => {
      isMounted = false;
    };
  }, [wellId, parameters, faultOverride]);

  if (loading && !data) {
    return (
      <div className={`plate p-6 rounded-xl bg-slate-900/80 border border-slate-800 text-center ${className}`}>
        <div className="animate-spin inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mb-3"></div>
        <p className="text-slate-400 text-sm font-mono">Computing Downhole Wave Equation Physics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`plate p-6 rounded-xl bg-slate-900/80 border border-red-500/30 text-red-400 text-sm font-mono ${className}`}>
        {error || "Unable to display Dynagraph Card"}
      </div>
    );
  }

  const surfacePoints = data.surface_card.map((pt) => ({ x: pt.position_m, y: pt.load_kn }));
  const downholePoints = data.downhole_card.map((pt) => ({ x: pt.position_m, y: pt.load_kn }));

  // Dynamic severity styling
  const isCritical = data.severity === "CRITICAL" || data.rod_floating_detected;
  const isWarning = data.severity === "WARNING" && !isCritical;

  const badgeBg = isCritical
    ? "bg-red-500/20 text-red-400 border-red-500/50 animate-pulse"
    : isWarning
    ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
    : "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";

  return (
    <div className={`plate p-6 rounded-xl bg-slate-950/90 border border-slate-800 shadow-2xl text-slate-100 ${className}`}>
      {/* Header & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold tracking-tight text-amber-400 font-serif">
              Subsurface Dynagraph Diagnostics
            </h3>
            <span className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border ${badgeBg}`}>
              {data.diagnostic_label}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            1D Damped Wave Equation (a ≈ 4,880 m/s) @ {data.well_name} (1,100 m Jodhpur Pay Zone)
          </p>
        </div>

        {/* Fault injection simulator select */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-slate-400">Physics Fault Test:</label>
          <select
            value={faultOverride}
            onChange={(e) => setFaultOverride(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 rounded px-2.5 py-1.5 focus:border-amber-500 outline-none"
          >
            <option value="none">Baseline Telemetry</option>
            <option value="rod_float">Rod Floating (High Viscosity)</option>
            <option value="fluid_pound">Fluid Pound (Low Fillage)</option>
            <option value="gas_interference">Gas Interference</option>
            <option value="pump_unseating">Pump Unseating Shock</option>
          </select>
        </div>
      </div>

      {/* Flashing Alert Banner */}
      {data.alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {data.alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg text-xs font-mono font-medium flex items-center gap-2 border ${
                alert.includes("CRITICAL")
                  ? "bg-red-950/60 text-red-300 border-red-800/80"
                  : "bg-amber-950/60 text-amber-300 border-amber-800/80"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-ping"></span>
              <span>{alert}</span>
            </div>
          ))}
        </div>
      )}

      {/* Dual Card Chart */}
      <div className="h-[340px] w-full mb-6 relative">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 25, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              type="number"
              dataKey="x"
              name="Polished Rod Position"
              unit=" m"
              domain={[0, Math.ceil(data.operating_parameters.stroke_length * 10) / 10]}
              stroke="#64748b"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              label={{
                value: "Polished Rod / Plunger Stroke Position (meters)",
                position: "insideBottom",
                offset: -15,
                fill: "#94a3b8",
                fontSize: 12,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Rod Load"
              unit=" kN"
              domain={[0, Math.max(100, Math.ceil(data.kpis.peak_surface_load_kn * 1.15))]}
              stroke="#64748b"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              label={{
                value: "Rod Load (kilo-Newtons)",
                angle: -90,
                position: "insideLeft",
                offset: 5,
                fill: "#94a3b8",
                fontSize: 12,
              }}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload;
                  return (
                    <div className="bg-slate-900 border border-slate-700 p-2.5 rounded shadow-xl text-xs font-mono">
                      <p className="text-amber-400 font-bold">{payload[0].name}</p>
                      <p className="text-slate-200">Position: {pt.x.toFixed(3)} m</p>
                      <p className="text-slate-200">Load: {pt.y.toFixed(2)} kN</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "12px" }} />
            <ReferenceLine
              y={data.kpis.buoyant_rod_weight_kn}
              label={{
                value: `W_buoyant (${data.kpis.buoyant_rod_weight_kn} kN)`,
                fill: "#ef4444",
                fontSize: 11,
                position: "insideTopRight",
              }}
              stroke="#ef4444"
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />
            <Scatter
              name="Surface Polished Rod Card"
              data={surfacePoints}
              fill="#fbbf24"
              line={{ stroke: "#fbbf24", strokeWidth: 2.5 }}
              lineType="joint"
            />
            <Scatter
              name="Subsurface Downhole Pump Card"
              data={downholePoints}
              fill="#10b981"
              line={{ stroke: "#10b981", strokeWidth: 2 }}
              lineType="joint"
            />
          </ScatterChart>
        </ResponsiveContainer>

        {/* Floating reference badge */}
        <div className="absolute top-2 right-4 bg-slate-900/90 backdrop-blur border border-slate-800 p-2 rounded text-[11px] font-mono text-slate-300">
          <span className="text-amber-400 font-semibold">● Surface Loop</span>
          <span className="ml-3 text-emerald-400 font-semibold">● Downhole Loop</span>
          <span className="ml-3 text-red-400 font-semibold">-- Buoyant W_rod Limit</span>
        </div>
      </div>

      {/* Engineering KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <p className="text-slate-400 text-[11px]">Surface Work / Stroke</p>
          <p className="text-base font-bold text-amber-400 mt-0.5">
            {data.kpis.work_surface_kj} <span className="text-xs font-normal text-slate-400">kJ</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-1">{data.kpis.energy_expended_joules.toLocaleString()} Joules</p>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <p className="text-slate-400 text-[11px]">Downhole Work / Stroke</p>
          <p className="text-base font-bold text-emerald-400 mt-0.5">
            {data.kpis.work_downhole_kj} <span className="text-xs font-normal text-slate-400">kJ</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Plunger Pump Work</p>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <p className="text-slate-400 text-[11px]">Pump Efficiency / Fillage</p>
          <p className="text-base font-bold text-cyan-400 mt-0.5">
            {data.kpis.pump_efficiency_pct}% <span className="text-xs font-normal text-slate-400">/ {data.kpis.pump_fillage_pct}%</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Effective Stroke: {data.kpis.effective_stroke_m}m</p>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <p className="text-slate-400 text-[11px]">Goodman Utilization</p>
          <p
            className={`text-base font-bold mt-0.5 ${
              data.structural_safety.is_safe ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {(data.structural_safety.goodman_utilization * 100).toFixed(1)}%
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            Max Stress: {data.structural_safety.rod_stress_max_mpa} MPa
          </p>
        </div>
      </div>
    </div>
  );
};
