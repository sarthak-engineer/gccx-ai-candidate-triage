# Scaling Judgment Note — 3,000 Candidates per Week

With one additional engineer and two weeks, I would prioritize reliability, data quality, and recruiter workflow over adding more AI features.

## What I would build first
- **Reliable ingestion**: Validate incoming candidate records, normalize skill names, detect duplicates, and report rejected or incomplete records instead of silently accepting bad data.
- **Database and query performance**: Add or verify indexes for common filters, ensure pagination happens at the database layer, and benchmark realistic searches against a larger dataset.
- **Operational safeguards**: Add structured logs, clear API errors, timeouts and bounded retries for the LLM integration, and basic monitoring of request failures and latency.
- **AI quality controls**: Keep evidence validation and versioned summary caching. Evaluate summaries against a small, manually reviewed test set, and ensure the interface clearly distinguishes missing evidence from a confirmed skills mismatch.
- **Human workflow**: Make shortlist and tag updates reliable, and verify that recruiters can recover from failed requests without losing their work.

## What I would explicitly defer
I would not introduce a vector database, multi-agent orchestration, complex analytics, or automated hiring decisions in this two-week sprint. Three thousand candidates per week does not, by itself, justify those additions. I would measure query latency, workload, and search quality first, then choose more complex infrastructure only when evidence supports it.

## The biggest risk I would flag
The largest risk is incorrect or incomplete candidate data combined with over-trust in AI-generated assessments. A fluent summary can still be misleading if the profile lacks relevant evidence. I would require evidence-backed summaries, visible uncertainty, access controls for candidate information, and human review before any hiring decision. I would also establish a baseline for data quality and AI assessment accuracy before client rollout.

## Delivery approach
- **Week 1**: Validate ingestion, improve database queries, and add representative performance and failure tests.
- **Week 2**: Test the complete recruiter workflow, review AI output quality, address critical issues, and prepare deployment and rollback instructions. Release only after agreed reliability and data-quality checks pass.
