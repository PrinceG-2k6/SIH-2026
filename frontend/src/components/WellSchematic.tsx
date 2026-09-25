import type { TwinState } from "../types";

/** Precision 2D well schematic — Newspaper technical patent-drawing style */
export function WellSchematic({ state }: { state: TwinState }) {
  const heat = Math.min(1, Math.max(0, (state.reservoir_temperature - 44) / 28));
  const heatY = 218 - heat * 40;
  const heatR = 30 + heat * 26 + state.steam_volume / 45;
  const risk = state.failure_probability > 0.3 || state.rod_floating_probability > 0.35;
  const strokeAmp = Math.min(1.2, state.stroke_length / 2.5);
  const horseAngle = -12 * strokeAmp;

  return (
    <svg viewBox="0 0 320 480" className="h-full w-full bg-[#FAF7EE]" role="img" aria-label="Well schematic">
      <defs>
        <radialGradient id="heatGradNewsprint" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C41212" stopOpacity={0.25 + heat * 0.4} />
          <stop offset="70%" stopColor="#C41212" stopOpacity={0.08} />
          <stop offset="100%" stopColor="#C41212" stopOpacity={0} />
        </radialGradient>
        <pattern id="hatchNewsprint" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#111111" strokeWidth="0.75" opacity="0.2" />
        </pattern>
        <pattern id="sandNewsprint" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="3" r="0.7" fill="#111111" opacity="0.3" />
          <circle cx="6" cy="6" r="0.6" fill="#111111" opacity="0.2" />
        </pattern>
      </defs>

      {/* Outer Border with Newsprint Border */}
      <rect x="6" y="6" width="308" height="468" fill="none" stroke="#111111" strokeWidth="1.5" />
      <line x1="6" y1="6" x2="26" y2="6" stroke="#C41212" strokeWidth="3" />
      <line x1="6" y1="6" x2="6" y2="26" stroke="#C41212" strokeWidth="3" />
      <line x1="314" y1="474" x2="294" y2="474" stroke="#C41212" strokeWidth="3" />
      <line x1="314" y1="474" x2="314" y2="454" stroke="#C41212" strokeWidth="3" />

      {/* Patent Title Block */}
      <text x="22" y="24" fill="#111111" fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="bold" letterSpacing="1.5">
        WELL PROFILE · {state.well_id} · {state.mode.toUpperCase()}
      </text>
      <text x="22" y="36" fill="#6B655A" fontSize="7" fontFamily="JetBrains Mono, monospace">
        BAGHEWALA CSS THERMAL CROSS-SECTION · NOT OIL-CALIBRATED
      </text>

      {/* Surface Equipment — Pumpjack */}
      <g transform="translate(48,42)">
        <rect x="0" y="78" width="88" height="8" fill="#EAE2D2" stroke="#111111" strokeWidth="1.5" />
        <rect x="8" y="70" width="28" height="16" fill="#FAF7EE" stroke="#111111" strokeWidth="1" />
        <text x="22" y="81" textAnchor="middle" fill="#111111" fontSize="6" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
          GEARBOX
        </text>
        {/* Samson Post */}
        <polygon points="54,18 48,78 60,78" fill="#FAF7EE" stroke="#111111" strokeWidth="1.5" />
        {/* Beam + Horsehead */}
        <g transform={`rotate(${horseAngle} 54 28)`}>
          <line x1="8" y1="28" x2="95" y2="28" stroke="#111111" strokeWidth="5" strokeLinecap="square" />
          <path d="M8 20 L8 36 L-2 44 L-2 12 Z" fill="#111111" />
          <circle cx="54" cy="28" r="4" fill="#FAF7EE" stroke="#111111" strokeWidth="2" />
        </g>
        {/* Counterweight */}
        <circle cx="22" cy="72" r="12" fill="none" stroke="#111111" strokeWidth="2" />
        <circle cx="22" cy="72" r="4" fill="#C41212" />
        {/* Polish Rod */}
        <line
          x1="112"
          y1={20 + strokeAmp * 4}
          x2="112"
          y2="95"
          stroke={risk ? "#C41212" : "#111111"}
          strokeWidth="2.5"
        />
        <rect x="106" y="18" width="12" height="5" fill="#111111" />
      </g>

      {/* Wellhead Tree */}
      <g transform="translate(148,118)">
        <rect x="0" y="0" width="24" height="18" fill="#FAF7EE" stroke="#111111" strokeWidth="1.5" />
        <rect x="4" y="-8" width="16" height="8" fill="#EAE2D2" stroke="#111111" strokeWidth="1" />
        <rect x="24" y="6" width="22" height="5" fill="#111111" />
        <rect x="-18" y="6" width="18" height="5" fill="#111111" />
        <circle cx="36" cy="2" r="4" fill="#FAF7EE" stroke="#111111" strokeWidth="1" />
        <text x="36" y="-3" textAnchor="middle" fill="#111111" fontSize="6" fontFamily="JetBrains Mono, monospace">
          PSI
        </text>
      </g>

      {/* Geological Formation Block */}
      <rect x="36" y="168" width="168" height="250" fill="#FAF7EE" stroke="#111111" strokeWidth="1" />
      <rect x="36" y="168" width="168" height="250" fill="url(#hatchNewsprint)" />
      <rect x="36" y="250" width="168" height="70" fill="url(#sandNewsprint)" />

      {/* Stratigraphic Labels */}
      <text x="44" y="186" fill="#6B655A" fontSize="7" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
        OVERBURDEN SHALE
      </text>
      <line x1="44" y1="248" x2="120" y2="248" stroke="#111111" strokeWidth="1" strokeDasharray="3 2" />
      <text x="44" y="262" fill="#C41212" fontSize="8" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
        PAY · JODHPUR SANDSTONE
      </text>
      <text x="44" y="400" fill="#6B655A" fontSize="7" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
        UNDERBURDEN BASEMENT
      </text>

      {/* Subsurface Thermal Plume */}
      <ellipse
        cx="160"
        cy={heatY}
        rx={heatR}
        ry={heatR * 0.52}
        fill="url(#heatGradNewsprint)"
        stroke="#C41212"
        strokeWidth="1.5"
        strokeDasharray="4 2"
      />
      <text
        x="160"
        y={heatY + 3}
        textAnchor="middle"
        fill="#C41212"
        fontSize="9"
        fontFamily="JetBrains Mono, monospace"
        fontWeight="bold"
      >
        {state.reservoir_temperature.toFixed(1)}°C
      </text>

      {/* Casing String */}
      <rect x="152" y="136" width="16" height="282" fill="#FAF7EE" stroke="#111111" strokeWidth="1.5" />
      <rect x="157" y="136" width="6" height="282" fill="#111111" />

      {/* Rod Couplings */}
      {[180, 230, 280, 330, 380].map((y) => (
        <rect key={y} x="150" y={y} width="20" height="4" fill="#C41212" />
      ))}

      {/* Steam / Oil Perforations */}
      {[268, 278, 288, 298].map((y) => (
        <g key={y}>
          <line x1="140" y1={y} x2="152" y2={y} stroke="#C41212" strokeWidth="2.5" />
          <line x1="168" y1={y} x2="180" y2={y} stroke="#C41212" strokeWidth="2.5" />
        </g>
      ))}

      {/* Surface Production Tank */}
      <path d="M172 128 L250 128 L250 200" fill="none" stroke="#111111" strokeWidth="2" />
      <rect x="236" y="200" width="40" height="72" fill="#FAF7EE" stroke="#111111" strokeWidth="1.5" />
      <rect x="240" y="204" width="32" height="8" fill="#EAE2D2" stroke="#111111" strokeWidth="1" />
      <text x="256" y="238" textAnchor="middle" fill="#4D483F" fontSize="7" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
        OFFTAKE
      </text>
      <text x="256" y="254" textAnchor="middle" fill="#111111" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
        {state.oil_rate_bopd.toFixed(1)}
      </text>
      <text x="256" y="264" textAnchor="middle" fill="#6B655A" fontSize="6" fontFamily="JetBrains Mono, monospace">
        BOPD
      </text>

      {/* Callout Box */}
      <rect x="214" y="300" width="92" height="106" fill="#FAF7EE" stroke="#111111" strokeWidth="1.5" />
      <rect x="214" y="300" width="92" height="16" fill="#111111" />
      <text x="260" y="311" textAnchor="middle" fill="#FAF7EE" fontSize="7" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
        TELEMETRY SPEC
      </text>
      <g fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#111111">
        <text x="222" y="332">SPM: {state.spm.toFixed(1)}</text>
        <text x="222" y="348">STROKE: {state.stroke_length.toFixed(2)}m</text>
        <text x="222" y="364">EFFICIENCY: {(state.pump_efficiency * 100).toFixed(0)}%</text>
        <text x="222" y="380">LOAD: {state.rod_load.toFixed(0)} kN</text>
        <text x="222" y="396" fill={risk ? "#C41212" : "#1b6a38"} fontWeight="bold">
          RISK: {(state.failure_probability * 100).toFixed(0)}%
        </text>
      </g>

      {/* Depth Scale */}
      <line x1="28" y1="136" x2="28" y2="418" stroke="#111111" strokeWidth="1.5" />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const y = 136 + i * 56;
        return (
          <g key={i}>
            <line x1="24" y1={y} x2="32" y2={y} stroke="#111111" strokeWidth="1" />
            <text
              x="20"
              y={y + 3}
              textAnchor="end"
              fill="#4D483F"
              fontSize="7"
              fontFamily="JetBrains Mono, monospace"
            >
              {i * 200}
            </text>
          </g>
        );
      })}
      <text
        x="12"
        y="280"
        fill="#6B655A"
        fontSize="7"
        fontFamily="JetBrains Mono, monospace"
        fontWeight="bold"
        transform="rotate(-90 12 280)"
      >
        DEPTH (M)
      </text>
    </svg>
  );
}
