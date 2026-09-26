import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistoryPoint } from "../types";

interface TrendChartsProps {
  history: HistoryPoint[];
}

const tipStyle = {
  background: "rgba(8,9,11,0.96)",
  border: "1px solid rgba(212,160,90,0.35)",
  borderRadius: 0,
  fontSize: 11,
  fontFamily: "JetBrains Mono, monospace",
};

export function TrendCharts({ history }: TrendChartsProps) {
  const data = history.map((h) => ({
    ...h,
    date: new Date(h.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  }));

  const avgProd = data.reduce((s, d) => s + d.oil_rate_bopd, 0) / Math.max(data.length, 1);

  return (
    <div className="space-y-12">
      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-[var(--accent)]">Thermal offtake</p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              Oil rate against reservoir temperature — CSS cycle signature
            </p>
          </div>
          <span className="mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            μ = {avgProd.toFixed(1)} BOPD
          </span>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="oilFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d4a05a" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#d4a05a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(232,226,214,0.04)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#6b665c", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="l" tick={{ fill: "#6b665c", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} width={36} />
              <YAxis yAxisId="r" orientation="right" tick={{ fill: "#6b665c", fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
              <Tooltip contentStyle={tipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#9a9488", fontFamily: "JetBrains Mono" }} />
              <ReferenceLine yAxisId="l" y={avgProd} stroke="rgba(232,226,214,0.22)" strokeDasharray="3 5" />
              <Area
                yAxisId="l"
                type="monotone"
                dataKey="oil_rate_bopd"
                name="Oil (BOPD)"
                stroke="#d4a05a"
                fill="url(#oilFill)"
                strokeWidth={2.25}
                animationDuration={1100}
              />
              <Line
                yAxisId="r"
                type="monotone"
                dataKey="reservoir_temperature"
                name="Temp (°C)"
                stroke="#7a9bb8"
                strokeWidth={1.75}
                dot={false}
                animationDuration={1300}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <div className="mb-4">
          <p className="eyebrow text-[var(--accent)]">Efficiency · reliability</p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Steam-oil ratio and failure probability across the demo window
          </p>
        </div>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="failFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c45c4a" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#c45c4a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(232,226,214,0.04)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#6b665c", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b665c", fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
              <Tooltip contentStyle={tipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#9a9488" }} />
              <Line type="monotone" dataKey="sor" name="SOR" stroke="#9a9488" strokeWidth={1.75} dot={false} />
              <Area
                type="monotone"
                dataKey="failure_probability"
                name="Failure prob."
                stroke="#c45c4a"
                fill="url(#failFill)"
                strokeWidth={1.75}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
