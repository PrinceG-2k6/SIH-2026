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
    <section className="border border-[#111111] bg-[#FAF7EE] p-6 md:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[#111111] pb-4">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#C41212]">
            SHAPLEY ATTRIBUTION ENGINE · {data.method}
          </span>
          <h3 className="mt-1 font-serif text-3xl font-bold text-[#111111]">
            Machine Learning Decision Explainability
          </h3>
        </div>
        <p className="font-mono text-xs text-[#6B655A]">
          SURROGATE MODEL ATTRIBUTION V1.4
        </p>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <ContribTable
          title="Production Forecast Drivers"
          note={data.production_forecast.note}
          rows={data.production_forecast.contributions}
        />
        <ContribTable
          title="Equipment Failure Risk Drivers"
          note={data.failure_risk.note}
          rows={data.failure_risk.contributions}
        />
      </div>

      <p className="mt-8 font-mono text-[10px] text-[#6B655A] border-t border-[#D8D0BF] pt-3 italic">
        {data.disclaimer}
      </p>
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
    <div className="border border-[#111111] bg-[#EAE2D2] p-5">
      <div className="border-b border-[#111111] pb-2">
        <h4 className="font-serif text-lg font-bold text-[#111111]">{title}</h4>
        <p className="mt-0.5 font-body text-xs text-[#4D483F]">{note}</p>
      </div>

      <div className="mt-5 space-y-4">
        {rows.map((r) => {
          const pct = (Math.abs(r.shap_value) / maxAbs) * 100;
          const pos = r.shap_value > 0;
          return (
            <div key={r.feature} className="font-mono text-xs">
              <div className="mb-1 flex justify-between gap-2">
                <span className="font-medium uppercase text-[#111111]">
                  {r.feature.replace(/_/g, " ")}
                </span>
                <span className={`font-bold ${pos ? "text-[#1b6a38]" : "text-[#C41212]"}`}>
                  {pos ? "+" : ""}
                  {r.shap_value.toFixed(4)}
                </span>
              </div>
              <div className="h-2 w-full bg-[#D8D0BF] overflow-hidden">
                <div
                  className={`h-full ${pos ? "bg-[#111111]" : "bg-[#C41212]"}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
