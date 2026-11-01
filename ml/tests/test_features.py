"""Unit tests for the feature extractor. Uses tiny temporary lexicons so results are checkable by hand."""
import pytest

from src.features import FEATURE_NAMES, FeatureExtractor, tokenize


@pytest.fixture()
def fx(tmp_path):
    (tmp_path / "first_person_singular.txt").write_text("# c\ni\nme\nmy\nmine\nmyself\ni'm\n")
    (tmp_path / "absolutist.txt").write_text("always\nnever\nnothing\n")
    (tmp_path / "negative_emotion.txt").write_text("sad\nafraid\nfailing\n")
    (tmp_path / "negation.txt").write_text("not\nno\nnever\nnothing\n")
    return FeatureExtractor(tmp_path)


def test_tokenize_keeps_contractions_and_lowercases():
    assert tokenize("I'm NOT happy!") == ["i'm", "not", "happy"]


def test_tokenize_repairs_broken_apostrophe():
    # Dreaddit contains "doesn�t"
    assert tokenize("he doesn�t care") == ["he", "doesn't", "care"]


def test_first_person_rate(fx):
    # 6 words, 3 first-person (I, my, me)
    f = fx.extract("I love my dog and me")
    assert f["first_person_rate"] == pytest.approx(3 / 6)
    assert f["word_count"] == 6


def test_first_person_does_not_match_other_pronouns(fx):
    assert fx.extract("you and they and she")["first_person_rate"] == 0


def test_absolutist_rate(fx):
    f = fx.extract("I always lose and never win, nothing works")  # 8 words, 3 absolutist
    assert f["absolutist_rate"] == pytest.approx(3 / 8)


def test_negative_emotion_rate(fx):
    f = fx.extract("sad and afraid today")
    assert f["negative_emotion_rate"] == pytest.approx(2 / 4)


def test_negation_includes_nt_contractions(fx):
    f = fx.extract("I don't know and can't say, not sure")  # 8 tokens: don't, can't, not
    assert f["negation_rate"] == pytest.approx(3 / 8)


def test_negation_counted_once_for_listed_nt_word(fx):
    # "can't" is both in the lexicon file AND matches the n't rule: must count once, not twice
    assert fx.extract("can't")["negation_rate"] == 1.0


def test_question_and_exclamation_rates(fx):
    f = fx.extract("Why me?! Why? Really!")  # 4 words, 2 '?', 2 '!'
    assert f["question_rate"] == pytest.approx(2 / 4)
    assert f["exclamation_rate"] == pytest.approx(2 / 4)


def test_empty_and_symbol_only_text(fx):
    for t in ["", "   ", "?!?!"]:
        f = fx.extract(t)
        assert all(v == 0.0 for v in f.values()), t


def test_normalised_by_length_not_raw_count(fx):
    short = fx.extract("I am sad")
    long = fx.extract("I am sad " + "the " * 27)  # same one 'I', one 'sad' but 10x the words
    assert long["first_person_rate"] < short["first_person_rate"]


def test_transform_shape_and_columns(fx):
    df = fx.transform(["a b c", "I me"])
    assert list(df.columns) == FEATURE_NAMES and len(df) == 2


def test_shipped_lexicons_load_and_contain_core_words():
    """Sanity check on the real files in /ml/lexicons (needs negative_emotion.txt built locally)."""
    real = FeatureExtractor()
    assert {"i", "me", "my", "mine", "myself"} <= real.first_person
    assert {"always", "never", "completely", "totally", "nothing", "everything", "entire", "constantly"} <= real.absolutist
    assert len(real.negative_emotion) > 1000
