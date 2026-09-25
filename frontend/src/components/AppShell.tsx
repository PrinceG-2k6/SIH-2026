import React from "react";
import type { DashboardData, PageId, WellSummary } from "../types";
import { NewsprintHeader } from "./NewsprintHeader";
import { NewsprintMarquee } from "./NewsprintMarquee";
import { Sidebar } from "./Sidebar";

interface Props {
  page: PageId;
  onPageChange: (page: PageId) => void;
  wells: WellSummary[];
  selectedWell: string;
  onWellChange: (id: string) => void;
  onAnalyze: () => void;
  loading?: boolean;
  data?: DashboardData | null;
  children: React.ReactNode;
}

export function AppShell({
  page,
  onPageChange,
  wells,
  selectedWell,
  onWellChange,
  onAnalyze,
  loading,
  data,
  children,
}: Props) {
  const alertCount = data?.alerts?.alert_count ?? 0;
  const bopd = data?.current_state?.oil_rate_bopd;
  const temp = data?.current_state?.reservoir_temperature;
  const sor = data?.current_state?.sor;

  return (
    <div className="flex min-h-screen bg-[#F2ECE1] text-[#111111]">
      {/* Newspaper Left Column Sidebar */}
      <Sidebar
        page={page}
        onPageChange={onPageChange}
        wells={wells}
        selectedWell={selectedWell}
        onWellChange={onWellChange}
        alertCount={alertCount}
      />

      {/* Main Newspaper Broad Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <NewsprintHeader
          page={page}
          onPageChange={onPageChange}
          selectedWell={selectedWell}
          onAnalyze={onAnalyze}
          loading={loading}
        />

        {/* Real-time Ticker Crawl */}
        <NewsprintMarquee
          wellId={selectedWell}
          bopd={bopd}
          temp={temp}
          sor={sor}
          alertCount={alertCount}
        />

        {/* Dynamic Editorial Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>

        {/* Newspaper Colophon & Footer */}
        <footer className="mt-12 border-t-4 border-[#111111] bg-[#EAE2D2] px-6 py-8 font-serif text-[#111111]">
          <div className="mx-auto max-w-[1600px]">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-6 border-b border-[#111111]">
              <div className="md:col-span-2">
                <h4 className="font-serif text-xl font-bold uppercase tracking-wider">
                  STRATA — Deep Sandstone Gazette
                </h4>
                <p className="mt-2 font-body text-sm text-[#4D483F] leading-relaxed max-w-md">
                  Autonomous decision-support engine engineered for cyclic steam stimulation and sucker rod pump optimization in extra-heavy crude reservoirs.
                </p>
                <div className="mt-4 font-mono text-[10px] text-[#6B655A] tracking-widest uppercase">
                  Published by Team STRATA · SIH-26120 · Oil India Limited
                </div>
              </div>

              <div>
                <h5 className="font-mono text-xs font-bold uppercase tracking-wider text-[#111111] mb-2">
                  Operating Sections
                </h5>
                <ul className="space-y-1 font-mono text-xs text-[#4D483F]">
                  <li><button onClick={() => onPageChange("landing")} className="hover:text-[#C41212]">§ 00 Front Page</button></li>
                  <li><button onClick={() => onPageChange("overview")} className="hover:text-[#C41212]">§ 01 Field Overview</button></li>
                  <li><button onClick={() => onPageChange("lab")} className="hover:text-[#C41212]">§ 02 Connected Field Lab</button></li>
                  <li><button onClick={() => onPageChange("whatif")} className="hover:text-[#C41212]">§ 03 What-If Simulator</button></li>
                  <li><button onClick={() => onPageChange("twin")} className="hover:text-[#C41212]">§ 04 3D Kinematics Twin</button></li>
                </ul>
              </div>

              <div>
                <h5 className="font-mono text-xs font-bold uppercase tracking-wider text-[#111111] mb-2">
                  Compliance & Specs
                </h5>
                <p className="font-mono text-[11px] text-[#6B655A] leading-normal">
                  Field: Baghewala Extra-Heavy Oil<br />
                  Permeability: 2,400 mD<br />
                  Oil Viscosity: 1,000–5,000 cP<br />
                  Thermal Process: CSS Cycles I–IV<br />
                  Surface Lift: Class-III Sucker Rod Pump
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 font-mono text-[10px] text-[#6B655A]">
              <p>
                © 2026 STRATA DIGITAL TWIN. SYNTHETIC BENCHMARK DATA. ALL METRICS CALCULATED ACCORDING TO OIL FIELD EQUATIONS.
              </p>
              <div className="flex items-center space-x-4">
                <span>PRESS EDITION: VOL 24.1</span>
                <span>·</span>
                <span className="text-[#C41212] font-bold">ALL SYSTEMS VERIFIED</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
