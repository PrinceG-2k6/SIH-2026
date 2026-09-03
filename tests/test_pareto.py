"""Tests for Pareto selection logic."""

from app.ml.predictor import PredictResponse
from app.optimization.pareto import pareto_front, select_pareto_alternatives
from app.schemas.prediction import OperatingParameters


def _pred(prod: float, sor: float, fail: float) -> PredictResponse:
    return PredictResponse(
        well_id="BGW-001",
        model_production="XGBoost",
        model_failure="XGBoost",
        predicted_oil_rate_bopd=prod,
        predicted_reservoir_temperature=55,
        predicted_oil_viscosity=300,
        predicted_sor=sor,
        predicted_energy_per_barrel=5,
        predicted_pump_efficiency=0.8,
        predicted_rod_load=50,
        predicted_rod_floating_probability=0.1,
        predicted_failure_probability=fail,
    )


def _candidate(prod: float, sor: float, fail: float, score: float):
    params = OperatingParameters(
        steam_volume=500, injection_pressure=8, injection_duration=72,
        soak_time=48, stroke_length=2.5, spm=6, vfd_setting=70,
    )
    return (params, _pred(prod, sor, fail), score)


def test_pareto_front_excludes_dominated():
    scored = [
        _candidate(80, 4.0, 0.2, 70),
        _candidate(75, 3.5, 0.15, 68),  # better on SOR and fail, slightly lower prod - may be on front
        _candidate(60, 5.0, 0.3, 50),   # dominated by first
    ]
    front = pareto_front(scored)
    assert len(front) >= 1
    assert not any(c[1].predicted_oil_rate_bopd == 60 for c in front)


def test_select_pareto_returns_three_options():
    scored = [
        _candidate(90, 5.0, 0.25, 75),
        _candidate(82, 3.7, 0.08, 72),
        _candidate(78, 3.2, 0.05, 70),
        _candidate(70, 4.5, 0.15, 65),
    ]
    options = select_pareto_alternatives(scored)
    assert len(options) == 3
    labels = {label for label, _ in options}
    assert "option_a_production" in labels
    assert "option_b_efficiency" in labels
    assert "option_c_reliability" in labels
