# Candidate Triage Workspace — GCCX Case Study
### Round 1 | AI Full-Stack Engineer Intern
**Presentation document** · Seven sections for a 7–10 minute walkthrough

---

## 1. Problem and assumptions

Recruiters often triage candidate profiles using spreadsheets and manual judgment. This prototype brings search, filtering, shortlist/tag management, and AI-assisted profile review into one workspace.

**Assumptions**
- The supplied 48-record dataset is mock assessment data.
- Recruiters provide the target role; the application does not invent a role-to-skills mapping.
- AI summaries are advisory and must be checked against candidate evidence.
- SQLite is appropriate for this lightweight local prototype; production needs further validation.

**Success means:** a recruiter can find a profile, inspect details, save shortlist state, and request an evidence-backed summary without treating AI output as a hiring decision.

---

## 2. What I built

- Candidate directory with search, filters, and pagination.
- Candidate details with available skills, experience, notes, and profile information.
- Shortlisting and recruiter tags persisted in the database.
- Role-specific summaries through the real Groq API.
- Supporting evidence and fit labels: potential match, partial match, skills/role mismatch, and insufficient evidence.
- FastAPI OpenAPI documentation, automated tests, React/Vite frontend, and case-study documentation.

The project prioritizes a complete recruiter workflow and explainable output over feature quantity.

---

## 3. Architecture and data flow

**Frontend:** React, Vite, Tailwind CSS  
**API:** Python, FastAPI, Pydantic  
**Persistence:** SQLite, SQLAlchemy  
**LLM:** Groq API

**Typical workflow**
1. The frontend requests candidate records from FastAPI.
2. The backend searches/filters data and returns candidate information.
3. Shortlist and tag changes are persisted in SQLite.
4. For an AI summary, the backend sends the requested role and relevant candidate information to Groq.
5. The service validates the response structure and checks that cited evidence corresponds to the candidate's skills or notes.
6. Valid summaries are cached by candidate, role, model, and prompt version; the frontend displays the summary, assessment, and evidence.

**Boundary:** the skill-overlap ranking exercise is a standalone module unless it has explicitly been integrated into the candidate-list API. Do not claim the API uses it otherwise.

---

## 4. Engineering decisions and trade-offs

**SQLite:** keeps setup and persistence simple for the supplied mock dataset. A client rollout requires measured checks of workload, concurrency, deployment, and operations.

**Evidence-backed summaries:** help recruiters review profiles without pretending incomplete data proves candidate quality. Evidence validation reduces unsupported citations but does not prove every model interpretation is correct.

**Caching:** repeated requests for the same candidate, role, model, and prompt version can reuse validated results and reduce API usage.

**Disciplined scope:** no vector database, multi-agent system, or complex analytics was added because they are not necessary to demonstrate the core workflow.

**Transparent ranking:** skill overlap is a matching signal, not a prediction of job performance.

---

## 5. AI workflow and verification

**Tools:** ChatGPT for planning, implementation guidance, debugging, and test design; Groq API for in-product summaries; local Python/pytest, Node.js, and browser/build checks for verification.

**Correction made:** an initially attempted Groq model identifier returned a 404. I checked the models available to my account, selected `openai/gpt-oss-120b`, and verified the integration with a successful model request.

**Verification approach**
- Test candidate API behavior and invalid requests.
- Use controlled test doubles for evidence-validation and cache tests.
- Test ranking separately.
- Run the JavaScript correction tests and frontend production build.
- Verify the live LLM workflow separately from mocked tests.

**Before the interview:** update this section with the exact final test count and observed build/test results. In `docs/AI_COLLABORATION_LOG.md`, use 2–3 prompts copied exactly from the actual conversation and claim only checks that were truly run.

---

## 6. Scaling judgment: 3,000 candidates per week

With one additional engineer and two weeks, prioritize data quality, database query performance, operational safeguards, and AI-quality checks.

**Build first:** ingestion validation and duplicate detection; indexed and paginated queries; useful logs and failure messages; bounded LLM timeouts/retries; and evaluation against a small, manually reviewed summary test set.

**Defer:** vector search, multi-agent orchestration, complex analytics, and automated hiring decisions until measured demand or quality evidence justifies them.

**Biggest risk:** incomplete candidate data combined with over-trust in fluent AI output. Keep source evidence visible, communicate uncertainty, add access controls before real data, and require human review.

**Plan:** week one for ingestion, database, and reliability improvements; week two for end-to-end tests, AI-quality review, deployment/rollback preparation, and critical fixes.

---

## 7. What I would do next

1. Add ingestion validation, duplicate detection, and clearer handling of incomplete profiles.
2. Benchmark search/filter latency on a representative dataset of at least 100,000 candidates.
3. Add authentication, authorization, audit logs, and retention controls before handling real candidate information.
4. Monitor LLM latency, failures, cache hit rate, and API usage; use bounded timeouts/retries.
5. Create a manually reviewed evaluation set for grounding, mismatch handling, and consistency.
6. Improve loading, empty-results, API-error, retry, and accessibility states.



---

