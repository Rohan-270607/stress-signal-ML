"""Step 3: transparent, lexicon-based linguistic feature extractor.

Every feature is a plain count divided by the number of words, so the features are easy to explain:
"x% of the words in this text were first-person singular pronouns". No hidden model, no LIWC.

Lexicons are plain text files in /ml/lexicons (one word per line, '#' = comment). Edit them freely.
"""
import re
from pathlib import Path

import pandas as pd

from src.config import LEXICONS

# Order matters: this is the column order the models are trained on and the API relies on.
FEATURE_NAMES = [
    "first_person_rate",     # I / me / my / mine / myself
    "absolutist_rate",       # always, never, completely, nothing ...
    "negative_emotion_rate", # NRC negative / anger / fear / sadness words
    "negation_rate",         # not, no, n't ...
    "question_rate",         # '?' per word
    "exclamation_rate",      # '!' per word
    "word_count",            # text length in words (raw count, NOT a rate)
]

# a "word" = letters, optionally with an internal apostrophe so "don't" / "i'm" stay single tokens
_TOKEN = re.compile(r"[a-z]+(?:'[a-z]+)*")
# Dreaddit text has encoding damage: "doesn't" appears as "doesn�t". Repair it so negations/contractions match.
_BROKEN_APOS = re.compile(r"(?<=[A-Za-z])[�’‘`´](?=[A-Za-z])")


def load_lexicon(path: Path) -> frozenset:
    words = set()
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        line = line.strip().lower()
        if line and not line.startswith("#"):
            words.add(line)
    return frozenset(words)


def tokenize(text: str) -> list:
    return _TOKEN.findall(_BROKEN_APOS.sub("'", text).lower())


class FeatureExtractor:
    def __init__(self, lexicon_dir: Path = LEXICONS):
        d = Path(lexicon_dir)
        neg_emo = d / "negative_emotion.txt"
        if not neg_emo.exists():
            raise FileNotFoundError(
                f"{neg_emo} missing. It is derived from the NRC Emotion Lexicon (not redistributable). "
                "Download the lexicon into data/raw/nrc/ and run: python -m src.build_nrc_lexicon")
        self.first_person = load_lexicon(d / "first_person_singular.txt")
        self.absolutist = load_lexicon(d / "absolutist.txt")
        self.negative_emotion = load_lexicon(neg_emo)
        self.negation = load_lexicon(d / "negation.txt")

    def extract(self, text: str) -> dict:
        tokens = tokenize(text)
        n = len(tokens)
        if n == 0:  # nothing to measure; avoid division by zero
            return {k: 0.0 for k in FEATURE_NAMES}
        count = lambda lex: sum(t in lex for t in tokens)  # noqa: E731
        negations = count(self.negation) + sum(t.endswith("n't") and t not in self.negation for t in tokens)
        return {
            "first_person_rate": count(self.first_person) / n,
            "absolutist_rate": count(self.absolutist) / n,
            "negative_emotion_rate": count(self.negative_emotion) / n,
            "negation_rate": negations / n,
            "question_rate": text.count("?") / n,
            "exclamation_rate": text.count("!") / n,
            "word_count": float(n),
        }

    def transform(self, texts) -> pd.DataFrame:
        return pd.DataFrame([self.extract(t) for t in texts], columns=FEATURE_NAMES)


if __name__ == "__main__":
    fx = FeatureExtractor()
    print(fx.extract("I never get anything right, and I'm always failing. Why me?!"))
