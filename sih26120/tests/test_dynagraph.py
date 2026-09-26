from app.physics.srp import simulate_srp, compute_card_area_kj
from app.physics.css import simulate_css
from app.twin.catalog import get_well_meta
from app.schemas.prediction import OperatingParameters


def test_dynagraph_points_count_and_closed_loop():
    meta = get_well_meta("BGW-01")
    assert meta is not None
    css = simulate_css(meta, steam_volume_t=500, inject_hours=72, soak_hours=48, cycle_day=10)
    srp = simulate_srp(meta, css, stroke_m=2.5, spm=6.0, vfd_pct=70.0, n_points=160)
    
    # Check high frequency sampling requirement (160 points)
    assert len(srp.surface_card) == 160
    assert len(srp.downhole_card) == 160
    
    # Check closed loop area calculations
    work_surf = compute_card_area_kj(srp.surface_card)
    work_dh = compute_card_area_kj(srp.downhole_card)
    assert work_surf > 0.0
    assert work_dh > 0.0


def test_rod_floating_trigger_and_downhole_buoyancy():
    meta = get_well_meta("BGW-01")
    css = simulate_css(meta, steam_volume_t=200, inject_hours=24, soak_hours=24, cycle_day=2)  # high viscosity
    srp_float = simulate_srp(meta, css, stroke_m=3.5, spm=9.5, vfd_pct=95.0, fault="rod_float")
    
    assert srp_float.rod_float is True
    assert srp_float.diagnostic_label == "ROD_FLOATING"
    assert srp_float.buoyant_rod_weight_kn > 0


def test_dynagraph_endpoint_response(client):
    res = client.get("/api/dynagraph/BGW-01")
    assert res.status_code == 200
    data = res.json()
    assert data["well_id"] == "BGW-01"
    assert len(data["surface_card"]) == 160
    assert len(data["downhole_card"]) == 160
    assert "kpis" in data
    assert data["kpis"]["work_surface_kj"] > 0
    assert "buoyant_rod_weight_kn" in data["kpis"]
    assert "structural_safety" in data


def test_dynagraph_simulation_endpoint(client):
    params = OperatingParameters(
        steam_volume=300,
        injection_pressure=8.0,
        injection_duration=48,
        soak_time=48,
        stroke_length=3.0,
        spm=8.5,
        vfd_setting=85,
    )
    res = client.post("/api/dynagraph/BGW-01/simulate", json={"parameters": params.model_dump(), "fault": "fluid_pound"})
    assert res.status_code == 200
    data = res.json()
    assert data["diagnostic_label"] == "FLUID_POUND"
    assert data["severity"] in ("WARNING", "CRITICAL")
