import { useEffect, useState } from "react";
import { getWellExplainability } from "../services/api";
import type { WellExplainability } from "../types";

interface Props {
  wellId: string;
}

export function ExplainabilityPanel({ wellId }: Props) {
  const [data, setData] = useState<WellExplainability | null>(null);

  useEffect(() => {
    getWellExplainability(wellId).then(setData).catch(() => setData(null));
  }, [wellId]);

  if (!data) return null;

  return (
    <section className="fade-in plate p-6 md:p-8">
      <div className="flex items-center gap-3">
        <span className="tick-mark" />
        <p className="eyebrow text-[var(--accent)]">Attribution · {data.method}</p>
      </div>
      <h3 className="serif mt-2 text-2xl font-semibold text-[var(--ink)]">Why this prediction</h3>
      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <ContribTable title="Production drivers" note={data.production_forecast.note} rows={data.production_forecast.contributions} />
        <ContribTable title="Failure risk drivers" note={data.failure_risk.note} rows={data.failure_risk.contributions} />
      </div>
      <p className="mt-6 mono text-[10px] text-[var(--ink-faint)]">{data.disclaimer}</p>
    </section>
  );
}

function ContribTable({
  title,
  note,
  rows,
}: {
  title: string;
  note: string;
  rows: WellExplainability["production_forecast"]["contributions"];
}) {
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.shap_value)), 0.001);

  return (
    <div>
      <h4 className="eyebrow text-[var(--accent)]">{title}</h4>
      <p className="mt-1 text-xs text-[var(--ink-faint)]">{note}</p>
      <div className="mt-5 space-y-4">
        {rows.map((r) => {
          const pct = (Math.abs(r.shap_value) / maxAbs) * 100;
          const pos = r.shap_value > 0;
          return (
            <div key={r.feature}>
              <div className="mb-1.5 flex justify-between gap-2 text-xs">
                <span className="text-[var(--ink-muted)]">{r.feature.replace(/_/g, " ")}</span>
                <span className={`mono ${pos ? "text-[var(--good)]" : "text-[var(--warn)]"}`}>
                  {r.shap_value.toFixed(4)}
                </span>
              </div>
              <div className="relative h-1 bg-[rgba(232,226,214,0.06)]">
                <div
                  className="absolute top-0 h-full"
                  style={{
                    width: `${pct}%`,
                    left: pos ? "50%" : undefined,
                    right: pos ? undefined : "50%",
                    background: pos ? "var(--good)" : "var(--warn)",
                    transform: pos ? undefined : "translateX(0)",
                    marginLeft: pos ? 0 : undefined,
                    marginRight: !pos ? 0 : undefined,
                    ...(pos
                      ? { left: "50%", width: `${pct / 2}%` }
                      : { right: "50%", width: `${pct / 2}%`, left: "auto" }),
                  }}
                />
                <div className="absolute left-1/2 top-0 h-full w-px bg-[var(--line-strong)]" />
              </div>
              <p className="mt-1 text-[10px] text-[var(--ink-faint)]">{r.direction}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
