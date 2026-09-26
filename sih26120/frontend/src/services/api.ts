import type {
  AlertsResponse,
  AsphalteneResponse,
  ClosedLoopVerificationResponse,
  ControlDispatchPayload,
  DashboardData,
  DynagraphResponse,
  ExplainabilityData,
  LiveTick,
  OperatingParameters,
  SimulateResponse,
  ThermalCouplingResponse,
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
    const rawText = await res.text();
    let errorMessage = `Request failed: ${res.status}`;
    try {
      const parsed = JSON.parse(rawText);
      if (typeof parsed.detail === "string") {
        errorMessage = parsed.detail;
      } else if (Array.isArray(parsed.detail)) {
        errorMessage = parsed.detail
          .map((d: { msg?: string }) => d.msg || JSON.stringify(d))
          .join("; ");
      } else if (parsed.message && typeof parsed.message === "string") {
        errorMessage = parsed.message;
      } else if (rawText) {
        errorMessage = rawText;
      }
    } catch {
      if (rawText) errorMessage = rawText;
    }
    throw new Error(errorMessage);
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

export function getDynagraph(wellId: string): Promise<DynagraphResponse> {
  return fetchJson<DynagraphResponse>(`/dynagraph/${wellId}`);
}

export function simulateDynagraph(
  wellId: string,
  parameters?: OperatingParameters,
  fault?: string
): Promise<DynagraphResponse> {
  return fetchJson<DynagraphResponse>(`/dynagraph/${wellId}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parameters, fault }),
  });
}

export function getThermalCoupling(wellId: string, cycleDays = 45): Promise<ThermalCouplingResponse> {
  return fetchJson<ThermalCouplingResponse>(`/css/thermal-coupling/${wellId}?cycle_days=${cycleDays}`);
}

export function simulateThermalCoupling(
  wellId: string,
  parameters?: OperatingParameters,
  cycleDays = 45
): Promise<ThermalCouplingResponse> {
  return fetchJson<ThermalCouplingResponse>(`/css/thermal-coupling/${wellId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parameters, cycle_days: cycleDays }),
  });
}

export function getAsphaltene(wellId: string, daysSinceTreatment = 35): Promise<AsphalteneResponse> {
  return fetchJson<AsphalteneResponse>(`/asphaltene/${wellId}?days_since_treatment=${daysSinceTreatment}`);
}

export function simulateAsphaltene(
  wellId: string,
  parameters?: OperatingParameters,
  daysSinceTreatment = 35
): Promise<AsphalteneResponse> {
  return fetchJson<AsphalteneResponse>(`/asphaltene/${wellId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parameters, cycle_days: daysSinceTreatment }),
  });
}

export function getControlTriggers(wellId: string): Promise<Record<string, unknown>> {
  return fetchJson<Record<string, unknown>>(`/control/triggers/${wellId}`);
}

export function generateControlPayload(
  wellId: string,
  targetSpm = 6.0,
  mode = "advisory",
  parameters?: OperatingParameters
): Promise<ControlDispatchPayload> {
  return fetchJson<ControlDispatchPayload>(`/control/payload/${wellId}?target_spm=${targetSpm}&mode=${mode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ well_id: wellId, parameters }),
  });
}

export function dispatchControl(wellId: string, payload: ControlDispatchPayload): Promise<Record<string, unknown>> {
  return fetchJson<Record<string, unknown>>(`/control/dispatch/${wellId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function verifyControl(wellId: string, dispatchId: string): Promise<ClosedLoopVerificationResponse> {
  return fetchJson<ClosedLoopVerificationResponse>(`/control/verify/${wellId}?dispatch_id=${dispatchId}`);
}
