import { useCallback, useEffect, useState } from "react";
import { getDashboard, getWells } from "./services/api";
import { AppShell } from "./components/AppShell";
import { AlertsPage } from "./pages/AlertsPage";
import { DataPage } from "./pages/DataPage";
import { DigitalTwinPage } from "./pages/DigitalTwinPage";
import { ModelsPage } from "./pages/ModelsPage";
import { OverviewPage } from "./pages/OverviewPage";
import { WhatIfPage } from "./pages/WhatIfPage";
import type { DashboardData, PageId, WellSummary } from "./types";

export default function App() {
  const [page, setPage] = useState<PageId>("overview");
  const [wells, setWells] = useState<WellSummary[]>([]);
  const [selectedWell, setSelectedWell] = useState("BGW-001");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (wellId: string) => {
    setLoading(true);
    setError(null);
    try {
      const dashboard = await getDashboard(wellId);
      setData(dashboard);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getWells()
      .then((w) => {
        setWells(w);
        if (w.length > 0) setSelectedWell(w[0].well_id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load wells"));
  }, []);

  useEffect(() => {
    if (selectedWell) loadDashboard(selectedWell);
  }, [selectedWell, loadDashboard]);

  return (
    <div className="min-h-screen text-[var(--ink)]">
      <AppShell
        page={page}
        onPageChange={setPage}
        wells={wells}
        selectedWell={selectedWell}
        onWellChange={setSelectedWell}
        onAnalyze={() => loadDashboard(selectedWell)}
        loading={loading}
      />
      <main className="mx-auto max-w-[1440px] space-y-6 px-6 py-8">
        {error && (
          <div className="plate border-[rgba(196,92,74,0.45)] px-5 py-3 text-sm text-[var(--bad)]">
            {error}
          </div>
        )}
        {loading && (
          <div className="plate px-5 py-3 text-sm text-[var(--ink-muted)]">
            Running prediction + constrained CSS/SRP optimization for{" "}
            <span className="mono text-[var(--accent)]">{selectedWell}</span>…
          </div>
        )}
        {data && page === "overview" && <OverviewPage data={data} wellId={selectedWell} />}
        {data && page === "whatif" && <WhatIfPage wellId={selectedWell} dashboard={data} />}
        {page === "twin" && <DigitalTwinPage wellId={selectedWell} dashboard={data} />}
        {data && page === "alerts" && <AlertsPage alerts={data.alerts} loading={false} />}
        {data && page === "models" && <ModelsPage metrics={data.model_metrics} />}
        {page === "data" && <DataPage />}
        {!loading && !data && !error && (
          <p className="text-sm text-[var(--ink-faint)]">Waiting for dashboard data…</p>
        )}
      </main>
    </div>
  );
}
