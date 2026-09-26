from pydantic import BaseModel, Field
from app.schemas.prediction import OperatingParameters


class ThermalCouplingPoint(BaseModel):
    cycle_day: int = Field(..., description="Day in CSS cycle")
    phase: str = Field(..., description="Phase: injection | soak | production")
    reservoir_temperature_c: float = Field(..., description="Reservoir temperature (°C)")
    viscosity_cp: float = Field(..., description="Crude oil viscosity (cP)")
    oil_rate_bopd: float = Field(..., description="Oil production rate (BOPD)")
    max_allowable_spm: float = Field(..., description="Dynamic SPM safety upper limit to prevent rod floating")
    actual_spm: float = Field(..., description="Operating SPM setting")
    rod_floating_risk: bool = Field(..., description="True if actual SPM exceeds max allowable SPM")
    energy_per_barrel_usd: float = Field(..., description="Total energy cost per barrel ($/bbl)")
    cumulative_sor: float = Field(..., description="Cumulative Steam-Oil Ratio (t steam / bbl oil)")
    daily_net_margin_usd: float = Field(..., description="Daily net operating profit ($/day)")
    is_economic_cutoff: bool = Field(..., description="True if past economic production cutoff point")


class ThermalCouplingSimulateRequest(BaseModel):
    parameters: OperatingParameters | None = None
    cycle_days: int = 45


class ThermalCouplingResponse(BaseModel):
    well_id: str
    well_name: str
    current_cycle_day: int
    economic_cutoff_day: int = Field(..., description="Pinpointed day when daily net margin becomes negative")
    resteam_trigger_recommended: bool = Field(..., description="True if next CSS steam injection cycle should be triggered")
    trigger_message: str = Field(..., description="Automated decision recommendation summary")
    peak_temperature_c: float
    cold_viscosity_cp: float
    current_max_allowable_spm: float
    current_operating_spm: float
    timeline: list[ThermalCouplingPoint]
    operating_parameters: OperatingParameters
    assumptions: dict
    demo_disclaimer: str = "Coupling model simulates 1D reservoir heat dissipation & sucker rod downstroke settling dynamics."
