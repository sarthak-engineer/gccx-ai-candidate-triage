# Candidate Triage Workspace

A full-stack candidate triage application built for the **GCCX Global — AI Full-Stack Engineer Intern, Round 1 Case Study**. It helps recruiters search candidate profiles, apply filters, manage shortlists and tags, and request evidence-backed AI fit summaries.

> **Important:** This project is a decision-support prototype. AI assessments are advisory, can be wrong or incomplete, and must not be used as automatic hiring decisions. Recruiters remain responsible for reviewing candidate evidence and making hiring decisions.

## Contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Repository structure](#repository-structure)
- [Requirements](#requirements)
- [Setup on Windows](#setup-on-windows)
- [Run the application](#run-the-application)
- [API overview](#api-overview)
- [AI summary behavior](#ai-summary-behavior)
- [Skill-overlap ranking algorithm](#skill-overlap-ranking-algorithm)
- [Tests and validation](#tests-and-validation)
- [Configuration](#configuration)
- [Design decisions and trade-offs](#design-decisions-and-trade-offs)
- [Security and privacy](#security-and-privacy)
- [Known limitations and next steps](#known-limitations-and-next-steps)
- [Case-study deliverables](#case-study-deliverables)

## Features

### Recruiter workflow

- Search and browse the supplied candidate dataset.
- Filter and paginate the candidate directory through the backend API.
- View candidate details, including available skills, experience, source, notes, and application information.
- Shortlist and unshortlist candidates.
- Add and remove recruiter tags.
- Persist shortlist and tag changes in SQLite so they survive application restarts.

### AI-assisted candidate insights

- Calls the **Groq API** to generate a fit summary for a recruiter-specified role; the application does not intentionally substitute a mock response for the live model call.
- Returns a concise summary, a structured fit assessment, and supporting evidence from the candidate's listed skills or notes.
- Distinguishes a potential match, partial match, skills/role mismatch, and insufficient evidence.
- Validates that cited evidence corresponds to candidate data before accepting and caching the generated result.
- Caches valid summaries by candidate, requested role, model, and prompt version to reduce repeat calls.
- Reports API or validation failures instead of presenting unsupported output as a successful assessment.

AI output remains advisory. “Insufficient evidence” means the available profile does not support a confident conclusion; it does not prove that a candidate lacks the skill.

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS, Lucide React |
| Backend API | Python, FastAPI, Pydantic |
| Persistence | SQLite, SQLAlchemy |
| LLM integration | Groq API |
| Backend testing | pytest, FastAPI TestClient, HTTPX |
| Algorithm exercise | Python inverted skill index |
| JavaScript exercise | Node.js and the built-in assertion library |


## Architecture

              Recruiter
                  |
                  v
        React + Vite Frontend
                  |
             REST API
                  |
                  v
          FastAPI Backend
           /           \
          v             v
    SQLite Database   Groq LLM API
          |             |
          v             v
 Candidates, Tags    AI Fit Summary
 Shortlists, Cache


## Repository structure

```text
.
├── backend/
│   ├── app/
│   │   ├── ai_service.py          # Groq client, prompt, JSON and evidence validation
│   │   ├── database.py            # SQLAlchemy engine, session generator and DB setup
│   │   ├── main.py                # FastAPI REST API and candidate operations
│   │   ├── models.py              # Candidate, skill, tag and AI-summary cache models
│   │   ├── ranking.py             # Inverted skill index for Task 2a
│   │   └── schemas.py             # Pydantic request and response schemas
│   ├── .env                       # Local credentials; do not commit
│   └── .env.example               # Safe environment-variable template
├── candidates.json                # Supplied mock dataset (48 records)
├── candidate_triage.db            # Local SQLite database; generated and ignored by Git
├── docs/
│   ├── AI_COLLABORATION_LOG.md    # Task 3: AI collaboration log
│   ├── ALGORITHM_AND_BUG_REVIEW.md # Task 2a and Task 2b write-up
│   └── SCALING_JUDGMENT.md        # Task 4: scaling judgment note
├── frontend/
│   ├── src/
│   │   ├── api.js                 # Centralized backend HTTP client
│   │   ├── App.jsx                # Candidate triage and AI insights UI
│   │   ├── index.css              # Global styles and Tailwind styles
│   │   └── main.jsx               # React application entry point
│   ├── .env.example               # Frontend API URL template
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── tests/
│   ├── test_api.py                # Backend and AI-summary API tests
│   ├── test_match_candidates.js   # Task 2b JavaScript validation tests
│   └── test_ranking.py            # Skill-index and ranking tests
├── .gitignore
└── README.md
```

Files such as `candidate_triage.db`, `.env`, Python virtual environments, `node_modules`, and production build output should remain local and be excluded by `.gitignore`. The exact contents of the repository may evolve; this tree documents the intended layout.

## Requirements

- Python 3.12 or a compatible recent Python 3 version.
- Node.js 20 or later and npm.
- A Groq API key for live AI-summary generation.
- Windows PowerShell commands below assume that the terminal is opened at the repository root.

Check installed tools:

```powershell
python --version
node --version
npm --version
```

## Setup on Windows

### 1. Create and activate the Python virtual environment

Run these commands from the repository root:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
```

If PowerShell blocks activation because of the execution policy, use a new Command Prompt and run:

```bat
.venv\Scripts\activate.bat
```

### 2. Install backend dependencies

If the project has a `backend/requirements.txt` file, prefer installing from it:

```powershell
python -m pip install -r backend\requirements.txt
```

If that file has not been added yet, install the dependencies used by the current application:

```powershell
python -m pip install fastapi "uvicorn[standard]" sqlalchemy pydantic-settings httpx pytest groq python-dotenv
```

For a reproducible submission, keep a dependency manifest in the repository and update it when dependencies change.

### 3. Configure the backend environment

Copy the example file:

```powershell
Copy-Item backend\.env.example backend\.env
notepad backend\.env
```

Set your own Groq API key locally. For example:

```dotenv
GROQ_API_KEY=replace_with_your_own_key
GROQ_MODEL=openai/gpt-oss-120b
```

Use the model identifier supported by your Groq account. Never commit the real `.env` file or paste the API key into source code, screenshots, logs, or this README.

The application uses SQLite for local persistence. Unless you explicitly override the database URL through the application's configuration, it uses the database path configured in `backend/app/database.py`.

### 4. Configure the frontend

From the repository root:

```powershell
Copy-Item frontend\.env.example frontend\.env
notepad frontend\.env
```

Set the API base URL:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Vite environment variables are read when the development server starts. Restart Vite after changing `.env`.

### 5. Install frontend dependencies

```powershell
Set-Location frontend
npm install
Set-Location ..
```

Do not commit `frontend/node_modules/` or `frontend/dist/`.

## Run the application

Use **two separate terminals** opened at the repository root.

### Terminal 1 — Backend

Activate the virtual environment and start FastAPI:

```powershell
.\.venv\Scripts\Activate.ps1
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

The API should be available at `http://127.0.0.1:8000`. Interactive API documentation is available at `http://127.0.0.1:8000/docs`.

On a fresh database, the application initializes the database and loads the supplied candidate records. Keep the generated database file local; do not use real candidate data in the demo database.

### Terminal 2 — Frontend

```powershell
Set-Location frontend
npm run dev
```

Open the local URL printed by Vite (typically `http://localhost:5173`).

Keep both terminals running while using the application. If the frontend cannot reach the API, check that the backend is running and that `VITE_API_BASE_URL` points to the correct address.

## API overview

The API provides health and metadata information, candidate search/listing, candidate details, shortlist updates, recruiter tags, and AI summaries. Use the interactive OpenAPI page at `/docs` to verify the current request parameters and response schemas.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/api/metadata` | Dataset and filter metadata |
| `GET` | `/api/candidates` | Search, filter, and paginate candidates |
| `GET` | `/api/candidates/{candidate_id}` | Retrieve one candidate |
| `PATCH` | `/api/candidates/{candidate_id}/shortlist` | Update shortlist status |
| `POST` | `/api/candidates/{candidate_id}/tags` | Add a recruiter tag |
| `DELETE` | `/api/candidates/{candidate_id}/tags/{tag}` | Remove a recruiter tag |
| `POST` | `/api/candidates/{candidate_id}/ai-summary` | Request an AI-generated fit summary |

For the AI-summary endpoint, provide a JSON request body such as:

```json
{
  "target_role": "Machine Learning Engineer"
}
```

The returned data includes the generated summary, a structured fit assessment, evidence items, the model identifier, and whether a cached result was used. The live `/docs` schema is authoritative if endpoint details change.

## AI summary behavior

The AI service is designed around a few guardrails:

1. **Candidate data is untrusted input.** The model is instructed to treat profile content as data, not as instructions.
2. **Evidence must be grounded.** Returned skill evidence is checked against listed skills, and note evidence is checked against the candidate's notes.
3. **Structured output is validated.** Responses must satisfy the expected schema before being stored or returned as valid summaries.
4. **Cache keys include the role and model context.** This avoids reusing a summary for a different requested role or prompt version.
5. **Failure is explicit.** A model/API failure or invalid evidence should surface as an error; it should not be silently replaced by a fake successful response.

Evidence checks reduce unsupported claims but do not guarantee that the model's interpretation is factually perfect. Recruiters should inspect the evidence and the original candidate profile.

## Skill-overlap ranking algorithm

`backend/app/ranking.py` implements the case-study ranking exercise as a reusable Python module.

- `build_skill_index(...)` builds a mapping from each normalized skill to the set of candidate IDs associated with it.
- `rank_candidates_by_skill_overlap(...)` uses that index to count matches for the required skills provided by the client and sorts matching candidates by descending score, using a deterministic candidate-ID tie-breaker.
- The score is `matched required skills / number of unique required skills`. It is a transparent overlap metric, not a prediction of employee performance.
- The required skill list is an input; the algorithm does not invent a mapping from job titles to required skills.

Let **S** be the total number of candidate-skill assignments, **R** the number of unique required skills, **P** the total number of posting-list entries visited for those required skills, and **K** the number of matching candidates.

- Index construction takes **O(S)** expected time and **O(S)** space.
- A query takes **O(R + P + K log K)** time, including sorting matches.
- Per-query match counts and ranked output use **O(K)** additional space.

The index should be rebuilt or updated when a candidate's skills change. This algorithm is currently a separate case-study module; do not assume that the candidate-list API automatically uses it unless that integration is explicitly implemented.

## Tests and validation

Run these commands from the repository root.

### Python API and ranking tests

```powershell
.\.venv\Scripts\Activate.ps1
python -m pytest -q
```

The backend tests exercise health and metadata responses, candidate listing and retrieval, shortlist/tag operations, invalid requests, AI evidence validation, and cache reuse. Ranking tests cover the standalone skill index and ranking behavior.

Some AI integration tests replace the Groq client with a test double so that validation and caching can be tested deterministically without spending API credits. This is separate from the live Groq API call that was verified during development.

### JavaScript bug-review tests

```powershell
node tests\test_match_candidates.js
```

### Frontend production build

```powershell
Set-Location frontend
npm run build
Set-Location ..
```

A successful build confirms that the frontend compiles. It does not replace manual end-to-end checks of the browser, API, database, or live LLM integration.

## Configuration

| Variable | Purpose |
|---|---|
| `GROQ_API_KEY` | Secret key used for live Groq API requests |
| `GROQ_MODEL` | Groq model identifier to request |
| `DATABASE_URL` | Optional SQLAlchemy database URL, if supported by the current `database.py` configuration |
| `VITE_API_BASE_URL` | Backend URL used by the frontend |

Keep secrets in local environment files, not in tracked source files. Because Vite exposes `VITE_*` variables to browser code, never place API keys or other secrets in frontend environment variables.

## Design decisions and trade-offs

- **FastAPI REST API:** offers a simple, typed API with interactive OpenAPI documentation.
- **SQLite and SQLAlchemy:** keep local development and the case-study deployment lightweight while persisting shortlist state, tags, and summary-cache records.
- **Separate candidate skills:** enables normalized skill storage and more consistent filtering than repeatedly parsing free text.
- **Evidence-backed LLM summary rather than autonomous ranking:** a short, inspectable summary helps a recruiter review a profile without pretending that the available mock data proves overall candidate quality.
- **Versioned caching:** reduces repeated model calls while making it possible to invalidate old summaries when the prompt or model context changes.
- **Limited scope:** no vector database, multi-agent orchestration, or elaborate analytics was added because those capabilities were not necessary to demonstrate the core recruiter workflow under the case-study time budget.

## Security and privacy

- The supplied data is mock data for the case study. Do not place real candidate records in the repository.
- Do not commit `backend/.env`, `frontend/.env`, actual API keys, local databases, or logs containing sensitive values.
- Keep `.env.example` files limited to variable names and safe placeholders.
- Before using real candidate data, add authentication and authorization, access controls, retention policies, audit logging, secure deployment configuration, and an organizational review of sending candidate information to a third-party LLM provider.
- Do not rely on the AI fit assessment as the sole basis for employment decisions.

## Known limitations and next steps

This is a local case-study prototype, not a production-ready recruiting system. Its dataset is small and synthetic, and the SQLite configuration is intended for lightweight use. Before a client rollout, priorities would include input validation and duplicate detection during ingestion, realistic performance tests, structured observability, authentication and authorization, data-retention controls, bounded LLM retries/timeouts, evaluation of summary quality, and clear operational recovery procedures.

More infrastructure should be introduced only when workload measurements and product needs justify it.

## Case-study deliverables

- **Task 1 — Candidate triage application:** frontend, FastAPI API, persistent data, shortlist/tags, and a real LLM-backed summary.
- **Task 2a — Ranking at scale:** `backend/app/ranking.py`, tests, and algorithm explanation in `docs/ALGORITHM_AND_BUG_REVIEW.md`.
- **Task 2b — JavaScript review:** corrected example and bug/design-smell explanation in `docs/ALGORITHM_AND_BUG_REVIEW.md`; validation in `tests/test_match_candidates.js`.
- **Task 3 — AI collaboration log:** `docs/AI_COLLABORATION_LOG.md`. Prompts must be exact examples actually used, and test/model results in the log must match what was truly verified.
- **Task 4 — Scaling judgment note:** `docs/SCALING_JUDGMENT.md`.
- **Task 5 — Presentation:** prepare a 6–8-slide presentation or concise presentation document covering assumptions, key decisions, AI workflow, the judgment-note takeaway, and what would be built in a two-week sprint.

## License and data

This repository is a candidate case-study submission. Unless a license is added explicitly, no additional license is granted. Candidate records supplied with the starter kit are mock assessment data.
