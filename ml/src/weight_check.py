"""Evidence for Phase 1 step 5: does using annotator agreement ("confidence") when fitting help? (new DECISIONS entry)

TRAIN DATA ONLY, out-of-fold: a model never scores texts it was fitted on. The test set is not touched.
Every variant is judged on ALL validation rows (what the app will really meet), never only on the clear ones.
The same C as the chosen model is used for every variant.

Variants (how the training rows are used when fitting):
  base          every row counts the same (the model we ship)
  weight_conf   each row weighted by its confidence (0.43 to 1.0)
  weight_conf3  weighted by confidence cubed (a stronger preference for clear rows)
  drop_lt_0.6   rows with confidence < 0.6 are left out of fitting
  drop_lt_0.7   rows with confidence < 0.7 are left out of fitting (about a third of the data)

DECISION RULE, fixed before running: adopt a variant only if its mean out-of-fold log loss on all validation rows beats
`base` by at least 0.005 AND it is better in at least 4 of the 5 repeated CV runs AND its AUC is not worse on average.
Otherwise keep `base`. (Log loss is the project's tuning criterion, see DECISIONS D-06.)

Run:  python -m src.weight_check
"""
import json

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, log_loss, roc_auc_score
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from src.config import REPORTS, SEED, TEXT_COL
from src.data import load_clean
from src.features import FeatureExtractor

C = json.loads((REPORTS / "results.json").read_text())["features_logreg"]["best_params"]["lr__C"]
REPEATS = 5
MIN_GAIN, MIN_WINS = 0.005, 4

VARIANTS = {
    "base": lambda conf: (np.ones_like(conf), np.ones_like(conf, dtype=bool)),
    "weight_conf": lambda conf: (conf, np.ones_like(conf, dtype=bool)),
    "weight_conf3": lambda conf: (conf ** 3, np.ones_like(conf, dtype=bool)),
    "drop_lt_0.6": lambda conf: (np.ones_like(conf), conf >= 0.6),
    "drop_lt_0.7": lambda conf: (np.ones_like(conf), conf >= 0.7),
}


def main():
    tr, _ = load_clean(verbose=False)
    X = FeatureExtractor().transform(tr[TEXT_COL])
    y, conf = tr["label"].values, tr["confidence"].values
    clear = conf >= 0.8
    per_run = {name: [] for name in VARIANTS}

    for r in range(REPEATS):  # repeat 0 uses the project's own folds
        folds = list(StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=SEED + r)
                     .split(X, y, groups=tr["post_id"]))
        for name, make in VARIANTS.items():
            oof = np.zeros(len(y))
            for a, b in folds:
                w, keep = make(conf[a])
                model = Pipeline([("s", StandardScaler()),
                                  ("lr", LogisticRegression(C=C, max_iter=1000, random_state=SEED))])
                model.fit(X.iloc[a][keep], y[a][keep], lr__sample_weight=w[keep])
                oof[b] = model.predict_proba(X.iloc[b])[:, 1]
            per_run[name].append({
                "logloss": log_loss(y, oof), "auc": roc_auc_score(y, oof),
                "f1": f1_score(y, oof >= .5), "logloss_clear_rows": log_loss(y[clear], oof[clear]),
            })

    base_ll = np.array([m["logloss"] for m in per_run["base"]])
    base_auc = np.array([m["auc"] for m in per_run["base"]])
    summary = {}
    print(f"out-of-fold, {REPEATS} repeated grouped 5-fold runs, C={C}, all validation rows (n={len(y)})\n")
    print(f"{'variant':14}{'log loss':>10}{'gain':>9}{'wins':>6}{'AUC':>8}{'F1':>8}{'ll (clear rows)':>17}{'fit rows':>10}")
    for name, runs in per_run.items():
        ll = np.array([m["logloss"] for m in runs])
        auc = np.array([m["auc"] for m in runs])
        gain = float((base_ll - ll).mean())
        wins = int((ll < base_ll).sum())
        rows = int(VARIANTS[name](conf)[1].sum())
        adopt = name != "base" and gain >= MIN_GAIN and wins >= MIN_WINS and auc.mean() >= base_auc.mean()
        summary[name] = {"logloss": round(float(ll.mean()), 4), "gain_vs_base": round(gain, 4), "runs_better_than_base": wins,
                         "auc": round(float(auc.mean()), 4), "f1": round(float(np.mean([m["f1"] for m in runs])), 4),
                         "logloss_clear_rows": round(float(np.mean([m["logloss_clear_rows"] for m in runs])), 4),
                         "fit_rows": rows, "meets_rule": bool(adopt)}
        s = summary[name]
        print(f"{name:14}{s['logloss']:>10.4f}{gain:>+9.4f}{wins:>4}/{REPEATS}{s['auc']:>8.4f}{s['f1']:>8.4f}"
              f"{s['logloss_clear_rows']:>17.4f}{rows:>10}   {'MEETS RULE' if adopt else ''}")
    out = {"rule": f"gain >= {MIN_GAIN}, better in >= {MIN_WINS}/{REPEATS} runs, AUC not worse",
           "repeats": REPEATS, "C": C, "variants": summary}
    (REPORTS / "weight_check.json").write_text(json.dumps(out, indent=2))
    print("\nvariants meeting the rule:", [k for k, v in summary.items() if v["meets_rule"]] or "none")


if __name__ == "__main__":
    main()
