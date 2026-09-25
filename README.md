# STRATA — Subsurface Thermal Intelligence & Wellhead Operational Record

**SIH26120 · Oil India Limited · Team STRATA**

AI-enabled decision-support prototype and physics-informed digital twin for integrated **Cyclic Steam Stimulation (CSS)** and **Sucker Rod Pump (SRP)** optimization in extra-heavy crude reservoirs at **Baghewala Field, Rajasthan**.

> **Disclaimer:** This prototype uses **synthetic demo data** and configurable physical assumptions. Predictions and recommendations are decision-support outputs and do **not** replace certified Oil India Limited (OIL) field operating limits.

---

## 🗞️ The Newsprint Design System

STRATA features a completely bespoke **Newsprint** design system inspired by the golden age of print journalism and broadsheet publications of record:

* **Stark Broadsheet Geometry:** Zero border radius (`0px`) strictly enforced across all cards, dialogs, meters, and buttons.
* **High-Contrast Editorial Typography:** Viewport-dominating headlines in **Playfair Display**, long-form engineering prose in **Lora**, telemetry and coordinate readouts in **JetBrains Mono**, and clean UI controls in **Inter**.
* **Authentic Broadsheet Architecture:** 
  * **Left-Column Newspaper Sidebar (`Sidebar.tsx`):** Complete section index (`§ 00` to `§ 07`), active borehole selector (`BGW-01`, `BGW-02`, etc.), active alert badges, and collapsible mobile drawer.
  * **Top Editorial Masthead (`NewsprintHeader.tsx`):** Folio line with daily publication date, desert basin weather conditions, and quick-action toolbar.
  * **Mechanical Telemetry Marquee (`NewsprintMarquee.tsx`):** Continuous real-time stock-ticker crawl of live oil offtake, reservoir thermal core, SOR, rod load, and Brent crude index.
  * **Hard Offset Shadows:** Mechanical hover lift (`box-shadow: 4px 4px 0px 0px #111111` with `translate(-2px, -2px)`).
  * **Tactile Paper Texture:** Layered off-white paper (`#F9F9F7`) with fine 4×4px dot-grid overlay and deep ink black (`#111111`) collapsed grid borders.

---

## 🏛️ System Architecture

```text
Field CSV / Telemetry → SQLite → Preprocessing → Physics Surrogate (XGBoost/ML) → Multi-Objective Optimizer → FastAPI → STRATA Newsprint Broadsheet
```

1. **Thermodynamic Heating (CSS):** Models subterranean steam enthalpy diffusion and viscosity reduction across soaking and production days.
2. **Mechanical Artificial Lift (SRP):** Simulates surface walking beam kinematics, polish rod stresses, and downhole pump efficiency.
3. **Closed-Loop Optimization:** Multi-objective Pareto optimization balancing crude offtake (BOPD), steam-oil ratio (SOR), electrical consumption, and rod-floating / pump-unseating hazards.

---

## 📑 Operating Sections

| Section | Module | Capabilities |
| :--- | :--- | :--- |
| **`§ 00`** | **Front Page Dispatch** | Broadsheet lead story with drop cap narrative, patent wire diagram (Fig 1.0), and an interactive **"Test the Levers"** front-page simulation sampler. |
| **`§ 01`** | **Field Overview** | 12-column collapsed broadsheet telemetry rail, live sensor ticker, instrument console with circular gauges, 90-day history trend charts, and AI recommendation bridge. |
| **`§ 02`** | **Field Laboratory** | Connected physics twin, dynagraph card plots (surface vs downhole), transient horizon replay, causal diagnostic chains, and safety gates. |
| **`§ 03`** | **What-If Simulator** | Parametric scenario ledger with custom range sliders, preset injection schedules, and 10-day post-steam soak production curve. |
| **`§ 04`** | **3D Digital Twin** | Archival exhibition frame featuring interactive 3D WebGL pumpjack kinematics and subsurface thermal plume paired with a 2D patent wellbore schematic. |
| **`§ 05`** | **Risk & Alerts** | Telegram-style incident log with severity stamps (`[CRITICAL - SEV III]`, `[WARNING - SEV II]`), root cause, evidence, and remedial instructions. |
| **`§ 06`** | **Model Registry** | Cross-validation benchmark tables comparing candidate regressors and classifiers with vertical SHAP global feature weight charts. |
| **`§ 07`** | **Data Ingestion** | Archival intake ledger for uploading operational CSV logs with automatic validation and surrogate retraining. |

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Recharts, Three.js, React Three Fiber, Lucide Icons |
| **Backend** | Python 3.12, FastAPI, Pydantic, SQLAlchemy, Uvicorn |
| **Machine Learning** | scikit-learn, XGBoost, SHAP Attribution Engine |
| **Physics Engines** | Boberg-Lantz thermal dissipation model, Gibbs dynagraph analysis, Nelder-Mead / Pareto optimizer |
| **Database** | SQLite (PostgreSQL-ready architecture) |

---

## 🚀 Quick Start

### 1. Automated Launch (Windows)
Runs both the FastAPI backend (port 8000) and Vite frontend (port 5173) in separate windows:
```powershell
.\scripts\start.ps1
```

---

### 2. Manual Setup

#### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --app-dir .
```
* **API Documentation:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

#### Frontend
```bash
cd frontend
npm install
npm run dev
```
* **Web UI:** [http://localhost:5173](http://localhost:5173)

---

## 🧪 Tests

Execute backend constraint tests and API endpoint verifications:
```bash
cd backend
pytest ../tests -q
```

Validate frontend TypeScript compilation and production bundle:
```bash
cd frontend
npm run build
```

---

## 📁 Repository Structure

```text
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI REST & WebSocket routes
│   │   ├── data/         # SQLite database & synthetic dataset generator
│   │   ├── engines/      # Decision intelligence & causal diagnostic engines
│   │   ├── ml/           # XGBoost surrogate trainers & SHAP explainability
│   │   ├── optimization/ # Constrained Nelder-Mead & Pareto frontier search
│   │   └── physics/      # Thermal CSS & SRP mechanical lift kinematics
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # Broadsheet components (Sidebar, Masthead, Marquee, Gauges)
│   │   ├── pages/        # Sections § 00 to § 07 (Landing, Overview, Lab, What-If, etc.)
│   │   ├── services/     # Typed API clients
│   │   ├── three/        # WebGL 3D Digital Twin scene (React Three Fiber)
│   │   └── types/        # TypeScript domain models & interfaces
│   ├── index.html
│   ├── tailwind.config.js
│   └── package.json
├── data/demo/            # Baghewala baseline CSV dataset
├── models/               # Serialized surrogate model weights (.joblib)
├── scripts/              # Launch and initialization scripts
└── tests/                # Automated pytest suite
```

---

## 👥 Acknowledgements

Developed for **Smart India Hackathon 2026 (SIH-26120)** in partnership with **Oil India Limited (OIL)**.
