"""Build lexicons/negative_emotion.txt from the NRC Emotion Lexicon (EmoLex).

Why a script instead of a committed file: the NRC licence allows free
NON-COMMERCIAL research use but forbids redistributing the data. So the word
list is generated locally from the official download and git-ignored.

Get the data: https://saifmohammad.com/WebDocs/Lexicons/NRC-Emotion-Lexicon.zip
and unzip it into ml/data/raw/nrc/ (the layout this script expects).

Which words: every word EmoLex marks as `negative`, PLUS words marked anger,
fear or sadness (EmoLex's `negative` flag is a sentiment flag; the three
emotions are the ones closest to "distress"). Union of all four, deduplicated.
Cite: Mohammad & Turney (2013), "Crowdsourcing a Word-Emotion Association
Lexicon", Computational Intelligence 29(3); Mohammad & Turney (2010).
"""
from src.config import LEXICONS, RAW

SRC = RAW / "nrc" / "NRC-Emotion-Lexicon" / "NRC-Emotion-Lexicon-Wordlevel-v0.92.txt"
KEEP = {"negative", "anger", "fear", "sadness"}


def main() -> None:
    words = set()
    for line in SRC.read_text(encoding="utf-8").splitlines():
        parts = line.split("\t")             # word <tab> emotion <tab> 0/1
        if len(parts) == 3 and parts[1] in KEEP and parts[2] == "1":
            words.add(parts[0].lower())
    LEXICONS.mkdir(exist_ok=True)
    header = ("# Derived from the NRC Emotion Lexicon (Mohammad & Turney). Non-commercial research use only;\n"
              "# do not redistribute. Words flagged negative/anger/fear/sadness. Regenerate with src/build_nrc_lexicon.py\n")
    (LEXICONS / "negative_emotion.txt").write_text(header + "\n".join(sorted(words)) + "\n", encoding="utf-8")
    print(f"wrote {len(words)} words")


if __name__ == "__main__":
    main()
