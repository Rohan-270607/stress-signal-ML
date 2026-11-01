"""Shared hyper-parameter search so the baseline and the interpretable models are tuned the SAME way.

Selection criterion = CV log loss (a proper scoring rule: rewards well-calibrated probabilities, which the
API's 0-1 "score" needs). F1 was tried first and rejected: it rewards predicting the majority-positive class
(see DECISIONS.md D-06). F1/AUC are still recorded for information. Everything here sees TRAIN data only.
"""
from sklearn.model_selection import GridSearchCV


def tune(estimator, grid, X, y, folds):
    gs = GridSearchCV(
        estimator, grid, cv=folds, n_jobs=1,
        scoring={"logloss": "neg_log_loss", "f1": "f1", "auc": "roc_auc"}, refit="logloss",
    ).fit(X, y)
    i = gs.best_index_
    gs.cv_summary_ = {
        "cv_logloss_train": round(float(-gs.cv_results_["mean_test_logloss"][i]), 4),
        "cv_f1_train": round(float(gs.cv_results_["mean_test_f1"][i]), 4),
        "cv_auc_train": round(float(gs.cv_results_["mean_test_auc"][i]), 4),
    }
    return gs
