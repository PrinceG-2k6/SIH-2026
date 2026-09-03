"""ORIGIN — Well-to-Surface AI Digital Twin API."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import settings
from app.data.loader import ensure_demo_data
from app.ml.trainer import train_models


@asynccontextmanager
async def lifespan(_app: FastAPI):
    ensure_demo_data()
    train_models()
    yield


app = FastAPI(
    title="ORIGIN — Well-to-Surface AI Digital Twin",
    description="AI-enabled CSS + SRP optimization prototype (synthetic demo data)",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def root():
    return {
        "name": "ORIGIN — Well-to-Surface AI Digital Twin",
        "problem": "SIH26120 — Oil India Limited",
        "disclaimer": "Prototype using synthetic demo data only.",
    }
