import json
import os
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

# Use a separate database so tests never modify your normal database.
TEST_DB = Path(__file__).resolve().parents[1] / "test_triage.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB.as_posix()}"

from backend.app.main import app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client

    # Close open connections before unlinking on Windows
    from backend.app.database import engine
    engine.dispose()

    # Remove only the dedicated test database after the test session.
    if TEST_DB.exists():
        try:
            TEST_DB.unlink()
        except PermissionError:
            pass



def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200


def test_metadata_contains_imported_candidates(client):
    response = client.get("/api/metadata")
    assert response.status_code == 200

    data = response.json()
    assert data["candidate_count"] == 48
    assert isinstance(data["roles"], list)
    assert isinstance(data["skills"], list)


def test_candidate_list_returns_paginated_results(client):
    response = client.get("/api/candidates?limit=10&offset=0")
    assert response.status_code == 200

    data = response.json()
    assert data["total"] == 48
    assert len(data["items"]) == 10
    assert data["limit"] == 10
    assert data["offset"] == 0


def test_search_returns_matching_candidate(client):
    response = client.get("/api/candidates", params={"search": "Sameer Rao"})
    assert response.status_code == 200

    data = response.json()
    assert data["total"] >= 1
    assert any(
        candidate["name"] == "Sameer Rao"
        for candidate in data["items"]
    )


def test_candidate_detail_exists(client):
    response = client.get("/api/candidates/cand_001")
    assert response.status_code == 200
    assert response.json()["id"] == "cand_001"


def test_unknown_candidate_returns_404(client):
    response = client.get("/api/candidates/not_a_real_candidate")
    assert response.status_code == 404


def test_shortlist_can_be_updated(client):
    candidate_id = "cand_001"

    response = client.patch(
        f"/api/candidates/{candidate_id}/shortlist",
        json={"is_shortlisted": True},
    )
    assert response.status_code == 200

    detail = client.get(f"/api/candidates/{candidate_id}")
    assert detail.status_code == 200
    assert detail.json()["is_shortlisted"] is True


def test_tag_can_be_added_and_removed(client):
    candidate_id = "cand_001"
    tag = "pytest-check"

    add_response = client.post(
        f"/api/candidates/{candidate_id}/tags",
        json={"tag": tag},
    )
    assert add_response.status_code in (200, 201)

    detail = client.get(f"/api/candidates/{candidate_id}")
    assert tag in detail.json()["tags"]

    delete_response = client.delete(
        f"/api/candidates/{candidate_id}/tags",
        params={"tag": tag},
    )
    assert delete_response.status_code == 200

    detail = client.get(f"/api/candidates/{candidate_id}")
    assert tag not in detail.json()["tags"]


def test_ai_summary_unknown_candidate_returns_404(client):
    response = client.post(
        "/api/candidates/not_a_real_candidate/ai-summary",
        json={"target_role": "Machine Learning Engineer"},
    )
    assert response.status_code == 404


def test_ai_summary_rejects_empty_role(client):
    response = client.post(
        "/api/candidates/cand_001/ai-summary",
        json={"target_role": ""},
    )
    assert response.status_code == 422


def test_ai_summary_validates_evidence_and_reuses_cache(client, monkeypatch):
    import backend.app.ai_service as ai_service

    fake_result = {
        "summary": (
            "The candidate has enterprise software experience, "
            "but machine-learning expertise is not established."
        ),
        "fit_assessment": "insufficient_evidence",
        "evidence": [
            {
                "claim": "Experience in a large enterprise team",
                "source_type": "note",
                "source_text": (
                    "Sameer has 6 yrs in a large enterprise team "
                    "— process-heavy environment"
                ),
            }
        ],
    }
    calls = {"count": 0}

    class FakeGroq:
        def __init__(self, **kwargs):
            self.chat = SimpleNamespace(
                completions=SimpleNamespace(create=self.create)
            )

        def create(self, **kwargs):
            calls["count"] += 1
            message = SimpleNamespace(content=json.dumps(fake_result))
            choice = SimpleNamespace(message=message)
            return SimpleNamespace(choices=[choice])

    monkeypatch.setattr(ai_service, "Groq", FakeGroq)
    url = "/api/candidates/cand_001/ai-summary"
    payload = {"target_role": "Machine Learning Engineer"}
    first = client.post(url, json=payload)
    assert first.status_code == 200
    assert first.json()["cached"] is False
    assert first.json()["evidence"][0]["source_type"] == "note"
    second = client.post(url, json=payload)
    assert second.status_code == 200
    assert second.json()["cached"] is True
    # Groq should have been called only once.
    assert calls["count"] == 1


def test_ai_summary_rejects_unsupported_evidence(client, monkeypatch):
    import backend.app.ai_service as ai_service

    fake_result = {
        "summary": "The candidate has advanced machine-learning expertise.",
        "fit_assessment": "potential_match",
        "evidence": [
            {
                "claim": "Expert in quantum machine learning",
                "source_type": "skill",
                "source_text": "Quantum Machine Learning",
            }
        ],
    }

    class FakeGroq:
        def __init__(self, **kwargs):
            self.chat = SimpleNamespace(
                completions=SimpleNamespace(create=self.create)
            )

        def create(self, **kwargs):
            message = SimpleNamespace(content=json.dumps(fake_result))
            choice = SimpleNamespace(message=message)
            return SimpleNamespace(choices=[choice])

    monkeypatch.setattr(ai_service, "Groq", FakeGroq)
    url = "/api/candidates/cand_002/ai-summary"
    payload = {"target_role": "Machine Learning Engineer"}
    response = client.post(url, json=payload)
    assert response.status_code == 200
    assert response.json()["evidence"] == []

