from datetime import date, datetime, timezone
from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    target_role: Mapped[str] = mapped_column(
        String(120), nullable=False, index=True
    )
    years_experience: Mapped[int] = mapped_column(Integer, nullable=False)
    source: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
    )
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    applied_date: Mapped[date | None] = mapped_column(
        Date, nullable=True
    )
    is_shortlisted: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    ai_summary: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )

    skills: Mapped[list["CandidateSkill"]] = relationship(
        back_populates="candidate",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="CandidateSkill.skill",
    )
    tags: Mapped[list["CandidateTag"]] = relationship(
        back_populates="candidate",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="CandidateTag.tag",
    )


class CandidateSkill(Base):
    __tablename__ = "candidate_skills"
    __table_args__ = (
        UniqueConstraint(
            "candidate_id",
            "normalized_skill",
            name="uq_candidate_normalized_skill",
        ),
        Index("ix_candidate_skills_normalized", "normalized_skill"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("candidates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    skill: Mapped[str] = mapped_column(String(100), nullable=False)
    normalized_skill: Mapped[str] = mapped_column(String(100), nullable=False)

    candidate: Mapped["Candidate"] = relationship(back_populates="skills")


class CandidateTag(Base):
    __tablename__ = "candidate_tags"
    __table_args__ = (
        UniqueConstraint(
            "candidate_id",
            "normalized_tag",
            name="uq_candidate_normalized_tag",
        ),
        Index("ix_candidate_tags_normalized", "normalized_tag"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("candidates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tag: Mapped[str] = mapped_column(String(80), nullable=False)
    normalized_tag: Mapped[str] = mapped_column(String(80), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    candidate: Mapped["Candidate"] = relationship(back_populates="tags")


class AISummaryCache(Base):
    __tablename__ = "ai_summary_cache"
    __table_args__ = (
        UniqueConstraint(
            "candidate_id",
            "requested_role",
            name="uq_candidate_requested_role",
        ),
        Index("ix_ai_summary_candidate_role", "candidate_id", "requested_role"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("candidates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    requested_role: Mapped[str] = mapped_column(String(120), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    fit_assessment: Mapped[str] = mapped_column(String(40), nullable=False)
    evidence: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    candidate: Mapped["Candidate"] = relationship()


