"""Optional SHAP + fallback local explanations for predictions."""

from __future__ import annotations

import numpy as np
import pandas as pd

from app.data.loader import get_latest_state
from app.ml.features import build_feature_matrix, preprocess
from app.ml.predictor import _get_models, _params_to_row
from app.ml.trainer import load_failure_model, load_production_model, train_models
from app.schemas.prediction import OperatingParameters


def _importance(model, features: list[str]) -> list[dict]:
    if hasattr(model, "feature_importances_"):
        values = model.feature_importances_
    elif hasattr(model, "coef_"):
        coef = model.coef_
        values = abs(coef.ravel()) if len(coef.shape) > 1 else abs(coef)
    else:
        return []

    pairs = sorted(zip(features, values), key=lambda x: x[1], reverse=True)
    total = sum(v for _, v in pairs) or 1
    return [
        {"feature": name, "importance": round(float(val / total), 4), "shap_value": None}
        for name, val in pairs[:10]
    ]


def _local_contributions(model, features: list[str], row: pd.DataFrame, task: str) -> list[dict]:
    X = row.reindex(columns=features, fill_value=0)
    values = X.iloc[0].values.astype(float)

    try:
        import shap

        if not hasattr(model, "get_booster") and not hasattr(model, "tree_"):
            raise ImportError("Model not tree-based")

        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X.values)

        if isinstance(shap_values, list):
            sv = shap_values[1][0] if task == "failure_risk" else shap_values[0][0]
        elif len(np.shape(shap_values)) == 3:
            sv = shap_values[0, :, 1 if task == "failure_risk" else 0]
        else:
            sv = shap_values[0]

        pairs = sorted(zip(features, sv, values), key=lambda x: abs(x[1]), reverse=True)
        return [
            {
                "feature": name,
                "shap_value": round(float(contrib), 4),
                "feature_value": round(float(fval), 4),
                "direction": "increases" if contrib > 0 else "decreases",
            }
            for name, contrib, fval in pairs[:8]
        ]
    except Exception:
        pass

    if hasattr(model, "feature_importances_"):
        imp = model.feature_importances_
    elif hasattr(model, "coef_"):
        coef = model.coef_
        imp = abs(coef.ravel()) if len(coef.shape) > 1 else abs(coef)
    else:
        return []

    approx = values * imp
    pairs = sorted(zip(features, approx, values), key=lambda x: abs(x[1]), reverse=True)
    return [
        {
            "feature": name,
            "shap_value": round(float(score), 4),
            "feature_value": round(float(fval), 4),
            "direction": "increases" if score > 0 else "decreases",
        }
        for name, score, fval in pairs[:8]
    ]


def get_explainability() -> dict:
    train_models()
    prod_model, prod_features = load_production_model()
    fail_model, fail_features = load_failure_model()

    method = "SHAP TreeExplainer" if _shap_available() else "Global feature importances"

    return {
        "production_forecast": {
            "top_features": _importance(prod_model, prod_features),
            "note": f"{method} on selected production model (demo data).",
        },
        "failure_risk": {
            "top_features": _importance(fail_model, fail_features),
            "note": f"{method} on selected failure model (demo data).",
        },
        "method": method,
        "disclaimer": "Explainability reflects model internals on synthetic data — not causal field physics.",
    }


def explain_well_prediction(
    well_id: str,
    parameters: OperatingParameters | None = None,
) -> dict:
    train_models()
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

    prod_model, prod_features = _get_models()[0]
    fail_model, fail_features = _get_models()[1]

    method = "SHAP TreeExplainer" if _shap_available() else "Approximate local contributions"

    return {
        "well_id": well_id,
        "parameters": params.model_dump(),
        "production_forecast": {
            "contributions": _local_contributions(prod_model, prod_features, X, "production"),
            "note": f"Why the model predicts this production level ({method}).",
        },
        "failure_risk": {
            "contributions": _local_contributions(fail_model, fail_features, X, "failure_risk"),
            "note": f"Why the model predicts this failure probability ({method}).",
        },
        "method": method,
        "disclaimer": "Local explanations are model-based on demo data — not guaranteed causal factors.",
    }


def _shap_available() -> bool:
    try:
        import shap  # noqa: F401

        return True
    except ImportError:
        return False
