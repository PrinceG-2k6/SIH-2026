"""Synthetic Baghewala-style demo data with physically sensible relationships."""

from __future__ import annotations

import math
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

from app.config import settings

WELLS = [
    {"well_id": "BGW-001", "name": "Baghewala Well 1", "base_temp": 47.5},
    {"well_id": "BGW-002", "name": "Baghewala Well 2", "base_temp": 48.2},
    {"well_id": "BGW-003", "name": "Baghewala Well 3", "base_temp": 46.8},
]


def viscosity_from_temp(temp_c: float, api: float = 18.0) -> float:
    """Higher temperature → lower viscosity (synthetic relationship)."""
    base = 1200.0 * math.exp(-0.045 * (temp_c - 40.0))
    api_factor = max(0.6, (22.0 - api) / 4.0)
    return max(80.0, base * api_factor + np.random.normal(0, 15))


def production_from_conditions(
    temp: float,
    viscosity: float,
    steam_volume: float,
    spm: float,
    stroke: float,
    pump_eff: float,
) -> float:
    """Production driven by mobility and SRP performance."""
    mobility = max(0.1, (temp - 42) / 25.0) * max(0.1, 800.0 / viscosity)
    steam_factor = min(1.4, 0.5 + steam_volume / 700.0)
    srp_factor = min(1.3, (spm * stroke) / 18.0) * pump_eff
    base = 25.0 + 55.0 * mobility * steam_factor * srp_factor
    return max(5.0, base + np.random.normal(0, 3))


def sor_from_steam(steam_volume: float, oil_rate: float) -> float:
    if oil_rate <= 0:
        return 10.0
    return max(1.5, steam_volume / max(oil_rate, 1.0) * 0.08 + np.random.normal(0, 0.15))


def pump_efficiency(viscosity: float, spm: float, stroke: float) -> float:
    overload = max(0, (spm - 7) * 0.04 + (viscosity - 400) / 2000)
    base = 0.88 - overload - max(0, stroke - 3.0) * 0.05
    return float(np.clip(base + np.random.normal(0, 0.02), 0.35, 0.95))


def rod_load(viscosity: float, spm: float, stroke: float) -> float:
    load = 35.0 + viscosity / 25.0 + spm * 2.5 + stroke * 8.0
    return float(max(20.0, load + np.random.normal(0, 2)))


def floating_probability(viscosity: float, spm: float, rod_load_val: float) -> float:
    risk = 0.05 + max(0, viscosity - 350) / 800 + max(0, spm - 6.5) * 0.06
    risk += max(0, rod_load_val - 70) / 200
    return float(np.clip(risk, 0.01, 0.95))


def failure_probability(floating_prob: float, rod_load_val: float, pump_eff: float) -> float:
    risk = floating_prob * 0.5 + max(0, rod_load_val - 75) / 150 + max(0, 0.7 - pump_eff) * 0.3
    return float(np.clip(risk + np.random.normal(0, 0.02), 0.01, 0.95))


def generate_well_timeseries(well: dict, days: int = 180, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed + hash(well["well_id"]) % 1000)
    np.random.seed(int(rng.integers(0, 1_000_000)))

    rows: list[dict] = []
    start = datetime(2024, 1, 1)
    temp = well["base_temp"]
    css_cycle = 1
    cumulative_oil = 0.0

    for day in range(days):
        ts = start + timedelta(days=day)
        cycle_day = day % 30

        if cycle_day < 3:
            phase = "injection"
            steam_volume = 450 + rng.normal(0, 40)
            injection_duration = 72 + rng.normal(0, 8)
            soak_time = 48 + rng.normal(0, 6)
            spm = 4.5 + rng.normal(0, 0.3)
        elif cycle_day < 6:
            phase = "soak"
            steam_volume = 450
            injection_duration = 72
            soak_time = 48
            spm = 4.0
        else:
            phase = "production"
            steam_volume = 450 + rng.normal(0, 20)
            injection_duration = 72
            soak_time = 48
            spm = 5.5 + rng.normal(0, 0.5)

        if cycle_day == 29:
            css_cycle += 1
            temp = max(44.0, temp - 1.5)

        injection_pressure = 7.5 + rng.normal(0, 0.4)
        stroke = 2.4 + rng.normal(0, 0.1)
        vfd = 65 + rng.normal(0, 5)
        api = 18.0 + rng.normal(0, 0.3)

        if phase == "injection":
            temp += steam_volume / 350.0 + rng.normal(0, 0.2)
        else:
            temp -= 0.08 + rng.normal(0, 0.05)

        temp = float(np.clip(temp, 44.0, 72.0))
        viscosity = viscosity_from_temp(temp, api)
        eff = pump_efficiency(viscosity, spm, stroke)
        load = rod_load(viscosity, spm, stroke)
        oil_rate = production_from_conditions(temp, viscosity, steam_volume, spm, stroke, eff)
        sor = sor_from_steam(steam_volume, oil_rate)
        energy = 120 + spm * 8 + steam_volume / 15 + rng.normal(0, 5)
        energy_per_barrel = energy / max(oil_rate, 1)
        float_prob = floating_probability(viscosity, spm, load)
        fail_prob = failure_probability(float_prob, load, eff)
        cumulative_oil += oil_rate

        rows.append(
            {
                "well_id": well["well_id"],
                "well_name": well["name"],
                "timestamp": ts.isoformat(),
                "css_cycle_id": css_cycle,
                "phase": phase,
                "reservoir_temperature": round(temp, 2),
                "reservoir_pressure": round(12.5 + rng.normal(0, 0.3), 2),
                "oil_viscosity": round(viscosity, 2),
                "oil_api": round(api, 2),
                "asphaltene_content": round(8.5 + rng.normal(0, 0.2), 2),
                "water_cut": round(min(45, 15 + day * 0.05 + rng.normal(0, 1)), 2),
                "steam_volume": round(steam_volume, 2),
                "steam_rate": round(steam_volume / max(injection_duration, 1), 3),
                "injection_pressure": round(injection_pressure, 2),
                "injection_duration": round(injection_duration, 2),
                "soak_time": round(soak_time, 2),
                "production_start": cycle_day >= 6,
                "production_cutoff": cycle_day >= 25,
                "oil_rate_bopd": round(oil_rate, 2),
                "water_rate": round(oil_rate * 0.2, 2),
                "total_fluid_rate": round(oil_rate * 1.2, 2),
                "cumulative_oil": round(cumulative_oil, 2),
                "stroke_length": round(stroke, 2),
                "spm": round(spm, 2),
                "vfd_setting": round(np.clip(vfd, 40, 100), 2),
                "pump_efficiency": round(eff, 3),
                "rod_load": round(load, 2),
                "pump_unsetting_event": int(fail_prob > 0.6 and rng.random() < 0.02),
                "rod_floating_event": int(float_prob > 0.5 and rng.random() < 0.03),
                "rod_failure_event": int(fail_prob > 0.7 and rng.random() < 0.01),
                "energy_consumption": round(energy, 2),
                "power": round(energy / 24, 2),
                "operating_cost": round(energy * 0.12 + steam_volume * 2.5, 2),
                "sor": round(sor, 3),
                "energy_per_barrel": round(energy_per_barrel, 3),
                "rod_floating_probability": round(float_prob, 3),
                "failure_probability": round(fail_prob, 3),
            }
        )

    return pd.DataFrame(rows)


def generate_demo_dataset(output_dir: Path | None = None) -> pd.DataFrame:
    output_dir = output_dir or settings.demo_data_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    frames = [generate_well_timeseries(w, seed=100 + i) for i, w in enumerate(WELLS)]
    df = pd.concat(frames, ignore_index=True)
    csv_path = output_dir / "baghewala_demo.csv"
    df.to_csv(csv_path, index=False)
    return df


if __name__ == "__main__":
    df = generate_demo_dataset()
    print(f"Generated {len(df)} rows for {df['well_id'].nunique()} wells")
