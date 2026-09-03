"""FastAPI route handlers."""

from __future__ import annotations

import asyncio
import shutil
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect

from app.data.loader import ensure_demo_data, get_all_wells, get_latest_state, get_well_history, import_csv
from app.ml.explainability import explain_well_prediction, get_explainability
from app.ml.predictor import load_metrics, predict
from app.ml.trainer import train_models
from app.optimization.cache import invalidate_cache
from app.optimization.optimizer import compare_current_vs_recommended, optimize
from app.schemas.optimization import OptimizeRequest
from app.schemas.prediction import PredictRequest
from app.schemas.twin import TwinScenarioRequest
from app.schemas.simulation import SimulateRequest, TimelineRequest
from app.services.alerts import get_alerts
from app.services.live_stream import generate_live_tick
from app.services.twin import build_twin_state
from app.simulation.scenario import simulate, simulate_three_way, simulate_timeline

router = APIRouter(prefix="/api")


@router.get("/health")
def health():
    return {"status": "ok", "product": "ORIGIN — Well-to-Surface AI Digital Twin"}


@router.get("/wells")
def list_wells():
    ensure_demo_data()
    return get_all_wells()


@router.get("/wells/{well_id}")
def get_well(well_id: str):
    state = get_latest_state(well_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Well {well_id} not found")
    return state


@router.get("/wells/{well_id}/history")
def well_history(well_id: str, limit: int = 90):
    history = get_well_history(well_id, limit=limit)
    if not history:
        raise HTTPException(status_code=404, detail=f"No history for well {well_id}")
    return history


@router.post("/predict")
def run_predict(body: PredictRequest):
    try:
        return predict(body.well_id, body.parameters)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/optimize")
def run_optimize(body: OptimizeRequest):
    try:
        return optimize(body.well_id, body.weights)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/simulate")
def run_simulate(body: SimulateRequest):
    try:
        return simulate(body)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/simulate/compare")
def run_simulate_compare(body: PredictRequest):
    if not body.parameters:
        raise HTTPException(status_code=400, detail="parameters required for scenario comparison")
    try:
        return simulate_three_way(body.well_id, body.parameters)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/simulate/timeline")
def run_timeline(body: TimelineRequest):
    try:
        return simulate_timeline(body)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/alerts/{well_id}")
def well_alerts(well_id: str):
    try:
        return get_alerts(well_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/twin/{well_id}")
def twin_state(well_id: str, mode: str = "current"):
    try:
        return build_twin_state(well_id, mode=mode)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/twin/{well_id}")
def twin_state_post(well_id: str, body: TwinScenarioRequest):
    try:
        return build_twin_state(well_id, mode=body.mode, scenario_params=body.parameters)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/model-explainability/{well_id}")
def well_explainability(well_id: str):
    try:
        train_models()
        return explain_well_prediction(well_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/model-explainability")
def model_explainability():
    train_models()
    return get_explainability()


@router.get("/benefit-summary/{well_id}")
def benefit_summary(well_id: str):
    try:
        state = get_latest_state(well_id)
        if not state:
            raise HTTPException(status_code=404, detail=f"Well {well_id} not found")
        optimization = optimize(well_id)
        comparison = compare_current_vs_recommended(well_id, optimization)
        rec = optimization.recommended
        return {
            "well_id": well_id,
            "current_production_bopd": state.oil_rate_bopd,
            "recommended_production_bopd": rec.predicted_oil_rate_bopd,
            "production_improvement_pct": comparison.production_change_pct,
            "current_sor": state.sor,
            "recommended_sor": rec.predicted_sor,
            "sor_change_pct": comparison.sor_change_pct,
            "failure_risk_reduction_pct": -comparison.failure_risk_change_pct,
            "recommended_steam_tons": rec.parameters.steam_volume,
            "recommended_spm": rec.parameters.spm,
            "summary": (
                f"AI recommends {rec.parameters.steam_volume:.0f}t steam at {rec.parameters.spm:.1f} SPM. "
                f"Expected production change {comparison.production_change_pct:+.1f}%, "
                f"SOR change {comparison.sor_change_pct:+.1f}%."
            ),
            "demo_disclaimer": "Benefit summary based on synthetic models — illustrative only.",
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/live/{well_id}")
def live_tick(well_id: str, tick: int = 0):
    try:
        return generate_live_tick(well_id, tick)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.websocket("/ws/live/{well_id}")
async def live_websocket(websocket: WebSocket, well_id: str):
    await websocket.accept()
    tick = 0
    try:
        while True:
            tick_data = generate_live_tick(well_id, tick)
            await websocket.send_json(tick_data.model_dump(mode="json"))
            tick += 1
            await asyncio.sleep(3)
    except WebSocketDisconnect:
        return
    except ValueError:
        await websocket.close(code=1008)


@router.get("/dashboard/{well_id}")
def dashboard(well_id: str):
    state = get_latest_state(well_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Well {well_id} not found")

    ensure_demo_data()
    train_models()

    prediction = predict(well_id)
    optimization = optimize(well_id)
    comparison = compare_current_vs_recommended(well_id, optimization)
    history = get_well_history(well_id, limit=60)
    metrics = load_metrics()
    alerts = get_alerts(well_id)

    return {
        "well_id": well_id,
        "current_state": state,
        "history": history,
        "prediction": prediction,
        "optimization": optimization,
        "comparison": comparison,
        "model_metrics": metrics,
        "alerts": alerts,
        "demo_disclaimer": "All values use synthetic Baghewala demo data and assumptions.",
    }


@router.get("/model-metrics")
def model_metrics():
    train_models()
    return load_metrics()


@router.post("/data/import")
async def data_import(file: UploadFile = File(...)):
    upload_dir = Path("./data/uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / file.filename
    with dest.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    count = import_csv(dest)
    train_models(force=True)
    invalidate_cache()
    return {"imported_rows": count, "filename": file.filename}
