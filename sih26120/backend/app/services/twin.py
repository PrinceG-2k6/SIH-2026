"""Digital twin state builder for 3D visualization."""

from __future__ import annotations

from app.data.loader import get_latest_state
from app.ml.predictor import predict
from app.optimization.optimizer import optimize
from app.schemas.prediction import OperatingParameters
from app.schemas.twin import TwinState


def build_twin_state(
    well_id: str,
    mode: str = "current",
    scenario_params: OperatingParameters | None = None,
) -> TwinState:
    state = get_latest_state(well_id)
    if not state:
        raise ValueError(f"Well {well_id} not found")

    if mode == "optimized":
        opt = optimize(well_id)
        params = opt.recommended.parameters
        pred = predict(well_id, params)
    elif mode == "scenario" and scenario_params:
        params = scenario_params
        pred = predict(well_id, params)
    elif mode == "predicted":
        params = OperatingParameters(
            steam_volume=state.steam_volume,
            injection_pressure=state.injection_pressure,
            injection_duration=state.injection_duration,
            soak_time=state.soak_time,
            stroke_length=state.stroke_length,
            spm=state.spm,
            vfd_setting=state.vfd_setting,
        )
        pred = predict(well_id, params)
    else:
        params = OperatingParameters(
            steam_volume=state.steam_volume,
            injection_pressure=state.injection_pressure,
            injection_duration=state.injection_duration,
            soak_time=state.soak_time,
            stroke_length=state.stroke_length,
            spm=state.spm,
            vfd_setting=state.vfd_setting,
        )
        pred = predict(well_id)

    physics = None
    try:
        from app.twin.compose import compose_twin

        physics = compose_twin(well_id)
    except Exception:
        physics = None

    return TwinState(
        well_id=well_id,
        mode=mode,
        reservoir_temperature=pred.predicted_reservoir_temperature,
        oil_viscosity=pred.predicted_oil_viscosity,
        oil_rate_bopd=pred.predicted_oil_rate_bopd,
        sor=pred.predicted_sor,
        steam_volume=params.steam_volume,
        injection_pressure=params.injection_pressure,
        spm=params.spm,
        stroke_length=params.stroke_length,
        pump_efficiency=pred.predicted_pump_efficiency,
        rod_load=pred.predicted_rod_load,
        rod_floating_probability=pred.predicted_rod_floating_probability,
        failure_probability=pred.predicted_failure_probability,
        parameters=params,
        heated_radius_m=physics["heated_radius_m"] if physics else 12.0,
        cycle_day=physics["cycle_day"] if physics else 18,
        phase=physics["phase"] if physics else "production",
        depth_m=physics["depth_m"] if physics else 1100.0,
    )
