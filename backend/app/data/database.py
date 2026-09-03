"""SQLite database layer — PostgreSQL-compatible design."""

from __future__ import annotations

from pathlib import Path

import pandas as pd
from sqlalchemy import Column, Float, Integer, String, Text, create_engine, inspect
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


class WellRecord(Base):
    __tablename__ = "well_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    well_id = Column(String(32), index=True, nullable=False)
    well_name = Column(String(128))
    timestamp = Column(String(32), index=True)
    css_cycle_id = Column(Integer)
    phase = Column(String(32))
    reservoir_temperature = Column(Float)
    reservoir_pressure = Column(Float)
    oil_viscosity = Column(Float)
    oil_api = Column(Float)
    water_cut = Column(Float)
    steam_volume = Column(Float)
    steam_rate = Column(Float)
    injection_pressure = Column(Float)
    injection_duration = Column(Float)
    soak_time = Column(Float)
    oil_rate_bopd = Column(Float)
    stroke_length = Column(Float)
    spm = Column(Float)
    vfd_setting = Column(Float)
    pump_efficiency = Column(Float)
    rod_load = Column(Float)
    energy_consumption = Column(Float)
    sor = Column(Float)
    energy_per_barrel = Column(Float)
    rod_floating_probability = Column(Float)
    failure_probability = Column(Float)
    pump_unsetting_event = Column(Integer)
    rod_floating_event = Column(Integer)
    rod_failure_event = Column(Integer)
    operating_cost = Column(Float)
    cumulative_oil = Column(Float)
    raw_json = Column(Text)


def get_engine():
    db_path = settings.database_url.replace("sqlite:///", "")
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    return create_engine(settings.database_url, connect_args={"check_same_thread": False})


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=get_engine())


def init_db() -> None:
    engine = get_engine()
    Base.metadata.create_all(bind=engine)


def load_csv_to_db(csv_path: Path) -> int:
    init_db()
    df = pd.read_csv(csv_path)
    df = df.sort_values(["well_id", "timestamp"])

    engine = get_engine()
    with Session(engine) as session:
        session.query(WellRecord).delete()
        session.commit()

    records = []
    for _, row in df.iterrows():
        records.append(
            WellRecord(
                well_id=str(row["well_id"]),
                well_name=str(row.get("well_name", row["well_id"])),
                timestamp=str(row["timestamp"]),
                css_cycle_id=int(row["css_cycle_id"]),
                phase=str(row.get("phase", "production")),
                reservoir_temperature=float(row["reservoir_temperature"]),
                reservoir_pressure=float(row["reservoir_pressure"]),
                oil_viscosity=float(row["oil_viscosity"]),
                oil_api=float(row["oil_api"]),
                water_cut=float(row["water_cut"]),
                steam_volume=float(row["steam_volume"]),
                steam_rate=float(row["steam_rate"]),
                injection_pressure=float(row["injection_pressure"]),
                injection_duration=float(row["injection_duration"]),
                soak_time=float(row["soak_time"]),
                oil_rate_bopd=float(row["oil_rate_bopd"]),
                stroke_length=float(row["stroke_length"]),
                spm=float(row["spm"]),
                vfd_setting=float(row["vfd_setting"]),
                pump_efficiency=float(row["pump_efficiency"]),
                rod_load=float(row["rod_load"]),
                energy_consumption=float(row["energy_consumption"]),
                sor=float(row["sor"]),
                energy_per_barrel=float(row["energy_per_barrel"]),
                rod_floating_probability=float(row["rod_floating_probability"]),
                failure_probability=float(row["failure_probability"]),
                pump_unsetting_event=int(row.get("pump_unsetting_event", 0)),
                rod_floating_event=int(row.get("rod_floating_event", 0)),
                rod_failure_event=int(row.get("rod_failure_event", 0)),
                operating_cost=float(row.get("operating_cost", 0)),
                cumulative_oil=float(row.get("cumulative_oil", 0)),
                raw_json=None,
            )
        )

    with Session(engine) as session:
        session.bulk_save_objects(records)
        session.commit()

    return len(records)


def db_has_data() -> bool:
    engine = get_engine()
    inspector = inspect(engine)
    if "well_records" not in inspector.get_table_names():
        return False
    with Session(engine) as session:
        return session.query(WellRecord).count() > 0
