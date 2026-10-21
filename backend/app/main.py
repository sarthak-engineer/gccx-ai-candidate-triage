from contextlib import asynccontextmanager
from datetime import date, datetime
import json
import os
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import distinct, func, or_, select
from sqlalchemy.orm import Session, selectinload

from dotenv import load_dotenv

from .database import Base, PROJECT_ROOT, SessionLocal, engine, get_db

load_dotenv(PROJECT_ROOT / "backend" / ".env")
load_dotenv(PROJECT_ROOT / ".env")

from .ai_service import AISummaryError, generate_candidate_summary
from .models import Candidate, CandidateSkill, CandidateTag
from .schemas import (
    AISummaryRequest,
    AISummaryResponse,
    CandidateListResponse,
    CandidateResponse,
    MetadataResponse,
    ShortlistUpdate,
    TagCreate,
)


def initialize_database():
    Base.metadata.create_all(bind=engine)
    from sqlalchemy import inspect, text

    columns = {
        column["name"]
        for column in inspect(engine).get_columns("ai_summary_cache")
    }
    if "fit_assessment" not in columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE ai_summary_cache "
                    "ADD COLUMN fit_assessment VARCHAR(40) "
                    "NOT NULL DEFAULT 'insufficient_evidence'"
                )
            )

    with SessionLocal() as db:

        count = db.scalar(select(func.count(Candidate.id)))
        if count and count > 0:
            return

        json_path = PROJECT_ROOT / "candidates.json"
        if not json_path.exists():
            return

        with open(json_path, "r", encoding="utf-8") as f:
            records = json.load(f)

        for record in records:
            applied_d = None
            if record.get("applied_date"):
                try:
                    applied_d = date.fromisoformat(record["applied_date"])
                except ValueError:
                    applied_d = None

            candidate = Candidate(
                id=record["id"],
                name=record["name"],
                target_role=record["target_role"],
                years_experience=record["years_experience"],
                source=record["source"],
                notes=record.get("notes", ""),
                applied_date=applied_d,
                is_shortlisted=False,
            )

            for skill_str in record.get("skills", []):
                cleaned = skill_str.strip()
                if cleaned:
                    candidate.skills.append(
                        CandidateSkill(
                            skill=cleaned,
                            normalized_skill=cleaned.casefold(),
                        )
                    )

            db.add(candidate)

        db.commit()


seed_database_if_empty = initialize_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield



app = FastAPI(
    title="GCCX Candidate Triage API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}




def require_candidate(db: Session, candidate_id: str) -> Candidate:
    candidate = db.scalar(
        select(Candidate)
        .options(
            selectinload(Candidate.skills),
            selectinload(Candidate.tags),
        )
        .where(Candidate.id == candidate_id)
    )
    if candidate is None:
        raise HTTPException(
            status_code=404,
            detail=f"Candidate with ID '{candidate_id}' not found.",
        )
    return candidate


def candidate_to_dict(candidate: Candidate) -> dict:
    return {
        "id": candidate.id,
        "name": candidate.name,
        "target_role": candidate.target_role,
        "years_experience": candidate.years_experience,
        "source": candidate.source,
        "notes": candidate.notes,
        "applied_date": candidate.applied_date,
        "is_shortlisted": candidate.is_shortlisted,
        "skills": [s.skill for s in candidate.skills],
        "tags": [t.tag for t in candidate.tags],
        "ai_summary": candidate.ai_summary,
    }


@app.get("/api/candidates", response_model=CandidateListResponse)
def list_candidates(
    search: str | None = None,
    role: str | None = None,
    target_role: str | None = None,
    source: str | None = None,
    min_experience: int | None = None,
    max_experience: int | None = None,
    skill: str | None = None,
    skills: list[str] = Query(default=None),
    shortlisted: bool | None = None,
    is_shortlisted: bool | None = None,
    tag: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    stmt = select(Candidate).options(
        selectinload(Candidate.skills),
        selectinload(Candidate.tags),
    )

    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Candidate.name.ilike(s),
                Candidate.notes.ilike(s),
                Candidate.target_role.ilike(s),
            )
        )

    active_role = target_role or role
    if active_role:
        stmt = stmt.where(Candidate.target_role == active_role)

    if source:
        stmt = stmt.where(Candidate.source == source)

    if min_experience is not None:
        stmt = stmt.where(Candidate.years_experience >= min_experience)

    if max_experience is not None:
        stmt = stmt.where(Candidate.years_experience <= max_experience)

    active_shortlist = is_shortlisted if is_shortlisted is not None else shortlisted
    if active_shortlist is not None:
        stmt = stmt.where(Candidate.is_shortlisted == active_shortlist)

    active_skills = skills if skills else ([skill] if skill else [])
    for sk in active_skills:
        norm_skill = sk.strip().casefold()
        if norm_skill:
            stmt = stmt.where(
                Candidate.skills.any(CandidateSkill.normalized_skill == norm_skill)
            )


    if tag:
        norm_tag = tag.strip().casefold()
        stmt = stmt.where(
            Candidate.tags.any(CandidateTag.normalized_tag == norm_tag)
        )

    count_subquery = stmt.with_only_columns(Candidate.id).order_by(None).subquery()
    total = db.scalar(select(func.count()).select_from(count_subquery)) or 0

    stmt = stmt.order_by(Candidate.id.asc()).offset(offset).limit(limit)
    candidates = db.scalars(stmt).all()

    return {
        "items": [candidate_to_dict(c) for c in candidates],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@app.get("/api/candidates/{candidate_id}", response_model=CandidateResponse)
def get_candidate(
    candidate_id: str,
    db: Session = Depends(get_db),
):
    candidate = require_candidate(db, candidate_id)
    return candidate_to_dict(candidate)


@app.patch(
    "/api/candidates/{candidate_id}/shortlist",
    response_model=CandidateResponse,
)
def update_candidate_shortlist(
    candidate_id: str,
    payload: ShortlistUpdate,
    db: Session = Depends(get_db),
):
    candidate = require_candidate(db, candidate_id)
    candidate.is_shortlisted = payload.is_shortlisted
    db.commit()
    candidate = require_candidate(db, candidate_id)
    return candidate_to_dict(candidate)


@app.post(
    "/api/candidates/{candidate_id}/tags",
    response_model=CandidateResponse,
    status_code=200,
)
def add_candidate_tag(
    candidate_id: str,
    payload: TagCreate,
    db: Session = Depends(get_db),
):
    candidate = require_candidate(db, candidate_id)
    clean_tag = payload.tag.strip()
    if not clean_tag:
        raise HTTPException(
            status_code=422,
            detail="Tag cannot be blank.",
        )
    normalized = clean_tag.casefold()
    if any(tag.normalized_tag == normalized for tag in candidate.tags):
        raise HTTPException(
            status_code=409,
            detail="This tag already exists for the candidate.",
        )
    candidate.tags.append(
        CandidateTag(
            tag=clean_tag,
            normalized_tag=normalized,
        )
    )
    db.commit()
    candidate = require_candidate(db, candidate_id)
    return candidate_to_dict(candidate)


@app.delete("/api/candidates/{candidate_id}/tags")
def delete_candidate_tag(
    candidate_id: str,
    tag: str = Query(min_length=1, max_length=40),
    db: Session = Depends(get_db),
):
    candidate = require_candidate(db, candidate_id)
    normalized = tag.strip().casefold()
    existing_tag = db.scalar(
        select(CandidateTag).where(
            CandidateTag.candidate_id == candidate_id,
            CandidateTag.normalized_tag == normalized,
        )
    )
    if existing_tag is None:
        raise HTTPException(status_code=404, detail="Tag not found.")
    db.delete(existing_tag)
    db.commit()
    return {
        "message": "Tag deleted successfully.",
        "candidate_id": candidate_id,
        "tag": existing_tag.tag,
    }


@app.get("/api/metadata", response_model=MetadataResponse)
def get_metadata(db: Session = Depends(get_db)):
    candidate_count = db.scalar(select(func.count(Candidate.id))) or 0
    roles = list(
        db.scalars(
            select(distinct(Candidate.target_role)).order_by(Candidate.target_role)
        ).all()
    )
    sources = list(
        db.scalars(
            select(distinct(Candidate.source)).order_by(Candidate.source)
        ).all()
    )
    skills = list(
        db.scalars(
            select(distinct(CandidateSkill.skill)).order_by(CandidateSkill.skill)
        ).all()
    )
    return {
        "candidate_count": candidate_count,
        "roles": roles,
        "sources": sources,
        "skills": skills,
    }


@app.post(
    "/api/candidates/{candidate_id}/ai-summary",
    response_model=AISummaryResponse,
)
def get_ai_summary(
    candidate_id: str,
    payload: AISummaryRequest,
    db: Session = Depends(get_db),
):
    candidate = db.scalar(
        select(Candidate)
        .options(selectinload(Candidate.skills))
        .where(Candidate.id == candidate_id)
    )
    if candidate is None:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    try:
        return generate_candidate_summary(
            db=db,
            candidate=candidate,
            requested_role=payload.target_role,
        )
    except AISummaryError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

