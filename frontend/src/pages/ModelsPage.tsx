import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getExplainability } from "../services/api";
import type { ExplainabilityData } from "../types";

interface Props {
  metrics: Record<string, unknown>;
}

export function ModelsPage({ metrics }: Props) {
  const [explain, setExplain] = useState<ExplainabilityData | null>(null);

  useEffect(() => {
    getExplainability().then(setExplain).catch(() => setExplain(null));
  }, []);

  const production = metrics.production as
    | { selected?: Record<string, unknown>; comparison?: Record<string, unknown>[] }
    | undefined;
  const failure = metrics.failure as
    | { selected?: Record<string, unknown>; comparison?: Record<string, unknown>[] }
    | undefined;

  return (
    <div className="fade-in space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <span className="tick-mark" />
          <p className="eyebrow text-[var(--accent)]">Model registry</p>
        </div>
        <h2 className="serif mt-2 text-4xl font-semibold text-[var(--ink)]">Performance</h2>
        <p className="mt-2 max-w-xl text-sm text-[var(--ink-muted)]">
          Candidates compared on synthetic Baghewala data. Selected by validation metrics.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ModelCard title="Production forecast" selected={production?.selected} comparison={production?.comparison} />
        <ModelCard
          title="Failure risk"
          selected={failure?.selected}
          comparison={failure?.comparison}
          isClassification
        />
      </div>

      {explain && (
        <div className="grid gap-5 lg:grid-cols-2">
          <FeatureChart
            title="Production — feature weight"
            features={explain.production_forecast.top_features}
            note={explain.production_forecast.note}
          />
          <FeatureChart
            title="Failure — feature weight"
            features={explain.failure_risk.top_features}
            note={explain.failure_risk.note}
          />
        </div>
      )}

      <p className="mono text-[10px] text-[var(--ink-faint)]">
        {explain?.disclaimer ?? String(metrics.disclaimer ?? "")}
      </p>
    </div>
  );
}

function ModelCard({
  title,
  selected,
  comparison,
  isClassification,
}: {
  title: string;
  selected?: Record<string, unknown>;
  comparison?: Record<string, unknown>[];
  isClassification?: boolean;
}) {
  if (!selected) return null;

  return (
    <section className="plate p-6">
      <p className="eyebrow text-[var(--accent)]">{title}</p>
      <p className="serif mt-2 text-2xl font-semibold text-[var(--ink)]">
        {String(selected.model_name)}
      </p>
      <p className="mono mt-1 text-[10px] uppercase tracking-widest text-[var(--good)]">Selected</p>
      <dl className="mt-6 grid grid-cols-2 gap-4">
        {!isClassification && (
          <>
            <Metric label="MAE" value={selected.mae} />
            <Metric label="RMSE" value={selected.rmse} />
            <Metric label="R²" value={selected.r2} />
          </>
        )}
        {isClassification && (
          <>
            <Metric label="F1" value={selected.f1} />
            <Metric label="ROC-AUC" value={selected.roc_auc} />
          </>
        )}
        <Metric label="Samples" value={selected.samples} />
      </dl>
      {comparison && comparison.length > 0 && (
        <table className="mt-6 w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--line)]">
              <th className="eyebrow py-2 font-medium">Model</th>
              {!isClassification ? (
                <>
                  <th className="eyebrow font-medium">MAE</th>
                  <th className="eyebrow font-medium">R²</th>
                </>
              ) : (
                <>
                  <th className="eyebrow font-medium">F1</th>
                  <th className="eyebrow font-medium">AUC</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {comparison.map((row) => (
              <tr key={String(row.model_name)} className="border-b border-[var(--line)]">
                <td className="py-2.5 text-[var(--ink-muted)]">{String(row.model_name)}</td>
                {!isClassification ? (
                  <>
                    <td className="mono">{Number(row.mae).toFixed(2)}</td>
                    <td className="mono">{Number(row.r2).toFixed(3)}</td>
                  </>
                ) : (
                  <>
                    <td className="mono">{Number(row.f1).toFixed(3)}</td>
                    <td className="mono">{Number(row.roc_auc).toFixed(3)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: unknown }) {
  const display = typeof value === "number" ? value.toFixed(3) : String(value ?? "—");
  return (
    <div className="border-l border-[var(--line-strong)] pl-3">
      <dt className="eyebrow">{label}</dt>
      <dd className="mono mt-0.5 text-lg text-[var(--ink)]">{display}</dd>
    </div>
  );
}

function FeatureChart({
  title,
  features,
  note,
}: {
  title: string;
  features: { feature: string; importance: number }[];
  note: string;
}) {
  const data = features.map((f) => ({ name: f.feature.replace(/_/g, " "), importance: f.importance }));

  return (
    <section className="plate p-6">
      <p className="eyebrow text-[var(--accent)]">{title}</p>
      <p className="mt-1 text-xs text-[var(--ink-faint)]">{note}</p>
      <ResponsiveContainer width="100%" height={220} minWidth={0}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12 }}>
          <XAxis type="number" tick={{ fill: "#6b665c", fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={96}
            tick={{ fill: "#9a9488", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#08090b",
              border: "1px solid rgba(212,160,90,0.3)",
              borderRadius: 0,
              fontFamily: "JetBrains Mono",
            }}
          />
          <Bar dataKey="importance" fill="#d4a05a" radius={[0, 0, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
