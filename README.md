# DataLens AI (Analyser)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/AarushTumbagi/datalens-ai)
[![Live Demo](https://img.shields.io/badge/Live_Demo-datalens--ai--beta.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://datalens-ai-beta.vercel.app)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/AarushTumbagi/datalens-ai)

> **Understand your data. Discover connections. Explore what changes.**

DataLens AI is a full-stack, interactive data exploration and counterfactual simulation platform. It transforms raw CSV and Excel files into mathematically grounded analytical models, force-directed variable relationship graphs, and real-time what-if predictive simulations.

### 🔗 Quick Links
- **🌐 Live Web Application**: [https://datalens-ai-beta.vercel.app](https://datalens-ai-beta.vercel.app)
- **⚡ Live Backend Health Check**: [https://datalens-ai-beta.vercel.app/api/health](https://datalens-ai-beta.vercel.app/api/health)
- **📦 GitHub Repository**: [https://github.com/AarushTumbagi/datalens-ai](https://github.com/AarushTumbagi/datalens-ai)

---

## 🌟 The Three Signature Features

### 1. Context-Aware AI Explanation Engine
- Understand any dataset, column, row cohort, or relationship edge with grounded statistical commentary.
- Zero hallucination policy: Every claim is supported by calculated metrics ($r$, $\rho$, $\eta$, Cramér's V, IQR bounds, p-values).
- **Ardra Pattern**: Interactive Context Drawer displaying pre-computed "Important Questions" pills (e.g., *"What is the average temperature over time?"*, *"Is there a correlation between humidity and current?"*), natural language Q&A, and inline evidence tables.
- Operates 100% deterministically out-of-the-box with optional OpenAI LLM enhancement via `OPENAI_API_KEY`.

### 2. Interactive Variable Relationship Graph
- Force-directed network where nodes represent dataset variables and edges represent calculated association metrics.
- Computes Pearson $r$ and Spearman rank $\rho$ for continuous variables, Cramér's $V$ for categorical pairs, and Correlation Ratio ($\eta$) for continuous-categorical pairs.
- **AutoViz Pattern**: Interactive node inspection with floating empirical distribution sparklines and micro-cards directly on the canvas without leaving context.
- **Graphext Pattern**: Relationship strength slider filter ($|r| \ge 0.1 \dots 0.8$), variable search, and edge click drawer displaying pairwise scatter plots with linear trendlines.

### 3. What-If Analysis Lab
- **LinkedIn ML Lab Pattern**: Predictive counterfactual simulation laboratory.
- Outcome variable selection (continuous target) and multi-feature toggle selection.
- Machine learning pipeline with leakage prevention: Preprocessing (One-Hot Encoding, StandardScaler, Robust Imputation) is fitted strictly on the 80% train split.
- Models: L2 Ridge Regression, ElasticNet, and Random Forest.
- Performance validation: $R^2$ Score, RMSE, MAE, and 5-Fold Cross-Validation mean & standard deviation.
- Real-time parameter sliders displaying baseline predictions, updated predictions, absolute shift ($\Delta y$), and relative shift ($\Delta\%$) badges.
- Single-variable sensitivity analysis curves (Partial Dependence) sweeping across feature domains while holding other variables constant.
- Out-of-distribution extrapolation warnings when inputs exceed training bounds.

---

## ☁️ Deploying to Vercel (Unified Single Repo)

This project is architected to deploy the **React + TypeScript + Vite frontend** and **FastAPI Python backend** together seamlessly on Vercel from a single repository.

### 1. Architecture Overview
- **Frontend**: Root Vite app producing static assets in `dist/`.
- **Backend**: `api/index.py` wraps the FastAPI application into a Vercel Serverless Function running on Python 3.12/3.11.
- **Routing**: `vercel.json` rewrites `/api/(.*)` requests directly to `/api/index.py`. The frontend uses relative paths (`/api/...`), eliminating cross-origin CORS latency and configuration issues.
- **File Upload Expansion**: Standard Vercel Serverless Functions enforce a 4.5MB request body ceiling. DataLens AI implements **transparent browser-side streaming gzip compression** (`CompressionStream('gzip')`) on uploaded files larger than 100KB, compressing text-heavy CSV/Excel files by 75–85% and extending practical upload capacity up to **~25MB–30MB**!
- **Stateless Storage & Model Cache**: Ephemeral runtime storage uses `/tmp/datalens_storage/` with automatic sample re-hydration and compressed model artifact persistence (`.pkl.gz`).

### 2. One-Click Deployment Steps
1. Push this repository to GitHub or GitLab.
2. In your [Vercel Dashboard](https://vercel.com/dashboard), click **Add New...** -> **Project**.
3. Import your DataLens repository:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variables (optional, in Vercel Project Settings):
   - `OPENAI_API_KEY`: *(Optional)* Enables OpenAI LLM generated answers alongside the deterministic statistical engine.
   - `APP_ENV`: `production`
5. Click **Deploy**. Vercel will build the Vite frontend and compile the Python serverless function automatically.

### 3. Verifying Deployment Health
Once deployed, verify the backend serverless health endpoint:
```bash
curl https://datalens-ai-beta.vercel.app/api/health
```
Expected response:
```json
{
  "status": "healthy",
  "app": "DataLens AI Backend",
  "version": "1.0.0",
  "environment": "production",
  "storage_dir": "/tmp/datalens_storage",
  "samples_available": true
}
```

---

## 🛠️ Technology Stack

- **Backend**: Python 3.11+, FastAPI, pandas, NumPy, SciPy, scikit-learn, openpyxl, Pydantic, pytest
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **Deployment**: Vercel Serverless (ASGI), Docker & Docker Compose

---

## 🚀 Local Development Setup

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Service
```bash
cd backend
python3 -m pip install -r requirements.txt
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8008 --reload
```
- Swagger API Docs: `http://localhost:8008/docs`
- Health check: `http://localhost:8008/health`

### 2. Frontend Service
```bash
# In the root directory:
npm install
npm run dev
```
- Web Application: `http://localhost:5173` (proxies `/api` to `http://localhost:8008`)

---

## 🧪 Running Automated Tests

### Backend Unit & Integration Tests
```bash
python3 -m pytest tests/test_backend.py -v
```
All 9 core analytical test suites verify:
- Health & diagnostic checks
- Sample dataset ingestion & fallback re-hydration
- Statistical profiling & IQR outlier detection
- Relationship graph calculation & threshold filters
- Leakage-free regression training & evaluation
- What-if scenario prediction & delta arithmetic
- Partial dependence sensitivity sweeps
- Context-aware explanations & natural-language question answering
- Ranked statistical insights

### Frontend Build Verification
```bash
npm run build
```

---

## 📂 Project Structure

```text
datalens-ai/
├── api/
│   ├── index.py                # Vercel Python Serverless ASGI Entrypoint
│   └── requirements.txt        # Serverless Python dependencies
├── backend/
│   ├── requirements.txt
│   ├── tests/
│   │   └── test_backend.py
│   └── app/
│       ├── main.py             # FastAPI App & Health Routes
│       ├── core/config.py      # /tmp Serverless Storage Configuration
│       ├── samples/            # Bundled Fallback Datasets
│       ├── schemas/            # Pydantic Schemas
│       └── services/           # Profiling, ML Models, Explainers
├── src/                        # Vite + React 19 Frontend Source
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── components/             # Explorer, Graph, What-If Lab, Drawers
│   └── services/api.ts         # Relative /api Client with Gzip Streamer
├── public/
├── index.html                  # Root HTML
├── package.json                # Vite + Tailwind Scripts
├── vite.config.ts              # Vite Config with Dev Proxy & React Plugin
├── tsconfig.json
├── vercel.json                 # Vercel Routing Configuration (/api/* -> index.py)
├── requirements.txt            # Root dependencies for Vercel Python Builder
└── sample_data/
```

---

## 📜 License
MIT License. Free for open source and commercial use.
