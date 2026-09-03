"""Constrained CSS + SRP optimizer using prediction models."""

from __future__ import annotations

import itertools
import random

from app.config import settings
from app.ml.predictor import predict
from app.optimization.cache import cached_optimize
from app.optimization.pareto import select_pareto_alternatives
from app.schemas.optimization import (
    CompareMetrics,
    ComparisonResponse,
    OptimizeResponse,
    Recommendation,
)
from app.schemas.prediction import OperatingParameters, PredictResponse


def _within_constraints(params: OperatingParameters) -> bool:
    s = settings
    checks = [
        s.min_steam_volume_tons <= params.steam_volume <= s.max_steam_volume_tons,
        s.min_injection_pressure_bar <= params.injection_pressure <= s.max_injection_pressure_bar,
        s.min_injection_duration_hours <= params.injection_duration <= s.max_injection_duration_hours,
        s.min_soak_time_hours <= params.soak_time <= s.max_soak_time_hours,
        s.min_spm <= params.spm <= s.max_spm,
        s.min_stroke_length_m <= params.stroke_length <= s.max_stroke_length_m,
        s.min_vfd_pct <= params.vfd_setting <= s.max_vfd_pct,
    ]
    return all(checks)


def _score_prediction(pred: PredictResponse, weights: dict[str, float] | None = None) -> float:
    w = weights or {}
    wp = w.get("production", settings.weight_production)
    ws = w.get("sor", settings.weight_sor_penalty)
    we = w.get("energy", settings.weight_energy_penalty)
    wf = w.get("failure", settings.weight_failure_penalty)

    rod_penalty = max(0.0, pred.predicted_rod_load - settings.max_rod_load_kn) * 2.0
    fail_penalty = max(0.0, pred.predicted_failure_probability - settings.max_failure_probability) * 120

    return (
        wp * pred.predicted_oil_rate_bopd
        - ws * pred.predicted_sor * 10
        - we * pred.predicted_energy_per_barrel
        - wf * pred.predicted_failure_probability * 100
        - rod_penalty
        - fail_penalty
    )


def _prediction_to_recommendation(
    params: OperatingParameters, pred: PredictResponse, score: float, label: str
) -> Recommendation:
    return Recommendation(
        parameters=params,
        predicted_oil_rate_bopd=pred.predicted_oil_rate_bopd,
        predicted_sor=pred.predicted_sor,
        predicted_energy_per_barrel=pred.predicted_energy_per_barrel,
        predicted_failure_probability=pred.predicted_failure_probability,
        predicted_rod_floating_probability=pred.predicted_rod_floating_probability,
        score=round(score, 3),
        label=label,
    )


def _generate_candidates(base: OperatingParameters) -> list[OperatingParameters]:
    # Compact grid for responsive demo (full search can be expanded later).
    steam_vals = [400, 500, 580, 650]
    pressure_vals = [7.5, 8.5]
    duration_vals = [72]
    soak_vals = [48, 60]
    stroke_vals = [2.2, 2.5, 2.8]
    spm_vals = [5.0, 6.0, 7.0]
    vfd_vals = [65, 80]

    candidates = []
    for combo in itertools.product(
        steam_vals, pressure_vals, duration_vals, soak_vals, stroke_vals, spm_vals, vfd_vals
    ):
        params = OperatingParameters(
            steam_volume=combo[0],
            injection_pressure=combo[1],
            injection_duration=combo[2],
            soak_time=combo[3],
            stroke_length=combo[4],
            spm=combo[5],
            vfd_setting=combo[6],
        )
        if _within_constraints(params):
            candidates.append(params)

    if len(candidates) > 72:
        random.seed(42)
        candidates = random.sample(candidates, 72)
    return candidates


def _evaluate_candidates(
    well_id: str,
    base_params: OperatingParameters,
    weights: dict[str, float] | None = None,
) -> list[tuple[OperatingParameters, PredictResponse, float]]:
    candidates = _generate_candidates(base_params)
    scored: list[tuple[OperatingParameters, PredictResponse, float]] = []
    for params in candidates:
        pred = predict(well_id, params)
        score = _score_prediction(pred, weights)
        scored.append((params, pred, score))
    return scored


def optimize(well_id: str, weights: dict[str, float] | None = None) -> OptimizeResponse:
    return cached_optimize(well_id, weights, lambda: _optimize(well_id, weights))


def _optimize(well_id: str, weights: dict[str, float] | None = None) -> OptimizeResponse:
    from app.data.loader import get_latest_state

    state = get_latest_state(well_id)
    if not state:
        raise ValueError(f"Well {well_id} not found")

    base_params = OperatingParameters(
        steam_volume=state.steam_volume,
        injection_pressure=state.injection_pressure,
        injection_duration=state.injection_duration,
        soak_time=state.soak_time,
        stroke_length=state.stroke_length,
        spm=state.spm,
        vfd_setting=state.vfd_setting,
    )

    candidates = _evaluate_candidates(well_id, base_params, weights)
    scored = candidates
    scored.sort(key=lambda x: x[2], reverse=True)
    if not scored:
        raise ValueError("No feasible optimization candidates found within demo constraints")

    top = scored[0]
    recommended = _prediction_to_recommendation(top[0], top[1], top[2], "balanced")

    pareto_labeled = select_pareto_alternatives(scored)
    pareto_options = [
        _prediction_to_recommendation(params, pred, score, label)
        for label, (params, pred, score) in pareto_labeled
    ]

    alternatives = pareto_options if pareto_options else []
    if len(alternatives) < 3:
        labels = ["production_focus", "efficiency_focus", "reliability_focus"]
        for i, (params, pred, score) in enumerate(scored[1:4]):
            alt = _prediction_to_recommendation(params, pred, score, labels[i] if i < len(labels) else f"alt_{i}")
            if alt.label not in {a.label for a in alternatives}:
                alternatives.append(alt)

    explanation = _build_explanation(state, recommended, top[1])

    return OptimizeResponse(
        well_id=well_id,
        recommended=recommended,
        alternatives=alternatives[:3],
        pareto_options=pareto_options,
        explanation=explanation,
    )


def _build_explanation(state, rec: Recommendation, pred: PredictResponse) -> list[str]:
    reasons = []
    if state and state.reservoir_temperature < 52:
        reasons.append("Current reservoir temperature is relatively low; increased steam supports heating.")
    if pred.predicted_oil_viscosity > 400:
        reasons.append("Predicted viscosity remains elevated; moderate steam and SRP tuning improve mobility.")
    reasons.append(
        f"Selected steam volume {rec.parameters.steam_volume:.0f} tons balances production "
        f"({rec.predicted_oil_rate_bopd:.1f} BOPD) and SOR ({rec.predicted_sor:.2f})."
    )
    reasons.append(
        f"SPM {rec.parameters.spm:.1f} and stroke {rec.parameters.stroke_length:.1f} m keep failure risk "
        f"at {rec.predicted_failure_probability * 100:.1f}% within demo limits."
    )
    if rec.predicted_sor > 4:
        reasons.append("Higher steam volumes showed diminishing production gains with rising SOR.")
    return reasons


def compare_current_vs_recommended(
    well_id: str,
    optimization: OptimizeResponse | None = None,
) -> ComparisonResponse:
    from app.data.loader import get_latest_state

    state = get_latest_state(well_id)
    if not state:
        raise ValueError(f"Well {well_id} not found")

    current_pred = predict(well_id)
    opt = optimization or optimize(well_id)
    rec_pred = predict(well_id, opt.recommended.parameters)

    current = CompareMetrics(
        production_bopd=current_pred.predicted_oil_rate_bopd,
        reservoir_temperature=current_pred.predicted_reservoir_temperature,
        oil_viscosity=current_pred.predicted_oil_viscosity,
        sor=current_pred.predicted_sor,
        energy_per_barrel=current_pred.predicted_energy_per_barrel,
        pump_efficiency=current_pred.predicted_pump_efficiency,
        rod_load=current_pred.predicted_rod_load,
        rod_floating_probability=current_pred.predicted_rod_floating_probability,
        failure_probability=current_pred.predicted_failure_probability,
    )
    recommended = CompareMetrics(
        production_bopd=rec_pred.predicted_oil_rate_bopd,
        reservoir_temperature=rec_pred.predicted_reservoir_temperature,
        oil_viscosity=rec_pred.predicted_oil_viscosity,
        sor=rec_pred.predicted_sor,
        energy_per_barrel=rec_pred.predicted_energy_per_barrel,
        pump_efficiency=rec_pred.predicted_pump_efficiency,
        rod_load=rec_pred.predicted_rod_load,
        rod_floating_probability=rec_pred.predicted_rod_floating_probability,
        failure_probability=rec_pred.predicted_failure_probability,
    )

    prod_change = ((recommended.production_bopd - current.production_bopd) / max(current.production_bopd, 1)) * 100
    sor_change = ((recommended.sor - current.sor) / max(current.sor, 0.01)) * 100
    fail_change = (
        (recommended.failure_probability - current.failure_probability) / max(current.failure_probability, 0.01)
    ) * 100

    summary = (
        f"Expected production change: {prod_change:+.1f}%. "
        f"SOR change: {sor_change:+.1f}%. Failure risk change: {fail_change:+.1f}%."
    )

    return ComparisonResponse(
        well_id=well_id,
        current=current,
        recommended=recommended,
        production_change_pct=round(prod_change, 2),
        sor_change_pct=round(sor_change, 2),
        failure_risk_change_pct=round(fail_change, 2),
        summary=summary,
    )
