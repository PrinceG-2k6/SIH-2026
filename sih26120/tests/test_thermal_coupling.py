from app.physics.thermal_coupling import simulate_thermal_coupling, compute_max_allowable_spm
from app.twin.catalog import get_well_meta
from app.schemas.prediction import OperatingParameters


def test_thermal_coupling_physics():
    meta = get_well_meta("BGW-01")
    assert meta is not None

    res = simulate_thermal_coupling("BGW-01", cycle_days=60)
    assert res.well_id == "BGW-01"
    assert len(res.timeline) == 60
    assert res.peak_temperature_c > 120.0
    assert res.cold_viscosity_cp >= 70.0

    # Test dynamic SPM safety guardrail: cold fluid lowers max allowable SPM
    spm_hot = compute_max_allowable_spm(40.0, 2.5, meta)
    spm_cold = compute_max_allowable_spm(1200.0, 2.5, meta)
    assert spm_cold < spm_hot


def test_thermal_coupling_economic_cutoff_and_trigger():
    res = simulate_thermal_coupling("BGW-01", cycle_days=45)
    assert res.economic_cutoff_day >= 1
    assert isinstance(res.resteam_trigger_recommended, bool)
    assert len(res.trigger_message) > 10


def test_thermal_coupling_api_endpoint(client):
    res = client.get("/api/css/thermal-coupling/BGW-01?cycle_days=45")
    assert res.status_code == 200
    data = res.json()
    assert data["well_id"] == "BGW-01"
    assert "timeline" in data
    assert len(data["timeline"]) == 45
    assert "resteam_trigger_recommended" in data
    assert "economic_cutoff_day" in data


def test_thermal_coupling_simulation_post(client):
    params = OperatingParameters(
        steam_volume=700,
        injection_pressure=9.5,
        injection_duration=96,
        soak_time=48,
        stroke_length=3.0,
        spm=8.0,
        vfd_setting=80,
    )
    res = client.post("/api/css/thermal-coupling/BGW-01", json={"parameters": params.model_dump()})
    assert res.status_code == 200
    data = res.json()
    assert data["peak_temperature_c"] > 140.0
