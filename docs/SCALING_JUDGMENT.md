# Scaling Judgment Note — 3,000 Candidates per Week

With one additional engineer and two weeks, I would prioritize data quality, query performance, and operational reliability over adding more AI features.

**Build first**
- Validate incoming candidate records, normalize skills, and detect duplicates.
- Verify database indexes and pagination, then benchmark realistic queries against a 100,000-candidate dataset.
- Add clear API errors, structured logs, bounded LLM timeouts/retries, and tests for the complete recruiter workflow.
- Evaluate AI summaries against a small, manually reviewed set and keep supporting evidence visible.

**Defer**
I would not introduce vector search, multi-agent orchestration, complex analytics, or automated hiring decisions without evidence that they are needed. I would measure workload and search quality before introducing additional infrastructure.

**Biggest risk**
Incomplete candidate data combined with over-trust in fluent AI-generated assessments could mislead recruiters. Before a client rollout, I would require evidence-backed summaries, visible uncertainty, appropriate access controls, and human review.

**Two-week plan:** Week one for ingestion, database performance, and reliability; week two for end-to-end testing, AI quality review, and deployment readiness.
