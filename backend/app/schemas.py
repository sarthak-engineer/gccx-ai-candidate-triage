from datetime import date
from typing import Literal
from pydantic import BaseModel, Field


class CandidateResponse(BaseModel):
    id: str
    name: str
    target_role: str
    years_experience: int
    source: str
    notes: str
    applied_date: date | None
    is_shortlisted: bool
    skills: list[str]
    tags: list[str]
    ai_summary: str | None = None


class CandidateListResponse(BaseModel):
    items: list[CandidateResponse]
    total: int
    limit: int
    offset: int


class ShortlistUpdate(BaseModel):
    is_shortlisted: bool


class TagCreate(BaseModel):
    tag: str = Field(min_length=1, max_length=40)


class MetadataResponse(BaseModel):
    candidate_count: int
    roles: list[str]
    sources: list[str]
    skills: list[str]


class AISummaryRequest(BaseModel):
    target_role: str = Field(min_length=1, max_length=120)



class EvidenceItem(BaseModel):
    claim: str
    source_type: Literal["skill", "note"]
    source_text: str


class AISummaryContent(BaseModel):
    summary: str = Field(min_length=1, max_length=400)
    fit_assessment: Literal[
        "potential_match",
        "partial_match",
        "skills_role_mismatch",
        "insufficient_evidence",
    ]
    evidence: list[EvidenceItem] = Field(max_length=5)


class AISummaryResponse(AISummaryContent):
    candidate_id: str
    requested_role: str
    model: str
    cached: bool = False
