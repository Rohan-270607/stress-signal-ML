"""Step 8 support: reproduce the headline test numbers from scratch, add context, and run leakage assertions.

Everything here is ANALYSIS of already-chosen models on the held-out test set. Nothing is tuned or selected here.
Run:  python -m src.final_eval
"""
import json

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

from src.config import LABEL_COL, RAW, REPORTS, SEED, TEXT_COL
from src.data import _norm, load_clean
from src.features import FeatureExtractor
from src.metrics import evaluate


def main():
    saved = json.loads((REPORTS / "results.json").read_text())
    tr, te = load_clean()
    ytr, yte = tr[LABEL_COL].values, te[LABEL_COL].values

    # ---------- leakage / integrity assertions ----------
    raw_te = pd.read_parquet(RAW / "test.parquet")
    assert len(te) == len(raw_te) and (te[TEXT_COL].values == raw_te[TEXT_COL].values).all(), "test set was modified"
    assert not (set(map(_norm, tr[TEXT_COL])) & set(map(_norm, te[TEXT_COL]))), "text overlap train/test"
    assert not (set(tr.post_id) & set(te.post_id)), "post_id overlap train/test"
    assert tr[TEXT_COL].map(_norm).is_unique, "duplicate texts left in train"
    print("integrity OK: test untouched; 0 text overlap; 0 post_id overlap; 0 duplicates in train")

    # ---------- refit chosen configs on TRAIN and check we reproduce the saved test metrics ----------
    fx = FeatureExtractor()
    Xtr, Xte = fx.transform(tr[TEXT_COL]), fx.transform(te[TEXT_COL])
    base = Pipeline([("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=3, sublinear_tf=True)),
                     ("lr", LogisticRegression(max_iter=2000, random_state=SEED, C=saved["tfidf_logreg_baseline"]["best_params"]["lr__C"]))])
    base.fit(tr[TEXT_COL], ytr)
    lr = Pipeline([("scale", StandardScaler()),
                   ("lr", LogisticRegression(max_iter=1000, random_state=SEED, C=saved["features_logreg"]["best_params"]["lr__C"]))]).fit(Xtr, ytr)
    xgb = XGBClassifier(subsample=0.8, eval_metric="logloss", random_state=SEED, n_jobs=1,
                        **saved["features_xgboost"]["best_params"]).fit(Xtr, ytr)
    preds = {
        "tfidf_logreg_baseline": base.predict_proba(te[TEXT_COL])[:, 1],
        "features_logreg": lr.predict_proba(Xte)[:, 1],
        "features_xgboost": xgb.predict_proba(Xte)[:, 1],
    }
    for k, p in preds.items():
        r = evaluate(k, yte, (p >= 0.5).astype(int), p)
        assert r["f1"] == saved[k]["f1"] and r["confusion_matrix"] == saved[k]["confusion_matrix"], f"{k} did not reproduce"
    print("reproducibility OK: refit from saved params reproduces results.json exactly")

    out = {}
    # ---------- trivial reference: predict 'higher signal' for everything ----------
    allpos = np.ones_like(yte)
    out["all_positive_reference_f1"] = round(f1_score(yte, allpos), 4)
    print("reference: always predicting 'higher_signal' gives F1 =", out["all_positive_reference_f1"])

    # ---------- bootstrap CIs on test (resample test rows, 2000x) ----------
    rng = np.random.RandomState(SEED)
    B = 2000
    idx = [rng.randint(0, len(yte), len(yte)) for _ in range(B)]
    hard = {k: (p >= 0.5).astype(int) for k, p in preds.items()}
    f1s = {k: np.array([f1_score(yte[i], h[i]) for i in idx]) for k, h in hard.items()}
    ci = lambda a: [round(float(np.percentile(a, 2.5)), 3), round(float(np.percentile(a, 97.5)), 3)]  # noqa: E731
    out["f1_ci95"] = {k: ci(v) for k, v in f1s.items()}
    out["f1_diff_baseline_minus_features_logreg_ci95"] = ci(f1s["tfidf_logreg_baseline"] - f1s["features_logreg"])
    out["f1_diff_features_logreg_minus_xgboost_ci95"] = ci(f1s["features_logreg"] - f1s["features_xgboost"])
    print("F1 95% bootstrap CI:", out["f1_ci95"])
    print("baseline - features_logreg F1 diff CI:", out["f1_diff_baseline_minus_features_logreg_ci95"])
    print("features_logreg - xgboost F1 diff CI:", out["f1_diff_features_logreg_minus_xgboost_ci95"])

    # ---------- performance by text length (chosen model vs baseline) ----------
    wc = Xte["word_count"].values
    bins = [(0, 50), (50, 80), (80, 110), (110, 1000)]
    rows = []
    for lo, hi in bins:
        m = (wc >= lo) & (wc < hi)
        rows.append({"words": f"{lo}-{hi if hi < 1000 else '+'}", "n": int(m.sum()),
                     "f1_baseline": round(f1_score(yte[m], hard["tfidf_logreg_baseline"][m]), 3),
                     "f1_features_logreg": round(f1_score(yte[m], hard["features_logreg"][m]), 3),
                     "share_predicted_higher_features_logreg": round(float(hard["features_logreg"][m].mean()), 3)})
    out["by_length"] = rows
    print(pd.DataFrame(rows).to_string(index=False))

    # ---------- per-subreddit F1 for chosen model (where is it weak?) ----------
    sub = []
    for s, g in te.groupby("subreddit"):
        if len(g) >= 20:
            ii = g.index.values
            sub.append({"subreddit": s, "n": len(g), "stress_share": round(float(yte[ii].mean()), 2),
                        "f1_features_logreg": round(f1_score(yte[ii], hard["features_logreg"][ii]), 3),
                        "f1_baseline": round(f1_score(yte[ii], hard["tfidf_logreg_baseline"][ii]), 3)})
    out["by_subreddit"] = sub
    print(pd.DataFrame(sub).to_string(index=False))

    # ---------- do the hypothesised features actually differ between classes? (train means) ----------
    (REPORTS / "final_eval.json").write_text(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
