import type { TwinState } from "../types";

/** Precision 2D well schematic — engineering drawing style with deep callouts */
export function WellSchematic({ state }: { state: TwinState }) {
  const heat = Math.min(1, Math.max(0, (state.reservoir_temperature - 44) / 28));
  const heatY = 218 - heat * 40;
  const heatR = 30 + heat * 26 + state.steam_volume / 45;
  const risk = state.failure_probability > 0.3 || state.rod_floating_probability > 0.35;
  const strokeAmp = Math.min(1.2, state.stroke_length / 2.5);
  const horseAngle = -12 * strokeAmp;

  return (
    <svg viewBox="0 0 320 480" className="h-full w-full" role="img" aria-label="Well schematic">
      <defs>
        <linearGradient id="formGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2e36" />
          <stop offset="35%" stopColor="#3d3428" />
          <stop offset="55%" stopColor="#4a3f32" />
          <stop offset="75%" stopColor="#2f2a24" />
          <stop offset="100%" stopColor="#1a1e18" />
        </linearGradient>
        <radialGradient id="heatGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={`rgba(212,160,90,${0.2 + heat * 0.5})`} />
          <stop offset="70%" stopColor={`rgba(196,92,74,${0.08 + heat * 0.2})`} />
          <stop offset="100%" stopColor="rgba(212,160,90,0)" />
        </radialGradient>
        <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="rgba(232,226,214,0.1)" strokeWidth="1" />
        </pattern>
        <pattern id="sand" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="3" r="0.6" fill="rgba(212,160,90,0.15)" />
          <circle cx="6" cy="6" r="0.5" fill="rgba(232,226,214,0.08)" />
        </pattern>
        <linearGradient id="casingMetal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5a6068" />
          <stop offset="40%" stopColor="#c5c9ce" />
          <stop offset="100%" stopColor="#4a5058" />
        </linearGradient>
      </defs>

      {/* Title block */}
      <rect x="6" y="6" width="308" height="468" fill="none" stroke="rgba(232,226,214,0.18)" strokeWidth="1" />
      <line x1="6" y1="6" x2="22" y2="6" stroke="var(--accent)" strokeWidth="2" />
      <line x1="6" y1="6" x2="6" y2="22" stroke="var(--accent)" strokeWidth="2" />
      <line x1="314" y1="474" x2="298" y2="474" stroke="var(--accent)" strokeWidth="2" />
      <line x1="314" y1="474" x2="314" y2="458" stroke="var(--accent)" strokeWidth="2" />

      <text x="22" y="24" fill="var(--accent)" fontSize="8" fontFamily="JetBrains Mono, monospace" letterSpacing="1.8">
        WELL SECTION · {state.well_id} · {state.mode.toUpperCase()}
      </text>
      <text x="22" y="36" fill="var(--ink-faint)" fontSize="7" fontFamily="JetBrains Mono, monospace">
        SYNTHETIC DEMO · NOT OIL-CALIBRATED
      </text>

      {/* Surface equipment — pumpjack side view */}
      <g transform="translate(48,42)">
        <rect x="0" y="78" width="88" height="8" fill="#2a2e34" stroke="rgba(232,226,214,0.15)" />
        <rect x="8" y="72" width="28" height="14" fill="#3a4048" />
        <text x="22" y="82" textAnchor="middle" fill="var(--ink-faint)" fontSize="5" fontFamily="JetBrains Mono, monospace">
          GBX
        </text>
        {/* Samson */}
        <rect x="52" y="18" width="5" height="60" fill="#6d737b" />
        <line x1="48" y1="40" x2="62" y2="55" stroke="#5c636c" strokeWidth="2" />
        <line x1="48" y1="55" x2="62" y2="40" stroke="#5c636c" strokeWidth="2" />
        {/* Beam + horsehead */}
        <g transform={`rotate(${horseAngle} 54 28)`}>
          <line x1="8" y1="28" x2="95" y2="28" stroke="#b8894a" strokeWidth="5" strokeLinecap="square" />
          <path d="M8 22 L8 34 L-2 42 L-2 14 Z" fill="#b8894a" />
          <circle cx="54" cy="28" r="4" fill="#8a9098" />
        </g>
        {/* Counterweight arc */}
        <circle cx="22" cy="72" r="12" fill="none" stroke="#6d737b" strokeWidth="2.5" />
        <circle cx="22" cy="72" r="3" fill="#b8894a" />
        {/* Polish rod */}
        <line
          x1="112"
          y1={20 + strokeAmp * 4}
          x2="112"
          y2="95"
          stroke={risk ? "#c45c4a" : "#d0d4d8"}
          strokeWidth="2.5"
        />
        <rect x="106" y="18" width="12" height="5" fill="#8a9098" />
      </g>

      {/* Wellhead tree */}
      <g transform="translate(148,118)">
        <rect x="0" y="0" width="24" height="18" fill="#3e444c" stroke="rgba(232,226,214,0.25)" />
        <rect x="4" y="-8" width="16" height="8" fill="#2f343a" />
        <rect x="24" y="6" width="22" height="5" fill="#4a5058" />
        <rect x="-18" y="6" width="18" height="5" fill="#4a5058" />
        <circle cx="36" cy="2" r="4" fill="none" stroke="#c5c9ce" strokeWidth="1" />
        <text x="36" y="-4" textAnchor="middle" fill="var(--ink-faint)" fontSize="5" fontFamily="JetBrains Mono, monospace">
          P
        </text>
      </g>

      {/* Formation block */}
      <rect x="36" y="168" width="168" height="250" fill="url(#formGrad)" stroke="rgba(232,226,214,0.12)" />
      <rect x="36" y="168" width="168" height="250" fill="url(#hatch)" />
      <rect x="36" y="250" width="168" height="70" fill="url(#sand)" opacity="0.6" />

      {/* Strat labels */}
      <text x="44" y="186" fill="var(--ink-faint)" fontSize="7" fontFamily="JetBrains Mono, monospace">
        OVERBURDEN
      </text>
      <line x1="44" y1="248" x2="120" y2="248" stroke="rgba(212,160,90,0.35)" strokeWidth="0.5" />
      <text x="44" y="262" fill="var(--accent)" fontSize="7" fontFamily="JetBrains Mono, monospace">
        PAY · JODHPUR SS
      </text>
      <text x="44" y="400" fill="var(--ink-faint)" fontSize="7" fontFamily="JetBrains Mono, monospace">
        UNDERBURDEN
      </text>

      {/* Heat plume */}
      <ellipse
        cx="160"
        cy={heatY}
        rx={heatR}
        ry={heatR * 0.52}
        fill="url(#heatGrad)"
        stroke="rgba(212,160,90,0.4)"
        strokeWidth="1"
      />
      <text
        x="160"
        y={heatY + 3}
        textAnchor="middle"
        fill="var(--accent)"
        fontSize="9"
        fontFamily="JetBrains Mono, monospace"
        fontWeight="600"
      >
        {state.reservoir_temperature.toFixed(1)}°C
      </text>

      {/* Casing string with wall thickness */}
      <rect x="152" y="136" width="16" height="282" fill="url(#casingMetal)" opacity="0.9" />
      <rect x="155" y="136" width="10" height="282" fill="#3a4048" />
      <rect x="157" y="136" width="6" height="282" fill="#1e2228" />

      {/* Couplings */}
      {[180, 230, 280, 330, 380].map((y) => (
        <rect key={y} x="150" y={y} width="20" height="4" fill="#b8894a" opacity="0.85" />
      ))}

      {/* Perforations */}
      {[268, 278, 288, 298].map((y) => (
        <g key={y}>
          <line x1="140" y1={y} x2="152" y2={y} stroke="var(--accent)" strokeWidth="2.5" />
          <line x1="168" y1={y} x2="180" y2={y} stroke="var(--accent)" strokeWidth="2.5" />
        </g>
      ))}

      {/* Tubing oil column indication */}
      <rect x="158" y="200" width="4" height="180" fill="#5a3210" opacity="0.55" />

      {/* Flowline */}
      <path d="M172 128 L250 128 L250 200" fill="none" stroke="#6a7078" strokeWidth="3" />
      <rect x="236" y="200" width="40" height="72" fill="#3a4048" stroke="rgba(232,226,214,0.2)" />
      <rect x="240" y="204" width="32" height="8" fill="#2a2e34" />
      <text x="256" y="244" textAnchor="middle" fill="var(--ink-faint)" fontSize="7" fontFamily="JetBrains Mono, monospace">
        TANK
      </text>
      <text x="256" y="256" textAnchor="middle" fill="var(--accent)" fontSize="8" fontFamily="JetBrains Mono, monospace">
        {state.oil_rate_bopd.toFixed(1)}
      </text>

      {/* Telemetry callout plate */}
      <rect x="214" y="300" width="90" height="100" fill="rgba(14,16,21,0.85)" stroke="rgba(232,226,214,0.2)" />
      <line x1="214" y1="300" x2="226" y2="300" stroke="var(--accent)" strokeWidth="2" />
      <g fontFamily="JetBrains Mono, monospace" fontSize="8" fill="var(--ink-muted)">
        <text x="222" y="318">SPM {state.spm.toFixed(1)}</text>
        <text x="222" y="334">Stroke {state.stroke_length.toFixed(2)}m</text>
        <text x="222" y="350">η {(state.pump_efficiency * 100).toFixed(0)}%</text>
        <text x="222" y="366">Load {state.rod_load.toFixed(0)} kN</text>
        <text x="222" y="382" fill={risk ? "#c45c4a" : "var(--ink-muted)"}>
          Risk {(state.failure_probability * 100).toFixed(0)}%
        </text>
        <text x="222" y="390" fill="var(--ink-faint)" fontSize="6">
          μ {state.oil_viscosity.toFixed(0)} cP
        </text>
      </g>

      {/* Depth scale */}
      <line x1="28" y1="136" x2="28" y2="418" stroke="rgba(232,226,214,0.3)" />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const y = 136 + i * 56;
        return (
          <g key={i}>
            <line x1="24" y1={y} x2="32" y2={y} stroke="rgba(232,226,214,0.4)" />
            <text
              x="20"
              y={y + 3}
              textAnchor="end"
              fill="var(--ink-faint)"
              fontSize="7"
              fontFamily="JetBrains Mono, monospace"
            >
              {i * 200}
            </text>
          </g>
        );
      })}
      <text
        x="14"
        y="280"
        fill="var(--ink-faint)"
        fontSize="6"
        fontFamily="JetBrains Mono, monospace"
        transform="rotate(-90 14 280)"
      >
        DEPTH m
      </text>
    </svg>
  );
}
