"""Inference service — separate from optimization."""

from __future__ import annotations

import pandas as pd

from app.data.loader import get_latest_state
from app.ml.features import build_feature_matrix, preprocess
from app.ml.trainer import load_failure_model, load_production_model, train_models
from app.schemas.prediction import OperatingParameters, PredictResponse

_MODEL_CACHE: dict[str, tuple] = {}


def _get_models():
    if "production" not in _MODEL_CACHE:
        _MODEL_CACHE["production"] = load_production_model()
        _MODEL_CACHE["failure"] = load_failure_model()
    return _MODEL_CACHE["production"], _MODEL_CACHE["failure"]


def _params_to_row(well_id: str, params: OperatingParameters, base: dict) -> pd.DataFrame:
    row = {**base}
    row.update(
        {
            "well_id": well_id,
            "steam_volume": params.steam_volume,
            "injection_pressure": params.injection_pressure,
            "injection_duration": params.injection_duration,
            "soak_time": params.soak_time,
            "stroke_length": params.stroke_length,
            "spm": params.spm,
            "vfd_setting": params.vfd_setting,
        }
    )
    return pd.DataFrame([row])


def _derive_secondary_predictions(row: dict, oil_rate: float) -> dict:
    temp = float(row.get("reservoir_temperature", 48))
    steam = float(row.get("steam_volume", 450))
    spm = float(row.get("spm", 5))
    stroke = float(row.get("stroke_length", 2.4))
    viscosity = float(row.get("oil_viscosity", 500))

    predicted_temp = min(72, temp + steam / 400.0)
    predicted_viscosity = max(80, viscosity * (temp / max(predicted_temp, 1)))
    predicted_sor = max(1.5, steam / max(oil_rate, 1) * 0.08)
    predicted_energy = 120 + spm * 8 + steam / 15
    predicted_energy_per_barrel = predicted_energy / max(oil_rate, 1)
    pump_eff = max(0.35, 0.9 - max(0, viscosity - 400) / 2500 - max(0, spm - 7) * 0.04)
    rod_load = 35 + predicted_viscosity / 25 + spm * 2.5 + stroke * 8
    float_prob = min(0.95, 0.05 + max(0, predicted_viscosity - 350) / 800 + max(0, spm - 6.5) * 0.06)
    return {
        "predicted_reservoir_temperature": round(predicted_temp, 2),
        "predicted_oil_viscosity": round(predicted_viscosity, 2),
        "predicted_sor": round(predicted_sor, 3),
        "predicted_energy_per_barrel": round(predicted_energy_per_barrel, 3),
        "predicted_pump_efficiency": round(pump_eff, 3),
        "predicted_rod_load": round(rod_load, 2),
        "predicted_rod_floating_probability": round(float_prob, 3),
    }


def predict(well_id: str, parameters: OperatingParameters | None = None) -> PredictResponse:
    state = get_latest_state(well_id)
    if not state:
        raise ValueError(f"Well {well_id} not found")

    base = state.model_dump()
    params = parameters or OperatingParameters(
        steam_volume=state.steam_volume,
        injection_pressure=state.injection_pressure,
        injection_duration=state.injection_duration,
        soak_time=state.soak_time,
        stroke_length=state.stroke_length,
        spm=state.spm,
        vfd_setting=state.vfd_setting,
    )

    row_df = _params_to_row(well_id, params, base)
    full_df = preprocess(row_df)
    X = build_feature_matrix(full_df)

    (prod_model, prod_features), (fail_model, fail_features) = _get_models()

    X_prod = X.reindex(columns=prod_features, fill_value=0)
    X_fail = X.reindex(columns=fail_features, fill_value=0)

    oil_rate = float(prod_model.predict(X_prod)[0])
    fail_prob = float(fail_model.predict_proba(X_fail)[0][1]) if hasattr(fail_model, "predict_proba") else float(
        fail_model.predict(X_fail)[0]
    )

    secondary = _derive_secondary_predictions(base, oil_rate)
    prod_metrics = load_metrics()["production"]["selected"]

    return PredictResponse(
        well_id=well_id,
        model_production=prod_metrics["model_name"],
        model_failure=load_metrics()["failure"]["selected"]["model_name"],
        predicted_oil_rate_bopd=round(oil_rate, 2),
        predicted_failure_probability=round(fail_prob, 3),
        **secondary,
    )


def load_metrics() -> dict:
    return train_models()
