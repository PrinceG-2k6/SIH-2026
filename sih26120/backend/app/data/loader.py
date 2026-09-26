"""Data loading and well queries."""

from __future__ import annotations

from pathlib import Path

import pandas as pd
from sqlalchemy.orm import Session

from app.config import settings
from app.data.database import SessionLocal, WellRecord, db_has_data, get_engine, load_csv_to_db
from app.data.generator import WELLS, generate_demo_dataset
from app.schemas.well import WellHistoryPoint, WellState, WellSummary
from app.twin.catalog import DATASET_VERSION, get_well_meta, normalize_well_id


def ensure_demo_data() -> None:
    marker = settings.demo_data_dir / "dataset_version.txt"
    csv_path = settings.demo_data_dir / "baghewala_demo.csv"
    needs = True
    if db_has_data() and marker.exists() and marker.read_text().strip() == DATASET_VERSION:
        needs = False
    if needs:
        generate_demo_dataset(settings.demo_data_dir)
        load_csv_to_db(csv_path)


def get_all_wells() -> list[WellSummary]:
    ensure_demo_data()
    out = []
    for w in WELLS:
        meta = get_well_meta(w["well_id"])
        out.append(
            WellSummary(
                well_id=w["well_id"],
                name=w["name"],
                field="Baghewala",
                api_gravity=meta.fingerprint.api_gravity if meta else 18.0,
                status="active",
            )
        )
    return out


def _record_to_state(record: WellRecord) -> WellState:
    return WellState(
        well_id=record.well_id,
        timestamp=pd.to_datetime(record.timestamp).to_pydatetime(),
        css_cycle_id=record.css_cycle_id or 1,
        reservoir_temperature=record.reservoir_temperature or 0,
        reservoir_pressure=record.reservoir_pressure or 0,
        oil_viscosity=record.oil_viscosity or 0,
        oil_api=record.oil_api or 18,
        water_cut=record.water_cut or 0,
        steam_volume=record.steam_volume or 0,
        steam_rate=record.steam_rate or 0,
        injection_pressure=record.injection_pressure or 0,
        injection_duration=record.injection_duration or 0,
        soak_time=record.soak_time or 0,
        oil_rate_bopd=record.oil_rate_bopd or 0,
        stroke_length=record.stroke_length or 0,
        spm=record.spm or 0,
        vfd_setting=record.vfd_setting or 0,
        pump_efficiency=record.pump_efficiency or 0,
        rod_load=record.rod_load or 0,
        energy_consumption=record.energy_consumption or 0,
        sor=record.sor or 0,
        energy_per_barrel=record.energy_per_barrel or 0,
        rod_floating_probability=record.rod_floating_probability or 0,
        failure_probability=record.failure_probability or 0,
    )


def get_latest_state(well_id: str) -> WellState | None:
    ensure_demo_data()
    nid = normalize_well_id(well_id)
    with Session(get_engine()) as session:
        record = (
            session.query(WellRecord)
            .filter(WellRecord.well_id == nid)
            .order_by(WellRecord.timestamp.desc())
            .first()
        )
        if not record:
            return None
        state = _record_to_state(record)
        state.well_id = well_id
        return state


def get_well_history(well_id: str, limit: int = 90) -> list[WellHistoryPoint]:
    ensure_demo_data()
    well_id = normalize_well_id(well_id)
    with Session(get_engine()) as session:
        records = (
            session.query(WellRecord)
            .filter(WellRecord.well_id == well_id)
            .order_by(WellRecord.timestamp.desc())
            .limit(limit)
            .all()
        )
    records = list(reversed(records))
    return [
        WellHistoryPoint(
            timestamp=pd.to_datetime(r.timestamp).to_pydatetime(),
            oil_rate_bopd=r.oil_rate_bopd or 0,
            reservoir_temperature=r.reservoir_temperature or 0,
            oil_viscosity=r.oil_viscosity or 0,
            sor=r.sor or 0,
            energy_per_barrel=r.energy_per_barrel or 0,
            rod_load=r.rod_load or 0,
            failure_probability=r.failure_probability or 0,
        )
        for r in records
    ]


def get_training_dataframe() -> pd.DataFrame:
    ensure_demo_data()
    csv_path = settings.demo_data_dir / "baghewala_demo.csv"
    if csv_path.exists():
        return pd.read_csv(csv_path, parse_dates=["timestamp"])
    with Session(get_engine()) as session:
        records = session.query(WellRecord).all()
    return pd.DataFrame([r.__dict__ for r in records])


def import_csv(file_path: Path) -> int:
    return load_csv_to_db(file_path)
