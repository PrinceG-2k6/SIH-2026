import React, { useEffect, useState } from "react";
import type { AsphalteneResponse, OperatingParameters } from "../types";
import { getAsphaltene, simulateAsphaltene } from "../services/api";

interface AsphaltenePanelProps {
  wellId: string;
  parameters?: OperatingParameters;
  className?: string;
}

export const AsphaltenePanel: React.FC<AsphaltenePanelProps> = ({
  wellId,
  parameters,
  className = "",
}) => {
  const [daysSinceTreatment, setDaysSinceTreatment] = useState<number>(35);
  const [data, setData] = useState<AsphalteneResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"envelope" | "constriction" | "economics">("envelope");

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const res = parameters
          ? await simulateAsphaltene(wellId, parameters, daysSinceTreatment)
          : await getAsphaltene(wellId, daysSinceTreatment);

        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load Asphaltene engine diagnostics");
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [wellId, parameters, daysSinceTreatment]);

  const handleWashReset = () => {
    setDaysSinceTreatment(0);
  };

  if (loading && !data) {
    return (
      <div className={`plate p-6 rounded-xl bg-slate-900/80 border border-slate-800 text-center ${className}`}>
        <div className="animate-spin inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mb-3"></div>
        <p className="text-slate-400 text-sm font-mono">Calculating Asphaltene Onset Envelope & Tubing Deposition...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`plate p-6 rounded-xl bg-slate-900/80 border border-red-500/30 text-red-400 text-sm font-mono ${className}`}>
        {error || "Asphaltene Engine offline"}
      </div>
    );
  }

  const isUrgent = data.treatment_urgency === "CRITICAL";
  const isWarn = data.treatment_urgency === "WARNING";

  return (
    <div className={`plate p-6 rounded-xl bg-slate-950/90 border border-slate-800 shadow-2xl text-slate-100 ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold tracking-tight text-amber-400 font-serif">
              Asphaltene Onset Envelope (AOE) & Deposition Engine
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold tracking-wide uppercase ${
                isUrgent
                  ? "bg-red-950/90 text-red-400 border border-red-800 animate-pulse"
                  : isWarn
                  ? "bg-amber-950/90 text-amber-400 border border-amber-800"
                  : "bg-emerald-950/90 text-emerald-400 border border-emerald-800"
              }`}
            >
              {data.treatment_urgency}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Thermodynamic phase boundaries · Subsurface tubing constriction · Mechanical friction drag coupling
          </p>
        </div>

        {/* Action Trigger Badge */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Recommended Action</span>
            <span className="text-sm font-mono font-bold text-amber-300">{data.treatment_recommendation}</span>
          </div>
          <button
            onClick={handleWashReset}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-xs font-mono transition-colors"
            title="Simulate aromatic solvent wash (resets cumulative deposition)"
          >
            Flush Solvent
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 block">Asphaltene Drag</span>
          <span className="text-2xl font-bold font-mono text-amber-400">{data.asphaltene_drag_kn}</span>
          <span className="text-xs font-mono text-slate-500 ml-1">kN</span>
          <div className="text-[10px] font-mono text-slate-400 mt-1">Mechanical friction</div>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 block">Tubing Constriction</span>
          <span className={`text-2xl font-bold font-mono ${data.max_constriction_pct > 25 ? "text-red-400" : "text-amber-400"}`}>
            {data.max_constriction_pct}%
          </span>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            Area loss at {data.critical_depth_m}m
          </div>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 block">Min Effective Clearance</span>
          <span className="text-2xl font-bold font-mono text-sky-400">{data.min_effective_diameter_in}"</span>
          <span className="text-xs font-mono text-slate-500 ml-1">/ {data.nominal_diameter_in}"</span>
          <div className="text-[10px] font-mono text-slate-400 mt-1">Nominal tubing clearance</div>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 block">Rod Float Risk</span>
          <span className={`text-2xl font-bold font-mono ${data.rod_floating_risk_pct > 50 ? "text-red-400" : "text-emerald-400"}`}>
            {data.rod_floating_risk_pct}%
          </span>
          <div className="text-[10px] font-mono text-slate-400 mt-1">Downstroke drag brake</div>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 block">Economic Tipping</span>
          <span className="text-2xl font-bold font-mono text-amber-400">Day {data.economic_tipping_day}</span>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            Current: Day {data.days_since_treatment}
          </div>
        </div>
      </div>

      {/* Days slider */}
      <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[240px]">
          <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
            <span>Cumulative Deposition Time: <strong className="text-amber-400">{daysSinceTreatment} Days</strong> since flush</span>
            <span>Range: 0 – 60 Days</span>
          </div>
          <input
            type="range"
            min="0"
            max="60"
            value={daysSinceTreatment}
            onChange={(e) => setDaysSinceTreatment(Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />
        </div>
        <div className="flex gap-2">
          {["envelope", "constriction", "economics"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-3 py-1.5 rounded text-xs font-mono capitalize transition-colors ${
                activeTab === tab
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {tab === "envelope" ? "Phase Envelope" : tab === "constriction" ? "Tubing Profile" : "Treatment Economics"}
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive Visualizers */}
      {activeTab === "envelope" && (
        <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800 mb-6">
          <h4 className="text-sm font-bold font-mono text-amber-400 mb-2">
            Step 1: Asphaltene Onset Envelope (AOE) & Wellbore Trajectory
          </h4>
          <p className="text-xs text-slate-400 mb-4">
            Shaded area defines the Asphaltene Onset Envelope (AOP vs Temperature). The cyan curve plots wellbore pressure P(z) vs temperature T(z) from surface (head) to bottomhole (res).
          </p>
          <div className="h-64 w-full relative">
            <PhaseEnvelopeChart envelopePoints={data.envelope_points} depthProfile={data.depth_profile} />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-around text-xs font-mono text-slate-400 border-t border-slate-800/80 pt-3">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500/40 inline-block border border-red-500"></span> Precipitating Region (AOP boundary)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-sky-400 inline-block"></span> Wellbore P-T Trajectory (0–1100m)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-400 stroke-dashed inline-block"></span> Bubble Point Curve</span>
          </div>
        </div>
      )}

      {activeTab === "constriction" && (
        <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800 mb-6">
          <h4 className="text-sm font-bold font-mono text-amber-400 mb-2">
            Step 2 & 3: Tubing Clearance Shrinkage & Precipitation Risk along Depth
          </h4>
          <p className="text-xs text-slate-400 mb-4">
            Precipitation occurs predominantly between {data.precipitation_zone_start_m}m and {data.precipitation_zone_end_m}m depth, reducing effective tubing clearance.
          </p>
          <div className="h-64 w-full relative">
            <DepthConstrictionChart profile={data.depth_profile} nominalDia={data.nominal_diameter_in} />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-around text-xs font-mono text-slate-400 border-t border-slate-800/80 pt-3">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-400 inline-block"></span> Effective Diameter D_eff(z) [inches]</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-400 inline-block"></span> Asphaltene Risk Index [%]</span>
          </div>
        </div>
      )}

      {activeTab === "economics" && (
        <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800 mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-bold font-mono text-amber-400 mb-2">
              Step 5: Treatment Economic Tipping Point
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              Compares cumulative extra electrical power waste (${data.cumulative_waste_usd.toFixed(2)}) against the fixed cost of an aromatic solvent flush (${data.treatment_cost_usd.toFixed(2)}).
            </p>
            <div className="space-y-3 font-mono text-xs text-slate-300">
              <div className="flex justify-between p-2.5 rounded bg-slate-950/80 border border-slate-800">
                <span>Motor Power Waste Penalty:</span>
                <span className="font-bold text-amber-400">+{data.motor_power_penalty_kw} kW</span>
              </div>
              <div className="flex justify-between p-2.5 rounded bg-slate-950/80 border border-slate-800">
                <span>Daily Energy Waste Cost:</span>
                <span className="font-bold text-amber-400">${data.energy_cost_waste_usd.toFixed(2)} / day</span>
              </div>
              <div className="flex justify-between p-2.5 rounded bg-slate-950/80 border border-slate-800">
                <span>Cumulative Waste ({data.days_since_treatment} Days):</span>
                <span className="font-bold text-red-400">${data.cumulative_waste_usd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded bg-slate-950/80 border border-slate-800">
                <span>Aromatic Solvent Flush Cost:</span>
                <span className="font-bold text-emerald-400">${data.treatment_cost_usd.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between bg-slate-950/80 p-4 rounded-lg border border-slate-800">
            <div>
              <span className="text-xs font-mono text-slate-400 block uppercase">Diagnostic Classifier</span>
              <div className="text-xl font-bold font-mono text-amber-400 mt-1 mb-3">
                {data.diagnostic_label}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {data.diagnostic_label === "ASPHALTENE_FRICTION"
                  ? "Diagnostic engine detected solid mechanical contact friction at reversal points. Differentiated from pure high viscosity."
                  : "Normal downhole card signature. Viscous drag within expected thermal operating envelope."}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800">
              <button
                onClick={handleWashReset}
                className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs transition-colors shadow-lg shadow-amber-500/10"
              >
                EXECUTE AROMATIC SOLVENT WASH (RESET DEPOSITION)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explanatory Bullet Points */}
      <div className="border-t border-slate-800/80 pt-4">
        <h5 className="text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider">Physical Insights & Action Rationale</h5>
        <ul className="space-y-1.5 font-mono text-xs text-slate-300">
          {data.explanation.map((line, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">›</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// Sub-component: Phase Envelope SVG Chart
function PhaseEnvelopeChart({
  envelopePoints,
  depthProfile,
}: {
  envelopePoints: any[];
  depthProfile: any[];
}) {
  const width = 600;
  const height = 220;
  const padding = 35;

  const maxT = 160;
  const minT = 20;
  const maxP = 100;
  const minP = 0;

  const mapX = (t: number) => padding + ((t - minT) / (maxT - minT)) * (width - 2 * padding);
  const mapY = (p: number) => height - padding - ((p - minP) / (maxP - minP)) * (height - 2 * padding);

  // AOE curve path
  const aopPath = envelopePoints
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${mapX(pt.temperature_c)} ${mapY(pt.onset_pressure_bar)}`)
    .join(" ");

  // Bubble point path
  const pbPath = envelopePoints
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${mapX(pt.temperature_c)} ${mapY(pt.bubble_point_bar)}`)
    .join(" ");

  // Wellbore trajectory path (P vs T along depth)
  const trajPath = depthProfile
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${mapX(pt.temperature_c)} ${mapY(pt.pressure_bar)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      {/* Grid lines */}
      {[30, 60, 90, 120, 150].map((t) => (
        <line
          key={`x-${t}`}
          x1={mapX(t)}
          y1={padding}
          x2={mapX(t)}
          y2={height - padding}
          stroke="#1e293b"
          strokeWidth="1"
        />
      ))}
      {[20, 40, 60, 80].map((p) => (
        <line
          key={`y-${p}`}
          x1={padding}
          y1={mapY(p)}
          x2={width - padding}
          y2={mapY(p)}
          stroke="#1e293b"
          strokeWidth="1"
        />
      ))}

      {/* AOP Curve (Red) */}
      <path d={aopPath} fill="none" stroke="#f43f5e" strokeWidth="2.5" />
      {/* Bubble point (Emerald) */}
      <path d={pbPath} fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 4" />
      {/* Wellbore Trajectory (Cyan) */}
      <path d={trajPath} fill="none" stroke="#38bdf8" strokeWidth="2.5" />

      {/* Wellbore points */}
      {depthProfile.map((pt, i) => (
        <circle
          key={i}
          cx={mapX(pt.temperature_c)}
          cy={mapY(pt.pressure_bar)}
          r={i === 0 || i === depthProfile.length - 1 ? 4 : 2}
          fill={pt.asphaltene_risk_pct > 50 ? "#f43f5e" : "#38bdf8"}
        />
      ))}

      {/* Axis Labels */}
      <text x={width / 2} y={height - 8} fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="monospace">
        Temperature (°C)
      </text>
      <text x={12} y={height / 2} fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="monospace" transform={`rotate(-90 12 ${height / 2})`}>
        Pressure (bar)
      </text>
    </svg>
  );
}

// Sub-component: Depth Constriction SVG Chart
function DepthConstrictionChart({
  profile,
  nominalDia,
}: {
  profile: any[];
  nominalDia: number;
}) {
  const width = 600;
  const height = 220;
  const padding = 35;

  const maxZ = 1100;
  const mapX = (z: number) => padding + (z / maxZ) * (width - 2 * padding);
  const mapYDia = (d: number) => height - padding - ((d - 1.5) / (3.0 - 1.5)) * (height - 2 * padding);
  const mapYRisk = (r: number) => height - padding - (r / 100.0) * (height - 2 * padding);

  const diaPath = profile
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${mapX(pt.depth_m)} ${mapYDia(pt.effective_diameter_in)}`)
    .join(" ");

  const riskPath = profile
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${mapX(pt.depth_m)} ${mapYRisk(pt.asphaltene_risk_pct)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      {/* Nominal tubing reference line */}
      <line
        x1={padding}
        y1={mapYDia(nominalDia)}
        x2={width - padding}
        y2={mapYDia(nominalDia)}
        stroke="#475569"
        strokeWidth="1"
        strokeDasharray="4 4"
      />

      {/* Diameter curve */}
      <path d={diaPath} fill="none" stroke="#f59e0b" strokeWidth="2.5" />
      {/* Risk curve */}
      <path d={riskPath} fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="3 3" />

      {/* Axis Labels */}
      <text x={width / 2} y={height - 8} fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="monospace">
        Wellbore Depth (meters)
      </text>
    </svg>
  );
}
