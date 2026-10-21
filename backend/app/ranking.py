from collections import defaultdict
from typing import Any, Iterable, Mapping


def build_skill_index(candidates: Iterable[Mapping[str, Any]]) -> dict[str, set[str]]:
    """Build a skill-to-candidate index once for repeated searches."""
    index: dict[str, set[str]] = defaultdict(set)
    for candidate in candidates:
        candidate_id = str(candidate["id"])
        skills = candidate.get("skills") or []
        for skill in skills:
            if isinstance(skill, str):
                normalized_skill = skill.strip().casefold()
                if normalized_skill:
                    index[normalized_skill].add(candidate_id)
    return dict(index)


def rank_candidates_by_skill_overlap(
    candidates_by_id: Mapping[str, Mapping[str, Any]],
    skill_index: Mapping[str, set[str]],
    required_skills: Iterable[str],
) -> list[dict[str, Any]]:
    """Rank candidates by the proportion of requested skills they match."""
    required = {
        skill.strip().casefold()
        for skill in required_skills
        if isinstance(skill, str) and skill.strip()
    }
    if not required:
        return []

    match_counts: dict[str, int] = defaultdict(int)
    for skill in required:
        for candidate_id in skill_index.get(skill, ()):
            if candidate_id in candidates_by_id:
                match_counts[candidate_id] += 1

    ranked_ids = sorted(
        match_counts,
        key=lambda candidate_id: (
            -match_counts[candidate_id],
            candidate_id,
        ),
    )

    return [
        {
            "candidate": candidates_by_id[candidate_id],
            "matched_skills": match_counts[candidate_id],
            "score": match_counts[candidate_id] / len(required),
        }
        for candidate_id in ranked_ids
    ]
