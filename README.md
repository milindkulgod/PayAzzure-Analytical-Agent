# PayAzzure Analytical Agent — Pilot

Lightweight, demo-able pilot of an AI-powered document analytics tool. No database, no cloud — just a Python backend, a Next.js frontend, and the local filesystem for storage. The architecture is structured so swapping in Postgres/pgvector + object storage later is a localized change behind a `Store` interface.

## What it does

- Hardcoded login (two pilot users)
- Upload PDF / DOCX / XLSX (drag & drop, multi-file)
- Documents are parsed and held in session
- Claude-style chat answers questions, comparisons, calculations grounded in the uploaded docs
- When you ask for a chart, the agent emits a Plotly spec that renders on the dashboard with a PNG download button
- All state persisted as JSON files under `backend/data/`

## Pilot users

| Email | Password |
|---|---|
| `testuser1@email.com` | `datauser12!` |
| `testuser2@email.com` | `datauser12!` |

## Stack

- **Frontend:** Next.js 14 (App Router) + Tailwind + react-plotly.js
- **Backend:** FastAPI + Anthropic SDK + pdfplumber / openpyxl / python-docx
- **Storage:** local JSON + filesystem (swappable behind `app/store.py:Store`)
- **LLM:** Claude — Haiku 4.5 by default for speed/cost, Sonnet 4.6 selectable from the chat model switcher. Pluggable behind `app/llm.py:LLMClient`.

## Run it

You'll need Python 3.11+ and Node 18+.

### 1. Backend

#### macOS / Linux

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env and set ANTHROPIC_API_KEY
uvicorn app.main:app --reload --port 8000
```

#### Windows (PowerShell)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# edit .env and set ANTHROPIC_API_KEY
python -m uvicorn app.main:app --reload --port 8000
```

If PowerShell blocks `Activate.ps1` ("running scripts is disabled"), unblock for the current session:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

**Python version note:** stick to Python 3.10–3.12. On Python 3.14 some scientific deps may not yet ship Windows wheels and pip will try to compile from source (which needs Visual Studio Build Tools). Recommended: `py -3.12 -m venv .venv` if you have multiple Pythons installed.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 and sign in with one of the pilot users.

## Project layout

```
backend/
  app/
    main.py        # FastAPI routes (login, upload, chat, session)
    auth via       # Bearer token in store
    store.py       # Store interface + JSON-backed pilot impl
    llm.py         # LLMClient interface + Anthropic impl
    parsers.py     # PDF / DOCX / XLSX -> text + table summaries
    chat.py        # builds prompt, calls LLM, extracts chart specs
    config.py      # env vars + data dirs
  requirements.txt
  .env.example

frontend/
  app/
    login/         # login page
    dashboard/     # main dashboard (upload + charts + chat)
  components/
    UploadZone.tsx
    FileList.tsx
    ChatPanel.tsx
    ChartCard.tsx  # Plotly renderer with PNG download
  lib/api.ts       # typed API client
```

## Models

The chat panel has a model switcher with two options:

| Label | Default | When to pick it |
|---|---|---|
| **Haiku 4.5** | yes | Descriptive Q&A, summaries, single-doc lookups. Fast and cheap. |
| **Sonnet 4.6** | no | Numeric calculations across many rows, multi-document comparisons, anything where accuracy matters more than latency. |

The selection is sent per request as `{ "model": "<id>" }` to `POST /api/chat` and persisted client-side in `localStorage` so the user's choice sticks across reloads. Backend validates the id against the allowed list (configured in `backend/app/config.py:available_models`).

To change which models are exposed, edit `ANTHROPIC_MODEL` (default) and `ANTHROPIC_FALLBACK_MODEL` in `backend/.env` — no code changes needed.

## How charts work

The system prompt instructs the model: "when the user asks for a chart, emit a fenced code block tagged ```chart-spec containing a Plotly JSON object". The backend extracts those blocks from the reply and ships them to the frontend as structured `charts: ChartSpec[]`. The frontend renders each via `react-plotly.js` and offers a PNG download. No tool-use plumbing required for the pilot.

## Path to production

Swap these implementations without touching the rest of the app:

- `Store` (JSON) → Postgres + pgvector for users, sessions, chat history, embeddings
- File storage (local dir) → S3 / MinIO
- `LLMClient` (Anthropic) → add a local LLM client for offline / on-prem use
- Auth (hardcoded users + token in dict) → real auth provider (Gmail/Outlook OAuth)
- Add: streaming responses, RAG over embeddings for many-document scale, DuckDB-backed tabular queries on XLSX, audit logs, per-user rate limits.
