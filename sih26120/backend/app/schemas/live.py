from datetime import datetime

from pydantic import BaseModel


class LiveTick(BaseModel):
    well_id: str
    tick: int
    timestamp: datetime
    oil_rate_bopd: float
    reservoir_temperature: float
    oil_viscosity: float
    sor: float
    spm: float
    rod_load: float
    pump_efficiency: float
    failure_probability: float
    simulation_label: str
