import { RefreshCw } from "lucide-react";
import type { PageId } from "../types";

interface Props {
  page: PageId;
  onPageChange: (page: PageId) => void;
  selectedWell: string;
  onAnalyze: () => void;
  loading?: boolean;
}

export function NewsprintHeader({
  page,
  onPageChange,
  selectedWell,
  onAnalyze,
  loading,
}: Props) {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).toUpperCase();

  const isFrontPage = page === "landing";

  return (
    <header className="border-b border-[#111111] bg-[#F9F9F7] text-[#111111]">
      {/* Topmost Newspaper Folio / Micro-strip */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#111111] px-6 py-1.5 font-mono text-[10px] tracking-wider text-[#525252]">
        <div className="flex items-center space-x-3">
          <span className="font-bold text-[#111111]">THE BAGHEWALA DISPATCH</span>
          <span>·</span>
          <span>{currentDate}</span>
          <span>·</span>
          <span className="hidden sm:inline">WESTERN RAJASTHAN BASIN</span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="hidden md:inline">WEATHER: 36°C DESERT SUN · 12% HUMIDITY</span>
          <span>·</span>
          <span className="font-bold text-[#CC0000]">OIL INDIA LIMITED</span>
        </div>
      </div>

      {/* Main Editorial Masthead */}
      <div className="px-6 py-6 text-center">
        <div className="flex items-center justify-center space-x-4 mb-2">
          <div className="h-[1px] w-12 sm:w-28 bg-[#111111]" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-[#737373]">
            AUTONOMOUS HEAVY OIL INTELLIGENCE
          </span>
          <div className="h-[1px] w-12 sm:w-28 bg-[#111111]" />
        </div>

        <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-[#111111] uppercase">
          STRATA DISPATCH
        </h1>

        <p className="mx-auto mt-2 max-w-3xl font-serif text-xs sm:text-sm italic text-[#525252]">
          "The deep sandstone intelligence and closed-loop operational record for integrated Cyclic Steam Stimulation & Sucker Rod Pumping at Baghewala Field."
        </p>

        {/* Action & Toggle Toolbar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[#111111] pt-3">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => onPageChange("landing")}
              className={`border px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider transition-all ${
                isFrontPage
                  ? "border-[#111111] bg-[#111111] text-[#F9F9F7]"
                  : "border-[#111111] bg-transparent text-[#111111] hover:bg-[#E5E5E0]"
              }`}
            >
              § 00 Front Page
            </button>
            <button
              type="button"
              onClick={() => onPageChange("overview")}
              className={`border px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider transition-all ${
                !isFrontPage
                  ? "border-[#111111] bg-[#111111] text-[#F9F9F7]"
                  : "border-[#111111] bg-transparent text-[#111111] hover:bg-[#E5E5E0]"
              }`}
            >
              Operations Terminal
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <span className="font-mono text-xs text-[#525252]">
              Target Borehole: <span className="font-bold text-[#111111]">{selectedWell}</span>
            </span>
            <button
              type="button"
              onClick={onAnalyze}
              disabled={loading}
              className="btn-primary"
            >
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Optimizing…" : "Run AI Optimization"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
