"""Shared paths and constants. One place so every script agrees on them."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]      # .../ml
RAW = ROOT / "data" / "raw"
PROCESSED = ROOT / "data" / "processed"
LEXICONS = ROOT / "lexicons"
MODELS = ROOT / "models"
REPORTS = ROOT / "reports"

SEED = 42            # fixed so every number in REPORT.md is reproducible
LABEL_COL = "label"  # 1 = annotators judged the text as expressing stress, 0 = not
TEXT_COL = "text"
