import { useCallback, useEffect, useState } from "react";
import { getDashboard, getWells } from "./services/api";
import { AppShell } from "./components/AppShell";
import { AlertsPage } from "./pages/AlertsPage";
import { DataPage } from "./pages/DataPage";
import { DigitalTwinPage } from "./pages/DigitalTwinPage";
import { LandingPage } from "./pages/LandingPage";
import { ModelsPage } from "./pages/ModelsPage";
import { OverviewPage } from "./pages/OverviewPage";
import { TwinLabPage } from "./pages/TwinLabPage";
import { WhatIfPage } from "./pages/WhatIfPage";
import type { DashboardData, PageId, WellSummary } from "./types";

export default function App() {
  const [page, setPage] = useState<PageId>("landing");
  const [wells, setWells] = useState<WellSummary[]>([]);
  const [selectedWell, setSelectedWell] = useState("BGW-01");
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
      setError(e instanceof Error ? e.message : "Failed to load dashboard data");
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
    <AppShell
      page={page}
      onPageChange={setPage}
      wells={wells}
      selectedWell={selectedWell}
      onWellChange={setSelectedWell}
      onAnalyze={() => loadDashboard(selectedWell)}
      loading={loading}
      data={data}
    >
      {/* Error Notice */}
      {error && (
        <div className="mb-6 border-2 border-[#C41212] bg-[#F7EBEB] p-4 font-mono text-xs text-[#C41212]">
          <span className="font-bold mr-2">[TELECOMMUNICATION INTERRUPTION]</span>
          {error}
        </div>
      )}

      {/* Loading Notice */}
      {loading && !data && (
        <div className="mb-6 border border-[#111111] bg-[#EAE2D2] p-4 font-mono text-xs text-[#4D483F]">
          COMPUTING SURROGATE PREDICTION & CONSTRAINED OPTIMIZATION FOR{" "}
          <span className="font-bold text-[#111111]">{selectedWell}</span>…
        </div>
      )}

      {/* Active Page Routing */}
      {page === "landing" && (
        <LandingPage
          onNavigate={setPage}
          dashboard={data}
          selectedWell={selectedWell}
        />
      )}
      {data && page === "overview" && <OverviewPage data={data} wellId={selectedWell} />}
      {page === "lab" && <TwinLabPage wellId={selectedWell} />}
      {data && page === "whatif" && <WhatIfPage wellId={selectedWell} dashboard={data} />}
      {page === "twin" && <DigitalTwinPage wellId={selectedWell} dashboard={data} />}
      {data && page === "alerts" && (
        <AlertsPage alerts={data.alerts} loading={false} wellId={selectedWell} />
      )}
      {data && page === "models" && <ModelsPage metrics={data.model_metrics} />}
      {page === "data" && <DataPage />}

      {!loading && !data && !error && page !== "landing" && (
        <div className="border border-[#111111] bg-[#FAF7EE] p-8 text-center font-mono text-xs text-[#6B655A]">
          WAITING FOR TELEMETRY STREAM FROM BOREHOLE SERVER…
        </div>
      )}
    </AppShell>
  );
}
