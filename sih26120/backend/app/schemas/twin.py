from pydantic import BaseModel

from app.schemas.prediction import OperatingParameters


class TwinScenarioRequest(BaseModel):
    mode: str = "scenario"
    parameters: OperatingParameters | None = None


class TwinState(BaseModel):
    well_id: str
    mode: str  # current | predicted | optimized | scenario
    reservoir_temperature: float
    oil_viscosity: float
    oil_rate_bopd: float
    sor: float
    steam_volume: float
    injection_pressure: float
    spm: float
    stroke_length: float
    pump_efficiency: float
    rod_load: float
    rod_floating_probability: float
    failure_probability: float
    parameters: OperatingParameters
    heated_radius_m: float = 12.0
    cycle_day: int = 18
    phase: str = "production"
    depth_m: float = 1100.0
    demo_disclaimer: str = "3D state reflects backend simulation values."
