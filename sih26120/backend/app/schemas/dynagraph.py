from pydantic import BaseModel, Field
from app.schemas.prediction import OperatingParameters


class DynagraphPoint(BaseModel):
    position_m: float = Field(..., description="Polished rod / plunger position in meters")
    load_kn: float = Field(..., description="Surface / downhole load in kilo-Newtons")
    acceleration: float = Field(0.0, description="Polished rod acceleration in m/s^2")


class DynagraphKpis(BaseModel):
    work_surface_kj: float = Field(..., description="Enclosed surface card area / work done per stroke (kJ)")
    work_downhole_kj: float = Field(..., description="Enclosed downhole card area / subsurface work (kJ)")
    energy_expended_joules: float = Field(..., description="Mechanical energy per stroke (Joules)")
    peak_surface_load_kn: float = Field(..., description="Maximum surface rod load (kN)")
    min_surface_load_kn: float = Field(..., description="Minimum surface rod load (kN)")
    peak_downhole_load_kn: float = Field(..., description="Maximum downhole plunger load (kN)")
    min_downhole_load_kn: float = Field(..., description="Minimum downhole plunger load (kN)")
    buoyant_rod_weight_kn: float = Field(..., description="Buoyant weight of rod string (kN)")
    pump_efficiency_pct: float = Field(..., description="Volumetric pump efficiency (%)")
    pump_fillage_pct: float = Field(..., description="Pump barrel fillage (%)")
    effective_stroke_m: float = Field(..., description="Effective plunger stroke length (m)")


class DynagraphStructuralSafety(BaseModel):
    goodman_utilization: float = Field(..., description="Goodman stress utilization ratio")
    is_safe: bool = Field(..., description="True if stress within allowable Goodman envelope")
    rod_stress_max_mpa: float = Field(..., description="Peak rod stress in MPa")
    carrier_bar_separation_prob: float = Field(..., description="Carrier bar separation / float risk probability")


class DynagraphSimulateRequest(BaseModel):
    parameters: OperatingParameters | None = None
    fault: str | None = None


class DynagraphResponse(BaseModel):
    well_id: str
    well_name: str
    diagnostic_label: str = Field(..., description="Classification: NORMAL | ROD_FLOATING | FLUID_POUND | GAS_INTERFERENCE | UNSEATED_PUMP")
    severity: str = Field(..., description="Alert severity: OK | WARNING | CRITICAL")
    rod_floating_detected: bool = Field(..., description="True when downstroke friction overcomes gravity")
    surface_card: list[DynagraphPoint] = Field(..., description="100-200 coordinate pairs of position vs surface load")
    downhole_card: list[DynagraphPoint] = Field(..., description="100-200 coordinate pairs of position vs downhole load")
    kpis: DynagraphKpis
    structural_safety: DynagraphStructuralSafety
    alerts: list[str]
    operating_parameters: OperatingParameters
    notes: list[str]
    demo_disclaimer: str = "Dynagraph curves computed via 1D Damped Wave Equation & Hooke's Law physics model."
