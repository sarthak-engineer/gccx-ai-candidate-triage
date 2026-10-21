from backend.app.ranking import (
    build_skill_index,
    rank_candidates_by_skill_overlap,
)


def make_candidates():
    return [
        {"id": "c1", "name": "Asha", "skills": ["Python", "FastAPI"]},
        {"id": "c2", "name": "Bala", "skills": ["Python", "SQL", "Docker"]},
        {"id": "c3", "name": "Chin", "skills": ["JavaScript"]},
        {"id": "c4", "name": "Devi", "skills": ["SQL", "python"]},
    ]


def test_index_normalizes_skill_names():
    candidates = make_candidates()
    index = build_skill_index(candidates)
    assert index["python"] == {"c1", "c2", "c4"}


def test_candidates_rank_by_skill_overlap():
    candidates = make_candidates()
    by_id = {candidate["id"]: candidate for candidate in candidates}
    index = build_skill_index(candidates)
    results = rank_candidates_by_skill_overlap(
        by_id, index, ["Python", "SQL"]
    )
    assert [item["candidate"]["id"] for item in results] == [
        "c2",
        "c4",
        "c1",
    ]
    assert results[0]["matched_skills"] == 2
    assert results[0]["score"] == 1.0


def test_skill_matching_is_case_insensitive():
    candidates = make_candidates()
    by_id = {candidate["id"]: candidate for candidate in candidates}
    index = build_skill_index(candidates)
    results = rank_candidates_by_skill_overlap(
        by_id, index, ["PYTHON"]
    )
    assert {item["candidate"]["id"] for item in results} == {
        "c1",
        "c2",
        "c4",
    }


def test_empty_required_skills_returns_no_results():
    candidates = make_candidates()
    by_id = {candidate["id"]: candidate for candidate in candidates}
    index = build_skill_index(candidates)
    assert rank_candidates_by_skill_overlap(by_id, index, []) == []


def test_handles_none_and_malformed_skills():
    candidates = [
        {"id": "c1", "name": "A", "skills": None},
        {"id": "c2", "name": "B"},
        {"id": "c3", "name": "C", "skills": [None, "", "  Python  ", 42]},
    ]
    by_id = {c["id"]: c for c in candidates}
    index = build_skill_index(candidates)
    assert index == {"python": {"c3"}}

    results = rank_candidates_by_skill_overlap(
        by_id, index, [None, "", "   ", "python", 99]
    )
    assert len(results) == 1
    assert results[0]["candidate"]["id"] == "c3"
    assert results[0]["score"] == 1.0


def test_deterministic_tie_breaking_order():
    candidates = [
        {"id": "cand_z", "name": "Zara", "skills": ["Python"]},
        {"id": "cand_a", "name": "Adam", "skills": ["Python"]},
        {"id": "cand_m", "name": "Maya", "skills": ["Python"]},
    ]
    by_id = {c["id"]: c for c in candidates}
    index = build_skill_index(candidates)
    results = rank_candidates_by_skill_overlap(by_id, index, ["Python"])
    # All have 1 match, so ties must break alphabetically by candidate_id ascending: cand_a, cand_m, cand_z
    assert [r["candidate"]["id"] for r in results] == [
        "cand_a",
        "cand_m",
        "cand_z",
    ]


def test_missing_candidate_in_lookup_is_safely_ignored():
    candidates = [{"id": "c1", "skills": ["Python"]}]
    index = build_skill_index(candidates)
    # Lookup map doesn't contain c1
    results = rank_candidates_by_skill_overlap({}, index, ["Python"])
    assert results == []


def test_ranking_at_scale_100k_candidates():
    # Build 100,000 mock candidates
    mock_candidates = [
        {
            "id": f"c_{i}",
            "name": f"Candidate {i}",
            "skills": ["Python", "FastAPI"] if i % 2 == 0 else ["Java", "Docker"],
        }
        for i in range(100_000)
    ]
    by_id = {c["id"]: c for c in mock_candidates}
    index = build_skill_index(mock_candidates)

    # 50,000 match Python
    assert len(index["python"]) == 50_000

    results = rank_candidates_by_skill_overlap(
        by_id, index, ["Python", "FastAPI"]
    )
    assert len(results) == 50_000
    # First match should have both Python and FastAPI
    assert results[0]["matched_skills"] == 2
    assert results[0]["score"] == 1.0

