import type {
  AlertsResponse,
  DashboardData,
  ExplainabilityData,
  LiveTick,
  OperatingParameters,
  SimulateResponse,
  TimelineResponse,
  TwinMode,
  TwinState,
  WellExplainability,
  WellSummary,
} from "../types";

const API_BASE = "/api";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, init);
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function getWells(): Promise<WellSummary[]> {
  return fetchJson<WellSummary[]>("/wells");
}

export function getDashboard(wellId: string): Promise<DashboardData> {
  return fetchJson<DashboardData>(`/dashboard/${wellId}`);
}

export function getAlerts(wellId: string): Promise<AlertsResponse> {
  return fetchJson<AlertsResponse>(`/alerts/${wellId}`);
}

export function getTwinState(wellId: string, mode: TwinMode = "current"): Promise<TwinState> {
  return fetchJson<TwinState>(`/twin/${wellId}?mode=${mode}`);
}

export function getTwinScenario(wellId: string, parameters: OperatingParameters): Promise<TwinState> {
  return fetchJson<TwinState>(`/twin/${wellId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "scenario", parameters }),
  });
}

export function simulateScenario(wellId: string, parameters: OperatingParameters, label = "custom"): Promise<SimulateResponse> {
  return fetchJson<SimulateResponse>("/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ well_id: wellId, parameters, label }),
  });
}

export function simulateTimeline(wellId: string, parameters: OperatingParameters, cycleDays = 10): Promise<TimelineResponse> {
  return fetchJson<TimelineResponse>("/simulate/timeline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ well_id: wellId, parameters, cycle_days: cycleDays }),
  });
}

export function getModelMetrics(): Promise<Record<string, unknown>> {
  return fetchJson("/model-metrics");
}

export function getExplainability(): Promise<ExplainabilityData> {
  return fetchJson<ExplainabilityData>("/model-explainability");
}

export function getWellExplainability(wellId: string): Promise<WellExplainability> {
  return fetchJson<WellExplainability>(`/model-explainability/${wellId}`);
}

export function getLiveTick(wellId: string, tick: number): Promise<LiveTick> {
  return fetchJson<LiveTick>(`/live/${wellId}?tick=${tick}`);
}

export function getFieldSnapshot(): Promise<Record<string, unknown>> {
  return fetchJson("/twinlab/field");
}

export function getPhysicsTwin(wellId: string): Promise<Record<string, unknown>> {
  return fetchJson(`/twinlab/state/${wellId}`);
}

export function postTwinlab(path: string, body: unknown = {}): Promise<Record<string, unknown>> {
  return fetchJson(`/twinlab/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function importCsv(file: File): Promise<{ imported_rows: number; filename: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/data/import`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text() || "Import failed");
  return res.json();
}
