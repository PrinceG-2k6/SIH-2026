"""Simulated live sensor stream for demo dashboard updates."""

from __future__ import annotations

import math
from datetime import datetime, timezone

from app.data.loader import get_latest_state
from app.schemas.live import LiveTick


def generate_live_tick(well_id: str, tick: int = 0) -> LiveTick:
    state = get_latest_state(well_id)
    if not state:
        raise ValueError(f"Well {well_id} not found")

    phase = tick * 0.35
    noise = math.sin(phase) * 0.5 + math.sin(phase * 2.3) * 0.3

    return LiveTick(
        well_id=well_id,
        tick=tick,
        timestamp=datetime.now(timezone.utc),
        oil_rate_bopd=round(state.oil_rate_bopd + noise * 2.5, 2),
        reservoir_temperature=round(state.reservoir_temperature + noise * 0.4, 2),
        oil_viscosity=round(max(80, state.oil_viscosity - noise * 8), 2),
        sor=round(max(1.5, state.sor + noise * 0.08), 3),
        spm=round(state.spm + noise * 0.05, 2),
        rod_load=round(state.rod_load + noise * 1.5, 2),
        pump_efficiency=round(min(0.95, max(0.35, state.pump_efficiency + noise * 0.008)), 3),
        failure_probability=round(min(0.95, max(0.01, state.failure_probability + noise * 0.01)), 3),
        simulation_label="Demo Live Stream — synthetic sensor simulation",
    )
