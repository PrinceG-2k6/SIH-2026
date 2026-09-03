"""What-if scenario engine and CSS cycle timeline simulation."""

from __future__ import annotations

from app.data.loader import get_latest_state
from app.ml.predictor import predict
from app.schemas.prediction import OperatingParameters, PredictResponse
from app.schemas.simulation import (
    SimulateRequest,
    SimulateResponse,
    TimelinePoint,
    TimelineRequest,
    TimelineResponse,
)


def _estimate_cost(params: OperatingParameters, oil_rate: float, energy_per_barrel: float) -> float:
    steam_cost = params.steam_volume * 2.5
    energy_cost = energy_per_barrel * max(oil_rate, 1) * 0.12
    return round(steam_cost + energy_cost, 2)


def _build_warnings(pred: PredictResponse, params: OperatingParameters) -> list[str]:
    warnings: list[str] = []
    if pred.predicted_sor > 4.5:
        warnings.append("High Steam-Oil Ratio — steam may exceed production benefit.")
    if pred.predicted_failure_probability > 0.35:
        warnings.append("Elevated equipment failure risk at these SRP settings.")
    if pred.predicted_rod_floating_probability > 0.4:
        warnings.append("Rod floating probability is high — consider reducing SPM or improving heating.")
    if pred.predicted_pump_efficiency < 0.55:
        warnings.append("Pump efficiency is low — check viscosity and stroke settings.")
    if params.steam_volume > 650 and pred.predicted_oil_rate_bopd < 70:
        warnings.append("Excessive steam without proportional production gain.")
    return warnings


def simulate(body: SimulateRequest) -> SimulateResponse:
    current = predict(body.well_id)
    scenario = predict(body.well_id, body.parameters)

    comparison = {
        "production_change_bopd": round(scenario.predicted_oil_rate_bopd - current.predicted_oil_rate_bopd, 2),
        "production_change_pct": round(
            ((scenario.predicted_oil_rate_bopd - current.predicted_oil_rate_bopd) / max(current.predicted_oil_rate_bopd, 1)) * 100,
            2,
        ),
        "sor_change": round(scenario.predicted_sor - current.predicted_sor, 3),
        "failure_risk_change": round(scenario.predicted_failure_probability - current.predicted_failure_probability, 3),
        "energy_per_barrel_change": round(
            scenario.predicted_energy_per_barrel - current.predicted_energy_per_barrel, 3
        ),
    }

    cost = _estimate_cost(body.parameters, scenario.predicted_oil_rate_bopd, scenario.predicted_energy_per_barrel)

    return SimulateResponse(
        well_id=body.well_id,
        scenario_label=body.label,
        prediction=scenario,
        estimated_operating_cost=cost,
        warnings=_build_warnings(scenario, body.parameters),
        comparison_vs_current=comparison,
    )


def simulate_three_way(well_id: str, custom: OperatingParameters) -> dict:
    from app.data.loader import get_latest_state
    from app.optimization.optimizer import optimize

    state = get_latest_state(well_id)
    if not state:
        raise ValueError(f"Well {well_id} not found")

    current_params = OperatingParameters(
        steam_volume=state.steam_volume,
        injection_pressure=state.injection_pressure,
        injection_duration=state.injection_duration,
        soak_time=state.soak_time,
        stroke_length=state.stroke_length,
        spm=state.spm,
        vfd_setting=state.vfd_setting,
    )

    current = predict(well_id, current_params)
    custom_pred = predict(well_id, custom)
    opt = optimize(well_id)
    recommended = predict(well_id, opt.recommended.parameters)

    def pack(label: str, pred: PredictResponse, params: OperatingParameters) -> dict:
        return {
            "label": label,
            "prediction": pred.model_dump(),
            "parameters": params.model_dump(),
        }

    return {
        "well_id": well_id,
        "scenarios": [
            pack("Current Operation", current, current_params),
            pack("AI Recommendation", recommended, opt.recommended.parameters),
            pack("Custom Scenario", custom_pred, custom),
        ],
    }


def simulate_timeline(body: TimelineRequest) -> TimelineResponse:
    state = get_latest_state(body.well_id)
    if not state:
        raise ValueError(f"Well {body.well_id} not found")

    base_temp = state.reservoir_temperature
    base_visc = state.oil_viscosity
    points: list[TimelinePoint] = []

    for day in range(body.cycle_days + 1):
        phase_factor = min(1.0, day / max(body.cycle_days, 1))
        if day <= 2:
            temp = base_temp + body.parameters.steam_volume / 350 * (day + 1) * 0.3
        elif day <= 5:
            temp = base_temp + body.parameters.steam_volume / 350 * 0.8
        else:
            temp = base_temp + body.parameters.steam_volume / 350 * 0.8 - (day - 5) * 0.15

        temp = max(44, min(72, temp))
        visc = max(80, base_visc * (base_temp / max(temp, 1)) * (1 - phase_factor * 0.2))
        params = body.parameters
        oil_rate = max(
            5,
            20
            + (temp - 42) * 1.2
            + (800 / visc) * 0.05
            + params.spm * params.stroke_length * 0.8
            - max(0, day - 7) * 0.5,
        )
        sor = max(1.5, params.steam_volume / max(oil_rate, 1) * 0.08)
        pump_eff = max(0.35, 0.88 - max(0, visc - 400) / 2500 - max(0, params.spm - 7) * 0.04)
        fail_prob = min(0.95, 0.05 + max(0, visc - 350) / 800 + max(0, params.spm - 6.5) * 0.06)

        points.append(
            TimelinePoint(
                cycle_day=day,
                reservoir_temperature=round(temp, 2),
                oil_viscosity=round(visc, 2),
                oil_rate_bopd=round(oil_rate, 2),
                sor=round(sor, 3),
                pump_efficiency=round(pump_eff, 3),
                failure_probability=round(fail_prob, 3),
            )
        )

    return TimelineResponse(well_id=body.well_id, points=points)
