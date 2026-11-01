"""Step 1: look at the data BEFORE modelling. Prints a report and saves it to reports/exploration.txt.

Run:  python -m src.explore
"""
import io
import re
from contextlib import redirect_stdout

import pandas as pd

from src.config import LABEL_COL, RAW, REPORTS, SEED, TEXT_COL


def norm(t: str) -> str:
    """Normalise for duplicate detection: lowercase, collapse whitespace/punctuation."""
    return re.sub(r"[\W_]+", " ", t.lower()).strip()


def load_raw():
    return pd.read_parquet(RAW / "train.parquet"), pd.read_parquet(RAW / "test.parquet")


def report() -> None:
    tr, te = load_raw()
    print("== COLUMNS ==")
    print(f"train {tr.shape}, test {te.shape}")
    keep = ["subreddit", "post_id", "sentence_range", "text", "id", "label", "confidence"]
    print("columns used / inspected:", keep)
    print(f"(+ {tr.shape[1] - len(keep)} pre-computed columns incl. LIWC/DAL. NOT used: LIWC is licensed and "
          "we build our own features.)")
    print("\nlabel: 1 = annotators judged the text as expressing stress, 0 = not (majority vote of 5 crowd workers)")
    print("confidence: fraction of annotators who agreed with that label (0.6 = 3 of 5 ... 1.0 = unanimous)")

    print("\n== CLASS BALANCE ==")
    for n, d in [("train", tr), ("test", te)]:
        vc = d[LABEL_COL].value_counts().sort_index()
        print(n, dict(vc), f"-> stress share {d[LABEL_COL].mean():.3f}")
    print("\nlabel confidence (train):")
    print(tr["confidence"].describe().round(3).to_string())
    print("share of rows with confidence < 0.7 (labeling-noise proxy): "
          f"{(tr['confidence'] < 0.7).mean():.3f}")

    print("\n== TEXT LENGTH (words) ==")
    for n, d in [("train", tr), ("test", te)]:
        wc = d[TEXT_COL].str.split().str.len()
        print(n, wc.describe().round(1).to_dict())
    wc = tr[TEXT_COL].str.split().str.len()
    print("mean words by label:", wc.groupby(tr[LABEL_COL]).mean().round(1).to_dict())
    print("subreddits (train):", dict(tr["subreddit"].value_counts()))

    print("\n== DUPLICATES / LEAKAGE ==")
    for d in (tr, te):
        d["_n"] = d[TEXT_COL].map(norm)
    print("exact-text duplicates within train:", int(tr[TEXT_COL].duplicated().sum()))
    print("normalised-text duplicates within train:", int(tr["_n"].duplicated().sum()))
    print("normalised-text duplicates within test:", int(te["_n"].duplicated().sum()))
    ov = set(tr["_n"]) & set(te["_n"])
    print("normalised texts appearing in BOTH train and test:", len(ov))
    pid = set(tr["post_id"]) & set(te["post_id"])
    print("post_ids appearing in BOTH train and test:", len(pid),
          "(a post_id is one Reddit post; rows are text segments cut from it)")
    print("unique post_ids: train", tr["post_id"].nunique(), "test", te["post_id"].nunique())
    # Do duplicated texts carry conflicting labels? (labeling noise)
    g = tr.groupby("_n")[LABEL_COL].nunique()
    print("duplicate train texts with CONFLICTING labels:", int((g > 1).sum()))
    # Test rows whose text is contained in a train row (segment overlap), cheap substring check
    train_blob = list(tr["_n"])
    contained = sum(any(t in s for s in train_blob) for t in te["_n"] if len(t) > 50)
    print("test segments (>50 chars) that are substrings of a train segment:", contained)

    print("\n== 5 RANDOM POSTS PER CLASS (train) ==")
    for lab, name in [(1, "STRESS (1)"), (0, "NOT STRESS (0)")]:
        print(f"\n--- {name} ---")
        for _, r in tr[tr[LABEL_COL] == lab].sample(5, random_state=SEED).iterrows():
            t = r[TEXT_COL].replace("\n", " ")
            print(f"[{r['subreddit']}, conf={r['confidence']:.2f}] {t[:400]}{'...' if len(t) > 400 else ''}\n")


if __name__ == "__main__":
    buf = io.StringIO()
    with redirect_stdout(buf):
        report()
    out = buf.getvalue()
    REPORTS.mkdir(exist_ok=True)
    (REPORTS / "exploration.txt").write_text(out, encoding="utf-8")
    print(out)
