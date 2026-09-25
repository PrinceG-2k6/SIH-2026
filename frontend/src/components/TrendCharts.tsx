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

const newsprintTipStyle = {
  backgroundColor: "#FAF7EE",
  border: "1px solid #111111",
  boxShadow: "3px 3px 0px #111111",
  borderRadius: 0,
  fontSize: 11,
  fontFamily: "JetBrains Mono, monospace",
  color: "#111111",
};

export function TrendCharts({ history }: TrendChartsProps) {
  const data = history.map((h) => ({
    ...h,
    date: new Date(h.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  }));

  const avgProd = data.reduce((s, d) => s + d.oil_rate_bopd, 0) / Math.max(data.length, 1);

  return (
    <div className="space-y-10">
      {/* Chart 1: Oil vs Temperature */}
      <div className="border border-[#111111] bg-[#FAF7EE] p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-[#111111] pb-3">
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#C41212]">
              CHRONOLOGY · PRODUCTION VS THERMAL CORE
            </span>
            <p className="mt-1 font-serif text-lg font-bold text-[#111111]">
              Thermal Offtake Profile (CSS Cycle Signature)
            </p>
          </div>
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#111111]">
            MEAN: {avgProd.toFixed(1)} BOPD
          </span>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="oilInkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#111111" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#111111" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#D8D0BF" strokeDasharray="2 2" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#4D483F", fontSize: 10, fontFamily: "JetBrains Mono" }}
                axisLine={{ stroke: "#111111" }}
                tickLine={{ stroke: "#111111" }}
              />
              <YAxis
                yAxisId="l"
                tick={{ fill: "#4D483F", fontSize: 10, fontFamily: "JetBrains Mono" }}
                axisLine={{ stroke: "#111111" }}
                tickLine={{ stroke: "#111111" }}
                width={38}
              />
              <YAxis
                yAxisId="r"
                orientation="right"
                tick={{ fill: "#C41212", fontSize: 10, fontFamily: "JetBrains Mono" }}
                axisLine={{ stroke: "#C41212" }}
                tickLine={{ stroke: "#C41212" }}
                width={36}
              />
              <Tooltip contentStyle={newsprintTipStyle} />
              <Legend
                wrapperStyle={{
                  fontSize: 11,
                  fontFamily: "JetBrains Mono",
                  paddingTop: 8,
                }}
              />
              <ReferenceLine
                yAxisId="l"
                y={avgProd}
                stroke="#6B655A"
                strokeDasharray="4 4"
                label={{ value: "AVG", fill: "#6B655A", fontSize: 10, position: "insideTopLeft" }}
              />
              <Area
                yAxisId="l"
                type="monotone"
                dataKey="oil_rate_bopd"
                name="Oil Offtake (BOPD)"
                stroke="#111111"
                fill="url(#oilInkFill)"
                strokeWidth={2}
                animationDuration={800}
              />
              <Line
                yAxisId="r"
                type="monotone"
                dataKey="reservoir_temperature"
                name="Reservoir Temp (°C)"
                stroke="#C41212"
                strokeWidth={2}
                dot={false}
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: SOR vs Failure Risk */}
      <div className="border border-[#111111] bg-[#FAF7EE] p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-[#111111] pb-3">
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#C41212]">
              EQUIPMENT INTEGRITY & STEAM ECONOMY
            </span>
            <p className="mt-1 font-serif text-lg font-bold text-[#111111]">
              Steam-to-Oil Ratio vs Mechanical Failure Probability
            </p>
          </div>
        </div>

        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="failRedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C41212" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#C41212" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#D8D0BF" strokeDasharray="2 2" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#4D483F", fontSize: 10, fontFamily: "JetBrains Mono" }}
                axisLine={{ stroke: "#111111" }}
                tickLine={{ stroke: "#111111" }}
              />
              <YAxis
                tick={{ fill: "#4D483F", fontSize: 10, fontFamily: "JetBrains Mono" }}
                axisLine={{ stroke: "#111111" }}
                tickLine={{ stroke: "#111111" }}
                width={38}
              />
              <Tooltip contentStyle={newsprintTipStyle} />
              <Legend
                wrapperStyle={{
                  fontSize: 11,
                  fontFamily: "JetBrains Mono",
                  paddingTop: 8,
                }}
              />
              <Line
                type="monotone"
                dataKey="sor"
                name="SOR (Steam/Oil)"
                stroke="#4D483F"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="failure_probability"
                name="Failure Probability"
                stroke="#C41212"
                fill="url(#failRedFill)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
