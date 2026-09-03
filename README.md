# ORIGIN — Well-to-Surface AI Digital Twin

**SIH26120 · Oil India Limited · Team ORIGIN**

AI-enabled decision-support prototype for integrated Cyclic Steam Stimulation (CSS) and Sucker Rod Pump (SRP) optimization at Baghewala Field.

> **Disclaimer:** This prototype uses **synthetic demo data** and configurable assumptions. Predictions and recommendations are **not** guaranteed field outcomes or official OIL operating limits.

## Architecture

```
Demo CSV → SQLite → Preprocessing → ML Prediction → Constrained Optimizer → FastAPI → React Dashboard
```

- **Prediction** (ML): What happens if we use these parameters?
- **Optimization** (search + scoring): What parameters should we choose?
- **Comparison**: Current vs AI-recommended operating points

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React, TypeScript, Vite, Tailwind, Recharts |
| Backend | Python, FastAPI, Pydantic, SQLAlchemy |
| ML | scikit-learn, XGBoost |
| Database | SQLite (PostgreSQL-ready design) |

## Quick Start

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --app-dir .
```

API: http://127.0.0.1:8000  
Docs: http://127.0.0.1:8000/docs

> **WinError 10013 / port busy:** Usually another Python/uvicorn is already using that port. Check and free it:
> ```powershell
> netstat -ano | findstr :8000
> Stop-Process -Id <PID> -Force
> ```
> Or use another free port, e.g. `--port 8088`, and set the same port in `frontend/vite.config.ts` proxy target.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

UI: http://localhost:5173

### Tests

```bash
cd backend
pytest ../tests -q
```

## Project Structure

```
backend/app/     FastAPI, ML, optimization, data pipeline
frontend/src/    React dashboard
data/demo/       Synthetic Baghewala CSV (auto-generated)
models/          Trained model artifacts
tests/           API and constraint tests
```

## Milestone 1

- [x] FastAPI backend + SQLite
- [x] Synthetic Baghewala demo dataset
- [x] Production + failure-risk ML models with comparison
- [x] CSS/SRP constrained optimizer
- [x] Dashboard: current state, prediction, recommendation, comparison

## Milestone 2

- [x] What-if simulation + CSS cycle timeline
- [x] Alert system (INFO / WARNING / CRITICAL)
- [x] 3D Digital Twin (React Three Fiber) synced to backend
- [x] Model performance + feature importance explainability
- [x] Multi-page UI: Overview, What-If, 3D Twin, Alerts, Models

## Milestone 3

- [x] Pareto-efficient alternatives (production / SOR / reliability trade-offs)
- [x] Live demo sensor stream (REST polling + WebSocket)
- [x] CSV import UI with model retraining

## Milestone 4 (Current)

- [x] SHAP / local prediction explainability per well
- [x] Benefit summary panel for judge demo finale
- [x] Optimization result caching (faster repeat loads)
- [x] One-command launch script (`scripts/start.ps1`)

## Quick Start (Windows)

```powershell
.\scripts\start.ps1
```

Opens backend (port 8000) and frontend (port 5173) in separate terminals.

## Next Phases

- NSGA-II with pymoo for larger search spaces
- Production deployment (PostgreSQL, auth)

## Demo Flow

1. Select a Baghewala well (BGW-001)
2. Click **AI Analyze**
3. **Overview** — KPIs, trends, AI recommendation vs current
4. **What-If** — change steam/SPM, click Simulate, view timeline
5. **3D Twin** — switch Current / Predicted / Optimized states
6. **Alerts** — review model-driven risk warnings
7. **Models** — inspect validation metrics and feature importances
8. **Data** — import CSV when real OIL data becomes available
9. **Overview live stream** — watch synthetic sensor ticks update every 3s
