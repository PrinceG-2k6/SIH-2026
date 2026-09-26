export type PageId = "overview" | "whatif" | "twin" | "lab" | "alerts" | "models" | "data";

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
  heated_radius_m?: number;
  cycle_day?: number;
  phase?: string;
  depth_m?: number;
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

export interface DynagraphPoint {
  position_m: number;
  load_kn: number;
  acceleration?: number;
}

export interface DynagraphKpis {
  work_surface_kj: number;
  work_downhole_kj: number;
  energy_expended_joules: number;
  peak_surface_load_kn: number;
  min_surface_load_kn: number;
  peak_downhole_load_kn: number;
  min_downhole_load_kn: number;
  buoyant_rod_weight_kn: number;
  pump_efficiency_pct: number;
  pump_fillage_pct: number;
  effective_stroke_m: number;
}

export interface DynagraphStructuralSafety {
  goodman_utilization: number;
  is_safe: boolean;
  rod_stress_max_mpa: number;
  carrier_bar_separation_prob: number;
}

export interface DynagraphResponse {
  well_id: string;
  well_name: string;
  diagnostic_label: "NORMAL" | "ROD_FLOATING" | "FLUID_POUND" | "GAS_INTERFERENCE" | "UNSEATED_PUMP" | string;
  severity: "OK" | "WARNING" | "CRITICAL";
  rod_floating_detected: boolean;
  surface_card: DynagraphPoint[];
  downhole_card: DynagraphPoint[];
  kpis: DynagraphKpis;
  structural_safety: DynagraphStructuralSafety;
  alerts: string[];
  operating_parameters: OperatingParameters;
  notes: string[];
  demo_disclaimer: string;
}

export interface ThermalCouplingPoint {
  cycle_day: number;
  phase: string;
  reservoir_temperature_c: number;
  viscosity_cp: number;
  oil_rate_bopd: number;
  max_allowable_spm: number;
  actual_spm: number;
  rod_floating_risk: boolean;
  energy_per_barrel_usd: number;
  cumulative_sor: number;
  daily_net_margin_usd: number;
  is_economic_cutoff: boolean;
}

export interface ThermalCouplingResponse {
  well_id: string;
  well_name: string;
  current_cycle_day: number;
  economic_cutoff_day: number;
  resteam_trigger_recommended: boolean;
  trigger_message: string;
  peak_temperature_c: number;
  cold_viscosity_cp: number;
  current_max_allowable_spm: number;
  current_operating_spm: number;
  timeline: ThermalCouplingPoint[];
  operating_parameters: OperatingParameters;
  assumptions: Record<string, unknown>;
  demo_disclaimer: string;
}

export interface ModbusRegisterMap {
  vfd_speed_pct_reg_40001: number;
  vfd_frequency_hz_reg_40002: number;
  target_spm_reg_40003: number;
  safety_interlock_code_reg_40004: number;
  mode_code_reg_40005: number;
  transaction_id_reg_40006: number;
}

export interface MqttControlPayload {
  topic: string;
  qos: number;
  timestamp: string;
  device_id: string;
  command: string;
  payload_json: Record<string, unknown>;
}

export interface OpcUaNodeMap {
  node_spm: string;
  node_frequency: string;
  node_safety_gate: string;
}

export interface ControlDispatchPayload {
  dispatch_id: string;
  well_id: string;
  well_name: string;
  mode: "advisory" | "autonomous" | string;
  trigger_condition: string;
  recommended_spm: number;
  vfd_frequency_hz: number;
  vfd_setting_pct: number;
  safety_gate: "SAFE" | "WARNING" | "BLOCKED" | string;
  safety_reasons: string[];
  parameters: OperatingParameters;
  modbus_tcp: ModbusRegisterMap;
  mqtt: MqttControlPayload;
  opc_ua: OpcUaNodeMap;
  predicted_outcome: Record<string, number>;
  created_at: string;
  status: string;
}

export interface ClosedLoopVerificationResponse {
  well_id: string;
  dispatch_id: string;
  status: "VERIFIED_SUCCESS" | "VERIFICATION_FAILED" | "PENDING" | string;
  rod_float_cleared: boolean;
  fillage_improved: boolean;
  power_stabilized: boolean;
  before_telemetry: Record<string, number>;
  after_telemetry: Record<string, number>;
  audit_log: Record<string, unknown>;
}

export interface AsphalteneDepthPoint {
  depth_m: number;
  pressure_bar: number;
  temperature_c: number;
  asphaltene_risk_pct: number;
  asphaltene_thickness_mm: number;
  effective_diameter_in: number;
  constriction_pct: number;
  fluid_velocity_ms: number;
}

export interface AsphalteneEnvelopePoint {
  temperature_c: number;
  onset_pressure_bar: number;
  bubble_point_bar: number;
}

export interface AsphalteneResponse {
  well_id: string;
  days_since_treatment: number;
  asphaltene_drag_kn: number;
  max_constriction_pct: number;
  min_effective_diameter_in: number;
  nominal_diameter_in: number;
  asphaltene_risk_index_pct: number;
  precipitation_zone_start_m: number;
  precipitation_zone_end_m: number;
  critical_depth_m: number;
  rod_floating_risk_pct: number;
  motor_power_penalty_kw: number;
  energy_cost_waste_usd: number;
  treatment_recommendation: string;
  treatment_urgency: string;
  economic_tipping_day: number;
  treatment_cost_usd: number;
  cumulative_waste_usd: number;
  depth_profile: AsphalteneDepthPoint[];
  envelope_points: AsphalteneEnvelopePoint[];
  diagnostic_label: string;
  explanation: string[];
}

