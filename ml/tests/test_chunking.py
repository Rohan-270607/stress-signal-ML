"""Tests for splitting long texts into pieces (src/chunking.py, DECISIONS D-17)."""
import pytest

from src.chunking import chunk_text

SENTENCE = "This week I went to my lectures and finished the reading before the weekend."  # 14 words


def words(text):
    return text.split()


@pytest.mark.parametrize("n", [1, 14, 100, 149, 150])
def test_text_up_to_trigger_is_returned_unchanged(n):
    text = " ".join(["word"] * n)
    assert chunk_text(text) == [text]


def test_text_just_over_trigger_is_split():
    text = " ".join([SENTENCE] * 11)  # 154 words
    assert len(chunk_text(text)) > 1


def test_no_words_lost_or_repeated():
    text = " ".join(f"Sentence number {i} has a few more words in it." for i in range(60))
    pieces = chunk_text(text)
    assert " ".join(pieces).split() == text.split()


def test_pieces_are_not_much_longer_than_target():
    text = " ".join([SENTENCE] * 40)
    for target in (80, 100):
        pieces = chunk_text(text, target=target, trigger=150)
        assert all(len(words(p)) <= 1.5 * target for p in pieces)


def test_pieces_end_at_sentence_boundaries():
    text = " ".join([SENTENCE] * 40)
    pieces = chunk_text(text)
    assert all(p.rstrip().endswith(".") for p in pieces)


def test_short_tail_is_merged_into_previous_piece():
    # 7 sentences of 14 words fill the first piece (98 words); 2 more words would be a tiny tail
    text = " ".join([SENTENCE] * 11) + " Done now."
    pieces = chunk_text(text, target=100, trigger=150)
    assert all(len(words(p)) >= 50 for p in pieces)


def test_single_huge_sentence_is_cut_by_words():
    text = " ".join(["word"] * 430)  # no punctuation at all
    pieces = chunk_text(text, target=100, trigger=150)
    assert len(pieces) > 1
    assert all(len(words(p)) <= 150 for p in pieces)
    assert " ".join(pieces).split() == text.split()


def test_phrase_inside_a_sentence_stays_whole():
    # the safety layer is run on the full text, but a phrase should still never be cut across pieces
    text = " ".join([SENTENCE] * 12) + " Some days I want to end my life. " + " ".join([SENTENCE] * 12)
    assert any("end my life" in p for p in chunk_text(text))


def test_newlines_are_sentence_boundaries():
    text = "\n".join(["a short line of text here with seven words"] * 40)
    pieces = chunk_text(text)
    assert len(pieces) > 1 and all(p.strip() for p in pieces)


def test_empty_and_whitespace_texts_do_not_crash():
    assert chunk_text("") == [""]
    assert chunk_text("   ") == ["   "]
