from __future__ import annotations

import math
from app.physics.assumptions import srp as sa, thermal, wellbore as wb, economics as eco
from app.physics.css import viscosity_andrade
from app.schemas.prediction import OperatingParameters
from app.schemas.thermal_coupling import (
    ThermalCouplingPoint,
    ThermalCouplingResponse,
)
from app.twin.catalog import WellMeta, get_well_meta, normalize_well_id
from app.data.loader import get_latest_state


def compute_max_allowable_spm(
    viscosity_cp: float, stroke_m: float, meta: WellMeta
) -> float:
    """Compute maximum allowable Strokes Per Minute (SPM) to prevent rod floating.
    
    Settling velocity v_settling = (rho_steel - rho_fluid) * g * d_rod^2 / (18 * mu)
    Max SPM = 60 * v_settling / (pi * stroke) * safety_factor
    """
    rho_steel = sa.steel_density
    rho_fluid = wb.fluid_sg * 1000.0
    d_rod = sa.rod_diameter_m
    mu_pas = max(50.0, viscosity_cp) / 1000.0  # Convert cP to Pa.s

    # Terminal gravity settling velocity of rod string in viscous oil (m/s)
    v_settling = ((rho_steel - rho_fluid) * 9.81 * (d_rod**2)) / (18.0 * mu_pas)

    # Maximum allowable SPM before downward velocity exceeds gravity settling
    max_spm = (60.0 * v_settling) / (math.pi * max(stroke_m, 1.0)) * 0.85
    return round(max(3.0, min(10.0, max_spm)), 1)


def simulate_thermal_coupling(
    well_id: str,
    parameters: OperatingParameters | None = None,
    cycle_days: int = 45,
) -> ThermalCouplingResponse:
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
    t_base = fp.base_temp_c  # ~46.0 °C
    t_peak = min(180.0, t_base + (params.steam_volume / 500.0) * 115.0 * fp.thermal_responsiveness)

    inject_days = max(1.0, params.injection_duration / 24.0)
    soak_days = max(0.5, params.soak_time / 24.0)
    cooling_tau = thermal.cooling_tau_days / max(0.4, fp.cooling_rate)  # ~14.5 days

    oil_price = eco.oil_price_usd_bbl  # $75/bbl
    steam_cost_per_ton = eco.steam_cost_usd_ton  # $2.50/ton
    elec_rate_kwh = eco.electricity_usd_kwh  # $0.12/kWh

    timeline: list[ThermalCouplingPoint] = []
    cum_oil = 0.0
    economic_cutoff_day = cycle_days
    cutoff_found = False

    for day in range(1, cycle_days + 1):
        if day <= inject_days:
            phase = "injection"
            t_res = t_base + (t_peak - t_base) * (day / inject_days)
            offtake = 0.10
        elif day <= inject_days + soak_days:
            phase = "soak"
            t_res = t_peak - (day - inject_days) * 2.5
            offtake = 0.25
        else:
            phase = "production"
            cool_t = day - inject_days - soak_days
            t_res = t_base + (t_peak - t_base) * math.exp(-cool_t / cooling_tau)
            decline = max(0.0, cool_t - 2.0) * 0.018
            offtake = max(0.25, 1.0 - decline)

        t_res = max(t_base, min(185.0, t_res))
        visc = viscosity_andrade(t_res, fp)
        
        # Mobility & Oil rate
        mobility = max(0.05, (t_res - 42.0) / 28.0) * (700.0 / visc) * fp.production_responsiveness
        steam_factor = min(1.45, 0.45 + params.steam_volume / 750.0)
        srp_factor = min(1.35, (params.spm * params.stroke_length) / 16.5) * (0.7 + 0.3 * params.vfd_setting / 100.0)
        
        oil_rate = max(2.0, (22.0 + 58.0 * mobility * steam_factor * srp_factor) * offtake)
        cum_oil += oil_rate

        # Dynamic SPM Safety Limit
        max_spm = compute_max_allowable_spm(visc, params.stroke_length, meta)
        is_rod_floating = params.spm > max_spm

        # Electrical power & energy cost per barrel
        drag_load_factor = (visc / 350.0) ** 0.18
        motor_kw = max(2.0, (params.stroke_length * params.spm * 8.5 * drag_load_factor) / 18.0) * (params.vfd_setting / 70.0)
        daily_kwh = motor_kw * 24.0
        daily_elec_cost = daily_kwh * elec_rate_kwh
        daily_steam_amortized = (params.steam_volume * steam_cost_per_ton) / cycle_days
        daily_maint_cost = 45.0 * (1.0 + (visc / 800.0) * 0.4)

        energy_per_bbl = (daily_steam_amortized + daily_elec_cost) / max(oil_rate, 1.0)
        cum_sor = params.steam_volume / max(cum_oil, 1.0)

        # Economic Net Margin
        daily_revenue = oil_rate * oil_price
        daily_total_cost = daily_steam_amortized + daily_elec_cost + daily_maint_cost
        daily_net_margin = daily_revenue - daily_total_cost

        is_cutoff = daily_net_margin <= 0 or energy_per_bbl >= oil_price
        if is_cutoff and not cutoff_found and phase == "production":
            economic_cutoff_day = day
            cutoff_found = True

        timeline.append(
            ThermalCouplingPoint(
                cycle_day=day,
                phase=phase,
                reservoir_temperature_c=round(t_res, 2),
                viscosity_cp=round(visc, 1),
                oil_rate_bopd=round(oil_rate, 2),
                max_allowable_spm=max_spm,
                actual_spm=params.spm,
                rod_floating_risk=is_rod_floating,
                energy_per_barrel_usd=round(energy_per_bbl, 2),
                cumulative_sor=round(cum_sor, 3),
                daily_net_margin_usd=round(daily_net_margin, 2),
                is_economic_cutoff=is_cutoff,
            )
        )

    current_day = state.css_cycle_id if state else 18
    resteam_recommended = current_day >= economic_cutoff_day or cutoff_found

    if resteam_recommended:
        msg = (
            f"TRIGGER NEXT CSS STEAM INJECTION CYCLE — Reservoir cooled to native state ({timeline[-1].reservoir_temperature_c:.1f}°C). "
            f"Viscosity surged to {timeline[-1].viscosity_cp:.0f} cP. Daily operating margin dropped below economic threshold on Day {economic_cutoff_day}."
        )
    else:
        msg = (
            f"CSS Production Phase Active (Day {current_day} of {economic_cutoff_day} cutoff). "
            f"Viscosity remains manageable ({timeline[min(current_day, len(timeline)-1)].viscosity_cp:.0f} cP). Allowable Max SPM limit is {timeline[min(current_day, len(timeline)-1)].max_allowable_spm:.1f}."
        )

    return ThermalCouplingResponse(
        well_id=well_id,
        well_name=meta.name if meta else well_id,
        current_cycle_day=current_day,
        economic_cutoff_day=economic_cutoff_day,
        resteam_trigger_recommended=resteam_recommended,
        trigger_message=msg,
        peak_temperature_c=round(t_peak, 2),
        cold_viscosity_cp=round(timeline[-1].viscosity_cp, 1),
        current_max_allowable_spm=timeline[min(current_day, len(timeline)-1)].max_allowable_spm,
        current_operating_spm=params.spm,
        timeline=timeline,
        operating_parameters=params,
        assumptions={
            "base_temp_c": t_base,
            "peak_temp_c": round(t_peak, 1),
            "oil_price_usd": oil_price,
            "steam_cost_usd_ton": steam_cost_per_ton,
            "cooling_tau_days": round(cooling_tau, 1),
        },
    )
