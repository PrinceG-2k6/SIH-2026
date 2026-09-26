from pydantic import BaseModel, Field

from app.schemas.prediction import OperatingParameters, PredictResponse


class SimulateRequest(BaseModel):
    well_id: str
    parameters: OperatingParameters
    label: str = "custom_scenario"


class ScenarioComparison(BaseModel):
    label: str
    metrics: dict[str, float]
    parameters: OperatingParameters | None = None


class SimulateResponse(BaseModel):
    well_id: str
    scenario_label: str
    prediction: PredictResponse
    estimated_operating_cost: float
    warnings: list[str]
    comparison_vs_current: dict[str, float]
    demo_disclaimer: str = "Scenario simulation uses synthetic models — not a guaranteed outcome."


class TimelineRequest(BaseModel):
    well_id: str
    parameters: OperatingParameters
    cycle_days: int = Field(default=10, ge=1, le=30)


class TimelinePoint(BaseModel):
    cycle_day: int
    reservoir_temperature: float
    oil_viscosity: float
    oil_rate_bopd: float
    sor: float
    pump_efficiency: float
    failure_probability: float


class TimelineResponse(BaseModel):
    well_id: str
    points: list[TimelinePoint]
    demo_disclaimer: str = "Timeline driven by synthetic simulation layer."
