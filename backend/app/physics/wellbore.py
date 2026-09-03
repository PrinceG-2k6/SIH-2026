"""Depth-dependent wellbore T / μ / P profiles.

T(z) interpolates surface → reservoir with a geothermal + steam-heated overlay
in the pay interval. Viscosity follows Andrade from T(z). Pressure is
hydrostatic plus turbulent friction (Darcy-Weisbach).
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from app.physics.assumptions import wellbore as wb, thermal
from app.physics.css import CSSState, viscosity_andrade
from app.twin.catalog import WellMeta


@dataclass
class DepthPoint:
    depth_m: float
    temperature_c: float
    viscosity_cp: float
    pressure_bar: float


@dataclass
class WellboreProfile:
    depth_m: float
    tubing_id_m: float
    flow_rate_m3_d: float
    points: list[DepthPoint]
    friction_loss_bar: float
    hydrostatic_bar: float
    notes: list[str]


def simulate_wellbore(meta: WellMeta, css: CSSState, oil_rate_bopd: float, n: int = 24) -> WellboreProfile:
    z_td = meta.depth_m
    t_wh = thermal.t_surface_c
    t_res = css.reservoir_temperature_c
    geo = (t_res - t_wh) / max(z_td, 1.0)

    # Heated overlay near pay (bottom 15% of hole) scales with chamber radius
    heat_scale = min(1.0, css.heated_radius_m / 25.0)

    q_m3_d = oil_rate_bopd * 0.159  # bbl → m3
    area = math.pi * (wb.tubing_id_m / 2) ** 2
    v = (q_m3_d / 86400.0) / max(area, 1e-6)  # m/s
    rho = wb.fluid_sg * 1000.0
    hydro = rho * wb.g * z_td / 1e5  # bar
    f_loss = wb.friction_factor * (z_td / wb.tubing_id_m) * (rho * v * v / 2) / 1e5

    points: list[DepthPoint] = []
    for i in range(n + 1):
        z = z_td * i / n
        t = t_wh + geo * z
        if z > z_td * 0.85:
            t += (t_res - t) * 0.35 * heat_scale
        mu = viscosity_andrade(t, meta.fingerprint)
        # extra friction proxy from viscosity vs water
        visc_mult = min(4.0, mu / 200.0)
        p = 8.5 + hydro * (z / z_td) + f_loss * visc_mult * (z / z_td)
        points.append(DepthPoint(round(z, 1), round(t, 2), round(mu, 1), round(p, 2)))

    return WellboreProfile(
        depth_m=z_td,
        tubing_id_m=wb.tubing_id_m,
        flow_rate_m3_d=round(q_m3_d, 3),
        points=points,
        friction_loss_bar=round(f_loss, 3),
        hydrostatic_bar=round(hydro, 3),
        notes=[
            "T(z) = geothermal gradient plus pay-zone steam overlay.",
            "μ(z) from Andrade viscosity using T(z).",
            "P(z) = wellhead + hydrostatic + Darcy-Weisbach friction × viscosity multiplier.",
        ],
    )
