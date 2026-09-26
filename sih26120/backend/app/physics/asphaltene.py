from __future__ import annotations

import math
from app.physics.assumptions import srp as sa, wellbore as wb, economics as eco
from app.physics.css import simulate_css
from app.schemas.asphaltene import (
    AsphalteneDepthPoint,
    AsphalteneEnvelopePoint,
    AsphalteneResponse,
)
from app.schemas.prediction import OperatingParameters
from app.twin.catalog import WellMeta, get_well_meta, normalize_well_id
from app.data.loader import get_latest_state


def compute_aop_bar(temp_c: float, meta_responsiveness: float = 1.0) -> float:
    """Compute Asphaltene Onset Pressure (AOP) as a function of temperature (°C).
    
    Asphaltene solubility envelope has a characteristic parabolic / non-linear AOP shape:
    Peak onset pressure occurs in mid-temperature ranges (~60°C to 90°C).
    At very high temperatures (>140°C), thermal solubility keeps asphaltenes dissolved.
    At low temperatures (<35°C), oil heavy fractions keep it in micellar colloid equilibrium.
    """
    # Peak AOP ~ 72 bar around 70°C
    base_aop = 72.0 - 0.015 * ((temp_c - 70.0) ** 2)
    aop = max(20.0, min(85.0, base_aop * meta_responsiveness))
    return round(aop, 2)


def compute_bubble_point_bar(temp_c: float) -> float:
    """Compute bubble point pressure (Pb) curve vs temperature."""
    pb = 18.0 + 0.32 * temp_c
    return round(pb, 2)


def simulate_asphaltene_engine(
    well_id: str,
    parameters: OperatingParameters | None = None,
    days_since_treatment: int = 35,
) -> AsphalteneResponse:
    """Core thermodynamic, constriction, friction, and preventive maintenance engine for Asphaltene."""
    nid = normalize_well_id(well_id)
    meta = get_well_meta(nid) or get_well_meta("BGW-01")
    state = get_latest_state(nid) or get_latest_state(well_id)

    if parameters:
        params = parameters
    elif state:
        params = OperatingParameters(
            steam_volume=state.steam_volume,
            injection_pressure=state.injection_pressure,
            injection_duration=state.injection_duration,
            soak_time=state.soak_time,
            stroke_length=state.stroke_length,
            spm=state.spm,
            vfd_setting=state.vfd_setting,
        )
    else:
        params = OperatingParameters(
            steam_volume=520,
            injection_pressure=8.2,
            injection_duration=72,
            soak_time=48,
            stroke_length=2.5,
            spm=6.0,
            vfd_setting=70,
        )

    fp = meta.fingerprint
    depth_total = meta.depth_m  # e.g. 1100 m
    n_intervals = 11  # 0 to 1100 m in 100m steps

    # Reservoir & wellhead thermal state
    cycle_day = 22  # production phase cooling
    css = simulate_css(
        meta,
        steam_volume_t=params.steam_volume,
        inject_hours=params.injection_duration,
        soak_hours=params.soak_time,
        cycle_day=cycle_day,
    )

    t_res = css.reservoir_temperature_c  # e.g. 68 °C
    t_head = max(35.0, t_res - 32.0 * fp.cooling_rate)  # e.g. 42 °C at surface
    p_res = css.pressure_bar  # e.g. 85 bar at bottomhole
    p_head = 14.5  # surface tubing pressure in bar

    # Nominal tubing diameter: 2.875 in = 0.073025 m
    d_nominal_m = 0.073025
    d_nominal_in = 2.875
    area_nominal = math.pi * ((d_nominal_m / 2.0) ** 2)

    depth_profile: list[AsphalteneDepthPoint] = []
    max_risk_pct = 0.0
    critical_depth = 0.0
    precip_zone_start = depth_total
    precip_zone_end = 0.0
    max_constriction_pct = 0.0
    min_eff_dia_in = d_nominal_in

    for i in range(n_intervals + 1):
        z = (depth_total / n_intervals) * i  # depth in meters (0 to 1100)
        frac = z / depth_total

        # Pressure profile (hydrostatic + frictional component)
        p_z = p_head + (p_res - p_head) * (frac ** 0.88)
        # Temperature profile (cooling along wellbore)
        t_z = t_head + (t_res - t_head) * (frac ** 1.15)
        dt_dz = abs(t_res - t_head) / depth_total

        # Asphaltene Onset Pressure (AOP) at temperature T(z)
        aop_z = compute_aop_bar(t_z, fp.thermal_responsiveness)

        # Risk Calculation: Asphaltene precipitates if P(z) <= AOP(z) AND T(z) is within risk window [40°C, 95°C]
        if t_z >= 38.0 and t_z <= 98.0:
            # Distance to onset pressure boundary
            p_diff = aop_z - p_z
            if p_diff >= 0:
                risk_pct = min(98.0, 45.0 + p_diff * 2.2 + (85.0 - t_z) * 0.4)
            else:
                risk_pct = max(0.0, 45.0 + p_diff * 1.5)
        else:
            risk_pct = max(0.0, 15.0 - abs(t_z - 70.0) * 0.3)

        risk_pct = round(min(100.0, max(0.0, risk_pct * fp.mechanical_sensitivity)), 1)

        if risk_pct > max_risk_pct:
            max_risk_pct = risk_pct
            critical_depth = z

        if risk_pct > 30.0:
            if z < precip_zone_start:
                precip_zone_start = z
            if z > precip_zone_end:
                precip_zone_end = z

        # Deposition Growth Rate over cumulative days since treatment
        # thickness delta(z) in mm:
        growth_rate_mm_per_day = 0.008 * (risk_pct / 100.0) * (1.0 + dt_dz * 10.0) * fp.cooling_rate
        thickness_mm = round(growth_rate_mm_per_day * max(0, days_since_treatment), 2)
        thickness_m = (thickness_mm / 1000.0)

        # Effective inner diameter
        d_eff_m = max(0.045, d_nominal_m - 2.0 * thickness_m)
        d_eff_in = round(d_eff_m / 0.0254, 2)
        area_eff = math.pi * ((d_eff_m / 2.0) ** 2)

        constriction_pct = round((1.0 - (area_eff / area_nominal)) * 100.0, 1)

        if constriction_pct > max_constriction_pct:
            max_constriction_pct = constriction_pct
        if d_eff_in < min_eff_dia_in:
            min_eff_dia_in = d_eff_in

        # Fluid velocity in constricted tubing
        q_m3s = (css.oil_rate_bopd * 0.158987) / 86400.0
        v_flow = round(q_m3s / max(area_eff, 1e-6), 3)

        depth_profile.append(
            AsphalteneDepthPoint(
                depth_m=round(z, 1),
                pressure_bar=round(p_z, 1),
                temperature_c=round(t_z, 1),
                asphaltene_risk_pct=risk_pct,
                asphaltene_thickness_mm=thickness_mm,
                effective_diameter_in=d_eff_in,
                constriction_pct=constriction_pct,
                fluid_velocity_ms=v_flow,
            )
        )

    if precip_zone_start > precip_zone_end:
        precip_zone_start = 300.0
        precip_zone_end = 750.0

    # Step 3: Compute Subsurface Mechanical Friction & Rod Drag Forces
    # Sucker rod diameter = 0.875 in (0.0222 m)
    # Rod clearance = (d_eff - d_rod) / 2
    # Asphaltene deposit increases surface roughness & causes contact friction during stroke
    constriction_factor = max_constriction_pct / 100.0
    asphaltene_drag_kn = round(
        0.4 + (constriction_factor ** 1.8) * 4.8 * (params.spm / 6.0) * fp.mechanical_sensitivity, 2
    )

    # Motor power penalty and energy waste
    power_penalty_kw = round(asphaltene_drag_kn * params.stroke_length * params.spm / 15.0, 2)
    daily_energy_kwh = power_penalty_kw * 24.0
    daily_waste_usd = daily_energy_kwh * eco.electricity_usd_kwh + (constriction_factor * 12.0)
    cumulative_waste_usd = round(daily_waste_usd * days_since_treatment, 2)

    # Rod floating risk boosted by asphaltene friction brake on downstroke
    rod_float_risk_pct = round(min(98.0, 12.0 + asphaltene_drag_kn * 18.0 + (css.viscosity_cp - 200) / 30.0), 1)

    # Step 5: Solvent Flushing & CSS Steam Wash Preventive Maintenance Triggers
    treatment_cost_usd = 1200.0  # Cost of aromatic solvent flush
    steam_wash_cost_usd = 1850.0

    # Economic tipping day when accumulated waste >= treatment cost
    tipping_day = max(7, int(treatment_cost_usd / max(daily_waste_usd, 5.0)))

    if days_since_treatment >= tipping_day or max_constriction_pct > 25.0:
        if css.viscosity_cp > 600 or css.reservoir_temperature_c < 52.0:
            treatment_recommendation = "TRIGGER THERMAL STEAM WASH"
        else:
            treatment_recommendation = "SCHEDULE AROMATIC SOLVENT FLUSH"
        treatment_urgency = "CRITICAL" if max_constriction_pct > 32.0 else "WARNING"
    else:
        treatment_recommendation = "OPTIMAL OPERATING ZONE"
        treatment_urgency = "NORMAL"

    # Step 4: Dynagraph Fault Classifier Integration
    if asphaltene_drag_kn > 1.8 and max_constriction_pct > 20.0:
        diagnostic_label = "ASPHALTENE_FRICTION"
    elif css.viscosity_cp > 500:
        diagnostic_label = "HIGH_VISCOSITY"
    elif rod_float_risk_pct > 50.0:
        diagnostic_label = "ROD_FLOATING"
    else:
        diagnostic_label = "NORMAL"

    # Generate thermodynamic Phase Envelope Points for plotting AOE diagram
    envelope_points: list[AsphalteneEnvelopePoint] = []
    for temp in range(30, 165, 10):
        t_val = float(temp)
        aop_val = compute_aop_bar(t_val, fp.thermal_responsiveness)
        pb_val = compute_bubble_point_bar(t_val)
        envelope_points.append(
            AsphalteneEnvelopePoint(
                temperature_c=t_val,
                onset_pressure_bar=aop_val,
                bubble_point_bar=pb_val,
            )
        )

    explanation = [
        f"Asphaltene Onset Envelope mapped across 0–{depth_total}m depth profile (Peak risk {max_risk_pct}% at {critical_depth}m).",
        f"Cumulative deposition over {days_since_treatment} days reduced nominal 2.875\" tubing to {min_eff_dia_in}\" min clearance ({max_constriction_pct}% area loss).",
        f"Subsurface mechanical friction drag of {asphaltene_drag_kn} kN adds +{power_penalty_kw} kW motor load and elevates rod floating risk to {rod_float_risk_pct}%.",
        f"Economic tipping point reached on Day {tipping_day}: Cumulative energy waste (${cumulative_waste_usd:.2f}) exceeds treatment cost (${treatment_cost_usd:.2f}).",
    ]

    return AsphalteneResponse(
        well_id=well_id,
        days_since_treatment=days_since_treatment,
        asphaltene_drag_kn=asphaltene_drag_kn,
        max_constriction_pct=max_constriction_pct,
        min_effective_diameter_in=min_eff_dia_in,
        nominal_diameter_in=d_nominal_in,
        asphaltene_risk_index_pct=max_risk_pct,
        precipitation_zone_start_m=precip_zone_start,
        precipitation_zone_end_m=precip_zone_end,
        critical_depth_m=critical_depth,
        rod_floating_risk_pct=rod_float_risk_pct,
        motor_power_penalty_kw=power_penalty_kw,
        energy_cost_waste_usd=daily_waste_usd,
        treatment_recommendation=treatment_recommendation,
        treatment_urgency=treatment_urgency,
        economic_tipping_day=tipping_day,
        treatment_cost_usd=treatment_cost_usd,
        cumulative_waste_usd=cumulative_waste_usd,
        depth_profile=depth_profile,
        envelope_points=envelope_points,
        diagnostic_label=diagnostic_label,
        explanation=explanation,
    )
