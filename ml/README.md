# ML track: interpretable stress-signal analysis

Takes a journal text and returns (1) a 0-1 **stress-signal score**, (2) a plain-English explanation of which
linguistic features drove it, and (3) a **crisis flag** from an independent rule-based safety layer.
It never diagnoses and never gives advice. Read `REPORT.md` for results and `DECISIONS.md` for why each choice was made.

## Layout

```
ml/
  src/            config.py data.py explore.py baseline.py features.py train_models.py explain.py
                  safety.py final_eval.py metrics.py tuning.py build_nrc_lexicon.py
                  chunking.py design_checks.py chunk_check.py
  lexicons/       plain-text word lists you can edit (one word per line, # = comment)
  api/main.py     FastAPI app            ../docs/api_contract.md = the contract for the frontend
  tests/          pytest (features, safety, API)
  data/raw/       downloaded data (git-ignored)      models/   saved model      reports/   outputs
  REPORT.md  DECISIONS.md  README.md
```

## Setup (Windows PowerShell, from the `ml/` folder)

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
```

**Data (not committed):**

1. Dreaddit: download `train-00000-of-00001.parquet` and `test-00000-of-00001.parquet` from
   `https://huggingface.co/datasets/andreagasparini/dreaddit/tree/main/data` and save them as
   `data/raw/train.parquet` and `data/raw/test.parquet`.
2. NRC Emotion Lexicon (free for **non-commercial research**, must not be redistributed): download
   `https://saifmohammad.com/WebDocs/Lexicons/NRC-Emotion-Lexicon.zip`, unzip so the file
   `data/raw/nrc/NRC-Emotion-Lexicon/NRC-Emotion-Lexicon-Wordlevel-v0.92.txt` exists, then build the word list:

```powershell
.venv\Scripts\python -m src.build_nrc_lexicon     # writes lexicons/negative_emotion.txt
```

> If Windows says "An Application Control policy has blocked this file" when importing pandas or scikit-learn, that is
> an OS security policy (e.g. Smart App Control), not a bug. Ask whoever manages the machine to allow the venv path;
> do not work around it.

## Run the pipeline

Always run from `ml/` with `python -m ...` so imports resolve.

```powershell
.venv\Scripts\python -m src.explore        # Step 1: data checks -> reports/exploration.txt
.venv\Scripts\python -m src.data           # shows the cleaning + proves CV folds don't split a post
.venv\Scripts\python -m src.baseline       # Step 2: TF-IDF baseline (test metrics -> reports/results.json)
.venv\Scripts\python -m src.train_models   # Step 4: tune + evaluate both feature models, saves models/stress_model.joblib
.venv\Scripts\python -m src.explain        # Step 5: SHAP plots + 5 worked examples -> reports/
.venv\Scripts\python -m src.final_eval     # reproducibility check, bootstrap CIs, leakage assertions
.venv\Scripts\python -m src.design_checks   # threshold table + multi-answer scoring evidence (D-08, D-15)
.venv\Scripts\python -m src.chunk_check     # does scoring long text in pieces help? (D-17) -> reports/chunk_check.json
```

Feature extractor demo: `.venv\Scripts\python -m src.features`.

## Tests

```powershell
.venv\Scripts\python -m pytest tests -q
```

87 tests: feature extractor (13), safety layer (40), API (17), journaling prompts (3), chunking (14). API tests use the real saved model, so run
`src.train_models` first.

## Run the API

```powershell
.venv\Scripts\python -m uvicorn api.main:app --port 8000
```

* Docs UI: `http://localhost:8000/docs` · Health: `GET /health` · Contract: `../docs/api_contract.md`
* Example:

```powershell
curl.exe -X POST http://localhost:8000/analyze -H "Content-Type: application/json" -d "{\"text\": \"I never get anything right and I am so afraid nothing will change.\"}"
```

* Other frontend origin: set `$env:CORS_ORIGINS = "http://localhost:4200"` before starting.

## Editing the lexicons

Open any file in `lexicons/` and add or remove words, one per line. Then re-run `src.train_models` (the model must be
re-trained because feature values change) and `src.explain`. `first_person_singular.txt`, `absolutist.txt` and
`negation.txt` are committed; `negative_emotion.txt` is generated (see Setup).

## Safety layer limitations (read before relying on it)

`src/safety.py` is a **safety net, not a classifier**. It checks text against a list of regular expressions and, on a
match, returns a fixed pre-written helpline message. It is independent of the ML model on purpose.

* **It will miss things.** It only knows the phrases in its list: no euphemisms ("I just want it to stop"), slang,
  misspellings, other languages, or indirect or implied intent. Its recall has **not** been measured.
* **It will raise false alarms.** It flags "suicide" in any context (news, a story, another person's threat) and has no
  understanding of negation ("I would never kill myself" still flags). This is a deliberate bias toward over-flagging.
* **Deliberate gaps:** "kill me" without "myself" and "going to die" do not flag, because they are overwhelmingly everyday
  idiom or fear (see DECISIONS D-11).
* **It is not a risk assessment.** A flag does not mean a person is in danger; no flag does not mean they are safe.
* **Helpline numbers must be verified and localised** before any real use (`CRISIS_MESSAGE` in `src/safety.py`).
* Product use should add human escalation paths; this code alone is not sufficient.

## Licences and data notes

* Dreaddit: Turcan & McKeown (2019). Check the original repository for terms before redistributing.
* NRC Emotion Lexicon: Mohammad & Turney (2013). Non-commercial research use only; do not redistribute; commercial use
  needs a licence from its authors. The derived `negative_emotion.txt` is therefore git-ignored.
