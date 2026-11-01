"""Evaluation helper shared by every model so all numbers are computed identically."""
import json

from sklearn.metrics import confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score

from src.config import REPORTS


def evaluate(name, y_true, y_pred, y_score=None) -> dict:
    """Metrics for the positive class (1 = higher stress signal). Call ONLY with test-set data for final numbers."""
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
    out = {
        "model": name,
        "precision": round(precision_score(y_true, y_pred), 4),
        "recall": round(recall_score(y_true, y_pred), 4),
        "f1": round(f1_score(y_true, y_pred), 4),
        "roc_auc": round(roc_auc_score(y_true, y_score), 4) if y_score is not None else None,
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "n_test": int(len(y_true)),
    }
    return out


def show(r: dict) -> None:
    c = r["confusion_matrix"]
    print(f"{r['model']}: precision={r['precision']} recall={r['recall']} F1={r['f1']} AUC={r['roc_auc']}")
    print("            pred 0   pred 1")
    print(f"  true 0   {c['tn']:6d}   {c['fp']:6d}")
    print(f"  true 1   {c['fn']:6d}   {c['tp']:6d}")


def save_result(r: dict) -> None:
    REPORTS.mkdir(exist_ok=True)
    p = REPORTS / "results.json"
    allr = json.loads(p.read_text()) if p.exists() else {}
    allr[r["model"]] = r
    p.write_text(json.dumps(allr, indent=2))
