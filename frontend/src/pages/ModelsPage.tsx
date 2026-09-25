import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getExplainability } from "../services/api";
import type { ExplainabilityData, FeatureImportance } from "../types";

interface Props {
  metrics: Record<string, unknown>;
}

const newsprintTipStyle = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #111111",
  boxShadow: "3px 3px 0px #111111",
  borderRadius: 0,
  fontSize: 11,
  fontFamily: "JetBrains Mono, monospace",
  color: "#111111",
};

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
    <div className="fade-in space-y-10">
      {/* Title Banner */}
      <div className="border-b-2 border-[#111111] pb-4">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#CC0000]">
          MACHINE LEARNING REGISTRY & VALIDATION ARCHIVE
        </span>
        <h2 className="mt-1 font-serif text-4xl sm:text-5xl font-black text-[#111111] uppercase">
          Surrogate Model Performance
        </h2>
        <p className="mt-2 font-body text-sm text-[#525252] max-w-2xl leading-relaxed">
          Algorithm evaluation benchmarked on Baghewala reservoir operational history.
          Selected models govern constrained simulation search loops and risk boundary assertions.
        </p>
      </div>

      {/* Model Cards */}
      <div className="grid gap-8 lg:grid-cols-2">
        <ModelCard
          title="PRODUCTION SURROGATE REGRESSOR"
          selected={production?.selected}
          comparison={production?.comparison}
        />
        <ModelCard
          title="DOWNHOLE MECHANICAL HAZARD CLASSIFIER"
          selected={failure?.selected}
          comparison={failure?.comparison}
          isClassification
        />
      </div>

      {/* Feature Attribution Charts */}
      {explain && (
        <div className="grid gap-8 lg:grid-cols-2">
          <FeatureChart
            title="Production Forecast — Global Feature Weights"
            features={explain.production_forecast.top_features}
            note={explain.production_forecast.note}
          />
          <FeatureChart
            title="Failure Risk — Global Feature Weights"
            features={explain.failure_risk.top_features}
            note={explain.failure_risk.note}
          />
        </div>
      )}

      <p className="font-mono text-[10px] text-[#737373] border-t border-[#E5E5E0] pt-3 italic">
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
    <section className="border-2 border-[#111111] bg-white p-6 hard-shadow">
      <div className="flex items-center justify-between border-b border-[#111111] pb-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#CC0000]">
          {title}
        </span>
        <span className="bg-[#1b6a38] text-white px-2 py-0.5 font-mono text-[9px] font-bold uppercase">
          PRIMARY CHAMPION
        </span>
      </div>

      <div className="mt-4">
        <h3 className="font-serif text-2xl font-black text-[#111111]">
          {String(selected.model_name)}
        </h3>
        <p className="font-mono text-[10px] text-[#737373] uppercase mt-0.5">
          VALIDATED SURROGATE ENGINE
        </p>
      </div>

      {/* Key Metrics Grid */}
      <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 border-y border-[#111111] py-4 bg-[#F9F9F7] font-mono">
        {!isClassification && (
          <>
            <Metric label="MAE" value={selected.mae} />
            <Metric label="RMSE" value={selected.rmse} />
            <Metric label="R² SCORE" value={selected.r2} />
          </>
        )}
        {isClassification && (
          <>
            <Metric label="F1 SCORE" value={selected.f1} />
            <Metric label="ROC-AUC" value={selected.roc_auc} />
          </>
        )}
        <Metric label="TRAIN SAMPLES" value={selected.samples} />
      </dl>

      {/* Comparison Table */}
      {comparison && comparison.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border border-[#111111]">
            <thead>
              <tr className="border-b border-[#111111] bg-[#111111] text-[#F9F9F7]">
                <th className="px-3 py-2 font-bold uppercase">Candidate Model</th>
                {!isClassification ? (
                  <>
                    <th className="px-3 py-2 font-bold uppercase">MAE</th>
                    <th className="px-3 py-2 font-bold uppercase">R²</th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-2 font-bold uppercase">F1</th>
                    <th className="px-3 py-2 font-bold uppercase">AUC</th>
                  </>
                )}
                <th className="px-3 py-2 font-bold uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E0]">
              {comparison.map((c, i) => {
                const isSelected = c.model_name === selected.model_name;
                return (
                  <tr key={i} className={isSelected ? "bg-[#F5F5F5] font-bold" : "bg-white"}>
                    <td className="px-3 py-2 border-r border-[#E5E5E0]">{String(c.model_name)}</td>
                    {!isClassification ? (
                      <>
                        <td className="px-3 py-2 border-r border-[#E5E5E0]">{formatVal(c.mae)}</td>
                        <td className="px-3 py-2 border-r border-[#E5E5E0]">{formatVal(c.r2)}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 border-r border-[#E5E5E0]">{formatVal(c.f1)}</td>
                        <td className="px-3 py-2 border-r border-[#E5E5E0]">{formatVal(c.roc_auc)}</td>
                      </>
                    )}
                    <td className="px-3 py-2">
                      {isSelected ? (
                        <span className="text-[#1b6a38]">Active</span>
                      ) : (
                        <span className="text-[#737373]">Benchmarked</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function FeatureChart({
  title,
  features,
  note,
}: {
  title: string;
  features: FeatureImportance[];
  note: string;
}) {
  const chartData = features.slice(0, 8).map((f) => ({
    name: f.feature.replace(/_/g, " "),
    importance: f.importance,
  }));

  return (
    <div className="border border-[#111111] bg-white p-6">
      <div className="border-b border-[#111111] pb-3 mb-4">
        <h4 className="font-serif text-xl font-bold text-[#111111]">{title}</h4>
        <p className="font-body text-xs text-[#525252] mt-0.5">{note}</p>
      </div>

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 90, bottom: 5 }}>
            <XAxis
              type="number"
              tick={{ fill: "#525252", fontSize: 10, fontFamily: "JetBrains Mono" }}
              axisLine={{ stroke: "#111111" }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "#111111", fontSize: 10, fontFamily: "JetBrains Mono" }}
              axisLine={{ stroke: "#111111" }}
              width={90}
            />
            <Tooltip contentStyle={newsprintTipStyle} />
            <Bar dataKey="importance" fill="#111111" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="p-2 text-center">
      <div className="text-[9px] uppercase tracking-wider text-[#737373]">{label}</div>
      <div className="mt-1 text-base font-bold text-[#111111]">{formatVal(value)}</div>
    </div>
  );
}

function formatVal(v: unknown): string {
  if (typeof v === "number") return v.toFixed(3);
  return String(v ?? "—");
}
