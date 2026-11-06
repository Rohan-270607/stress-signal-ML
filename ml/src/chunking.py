"""Split a long text into pieces of roughly training-text length, so each piece can be scored on its own.

Why: the model's features are per-word rates learned from texts of ~86 words (max ~310). Scoring a much longer text as one
block pushes the score up (measured: DECISIONS D-15). Scoring pieces and averaging avoids that.

Pieces end at sentence boundaries where possible, so a phrase the safety layer looks for is not cut in half. (The safety
check is still run on the FULL text, never on pieces.)
"""
import re

_SENTENCE_END = re.compile(r"(?<=[.!?])\s+|\n+")


def chunk_text(text: str, target: int = 100, trigger: int = 150, min_tail: float = 0.5) -> list:
    """Return [text] unchanged if it has <= `trigger` words, else pieces of about `target` words.

    A sentence longer than `target` is cut by words. A last piece shorter than `min_tail * target` words is merged into
    the one before it, so no piece is too short to score steadily.
    """
    words_total = len(text.split())
    if words_total <= trigger:
        return [text]

    pieces, current, current_words = [], [], 0
    for sentence in (s for s in _SENTENCE_END.split(text.strip()) if s.strip()):
        words = sentence.split()
        if len(words) > target:  # one huge sentence: flush, then cut it by words
            if current:
                pieces.append(" ".join(current))
                current, current_words = [], 0
            pieces += [" ".join(words[i:i + target]) for i in range(0, len(words), target)]
            continue
        if current and current_words + len(words) > target:
            pieces.append(" ".join(current))
            current, current_words = [], 0
        current.append(sentence.strip())
        current_words += len(words)
    if current:
        pieces.append(" ".join(current))

    if len(pieces) > 1 and len(pieces[-1].split()) < min_tail * target:
        pieces[-2] = pieces[-2] + " " + pieces[-1]
        pieces.pop()
    return pieces
