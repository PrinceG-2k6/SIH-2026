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
    <div className="plate fade-in overflow-hidden">
      <div className="flex flex-wrap items-stretch">
        <div className="flex items-center gap-3 border-r border-[var(--line)] bg-[rgba(212,160,90,0.06)] px-5 py-3">
          <span className="pulse-dot" />
          <div>
            <p className="eyebrow text-[var(--accent)]">Live stream</p>
            <p className="mono text-[10px] text-[var(--ink-faint)]">tick #{tickCount}</p>
          </div>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-x-8 gap-y-2 px-5 py-3">
          <Live label="Oil" value={tick.oil_rate_bopd} unit="BOPD" />
          <Live label="Temp" value={tick.reservoir_temperature} unit="°C" />
          <Live label="Visc" value={tick.oil_viscosity} unit="cP" decimals={0} />
          <Live label="SOR" value={tick.sor} decimals={2} />
          <Live label="SPM" value={tick.spm} />
          <Live label="Load" value={tick.rod_load} unit="kN" />
          <Live label="Fail" value={tick.failure_probability * 100} unit="%" />
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
}: {
  label: string;
  value: number;
  unit?: string;
  decimals?: number;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="eyebrow">{label}</span>
      <span className="mono text-[15px] text-[var(--ink)]">
        <AnimatedNumber value={value} decimals={decimals} duration={600} />
        {unit && <span className="ml-0.5 text-[10px] text-[var(--ink-faint)]">{unit}</span>}
      </span>
    </div>
  );
}
