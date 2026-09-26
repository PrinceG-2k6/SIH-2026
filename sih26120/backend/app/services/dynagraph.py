from __future__ import annotations

from app.data.loader import get_latest_state
from app.physics.css import simulate_css
from app.physics.srp import CardPoint, simulate_srp
from app.schemas.dynagraph import (
    DynagraphKpis,
    DynagraphPoint,
    DynagraphResponse,
    DynagraphStructuralSafety,
)
from app.schemas.prediction import OperatingParameters
from app.twin.catalog import get_well_meta, normalize_well_id
from app.twin.session import session_for


def get_dynagraph_diagnostics(
    well_id: str,
    parameters: OperatingParameters | None = None,
    fault: str | None = None,
) -> DynagraphResponse:
    nid = normalize_well_id(well_id)
    meta = get_well_meta(nid)
    if not meta:
        meta = get_well_meta("BGW-01")  # fallback to BGW-01 default meta
        
    state = get_latest_state(nid) or get_latest_state(well_id)
    sess = session_for(nid)

    # Use provided parameters, session parameters, DB state parameters, or defaults
    if parameters:
        applied_params = parameters
    elif sess.applied_params:
        applied_params = sess.applied_params
    elif state:
        applied_params = OperatingParameters(
            steam_volume=state.steam_volume,
            injection_pressure=state.injection_pressure,
            injection_duration=state.injection_duration,
            soak_time=state.soak_time,
            stroke_length=state.stroke_length,
            spm=state.spm,
            vfd_setting=state.vfd_setting,
        )
    else:
        applied_params = OperatingParameters(
            steam_volume=520,
            injection_pressure=8.2,
            injection_duration=72,
            soak_time=48,
            stroke_length=2.5,
            spm=6.0,
            vfd_setting=70,
        )

    cycle = sess.css_cycle if sess.css_cycle is not None else (state.css_cycle_id if state else 4)
    day = sess.sim_day if sess.sim_day is not None else 18

    # Simulate reservoir CSS thermal state
    css = simulate_css(
        meta,
        steam_volume_t=applied_params.steam_volume,
        inject_hours=applied_params.injection_duration,
        soak_hours=applied_params.soak_time,
        cycle_day=day,
    )

    # Simulate SRP high-frequency dynamometer card & wave equation (160 sampling points)
    active_fault = fault if fault else getattr(sess, "injected_fault", None)
    srp = simulate_srp(
        meta,
        css,
        stroke_m=applied_params.stroke_length,
        spm=applied_params.spm,
        vfd_pct=applied_params.vfd_setting,
        fault=active_fault,
        n_points=160,
    )

    surface_points = [
        DynagraphPoint(position_m=pt.position_m, load_kn=pt.load_kn, acceleration=pt.acceleration)
        for pt in srp.surface_card
    ]
    downhole_points = [
        DynagraphPoint(position_m=pt.position_m, load_kn=pt.load_kn, acceleration=pt.acceleration)
        for pt in srp.downhole_card
    ]

    kpis = DynagraphKpis(
        work_surface_kj=srp.work_surface_kj,
        work_downhole_kj=srp.work_downhole_kj,
        energy_expended_joules=srp.energy_expended_joules,
        peak_surface_load_kn=srp.polished_rod_max_kn,
        min_surface_load_kn=srp.polished_rod_min_kn,
        peak_downhole_load_kn=srp.downhole_max_kn,
        min_downhole_load_kn=srp.downhole_min_kn,
        buoyant_rod_weight_kn=srp.buoyant_rod_weight_kn,
        pump_efficiency_pct=round(srp.pump_efficiency * 100.0, 1),
        pump_fillage_pct=round(srp.pump_fillage * 100.0, 1),
        effective_stroke_m=srp.effective_stroke_m,
    )

    safety = DynagraphStructuralSafety(
        goodman_utilization=srp.goodman.get("utilization", 0.0),
        is_safe=srp.goodman.get("inside_envelope", True),
        rod_stress_max_mpa=srp.rod_stress_max_mpa,
        carrier_bar_separation_prob=srp.carrier_bar_separation,
    )

    alerts: list[str] = []
    if srp.rod_float:
        alerts.append("CRITICAL: ROD FLOATING DETECTED — Fluid drag on downstroke overcomes buoyant rod gravity")
    if srp.downhole_min_kn < srp.buoyant_rod_weight_kn * 0.15:
        alerts.append("CRITICAL: DOWNHOLE LOAD COLLAPSE — High viscous drag causes rod compression risk")
    if srp.pump_seating == "unseated":
        alerts.append("CRITICAL: PUMP UNSETTING DETECTED — Excessive shock causing seating dislodgement")
    elif srp.pump_fillage < 0.60:
        alerts.append("WARNING: FLUID POUND RISK — Low pump fillage creating downstroke fluid impact")
    elif srp.pump_fillage < 0.78:
        alerts.append("WARNING: GAS INTERFERENCE — Gas expansion inside pump barrel")
    if srp.polished_rod_max_kn > 95.0:
        alerts.append("CRITICAL: SURFACE ROD LOAD LIMIT EXCEEDED (>95 kN)")

    if any("CRITICAL" in a for a in alerts):
        severity = "CRITICAL"
    elif any("WARNING" in a for a in alerts):
        severity = "WARNING"
    else:
        severity = "OK"

    return DynagraphResponse(
        well_id=well_id,
        well_name=meta.name if meta else well_id,
        diagnostic_label=srp.diagnostic_label,
        severity=severity,
        rod_floating_detected=srp.rod_float,
        surface_card=surface_points,
        downhole_card=downhole_points,
        kpis=kpis,
        structural_safety=safety,
        alerts=alerts,
        operating_parameters=applied_params,
        notes=srp.notes,
    )
