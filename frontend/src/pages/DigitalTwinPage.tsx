import { Suspense, useEffect, useState } from "react";
import { Gauge } from "../components/Gauge";
import { WellSchematic } from "../components/WellSchematic";
import { DigitalTwinScene } from "../three/DigitalTwinScene";
import { getPhysicsTwin, getTwinState } from "../services/api";
import type { DashboardData, TwinMode, TwinState } from "../types";

const MODES: { id: TwinMode; label: string }[] = [
  { id: "current", label: "01. CURRENT MEASURED" },
  { id: "predicted", label: "02. UNCONSTRAINED FORECAST" },
  { id: "optimized", label: "03. OPTIMIZED AI EQUILIBRIUM" },
];

interface Props {
  wellId: string;
  dashboard: DashboardData | null;
}

export function DigitalTwinPage({ wellId, dashboard }: Props) {
  const [mode, setMode] = useState<TwinMode>("current");
  const [twin, setTwin] = useState<TwinState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getTwinState(wellId, mode)
      .then(async (ml) => {
        try {
          const phys = await getPhysicsTwin(wellId);
          setTwin({
            ...ml,
            heated_radius_m: Number(phys.heated_radius_m ?? ml.heated_radius_m),
            reservoir_temperature: Number(phys.reservoir_temperature ?? ml.reservoir_temperature),
          });
        } catch {
          setTwin(ml);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load twin"))
      .finally(() => setLoading(false));
  }, [wellId, mode]);

  return (
    <div className="fade-in space-y-10">
      {/* Top Banner & Mode Selector */}
      <div className="border-b-2 border-[#111111] pb-4">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#CC0000]">
              SUB-SURFACE TO SURFACE REPLICA · BOREHOLE {wellId}
            </span>
            <h2 className="mt-1 font-serif text-4xl sm:text-5xl font-black text-[#111111] uppercase">
              3D Dynamic Digital Twin
            </h2>
            <p className="mt-2 font-body text-sm text-[#525252] leading-relaxed">
              Real-time WebGL kinematic synthesis. Walking beam cadence follows SPM and stroke;
              downhole thermal chamber expansion scales with cumulative steam enthalpy;
              polish-rod stress gradients respond to fluid viscosity and rod floating hazards.
            </p>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex flex-wrap gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider border transition-all ${
                  mode === m.id
                    ? "border-[#111111] bg-[#111111] text-[#F9F9F7]"
                    : "border-[#111111] bg-white text-[#111111] hover:bg-[#E5E5E0]"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="border border-[#CC0000] bg-[#FFF5F5] p-4 font-mono text-xs text-[#CC0000]">
          TWIN CONNECTION ERROR: {error}
        </div>
      )}

      {loading && (
        <div className="border border-[#111111] bg-[#F5F5F5] p-8 text-center font-mono text-xs text-[#525252]">
          SYNCHRONIZING DIGITAL TWIN KINEMATICS WITH SIMULATOR BACKEND…
        </div>
      )}

      {twin && !loading && (
        <>
          {/* Telemetry Gauge Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Gauge value={twin.reservoir_temperature} max={80} label="Thermal Core" unit="°C" tone="info" size={92} />
            <Gauge value={twin.oil_rate_bopd} max={80} label="Oil Offtake" unit="BOPD" tone="accent" size={92} />
            <Gauge value={Math.min(twin.oil_viscosity, 1200)} max={1200} label="Viscosity" unit="cP" tone="warn" size={92} />
            <Gauge value={twin.spm} max={12} label="Pumping Cadence" unit="SPM" tone="info" size={92} />
            <Gauge
              value={twin.rod_load}
              max={120}
              label="Peak Rod Load"
              unit="kN"
              tone={twin.rod_load > 80 ? "warn" : "good"}
              size={92}
            />
            <Gauge
              value={twin.failure_probability * 100}
              max={100}
              label="Hazard Prob."
              unit="%"
              tone={twin.failure_probability > 0.3 ? "bad" : "good"}
              size={92}
            />
          </div>

          {/* Dual Exhibit: 2D Schematic + 3D WebGL Canvas */}
          <div className="grid gap-6 xl:grid-cols-[340px_1fr] items-start">
            {/* 2D Technical Patent Drawing */}
            <div className="border-2 border-[#111111] bg-white hard-shadow">
              <div className="border-b border-[#111111] bg-[#F5F5F5] px-4 py-2 flex items-center justify-between font-mono text-[10px] uppercase font-bold text-[#111111]">
                <span>FIG 1.1 — WELL SECTION</span>
                <span>STRATIGRAPHY</span>
              </div>
              <div className="h-[520px] p-2 bg-[#F9F9F7]">
                <WellSchematic state={twin} />
              </div>
            </div>

            {/* 3D WebGL Scene */}
            <div className="border-4 border-[#111111] bg-[#111111] hard-shadow relative">
              <div className="absolute left-4 top-4 z-10 flex items-center gap-2 border border-white/20 bg-black/80 px-3 py-1 text-white font-mono text-[10px] uppercase tracking-wider">
                <span className="pulse-dot" />
                <span>INTERACTIVE 3D KINEMATICS · {mode.toUpperCase()}</span>
              </div>

              <div className="h-[520px] w-full bg-[#111111]">
                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center font-mono text-xs text-white">
                      INITIALIZING THREE.JS KINEMATICS RENDERER…
                    </div>
                  }
                >
                  <DigitalTwinScene state={twin} />
                </Suspense>
              </div>

              {/* Instructions Bar */}
              <div className="flex flex-wrap justify-between gap-2 border-t border-white/20 bg-black/90 px-4 py-2 text-white font-mono text-[10px] uppercase tracking-wider">
                <span className="text-[#A3A3A3]">
                  NAVIGATION: LEFT-CLICK TO ORBIT · SCROLL TO ZOOM · RIGHT-CLICK TO PAN
                </span>
                <span className="text-[#CC0000] font-bold">
                  SURFACE-TO-SANDSTONE INTERFACE ACTIVE
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 font-mono text-xs">
            <MetricChip label="Heated Plume Radius" value={`${(twin.heated_radius_m ?? 12).toFixed(1)} m`} />
            <MetricChip label="Cumulative Steam" value={`${twin.steam_volume.toFixed(0)} t`} />
            <MetricChip label="Kinematic Stroke" value={`${twin.stroke_length.toFixed(2)} m`} />
            <MetricChip label="Volumetric Pump η" value={`${(twin.pump_efficiency * 100).toFixed(0)}%`} />
            <MetricChip
              label="Rod Float Probability"
              value={`${(twin.rod_floating_probability * 100).toFixed(0)}%`}
              isAlert={twin.rod_floating_probability > 0.35}
            />
          </div>

          {/* Warning Banner */}
          {(twin.rod_floating_probability > 0.35 || twin.failure_probability > 0.3) && (
            <div className="border-2 border-[#CC0000] bg-[#FFF5F5] p-4 font-mono text-xs text-[#CC0000]">
              <span className="font-bold uppercase mr-2">[MECHANICAL HAZARD DETECTED]</span>
              {twin.rod_floating_probability > 0.35 &&
                "Elevated rod floating hazard. Subsurface oil viscosity prevents timely valve reseating on downstroke. Sucker rod chatter active in 3D scene."}
              {twin.failure_probability > 0.3 && " Cumulative mechanical stress exceeds continuous operational threshold."}
            </div>
          )}

          {dashboard && mode === "optimized" && (
            <div className="border border-[#111111] bg-[#F5F5F5] p-3 font-mono text-xs text-[#525252]">
              OPTIMIZED EQUILIBRIUM: STEAM {dashboard.optimization.recommended.parameters.steam_volume} t · CADENCE{" "}
              {dashboard.optimization.recommended.parameters.spm} SPM · STROKE{" "}
              {dashboard.optimization.recommended.parameters.stroke_length} m
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MetricChip({
  label,
  value,
  isAlert = false,
}: {
  label: string;
  value: string;
  isAlert?: boolean;
}) {
  return (
    <div className="border border-[#111111] bg-white p-4">
      <div className="text-[9px] uppercase tracking-wider text-[#737373] font-bold">{label}</div>
      <div className={`mt-1 text-xl font-bold ${isAlert ? "text-[#CC0000]" : "text-[#111111]"}`}>
        {value}
      </div>
    </div>
  );
}
