import type { PageId } from "../types";

const PAGES: { id: PageId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "whatif", label: "What-if" },
  { id: "twin", label: "Twin" },
  { id: "alerts", label: "Alerts" },
  { id: "models", label: "Models" },
  { id: "data", label: "Data" },
];

interface Props {
  page: PageId;
  onPageChange: (page: PageId) => void;
  wells: { well_id: string; name: string }[];
  selectedWell: string;
  onWellChange: (id: string) => void;
  onAnalyze: () => void;
  loading?: boolean;
}

export function AppShell({ page, onPageChange, wells, selectedWell, onWellChange, onAnalyze, loading }: Props) {
  return (
    <header className="border-b border-[var(--line)]">
      <div className="mx-auto flex max-w-[1440px] items-start justify-between gap-6 px-6 pt-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="tick-mark" />
            <p className="eyebrow">SIH26120 / Oil India / Origin</p>
          </div>
          <h1 className="serif mt-2 text-[2.4rem] font-semibold leading-[1.05] tracking-tight text-[var(--ink)] md:text-[2.75rem]">
            ORIGIN
          </h1>
          <p className="mt-1 max-w-md text-sm text-[var(--ink-muted)]">
            Well-to-surface digital twin for cyclic steam and sucker-rod operations — Baghewala.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-end gap-3 pt-1">
          <label className="block">
            <span className="eyebrow mb-1 block text-[var(--ink-faint)]">Well</span>
            <select value={selectedWell} onChange={(e) => onWellChange(e.target.value)} className="min-w-[170px]">
              {wells.map((w) => (
                <option key={w.well_id} value={w.well_id}>{w.name}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={onAnalyze} disabled={loading} className="btn-primary">
            {loading ? "Working…" : "Analyze"}
          </button>
        </div>
      </div>

      <nav className="mx-auto mt-5 flex max-w-[1440px] overflow-x-auto px-6">
        {PAGES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPageChange(p.id)}
            className={`nav-link ${page === p.id ? "nav-link-active" : ""}`}
          >
            {p.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
