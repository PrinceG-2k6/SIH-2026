import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.physics.asphaltene import simulate_asphaltene_engine, compute_aop_bar
from app.physics.srp import simulate_srp
from app.physics.css import simulate_css
from app.twin.catalog import get_well_meta

client = TestClient(app)


def test_asphaltene_onset_envelope():
    # Test AOP calculation parabolic behavior
    aop_70c = compute_aop_bar(70.0)
    aop_30c = compute_aop_bar(30.0)
    aop_150c = compute_aop_bar(150.0)

    assert aop_70c > aop_30c
    assert aop_70c > aop_150c
    assert 20.0 <= aop_70c <= 85.0


def test_asphaltene_simulation_engine_steps():
    res = simulate_asphaltene_engine("BGW-01", days_since_treatment=35)

    assert res.well_id == "BGW-01"
    assert res.days_since_treatment == 35
    assert len(res.depth_profile) == 12  # 0 to 1100 m in 100m steps
    assert len(res.envelope_points) > 0

    # Step 1: Depth profile & precipitation risk
    assert 0.0 <= res.asphaltene_risk_index_pct <= 100.0
    assert 0.0 <= res.precipitation_zone_start_m <= res.precipitation_zone_end_m <= 1100.0

    # Step 2: Tubing constriction
    assert 0.0 <= res.max_constriction_pct <= 100.0
    assert res.min_effective_diameter_in <= res.nominal_diameter_in

    # Step 3: Mechanical friction & drag
    assert res.asphaltene_drag_kn > 0.0
    assert res.rod_floating_risk_pct >= 0.0

    # Step 4: Diagnostic label
    assert res.diagnostic_label in ["ASPHALTENE_FRICTION", "HIGH_VISCOSITY", "ROD_FLOATING", "NORMAL"]

    # Step 5: Treatment recommendation & economic tipping point
    assert res.treatment_recommendation in [
        "SCHEDULE AROMATIC SOLVENT FLUSH",
        "TRIGGER THERMAL STEAM WASH",
        "OPTIMAL OPERATING ZONE",
    ]
    assert res.economic_tipping_day >= 1
    assert res.treatment_cost_usd > 0.0


def test_asphaltene_srp_dynagraph_coupling():
    meta = get_well_meta("BGW-01")
    css = simulate_css(meta, steam_volume_t=520, inject_hours=72, soak_hours=48, cycle_day=20)
    srp = simulate_srp(meta, css, stroke_m=2.5, spm=6.0, vfd_pct=70.0, fault="asphaltene_friction")

    assert srp.diagnostic_label == "ASPHALTENE_FRICTION"
    assert len(srp.surface_card) == 160
    assert len(srp.downhole_card) == 160


def test_asphaltene_api_endpoints():
    get_res = client.get("/api/asphaltene/BGW-01?days_since_treatment=25")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["well_id"] == "BGW-01"
    assert data["days_since_treatment"] == 25
    assert "depth_profile" in data
    assert "envelope_points" in data
    assert "treatment_recommendation" in data

    post_res = client.post(
        "/api/asphaltene/BGW-01",
        json={
            "parameters": {
                "steam_volume": 600,
                "injection_pressure": 8.5,
                "injection_duration": 72,
                "soak_time": 48,
                "stroke_length": 2.8,
                "spm": 7.0,
                "vfd_setting": 75,
            },
            "cycle_days": 40,
        },
    )
    assert post_res.status_code == 200
    post_data = post_res.json()
    assert post_data["days_since_treatment"] == 40
    assert post_data["asphaltene_drag_kn"] > 0.0
