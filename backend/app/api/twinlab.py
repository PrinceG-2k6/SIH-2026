"""Digital-twin physics APIs — connected to compose_twin()."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.engines.decision import (
    STRATEGY_PRESETS,
    acknowledge_event,
    approve_dispatch,
    attach_intelligence,
    reject_dispatch,
    run_named_scenario,
    simulate_dispatch,
)
from app.engines.intelligence import (
    FAULTS,
    apply_autonomous,
    apply_branch,
    apply_solution,
    compare_horizons,
    cycle_forward,
    diagnose,
    explain_recommendation,
    field_snapshot,
    future_branches,
    inject_fault,
    joint_optimize,
    predictions_with_uncertainty,
    record_observation,
    reconstruct,
    vfd_governor,
    whatif,
)
from app.twin.catalog import WELLS
from app.twin.compose import compose_twin
from app.twin.session import persist, reset_session, session_for

router = APIRouter(prefix="/api/twinlab", tags=["digital-twin-lab"])


class ParamsBody(BaseModel):
    parameters: dict


class FaultBody(BaseModel):
    fault: str | None = None


class TimeBody(BaseModel):
    cycle: int = 4
    day: int = 18


class ObserveBody(BaseModel):
    observed_oil_bopd: float


class WhatIfBody(BaseModel):
    steam_pct: float | None = None
    steam_volume: float | None = None
    soak_time: float | None = None
    injection_duration: float | None = None
    spm: float | None = None
    vfd_setting: float | None = None
    stroke_length: float | None = None
    cycle_day: int | None = None
    cycle_cutoff_day: float | None = None


class BranchBody(BaseModel):
    horizon_days: int = 90


class ControlBody(BaseModel):
    autonomous: bool
    spm: float | None = None
    vfd_setting: float | None = None


class StepBody(BaseModel):
    days: int = 1


@router.get("/field")
def field():
    return field_snapshot()


@router.get("/wells")
def catalog_wells():
    return [
        {
            "well_id": w.well_id,
            "name": w.name,
            "field": w.field,
            "location": w.location,
            "formation": w.formation,
            "depth_m": w.depth_m,
            "status": w.status,
            "api_gravity": w.fingerprint.api_gravity,
        }
        for w in WELLS
    ]


@router.get("/state/{well_id}")
def state(well_id: str):
    try:
        twin = compose_twin(well_id)
        twin["uncertainty"] = predictions_with_uncertainty(twin)
        twin["diagnosis"] = diagnose(twin)
        return attach_intelligence(twin)
    except ValueError as e:
        raise HTTPException(404, str(e)) from e


@router.post("/state/{well_id}/apply")
def apply_params(well_id: str, body: ParamsBody):
    try:
        return apply_solution(well_id, body.parameters)
    except Exception as e:
        raise HTTPException(400, str(e)) from e


@router.get("/faults")
def list_faults():
    return FAULTS


@router.post("/fault/{well_id}")
def set_fault(well_id: str, body: FaultBody):
    try:
        return inject_fault(well_id, body.fault)
    except ValueError as e:
        raise HTTPException(404, str(e)) from e


@router.post("/reconstruct/{well_id}")
def time_machine(well_id: str, body: TimeBody):
    try:
        return reconstruct(well_id, body.cycle, body.day)
    except ValueError as e:
        raise HTTPException(404, str(e)) from e


@router.post("/observe/{well_id}")
def observe(well_id: str, body: ObserveBody):
    try:
        return record_observation(well_id, body.observed_oil_bopd)
    except ValueError as e:
        raise HTTPException(404, str(e)) from e


@router.post("/whatif/{well_id}")
def run_whatif(well_id: str, body: WhatIfBody):
    try:
        delta = {k: v for k, v in body.model_dump().items() if v is not None}
        return whatif(well_id, delta)
    except ValueError as e:
        raise HTTPException(404, str(e)) from e


@router.post("/branches/{well_id}")
def branches(well_id: str, body: BranchBody):
    try:
        return future_branches(well_id, body.horizon_days)
    except ValueError as e:
        raise HTTPException(404, str(e)) from e


@router.post("/optimize/{well_id}")
def optimize_joint(well_id: str):
    try:
        return joint_optimize(well_id)
    except ValueError as e:
        raise HTTPException(404, str(e)) from e


@router.post("/control/{well_id}")
def control(well_id: str, body: ControlBody):
    try:
        sess = session_for(well_id)
        if body.autonomous:
            return apply_autonomous(well_id)
        sess.autonomous = False
        if body.spm is not None:
            from app.twin.compose import _base_params

            params, _, _ = _base_params(well_id)
            upd = {"spm": body.spm}
            if body.vfd_setting is not None:
                upd["vfd_setting"] = body.vfd_setting
            sess.applied_params = params.model_copy(update=upd)
        persist()
        return {"governor": vfd_governor(compose_twin(well_id)), "twin": compose_twin(well_id)}
    except ValueError as e:
        raise HTTPException(404, str(e)) from e


@router.post("/step/{well_id}")
def step(well_id: str, body: StepBody):
    try:
        return cycle_forward(well_id, body.days)
    except ValueError as e:
        raise HTTPException(404, str(e)) from e


@router.post("/reset/{well_id}")
def reset(well_id: str):
    reset_session(well_id)
    return compose_twin(well_id)


@router.get("/explain/{well_id}")
def explain(well_id: str):
    try:
        twin = compose_twin(well_id)
        gov = vfd_governor(twin)
        return explain_recommendation(well_id, twin["spm"], gov["recommended_spm"])
    except ValueError as e:
        raise HTTPException(404, str(e)) from e


class HorizonBody(BaseModel):
    days: int = 120


class ApplyBranchBody(BaseModel):
    name: str


@router.post("/horizon/{well_id}")
def horizon(well_id: str, body: HorizonBody):
    try:
        return compare_horizons(well_id, min(max(body.days, 10), 120))
    except ValueError as e:
        raise HTTPException(404, str(e)) from e


@router.post("/branch/{well_id}/apply")
def branch_apply(well_id: str, body: ApplyBranchBody):
    try:
        return apply_branch(well_id, body.name)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e


class CutoffBody(BaseModel):
    cycle_cutoff_day: float | None = None


@router.post("/cutoff/{well_id}")
def set_cutoff(well_id: str, body: CutoffBody):
    try:
        sess = session_for(well_id)
        sess.cycle_cutoff_day = body.cycle_cutoff_day
        persist()
        return compose_twin(well_id)
    except ValueError as e:
        raise HTTPException(404, str(e)) from e


class WeightsBody(BaseModel):
    preset: str | None = None
    weights: dict | None = None


class ScenarioBody(BaseModel):
    name: str


class DispatchBody(BaseModel):
    spm: float | None = None
    parameters: dict | None = None


class AckBody(BaseModel):
    code: str


@router.post("/weights/{well_id}")
def set_weights(well_id: str, body: WeightsBody):
    try:
        sess = session_for(well_id)
        if body.preset and body.preset in STRATEGY_PRESETS:
            sess.objective_weights = dict(STRATEGY_PRESETS[body.preset])
        elif body.weights:
            sess.objective_weights = {k: float(v) for k, v in body.weights.items()}
        persist()
        return {"objective_weights": sess.objective_weights, "preset": body.preset}
    except ValueError as e:
        raise HTTPException(404, str(e)) from e


@router.post("/scenario/{well_id}")
def scenario(well_id: str, body: ScenarioBody):
    try:
        return run_named_scenario(well_id, body.name)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e


@router.post("/dispatch/{well_id}/simulate")
def dispatch_sim(well_id: str, body: DispatchBody):
    try:
        return simulate_dispatch(well_id, body.spm, body.parameters)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e


@router.post("/dispatch/{well_id}/approve")
def dispatch_ok(well_id: str):
    try:
        return approve_dispatch(well_id)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e


@router.post("/dispatch/{well_id}/reject")
def dispatch_no(well_id: str):
    try:
        return reject_dispatch(well_id)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e


@router.post("/ack/{well_id}")
def ack(well_id: str, body: AckBody):
    try:
        return acknowledge_event(well_id, body.code)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
