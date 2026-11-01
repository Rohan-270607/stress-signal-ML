# HANDOFF: student stress-signal project (read this first)

Paste this file to your coding agent (Antigravity or any other) as the first message, or save it as `AGENTS.md` at the
repo root. It is self-contained.

## 0. HOW TO WORK (the user's standing instruction)

**One task at a time, finished and checked before the next.**
1. Pick ONE task from the task board (section 2). Say which one, and what "done" means for it, before starting.
2. Do it. Then run every relevant check on it: tests, a real run with shown output, a re-read of what was changed, and
   a search for anything else that references it (docs, contract, tests, README).
3. Report what was checked and the actual results, including anything that failed or could not be verified.
4. Update the task board status in this file and any affected docs (`ml/DECISIONS.md`, `ml/REPORT.md`,
   `docs/api_contract.md`).
5. Only then ask the user which task is next. **Do not start the next task, run tasks in parallel, or spawn
   sub-agents unless the user asks.**
6. Anything outward-facing or hard to undo (git push, publishing, sending messages, deleting) needs an explicit
   yes from the user first, every time.

## 1. What the project is

A system that takes a student's journal text and returns:
1. a 0-1 **stress-signal score** and a label (`higher_signal` / `lower_signal`),
2. a transparent, plain-English **explanation** of which linguistic features drove the score (SHAP on a logistic regression),
3. a **crisis flag** from an independent rule-based safety layer, with a fixed human-written helpline message.

It **never diagnoses and never gives advice**. Every response carries the disclaimer
"This is not a diagnosis or a substitute for professional care."

Repo root: `T:\project_specula` (Windows, PowerShell). Not yet a git repo.

```
docs/api_contract.md     <- the API contract (source of truth for the frontend)
ml/                      <- ML track, DONE and tested
  src/ api/ tests/ lexicons/ models/stress_model.joblib reports/
  README.md  REPORT.md  DECISIONS.md
HANDOFF.md               <- this file
```

## 2. Task board: who does what, and what is completed

Division of work (decided by the user): **project owner (the user) = ML track + safety + API + docs**;
**teammate = frontend**, starting after her exams. The user is covering for her only if they say so explicitly.

| # | Task | Owner | Status |
|---|---|---|---|
| 0 | Environment, venv, `requirements.txt`, Dreaddit + NRC downloaded | Owner | Done |
| 1 | Data exploration, leakage checks, cleaning (`explore.py`, `data.py`) | Owner | Done |
| 2 | TF-IDF + logistic regression baseline | Owner | Done (test F1 0.750) |
| 3 | Lexicon feature extractor + 13 unit tests | Owner | Done |
| 4 | Interpretable models (LR chosen over XGBoost), model saved with joblib | Owner | Done (test F1 0.730) |
| 5 | SHAP: global plots, per-text explanations, plain-English reasons, 5 worked examples | Owner | Done |
| 6 | Rule-based safety layer + 40 test cases | Owner | Done |
| 7 | FastAPI (`/analyze`, `/health`), validation, 13 tests, contract in `docs/api_contract.md` | Owner | Done |
| 8 | `REPORT.md`, `DECISIONS.md`, `ml/README.md`, self-review | Owner | Done |
| 9 | Verify absolutist word list against the paper appendix | Owner | **Partly done**; blocked on reading Table S2 (see section 7, item 1) |
| 10 | Verify and localise helpline numbers in `ml/src/safety.py` | Owner | Numbers **verified 2026-11-01**; which countries/order to show is still open |
| 11 | Decide decision threshold (0.5 now) with the team | Owner + teammate | **To do** |
| 12 | Create the GitHub repo, push, add the teammate as collaborator (section 3) | Owner | **To do** |
| 13 | Frontend (section 8) | Teammate | **Not started** (after exams) |
| 14 | Wire frontend to API and test end to end | Teammate + Owner | Not started |
| 15 | Validate on consented student journal data before any real use | Owner + teammate | Not started |
| 16 | Write the fixed list of guided journaling prompts (human-written, reviewed; see section 8a) | Owner + teammate | Not started |
| 17 | Decide how answers are scored: one combined call vs one call per answer (section 8a) | Owner + teammate | Not started |

Last verified: 66 tests pass (feature extractor 13, safety 40, API 13). Everything in rows 0-8 was actually run; the
numbers in `ml/REPORT.md` were produced by the code, not typed by hand.

## 3. GitHub repository and collaboration

**Repo URL:** https://github.com/Rohan-270607/stress-signal-ML  (owner: Rohan-270607)
Status when this file was written: the local project folder was **not yet a git repo and had not been pushed**.
Check `git status` / `git remote -v` before assuming otherwise.

First-time setup, from `T:\project_specula` (owner does this once):

```powershell
git init -b main
git add .
git status          # CHECK: no ml/.venv, no ml/data/raw, no ml/lexicons/negative_emotion.txt in the list
git commit -m "ML track: interpretable stress-signal model, safety layer, API, docs"
git remote add origin https://github.com/Rohan-270607/stress-signal-ML.git
git push -u origin main
```

Teammate: `git clone https://github.com/Rohan-270607/stress-signal-ML.git`, then follow section 3a. Suggested workflow: `main` = working ML track;
frontend work on a branch `frontend`, merged by pull request; the owner reviews anything touching `ml/` or
`docs/api_contract.md`. Any API change must update `docs/api_contract.md` in the same commit.

What is committed: all code, tests, the three plain lexicons, `ml/models/stress_model.joblib` (16 KB),
`ml/reports/*`, docs. **Not committed (git-ignored):** `.venv/`, `ml/data/raw/` (datasets), and
`ml/lexicons/negative_emotion.txt` (NRC licence: no redistribution).

### 3a. What the teammate needs to run the API locally (she does NOT need to retrain)

The API needs the committed model plus the NRC-derived word list, which must be built locally:

```powershell
cd ml
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
# download https://saifmohammad.com/WebDocs/Lexicons/NRC-Emotion-Lexicon.zip and unzip it into ml/data/raw/nrc/
# so that ml/data/raw/nrc/NRC-Emotion-Lexicon/NRC-Emotion-Lexicon-Wordlevel-v0.92.txt exists
.venv\Scripts\python -m src.build_nrc_lexicon
.venv\Scripts\python -m uvicorn api.main:app --port 8000
```

Without `negative_emotion.txt` the API fails at startup with a clear error message. The Dreaddit files are only needed
for retraining and for running the model tests that retrain (the API tests use the saved model).
Note: `tests/test_api.py` and the real-lexicon sanity test in `test_features.py` need the NRC list; the rest do not.

Key results (held-out test set, n=715): TF-IDF baseline F1 0.750 / AUC 0.821; chosen interpretable model
(7 features + logistic regression) F1 0.730 / AUC 0.765. The F1 gap is within noise (95% CI [-0.017, +0.059]).
Details in `ml/REPORT.md`; reasons for every choice in `ml/DECISIONS.md`.

## 4. How to run things (from `T:\project_specula\ml`)

```powershell
# one-time
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
# data (not committed): see ml/README.md "Setup" for the two downloads + NRC lexicon build
.venv\Scripts\python -m src.build_nrc_lexicon

# everyday
.venv\Scripts\python -m pytest tests -q                              # expect 66 passed
.venv\Scripts\python -m uvicorn api.main:app --port 8000             # API at http://localhost:8000/docs
.venv\Scripts\python -m src.train_models                             # retrain + re-save the model
.venv\Scripts\python -m src.final_eval                               # reproducibility + leakage assertions
```

Always run from `ml/` with `python -m ...`.
If Windows reports "An Application Control policy has blocked this file", that is an OS security policy. Do not work
around it; tell the user.

## 5. API contract summary (full version: `docs/api_contract.md`)

`GET /health` -> `{"status":"ok","model_loaded":true}`

`POST /analyze` with `{"text": "<1-5000 chars, not blank>"}` returns 200:

```json
{
  "stress_score": 0.98,
  "label": "higher_signal",
  "explanation": [{"feature":"first_person_rate","direction":"increases","contribution":1.42,
                   "plain_text":"Higher use of first-person singular pronouns (I, me, my) than typical increased the signal."}],
  "crisis_flag": false,
  "crisis_message": null,
  "disclaimer": "This is not a diagnosis or a substitute for professional care."
}
```

Errors: `422` (bad input, FastAPI default body) and `503` (model failed; body still has `crisis_flag`,
`crisis_message`, `disclaimer`). CORS defaults: `http://localhost:3000`, `http://localhost:5173`
(override with env `CORS_ORIGINS`).

## 6. Rules for any agent working here (non-negotiable)

1. **No diagnosis or advice language** anywhere (code, UI, docs). Use "signal". The only allowed occurrences are the
   disclaimer and statements that the system does not do these things.
2. **The disclaimer must be visible on every result.** If `crisis_flag` is true, show `crisis_message` **verbatim and
   prominently**. On a `503`, still check `crisis_flag` and show the message if present.
3. **Never generate crisis or helpline text with AI.** It is a fixed constant in `ml/src/safety.py`.
4. **Do not touch the test set or tune on it.** All tuning is grouped CV on train only. Test is used once for reporting.
   If you change data, features or models, re-run `src.final_eval` and update `ml/REPORT.md` and `ml/DECISIONS.md`.
5. **Do not commit or redistribute** `ml/lexicons/negative_emotion.txt` or `ml/data/raw/` (NRC licence forbids
   redistribution; it is git-ignored, keep it that way).
6. **Do not log or store user text.**
7. **Work step by step** (section 0): one task finished and fully checked before the next.
8. **Report honestly.** Never claim a result you did not run. Note any decision in `ml/DECISIONS.md`.
9. Treat scores as a soft signal: the model is weak by design (see REPORT limitations). Short texts (<30 words) give
   less stable scores, and text length itself nudges the score up.

## 7. Open items (only the user can resolve these; ask, don't guess)

1. Finish verifying `ml/lexicons/absolutist.txt` (task 9). PARTLY DONE: the article body (PMC6376956) confirms always,
   totally, entire, completely, nothing, definitely and excludes anything/need/needed. The full 19-word list is in
   Table S2 of the supplement, a PDF at
   `https://pmc.ncbi.nlm.nih.gov/articles/instance/6376956/bin/Table_S2_Supplemental_Material.pdf` that must be
   downloaded (needs the user's explicit OK, or the user can open it and paste the words). The remaining words are unverified.
2. Helpline numbers in `CRISIS_MESSAGE` (`ml/src/safety.py`) were verified on 2026-11-01 against official sites (US 988,
   UK Samaritans 116 123, India Tele-MANAS 14416 / 1-800-891-4416, findahelpline.com). STILL OPEN: which countries to
   show and in what order (depends on where students are). Re-check periodically.
3. Decide the decision threshold (currently 0.5, `ml/api/main.py` `THRESHOLD`; DECISIONS D-08).
4. Validate on consented student journal data before real use (trained on Reddit only).
5. `git init` the repo before sharing.

## 8. Next task (when the user says go): the frontend

Build a small web UI against `docs/api_contract.md`. Suggested scope:
- A textarea for the journal entry (max 5000 chars, show remaining count), an "Analyse" button, loading and error states.
- A result card: score as a soft gauge (never as a "diagnosis" or severity), the label in neutral wording, and the
  explanation list using the `plain_text` strings, with bars sized by `abs(contribution)` (units are log-odds, not %).
- A **crisis banner** at the top when `crisis_flag` is true, with `crisis_message` verbatim, that cannot be dismissed
  by accident.
- The disclaimer always visible; a hint for entries under ~30 words ("longer entries give steadier results").
- Handle 422 (friendly message) and 503 (show crisis message if present).
- Put the code in `T:\project_specula\frontend\`, ask the user which framework (the teammate may have a preference;
  plain HTML/JS or React + Vite are fine defaults), and call the API at `http://localhost:8000`.
- Add a short `frontend/README.md` and test against the running API with real requests, showing the output.

## 8a. Planned feature: guided journaling prompts (approved by the user)

The student is shown **fixed, human-written prompts** (e.g. "What took most of your energy this week?") and answers each
in free text. The existing model analyses the answers. **No ML change is required** and the promises stay: no
advice, no generated replies, disclaimer on every result, crisis message verbatim and fixed.

Design rules:
* Prompts are a reviewed constant list (frontend config or a small JSON file), never AI-generated. Prompts must be
  neutral and non-leading; no diagnostic or advice wording; no questions that ask about self-harm directly (the
  safety layer only watches what students choose to write).
* Run the safety check on **every** answer, and show the crisis message as soon as any answer is flagged.
* Open decision (task 17). Option A, **one combined call**: join all answers into one text and call `/analyze` once;
  steadier scores (short answers under ~30 words give unstable scores), one explanation. Option B, **one call per
  answer**: finer feedback but noisier. Recommended default: A, plus the per-answer crisis check. Whichever is chosen,
  document it in `ml/DECISIONS.md` and, if the API changes, in `docs/api_contract.md`.
* The current contract already supports A and B with no API change.
* Not in scope here: chat replies, storing entries over time, questionnaires. Those each need a separate decision
  (storage means consent and retention rules).

## 9. Where to look

| Question | File |
|---|---|
| Why was X chosen? | `ml/DECISIONS.md` (D-01 to D-14) |
| How good is it, limits, ethics | `ml/REPORT.md` |
| How to run / edit lexicons / safety limits | `ml/README.md` |
| API shapes | `docs/api_contract.md` |
| Feature extractor / lexicons | `ml/src/features.py`, `ml/lexicons/*.txt` |
| Explanation wording | `ml/src/explain.py` (`DESCRIBE`, `plain_text`) |
| Safety rules | `ml/src/safety.py`, `ml/tests/test_safety.py` |
