"""Safety-layer tests: must-flag phrases, must-not-flag everyday language, and independence from the ML model."""
import subprocess
import sys

import pytest

from src.safety import CRISIS_MESSAGE, check_crisis

POSITIVE = [
    "I want to kill myself",
    "i've been thinking about suicide a lot",
    "I feel suicidal tonight",
    "I just want to end my life",
    "Some days I want to end it all.",
    "I wish I was dead",
    "I want to die",
    "everyone would be better off without me",
    "There's no reason to live anymore",
    "life is not worth living",
    "I don't want to be alive",
    "I can't go on like this",
    "I've started cutting myself again",
    "I keep wanting to hurt myself",
    "thinking about self-harm",
    "I'm planning to take my own life",
    "i dont want to wake up tomorrow",
    "I WANT TO KILL MYSELF",
    "I’m going to kill myself",      # curly apostrophe/ no-op, upper case variants
    "kms honestly",
    "I'd be better off dead",
    "i feel like i can�t go on",    # Dreaddit-style broken apostrophe
]

NEGATIVE = [
    "This exam is killing me, I'm so tired",
    "I'm dead tired after the lab session",
    "I could kill for a pizza right now",
    "My boss is going to kill me if the report is late",
    "kill the process and restart the server",
    "I'm dying of laughter at that meme",
    "Deadline is tomorrow and I'm so stressed about my project",
    "I have too much homework and I feel overwhelmed",
    "I can't go to the party because I have to study",
    "My roommate and I argued about the dishes",
    "I need to end the meeting early",
    "We cut the budget and I'm worried about my internship",
    "I love this song so much it's to die for",
    "During the panic attack I thought I was going to die",  # fear-of-dying, not ideation: deliberate non-match
    "",
    "   ",
]


@pytest.mark.parametrize("text", POSITIVE)
def test_flags_crisis_language(text):
    r = check_crisis(text)
    assert r.flag, f"missed: {text!r}"
    assert r.message == CRISIS_MESSAGE and r.categories


@pytest.mark.parametrize("text", NEGATIVE)
def test_does_not_flag_everyday_language(text):
    r = check_crisis(text)
    assert not r.flag, f"false alarm on {text!r}: {r.categories}"
    assert r.message is None


def test_message_is_fixed_text_with_a_helpline():
    assert "findahelpline.com" in CRISIS_MESSAGE and "988" in CRISIS_MESSAGE
    assert check_crisis("I want to die").message is CRISIS_MESSAGE  # same constant object, not generated


def test_safety_module_is_independent_of_the_ml_stack():
    """Importing safety.py alone must not pull in sklearn/xgboost/shap/pandas (so ML failures can't disable it)."""
    code = ("import sys, src.safety; bad=[m for m in ('sklearn','xgboost','shap','pandas','joblib','src.features') "
            "if m in sys.modules]; print(bad); sys.exit(1 if bad else 0)")
    r = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True)
    assert r.returncode == 0, r.stdout + r.stderr
