"""Model training with comparison framework."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_absolute_error,
    r2_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier, XGBRegressor

from app.config import settings
from app.data.loader import get_training_dataframe
from app.ml.features import build_failure_labels, build_feature_matrix, preprocess


@dataclass
class ModelMetrics:
    task: str
    model_name: str
    mae: float | None = None
    rmse: float | None = None
    r2: float | None = None
    f1: float | None = None
    roc_auc: float | None = None
    samples: int = 0
    validation_method: str = "chronological 80/20 split"


def _chronological_split(X: pd.DataFrame, y: pd.Series, test_size: float = 0.2):
    split_idx = int(len(X) * (1 - test_size))
    return X.iloc[:split_idx], X.iloc[split_idx:], y.iloc[:split_idx], y.iloc[split_idx:]


def _evaluate_regression(name: str, model, X_test, y_test) -> ModelMetrics:
    preds = model.predict(X_test)
    mae = float(mean_absolute_error(y_test, preds))
    rmse = float(np.sqrt(np.mean((y_test - preds) ** 2)))
    r2 = float(r2_score(y_test, preds))
    return ModelMetrics(task="production_forecast", model_name=name, mae=mae, rmse=rmse, r2=r2, samples=len(y_test))


def _evaluate_classification(name: str, model, X_test, y_test) -> ModelMetrics:
    preds = model.predict(X_test)
    proba = model.predict_proba(X_test)[:, 1] if hasattr(model, "predict_proba") else preds
    f1 = float(f1_score(y_test, preds, zero_division=0))
    auc = float(roc_auc_score(y_test, proba)) if len(np.unique(y_test)) > 1 else 0.0
    acc = float(accuracy_score(y_test, preds))
    return ModelMetrics(
        task="failure_risk",
        model_name=name,
        f1=f1,
        roc_auc=auc,
        r2=acc,
        samples=len(y_test),
    )


def train_models(force: bool = False) -> dict:
    settings.model_dir.mkdir(parents=True, exist_ok=True)
    prod_path = settings.model_dir / "production_model.joblib"
    fail_path = settings.model_dir / "failure_model.joblib"
    metrics_path = settings.model_dir / "metrics.json"

    import sklearn

    sk_ver = sklearn.__version__
    if prod_path.exists() and fail_path.exists() and metrics_path.exists() and not force:
        with open(metrics_path) as f:
            cached = json.load(f)
        # Retrain when sklearn major.minor changed — pickled estimators break across versions.
        if cached.get("sklearn_version", "").rsplit(".", 1)[0] == sk_ver.rsplit(".", 1)[0]:
            return cached
        force = True

    df = get_training_dataframe()
    data = preprocess(df)
    X = build_feature_matrix(data)
    y_prod = data["oil_rate_bopd"]
    y_fail = build_failure_labels(data)

    X_train, X_test, y_train, y_test = _chronological_split(X, y_prod)
    _, _, yf_train, yf_test = _chronological_split(X, y_fail)

    reg_candidates = {
        "LinearRegression": LinearRegression(),
        "RandomForest": RandomForestRegressor(n_estimators=100, random_state=42, max_depth=8),
        "XGBoost": XGBRegressor(
            n_estimators=120, max_depth=6, learning_rate=0.08, random_state=42, objective="reg:squarederror"
        ),
    }

    best_reg = None
    best_reg_metrics = None
    reg_comparison = []
    for name, model in reg_candidates.items():
        model.fit(X_train, y_train)
        metrics = _evaluate_regression(name, model, X_test, y_test)
        reg_comparison.append(asdict(metrics))
        if best_reg is None or (metrics.r2 or -999) > (best_reg_metrics.r2 or -999):
            best_reg = model
            best_reg_metrics = metrics

    clf_candidates = {
        "LogisticRegression": Pipeline([
            ("scale", StandardScaler()),
            ("clf", LogisticRegression(max_iter=1000, random_state=42)),
        ]),
        "RandomForest": RandomForestClassifier(n_estimators=100, random_state=42, max_depth=8),
        "XGBoost": XGBClassifier(
            n_estimators=120, max_depth=5, learning_rate=0.08, random_state=42,
            eval_metric="logloss",
        ),
    }

    best_clf = None
    best_clf_metrics = None
    clf_comparison = []
    for name, model in clf_candidates.items():
        model.fit(X_train, yf_train)
        metrics = _evaluate_classification(name, model, X_test, yf_test)
        clf_comparison.append(asdict(metrics))
        if best_clf is None or (metrics.f1 or 0) > (best_clf_metrics.f1 or 0):
            best_clf = model
            best_clf_metrics = metrics

    joblib.dump({"model": best_reg, "features": list(X.columns), "sklearn_version": sk_ver}, prod_path)
    joblib.dump({"model": best_clf, "features": list(X.columns), "sklearn_version": sk_ver}, fail_path)

    result = {
        "production": {"selected": asdict(best_reg_metrics), "comparison": reg_comparison},
        "failure": {"selected": asdict(best_clf_metrics), "comparison": clf_comparison},
        "feature_columns": list(X.columns),
        "sklearn_version": sk_ver,
        "disclaimer": "Models trained on synthetic demo data only.",
    }
    with open(metrics_path, "w") as f:
        json.dump(result, f, indent=2)
    return result


def load_production_model():
    train_models()
    bundle = joblib.load(settings.model_dir / "production_model.joblib")
    return bundle["model"], bundle["features"]


def load_failure_model():
    train_models()
    bundle = joblib.load(settings.model_dir / "failure_model.joblib")
    return bundle["model"], bundle["features"]


def clear_model_cache_files() -> None:
    """Force next train_models() call to rebuild pickles."""
    for name in ("production_model.joblib", "failure_model.joblib", "metrics.json"):
        path = settings.model_dir / name
        if path.exists():
            path.unlink()
