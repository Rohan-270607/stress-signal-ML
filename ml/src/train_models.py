"""Step 4: interpretable models on the 7 hand-built linguistic features.

Protocol (decided BEFORE looking at test results):
  * all tuning = grouped 5-fold CV on TRAIN only (folds never split one Reddit post);
  * the chosen model = lowest CV log loss; if XGBoost beats logistic regression by < 0.01 log loss we keep logistic
    regression (simpler, exactly explainable) - "prefer the simpler model unless the gain is real";
  * the test set is scored exactly once per model, after selection, and never used to choose anything.

Run:  python -m src.train_models
"""
import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

from src.config import LABEL_COL, MODELS, SEED, TEXT_COL
from src.data import cv_splits, load_clean
from src.features import FEATURE_NAMES, FeatureExtractor
from src.metrics import evaluate, save_result, show
from src.tuning import tune

MARGIN = 0.01  # XGBoost must beat LR by this much CV log loss to be chosen


def main():
    tr, te = load_clean(verbose=True)
    fx = FeatureExtractor()
    Xtr, Xte = fx.transform(tr[TEXT_COL]), fx.transform(te[TEXT_COL])
    ytr, yte = tr[LABEL_COL].values, te[LABEL_COL].values
    folds = cv_splits(tr)

    print("\nfeature means by class (train):")
    print(Xtr.groupby(ytr).mean().round(4).T.to_string())

    # --- Logistic regression: standardise so coefficients are comparable across features ---
    # (scaler is inside the Pipeline, so it is re-fit on each CV training fold - no leakage)
    lr = Pipeline([("scale", StandardScaler()), ("lr", LogisticRegression(max_iter=1000, random_state=SEED))])
    lr_gs = tune(lr, {"lr__C": [0.0003, 0.001, 0.003, 0.01, 0.03, 0.1, 1, 10]}, Xtr, ytr, folds)

    # --- XGBoost: small grid, shallow trees (small data, 7 features -> deep trees would just overfit) ---
    xgb = XGBClassifier(subsample=0.8, eval_metric="logloss", random_state=SEED, n_jobs=1)
    xgb_gs = tune(xgb, {
        "max_depth": [2, 3, 4], "n_estimators": [100, 300], "learning_rate": [0.03, 0.1], "min_child_weight": [1, 5],
    }, Xtr, ytr, folds)

    print(f"\nLR  best {lr_gs.best_params_} CV(train only): {lr_gs.cv_summary_}")
    print(f"XGB best {xgb_gs.best_params_} CV(train only): {xgb_gs.cv_summary_}")
    gain = lr_gs.cv_summary_["cv_logloss_train"] - xgb_gs.cv_summary_["cv_logloss_train"]  # >0 => XGB better
    chosen = "xgboost" if gain >= MARGIN else "logreg"
    print("selection rule ->", chosen)

    results = {}
    for name, gs in [("features_logreg", lr_gs), ("features_xgboost", xgb_gs)]:
        r = evaluate(name, yte, gs.predict(Xte), gs.predict_proba(Xte)[:, 1])
        r.update(gs.cv_summary_)
        r["best_params"] = gs.best_params_
        show(r)
        save_result(r)
        results[name] = r

    # Standardised LR coefficients = the model's whole "reasoning", printed for the student to read.
    coefs = lr_gs.best_estimator_.named_steps["lr"].coef_[0]
    print("\nLR standardised coefficients (+ pushes toward higher signal):")
    for n, c in sorted(zip(FEATURE_NAMES, coefs), key=lambda x: -abs(x[1])):
        print(f"  {n:24s} {c:+.3f}")

    best = lr_gs if chosen == "logreg" else xgb_gs
    MODELS.mkdir(exist_ok=True)
    rng = np.random.RandomState(SEED)
    bg = Xtr.iloc[rng.choice(len(Xtr), 200, replace=False)]  # background sample for SHAP
    joblib.dump({
        "model": best.best_estimator_,
        "model_type": chosen,
        "feature_names": FEATURE_NAMES,
        "background": bg,
        "train_feature_means": Xtr.mean().to_dict(),
        "test_f1": results["features_logreg" if chosen == "logreg" else "features_xgboost"]["f1"],
    }, MODELS / "stress_model.joblib")
    print("\nsaved models/stress_model.joblib ->", chosen)


if __name__ == "__main__":
    main()
