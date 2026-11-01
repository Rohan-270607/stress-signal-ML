"""Step 2: TF-IDF + logistic regression baseline. This is the number the interpretable models must be judged against.

Run:  python -m src.baseline
"""
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from src.config import LABEL_COL, SEED, TEXT_COL
from src.data import cv_splits, load_clean
from src.metrics import evaluate, save_result, show
from src.tuning import tune


def main():
    tr, te = load_clean(verbose=True)
    pipe = Pipeline([
        # unigrams+bigrams, drop very rare terms; vectoriser is fit inside each CV fold so no vocabulary leakage
        ("tfidf", TfidfVectorizer(lowercase=True, ngram_range=(1, 2), min_df=3, sublinear_tf=True)),
        ("lr", LogisticRegression(max_iter=2000, random_state=SEED)),
    ])
    # Tune ONLY the regularisation strength, using grouped CV on TRAIN. Test is not touched here.
    gs = tune(pipe, {"lr__C": [0.1, 0.3, 1, 3, 10, 30, 100]}, tr[TEXT_COL], tr[LABEL_COL], cv_splits(tr))
    print("best params:", gs.best_params_, "| CV summary (train only):", gs.cv_summary_)

    # ---- single, final look at the TEST set ----
    pred = gs.predict(te[TEXT_COL])
    score = gs.predict_proba(te[TEXT_COL])[:, 1]
    r = evaluate("tfidf_logreg_baseline", te[LABEL_COL], pred, score)
    r.update(gs.cv_summary_)
    r["best_params"] = gs.best_params_
    show(r)
    save_result(r)


if __name__ == "__main__":
    main()
