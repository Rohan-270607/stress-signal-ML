"""Single source of truth for loading Dreaddit with leakage handling applied.

Policy (also recorded in DECISIONS.md):
  1. TEST SET IS NEVER MODIFIED. It is the official Dreaddit test split, so numbers stay
     comparable with the literature and we cannot be accused of editing the exam.
  2. Train rows whose normalised text also appears in test are DROPPED from train (leakage).
  3. Duplicate texts inside train: if their labels conflict, drop ALL copies (the label is
     unreliable); otherwise keep one copy.
  4. Cross-validation inside train must group by post_id (several rows are segments of the
     same Reddit post) - see `cv_splits`.
"""
import re

import pandas as pd
from sklearn.model_selection import StratifiedGroupKFold

from src.config import LABEL_COL, RAW, SEED, TEXT_COL


def _norm(t: str) -> str:
    return re.sub(r"[\W_]+", " ", t.lower()).strip()


def load_clean(verbose: bool = False):
    tr = pd.read_parquet(RAW / "train.parquet")[["post_id", "subreddit", "text", "label", "confidence"]]
    te = pd.read_parquet(RAW / "test.parquet")[["post_id", "subreddit", "text", "label", "confidence"]]
    tr, te = tr.copy(), te.copy()
    tr["_n"], te["_n"] = tr[TEXT_COL].map(_norm), te[TEXT_COL].map(_norm)
    n0 = len(tr)

    # (2) train/test overlap
    leak = tr["_n"].isin(set(te["_n"]))
    tr = tr[~leak]
    # (3) within-train duplicates
    nlab = tr.groupby("_n")[LABEL_COL].transform("nunique")
    conflict = nlab > 1
    tr = tr[~conflict]
    dup = tr["_n"].duplicated(keep="first")
    tr = tr[~dup]
    if verbose:
        print(f"train rows: {n0} -> {len(tr)}  (dropped: {int(leak.sum())} test-overlap, "
              f"{int(conflict.sum())} conflicting-label duplicates, {int(dup.sum())} redundant copies)")
        print(f"test rows: {len(te)} (untouched)")
    tr = tr.drop(columns="_n").reset_index(drop=True)
    te = te.drop(columns="_n").reset_index(drop=True)
    return tr, te


def cv_splits(train: pd.DataFrame, n_splits: int = 5):
    """Stratified CV that keeps all segments of one post in the same fold (no within-train leakage)."""
    sgk = StratifiedGroupKFold(n_splits=n_splits, shuffle=True, random_state=SEED)
    return list(sgk.split(train[TEXT_COL], train[LABEL_COL], groups=train["post_id"]))


if __name__ == "__main__":
    tr, te = load_clean(verbose=True)
    print("train label mean", round(tr[LABEL_COL].mean(), 3), "| test label mean", round(te[LABEL_COL].mean(), 3))
    print("post_id overlap train/test:", len(set(tr.post_id) & set(te.post_id)))
    folds = cv_splits(tr)
    for i, (a, b) in enumerate(folds):
        assert not (set(tr.post_id.iloc[a]) & set(tr.post_id.iloc[b])), "post leaked across CV folds"
    print("CV folds ok: no post_id shared between train/validation parts in any of", len(folds), "folds")
