"""Evidence for Phase 1 step 4: does scoring long text in pieces fix the length bias? (new DECISIONS entry)

TRAIN DATA ONLY, out-of-fold: a model never scores texts it was fitted on, same grouped folds as the rest of the project.
The test set is not touched.

Compared on synthetic long entries built by joining 2 or 4 training texts that share a label (idealised; real entries mix):
  whole      score the whole joined text as one block (what the API does today)
  chunked    split into pieces (src/chunking.py), score each, average
  reference  score each original text and average (what we do for guided answers, D-15)
and on the natural long texts that already exist in the training data (> 150 words).

Run:  python -m src.chunk_check
"""
import json

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from src.chunking import chunk_text
from src.config import REPORTS, SEED, TEXT_COL
from src.data import cv_splits, load_clean
from src.features import FeatureExtractor

C = json.loads((REPORTS / "results.json").read_text())["features_logreg"]["best_params"]["lr__C"]
SETTINGS = [(80, 120), (100, 150), (150, 200)]  # (piece size, split only above this many words)
REPEATS = 10


def mk():
    return Pipeline([("s", StandardScaler()), ("lr", LogisticRegression(C=C, max_iter=1000, random_state=SEED))])


def summarise(score, label):
    score, label = np.asarray(score), np.asarray(label)
    fp = float((score[label == 0] >= .5).mean())   # calm entries wrongly flagged higher
    tp = float((score[label == 1] >= .5).mean())   # stress entries flagged higher
    return {"auc": round(roc_auc_score(label, score), 3), "flagged_higher_label0": round(fp, 3),
            "flagged_higher_label1": round(tp, 3), "balanced_acc": round((1 - fp + tp) / 2, 3),
            "mean_score_label0": round(float(score[label == 0].mean()), 3),
            "mean_score_label1": round(float(score[label == 1].mean()), 3)}


def main():
    tr, _ = load_clean()
    fx = FeatureExtractor()
    X, y = fx.transform(tr[TEXT_COL]), tr["label"].values
    texts = tr[TEXT_COL].values
    folds = cv_splits(tr)
    rng = np.random.RandomState(SEED)
    out = {"synthetic": {}, "natural_long": {}}

    def chunked_score(model, text, target, trigger):
        pieces = chunk_text(text, target, trigger)
        return model.predict_proba(fx.transform(pieces))[:, 1].mean(), len(pieces)

    # ---------- synthetic long entries ----------
    for K in (2, 4):
        rec = {"label": [], "whole": [], "reference": [], "words": []}
        for s in SETTINGS:
            rec[s] = []
        for a, b in folds:
            model = mk().fit(X.iloc[a], y[a])
            for _ in range(REPEATS):
                for L in (0, 1):
                    idx = rng.permutation(b[y[b] == L])
                    for g in range(len(idx) // K):
                        grp = idx[g * K:(g + 1) * K]
                        joined = " ".join(texts[grp])
                        rec["label"].append(L)
                        rec["words"].append(len(joined.split()))
                        rec["whole"].append(model.predict_proba(fx.transform([joined]))[0, 1])
                        rec["reference"].append(model.predict_proba(X.iloc[grp])[:, 1].mean())
                        for s in SETTINGS:
                            rec[s].append(chunked_score(model, joined, *s)[0])
        res = {"entries": len(rec["label"]), "avg_words": round(float(np.mean(rec["words"]))),
               "whole": summarise(rec["whole"], rec["label"]),
               "reference_per_original_text": summarise(rec["reference"], rec["label"])}
        for s in SETTINGS:
            res[f"chunked_{s[0]}_trigger_{s[1]}"] = summarise(rec[s], rec["label"])
        out["synthetic"][f"{K}_texts_joined"] = res
        print(f"\n{K} texts joined: {res['entries']} entries, avg {res['avg_words']} words (training texts avg 86)")
        for k, v in res.items():
            if isinstance(v, dict):
                print(f"  {k:32}", v)

    # ---------- natural long texts already in the data (out-of-fold) ----------
    oof_whole, oof_chunk, lab, pieces_n = {}, {s: {} for s in SETTINGS}, {}, {}
    for a, b in folds:
        model = mk().fit(X.iloc[a], y[a])
        for i in b:
            if len(texts[i].split()) > 150:
                oof_whole[i] = model.predict_proba(X.iloc[[i]])[0, 1]
                lab[i] = y[i]
                for s in SETTINGS:
                    oof_chunk[s][i], pieces_n[(s, i)] = chunked_score(model, texts[i], *s)
    ids = sorted(lab)
    ys = [lab[i] for i in ids]
    print(f"\nnatural texts over 150 words: n={len(ids)} (label 1: {sum(ys)})")
    out["natural_long"]["n"] = len(ids)
    out["natural_long"]["whole"] = summarise([oof_whole[i] for i in ids], ys)
    print("  whole", out["natural_long"]["whole"])
    for s in SETTINGS:
        r = summarise([oof_chunk[s][i] for i in ids], ys)
        out["natural_long"][f"chunked_{s[0]}_trigger_{s[1]}"] = r
        print(f"  chunked {s}", r)

    # short texts must be unchanged: nothing at or under the trigger is split
    short = [t for t in texts if len(t.split()) <= 150]
    unchanged = all(chunk_text(t, 100, 150) == [t] for t in short)
    print(f"\ntexts <= 150 words left as one piece: {unchanged} (n={len(short)})")
    out["short_texts_unchanged"] = bool(unchanged)
    (REPORTS / "chunk_check.json").write_text(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
