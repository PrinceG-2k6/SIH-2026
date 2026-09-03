export type PageId = "overview" | "whatif" | "twin" | "alerts" | "models" | "data";

export interface WellSummary {
  well_id: string;
  name: string;
  field: string;
  api_gravity: number;
  status: string;
}

export interface WellState {
  well_id: string;
  timestamp: string;
  css_cycle_id: number;
  reservoir_temperature: number;
  reservoir_pressure: number;
  oil_viscosity: number;
  oil_api: number;
  water_cut: number;
  steam_volume: number;
  steam_rate: number;
  injection_pressure: number;
  injection_duration: number;
  soak_time: number;
  oil_rate_bopd: number;
  stroke_length: number;
  spm: number;
  vfd_setting: number;
  pump_efficiency: number;
  rod_load: number;
  energy_consumption: number;
  sor: number;
  energy_per_barrel: number;
  rod_floating_probability: number;
  failure_probability: number;
}

export interface HistoryPoint {
  timestamp: string;
  oil_rate_bopd: number;
  reservoir_temperature: number;
  oil_viscosity: number;
  sor: number;
  energy_per_barrel: number;
  rod_load: number;
  failure_probability: number;
}

export interface PredictResponse {
  well_id: string;
  model_production: string;
  model_failure: string;
  predicted_oil_rate_bopd: number;
  predicted_reservoir_temperature: number;
  predicted_oil_viscosity: number;
  predicted_sor: number;
  predicted_energy_per_barrel: number;
  predicted_pump_efficiency: number;
  predicted_rod_load: number;
  predicted_rod_floating_probability: number;
  predicted_failure_probability: number;
  demo_disclaimer: string;
}

export interface OperatingParameters {
  steam_volume: number;
  injection_pressure: number;
  injection_duration: number;
  soak_time: number;
  stroke_length: number;
  spm: number;
  vfd_setting: number;
}

export interface Recommendation {
  parameters: OperatingParameters;
  predicted_oil_rate_bopd: number;
  predicted_sor: number;
  predicted_energy_per_barrel: number;
  predicted_failure_probability: number;
  predicted_rod_floating_probability: number;
  score: number;
  label: string;
}

export interface OptimizeResponse {
  well_id: string;
  recommended: Recommendation;
  alternatives: Recommendation[];
  pareto_options: Recommendation[];
  explanation: string[];
  demo_disclaimer: string;
}

export interface CompareMetrics {
  production_bopd: number;
  reservoir_temperature: number;
  oil_viscosity: number;
  sor: number;
  energy_per_barrel: number;
  pump_efficiency: number;
  rod_load: number;
  rod_floating_probability: number;
  failure_probability: number;
}

export interface ComparisonResponse {
  well_id: string;
  current: CompareMetrics;
  recommended: CompareMetrics;
  production_change_pct: number;
  sor_change_pct: number;
  failure_risk_change_pct: number;
  summary: string;
}

export interface Alert {
  severity: "INFO" | "WARNING" | "CRITICAL";
  code: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
}

export interface AlertsResponse {
  well_id: string;
  alerts: Alert[];
  alert_count: number;
}

export interface DashboardData {
  well_id: string;
  current_state: WellState;
  history: HistoryPoint[];
  prediction: PredictResponse;
  optimization: OptimizeResponse;
  comparison: ComparisonResponse;
  model_metrics: Record<string, unknown>;
  alerts: AlertsResponse;
  demo_disclaimer: string;
}

export interface SimulateResponse {
  well_id: string;
  scenario_label: string;
  prediction: PredictResponse;
  estimated_operating_cost: number;
  warnings: string[];
  comparison_vs_current: Record<string, number>;
  demo_disclaimer: string;
}

export interface TimelinePoint {
  cycle_day: number;
  reservoir_temperature: number;
  oil_viscosity: number;
  oil_rate_bopd: number;
  sor: number;
  pump_efficiency: number;
  failure_probability: number;
}

export interface TimelineResponse {
  well_id: string;
  points: TimelinePoint[];
  demo_disclaimer: string;
}

export interface TwinState {
  well_id: string;
  mode: string;
  reservoir_temperature: number;
  oil_viscosity: number;
  oil_rate_bopd: number;
  sor: number;
  steam_volume: number;
  injection_pressure: number;
  spm: number;
  stroke_length: number;
  pump_efficiency: number;
  rod_load: number;
  rod_floating_probability: number;
  failure_probability: number;
  parameters: OperatingParameters;
  demo_disclaimer: string;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface FeatureContribution {
  feature: string;
  shap_value: number;
  feature_value: number;
  direction: string;
}

export interface WellExplainability {
  well_id: string;
  method: string;
  production_forecast: { contributions: FeatureContribution[]; note: string };
  failure_risk: { contributions: FeatureContribution[]; note: string };
  disclaimer: string;
}

export interface ExplainabilityData {
  production_forecast: { top_features: FeatureImportance[]; note: string };
  failure_risk: { top_features: FeatureImportance[]; note: string };
  disclaimer: string;
}

export const DEFAULT_PARAMS: OperatingParameters = {
  steam_volume: 500,
  injection_pressure: 8,
  injection_duration: 72,
  soak_time: 48,
  stroke_length: 2.5,
  spm: 6,
  vfd_setting: 70,
};

export type TwinMode = "current" | "predicted" | "optimized" | "scenario";

export interface LiveTick {
  well_id: string;
  tick: number;
  timestamp: string;
  oil_rate_bopd: number;
  reservoir_temperature: number;
  oil_viscosity: number;
  sor: number;
  spm: number;
  rod_load: number;
  pump_efficiency: number;
  failure_probability: number;
  simulation_label: string;
}
