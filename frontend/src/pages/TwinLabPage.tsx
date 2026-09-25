import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getPhysicsTwin, postTwinlab } from "../services/api";

interface Props {
  wellId: string;
}

const tip = {
  backgroundColor: "#FAF7EE",
  border: "1px solid #111111",
  boxShadow: "3px 3px 0px #111111",
  borderRadius: 0,
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 11,
  color: "#111111",
};

const FAULTS = [
  "none",
  "rod_float",
  "high_viscosity",
  "pump_unseating",
  "excessive_rod_load",
  "rod_fatigue",
  "asphaltene_buildup",
  "excessive_impact_shock",
  "abnormal_pressure",
  "pump_inefficiency",
  "sensor_anomaly",
];

export function TwinLabPage({ wellId }: Props) {
  const [twin, setTwin] = useState<Record<string, unknown> | null>(null);
  const [field, setField] = useState<Record<string, unknown> | null>(null);
  const [opt, setOpt] = useState<Record<string, unknown> | null>(null);
  const [what, setWhat] = useState<Record<string, unknown> | null>(null);
  const [branches, setBranches] = useState<Record<string, unknown> | null>(null);
  const [horizon, setHorizon] = useState<Record<string, unknown> | null>(null);
  const [learn, setLearn] = useState<Record<string, unknown> | null>(null);
  const [dispatch, setDispatch] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [obs, setObs] = useState("52");
  const [steamPct, setSteamPct] = useState(20);
  const [cycle, setCycle] = useState(4);
  const [day, setDay] = useState(18);
  const [cutoff, setCutoff] = useState(28);
  const [playIdx, setPlayIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [t, fieldRes] = await Promise.all([
        getPhysicsTwin(wellId),
        fetch("/api/twinlab/field").then((r) => {
          if (!r.ok) throw new Error("field failed");
          return r.json();
        }),
      ]);
      setTwin(t);
      setField(fieldRes);
      if (typeof t.cycle_day === "number") setDay(t.cycle_day as number);
      if (typeof t.css_cycle_id === "number") setCycle(t.css_cycle_id as number);
      const sess = t.session as { cycle_cutoff_day?: number | null } | undefined;
      if (sess?.cycle_cutoff_day) setCutoff(sess.cycle_cutoff_day);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load twin lab");
    }
  }, [wellId]);

  useEffect(() => {
    setHorizon(null);
    setPlaying(false);
    reload();
  }, [reload]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const horizonPts = useMemo(() => {
    const base = ((horizon?.baseline as { points?: Record<string, number>[] })?.points) ?? [];
    const optPts = ((horizon?.optimized as { points?: Record<string, number>[] })?.points) ?? [];
    return base.map((p, i) => ({
      sim_day: p.sim_day,
      oil_base: p.oil_rate_bopd,
      oil_opt: optPts[i]?.oil_rate_bopd,
      temp_base: p.reservoir_temperature,
      temp_opt: optPts[i]?.reservoir_temperature,
      visc_base: p.viscosity,
      visc_opt: optPts[i]?.viscosity,
      fail_base: p.failure_probability,
      fail_opt: optPts[i]?.failure_probability,
      r_base: p.heated_radius_m,
      r_opt: optPts[i]?.heated_radius_m,
    }));
  }, [horizon]);

  useEffect(() => {
    if (!playing || horizonPts.length === 0) return;
    const id = window.setInterval(() => {
      setPlayIdx((i) => {
        const next = i + 1;
        if (next >= horizonPts.length) {
          setPlaying(false);
          return i;
        }
        return next;
      });
    }, Math.max(120, 700 / speed));
    return () => window.clearInterval(id);
  }, [playing, horizonPts.length, speed]);

  if (!twin) {
    return <p className="mono text-sm text-[var(--ink-faint)]">{error ?? "Loading physics twin…"}</p>;
  }

  const srp = twin.srp as Record<string, unknown>;
  const wellbore = twin.wellbore as { points: { depth_m: number; temperature_c: number; viscosity_cp: number; pressure_bar: number }[] };
  const diagnosis = twin.diagnosis as {
    severity: string; likely_causes: string[]; evidence: string[];
    recommended_action: string; predicted_consequence?: string;
  };
  const maint = twin.maintenance as { recommendations: { what: string; when: string; why: string; risk_reduced: string; consequence: string }[] };
  const gov = twin.governor as {
    recommended_spm: number; recommended_vfd: number; current_spm: number;
    reasons: { type: string; text: string }[];
    asymmetric?: { downstroke_modulation_pct: number; upstroke_spm: number; downstroke_spm: number; reason: string };
  };
  const unc = twin.uncertainty as Record<string, { value: number; sigma: number }>;
  const surface = (srp.surface_card as { position_m: number; load_kn: number; acceleration: number }[]) ?? [];
  const downhole = (srp.downhole_card as { position_m: number; load_kn: number }[]) ?? [];
  const card = surface.map((p, i) => ({
    position_m: p.position_m,
    surface: p.load_kn,
    downhole: downhole[i]?.load_kn,
    accel: p.acceleration,
  }));
  const goodman = srp.goodman as { mean_stress_mpa: number; alt_stress_mpa: number; endurance_mpa: number; ultimate_mpa: number };
  const econ = twin.economics as Record<string, number>;
  const metrics = (field?.metrics ?? {}) as Record<string, number>;
  const plan = (field?.action_plan ?? []) as { well_id: string; action: string; urgency: number; oil: number; fail: number }[];
  const prints = (field?.fingerprints ?? []) as Record<string, number | string>[];
  const allocation = (field?.allocation ?? {}) as { next_steam_unit?: string; reduce_spm?: string[]; maintenance_priority?: string[]; bottlenecks?: string[] };
  const alerts = (twin.alerts as {
    severity: string; code: string; cause: string; evidence: string;
    predicted_consequence: string; recommended_action: string;
  }[]) ?? [];
  const inferred = (twin.inferred as { id: string; value: number; unit: string; confidence: number; kind: string; method: string }[]) ?? [];
  const conf = twin.confidence as { score_pct: number; band: string; policy: string; breakdown: Record<string, number> };
  const hybrid = twin.hybrid as { mean_physics_ml_agreement: number; ml_source: string; fusion_weights: Record<string, number> };
  const pdx = twin.probabilistic_diagnosis as { primary: string; items: { condition: string; probability: number; severity: string; evidence: string[]; recommended_action: string }[] };
  const chain = twin.causal_chain as { title: string; diagnosis: string; steps: { id: string; text: string; value: string }[] };
  const safety = twin.safety as { gate: string; allow_dispatch: boolean; constraints: { parameter: string; current: number; limit: number; status: string }[] };
  const eopts = twin.economic_options as { recommended: string; options: { id: string; label: string; oil: number; fail: number; npv_usd: number; npv_inr: number }[]; rationale: string };
  const similar = twin.similar_wells as { peers: { well_id: string; similarity: number }[]; transfer_note: string };
  const tscale = twin.timescales as { conflict_resolution: string; real_time: { item: string; note?: string }[]; weeks: { item: string; when?: string }[] };
  const tlEvents = (twin.timeline_events as { id: string; label: string; day: number }[]) ?? [];
  const evlog = (twin.events as { condition: string; severity: string; subsystem: string; recommended_action?: string; acknowledged?: boolean }[]) ?? [];
  const pareto = ((opt?.pareto as { parameters: Record<string, number>; cycle_cutoff_day: number | null; objectives: Record<string, number> }[]) ?? []);
  const strategies = ((opt?.strategies as { strategy: string; oil: number; incremental_oil: number; sor: number; energy: number; failure_probability: number; npv: number; parameters: Record<string, number>; cycle_cutoff_day: number | null }[]) ?? []);
  const cursor = horizonPts[playIdx];

  return (
    <div className="fade-in space-y-10 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-[#111111] pb-4">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#C41212]">
            CONNECTED PHYSICS TWIN · EXPERIMENTAL LAB
          </span>
          <h2 className="mt-1 font-serif text-4xl sm:text-5xl font-black text-[#111111] uppercase">
            Field Laboratory & Deep Twin
          </h2>
          <p className="mt-2 font-body text-sm text-[#4D483F] max-w-2xl leading-relaxed">
            {String(twin.name)} · {String(twin.location)} · {String(twin.formation)} · {String(twin.depth_m)} m depth.
            Physics-informed surrogate simulation engine with closed-loop parameter re-calibration.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => run(async () => { await postTwinlab(`step/${wellId}`, { days: -1 }); await reload(); })}>
            ◀ day
          </button>
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => run(async () => { await postTwinlab(`step/${wellId}`, { days: 1 }); await reload(); })}>
            day ▶
          </button>
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => run(async () => { await postTwinlab(`step/${wellId}`, { days: 7 }); await reload(); })}>
            +7d
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={busy}
            onClick={() => run(async () => {
              await postTwinlab(`reset/${wellId}`);
              await postTwinlab(`fault/${wellId}`, { fault: "high_viscosity" });
              await reload();
              const o = await postTwinlab(`optimize/${wellId}`);
              setOpt(o);
              const rec = o.recommended as { parameters: Record<string, number>; cycle_cutoff_day: number | null };
              if (rec?.parameters) {
                await postTwinlab(`state/${wellId}/apply`, {
                  parameters: { ...rec.parameters, cycle_cutoff_day: rec.cycle_cutoff_day },
                });
              }
              const h = await postTwinlab(`horizon/${wellId}`, { days: 45 });
              setHorizon(h);
              setPlayIdx(0);
              await reload();
            })}
          >
            Guided demo
          </button>
          <button type="button" className="btn-primary" disabled={busy} onClick={() => run(async () => { await postTwinlab(`reset/${wellId}`); await reload(); })}>
            Reset well
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}

      {field && (
        <section className="plate p-5">
          <p className="eyebrow text-[var(--accent)]">Baghewala field</p>
          <div className="mt-4 flex flex-wrap gap-x-10 gap-y-4">
            <Vital k="Field oil" v={`${metrics.total_field_oil_rate ?? "—"}`} u="BOPD" />
            <Vital k="Active" v={`${metrics.active_wells ?? "—"} / ${metrics.well_count ?? "—"}`} />
            <Vital k="Avg SOR" v={`${metrics.average_sor ?? "—"}`} />
            <Vital k="Steam" v={`${metrics.total_steam ?? "—"}`} u="t" />
            <Vital k="Energy" v={`${metrics.total_energy_kw ?? "—"}`} u="kW" />
            <Vital k="Health" v={`${metrics.field_equipment_health ?? "—"}`} />
            <Vital k="Alerts" v={`${metrics.active_alerts ?? "—"}`} />
            <Vital k="Pred. fail" v={`${metrics.predicted_failures ?? "—"}`} />
          </div>
          {allocation.next_steam_unit && (
            <p className="mt-4 text-xs text-[var(--ink-muted)]">
              Next steam unit → <span className="mono text-[var(--accent)]">{allocation.next_steam_unit}</span>
              · Reduce SPM: {(allocation.reduce_spm ?? []).join(", ") || "—"}
              · Maint: {(allocation.maintenance_priority ?? []).join(", ") || "—"}
              · Bottlenecks: {(allocation.bottlenecks ?? []).join(", ") || "—"}
            </p>
          )}
        </section>
      )}

      {conf && (
        <section className="grid gap-5 lg:grid-cols-3">
          <div className="plate p-5">
            <p className="eyebrow text-[var(--accent)]">Twin confidence</p>
            <p className="serif mt-2 text-4xl text-[var(--ink)]">{conf.score_pct}%</p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">{conf.band} · {conf.policy.replace(/_/g, " ")}</p>
            <ul className="mt-4 space-y-1 text-[11px] text-[var(--ink-faint)]">
              {Object.entries(conf.breakdown ?? {}).map(([k, v]) => (
                <li key={k} className="flex justify-between gap-4"><span>{k.replace(/_/g, " ")}</span><span className="mono">{v}%</span></li>
              ))}
            </ul>
            {hybrid && (
              <p className="mt-3 text-[10px] text-[var(--ink-faint)]">
                Physics/ML agreement {(hybrid.mean_physics_ml_agreement * 100).toFixed(0)}% · source {hybrid.ml_source}
              </p>
            )}
          </div>
          <div className="plate p-5 lg:col-span-2">
            <p className="eyebrow text-[var(--accent)]">Inferred subsurface state</p>
            <div className="mt-4 max-h-56 overflow-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-[var(--line)]">
                    <th className="eyebrow py-1">Variable</th>
                    <th className="eyebrow">Value</th>
                    <th className="eyebrow">Conf</th>
                    <th className="eyebrow">Kind</th>
                    <th className="eyebrow">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {inferred.slice(0, 14).map((row) => (
                    <tr key={row.id} className="border-b border-[var(--line)]">
                      <td className="py-1">{row.id.replace(/_/g, " ")}</td>
                      <td className="mono">{typeof row.value === "number" ? row.value.toFixed(2) : String(row.value)} {row.unit}</td>
                      <td className="mono">{(row.confidence * 100).toFixed(0)}%</td>
                      <td>{row.kind}</td>
                      <td className="text-[var(--ink-faint)]">{row.method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {(pdx || chain) && (
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="plate p-5">
            <p className="eyebrow text-[var(--accent)]">Probabilistic SRP diagnosis</p>
            <p className="mt-2 text-sm text-[var(--ink-muted)]">Primary: {pdx?.primary?.replace(/_/g, " ")}</p>
            <div className="mt-4 space-y-2">
              {(pdx?.items ?? []).slice(0, 6).map((it) => (
                <div key={it.condition}>
                  <div className="flex justify-between text-xs">
                    <span>{it.condition.replace(/_/g, " ")}</span>
                    <span className="mono">{(it.probability * 100).toFixed(0)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 bg-[rgba(232,226,214,0.08)]">
                    <div className="h-full bg-[var(--accent)]" style={{ width: `${it.probability * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="plate p-5">
            <p className="eyebrow text-[var(--accent)]">Causal chain</p>
            <p className="mt-2 text-sm text-[var(--ink)]">{chain?.title}</p>
            <ol className="mt-4 space-y-2 text-xs text-[var(--ink-muted)]">
              {(chain?.steps ?? []).map((s) => (
                <li key={s.id}>↓ {s.text}: <span className="mono text-[var(--ink)]">{s.value}</span></li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-[var(--accent)]">{chain?.diagnosis}</p>
            {tlEvents.length > 0 && (
              <p className="mt-3 text-[10px] text-[var(--ink-faint)]">
                Timeline: {tlEvents.map((e) => e.label).join(" · ")}
              </p>
            )}
          </div>
        </section>
      )}

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="plate p-5 lg:col-span-2">
          <p className="eyebrow text-[var(--accent)]">
            {String(twin.phase)} · cycle {String(twin.css_cycle_id)} · day {String(twin.cycle_day)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Vital k="Oil" v={fmtUnc(unc?.oil_rate_bopd)} u="BOPD" />
            <Vital k="Temp" v={fmtUnc(unc?.temperature_c)} u="°C" />
            <Vital k="Visc" v={fmtUnc(unc?.viscosity_cp)} u="cP" />
            <Vital k="Fail" v={fmtUncPct(unc?.failure_probability)} />
            <Vital k="Chamber R" v={`${twin.heated_radius_m}`} u="m" />
            <Vital k="SPM" v={`${twin.spm}`} />
            <Vital k="Rod stress" v={`${twin.rod_stress}`} u="MPa" />
            <Vital k="Health" v={`${twin.equipment_health}`} />
          </div>
        </div>
        <div className="plate p-5">
          <p className="eyebrow text-[var(--accent)]">Time machine</p>
          <p className="mt-2 text-xs text-[var(--ink-faint)]">Recompute physics at cycle + day — not a label swap.</p>
          <div className="mt-4 flex gap-2">
            <label className="flex-1 text-xs">
              Cycle
              <input type="number" className="mt-1 w-full" value={cycle} onChange={(e) => setCycle(Number(e.target.value))} />
            </label>
            <label className="flex-1 text-xs">
              Day
              <input type="number" className="mt-1 w-full" value={day} onChange={(e) => setDay(Number(e.target.value))} />
            </label>
          </div>
          <button
            type="button"
            className="btn-primary mt-4 w-full"
            disabled={busy}
            onClick={() => run(async () => { await postTwinlab(`reconstruct/${wellId}`, { cycle, day }); await reload(); })}
          >
            Reconstruct
          </button>
          <label className="mt-4 block text-xs">
            Cycle cutoff day {cutoff}
            <input className="slider mt-2" type="range" min={16} max={32} value={cutoff} onChange={(e) => setCutoff(Number(e.target.value))} />
          </label>
          <button
            type="button"
            className="btn-ghost mt-2 w-full"
            disabled={busy}
            onClick={() => run(async () => { await postTwinlab(`cutoff/${wellId}`, { cycle_cutoff_day: cutoff }); await reload(); })}
          >
            Apply cutoff
          </button>
        </div>
      </section>

      <section className="plate p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="eyebrow text-[var(--accent)]">CSS horizon · baseline vs optimized</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => run(async () => {
                const h = await postTwinlab(`horizon/${wellId}`, { days: 45 });
                setHorizon(h);
                setPlayIdx(0);
                setPlaying(false);
              })}
            >
              Simulate 45 d
            </button>
            <button type="button" className="btn-ghost" disabled={!horizon} onClick={() => setPlaying((p) => !p)}>
              {playing ? "Pause" : "Play"}
            </button>
            <button type="button" className="btn-ghost" disabled={!horizon} onClick={() => { setPlayIdx(0); setPlaying(false); }}>
              Rewind
            </button>
            {[1, 2, 4].map((s) => (
              <button key={s} type="button" className={speed === s ? "btn-primary" : "btn-ghost"} onClick={() => setSpeed(s)}>
                {s}×
              </button>
            ))}
            {horizon && (
              <button
                type="button"
                className="btn-ghost"
                disabled={busy || !cursor}
                onClick={() => run(async () => {
                  const pt = ((horizon.baseline as { points: { cycle: number; cycle_day: number }[] }).points)[playIdx];
                  if (pt) await postTwinlab(`reconstruct/${wellId}`, { cycle: pt.cycle, day: pt.cycle_day });
                  await reload();
                })}
              >
                Sync twin to cursor
              </button>
            )}
          </div>
        </div>
        {horizon && (
          <p className="mt-3 text-xs text-[var(--ink-muted)]">
            Day {playIdx} · cum oil base {String(horizon.cumulative_oil_baseline)} vs opt {String(horizon.cumulative_oil_optimized)}
            {cursor ? ` · T ${cursor.temp_base?.toFixed?.(1)} / ${cursor.temp_opt?.toFixed?.(1)} °C · R ${cursor.r_base} / ${cursor.r_opt} m` : ""}
          </p>
        )}
        <div className="mt-4 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={horizonPts}>
              <CartesianGrid stroke="rgba(232,226,214,0.05)" vertical={false} />
              <XAxis dataKey="sim_day" tick={{ fill: "#6b665c", fontSize: 10 }} />
              <YAxis tick={{ fill: "#6b665c", fontSize: 10 }} />
              <Tooltip contentStyle={tip} />
              <Legend />
              <Line type="monotone" dataKey="oil_base" stroke="#7a9bb8" name="Oil base" dot={false} />
              <Line type="monotone" dataKey="oil_opt" stroke="#d4a05a" name="Oil opt" dot={false} />
              <Line type="monotone" dataKey="r_base" stroke="#6f9f7a" name="R base m" dot={false} />
              <Line type="monotone" dataKey="r_opt" stroke="#c45c4a" name="R opt m" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {horizonPts.length > 1 && (
          <input
            className="slider mt-4 w-full"
            type="range"
            min={0}
            max={horizonPts.length - 1}
            value={playIdx}
            onChange={(e) => { setPlaying(false); setPlayIdx(Number(e.target.value)); }}
          />
        )}
      </section>

      {alerts.length > 0 && (
        <section className="plate p-5">
          <p className="eyebrow text-[var(--accent)]">Intelligent alerts</p>
          <div className="mt-4 space-y-3">
            {alerts.map((a) => (
              <div key={a.code} className="border-l border-[var(--accent)] pl-3">
                <p className="text-sm text-[var(--ink)]">{a.severity} · {a.code}</p>
                <p className="text-xs text-[var(--ink-muted)]">Cause: {a.cause} · Evidence: {a.evidence}</p>
                <p className="text-xs text-[var(--ink-faint)]">Consequence: {a.predicted_consequence}</p>
                <p className="mt-1 text-xs text-[var(--ink)]">{a.recommended_action}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="plate p-5">
        <p className="eyebrow text-[var(--accent)]">Wellbore T / μ / P vs depth</p>
        <div className="mt-4 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={wellbore?.points ?? []}>
              <CartesianGrid stroke="rgba(232,226,214,0.05)" vertical={false} />
              <XAxis dataKey="depth_m" tick={{ fill: "#6b665c", fontSize: 10 }} />
              <YAxis tick={{ fill: "#6b665c", fontSize: 10 }} />
              <Tooltip contentStyle={tip} />
              <Legend />
              <Line type="monotone" dataKey="temperature_c" stroke="#7a9bb8" name="T °C" dot={false} />
              <Line type="monotone" dataKey="viscosity_cp" stroke="#d4a05a" name="μ cP" dot={false} />
              <Line type="monotone" dataKey="pressure_bar" stroke="#6f9f7a" name="P bar" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="plate p-5">
          <p className="eyebrow text-[var(--accent)]">Polished-rod / downhole cards</p>
          <div className="mt-4 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={card}>
                <CartesianGrid stroke="rgba(232,226,214,0.05)" />
                <XAxis dataKey="position_m" type="number" tick={{ fill: "#6b665c", fontSize: 10 }} name="pos" />
                <YAxis tick={{ fill: "#6b665c", fontSize: 10 }} />
                <Tooltip contentStyle={tip} />
                <Legend />
                <Line dataKey="surface" stroke="#d4a05a" name="Surface kN" dot={false} type="monotone" />
                <Line dataKey="downhole" stroke="#7a9bb8" name="Downhole kN" dot={false} type="monotone" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="plate p-5">
          <p className="eyebrow text-[var(--accent)]">Acceleration vs position</p>
          <div className="mt-4 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={card}>
                <CartesianGrid stroke="rgba(232,226,214,0.05)" />
                <XAxis dataKey="position_m" type="number" tick={{ fill: "#6b665c", fontSize: 10 }} />
                <YAxis tick={{ fill: "#6b665c", fontSize: 10 }} />
                <Tooltip contentStyle={tip} />
                <Line dataKey="accel" stroke="#c45c4a" name="a" dot={false} type="monotone" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 mono text-xs text-[var(--ink-muted)]">
            Goodman mean {goodman?.mean_stress_mpa} / alt {goodman?.alt_stress_mpa} MPa · fillage {String(srp.pump_fillage)} ·
            drag {String(srp.hydrodynamic_drag_kn)} kN · buckle {String(srp.buckling_tendency)}
          </p>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="plate p-5">
          <p className="eyebrow text-[var(--accent)]">Fault injection</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {FAULTS.map((f) => (
              <button
                key={f}
                type="button"
                className="btn-ghost"
                disabled={busy}
                onClick={() => run(async () => { await postTwinlab(`fault/${wellId}`, { fault: f }); await reload(); })}
              >
                {f.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <div className="mt-5 border-t border-[var(--line)] pt-4">
            <p className="eyebrow" style={{ color: diagnosis?.severity === "Critical" ? "var(--bad)" : diagnosis?.severity === "Warning" ? "var(--warn)" : "var(--good)" }}>
              {diagnosis?.severity}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--ink-muted)]">
              {(diagnosis?.evidence ?? []).map((e) => <li key={e}>· {e}</li>)}
            </ul>
            <p className="mt-3 text-sm text-[var(--ink)]">{diagnosis?.recommended_action}</p>
            <p className="mt-2 text-xs text-[var(--ink-faint)]">{diagnosis?.predicted_consequence}</p>
            <p className="mt-2 text-xs text-[var(--ink-faint)]">{(diagnosis?.likely_causes ?? []).join(" · ")}</p>
          </div>
        </div>
        <div className="plate p-5">
          <p className="eyebrow text-[var(--accent)]">Prescriptive maintenance</p>
          <div className="mt-4 space-y-4">
            {(maint?.recommendations ?? []).map((r) => (
              <div key={r.what} className="border-l border-[var(--accent)] pl-3">
                <p className="text-sm text-[var(--ink)]">{r.what} · {r.when}</p>
                <p className="text-xs text-[var(--ink-muted)]">{r.why}</p>
                <p className="mt-1 text-[10px] text-[var(--ink-faint)]">Reduces {r.risk_reduced}. {r.consequence}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="plate p-5">
        <p className="eyebrow text-[var(--accent)]">VFD governor · asymmetric downstroke</p>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Current SPM {gov?.current_spm} → recommended {gov?.recommended_spm} @ VFD {gov?.recommended_vfd}%
        </p>
        {gov?.asymmetric && (
          <p className="mt-2 text-xs text-[var(--ink)]">
            Up {gov.asymmetric.upstroke_spm} / down {gov.asymmetric.downstroke_spm} SPM · downstroke {gov.asymmetric.downstroke_modulation_pct}%
            <span className="mt-1 block text-[var(--ink-faint)]">{gov.asymmetric.reason}</span>
          </p>
        )}
        <ul className="mt-3 space-y-1 text-xs text-[var(--ink-faint)]">
          {(gov?.reasons ?? []).map((r) => (
            <li key={r.text}><span className="text-[var(--accent)]">{r.type}</span> — {r.text}</li>
          ))}
        </ul>
        {safety && (
          <div className="mt-4 border-t border-[var(--line)] pt-4">
            <p className="eyebrow">Safety interlocks · gate {safety.gate}</p>
            <div className="mt-2 max-h-40 overflow-auto">
              <table className="w-full text-left text-[10px]">
                <thead>
                  <tr className="border-b border-[var(--line)]">
                    <th className="eyebrow py-1">Parameter</th>
                    <th className="eyebrow">Value</th>
                    <th className="eyebrow">Limit</th>
                    <th className="eyebrow">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(safety.constraints ?? []).map((c) => (
                    <tr key={c.parameter} className="border-b border-[var(--line)]">
                      <td className="py-1">{c.parameter}</td>
                      <td className="mono">{c.current}</td>
                      <td className="mono">{c.limit}</td>
                      <td className={c.status === "BLOCKED" ? "text-[var(--bad)]" : c.status === "WARNING" ? "text-[var(--warn)]" : "text-[var(--good)]"}>{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-primary" disabled={busy} onClick={() => run(async () => {
            const res = await postTwinlab(`control/${wellId}`, { autonomous: true });
            if (res.blocked) setError(String(res.reason ?? "Autonomous apply blocked by confidence/safety"));
            await reload();
          })}>
            Autonomous
          </button>
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => run(async () => { await postTwinlab(`control/${wellId}`, { autonomous: false, spm: gov?.current_spm }); await reload(); })}>
            Manual hold
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={busy}
            onClick={() => run(async () => setDispatch(await postTwinlab(`dispatch/${wellId}/simulate`, { spm: gov?.recommended_spm })))}
          >
            Simulate change
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={busy || !(dispatch as { pending?: { allow_dispatch?: boolean } })?.pending?.allow_dispatch}
            onClick={() => run(async () => { await postTwinlab(`dispatch/${wellId}/approve`); setDispatch(null); await reload(); })}
          >
            Approve / dispatch
          </button>
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => run(async () => { await postTwinlab(`dispatch/${wellId}/reject`); setDispatch(null); })}>
            Reject
          </button>
        </div>
        {dispatch && (
          <pre className="mt-3 overflow-x-auto text-[11px] text-[var(--ink-muted)]">{JSON.stringify((dispatch as { pending: unknown }).pending, null, 2)}</pre>
        )}
        <p className="mt-2 text-[10px] text-[var(--ink-faint)]">Demo / synthetic telemetry — not connected to OIL field equipment.</p>
      </section>

      {eopts && (
        <section className="plate p-5">
          <p className="eyebrow text-[var(--accent)]">Intervention vs operation</p>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">{eopts.rationale}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {eopts.options.map((o) => (
              <div key={o.id} className={`plate-inset p-3 ${eopts.recommended === o.id ? "border border-[var(--accent)]" : ""}`}>
                <p className="text-xs text-[var(--ink)]">{o.label}</p>
                <p className="mono mt-2 text-[11px] text-[var(--ink-muted)]">{o.oil.toFixed(1)} BOPD · fail {(o.fail * 100).toFixed(1)}%</p>
                <p className="mono mt-1 text-sm text-[var(--accent)]">₹{o.npv_inr.toLocaleString()} · ${o.npv_usd.toFixed(0)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="plate p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="eyebrow text-[var(--accent)]">Joint CSS + SRP optimizer</p>
          <div className="flex flex-wrap gap-2">
            {(["balanced", "recovery", "reliability", "energy"] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                className="btn-ghost"
                disabled={busy}
                onClick={() => run(async () => {
                  await postTwinlab(`weights/${wellId}`, { preset });
                  setOpt(await postTwinlab(`optimize/${wellId}`));
                })}
              >
                {preset}
              </button>
            ))}
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => run(async () => setOpt(await postTwinlab(`optimize/${wellId}`)))}
            >
              Run physics Pareto
            </button>
          </div>
        </div>
        {opt && (
          <div className="mt-5 space-y-4 text-sm">
            <p className="text-[var(--ink-muted)]">
              Feasible {String(opt.n_feasible)} · Pareto {String(opt.n_pareto)} · baseline NPV ${String((opt.baseline as { npv: number })?.npv)}
              · weights {JSON.stringify(opt.objective_weights)}
            </p>
            {strategies.length > 0 && (
              <div className="grid gap-3 md:grid-cols-3">
                {strategies.map((s) => (
                  <div key={s.strategy} className="plate-inset p-3">
                    <p className="eyebrow">{s.strategy.replace(/_/g, " ")}</p>
                    <p className="mono mt-2 text-[11px]">{s.oil.toFixed(1)} BOPD (+{s.incremental_oil}) · SOR {s.sor.toFixed(2)}</p>
                    <p className="mono text-[11px] text-[var(--ink-muted)]">E {s.energy.toFixed(1)} kW · fail {(s.failure_probability * 100).toFixed(1)}% · NPV ${s.npv.toFixed(0)}</p>
                    <button
                      type="button"
                      className="btn-ghost mt-2"
                      disabled={busy}
                      onClick={() => run(async () => {
                        await postTwinlab(`state/${wellId}/apply`, {
                          parameters: { ...s.parameters, cycle_cutoff_day: s.cycle_cutoff_day },
                        });
                        await reload();
                      })}
                    >
                      Apply strategy
                    </button>
                  </div>
                ))}
              </div>
            )}
            {Boolean(opt.recommended) && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => run(async () => {
                  const rec = opt.recommended as { parameters: Record<string, number>; cycle_cutoff_day: number | null };
                  await postTwinlab(`state/${wellId}/apply`, {
                    parameters: { ...rec.parameters, cycle_cutoff_day: rec.cycle_cutoff_day },
                  });
                  await reload();
                })}
              >
                Apply weighted recommendation
              </button>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="h-[220px]">
                <p className="eyebrow mb-2">Oil vs SOR</p>
                <ResponsiveContainer width="100%" height="90%">
                  <ScatterChart>
                    <XAxis type="number" dataKey="oil" name="oil" tick={{ fill: "#6b665c", fontSize: 10 }} />
                    <YAxis type="number" dataKey="sor" name="sor" tick={{ fill: "#6b665c", fontSize: 10 }} />
                    <Tooltip contentStyle={tip} />
                    <Scatter data={pareto.map((p) => ({ oil: p.objectives.oil, sor: p.objectives.sor }))} fill="#d4a05a" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="h-[220px]">
                <p className="eyebrow mb-2">Oil vs failure risk</p>
                <ResponsiveContainer width="100%" height="90%">
                  <ScatterChart>
                    <XAxis type="number" dataKey="oil" tick={{ fill: "#6b665c", fontSize: 10 }} />
                    <YAxis type="number" dataKey="fail" tick={{ fill: "#6b665c", fontSize: 10 }} />
                    <Tooltip contentStyle={tip} />
                    <Scatter data={pareto.map((p) => ({ oil: p.objectives.oil, fail: p.objectives.fail }))} fill="#7a9bb8" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="max-h-48 overflow-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-[var(--line)]">
                    <th className="eyebrow py-1">Oil</th>
                    <th className="eyebrow">SOR</th>
                    <th className="eyebrow">NPV</th>
                    <th className="eyebrow">Fail</th>
                    <th className="eyebrow">Energy</th>
                    <th className="eyebrow" />
                  </tr>
                </thead>
                <tbody>
                  {pareto.slice(0, 16).map((p, i) => (
                    <tr key={i} className="border-b border-[var(--line)]">
                      <td className="mono py-1">{p.objectives.oil.toFixed(1)}</td>
                      <td className="mono">{p.objectives.sor.toFixed(2)}</td>
                      <td className="mono">{p.objectives.npv.toFixed(0)}</td>
                      <td className="mono">{(p.objectives.fail * 100).toFixed(1)}%</td>
                      <td className="mono">{p.objectives.energy.toFixed(1)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-ghost"
                          disabled={busy}
                          onClick={() => run(async () => {
                            await postTwinlab(`state/${wellId}/apply`, {
                              parameters: { ...p.parameters, cycle_cutoff_day: p.cycle_cutoff_day },
                            });
                            await reload();
                          })}
                        >
                          Apply
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="plate p-5">
          <p className="eyebrow text-[var(--accent)]">What-if / counterfactuals</p>
          <label className="mt-4 block text-xs">
            Steam change %
            <input className="slider mt-2" type="range" min={-30} max={40} value={steamPct} onChange={(e) => setSteamPct(Number(e.target.value))} />
            <span className="mono text-[var(--accent)]"> {steamPct}%</span>
          </label>
          <button
            type="button"
            className="btn-primary mt-4"
            disabled={busy}
            onClick={() => run(async () => setWhat(await postTwinlab(`whatif/${wellId}`, { steam_pct: steamPct })))}
          >
            Simulate steam
          </button>
          <div className="mt-3 flex flex-wrap gap-2">
            {["increase_steam", "reduce_spm", "change_soak", "limited_steam", "faster_cooling", "delay_maintenance", "maintain_now", "rod_risk_70"].map((name) => (
              <button
                key={name}
                type="button"
                className="btn-ghost"
                disabled={busy}
                onClick={() => run(async () => setWhat(await postTwinlab(`scenario/${wellId}`, { name })))}
              >
                {name.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          {what && (
            <pre className="mt-4 max-h-48 overflow-auto text-[11px] text-[var(--ink-muted)]">{JSON.stringify(what, null, 2)}</pre>
          )}
        </div>
        <div className="plate p-5">
          <p className="eyebrow text-[var(--accent)]">Alternate futures</p>
          <div className="mt-4 flex gap-2">
            {[30, 60, 90].map((h) => (
              <button
                key={h}
                type="button"
                className="btn-ghost"
                disabled={busy}
                onClick={() => run(async () => setBranches(await postTwinlab(`branches/${wellId}`, { horizon_days: h })))}
              >
                {h} d
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-2 text-xs">
            {((branches?.branches as { name: string; cumulative_oil: number; end_npv: number; end_failure: number }[]) ?? []).map((b) => (
              <div key={b.name} className="flex items-center justify-between gap-2 border-b border-[var(--line)] py-2">
                <span className="text-[var(--ink)]">{b.name}</span>
                <span className="mono text-[var(--ink-muted)]">{b.cumulative_oil} bbl · ${b.end_npv} · fail {(b.end_failure * 100).toFixed(1)}%</span>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={busy}
                  onClick={() => run(async () => { await postTwinlab(`branch/${wellId}/apply`, { name: b.name }); await reload(); })}
                >
                  Apply
                </button>
              </div>
            ))}
          </div>
          {similar && (
            <p className="mt-4 text-[10px] text-[var(--ink-faint)]">
              Cross-well: {(similar.peers ?? []).slice(0, 3).map((p) => `${p.well_id} ${(p.similarity * 100).toFixed(0)}%`).join(" · ")}. {similar.transfer_note}
            </p>
          )}
          {tscale && (
            <p className="mt-2 text-[10px] text-[var(--ink-faint)]">{tscale.conflict_resolution}</p>
          )}
        </div>
      </section>

      {evlog.length > 0 && (
        <section className="plate p-5">
          <p className="eyebrow text-[var(--accent)]">Engineering event log</p>
          <div className="mt-4 space-y-2 text-xs">
            {evlog.slice().reverse().map((ev, i) => (
              <div key={`${ev.condition}-${i}`} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] py-2">
                <span>{ev.severity} · {ev.subsystem} · {ev.condition}</span>
                <button type="button" className="btn-ghost" disabled={busy || ev.acknowledged} onClick={() => run(async () => { await postTwinlab(`ack/${wellId}`, { code: ev.condition }); await reload(); })}>
                  {ev.acknowledged ? "Acked" : "Acknowledge"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="plate p-5">
        <p className="eyebrow text-[var(--accent)]">Predict → observe → error → recalibrate</p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-xs">
            Observed oil (BOPD)
            <input className="mt-1 block" value={obs} onChange={(e) => setObs(e.target.value)} />
          </label>
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={() => run(async () => {
              setLearn(await postTwinlab(`observe/${wellId}`, { observed_oil_bopd: Number(obs) }));
              await reload();
            })}
          >
            Record observation
          </button>
        </div>
        {learn && (
          <p className="mt-3 text-sm text-[var(--ink-muted)]">
            Predicted {String(learn.predicted_oil)} vs observed {String(learn.observed_oil)} · error {String(learn.error_pct)}% ·
            thermal bias {String(learn.thermal_bias)} · MAE {String(learn.mae_oil_pct)}%
          </p>
        )}
      </section>

      {plan.length > 0 && (
        <section className="plate p-5">
          <p className="eyebrow text-[var(--accent)]">Field action ranking</p>
          <table className="mt-4 w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--line)]">
                <th className="eyebrow py-2">Well</th>
                <th className="eyebrow">Urgency</th>
                <th className="eyebrow">Oil</th>
                <th className="eyebrow">Fail</th>
                <th className="eyebrow">Action</th>
              </tr>
            </thead>
            <tbody>
              {plan.map((r) => (
                <tr key={r.well_id} className="border-b border-[var(--line)]">
                  <td className="py-2">{r.well_id}</td>
                  <td className="mono">{r.urgency}</td>
                  <td className="mono">{r.oil}</td>
                  <td className="mono">{(r.fail * 100).toFixed(1)}%</td>
                  <td>{r.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {prints.length > 0 && (
        <section className="plate p-5">
          <p className="eyebrow text-[var(--accent)]">Behavioral fingerprints</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-[var(--line)]">
                  {Object.keys(prints[0]).map((k) => (
                    <th key={k} className="eyebrow px-2 py-2">{k.replace(/_/g, " ")}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prints.map((row) => (
                  <tr key={String(row.well_id)} className="border-b border-[var(--line)]">
                    {Object.values(row).map((v, i) => (
                      <td key={i} className="mono px-2 py-2">{typeof v === "number" ? v.toFixed(2) : String(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="mono text-[10px] text-[var(--ink-faint)]">{String(twin.demo_disclaimer)} NPV 30d ${econ?.net_operating_value}</p>
    </div>
  );
}

function Vital({ k, v, u }: { k: string; v: string; u?: string }) {
  return (
    <div>
      <div className="eyebrow">{k}</div>
      <div className="mono mt-1 text-[var(--ink)]">
        {v}
        {u && <span className="ml-1 text-[10px] text-[var(--ink-faint)]">{u}</span>}
      </div>
    </div>
  );
}

function fmtUnc(p?: { value: number; sigma: number }) {
  if (!p) return "—";
  return `${p.value.toFixed(1)} ± ${p.sigma}`;
}
function fmtUncPct(p?: { value: number; sigma: number }) {
  if (!p) return "—";
  return `${(p.value * 100).toFixed(1)}% ± ${(p.sigma * 100).toFixed(1)} pp`;
}
