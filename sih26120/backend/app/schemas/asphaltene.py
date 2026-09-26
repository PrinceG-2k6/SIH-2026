from __future__ import annotations

from pydantic import BaseModel, Field


class AsphalteneDepthPoint(BaseModel):
    depth_m: float = Field(..., description="Tubing depth in meters")
    pressure_bar: float = Field(..., description="Fluid pressure at depth in bar")
    temperature_c: float = Field(..., description="Fluid temperature at depth in °C")
    asphaltene_risk_pct: float = Field(..., description="Asphaltene precipitation risk percentage")
    asphaltene_thickness_mm: float = Field(..., description="Solid deposition thickness in mm")
    effective_diameter_in: float = Field(..., description="Effective tubing inner diameter in inches")
    constriction_pct: float = Field(..., description="Cross-sectional area loss percentage")
    fluid_velocity_ms: float = Field(..., description="Fluid flow velocity in m/s")


class AsphalteneEnvelopePoint(BaseModel):
    temperature_c: float = Field(..., description="Temperature coordinate in °C")
    onset_pressure_bar: float = Field(..., description="Asphaltene Onset Pressure (AOP) in bar")
    bubble_point_bar: float = Field(..., description="Bubble point pressure in bar")


class AsphalteneResponse(BaseModel):
    well_id: str
    days_since_treatment: int
    asphaltene_drag_kn: float
    max_constriction_pct: float
    min_effective_diameter_in: float
    nominal_diameter_in: float
    asphaltene_risk_index_pct: float
    precipitation_zone_start_m: float
    precipitation_zone_end_m: float
    critical_depth_m: float
    rod_floating_risk_pct: float
    motor_power_penalty_kw: float
    energy_cost_waste_usd: float
    treatment_recommendation: str
    treatment_urgency: str
    economic_tipping_day: int
    treatment_cost_usd: float
    cumulative_waste_usd: float
    depth_profile: list[AsphalteneDepthPoint]
    envelope_points: list[AsphalteneEnvelopePoint]
    diagnostic_label: str
    explanation: list[str]
