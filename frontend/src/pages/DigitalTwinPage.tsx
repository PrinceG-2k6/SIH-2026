import { Suspense, useEffect, useState } from "react";
import { Gauge } from "../components/Gauge";
import { WellSchematic } from "../components/WellSchematic";
import { DigitalTwinScene } from "../three/DigitalTwinScene";
import { getTwinState } from "../services/api";
import type { DashboardData, TwinMode, TwinState } from "../types";

const MODES: { id: TwinMode; label: string }[] = [
  { id: "current", label: "Current" },
  { id: "predicted", label: "Predicted" },
  { id: "optimized", label: "Optimized" },
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
      .then(setTwin)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load twin"))
      .finally(() => setLoading(false));
  }, [wellId, mode]);

  return (
    <div className="fade-in space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="tick-mark" />
            <p className="eyebrow text-[var(--accent)]">Well-to-surface replica</p>
          </div>
          <h2 className="serif mt-2 text-4xl font-semibold tracking-tight text-[var(--ink)]">
            Digital twin
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--ink-muted)]">
            Live pumpjack kinematics follow SPM and stroke. Thermal plume scales with steam and
            temperature. Oil mobility tracks viscosity. Polish-rod colour and chatter respond to
            floating and load risk.
          </p>
        </div>
        <div className="flex gap-1 border-b border-[var(--line)]">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`mono px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] transition ${
                mode === m.id
                  ? "border-b-2 border-[var(--accent)] text-[var(--accent)]"
                  : "text-[var(--ink-faint)] hover:text-[var(--ink)]"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
      {loading && <p className="mono text-sm text-[var(--ink-faint)]">Syncing twin with backend…</p>}

      {twin && !loading && (
        <>
          <div className="flex flex-wrap gap-6 border-y border-[var(--line)] py-5">
            <Gauge value={twin.reservoir_temperature} max={80} label="Temp" unit="°C" tone="info" size={96} />
            <Gauge value={twin.oil_rate_bopd} max={80} label="Oil" unit="BOPD" tone="accent" size={96} />
            <Gauge value={Math.min(twin.oil_viscosity, 1200)} max={1200} label="Visc" unit="cP" size={96} />
            <Gauge value={twin.spm} max={12} label="SPM" tone="info" size={96} />
            <Gauge
              value={twin.rod_load}
              max={120}
              label="Rod load"
              unit="kN"
              tone={twin.rod_load > 80 ? "warn" : "good"}
              size={96}
            />
            <Gauge
              value={twin.failure_probability * 100}
              max={100}
              label="Fail"
              unit="%"
              tone={twin.failure_probability > 0.3 ? "bad" : "good"}
              size={96}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
            {/* 2D engineering drawing */}
            <div className="plate overflow-hidden">
              <div className="border-b border-[var(--line)] px-4 py-3">
                <p className="eyebrow text-[var(--accent)]">Section drawing</p>
                <p className="mono mt-1 text-[10px] text-[var(--ink-faint)]">
                  Depth-scaled · linked to twin state
                </p>
              </div>
              <div className="h-[480px] bg-[#08090b] p-2">
                <WellSchematic state={twin} />
              </div>
            </div>

            {/* 3D scene */}
            <div className="plate relative overflow-hidden">
              <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
                <span className="pulse-dot" />
                <span className="mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                  Interactive · {mode}
                </span>
              </div>
              <div className="h-[min(72vh,640px)] w-full bg-[#08090b]">
                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center text-sm text-[var(--ink-faint)]">
                      Building scene…
                    </div>
                  }
                >
                  <DigitalTwinScene state={twin} />
                </Suspense>
              </div>
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex flex-wrap justify-between gap-2 border-t border-[var(--line)] bg-[rgba(8,9,11,0.85)] px-4 py-3 backdrop-blur-sm">
                <span className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                  Drag orbit · scroll zoom
                </span>
                <span className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                  SPM→crank · stroke→travel · μ→inflow · load→rod colour
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <LinkChip label="Steam mass" value={`${twin.steam_volume.toFixed(0)} t`} />
            <LinkChip label="Stroke length" value={`${twin.stroke_length.toFixed(2)} m`} />
            <LinkChip label="Pump η" value={`${(twin.pump_efficiency * 100).toFixed(0)}%`} />
            <LinkChip
              label="Rod float P"
              value={`${(twin.rod_floating_probability * 100).toFixed(0)}%`}
              warn={twin.rod_floating_probability > 0.35}
            />
          </div>

          {(twin.rod_floating_probability > 0.35 || twin.failure_probability > 0.3) && (
            <div className="border-l-2 border-[var(--warn)] bg-[rgba(201,162,39,0.06)] px-5 py-3 text-sm text-[var(--warn)]">
              {twin.rod_floating_probability > 0.35 &&
                "Rod floating risk elevated — polish rod shows unstable chatter in the 3D twin. "}
              {twin.failure_probability > 0.3 && "Failure probability above demo threshold."}
            </div>
          )}

          {dashboard && mode === "optimized" && (
            <p className="mono text-xs text-[var(--ink-faint)]">
              Optimized · steam {dashboard.optimization.recommended.parameters.steam_volume}t · SPM{" "}
              {dashboard.optimization.recommended.parameters.spm} · stroke{" "}
              {dashboard.optimization.recommended.parameters.stroke_length}m
            </p>
          )}
        </>
      )}
    </div>
  );
}

function LinkChip({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="plate-inset px-4 py-3">
      <p className="eyebrow">{label}</p>
      <p className={`mono mt-1 text-lg ${warn ? "text-[var(--warn)]" : "text-[var(--ink)]"}`}>{value}</p>
    </div>
  );
}
