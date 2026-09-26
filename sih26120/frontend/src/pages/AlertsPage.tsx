import { useEffect, useState } from "react";
import { getPhysicsTwin } from "../services/api";
import type { AlertsResponse } from "../types";

const SEV = {
  CRITICAL: { color: "var(--bad)", label: "Critical", weight: "III" },
  WARNING: { color: "var(--warn)", label: "Warning", weight: "II" },
  INFO: { color: "var(--info)", label: "Info", weight: "I" },
};

interface Props {
  alerts: AlertsResponse | null;
  loading: boolean;
  wellId?: string;
}

export function AlertsPage({ alerts, loading, wellId }: Props) {
  const [physics, setPhysics] = useState<{
    severity: string; code: string; cause: string; evidence: string;
    predicted_consequence: string; recommended_action: string;
  }[]>([]);

  useEffect(() => {
    if (!wellId) return;
    getPhysicsTwin(wellId)
      .then((t) => setPhysics((t.alerts as typeof physics) ?? []))
      .catch(() => setPhysics([]));
  }, [wellId]);

  if (loading) return <p className="mono text-sm text-[var(--ink-faint)]">Loading alerts…</p>;
  if (!alerts) {
    return (
      <p className="text-sm text-[var(--ink-faint)]">
        Run Analyze to generate alerts from model outputs.
      </p>
    );
  }

  return (
    <div className="fade-in space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <span className="tick-mark" />
          <p className="eyebrow text-[var(--accent)]">Risk board</p>
        </div>
        <h2 className="serif mt-2 text-4xl font-semibold text-[var(--ink)]">Alerts</h2>
        <p className="mt-2 max-w-xl text-sm text-[var(--ink-muted)]">
          ML risk board plus physics twin alerts (cause / evidence / consequence / action). Synthetic demo limits.
        </p>
      </div>

      {physics.length > 0 && (
        <section className="space-y-3">
          <p className="eyebrow text-[var(--accent)]">Physics twin</p>
          {physics.map((a) => (
            <div key={a.code} className="plate px-5 py-4">
              <p className="eyebrow">{a.severity} · {a.code}</p>
              <p className="mt-2 text-sm text-[var(--ink)]">{a.recommended_action}</p>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">Cause: {a.cause}</p>
              <p className="text-xs text-[var(--ink-faint)]">Evidence: {a.evidence} · {a.predicted_consequence}</p>
            </div>
          ))}
        </section>
      )}

      {alerts.alerts.length === 0 ? (
        <div className="plate border-[rgba(111,159,122,0.35)] px-6 py-16 text-center">
          <p className="serif text-2xl text-[var(--good)]">All clear</p>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            No active alerts — operating within demo thresholds.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.alerts.map((a) => {
            const sev = SEV[a.severity];
            return (
              <div key={`${a.code}-${a.metric}`} className="plate overflow-hidden">
                <div className="flex">
                  <div
                    className="flex w-16 shrink-0 flex-col items-center justify-center py-5"
                    style={{ background: `color-mix(in srgb, ${sev.color} 18%, transparent)` }}
                  >
                    <span className="serif text-2xl font-semibold" style={{ color: sev.color }}>
                      {sev.weight}
                    </span>
                  </div>
                  <div className="flex-1 px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="eyebrow" style={{ color: sev.color }}>
                        {sev.label}
                      </span>
                      <span className="mono text-[10px] text-[var(--ink-faint)]">{a.code}</span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--ink)]">{a.message}</p>
                    <p className="mt-2 mono text-[11px] text-[var(--ink-faint)]">
                      {a.metric}: {a.value.toFixed(3)} · threshold {a.threshold}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
