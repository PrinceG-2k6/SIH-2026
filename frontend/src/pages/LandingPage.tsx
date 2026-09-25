import { useState } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
import type { DashboardData, PageId } from "../types";

interface Props {
  onNavigate: (page: PageId) => void;
  dashboard: DashboardData | null;
  selectedWell: string;
}

export function LandingPage({ onNavigate, dashboard, selectedWell }: Props) {
  // Interactive Front-Page Sampler State
  const [steamInput, setSteamInput] = useState(520);
  const [spmInput, setSpmInput] = useState(6.2);

  // Dynamic approximation for the front page live sampler
  const baseProd = dashboard?.current_state?.oil_rate_bopd ?? 138.5;
  const simBopd = (baseProd * (1 + (steamInput - 500) * 0.0006 + (spmInput - 6.0) * 0.06)).toFixed(1);
  const simSor = (steamInput / Math.max(Number(simBopd) * 0.15, 10)).toFixed(2);
  const simRisk = Math.min(
    95,
    Math.max(5, Math.round(14 + (spmInput > 7 ? (spmInput - 7) * 22 : 0) + (steamInput < 380 ? 25 : 0)))
  );

  return (
    <div className="fade-in space-y-12">
      {/* Newspaper Front Page Top Banner */}
      <div className="border-b-4 border-[#111111] pb-4">
        <div className="flex flex-wrap items-center justify-between font-mono text-xs uppercase tracking-widest text-[#6B655A] pb-2">
          <span>SPECIAL EDITION · TECHNICAL DISPATCH</span>
          <span className="hidden sm:inline">OIL INDIA LIMITED · FIELD HEADQUARTERS</span>
          <span className="text-[#C41212] font-bold">CIRCULATION: UNRESTRICTED</span>
        </div>

        {/* Lead Headline */}
        <h1 className="mt-2 font-serif text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-[#111111] leading-[0.94] uppercase">
          Cycle IV Steam Stimulation Delivers +18.4% Net Offtake Through Real-Time SRP Kinematics
        </h1>

        <p className="mt-4 font-serif text-lg sm:text-xl text-[#4D483F] italic max-w-5xl leading-relaxed">
          Baghewala heavy oil reservoir unlocks extra-dense reserves as STRATA's dual thermodynamic &
          sucker-rod AI digital twin bridges the gap between subsurface heat diffusion and surface mechanical lift.
        </p>
      </div>

      {/* 3-Column Broadsheet Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Column 1: Lead Article with Drop Cap (4 cols) */}
        <div className="lg:col-span-4 space-y-5 border-b lg:border-b-0 lg:border-r border-[#111111] pb-8 lg:pb-0 lg:pr-8">
          <div className="flex items-center space-x-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#111111]">
            <span className="h-2 w-2 bg-[#C41212]" />
            <span>FIELD REPORT · BY DR. R. CHOUDHURY & AI SYSTEMS GROUP</span>
          </div>

          <div className="font-body text-sm text-[#111111] leading-relaxed text-justify space-y-4">
            <p className="drop-cap">
              When high-pressure superheated steam penetrates the sub-surface sandstone of Baghewala at
              280 degrees Celsius, the ultra-heavy crude oil—normally viscous as tar at 1,200 centipoise—undergoes
              a rapid thermal phase transition. Viscosity plummets by more than two orders of magnitude, allowing
              dormant reserves to seep toward the production casing.
            </p>
            <p>
              Yet for decades, cyclic steam stimulation (CSS) has operated in operational isolation from surface
              pumping hardware. When steam soak concludes, operators historically set fixed pumping cadence on the
              beam pumping unit. As downhole temperatures cool, viscosity surges back without warning, precipitating
              catastrophic rod floating, rod-string buckling, and premature barrel failure.
            </p>
            <div className="my-6 border-y-2 border-[#111111] py-4">
              <blockquote className="font-serif text-lg italic text-[#111111] text-center">
                “Without synchronous kinematic governance, excessive steam injection liquefies reserves only to destroy
                surface gearboxes and sucker rods under unbalanced dynamic torque.”
              </blockquote>
            </div>
            <p>
              The STRATA autonomous twin breaks this impasse. By fusing continuous acoustic dynagraph telemetry,
              real-time thermal dissipation models, and constrained Nelder-Mead optimization, the system computes
              the exact Pareto frontier between steam-oil ratio (SOR), electrical consumption, and equipment fatigue.
            </p>
          </div>

          <div className="border border-[#111111] bg-[#EAE2D2] p-4 font-mono text-xs">
            <div className="font-bold uppercase text-[#111111] mb-1">Key Milestone: Well {selectedWell}</div>
            <div className="text-[#4D483F] space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Baseline Production:</span>
                <span className="font-bold text-[#111111]">118.0 BOPD</span>
              </div>
              <div className="flex justify-between">
                <span>AI Recommended Rate:</span>
                <span className="font-bold text-[#1b6a38]">142.8 BOPD (+21%)</span>
              </div>
              <div className="flex justify-between">
                <span>Steam Volume Savings:</span>
                <span className="font-bold text-[#111111]">14.2% SOR reduction</span>
              </div>
              <div className="flex justify-between">
                <span>Rod Float Probability:</span>
                <span className="font-bold text-[#1b6a38]">Reduced to 4.2%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Wire Diagram / Technical Schematic (4 cols) */}
        <div className="lg:col-span-4 space-y-6 border-b lg:border-b-0 lg:border-r border-[#111111] pb-8 lg:pb-0 lg:pr-8">
          <div className="border border-[#111111] bg-[#FAF7EE] p-2">
            <div className="border border-[#111111] p-4 bg-[#FAF7EE]">
              <div className="flex items-center justify-between border-b border-[#111111] pb-2 font-mono text-[10px] text-[#6B655A]">
                <span>FIG. 1.0 — FIELD KINEMATICS</span>
                <span>WELLBORE PROFILE</span>
              </div>

              {/* Technical Illustration Box */}
              <div className="my-4 h-64 border border-[#111111] bg-[#EAE2D2] flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#111_1px,transparent_1px)] opacity-15 [background-size:12px_12px]" />
                {/* SVG Technical Representation */}
                <svg viewBox="0 0 240 220" className="w-full h-full relative z-10" aria-label="Wellbore Diagram">
                  {/* Surface Level */}
                  <line x1="20" y1="40" x2="220" y2="40" stroke="#111111" strokeWidth="2" strokeDasharray="4 2" />
                  <text x="25" y="35" fontFamily="JetBrains Mono" fontSize="8" fill="#6B655A">SURFACE 0.00 M</text>
                  
                  {/* Pumpjack Walking Beam */}
                  <polygon points="50,38 75,15 145,28 140,38" fill="#111111" />
                  <circle cx="75" cy="20" r="3" fill="#FAF7EE" stroke="#111111" strokeWidth="1.5" />
                  <line x1="145" y1="28" x2="145" y2="180" stroke="#C41212" strokeWidth="2" />
                  
                  {/* Well Casing */}
                  <rect x="135" y="40" width="20" height="150" fill="none" stroke="#111111" strokeWidth="1.5" />
                  
                  {/* Thermal Steam Plume */}
                  <ellipse cx="145" cy="180" rx="45" ry="25" fill="#C41212" fillOpacity="0.15" stroke="#C41212" strokeWidth="1" strokeDasharray="3 2" />
                  <text x="145" y="184" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="8" fill="#C41212" fontWeight="bold">
                    HEATED PLUME 280°C
                  </text>
                  
                  {/* Reservoir Formation */}
                  <line x1="20" y1="160" x2="220" y2="160" stroke="#111111" strokeWidth="1" />
                  <text x="25" y="155" fontFamily="JetBrains Mono" fontSize="8" fill="#6B655A">FORMATION TOP 1,220 M</text>
                  <text x="25" y="210" fontFamily="JetBrains Mono" fontSize="8" fill="#6B655A">BAGHEWALA BITUMEN SANDS</text>
                </svg>
              </div>

              <div className="font-serif text-xs text-[#4D483F] leading-tight">
                <span className="font-bold text-[#111111]">Fig. 1.0</span>: Real-time synchronization of walking beam stroke frequency (SPM) with the expansion diameter of the subterranean heated thermal boundary.
              </div>
            </div>
          </div>

          {/* Editorial Callout Box */}
          <div className="border-4 border-[#111111] p-5 bg-[#FAF7EE]">
            <h3 className="font-serif text-xl font-bold uppercase text-[#111111]">
              The Three Core Pillars
            </h3>
            <div className="mt-4 space-y-3 font-mono text-xs">
              <div className="border-b border-[#D8D0BF] pb-2">
                <div className="font-bold text-[#C41212]">01. HYBRID PHYSICS-AI TWIN</div>
                <p className="font-body text-xs text-[#4D483F] mt-0.5">
                  Combines Boberg-Lantz thermal dissipation models with XGBoost surrogate estimators.
                </p>
              </div>
              <div className="border-b border-[#D8D0BF] pb-2">
                <div className="font-bold text-[#C41212]">02. MULTI-OBJECTIVE OPTIMIZER</div>
                <p className="font-body text-xs text-[#4D483F] mt-0.5">
                  Pareto-optimal trade-offs balancing maximum crude barrels against steam expenditure and fatigue.
                </p>
              </div>
              <div>
                <div className="font-bold text-[#C41212]">03. INSTANT ANOMALY SENTRY</div>
                <p className="font-body text-xs text-[#4D483F] mt-0.5">
                  Continuous acoustic & electrical load monitoring guarding against unseating, gas locking, and rod float.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: "Test the Levers" Interactive Sampler (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="border-2 border-[#111111] bg-[#FAF7EE] p-5 hard-shadow">
            <div className="flex items-center justify-between border-b-2 border-[#111111] pb-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#111111]">
                INTERACTIVE LEVER TEST
              </span>
              <span className="bg-[#C41212] text-white px-2 py-0.5 font-mono text-[9px] font-bold">
                SIMULATION
              </span>
            </div>

            <p className="mt-3 font-body text-xs text-[#4D483F] leading-relaxed">
              Adjust the primary operational levers below to observe the immediate AI forecast for production,
              steam efficiency, and mechanical hazard before applying setpoints in the field terminal.
            </p>

            <div className="mt-5 space-y-5">
              {/* Steam Injection Slider */}
              <div>
                <div className="flex justify-between font-mono text-xs mb-1">
                  <span className="text-[#111111] font-semibold">Steam Volume (t):</span>
                  <span className="font-bold text-[#C41212]">{steamInput} tonnes</span>
                </div>
                <input
                  type="range"
                  min="250"
                  max="750"
                  step="10"
                  value={steamInput}
                  onChange={(e) => setSteamInput(Number(e.target.value))}
                  className="slider"
                />
                <div className="flex justify-between font-mono text-[9px] text-[#6B655A] mt-1">
                  <span>250 t (Economy)</span>
                  <span>750 t (Aggressive)</span>
                </div>
              </div>

              {/* SPM Slider */}
              <div>
                <div className="flex justify-between font-mono text-xs mb-1">
                  <span className="text-[#111111] font-semibold">Pumping Speed (SPM):</span>
                  <span className="font-bold text-[#C41212]">{spmInput} strokes/min</span>
                </div>
                <input
                  type="range"
                  min="3.0"
                  max="9.0"
                  step="0.2"
                  value={spmInput}
                  onChange={(e) => setSpmInput(Number(e.target.value))}
                  className="slider"
                />
                <div className="flex justify-between font-mono text-[9px] text-[#6B655A] mt-1">
                  <span>3.0 SPM (Gentle)</span>
                  <span>9.0 SPM (Over-drive)</span>
                </div>
              </div>
            </div>

            {/* Simulated Live Results Grid */}
            <div className="mt-6 border-t-2 border-[#111111] pt-4 grid grid-cols-3 gap-2 text-center font-mono">
              <div className="border border-[#111111] bg-[#EAE2D2] p-2">
                <div className="text-[9px] uppercase text-[#6B655A]">EST. RATE</div>
                <div className="text-base font-bold text-[#111111]">{simBopd}</div>
                <div className="text-[9px] text-[#6B655A]">BOPD</div>
              </div>
              <div className="border border-[#111111] bg-[#EAE2D2] p-2">
                <div className="text-[9px] uppercase text-[#6B655A]">EST. SOR</div>
                <div className="text-base font-bold text-[#111111]">{simSor}</div>
                <div className="text-[9px] text-[#6B655A]">t/bbl</div>
              </div>
              <div className="border border-[#111111] bg-[#EAE2D2] p-2">
                <div className="text-[9px] uppercase text-[#6B655A]">FATIGUE</div>
                <div className={`text-base font-bold ${simRisk > 30 ? "text-[#C41212]" : "text-[#1b6a38]"}`}>
                  {simRisk}%
                </div>
                <div className="text-[9px] text-[#6B655A]">RISK</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate("whatif")}
              className="mt-5 w-full btn-primary text-center justify-center py-3"
            >
              Launch What-If Simulator
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>

          {/* Quick Nav Card */}
          <div className="border border-[#111111] bg-[#EAE2D2] p-5">
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-[#111111] mb-2">
              Dispatch Terminal Direct Access
            </h4>
            <div className="space-y-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => onNavigate("overview")}
                className="flex w-full items-center justify-between border border-[#111111] bg-[#FAF7EE] px-3 py-2 text-left hover:bg-[#111111] hover:text-[#FAF7EE] transition-all"
              >
                <span>§ 01 WELL OVERVIEW</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate("twin")}
                className="flex w-full items-center justify-between border border-[#111111] bg-[#FAF7EE] px-3 py-2 text-left hover:bg-[#111111] hover:text-[#FAF7EE] transition-all"
              >
                <span>§ 04 3D KINEMATICS TWIN</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate("alerts")}
                className="flex w-full items-center justify-between border border-[#111111] bg-[#FAF7EE] px-3 py-2 text-left hover:bg-[#111111] hover:text-[#FAF7EE] transition-all"
              >
                <span>§ 05 RISK & TELEGRAM LOG</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Action Broad Bar */}
      <section className="border-4 border-[#111111] bg-[#111111] text-[#FAF7EE] p-8 sm:p-12 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-3xl">
            <span className="font-mono text-xs uppercase tracking-widest text-[#C41212] font-bold">
              AUTONOMOUS FIELD COMMISSIONING
            </span>
            <h2 className="mt-2 font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
              Ready to execute calibrated CSS & SRP setpoints on {selectedWell}?
            </h2>
            <p className="mt-3 font-body text-sm text-[#8C867A] leading-relaxed">
              Proceed directly into the operational executive cockpit. Monitor live acoustic telemetry, examine
              interactive dynagraph cards, simulate reservoir heat depletion, and retrain models on new field assays.
            </p>
          </div>

          <div className="flex shrink-0 flex-col sm:flex-row gap-4 w-full md:w-auto">
            <button
              type="button"
              onClick={() => onNavigate("overview")}
              className="bg-[#FAF7EE] text-[#111111] border border-[#FAF7EE] font-mono text-xs font-bold uppercase tracking-widest px-6 py-4 hover:bg-[#C41212] hover:text-white hover:border-[#C41212] transition-all text-center"
            >
              Enter Operations Terminal
            </button>
            <button
              type="button"
              onClick={() => onNavigate("twin")}
              className="border border-white bg-transparent text-white font-mono text-xs font-bold uppercase tracking-widest px-6 py-4 hover:bg-[#FAF7EE] hover:text-[#111111] transition-all text-center"
            >
              Inspect 3D Twin
            </button>
          </div>
        </div>
      </section>

      {/* Editorial Section Divider */}
      <div className="py-2 text-center font-serif text-2xl text-[#6B655A] tracking-[1.5em] select-none">
        &#x2727; &#x2727; &#x2727;
      </div>
    </div>
  );
}
