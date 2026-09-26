"""Feature engineering for ML models."""

from __future__ import annotations

import pandas as pd

FEATURE_COLUMNS = [
    "reservoir_temperature",
    "reservoir_pressure",
    "oil_viscosity",
    "oil_api",
    "water_cut",
    "steam_volume",
    "injection_pressure",
    "injection_duration",
    "soak_time",
    "stroke_length",
    "spm",
    "vfd_setting",
    "pump_efficiency",
    "rod_load",
    "sor",
    "energy_per_barrel",
]


def preprocess(df: pd.DataFrame) -> pd.DataFrame:
    data = df.copy()
    data = data.sort_values(["well_id", "timestamp"])
    data = data.drop_duplicates(subset=["well_id", "timestamp"], keep="last")

    numeric_cols = data.select_dtypes(include="number").columns
    for col in numeric_cols:
        data[col] = data[col].ffill().bfill()

    data["production_change"] = data.groupby("well_id")["oil_rate_bopd"].diff().fillna(0)
    data["temperature_change"] = data.groupby("well_id")["reservoir_temperature"].diff().fillna(0)
    data["viscosity_change"] = data.groupby("well_id")["oil_viscosity"].diff().fillna(0)
    data["rolling_production"] = (
        data.groupby("well_id")["oil_rate_bopd"].transform(lambda s: s.rolling(7, min_periods=1).mean())
    )
    data["rolling_sor"] = data.groupby("well_id")["sor"].transform(lambda s: s.rolling(7, min_periods=1).mean())
    data["days_since_start"] = data.groupby("well_id").cumcount()

    return data


def build_feature_matrix(df: pd.DataFrame) -> pd.DataFrame:
    data = preprocess(df)
    extra = ["production_change", "temperature_change", "viscosity_change", "rolling_production", "rolling_sor"]
    cols = [c for c in FEATURE_COLUMNS + extra if c in data.columns]
    return data[cols].fillna(0)


def build_failure_labels(df: pd.DataFrame) -> pd.Series:
    data = preprocess(df)
    label = (
        (data["failure_probability"] > 0.45)
        | (data.get("rod_failure_event", 0) == 1)
        | (data.get("pump_unsetting_event", 0) == 1)
    ).astype(int)
    return label
