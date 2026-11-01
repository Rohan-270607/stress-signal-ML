"""Guards on the guided-journaling prompt file: neutral wording, no diagnosis/advice/self-harm language."""
import json
import re
from pathlib import Path

PATH = Path(__file__).resolve().parents[2] / "docs" / "journaling_prompts.json"
BANNED = re.compile(r"diagnos|disorder|depress|anxiet|suicid|self[- ]?harm|kill|die\b|hurt|should|try to|you need|therap|medicat", re.I)


def load():
    return json.loads(PATH.read_text(encoding="utf-8"))


def test_structure_and_scoring_mode():
    d = load()
    assert d["scoring"] == "per_answer_mean" and d["min_words_hint"] >= 20
    assert 4 <= len(d["prompts"]) <= 10
    ids = [p["id"] for p in d["prompts"]]
    assert len(ids) == len(set(ids)), "duplicate prompt ids"


def test_prompts_are_plain_questions_without_banned_language():
    for p in load()["prompts"]:
        t = p["text"]
        assert t.endswith(("?", ".")) and 20 < len(t) < 200, t
        assert not BANNED.search(t), f"banned wording in prompt {p['id']!r}: {t}"


def test_prompts_do_not_presuppose_distress():
    # neutral priming: none of the prompts may use these loaded words
    loaded = re.compile(r"stress|overwhelm|struggl|worr|afraid|sad|angry|hopeless|pain", re.I)
    for p in load()["prompts"]:
        assert not loaded.search(p["text"]), p["text"]
