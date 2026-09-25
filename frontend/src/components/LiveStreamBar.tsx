import { useEffect, useState } from "react";
import { getLiveTick } from "../services/api";
import type { LiveTick } from "../types";
import { AnimatedNumber } from "./AnimatedNumber";

interface Props {
  wellId: string;
  enabled?: boolean;
}

export function LiveStreamBar({ wellId, enabled = true }: Props) {
  const [tick, setTick] = useState<LiveTick | null>(null);
  const [tickCount, setTickCount] = useState(0);

  useEffect(() => {
    if (!enabled || !wellId) return;
    let count = 0;
    let cancelled = false;
    const poll = async () => {
      try {
        const data = await getLiveTick(wellId, count);
        if (!cancelled) {
          setTick(data);
          setTickCount(count);
        }
      } catch {
        /* ignore */
      }
      count += 1;
    };
    poll();
    const id = window.setInterval(poll, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [wellId, enabled]);

  if (!tick) return null;

  return (
    <div className="border border-[#111111] bg-[#FAF7EE] hard-shadow overflow-hidden">
      <div className="flex flex-wrap items-stretch">
        {/* Live Status Pill */}
        <div className="flex items-center gap-3 border-r border-[#111111] bg-[#111111] text-[#FAF7EE] px-4 py-2.5">
          <span className="pulse-dot" />
          <div>
            <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#C41212]">
              LIVE TELEMETRY
            </div>
            <div className="font-mono text-[10px] text-[#8C867A]">
              TICK #{tickCount} · {wellId}
            </div>
          </div>
        </div>

        {/* Telemetry Stream Items */}
        <div className="flex flex-1 flex-wrap items-center justify-around gap-x-6 gap-y-2 px-4 py-2">
          <Live label="OIL RATE" value={tick.oil_rate_bopd} unit="BOPD" />
          <Live label="TEMPERATURE" value={tick.reservoir_temperature} unit="°C" />
          <Live label="VISCOSITY" value={tick.oil_viscosity} unit="cP" decimals={0} />
          <Live label="SOR" value={tick.sor} decimals={2} />
          <Live label="SPM" value={tick.spm} />
          <Live label="ROD LOAD" value={tick.rod_load} unit="kN" />
          <Live
            label="FAILURE RISK"
            value={tick.failure_probability * 100}
            unit="%"
            isAlert={tick.failure_probability > 0.25}
          />
        </div>
      </div>
    </div>
  );
}

function Live({
  label,
  value,
  unit,
  decimals = 1,
  isAlert = false,
}: {
  label: string;
  value: number;
  unit?: string;
  decimals?: number;
  isAlert?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2 font-mono">
      <span className="text-[10px] uppercase font-bold text-[#6B655A]">{label}:</span>
      <span className={`text-sm font-bold ${isAlert ? "text-[#C41212]" : "text-[#111111]"}`}>
        <AnimatedNumber value={value} decimals={decimals} duration={400} />
        {unit && <span className="ml-0.5 text-[10px] text-[#6B655A]"> {unit}</span>}
      </span>
    </div>
  );
}
