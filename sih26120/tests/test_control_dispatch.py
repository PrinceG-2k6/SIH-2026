from app.services.control_dispatch import (
    assess_well_state_triggers,
    create_control_dispatch_payload,
    evaluate_safety_interlocks,
    execute_control_dispatch,
    verify_closed_loop_response,
)
from app.schemas.prediction import OperatingParameters


def test_state_triggers_listener():
    trigger, telemetry = assess_well_state_triggers("BGW-01")
    assert trigger in ("ROD_FLOATING_RISK", "HIGH_VISCOSITY_SURGE", "MOTOR_OVERTORQUE", "NORMAL_OPTIMIZATION")
    assert "operating_spm" in telemetry
    assert "viscosity_cp" in telemetry


def test_safety_interlocks_rule_guardrails():
    # Test Peak Rod Load Interlock (>85.5 kN)
    telemetry_overload = {"polished_rod_max_kn": 92.0, "operating_spm": 6.0}
    gate, reasons, allow_dispatch = evaluate_safety_interlocks(telemetry_overload, proposed_spm=7.5)
    assert gate == "BLOCKED"
    assert allow_dispatch is False

    # Test SAFE interlock pass
    telemetry_safe = {"polished_rod_max_kn": 65.0, "downhole_min_kn": 12.0, "buoyant_rod_weight_kn": 18.0, "reservoir_temp_c": 55.0, "operating_spm": 5.0}
    gate_safe, _, allow_safe = evaluate_safety_interlocks(telemetry_safe, proposed_spm=5.5)
    assert gate_safe == "SAFE"
    assert allow_safe is True


def test_industrial_control_payload_formatting():
    payload = create_control_dispatch_payload("BGW-01", target_spm=5.0, mode="advisory")
    assert payload.well_id == "BGW-01"
    assert payload.modbus_tcp.vfd_speed_pct_reg_40001 > 0
    assert payload.modbus_tcp.vfd_frequency_hz_reg_40002 >= 20.0
    assert payload.mqtt.topic == "oil/baghewala/BGW-01/vfd/control"
    assert "Device.BGW-01.VFD.TargetSPM" in payload.opc_ua.node_spm


def test_closed_loop_dispatch_and_verification(client):
    # Test API trigger endpoint
    res_trig = client.get("/api/control/triggers/BGW-01")
    assert res_trig.status_code == 200
    assert "trigger_condition" in res_trig.json()

    # Test API payload generation endpoint
    res_pay = client.post("/api/control/payload/BGW-01?target_spm=5.5&mode=advisory")
    assert res_pay.status_code == 200
    payload_data = res_pay.json()
    assert payload_data["recommended_spm"] > 0
    assert "modbus_tcp" in payload_data

    # Test API dispatch execution endpoint
    res_disp = client.post("/api/control/dispatch/BGW-01", json=payload_data)
    assert res_disp.status_code == 200
    assert res_disp.json()["status"] == "DISPATCHED_SUCCESS"

    # Test API closed-loop verification endpoint
    res_ver = client.get(f"/api/control/verify/BGW-01?dispatch_id={payload_data['dispatch_id']}")
    assert res_ver.status_code == 200
    assert res_ver.json()["status"] in ("VERIFIED_SUCCESS", "VERIFICATION_FAILED")
