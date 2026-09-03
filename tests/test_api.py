import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.optimization.optimizer import _within_constraints
from app.schemas.prediction import OperatingParameters


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_list_wells(client):
    res = client.get("/api/wells")
    assert res.status_code == 200
    wells = res.json()
    assert len(wells) >= 1
    assert wells[0]["well_id"].startswith("BGW-")


def test_dashboard(client):
    res = client.get("/api/dashboard/BGW-001")
    assert res.status_code == 200
    data = res.json()
    assert "current_state" in data
    assert "prediction" in data
    assert "optimization" in data
    assert "comparison" in data


def test_optimizer_respects_constraints():
    valid = OperatingParameters(
        steam_volume=500,
        injection_pressure=8,
        injection_duration=72,
        soak_time=48,
        stroke_length=2.5,
        spm=6,
        vfd_setting=70,
    )
    invalid = OperatingParameters(
        steam_volume=50,
        injection_pressure=8,
        injection_duration=72,
        soak_time=48,
        stroke_length=2.5,
        spm=6,
        vfd_setting=70,
    )
    assert _within_constraints(valid)
    assert not _within_constraints(invalid)


def test_optimize_returns_feasible_values(client):
    res = client.post("/api/optimize", json={"well_id": "BGW-001"})
    assert res.status_code == 200
    body = res.json()
    rec = body["recommended"]["parameters"]
    assert 200 <= rec["steam_volume"] <= 800
    assert 3 <= rec["spm"] <= 10
    assert "pareto_options" in body
    assert len(body["pareto_options"]) >= 1


def test_live_tick(client):
    res = client.get("/api/live/BGW-001?tick=1")
    assert res.status_code == 200
    data = res.json()
    assert data["well_id"] == "BGW-001"
    assert "simulation_label" in data
    assert "oil_rate_bopd" in data


def test_simulate(client):
    res = client.post(
        "/api/simulate",
        json={
            "well_id": "BGW-001",
            "parameters": {
                "steam_volume": 550,
                "injection_pressure": 8,
                "injection_duration": 72,
                "soak_time": 48,
                "stroke_length": 2.5,
                "spm": 6,
                "vfd_setting": 70,
            },
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "prediction" in data
    assert "comparison_vs_current" in data


def test_alerts(client):
    res = client.get("/api/alerts/BGW-001")
    assert res.status_code == 200
    assert "alerts" in res.json()


def test_twin_state(client):
    res = client.get("/api/twin/BGW-001?mode=current")
    assert res.status_code == 200
    data = res.json()
    assert data["well_id"] == "BGW-001"
    assert "reservoir_temperature" in data


def test_explainability(client):
    res = client.get("/api/model-explainability")
    assert res.status_code == 200
    data = res.json()
    assert "production_forecast" in data


def test_well_explainability(client):
    res = client.get("/api/model-explainability/BGW-001")
    assert res.status_code == 200
    data = res.json()
    assert data["well_id"] == "BGW-001"
    assert "production_forecast" in data
    assert "contributions" in data["production_forecast"]


def test_benefit_summary(client):
    res = client.get("/api/benefit-summary/BGW-001")
    assert res.status_code == 200
    data = res.json()
    assert "production_improvement_pct" in data
    assert "summary" in data


def test_twinlab_field_and_state(client):
    field = client.get("/api/twinlab/field")
    assert field.status_code == 200
    body = field.json()
    assert body["metrics"]["well_count"] >= 6
    assert any(w["well_id"] == "BGW-01" for w in body["wells"])
    st = client.get("/api/twinlab/state/BGW-01")
    assert st.status_code == 200
    twin = st.json()
    assert "heated_radius_m" in twin
    assert "wellbore" in twin
    assert "srp" in twin
    assert "governor" in twin
    assert "uncertainty" in twin
    assert "alerts" in twin
    assert "confidence" in twin
    assert "inferred" in twin
    assert "probabilistic_diagnosis" in twin
    assert "safety" in twin
    assert "economic_options" in twin
    assert twin["governor"].get("asymmetric") is not None
    w = client.post("/api/twinlab/weights/BGW-01", json={"preset": "reliability"})
    assert w.status_code == 200
    sim = client.post("/api/twinlab/dispatch/BGW-01/simulate", json={"spm": 5.0})
    assert sim.status_code == 200
    assert "pending" in sim.json()
    client.post("/api/twinlab/dispatch/BGW-01/reject")
