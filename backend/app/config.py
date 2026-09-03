"""Application configuration — demo limits are assumptions, not official OIL limits."""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT_DIR / ".env", extra="ignore")

    database_url: str = f"sqlite:///{ROOT_DIR / 'data' / 'origin.db'}"
    model_dir: Path = ROOT_DIR / "models"
    demo_data_dir: Path = ROOT_DIR / "data" / "demo"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Demo operational constraints (configurable assumptions)
    max_steam_volume_tons: float = 800.0
    min_steam_volume_tons: float = 200.0
    max_injection_pressure_bar: float = 12.0
    min_injection_pressure_bar: float = 5.0
    max_injection_duration_hours: float = 120.0
    min_injection_duration_hours: float = 24.0
    max_soak_time_hours: float = 120.0
    min_soak_time_hours: float = 24.0
    max_spm: float = 10.0
    min_spm: float = 3.0
    max_stroke_length_m: float = 3.5
    min_stroke_length_m: float = 1.5
    max_vfd_pct: float = 100.0
    min_vfd_pct: float = 40.0
    max_rod_load_kn: float = 95.0
    max_failure_probability: float = 0.55

    # Optimization weights (configurable)
    weight_production: float = 1.0
    weight_sor_penalty: float = 0.4
    weight_energy_penalty: float = 0.3
    weight_failure_penalty: float = 0.5
    weight_cost_penalty: float = 0.2

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
