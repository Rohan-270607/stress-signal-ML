"""API tests (FastAPI TestClient runs the real app with the real saved model)."""
import pytest
from fastapi.testclient import TestClient

from api.main import DISCLAIMER, app, state
from src.safety import CRISIS_MESSAGE


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:   # the 'with' runs the lifespan (loads the model)
        yield c


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200 and r.json() == {"status": "ok", "model_loaded": True}


def test_analyze_contract_shape(client):
    r = client.post("/analyze", json={"text": "I always mess everything up and I never feel okay. Why me?"})
    assert r.status_code == 200
    b = r.json()
    assert set(b) == {"stress_score", "label", "explanation", "pieces", "crisis_flag", "crisis_message", "disclaimer"}
    assert b["pieces"] == 1
    assert 0 <= b["stress_score"] <= 1
    assert b["label"] in {"higher_signal", "lower_signal"}
    assert (b["label"] == "higher_signal") == (b["stress_score"] >= 0.5)
    assert b["disclaimer"] == DISCLAIMER
    assert b["crisis_flag"] is False and b["crisis_message"] is None
    for e in b["explanation"]:
        assert set(e) == {"feature", "direction", "contribution", "plain_text"}
        assert e["direction"] in {"increases", "decreases"}
        assert (e["contribution"] > 0) == (e["direction"] == "increases")


def test_crisis_text_gets_fixed_message(client):
    r = client.post("/analyze", json={"text": "I don't see the point, I want to end my life."})
    b = r.json()
    assert r.status_code == 200 and b["crisis_flag"] is True and b["crisis_message"] == CRISIS_MESSAGE


@pytest.mark.parametrize("body", [{}, {"text": ""}, {"text": "   \n"}, {"text": 123}, {"text": None},
                                  {"text": "x" * 5001}, {"wrong": "a"}])
def test_validation_rejects_bad_input(client, body):
    assert client.post("/analyze", json=body).status_code == 422


def test_max_length_boundary_ok(client):
    assert client.post("/analyze", json={"text": "word " * 1000}).status_code == 200  # 5000 chars exactly


def test_unusual_text_does_not_crash(client):
    for t in ["?!?!", "😀😀😀", "a", "I " * 2000]:
        assert client.post("/analyze", json={"text": t[:5000]}).status_code == 200


def test_model_failure_still_returns_crisis_info(client, monkeypatch):
    class Broken:
        def analyze(self, text):
            raise RuntimeError("boom")
    monkeypatch.setitem(state, "explainer", Broken())
    r = client.post("/analyze", json={"text": "I want to kill myself"})
    assert r.status_code == 503
    assert r.json()["crisis_flag"] is True and r.json()["crisis_message"] == CRISIS_MESSAGE
    assert "boom" not in r.text   # internals never leak


CALM = "This week I went to my lectures and finished the reading before the weekend. "


def test_long_text_is_scored_in_pieces(client):
    b = client.post("/analyze", json={"text": CALM * 25}).json()   # ~350 words
    assert b["pieces"] > 1 and 0 <= b["stress_score"] <= 1
    # length is left out of the reasons for a chunked text: every piece is ~100 words by construction
    assert all(e["feature"] != "word_count" for e in b["explanation"])


def test_long_calm_text_is_not_pushed_to_higher_by_length(client):
    whole = state["explainer"].analyze(CALM * 25, chunk=False)["stress_score"]
    b = client.post("/analyze", json={"text": CALM * 25}).json()
    assert b["stress_score"] < whole       # the length effect (D-15 / D-17) is what chunking removes
    assert b["label"] == "lower_signal"


def test_text_up_to_150_words_is_unchanged_by_chunking(client):
    text = CALM * 10                        # 140 words
    a, b = state["explainer"].analyze(text), state["explainer"].analyze(text, chunk=False)
    assert a["pieces"] == 1
    assert a["stress_score"] == b["stress_score"] and a["explanation"] == b["explanation"]


def test_crisis_phrase_deep_in_a_long_text_is_still_flagged(client):
    text = CALM * 12 + "Some days I want to end my life. " + CALM * 12
    b = client.post("/analyze", json={"text": text}).json()
    assert b["pieces"] > 1 and b["crisis_flag"] is True and b["crisis_message"] == CRISIS_MESSAGE


# ---------- POST /safety-check (DECISIONS D-19) ----------
SAFETY_TEXTS = [
    "I want to kill myself", "I just want to end my life", "I've been thinking about suicide a lot",
    "I've started cutting myself again", "I wish I was dead",
    CALM * 12 + "Some days I want to end my life. " + CALM * 12,     # deep inside a long entry
    "This exam is killing me but I will be fine", CALM, "I never get anything right and I am so afraid.",
]


def test_safety_check_flags_crisis_text_with_the_fixed_message(client):
    r = client.post("/safety-check", json={"text": "I want to end my life"})
    b = r.json()
    assert r.status_code == 200
    assert set(b) == {"crisis_flag", "crisis_message", "disclaimer"}
    assert b["crisis_flag"] is True and b["crisis_message"] == CRISIS_MESSAGE and b["disclaimer"] == DISCLAIMER


def test_safety_check_does_not_flag_everyday_text(client):
    b = client.post("/safety-check", json={"text": CALM}).json()
    assert b["crisis_flag"] is False and b["crisis_message"] is None


@pytest.mark.parametrize("text", SAFETY_TEXTS)
def test_safety_check_agrees_with_analyze(client, text):
    # one set of rules: the two endpoints must never disagree about the same text
    a = client.post("/analyze", json={"text": text}).json()
    s = client.post("/safety-check", json={"text": text}).json()
    assert (s["crisis_flag"], s["crisis_message"]) == (a["crisis_flag"], a["crisis_message"])


def test_safety_check_works_when_the_model_is_unavailable(client, monkeypatch):
    class Broken:
        def __getattr__(self, name):
            raise RuntimeError("the model must not be touched")
    monkeypatch.setitem(state, "explainer", Broken())
    r = client.post("/safety-check", json={"text": "I want to kill myself"})
    assert r.status_code == 200 and r.json()["crisis_flag"] is True and r.json()["crisis_message"] == CRISIS_MESSAGE


@pytest.mark.parametrize("body", [{}, {"text": ""}, {"text": "   \n"}, {"text": 123}, {"text": None},
                                  {"text": "x" * 5001}, {"wrong": "a"}])
def test_safety_check_rejects_bad_input(client, body):
    assert client.post("/safety-check", json=body).status_code == 422


def test_safety_check_accepts_the_longest_allowed_entry(client):
    assert client.post("/safety-check", json={"text": "word " * 1000}).status_code == 200  # 5000 chars exactly

