"""Evidence for two open design decisions (DECISIONS D-08 threshold, D-15 multi-answer scoring).

TRAIN DATA ONLY: all predictions are out-of-fold (a model never scores texts it was fitted on), using the same grouped
CV folds as the rest of the project. The test set is not touched.

Run:  python -m src.design_checks
"""
import json

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, precision_score, recall_score, roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from src.config import REPORTS, SEED, TEXT_COL
from src.data import cv_splits, load_clean
from src.features import FeatureExtractor

C = json.loads((REPORTS / "results.json").read_text())["features_logreg"]["best_params"]["lr__C"]


def main():
    tr, _ = load_clean()
    fx = FeatureExtractor()
    X, y = fx.transform(tr[TEXT_COL]), tr["label"].values
    texts = tr[TEXT_COL].values
    folds = cv_splits(tr)
    mk = lambda: Pipeline([("s", StandardScaler()), ("lr", LogisticRegression(C=C, max_iter=1000, random_state=SEED))])  # noqa: E731

    # ---------- (a) threshold table from out-of-fold probabilities ----------
    oof = np.zeros(len(y))
    for a, b in folds:
        oof[b] = mk().fit(X.iloc[a], y[a]).predict_proba(X.iloc[b])[:, 1]
    rows = []
    for t in [0.3, 0.4, 0.45, 0.5, 0.55, 0.6, 0.7]:
        p = (oof >= t).astype(int)
        rows.append({"threshold": t, "precision": round(precision_score(y, p), 3), "recall": round(recall_score(y, p), 3),
                     "f1": round(f1_score(y, p), 3), "share_flagged_higher": round(float(p.mean()), 3)})
    print("(a) out-of-fold threshold table (train only), AUC =", round(roc_auc_score(y, oof), 3))
    for r in rows:
        print("   ", r)

    # ---------- (b) combined text vs mean of per-answer scores ----------
    # Build 'entries' of 4 answers that share a label (idealised; real entries mix) inside each validation fold.
    rng = np.random.RandomState(SEED)
    K, REPEATS = 4, 10
    res = {"combined": [], "mean_per_answer": []}
    lab, wc_comb = [], []
    for a, b in folds:
        model = mk().fit(X.iloc[a], y[a])
        for _ in range(REPEATS):
            for L in (0, 1):
                idx = rng.permutation(b[y[b] == L])
                for g in range(len(idx) // K):
                    grp = idx[g * K:(g + 1) * K]
                    comb = " ".join(texts[grp])
                    pc = model.predict_proba(fx.transform([comb]))[0, 1]
                    pm = model.predict_proba(X.iloc[grp])[:, 1].mean()
                    res["combined"].append(pc); res["mean_per_answer"].append(pm)
                    lab.append(L); wc_comb.append(len(comb.split()))
    lab = np.array(lab)
    out = {}
    print(f"\n(b) {len(lab)} simulated 4-answer entries (avg {np.mean(wc_comb):.0f} words combined; training texts avg 86)")
    for k, v in res.items():
        v = np.array(v)
        out[k] = {"auc_label1_vs_label0": round(roc_auc_score(lab, v), 3),
                  "mean_score_label0": round(float(v[lab == 0].mean()), 3),
                  "mean_score_label1": round(float(v[lab == 1].mean()), 3),
                  "share_flagged_higher_label0": round(float((v[lab == 0] >= .5).mean()), 3),
                  "share_flagged_higher_label1": round(float((v[lab == 1] >= .5).mean()), 3)}
        print("   ", k, out[k])
    (REPORTS / "design_checks.json").write_text(json.dumps({"threshold_table_oof": rows, "aggregation": out}, indent=2))


if __name__ == "__main__":
    main()
