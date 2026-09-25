import { useEffect, useState } from "react";
import { getPhysicsTwin } from "../services/api";
import type { AlertsResponse } from "../types";

interface Props {
  alerts: AlertsResponse | null;
  loading: boolean;
  wellId?: string;
}

export function AlertsPage({ alerts, loading, wellId }: Props) {
  const [physics, setPhysics] = useState<{
    severity: string;
    code: string;
    cause: string;
    evidence: string;
    predicted_consequence: string;
    recommended_action: string;
  }[]>([]);

  useEffect(() => {
    if (!wellId) return;
    getPhysicsTwin(wellId)
      .then((t) => setPhysics((t.alerts as typeof physics) ?? []))
      .catch(() => setPhysics([]));
  }, [wellId]);

  if (loading) {
    return (
      <div className="border border-[#111111] bg-[#F5F5F5] p-8 text-center font-mono text-xs text-[#525252]">
        RETRIEVING ANOMALY TELEMETRY & RISK SENTRY RECORDS…
      </div>
    );
  }

  if (!alerts) {
    return (
      <div className="border border-[#111111] bg-[#F5F5F5] p-8 text-center font-mono text-xs text-[#525252]">
        NO TELEMETRY RECORD LOADED. RUN AI OPTIMIZATION TO SCAN FOR DISPATCH ALERTS.
      </div>
    );
  }

  return (
    <div className="fade-in space-y-10">
      {/* Newspaper Incident Banner */}
      <div className="border-b-2 border-[#111111] pb-4">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#CC0000]">
          OPERATIONAL RISK BOARD & INCIDENT BULLETINS · BOREHOLE {wellId}
        </span>
        <h2 className="mt-1 font-serif text-4xl sm:text-5xl font-black text-[#111111] uppercase">
          Field Incident & Risk Ledger
        </h2>
        <p className="mt-2 font-body text-sm text-[#525252] max-w-2xl leading-relaxed">
          Real-time anomaly detection combining statistical surrogate risk boundaries with
          subsurface acoustic dynagraph evidence and thermal dissipation physics.
        </p>
      </div>

      {/* Physics Twin Active Anomaly Alerts */}
      {physics.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#111111] pb-2 font-mono text-xs font-bold text-[#111111] uppercase tracking-wider">
            <span>PHYSICS-INFORMED DIAGNOSTIC DISPATCHES</span>
            <span className="bg-[#CC0000] text-white px-2 py-0.5 text-[9px]">
              {physics.length} ACTIVE INCIDENT(S)
            </span>
          </div>

          <div className="space-y-4">
            {physics.map((a) => (
              <div
                key={a.code}
                className="border-2 border-[#111111] bg-white p-5 hard-shadow relative"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#111111] pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="bg-[#CC0000] text-white px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider">
                      {a.severity}
                    </span>
                    <span className="font-mono text-xs font-bold text-[#111111]">
                      DISPATCH CODE: {a.code}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[#737373]">
                    PRIORITY ACTION REQUIRED
                  </span>
                </div>

                <div className="mt-4">
                  <div className="font-serif text-lg font-bold text-[#111111]">
                    Remedial Instruction: {a.recommended_action}
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs bg-[#F9F9F7] border border-[#111111] p-3">
                    <div>
                      <span className="font-bold text-[#737373] uppercase">PRIMARY ROOT CAUSE:</span>
                      <p className="text-[#111111] mt-0.5">{a.cause}</p>
                    </div>
                    <div>
                      <span className="font-bold text-[#737373] uppercase">PREDICTED CONSEQUENCE:</span>
                      <p className="text-[#CC0000] font-semibold mt-0.5">{a.predicted_consequence}</p>
                    </div>
                    <div className="md:col-span-2 border-t border-[#E5E5E0] pt-2">
                      <span className="font-bold text-[#737373] uppercase">TELEMETRY EVIDENCE:</span>
                      <p className="text-[#525252] mt-0.5">{a.evidence}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Machine Learning Statistical Risk Alerts */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#111111] pb-2 font-mono text-xs font-bold text-[#111111] uppercase tracking-wider">
          <span>SURROGATE MODEL STATISTICAL THRESHOLD ALERTS</span>
          <span className="text-[#737373] text-[10px]">
            TOTAL: {alerts.alert_count} CONDITIONS
          </span>
        </div>

        {alerts.alerts.length === 0 ? (
          <div className="border-2 border-[#1b6a38] bg-[#F5FFF8] p-12 text-center">
            <span className="bg-[#1b6a38] text-white px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest">
              TELEGRAM STATUS: ALL CLEAR
            </span>
            <h3 className="mt-3 font-serif text-2xl font-black text-[#1b6a38] uppercase">
              No Operational Violations Detected
            </h3>
            <p className="mt-2 font-body text-xs text-[#525252] max-w-md mx-auto">
              All subterranean temperature, pumping load, and steam-oil ratio sensors indicate nominal
              operating regimes within specified Baghewala parameters.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.alerts.map((a) => {
              const isCrit = a.severity === "CRITICAL";
              const isWarn = a.severity === "WARNING";
              const badgeBg = isCrit ? "bg-[#CC0000]" : isWarn ? "bg-[#a65800]" : "bg-[#111111]";

              return (
                <div
                  key={`${a.code}-${a.metric}`}
                  className="border border-[#111111] bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`${badgeBg} text-white px-2 py-0.5 font-mono text-[9px] font-bold uppercase`}>
                        {a.severity}
                      </span>
                      <span className="font-mono text-xs font-bold text-[#111111]">{a.code}</span>
                    </div>
                    <p className="font-serif text-sm font-semibold text-[#111111]">{a.message}</p>
                  </div>

                  <div className="font-mono text-xs text-right shrink-0 border-t sm:border-t-0 sm:border-l border-[#E5E5E0] pt-2 sm:pt-0 sm:pl-4">
                    <div className="text-[10px] text-[#737373] uppercase">{a.metric}</div>
                    <div className="text-sm font-bold text-[#111111]">
                      {a.value.toFixed(3)}{" "}
                      <span className="text-[10px] font-normal text-[#737373]">
                        (LIMIT: {a.threshold})
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
