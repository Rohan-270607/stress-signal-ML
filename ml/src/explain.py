"""Step 5: SHAP explanations turned into plain English.

SHAP in one paragraph: for one text, SHAP splits the model's output (in log-odds) into one number per feature.
Number > 0 means "this feature pushed the score UP compared with an average training text", < 0 means DOWN.
The numbers add up exactly: base_value + sum(contributions) = the model's log-odds for this text.

Run:  python -m src.explain      (makes the global plot, 5 worked examples -> reports/)
"""
import json

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
import shap  # noqa: E402

from src.chunking import chunk_text  # noqa: E402
from src.config import LABEL_COL, MODELS, REPORTS, SEED, TEXT_COL  # noqa: E402
from src.data import load_clean  # noqa: E402
from src.features import FEATURE_NAMES, FeatureExtractor  # noqa: E402

TOP_K = 4          # show at most this many reasons
MIN_ABS = 0.02     # ignore contributions smaller than this (log-odds): too small to be worth saying

# feature -> (noun phrase, adjective for HIGH values, adjective for LOW values, display multiplier, unit)
DESCRIBE = {
    "first_person_rate":     ("first-person singular pronouns (I, me, my)", "higher use of", "lower use of"),
    "absolutist_rate":       ("absolutist words (always, never, completely)", "higher use of", "lower use of"),
    "negative_emotion_rate": ("negative-emotion words", "higher use of", "lower use of"),
    "negation_rate":         ("negation words (not, no, n't)", "higher use of", "lower use of"),
    "question_rate":         ("question marks", "more", "fewer"),
    "exclamation_rate":      ("exclamation marks", "more", "fewer"),
    "word_count":            ("text length", "longer", "shorter"),  # worded specially in plain_text
}


def plain_text(feature: str, value: float, typical: float, shap_value: float) -> str:
    """One sentence, e.g. 'Higher use of absolutist words than typical increased the signal.'"""
    noun, hi, lo = DESCRIBE[feature]
    higher = value >= typical
    verb = "increased" if shap_value > 0 else "decreased"
    if feature == "word_count":
        return f"{'Longer' if higher else 'Shorter'} text than typical {verb} the signal."
    return f"{(hi if higher else lo).capitalize()} {noun} than typical {verb} the signal."


class Explainer:
    """Wraps the saved model bundle: score + SHAP + plain-English reasons for any text."""

    def __init__(self, bundle_path=MODELS / "stress_model.joblib", extractor=None):
        b = joblib.load(bundle_path)
        self.model, self.model_type = b["model"], b["model_type"]
        self.means = b["train_feature_means"]
        self.fx = extractor or FeatureExtractor()
        bg = b["background"].iloc[:100]  # SHAP uses at most 100 background rows
        if self.model_type == "logreg":
            # LinearExplainer works on what the linear model really sees: the standardised features.
            self.scaler, lr = self.model.named_steps["scale"], self.model.named_steps["lr"]
            self.sh = shap.LinearExplainer(lr, self.scaler.transform(bg))
            self._prep = lambda X: self.scaler.transform(X)
        else:
            self.sh = shap.TreeExplainer(self.model, bg)
            self._prep = lambda X: X

    def shap_values(self, X: pd.DataFrame) -> np.ndarray:
        v = self.sh.shap_values(self._prep(X))
        return v[1] if isinstance(v, list) else v

    def analyze(self, text: str, chunk: bool = True) -> dict:
        """Score one text. Texts over ~150 words are scored in pieces and averaged (DECISIONS D-17).

        With one piece (every text up to 150 words, i.e. 96% of training texts) this is exactly the plain
        whole-text score, with exact SHAP. With several pieces the score is the mean of the piece scores and the
        reasons are the mean SHAP contribution per feature: an approximation, because a mean of probabilities is not
        additive in log-odds. `word_count` is left out of the reasons then: every piece is ~100 words by construction,
        so its contribution would describe the piece size and not the entry.
        """
        pieces = chunk_text(text) if chunk else [text]
        X = self.fx.transform(pieces)
        score = float(self.model.predict_proba(X)[:, 1].mean())
        sv_all = self.shap_values(X)
        sv = sv_all.mean(axis=0)
        mean_features = X.mean(axis=0)
        items = []
        for name, val, s in zip(FEATURE_NAMES, mean_features, sv):
            if len(pieces) > 1 and name == "word_count":
                continue
            if abs(s) >= MIN_ABS:
                items.append({
                    "feature": name,
                    "direction": "increases" if s > 0 else "decreases",
                    "contribution": round(float(s), 4),
                    "plain_text": plain_text(name, float(val), self.means[name], float(s)),
                })
        items.sort(key=lambda d: -abs(d["contribution"]))
        return {"stress_score": score, "explanation": items[:TOP_K], "features": mean_features.to_dict(),
                "base_value": float(np.ravel(self.sh.expected_value)[0]), "all_shap": sv.tolist(),
                "pieces": len(pieces)}


def global_plots(ex: Explainer, Xte: pd.DataFrame) -> None:
    sv = ex.shap_values(Xte)
    imp = pd.Series(np.abs(sv).mean(0), index=FEATURE_NAMES).sort_values()
    fig, ax = plt.subplots(figsize=(7, 4))
    ax.barh(imp.index, imp.values, color="#3b6ea5")
    ax.set_xlabel("mean |SHAP value| (log-odds) on held-out test texts")
    ax.set_title("Global feature importance")
    fig.tight_layout()
    fig.savefig(REPORTS / "shap_global_importance.png", dpi=150)
    plt.close(fig)
    shap.summary_plot(sv, Xte, feature_names=FEATURE_NAMES, show=False)
    plt.tight_layout()
    plt.savefig(REPORTS / "shap_beeswarm.png", dpi=150)
    plt.close()
    print("global importance (mean |SHAP|):")
    print(imp.sort_values(ascending=False).round(4).to_string())


def worked_examples(ex: Explainer, te: pd.DataFrame, Xte: pd.DataFrame) -> list:
    """5 deterministic examples from TEST: 2 true positives, 2 true negatives, 1 error (shown on purpose)."""
    p = ex.model.predict_proba(Xte)[:, 1]
    pred = (p >= 0.5).astype(int)
    y = te[LABEL_COL].values
    rng = np.random.RandomState(SEED)
    pick = lambda mask, k: list(rng.choice(np.where(mask)[0], k, replace=False))  # noqa: E731
    idx = pick((pred == 1) & (y == 1), 2) + pick((pred == 0) & (y == 0), 2) + pick(pred != y, 1)
    out = []
    for i in idx:
        r = ex.analyze(te[TEXT_COL].iloc[i], chunk=False)  # the report shows the model as evaluated: whole texts
        out.append({"test_row": int(i), "text": te[TEXT_COL].iloc[i], "annotator_label": int(y[i]),
                    "stress_score": round(r["stress_score"], 3), "predicted": int(pred[i]),
                    "explanation": r["explanation"], "features": {k: round(v, 4) for k, v in r["features"].items()}})
    return out


def main():
    REPORTS.mkdir(exist_ok=True)
    _, te = load_clean()
    ex = Explainer()
    Xte = ex.fx.transform(te[TEXT_COL])
    global_plots(ex, Xte)

    # additivity check: base + sum(SHAP) must equal the model's log-odds
    sv = ex.shap_values(Xte)
    p = ex.model.predict_proba(Xte)[:, 1]
    logit = np.log(p / (1 - p))
    err = np.abs(np.ravel(ex.sh.expected_value)[0] + sv.sum(1) - logit).max()
    print(f"\nadditivity check, max |base + sum(SHAP) - logit(p)| = {err:.2e}")

    exs = worked_examples(ex, te, Xte)
    (REPORTS / "worked_examples.json").write_text(json.dumps(exs, indent=2))
    md = ["# Worked examples (held-out test set)\n",
          "Scores are the model's 0-1 stress-signal score; 'annotator label' is the Dreaddit crowd label (1 = stress). "
          "The last example is a deliberate model error.\n"]
    for k, e in enumerate(exs, 1):
        txt = e["text"].replace("\n", " ")
        md.append(f"## Example {k}\n> {txt[:600]}{'...' if len(txt) > 600 else ''}\n")
        md.append(f"- **score:** {e['stress_score']}  |  **model label:** {'higher_signal' if e['predicted'] else 'lower_signal'}"
                  f"  |  **annotator label:** {e['annotator_label']}")
        for r in e["explanation"]:
            md.append(f"- {r['plain_text']} ({r['contribution']:+.2f} log-odds)")
        md.append("")
    (REPORTS / "worked_examples.md").write_text("\n".join(md), encoding="utf-8")
    print("\n" + "\n".join(md))


if __name__ == "__main__":
    main()
