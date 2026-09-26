from pydantic import BaseModel, Field
from app.schemas.prediction import OperatingParameters


class ControlPayloadRequest(BaseModel):
    well_id: str | None = None
    parameters: OperatingParameters | None = None


class ModbusRegisterMap(BaseModel):
    vfd_speed_pct_reg_40001: float = Field(..., description="VFD speed setpoint % (Reg 40001)")
    vfd_frequency_hz_reg_40002: float = Field(..., description="VFD output frequency Hz (Reg 40002)")
    target_spm_reg_40003: float = Field(..., description="Target Strokes Per Minute (Reg 40003)")
    safety_interlock_code_reg_40004: int = Field(..., description="Safety Gate Code: 0=SAFE, 1=WARNING, 2=BLOCKED (Reg 40004)")
    mode_code_reg_40005: int = Field(..., description="Control Mode: 0=ADVISORY_HITL, 1=AUTONOMOUS_CLOSED_LOOP (Reg 40005)")
    transaction_id_reg_40006: int = Field(..., description="Command transaction sequence ID (Reg 40006)")


class MqttControlPayload(BaseModel):
    topic: str = Field(..., description="MQTT publication topic (e.g. oil/baghewala/BGW-001/vfd/control)")
    qos: int = Field(1, description="Quality of Service level (QoS 1)")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp")
    device_id: str = Field(..., description="VFD / PLC device identifier")
    command: str = Field("SET_SPEED_AND_SPM", description="Industrial control command string")
    payload_json: dict = Field(..., description="Structured JSON payload sent over MQTT broker")


class OpcUaNodeMap(BaseModel):
    node_spm: str = Field(..., description="OPC-UA node ID for SPM setpoint")
    node_frequency: str = Field(..., description="OPC-UA node ID for VFD frequency")
    node_safety_gate: str = Field(..., description="OPC-UA node ID for safety interlock gate")


class ControlDispatchPayload(BaseModel):
    dispatch_id: str = Field(..., description="Unique control transaction ID")
    well_id: str
    well_name: str
    mode: str = Field("advisory", description="advisory (Human-In-The-Loop) or autonomous (Closed-Loop)")
    trigger_condition: str = Field(..., description="Trigger cause: ROD_FLOATING | HIGH_VISCOSITY | OVERTORQUE | NORMAL_OPTIMIZATION")
    recommended_spm: float = Field(..., description="Calculated optimal SPM setpoint")
    vfd_frequency_hz: float = Field(..., description="Calculated VFD motor frequency in Hz")
    vfd_setting_pct: float = Field(..., description="VFD speed setting %")
    safety_gate: str = Field(..., description="Interlock gate: SAFE | WARNING | BLOCKED")
    safety_reasons: list[str] = Field(..., description="Rule-based interlock check reasons")
    parameters: OperatingParameters = Field(..., description="Target operating parameters block")
    modbus_tcp: ModbusRegisterMap
    mqtt: MqttControlPayload
    opc_ua: OpcUaNodeMap
    predicted_outcome: dict = Field(..., description="Forecasted performance improvement post-dispatch")
    created_at: str
    status: str = Field("PENDING_APPROVAL", description="PENDING_APPROVAL | DISPATCHED | REJECTED | VERIFIED")


class ClosedLoopVerificationResponse(BaseModel):
    well_id: str
    dispatch_id: str
    status: str = Field(..., description="VERIFIED_SUCCESS | VERIFICATION_FAILED | PENDING")
    rod_float_cleared: bool = Field(..., description="True if rod floating warning cleared post-dispatch")
    fillage_improved: bool = Field(..., description="True if pump fillage % improved post-dispatch")
    power_stabilized: bool = Field(..., description="True if motor power draw stabilized within envelope")
    before_telemetry: dict = Field(..., description="Well state prior to control action")
    after_telemetry: dict = Field(..., description="Well state post control action")
    audit_log: dict = Field(..., description="Complete auditable event log entry")
