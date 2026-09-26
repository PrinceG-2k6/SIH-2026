from __future__ import annotations

import time
from datetime import datetime, timezone
from app.data.loader import get_latest_state
from app.physics.assumptions import srp as sa, wellbore as wb, limits
from app.physics.css import simulate_css
from app.physics.srp import simulate_srp
from app.schemas.control import (
    ClosedLoopVerificationResponse,
    ControlDispatchPayload,
    ModbusRegisterMap,
    MqttControlPayload,
    OpcUaNodeMap,
)
from app.schemas.prediction import OperatingParameters
from app.twin.catalog import get_well_meta, normalize_well_id
from app.twin.session import persist, session_for


def assess_well_state_triggers(well_id: str, parameters: OperatingParameters | None = None) -> tuple[str, dict]:
    """Step 1: Continuous State Assessment & Trigger Condition Listener."""
    nid = normalize_well_id(well_id)
    meta = get_well_meta(nid) or get_well_meta("BGW-01")
    state = get_latest_state(nid) or get_latest_state(well_id)
    sess = session_for(nid)

    params = parameters or (sess.applied_params if sess.applied_params else (
        OperatingParameters(
            steam_volume=state.steam_volume,
            injection_pressure=state.injection_pressure,
            injection_duration=state.injection_duration,
            soak_time=state.soak_time,
            stroke_length=state.stroke_length,
            spm=state.spm,
            vfd_setting=state.vfd_setting,
        ) if state else OperatingParameters(
            steam_volume=520, injection_pressure=8.2, injection_duration=72,
            soak_time=48, stroke_length=2.5, spm=6.0, vfd_setting=70
        )
    ))

    css = simulate_css(
        meta,
        steam_volume_t=params.steam_volume,
        inject_hours=params.injection_duration,
        soak_hours=params.soak_time,
        cycle_day=sess.sim_day or 18,
    )

    srp = simulate_srp(
        meta,
        css,
        stroke_m=params.stroke_length,
        spm=params.spm,
        vfd_pct=params.vfd_setting,
        fault=getattr(sess, "injected_fault", None),
    )

    # Determine Trigger Condition
    if srp.rod_float or srp.downhole_min_kn < srp.buoyant_rod_weight_kn * 0.15:
        trigger = "ROD_FLOATING_RISK"
    elif css.viscosity_cp > 600.0:
        trigger = "HIGH_VISCOSITY_SURGE"
    elif srp.motor_power_kw > 22.0 or srp.polished_rod_max_kn > 85.5:
        trigger = "MOTOR_OVERTORQUE"
    else:
        trigger = "NORMAL_OPTIMIZATION"

    telemetry = {
        "viscosity_cp": css.viscosity_cp,
        "reservoir_temp_c": css.reservoir_temperature_c,
        "oil_rate_bopd": css.oil_rate_bopd,
        "polished_rod_max_kn": srp.polished_rod_max_kn,
        "polished_rod_min_kn": srp.polished_rod_min_kn,
        "downhole_min_kn": srp.downhole_min_kn,
        "buoyant_rod_weight_kn": srp.buoyant_rod_weight_kn,
        "rod_float_probability": srp.rod_float_probability,
        "rod_float_detected": srp.rod_float,
        "motor_power_kw": srp.motor_power_kw,
        "pump_fillage": srp.pump_fillage,
        "pump_efficiency": srp.pump_efficiency,
        "operating_spm": params.spm,
        "stroke_m": params.stroke_length,
        "vfd_setting_pct": params.vfd_setting,
    }

    return trigger, telemetry


def evaluate_safety_interlocks(
    telemetry: dict, proposed_spm: float, confidence_score: float = 85.0
) -> tuple[str, list[str], bool]:
    """Step 3: Hard Safety Interlocks & Rule-Based Guardrails."""
    gate = "SAFE"
    reasons: list[str] = []
    allow_dispatch = True

    current_spm = telemetry.get("operating_spm", 6.0)
    increasing_speed = proposed_spm > current_spm + 0.1

    # Rule 1: Peak Surface Rod Load Interlock (>90% rating = >85.5 kN)
    if telemetry.get("polished_rod_max_kn", 0) > 85.5:
        if increasing_speed:
            gate = "BLOCKED"
            allow_dispatch = False
            reasons.append("Peak Rod Load > 90% structural rating (85.5 kN). Speed increase BLOCKED.")
        else:
            gate = "WARNING"
            reasons.append("Peak Rod Load elevated (>85.5 kN). Downstroke speed reduction allowed.")

    # Rule 2: Minimum Load Safety Margin (<15% buoyant weight)
    buoyant = telemetry.get("buoyant_rod_weight_kn", 20.0)
    dh_min = telemetry.get("downhole_min_kn", 10.0)
    if dh_min < buoyant * 0.15 or telemetry.get("rod_float_detected"):
        if increasing_speed:
            gate = "BLOCKED"
            allow_dispatch = False
            reasons.append("Minimum Downhole Load below buoyant safety margin. Speed increase BLOCKED.")
        else:
            reasons.append("Rod Floating active. Speed reduction required to clear float risk.")

    # Rule 3: Thermal Threshold Interlock (Temp < 45°C)
    if telemetry.get("reservoir_temp_c", 50.0) < 45.0 and increasing_speed:
        gate = "BLOCKED"
        allow_dispatch = False
        reasons.append("Reservoir temperature cold (<45°C). High viscosity speed increase BLOCKED.")

    # Rule 4: Confidence Interlock (<40%)
    if confidence_score < 40.0:
        gate = "BLOCKED"
        allow_dispatch = False
        reasons.append(f"Model fusion confidence low ({confidence_score:.1f}%). Autonomous dispatch BLOCKED.")

    if not reasons:
        reasons.append("All physical safety interlocks passed cleanly (Peak Load, Min Load, Thermal & Confidence).")

    return gate, reasons, allow_dispatch


def create_control_dispatch_payload(
    well_id: str,
    target_spm: float,
    mode: str = "advisory",
    parameters: OperatingParameters | None = None,
) -> ControlDispatchPayload:
    """Step 2 & Step 4: Calculate Dynamic Setpoints & Format Industrial Control Payloads."""
    nid = normalize_well_id(well_id)
    meta = get_well_meta(nid) or get_well_meta("BGW-01")
    trigger, telemetry = assess_well_state_triggers(well_id, parameters)

    # Step 2: Dynamic Setpoint Calculator
    if trigger == "ROD_FLOATING_RISK":
        # Calculate immediate SPM reduction to allow rod to fall under gravity
        recommended_spm = max(3.2, round(telemetry["operating_spm"] - 1.8, 1))
    elif trigger == "HIGH_VISCOSITY_SURGE":
        recommended_spm = max(3.5, round(telemetry["operating_spm"] - 1.2, 1))
    elif trigger == "MOTOR_OVERTORQUE":
        recommended_spm = max(3.5, round(telemetry["operating_spm"] - 1.0, 1))
    else:
        recommended_spm = round(target_spm, 1)

    # Calculate VFD Motor Frequency in Hz (20.0 to 60.0 Hz)
    vfd_freq_hz = round(20.0 + ((recommended_spm - 3.0) / 7.0) * 40.0, 2)
    vfd_pct = round(max(40.0, min(100.0, 40.0 + ((recommended_spm - 3.0) / 7.0) * 60.0)), 1)

    # Step 3: Hard Safety Interlocks
    gate, safety_reasons, allow_dispatch = evaluate_safety_interlocks(telemetry, recommended_spm)

    target_params = (parameters or OperatingParameters(
        steam_volume=520, injection_pressure=8.2, injection_duration=72,
        soak_time=48, stroke_length=2.5, spm=recommended_spm, vfd_setting=vfd_pct
    )).model_copy(update={"spm": recommended_spm, "vfd_setting": vfd_pct})

    # Step 4: Modbus TCP Register Map
    tx_id = int(time.time()) % 100000
    gate_code = 0 if gate == "SAFE" else (1 if gate == "WARNING" else 2)
    mode_code = 1 if mode == "autonomous" else 0

    modbus = ModbusRegisterMap(
        vfd_speed_pct_reg_40001=vfd_pct,
        vfd_frequency_hz_reg_40002=vfd_freq_hz,
        target_spm_reg_40003=recommended_spm,
        safety_interlock_code_reg_40004=gate_code,
        mode_code_reg_40005=mode_code,
        transaction_id_reg_40006=tx_id,
    )

    # Step 4: MQTT Industrial JSON Payload
    now_iso = datetime.now(timezone.utc).isoformat()
    mqtt = MqttControlPayload(
        topic=f"oil/baghewala/{nid}/vfd/control",
        qos=1,
        timestamp=now_iso,
        device_id=f"VFD-PLC-{nid}",
        command="SET_SPEED_AND_SPM",
        payload_json={
            "well_id": nid,
            "target_spm": recommended_spm,
            "vfd_frequency_hz": vfd_freq_hz,
            "vfd_setting_pct": vfd_pct,
            "safety_gate": gate,
            "allow_dispatch": allow_dispatch,
            "transaction_id": tx_id,
        },
    )

    # Step 4: OPC-UA Node Map
    opc_ua = OpcUaNodeMap(
        node_spm=f"ns=2;s=Device.{nid}.VFD.TargetSPM",
        node_frequency=f"ns=2;s=Device.{nid}.VFD.FrequencyHz",
        node_safety_gate=f"ns=2;s=Device.{nid}.VFD.SafetyInterlock",
    )

    predicted_outcome = {
        "expected_oil_bopd": round(telemetry["oil_rate_bopd"] * (1.0 if trigger == "NORMAL_OPTIMIZATION" else 0.92), 2),
        "expected_rod_float_risk": 0.08 if trigger == "ROD_FLOATING_RISK" else 0.04,
        "expected_motor_power_kw": round(telemetry["motor_power_kw"] * 0.85, 2),
        "expected_fillage_pct": round(min(95.0, telemetry["pump_fillage"] * 100.0 + 12.0), 1),
    }

    dispatch_id = f"DSP-{nid}-{tx_id}"

    return ControlDispatchPayload(
        dispatch_id=dispatch_id,
        well_id=well_id,
        well_name=meta.name if meta else well_id,
        mode=mode,
        trigger_condition=trigger,
        recommended_spm=recommended_spm,
        vfd_frequency_hz=vfd_freq_hz,
        vfd_setting_pct=vfd_pct,
        safety_gate=gate,
        safety_reasons=safety_reasons,
        parameters=target_params,
        modbus_tcp=modbus,
        mqtt=mqtt,
        opc_ua=opc_ua,
        predicted_outcome=predicted_outcome,
        created_at=now_iso,
        status="PENDING_APPROVAL" if mode == "advisory" else "DISPATCHED",
    )


def execute_control_dispatch(well_id: str, payload: ControlDispatchPayload) -> dict:
    """Step 4: Dispatch payload over industrial gateway & update active state."""
    sess = session_for(well_id)
    if payload.safety_gate == "BLOCKED":
        raise ValueError(f"Dispatch BLOCKED by safety interlock: {payload.safety_reasons[0]}")

    sess.applied_params = payload.parameters
    sess.pending_dispatch = payload.model_dump()
    sess.event_log.append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "subsystem": "closed_loop_control",
        "condition": payload.trigger_condition,
        "action": f"SPM adjusted to {payload.recommended_spm:.1f} ({payload.vfd_frequency_hz:.1f} Hz)",
        "gate": payload.safety_gate,
        "dispatch_id": payload.dispatch_id,
        "mode": payload.mode,
    })
    persist()

    return {
        "status": "DISPATCHED_SUCCESS",
        "well_id": well_id,
        "dispatch_id": payload.dispatch_id,
        "applied_spm": payload.recommended_spm,
        "applied_frequency_hz": payload.vfd_frequency_hz,
        "modbus_registers": payload.modbus_tcp.model_dump(),
        "mqtt_topic": payload.mqtt.topic,
        "timestamp": payload.created_at,
    }


def verify_closed_loop_response(well_id: str, dispatch_id: str) -> ClosedLoopVerificationResponse:
    """Step 5: Closed-Loop Feedback Verification & Dynamic Learning."""
    trigger, telemetry_after = assess_well_state_triggers(well_id)
    sess = session_for(well_id)

    before = sess.pending_dispatch.get("predicted", {}) if sess.pending_dispatch else {}

    rod_float_cleared = not telemetry_after["rod_float_detected"]
    fillage_improved = telemetry_after["pump_fillage"] > 0.65
    power_stabilized = telemetry_after["motor_power_kw"] <= 24.0

    success = rod_float_cleared and fillage_improved and power_stabilized
    status = "VERIFIED_SUCCESS" if success else "VERIFICATION_FAILED"

    audit_entry = {
        "dispatch_id": dispatch_id,
        "well_id": well_id,
        "verification_time": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "rod_float_cleared": rod_float_cleared,
        "fillage_improved": fillage_improved,
        "power_stabilized": power_stabilized,
        "audit_note": f"Closed-loop control verification for {well_id}: {status}.",
    }

    sess.event_log.append(audit_entry)
    persist()

    return ClosedLoopVerificationResponse(
        well_id=well_id,
        dispatch_id=dispatch_id,
        status=status,
        rod_float_cleared=rod_float_cleared,
        fillage_improved=fillage_improved,
        power_stabilized=power_stabilized,
        before_telemetry=before,
        after_telemetry=telemetry_after,
        audit_log=audit_entry,
    )
