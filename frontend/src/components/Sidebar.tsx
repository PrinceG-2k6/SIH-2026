import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Box,
  Compass,
  Database,
  FileText,
  Layers,
  Menu,
  Sliders,
  X,
} from "lucide-react";
import type { PageId, WellSummary } from "../types";

interface NavItem {
  id: PageId;
  section: string;
  label: string;
  icon: typeof FileText;
  badge?: number;
}

interface Props {
  page: PageId;
  onPageChange: (page: PageId) => void;
  wells: WellSummary[];
  selectedWell: string;
  onWellChange: (id: string) => void;
  alertCount?: number;
}

export function Sidebar({
  page,
  onPageChange,
  wells,
  selectedWell,
  onWellChange,
  alertCount = 0,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: NavItem[] = [
    { id: "landing", section: "§ 00", label: "Front Page", icon: FileText },
    { id: "overview", section: "§ 01", label: "Field Overview", icon: Compass },
    { id: "lab", section: "§ 02", label: "Field Lab", icon: Layers },
    { id: "whatif", section: "§ 03", label: "What-If Simulator", icon: Sliders },
    { id: "twin", section: "§ 04", label: "3D Digital Twin", icon: Box },
    { id: "alerts", section: "§ 05", label: "Risk & Alerts", icon: AlertTriangle, badge: alertCount },
    { id: "models", section: "§ 06", label: "Model Registry", icon: BarChart3 },
    { id: "data", section: "§ 07", label: "Data Ingest", icon: Database },
  ];

  const handleNav = (id: PageId) => {
    onPageChange(id);
    setMobileOpen(false);
  };

  const selectedWellMeta = wells.find((w) => w.well_id === selectedWell);

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[#F9F9F7] text-[#111111]">
      {/* Top Colophon & Masthead */}
      <div>
        <div className="border-b border-[#111111] p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#737373]">
              EST. 2026 · OIL INDIA LTD
            </span>
            <span className="border border-[#111111] bg-[#111111] px-1.5 py-0.5 font-mono text-[9px] font-bold text-white uppercase">
              SIH-26120
            </span>
          </div>

          <div className="mt-3">
            <h1 className="font-serif text-3xl font-black tracking-tight text-[#111111]">
              STRATA
            </h1>
            <p className="font-serif text-[11px] italic tracking-wide text-[#525252]">
              The Deep Sandstone Intelligence & Wellhead Operational Record
            </p>
          </div>

          <div className="mt-2 flex items-center space-x-2 border-t border-[#E5E5E0] pt-2 font-mono text-[9px] text-[#737373] uppercase tracking-wider">
            <span>Vol. XXIV</span>
            <span>·</span>
            <span>Issue 104</span>
            <span>·</span>
            <span className="text-[#CC0000] font-bold">LIVE TELEMETRY</span>
          </div>
        </div>

        {/* Well Selector Box */}
        <div className="border-b border-[#111111] bg-[#F5F5F5] p-4">
          <label className="block">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#111111]">
                ACTIVE BOREHOLE
              </span>
              <span className="flex items-center gap-1 font-mono text-[9px] text-[#1b6a38] font-bold">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#1b6a38]" />
                ONLINE
              </span>
            </div>
            <select
              value={selectedWell}
              onChange={(e) => onWellChange(e.target.value)}
              className="w-full border border-[#111111] bg-[#F9F9F7] px-3 py-2 font-mono text-xs font-semibold text-[#111111] focus:outline-none"
            >
              {wells.length > 0 ? (
                wells.map((w) => (
                  <option key={w.well_id} value={w.well_id}>
                    {w.well_id} — {w.name} ({w.field})
                  </option>
                ))
              ) : (
                <option value="BGW-01">BGW-01 — Baghewala-01</option>
              )}
            </select>
          </label>
          {selectedWellMeta && (
            <div className="mt-2 flex justify-between font-mono text-[10px] text-[#737373]">
              <span>Gravity: {selectedWellMeta.api_gravity}° API</span>
              <span className="uppercase">{selectedWellMeta.status}</span>
            </div>
          )}
        </div>

        {/* Section Navigation */}
        <div className="p-3">
          <div className="mb-2 px-2 font-mono text-[9px] font-bold uppercase tracking-widest text-[#737373]">
            TABLE OF CONTENTS
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = page === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  className={`group flex w-full items-center justify-between border px-3 py-2.5 text-left transition-all ${
                    active
                      ? "border-[#111111] bg-[#111111] text-[#F9F9F7]"
                      : "border-transparent text-[#111111] hover:border-[#111111] hover:bg-[#F0F0EC]"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span
                      className={`font-mono text-[11px] ${
                        active ? "text-[#CC0000] font-bold" : "text-[#737373] group-hover:text-[#111111]"
                      }`}
                    >
                      {item.section}
                    </span>
                    <Icon className={`h-4 w-4 stroke-[1.5] ${active ? "text-[#F9F9F7]" : "text-[#525252]"}`} />
                    <span
                      className={`font-sans text-xs font-semibold tracking-wide uppercase ${
                        active ? "text-[#F9F9F7]" : "text-[#111111]"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.2 font-mono text-[10px] font-bold ${
                        active ? "bg-[#CC0000] text-white" : "bg-[#CC0000] text-white"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Editorial Colophon */}
      <div className="border-t border-[#111111] p-4 text-[10px] font-mono text-[#737373]">
        <div className="flex items-center justify-between border-b border-[#E5E5E0] pb-2">
          <span>FIELD BASIN</span>
          <span className="font-bold text-[#111111]">BAGHEWALA</span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span>RESERVOIR DEPTH</span>
          <span className="font-bold text-[#111111]">1,250 M</span>
        </div>
        <div className="flex items-center justify-between border-b border-[#E5E5E0] pb-1">
          <span>OPTIMIZER</span>
          <span className="font-bold text-[#CC0000]">ACTIVE · CONSTRAINED</span>
        </div>
        <p className="mt-3 text-[9px] leading-tight text-[#A3A3A3] italic">
          Printed in Jodhpur & Duliajan. Autonomous decision-support prototype.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Left Column */}
      <aside className="hidden w-72 shrink-0 border-r border-[#111111] lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Top Bar with Hamburger */}
      <div className="flex items-center justify-between border-b border-[#111111] bg-[#F9F9F7] px-4 py-3 lg:hidden">
        <div className="flex items-center space-x-2">
          <span className="border border-[#111111] bg-[#111111] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
            STRATA
          </span>
          <span className="font-serif text-lg font-bold tracking-tight text-[#111111]">
            THE DISPATCH
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="border border-[#111111] p-1.5 text-[#111111] hover:bg-[#111111] hover:text-[#F9F9F7]"
          aria-label="Toggle Navigation Menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Slide-over Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-80 max-w-[85vw] border-r border-[#111111] bg-[#F9F9F7]">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
