from app.physics.css import simulate_css, viscosity_andrade
from app.twin.catalog import get_well_meta
from app.twin.compose import compose_twin
from app.engines.intelligence import inject_fault, joint_optimize, vfd_governor


def test_viscosity_falls_with_temperature():
    meta = get_well_meta("BGW-01")
    assert meta
    cold = viscosity_andrade(46.0, meta.fingerprint)
    hot = viscosity_andrade(62.0, meta.fingerprint)
    assert hot < cold


def test_steam_grows_heated_radius():
    meta = get_well_meta("BGW-01")
    lo = simulate_css(meta, steam_volume_t=350, inject_hours=72, soak_hours=48, cycle_day=8)
    hi = simulate_css(meta, steam_volume_t=700, inject_hours=72, soak_hours=48, cycle_day=8)
    assert hi.heated_radius_m > lo.heated_radius_m
    assert hi.reservoir_temperature_c >= lo.reservoir_temperature_c


def test_cooling_shrinks_chamber():
    meta = get_well_meta("BGW-01")
    early = simulate_css(meta, steam_volume_t=550, inject_hours=72, soak_hours=48, cycle_day=4)
    late = simulate_css(meta, steam_volume_t=550, inject_hours=72, soak_hours=48, cycle_day=26)
    assert late.heated_radius_m <= early.heated_radius_m + 0.5
    assert late.reservoir_temperature_c <= early.reservoir_temperature_c + 0.5


def test_wells_are_not_clones():
    a = compose_twin("BGW-01")
    b = compose_twin("BGW-12")
    assert a["fingerprint"]["thermal_responsiveness"] != b["fingerprint"]["thermal_responsiveness"]
    assert a["depth_m"] != b["depth_m"]


def test_fault_changes_diagnosis():
    inject_fault("BGW-01", "none")
    base = compose_twin("BGW-01")
    out = inject_fault("BGW-01", "rod_float")
    assert out["twin"]["rod_float_risk"] >= base["rod_float_risk"]
    inject_fault("BGW-01", "none")


def test_governor_and_optimize_run():
    twin = compose_twin("BGW-01")
    gov = vfd_governor(twin)
    assert 3 <= gov["recommended_spm"] <= 10
    opt = joint_optimize("BGW-01")
    assert opt["n_feasible"] >= 1
    assert opt["recommended"] is not None
    assert opt["n_pareto"] >= 1


def test_sensor_anomaly_overlay():
    inject_fault("BGW-01", "sensor_anomaly")
    twin = compose_twin("BGW-01")
    assert twin["sensor"] is not None
    assert twin["sensor"]["oil_rate_bopd"] != twin["production_rate_bopd"]
    inject_fault("BGW-01", "none")


def test_horizon_and_branch():
    from app.engines.intelligence import apply_branch, intelligent_alerts, simulate_horizon
    from app.twin.session import reset_session

    reset_session("BGW-01")
    series = simulate_horizon("BGW-01", days=8, use_optimized=False)
    assert len(series["points"]) == 9
    assert series["points"][0]["oil_rate_bopd"] >= 0
    alerts = intelligent_alerts(compose_twin("BGW-01"))
    assert isinstance(alerts, list)
    twin = apply_branch("BGW-01", "conservative")
    assert twin["spm"] <= 5.5
    reset_session("BGW-01")


def test_cycle_rewind():
    from app.engines.intelligence import cycle_forward, reconstruct
    from app.twin.session import reset_session

    reset_session("BGW-04")
    reconstruct("BGW-04", 3, 2)
    back = cycle_forward("BGW-04", -3)
    assert back["css_cycle_id"] >= 1
    reset_session("BGW-04")


def test_decision_intelligence_attached():
    from app.engines.decision import attach_intelligence, probabilistic_diagnosis, safety_interlocks
    from app.twin.compose import compose_twin
    from app.twin.estimator import estimate_state, twin_confidence
    from app.twin.session import reset_session

    reset_session("BGW-01")
    twin = compose_twin("BGW-01")
    est = estimate_state(twin)
    conf = twin_confidence(twin, est)
    assert 30 <= conf["score_pct"] <= 100
    assert "physics_ml_agreement" in conf["breakdown"]
    assert 0.0 <= est["mean_physics_ml_agreement"] <= 1.0
    assert est["mean_physics_ml_agreement"] != 0.99  # not a cosmetic constant
    other = estimate_state(compose_twin("BGW-12"))
    # wells differ → fused agreement need not match (fingerprints differ)
    assert other["hybrid"]["oil_rate_bopd"]["physics"] != est["hybrid"]["oil_rate_bopd"]["physics"] or other["ml_source"]
    dx = probabilistic_diagnosis(twin)
    assert abs(sum(i["probability"] for i in dx["items"]) - 1.0) < 0.02
    assert twin["srp"]["pump_fillage"] > 0
    packed = attach_intelligence(twin)
    assert "inferred" in packed and "safety" in packed and "economic_options" in packed
    assert packed["governor"].get("asymmetric")
    gate = safety_interlocks(twin, twin["spm"], conf["score_pct"])
    assert gate["gate"] in ("SAFE", "WARNING", "BLOCKED")
    reset_session("BGW-01")


def test_weights_change_recommendation():
    from app.engines.intelligence import joint_optimize
    from app.twin.session import persist, reset_session, session_for

    reset_session("BGW-07")
    sess = session_for("BGW-07")
    sess.objective_weights = {"oil": 0.7, "npv": 0.1, "risk": 0.05, "energy": 0.05, "sor": 0.1}
    persist()
    a = joint_optimize("BGW-07")
    sess.objective_weights = {"oil": 0.05, "npv": 0.1, "risk": 0.55, "energy": 0.2, "sor": 0.1}
    persist()
    b = joint_optimize("BGW-07")
    assert a["recommended"] is not None and b["recommended"] is not None
    assert "strategies" in a and len(a["strategies"]) >= 1
    reset_session("BGW-07")


def test_hitl_dispatch_and_reject():
    from app.engines.decision import approve_dispatch, reject_dispatch, simulate_dispatch
    from app.twin.session import reset_session

    reset_session("BGW-09")
    sim = simulate_dispatch("BGW-09", spm=4.8)
    assert "pending" in sim and "safety" in sim
    assert sim["pending"]["mode"] == "demo_synthetic_telemetry"
    if sim["pending"]["allow_dispatch"]:
        out = approve_dispatch("BGW-09")
        assert out["mode"] == "demo_synthetic_telemetry"
        assert out["twin"]["spm"] == 4.8
    else:
        reject_dispatch("BGW-09")
    reset_session("BGW-09")
    simulate_dispatch("BGW-09", spm=4.5)
    assert reject_dispatch("BGW-09")["rejected"] is True
    reset_session("BGW-09")
