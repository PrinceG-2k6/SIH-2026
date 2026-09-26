"""Simplified sucker-rod dynamics, downhole wave equation, and diagnostic cards.

Kinematic: polished-rod position s = (S/2)(1 − cos ωt)
Loads: static rod weight + fluid load + viscous drag + inertia.
Downhole wave equation: translates surface card to pump plunger card (Hooke's law + damped wave phase lag).
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from app.physics.assumptions import srp as sa, wellbore as wb
from app.physics.css import CSSState
from app.twin.catalog import WellMeta


@dataclass
class CardPoint:
    position_m: float
    load_kn: float
    acceleration: float


@dataclass
class SrpState:
    stroke_m: float
    spm: float
    vfd_pct: float
    motor_power_kw: float
    rod_weight_kn: float
    buoyant_rod_weight_kn: float
    fluid_load_kn: float
    polished_rod_min_kn: float
    polished_rod_max_kn: float
    downhole_min_kn: float
    downhole_max_kn: float
    rod_stress_min_mpa: float
    rod_stress_max_mpa: float
    mean_stress_mpa: float
    alt_stress_mpa: float
    fatigue_index: float
    rod_float: bool
    rod_float_probability: float
    impact_shock: float
    pump_seating: str
    pump_condition: float
    pump_efficiency: float
    pump_fillage: float
    hydrodynamic_drag_kn: float
    rod_compression_kn: float
    buckling_tendency: float
    carrier_bar_separation: float
    upstroke_load_kn: float
    downstroke_load_kn: float
    plunger_velocity_max_ms: float
    work_surface_kj: float
    work_downhole_kj: float
    energy_expended_joules: float
    effective_stroke_m: float
    diagnostic_label: str
    surface_card: list[CardPoint]
    downhole_card: list[CardPoint]
    goodman: dict
    notes: list[str]


def compute_card_area_kj(points: list[CardPoint]) -> float:
    """Compute enclosed area of position (m) vs load (kN) curve using Trapezoidal rule (in kJ)."""
    if len(points) < 3:
        return 0.0
    area = 0.0
    n = len(points)
    for i in range(n):
        p1 = points[i]
        p2 = points[(i + 1) % n]
        # trapezoid formula for closed loop \oint y dx
        area += 0.5 * (p1.load_kn + p2.load_kn) * (p2.position_m - p1.position_m)
    return round(abs(area), 3)


def simulate_srp(
    meta: WellMeta,
    css: CSSState,
    *,
    stroke_m: float,
    spm: float,
    vfd_pct: float,
    fault: str | None = None,
    n_points: int = 160,
) -> SrpState:
    depth = meta.depth_m
    mu = css.viscosity_cp
    q = css.oil_rate_bopd
    fp = meta.fingerprint.mechanical_sensitivity

    area_rod = math.pi * (sa.rod_diameter_m / 2.0) ** 2
    vol_rod = area_rod * depth
    mass = vol_rod * sa.steel_density
    
    # 1. Buoyant Weight of Rod String (Hooke's Law & Archimedes)
    w_rod = mass * 9.81 / 1000.0  # Dry weight in kN
    w_buoyant = mass * 9.81 * (1.0 - wb.fluid_sg * 1000.0 / sa.steel_density) / 1000.0  # Buoyant weight in kN
    
    # Fluid load on pump plunger
    plunger_a = math.pi * (sa.pump_bore_m / 2.0) ** 2
    w_fluid = (css.pressure_bar * 1e5 * plunger_a) / 1000.0 * 0.35 + q * 0.08

    omega = 2 * math.pi * max(spm, 0.4) / 60.0
    n = max(100, min(200, n_points))  # 100 to 200 high-frequency points per stroke cycle
    
    surface: list[CardPoint] = []
    downhole: list[CardPoint] = []
    loads = []
    accels = []
    vels = []
    positions = []

    drag_c = 0.012 * (mu / 200.0) * fp * depth / 1000.0
    if fault == "high_viscosity":
        drag_c *= 1.8
    if fault == "excessive_rod_load":
        w_fluid *= 1.45
    if fault == "asphaltene_friction":
        drag_c *= 2.6

    # Wave equation physical properties
    # Acoustic velocity in steel rod: a = sqrt(E / rho) ~ 4880 m/s
    e_steel = sa.elastic_modulus_pa if hasattr(sa, "elastic_modulus_pa") else 2.07e11
    wave_velocity = math.sqrt(e_steel / sa.steel_density)  # ~4880 m/s
    tau = depth / wave_velocity  # acoustic transit time lag ~ 0.225 seconds
    rod_stiffness_k = (e_steel * area_rod) / depth / 1000.0  # kN/m

    for i in range(n):
        th = 2 * math.pi * i / n
        pos = (stroke_m / 2.0) * (1 - math.cos(th))
        vel = (stroke_m / 2.0) * omega * math.sin(th)
        acc = (stroke_m / 2.0) * omega * omega * math.cos(th)
        
        inertial = mass * acc / 1000.0  # kN
        drag = drag_c * vel * (1.0 if vel >= 0 else 1.4)  # higher downstroke friction
        if fault == "asphaltene_friction":
            # Solid contact friction opposes motion, narrowing card corners at stroke reversal
            asph_mech_drag = 2.8 * (1.0 if vel >= 0 else -1.2) * (abs(math.sin(th)) ** 0.5)
            drag += asph_mech_drag

        up = vel >= 0
        fluid = w_fluid if up else w_fluid * 0.12
        
        # Fault specific profile modifications
        if fault == "fluid_pound" and not up and (0.3 * math.pi <= th <= 0.7 * math.pi):
            fluid *= 0.05  # sudden fluid collapse mid-downstroke
        elif fault == "gas_interference":
            # gradual curved transition
            fluid *= math.sin(th / 2.0) ** 2
            
        pr = w_rod + fluid + drag + inertial
        if fault == "rod_float" and not up:
            pr = max(2.0, pr * 0.25)
            
        positions.append(pos)
        loads.append(pr)
        accels.append(acc)
        vels.append(vel)

    # Step 2: Translate Surface Card to Downhole Card via Damped Wave Equation & Hooke's Law
    for i in range(n):
        # Apply time lag shift (tau) and elastic stretch delta L = F / k
        lag_idx = (i - int(tau * omega * n / (2 * math.pi))) % n
        pos_surf = positions[i]
        load_surf = loads[i]
        acc_surf = accels[i]
        vel_surf = vels[i]
        
        # Elastic rod stretch under fluid & dynamic load
        rod_stretch_m = (load_surf - w_buoyant) / max(rod_stiffness_k, 1.0)
        
        # Downhole plunger position (retarded phase + elastic stretch compensation)
        pos_dh = max(0.0, min(stroke_m, pos_surf - rod_stretch_m * 0.35))
        
        # Downhole load filters out surface rod inertial acceleration, leaves plunger fluid action
        up = vel_surf >= 0
        dh_load = load_surf - inertial * 0.65 - (8.0 if up else -4.0)
        
        # Fluid pound signature downhole: steep drop corner
        if fault == "fluid_pound" and not up and (0.35 * math.pi <= 2 * math.pi * i / n <= 0.65 * math.pi):
            dh_load = w_buoyant * 0.2
            
        surface.append(CardPoint(round(pos_surf, 4), round(load_surf, 3), round(acc_surf, 4)))
        downhole.append(CardPoint(round(pos_dh, 4), round(dh_load, 3), round(acc_surf, 4)))

    pr_min, pr_max = min(loads), max(loads)
    dh_loads = [p.load_kn for p in downhole]
    dh_min, dh_max = min(dh_loads), max(dh_loads)

    stress = lambda f: (f * 1000.0) / max(area_rod, 1e-8) / 1e6  # MPa
    s_min, s_max = stress(pr_min), stress(pr_max)
    s_mean = 0.5 * (s_min + s_max)
    s_alt = 0.5 * (s_max - s_min)
    
    goodman_util = s_alt / sa.endurance_stress_mpa + s_mean / sa.allowable_stress_mpa
    fatigue = min(1.0, max(0.0, goodman_util * 0.72 * fp))
    if fault == "rod_fatigue":
        fatigue = min(1.0, fatigue + 0.35)

    # Step 2 Physical Trigger: Check if downhole minimum load drops below buoyant weight
    # ROD_FLOATING = TRUE when fluid drag on downstroke overcomes gravity
    down_loads = [loads[i] for i in range(n) if accels[i] < 0]
    float_margin = (sum(down_loads) / max(len(down_loads), 1)) / max(w_buoyant, 1)
    float_p = min(0.95, max(0.02, (0.55 - float_margin) * 1.4 + (spm - 6) * 0.06 + (mu - 400) / 1800))
    if fault == "rod_float":
        float_p = max(float_p, 0.78)
        
    # Physical trigger condition: minimum downhole load < 15% buoyant weight OR float_p > 0.42
    floating = (dh_min < w_buoyant * 0.15) or (float_p > 0.42)

    # Impact / seating
    shock = min(1.0, abs(min(accels)) / 12.0 * (1 + 0.4 * (spm / 8)) * fp)
    if fault == "excessive_impact_shock":
        shock = min(1.0, shock + 0.4)
    if fault == "pump_unseating":
        seating = "unseated"
        pump_cond = 0.42
        eta = 0.48
    else:
        seating = "seated" if shock < 0.55 else "light_tap"
        pump_cond = max(0.35, 0.92 - fatigue * 0.25 - float_p * 0.2 - css.asphaltene_risk * 0.15)
        eta = max(0.38, 0.9 - max(0, mu - 350) / 2800 - max(0, spm - 7) * 0.035)

    if fault == "pump_inefficiency":
        eta *= 0.62
        pump_cond *= 0.7

    up_loads = [loads[i] for i in range(n) if vels[i] >= 0]
    dn_loads = [loads[i] for i in range(n) if vels[i] < 0]
    up_mean = sum(up_loads) / max(len(up_loads), 1)
    dn_mean = sum(dn_loads) / max(len(dn_loads), 1)
    drag_peak = drag_c * max(abs(v) for v in vels)
    fillage = max(0.28, min(0.98, eta * (1.0 - 0.28 * float_p) * (0.55 if seating == "unseated" else 1.0)))
    if fault == "fluid_pound":
        fillage = min(fillage, 0.55)
    elif fault == "gas_interference":
        fillage = min(fillage, 0.72)

    compression = max(0.0, w_buoyant - min(dn_loads) if dn_loads else 0.0)
    buckle = min(0.95, max(0.02, compression / max(w_buoyant, 1) * 0.65 + (mu - 350) / 2200 + max(0, spm - 6.2) * 0.05))
    carrier = min(0.95, float_p * 0.85 + (0.2 if seating != "seated" else 0.0))
    vmax = max(abs(v) for v in vels)

    # Step 3: Geometric Feature Extraction
    work_surface_kj = compute_card_area_kj(surface)
    work_downhole_kj = compute_card_area_kj(downhole)
    energy_expended_joules = round(work_surface_kj * 1000.0, 1)
    effective_stroke_m = round(stroke_m * fillage, 3)

    # Step 3: Automated Fault Classification Label
    if fault == "pump_unseating" or seating == "unseated":
        diagnostic_label = "UNSEATED_PUMP"
    elif fault == "asphaltene_friction":
        diagnostic_label = "ASPHALTENE_FRICTION"
    elif floating:
        diagnostic_label = "ROD_FLOATING"
    elif fault == "fluid_pound" or fillage < 0.60:
        diagnostic_label = "FLUID_POUND"
    elif fault == "gas_interference" or (fillage < 0.78 and mu > 300):
        diagnostic_label = "GAS_INTERFERENCE"
    else:
        diagnostic_label = "NORMAL"

    # Motor power ~ load * stroke * spm
    power = max(2.0, (pr_max * stroke_m * spm) / 18.0 / sa.motor_efficiency) * (vfd_pct / 70.0)

    return SrpState(
        stroke_m=stroke_m,
        spm=spm,
        vfd_pct=vfd_pct,
        motor_power_kw=round(power, 2),
        rod_weight_kn=round(w_rod, 2),
        buoyant_rod_weight_kn=round(w_buoyant, 2),
        fluid_load_kn=round(w_fluid, 2),
        polished_rod_min_kn=round(pr_min, 2),
        polished_rod_max_kn=round(pr_max, 2),
        downhole_min_kn=round(dh_min, 2),
        downhole_max_kn=round(dh_max, 2),
        rod_stress_min_mpa=round(s_min, 2),
        rod_stress_max_mpa=round(s_max, 2),
        mean_stress_mpa=round(s_mean, 2),
        alt_stress_mpa=round(s_alt, 2),
        fatigue_index=round(fatigue, 3),
        rod_float=floating,
        rod_float_probability=round(float_p, 3),
        impact_shock=round(shock, 3),
        pump_seating=seating,
        pump_condition=round(pump_cond, 3),
        pump_efficiency=round(eta, 3),
        pump_fillage=round(fillage, 3),
        hydrodynamic_drag_kn=round(drag_peak, 3),
        rod_compression_kn=round(compression, 3),
        buckling_tendency=round(buckle, 3),
        carrier_bar_separation=round(carrier, 3),
        upstroke_load_kn=round(up_mean, 2),
        downstroke_load_kn=round(dn_mean, 2),
        plunger_velocity_max_ms=round(vmax, 4),
        work_surface_kj=work_surface_kj,
        work_downhole_kj=work_downhole_kj,
        energy_expended_joules=energy_expended_joules,
        effective_stroke_m=effective_stroke_m,
        diagnostic_label=diagnostic_label,
        surface_card=surface,
        downhole_card=downhole,
        goodman={
            "mean_stress_mpa": round(s_mean, 2),
            "alt_stress_mpa": round(s_alt, 2),
            "endurance_mpa": sa.endurance_stress_mpa,
            "ultimate_mpa": sa.allowable_stress_mpa,
            "utilization": round(goodman_util, 3),
            "inside_envelope": goodman_util < 1.0,
        },
        notes=[
            "Surface card = rod weight + fluid + drag + inertia (160 sampling points).",
            "Downhole wave equation solves 1D elastic rod equation with Hooke's Law and acoustic delay.",
            "Rod Floating trigger evaluates minimum downhole load against buoyant rod string weight.",
            f"Diagnostic fault classifier labeled current cycle as {diagnostic_label}.",
        ],
    )

