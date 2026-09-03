"""Alert generation from model outputs and configurable thresholds."""

from __future__ import annotations

from app.config import settings
from app.ml.predictor import predict
from app.schemas.alerts import Alert, AlertsResponse
from app.schemas.prediction import OperatingParameters, PredictResponse


THRESHOLDS = {
    "rod_floating_probability": ("WARNING", 0.35, "Rod floating risk elevated"),
    "failure_probability": ("CRITICAL", 0.30, "Equipment failure risk elevated"),
    "rod_load": ("WARNING", 80.0, "Rod load approaching demo safe limit"),
    "pump_efficiency_low": ("WARNING", 0.55, "Pump efficiency below acceptable level"),
    "sor": ("WARNING", 4.5, "Steam-Oil Ratio is high"),
    "energy_per_barrel": ("INFO", 8.0, "Energy intensity per barrel is elevated"),
    "production_decline": ("INFO", -15.0, "Predicted production decline vs current"),
}


def _check(pred: PredictResponse, current: PredictResponse | None = None) -> list[Alert]:
    alerts: list[Alert] = []

    if pred.predicted_rod_floating_probability >= THRESHOLDS["rod_floating_probability"][1]:
        sev, thr, msg = THRESHOLDS["rod_floating_probability"]
        alerts.append(
            Alert(
                severity=sev, code="ROD_FLOATING", message=msg,
                metric="rod_floating_probability", value=pred.predicted_rod_floating_probability, threshold=thr,
            )
        )

    if pred.predicted_failure_probability >= THRESHOLDS["failure_probability"][1]:
        sev, thr, msg = THRESHOLDS["failure_probability"]
        alerts.append(
            Alert(
                severity=sev, code="FAILURE_RISK", message=msg,
                metric="failure_probability", value=pred.predicted_failure_probability, threshold=thr,
            )
        )

    if pred.predicted_rod_load >= THRESHOLDS["rod_load"][1]:
        sev, thr, msg = THRESHOLDS["rod_load"]
        alerts.append(
            Alert(
                severity=sev, code="ROD_LOAD", message=msg,
                metric="rod_load", value=pred.predicted_rod_load, threshold=thr,
            )
        )

    if pred.predicted_pump_efficiency <= THRESHOLDS["pump_efficiency_low"][1]:
        sev, thr, msg = THRESHOLDS["pump_efficiency_low"]
        alerts.append(
            Alert(
                severity=sev, code="PUMP_EFFICIENCY", message=msg,
                metric="pump_efficiency", value=pred.predicted_pump_efficiency, threshold=thr,
            )
        )

    if pred.predicted_sor >= THRESHOLDS["sor"][1]:
        sev, thr, msg = THRESHOLDS["sor"]
        alerts.append(
            Alert(
                severity=sev, code="HIGH_SOR", message=msg,
                metric="sor", value=pred.predicted_sor, threshold=thr,
            )
        )

    if pred.predicted_energy_per_barrel >= THRESHOLDS["energy_per_barrel"][1]:
        sev, thr, msg = THRESHOLDS["energy_per_barrel"]
        alerts.append(
            Alert(
                severity=sev, code="HIGH_ENERGY", message=msg,
                metric="energy_per_barrel", value=pred.predicted_energy_per_barrel, threshold=thr,
            )
        )

    if current:
        prod_change_pct = (
            (pred.predicted_oil_rate_bopd - current.predicted_oil_rate_bopd) / max(current.predicted_oil_rate_bopd, 1)
        ) * 100
        if prod_change_pct <= THRESHOLDS["production_decline"][1]:
            sev, thr, msg = THRESHOLDS["production_decline"]
            alerts.append(
                Alert(
                    severity=sev, code="PRODUCTION_DECLINE", message=msg,
                    metric="production_change_pct", value=prod_change_pct, threshold=thr,
                )
            )

    if pred.predicted_rod_load > settings.max_rod_load_kn:
        alerts.append(
            Alert(
                severity="CRITICAL", code="ROD_LOAD_LIMIT", message="Rod load exceeds demo configured maximum",
                metric="rod_load", value=pred.predicted_rod_load, threshold=settings.max_rod_load_kn,
            )
        )

    return alerts


def get_alerts(well_id: str, parameters: OperatingParameters | None = None) -> AlertsResponse:
    current = predict(well_id)
    target = predict(well_id, parameters) if parameters else current
    alerts = _check(target, current if parameters else None)
    severity_order = {"CRITICAL": 0, "WARNING": 1, "INFO": 2}
    alerts.sort(key=lambda a: severity_order.get(a.severity, 3))
    return AlertsResponse(well_id=well_id, alerts=alerts, alert_count=len(alerts))
