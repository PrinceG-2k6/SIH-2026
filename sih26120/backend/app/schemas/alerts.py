from pydantic import BaseModel


class Alert(BaseModel):
    severity: str  # INFO | WARNING | CRITICAL
    code: str
    message: str
    metric: str
    value: float
    threshold: float


class AlertsResponse(BaseModel):
    well_id: str
    alerts: list[Alert]
    alert_count: int
