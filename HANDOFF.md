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

Repo root: `T:\project_specula` (Windows, PowerShell). Git repo, remote `origin` = https://github.com/Rohan-270607/stress-signal-ML (section 3).

```
docs/api_contract.md     <- the API contract (source of truth for the frontend)
ml/                      <- ML track, DONE and tested
  src/ api/ tests/ lexicons/ models/stress_model.joblib reports/
  README.md  REPORT.md  DECISIONS.md
frontend/                <- React + TypeScript + Vite web UI (README inside)
HANDOFF.md               <- this file
```

## 2. Task board: who does what, and what is completed

Division of work: **project owner (the user) = ML track + safety + API + docs**; **teammate = frontend**. The remaining work
is split between the two of them in **section 11** (task ids A1-A5 and B1-B6).

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
| 9 | Verify absolutist word list against the paper appendix | Owner | Done 2026-11-01 (see section 7, item 1) |
| 10 | Verify and localise helpline numbers in `ml/src/safety.py` | Owner | Numbers **verified 2026-11-01**; which countries/order to show is still open |
| 11 | Decide decision threshold (0.5 now) with the team | Owner + teammate | Provisional: keep 0.5 (evidence in DECISIONS D-08); team to confirm |
| 12 | Push to GitHub, add the teammate as collaborator (section 3) | Owner | Pushed 2026-11-01. Frontend polish merged to `main` 2026-11-06 (Phase 0). Teammate is a collaborator (reported by the user 2026-11-06; not checked by the agent, no GitHub access) |
| 13 | Frontend (section 8) | Teammate | Done 2026-11-01 (React + TypeScript + Vite). Polished 2026-11-06: light Bone and burgundy theme, score ruler and centre-line bars, sticky crisis strip, no hard-coded helplines, every guided answer sent to the safety layer, dev-only samples, error states (see `frontend/README.md`) |
| 14 | Wire frontend to API and test end to end | Teammate + Owner | Done 2026-11-01 (wired to FastAPI `http://localhost:8000/analyze`, verified with sample prompts, crisis trigger, and guided inquiries) |
| 15 | Validate on consented student journal data before any real use | Owner + teammate | Not started |
| 16 | Write the fixed list of guided journaling prompts (human-written, reviewed; see section 8a) | Owner + teammate | **Drafted and wired, NOT reviewed.** `docs/journaling_prompts.json` is a DRAFT; a person (ideally a counsellor) must review it. The UI says "Draft prompts, pending review" until then |
| 17 | Decide how answers are scored (section 8a) | Owner + teammate | Provisional: per-answer mean implemented in the frontend (DECISIONS D-15); team to confirm |
| 18 | Roadmap: student diary, typed + photo capture (section 10) | Owner | In progress: Phases 0-2 done (typed diary built 2026-11-07, optional lock deferred by the user). Phase 3 (photo capture) next |

Last verified: 107 backend tests pass (feature extractor 13, safety 40, API 37, prompts 3, chunking 14); frontend `npm test`
(40 tests), `npm run build` and `npm run lint` clean. Everything in rows 0-8 was actually run;
the numbers in `ml/REPORT.md` were produced by the code, not typed by hand.

## 3. GitHub repository and collaboration

**Repo URL:** https://github.com/Rohan-270607/stress-signal-ML  (owner: Rohan-270607)
Status: the ML track was pushed to `main` on 2026-11-01 (commit `3a4de7a`, on top of the GitHub-generated initial
commit that contains only `README.md`); the frontend followed in `6329b57`, and the frontend polish branch
`frontend-polish` was merged on 2026-11-06. The commands below are the record of how the first push was done; do not
re-run `git init`. Changes are local until committed and pushed.

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
.venv\Scripts\python -m pytest tests -q                              # expect 107 passed
.venv\Scripts\python -m uvicorn api.main:app --port 8000             # API at http://localhost:8000/docs
.venv\Scripts\python -m src.train_models                             # retrain + re-save the model
.venv\Scripts\python -m src.final_eval                               # reproducibility + leakage assertions
```

Frontend (from `T:\project_specularontend`): `npm install`, `npm run dev` (needs the API on port 8000), `npm test`
(expect 40 passed), `npm run build`, `npm run lint`. Dev-only sample buttons, including a crisis phrase, appear only under `npm run dev`.

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

`POST /safety-check` with the same request body returns only `{"crisis_flag", "crisis_message", "disclaimer"}` (no model, no 503); call it when saving text without scoring it.

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
6. **Do not log or store user text on any server.** The only storage is the diary's entries in the student's own browser (localStorage, 7 days, deletable; section 10). Never send diary text anywhere except the analysis API.
7. **Work step by step** (section 0): one task finished and fully checked before the next.
8. **Report honestly.** Never claim a result you did not run. Note any decision in `ml/DECISIONS.md`.
9. Treat scores as a soft signal: the model is weak by design (see REPORT limitations). Short texts (<30 words) give
   less stable scores, and text length itself nudges the score up.

## 7. Open items (only the user can resolve these; ask, don't guess)

1. DONE 2026-11-01: `ml/lexicons/absolutist.txt` verified against the paper's Supplemental Table S2: all 19 words match.
   The 4 extra words (forever, everybody, nobody, entirely) are the project author's own. OPEN OPTION: remove them to
   match the published list exactly (needs retrain + re-run of `final_eval` + report update).
2. Helpline numbers in `CRISIS_MESSAGE` (`ml/src/safety.py`) were verified on 2026-11-01 against official sites (US 988,
   UK Samaritans 116 123, India Tele-MANAS 14416 / 1-800-891-4416, findahelpline.com). STILL OPEN: which countries to
   show and in what order (depends on where students are). Re-check periodically.
3. Confirm the decision threshold (provisionally 0.5, `ml/api/main.py` `THRESHOLD`; evidence in DECISIONS D-08), the
   per-answer-mean scoring (D-15) and the draft prompts (D-16). Moving the threshold is a product decision about which
   error costs more.
4. Validate on consented student journal data before real use (trained on Reddit only).
5. Counsellor review of the draft prompts (`docs/journaling_prompts.json`) and of the frontend's own crisis-panel
   wording ("Support is available" and the "safety check couldn't run" line in `frontend/src`). Crisis text is meant to be
   human-written and reviewed.

## 8. The frontend (DONE: task 13; kept for reference. The next work is in section 11)

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
* Scoring (task 17, DECIDED provisionally, DECISIONS D-15): call `/analyze` **once per answer** and show the **mean**
  score; crisis flag if **any** answer is flagged. Do NOT join answers into one text: measured to flag ~99% of calm entries.
  Encourage at least ~30 words per answer. The fixed prompts are in `docs/journaling_prompts.json` (DRAFT, needs human review).
* The current contract already supports this with no API change.
* Not in scope here: chat replies, storing entries over time, questionnaires. Those each need a separate decision
  (storage means consent and retention rules). Storing entries over time is now planned as the diary (section 10).

## 9. Where to look

| Question | File |
|---|---|
| Why was X chosen? | `ml/DECISIONS.md` (D-01 to D-19) |
| How good is it, limits, ethics | `ml/REPORT.md` |
| How to run / edit lexicons / safety limits | `ml/README.md` |
| API shapes | `docs/api_contract.md` |
| Feature extractor / lexicons | `ml/src/features.py`, `ml/lexicons/*.txt` |
| Explanation wording | `ml/src/explain.py` (`DESCRIBE`, `plain_text`) |
| Safety rules | `ml/src/safety.py`, `ml/tests/test_safety.py` |

## 10. Roadmap: student diary (planned, agreed with the user 2026-11-06)

**Scope decision (user, 2026-11-06): this is a personal project. It is not being published or deployed, so there is no
ethics approval, hosting or recruitment on the roadmap. The user will handle the privacy side themselves.** If that ever
changes (other people use it, data is collected from others, it goes online), Phases 4 and 6 apply again.

Idea: students write short entries daily for up to a week (typed, or a photo of handwriting read on the device) and run
a "signal check" whenever they choose. Each entry is scored on its own and the week is averaged (D-15). Call it a
"signal check", never a "test", and never say "your stress is rising": the model is weak (F1 ~0.73, Reddit-trained,
unvalidated), so day-to-day changes are mostly noise.

Decisions made as defaults, to be confirmed by the team:
* Entries are stored **on the student's own device only** (browser storage), max 7 days, with a delete-everything button.
  This changes the "nothing is stored" wording in the UI, README and About page; update them in the same change.
* The **safety check runs every time an entry is saved**, not only when a signal check is run.
* Photos are read **on the device**; the student corrects the text; only the text is kept and the image is discarded.
  Cloud OCR would send diary photos to a third party and needs explicit consent first. Handwriting reads poorly with
  free on-device OCR; scores from OCR text are less reliable and the UI must say so.

| Phase | Work | Who |
|---|---|---|
| 0 | DONE 2026-11-06: push and merge `frontend-polish`, update this file; teammate is a collaborator | Owner |
| 1 | Backend groundwork. Step 4 chunking: DONE (D-17). Step 5 confidence weighting: DONE, no change (D-18, rule not met). Step 6 safety-at-save: DONE 2026-11-07 (`POST /safety-check`, D-19). Step 7 contract/tests/decisions (kept up to date as each step lands) | Owner |
| 2 | DONE 2026-11-07: typed diary (Diary tab): 7-day on-device storage with auto-expiry and delete-all, week bar, safety check on every save, signal check with per-day ticks, 40 frontend tests. The optional lock was skipped by the user and can be added later | Owner |
| 3 | Photo capture: reading, correction step, honest limits. NEXT, split between A2 and B1 in section 11. Approach not yet chosen: on-device in the browser, or a local Python `/ocr` endpoint (the photo never leaves the machine either way). Use a pretrained reader, not one trained from scratch; test candidates on the user's own photos first | Owner + teammate |
| 4 | SKIPPED for personal use (counsellor review, ethics approval, consent + questionnaire, recruitment). Needed again if others use it | People |
| 5 | Offline model improvements that need no new people (learning curve, confidence weighting, chunking, extra features). Validation against real students stays impossible without data | Owner |
| 6 | SKIPPED for personal use (login, hosting, privacy policy, human support path). Local only | Owner + institution |

Gates (these apply to both people): keep the safety layer, the disclaimer and the honest wording even for personal use (the app handles mental-health
text, and the model is weak). Do not claim the score is validated; there is no student data behind it. If anyone else will
use it, restore the counsellor review of prompts and crisis wording first; if data is collected from others, ethics
approval and consent come first.

## 11. Two-person work split (agreed with the user 2026-11-08)

Two people share the remaining work. **A = the project owner (the user):** ML, safety, API and docs. **B = the teammate:**
frontend. Either of you can swap a task with the other; if you do, edit the tables below in the same commit.
The standing rules (sections 0 and 6) apply to each person and to any agent they use. Section 0 means: one task at a time,
finished and checked before the next.

### Where things stand (2026-11-08)

* **Built and tested:** the ML track, the API (`/analyze`, `/safety-check`, `/health`), long-text chunking (D-17), the
  light "Bone and burgundy" frontend, guided prompts, and the 7-day typed diary (Diary tab). **107 backend tests and 40
  frontend tests pass**; the frontend builds and lints clean.
* **Not built:** photo capture; the diary lock (the user postponed it); the frontend accessibility pass.
* **Decided and recorded:** `ml/DECISIONS.md` D-01 to D-19. Not re-opened unless new evidence arrives.
* **Before starting any task, `git pull` on `main`.** The diary and Phase 1 backend work were committed locally and must be
  pushed first (task A1).

### Person A (the owner): backend, ML, docs

| # | Work | Depends on | Done when |
|---|---|---|---|
| A1 | Push the local commits to GitHub (needs an explicit yes, rule 6 in section 0) | nothing | `main` and `origin/main` match |
| A2-0 | Agree the `/ocr` contract with B **first** (about an hour): request, response, limits (image size, formats), errors. Write it in `docs/api_contract.md`. | nothing | B can build against a fake endpoint |
| A2 | **Photo reading, backend side.** (a) Collect 5-10 photos of the user's own pages with typed copies, in `ml/data/raw/ocr_samples/` (git-ignored: never commit them). (b) Compare candidate readers by character error rate on those samples: Tesseract, TrOCR (handwriting; it reads one line at a time, so a page needs line splitting) and one whole-page reader. (c) Pick one with the numbers; fine-tune it on the user's handwriting only if the best is too weak. (d) Build `POST /ocr` (photo in, text out) with tests. The photo is never stored or logged. | A2-0 | endpoint tested; measured error rates recorded in `ml/DECISIONS.md` |
| A3 | Safety layer: add indirect phrases it misses (for example "I just want it to stop"). A person reviews each phrase before it goes in, because it also raises false alarms. Add tests and update `ml/README.md`. | B5 (wording review) | tests pass; limits documented |
| A4 | Offline model improvements, each one measured on the training data first against a rule fixed before the run (as in `src/chunk_check.py` and `src/weight_check.py`): learning curve, extra word patterns, a fairer treatment of length, the 100-150 word range. The test set stays untouched. | nothing | result recorded as a new D-number, adopted or rejected |
| A5 | Keep `ml/DECISIONS.md`, `ml/REPORT.md`, `ml/README.md`, `docs/api_contract.md` and this file current. Review any change to `ml/` or the contract. | ongoing | docs match the code |

### Person B (the teammate): frontend

| # | Work | Depends on | Done when |
|---|---|---|---|
| B1 | **Photo reading, frontend side.** In the Diary: a camera/upload button; a screen that shows the extracted text for the student to **correct before saving**; a notice that text read from a photo is less reliable and so is its score; the photo is discarded after reading and never stored. Build against a fake `/ocr` until A2 is ready. | A2-0 | works against the fake and then the real endpoint; tests added |
| B2 | Optional diary lock (a PIN screen). Keep the wording honest: it hides entries from casual viewing and is not encryption. | nothing | tested |
| B3 | Accessibility pass: keyboard-only use, a screen reader, focus kept inside the About window. | nothing | issues found are fixed or listed |
| B4 | Polish: self-host the fonts (the app currently contacts Google Fonts on load), delete unused starter files (`App.css`, `assets/hero.png`, `react.svg`, `vite.svg`, `public/icons.svg`), and add one command that starts the API and the frontend together. | nothing | `npm run build` and `npm test` still pass |
| B5 | Review the 6 draft guided prompts (`docs/journaling_prompts.json`) and the crisis-panel wording ("Support is available" and the "safety check couldn't run" line in `frontend/src`). Edit them if needed. Crisis text must be human-written. | nothing | wording agreed by both; the "Draft prompts" label is removed once reviewed |
| B6 | Keep `frontend/README.md` and the frontend tests current. | ongoing | docs match the code |

### Decided together

The 0.5 threshold (D-08), the per-answer averaging (D-15), and which helplines to show and in what order (task 10).
Record each outcome in `ml/DECISIONS.md` or section 7.

### How to avoid getting in each other's way

* **Folders:** A works in `ml/` and `docs/`; B works in `frontend/`. The API contract is the one shared file: A signs off
  every change to it, and any API change updates `docs/api_contract.md` in the same commit.
* **Branches:** B works on a branch such as `frontend-photo` and opens a pull request into `main`. A reviews anything that
  touches `ml/` or the contract. A can commit straight to `main` for `ml/` and `docs/`.
* **Contract first:** A2-0 comes before A2 and B1, so B is never blocked waiting for the model.
* **Sync points:** (1) after A1 and A2-0; (2) when A2 and B1 are both ready, to join them and test with real photos;
  (3) before any change to the safety layer (A3 and B5).
* **Suggested order:** A1, A2-0, A5 and B3-B5 first, in parallel; then A2 with B1; then join and test; then A3, A4 and B2.

### Starting up (either person)

```powershell
git pull
cd ml; .venv\Scripts\python -m pytest tests -q                  # expect 107 passed
cd ..\frontend; npm install; npm test                           # expect 40 passed
```

Run the API (from `ml/`: `.venv\Scripts\python -m uvicorn api.main:app --port 8000`) and the frontend (`npm run dev`) in two
terminals. B needs the one-time setup in section 3a (virtual environment and the NRC word list) to run the API locally.

### Do not

* Commit sample photos, diary text or `ml/data/raw/`. Never send photos or diary text to a third-party service (cloud OCR
  included) without the user's explicit yes.
* Train an OCR model from scratch. Use a pretrained one; fine-tune only if the measured error is too high.
* Tune on the test set, or claim the score is validated: there is no student data behind it (section 10).
