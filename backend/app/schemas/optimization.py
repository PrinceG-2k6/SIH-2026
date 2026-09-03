from pydantic import BaseModel, Field
from app.schemas.prediction import OperatingParameters


class OptimizeRequest(BaseModel):
    well_id: str
    weights: dict[str, float] | None = None


class Recommendation(BaseModel):
    parameters: OperatingParameters
    predicted_oil_rate_bopd: float
    predicted_sor: float
    predicted_energy_per_barrel: float
    predicted_failure_probability: float
    predicted_rod_floating_probability: float
    score: float
    label: str = "balanced"


class OptimizeResponse(BaseModel):
    well_id: str
    recommended: Recommendation
    alternatives: list[Recommendation]
    pareto_options: list[Recommendation] = Field(default_factory=list)
    explanation: list[str]
    demo_disclaimer: str = "Recommendations use demo constraints and synthetic models — verify before field use."


class CompareMetrics(BaseModel):
    production_bopd: float
    reservoir_temperature: float
    oil_viscosity: float
    sor: float
    energy_per_barrel: float
    pump_efficiency: float
    rod_load: float
    rod_floating_probability: float
    failure_probability: float


class ComparisonResponse(BaseModel):
    well_id: str
    current: CompareMetrics
    recommended: CompareMetrics
    production_change_pct: float
    sor_change_pct: float
    failure_risk_change_pct: float
    summary: str
