# Decision log

Format: **Chose** / **Why** / **Alternatives**. IDs are referenced from the code and REPORT.md.

---

## D-01 Dataset and split
**Chose:** Dreaddit via the Hugging Face mirror `andreagasparini/dreaddit`, using its train (2,838) / test (715) files, which
match the paper's official split. Only `post_id, subreddit, text, label, confidence` are read.
**Why:** It is the dataset the project specified, it is public, and using the official split keeps results comparable
with other work. A fixed test split that I never modify also means I cannot quietly tilt the exam.
**Alternatives:** A random split of all rows (rejected: segments of one post could land in both sets); Kaggle copies (same
data, no benefit); building my own split (loses comparability). **Caveat:** I did not diff the mirror against the original
repository.

## D-02 Leakage handling
**Chose:** Leave the test set untouched. Remove from *train*: the 3 rows whose normalised text also appears in test, all
copies of the 3 duplicate texts with conflicting labels (8 rows), and 14 redundant exact copies (keep one).
**Why:** Editing the test set would change the benchmark; editing train fixes the leak at no cost to comparability.
Conflicting-label duplicates have an unreliable label, so keeping any copy would be arbitrary.
**Alternatives:** Drop the overlapping rows from test instead (changes the benchmark); only flag, don't remove (leaves
a known leak); keep one copy of conflicting duplicates by majority/confidence (arbitrary with n=2). "Normalised" means
lower-cased with punctuation/whitespace collapsed, so trivial formatting differences don't hide duplicates.

## D-03 Cross-validation scheme
**Chose:** 5-fold `StratifiedGroupKFold`, grouped by `post_id`, fixed seed 42.
**Why:** 2,343 posts produce 2,838 rows, so ordinary CV would put segments of one post on both sides of a fold and
overstate validation scores. Grouping removes that. Stratifying keeps the class ratio per fold.
**Alternatives:** Plain `KFold`/`StratifiedKFold` (leaky); a single validation split (noisier); repeated CV (more stable,
more compute; not needed at this scale).

## D-04 Feature design
**Chose:** 7 features: first-person singular rate, absolutist rate, negative-emotion rate, negation rate, question rate,
exclamation rate (all per word) and raw word count.
**Why:** They are the features you specified; each is a simple count a student can verify by hand, and the first three
have published links to emotional distress. Dividing by word count stops long texts from scoring high just by being long.
Word count itself is included on purpose (it was requested), and REPORT.md shows it acts partly as a proxy.
**Alternatives:** `log(word_count)` (flatter tail; I kept the raw value because texts are not heavily skewed and the
explanation is simpler); more LIWC-style categories (licensed; more features means less readable); part-of-speech or
sentence-structure features (would need spaCy/NLTK models and add opacity).

## D-05 Lexicons
**Chose:** Plain-text files in `ml/lexicons/`.
* `first_person_singular.txt`: i, me, my, mine, myself, plus contractions (i'm, i've, i'll, i'd, im, ive).
* `absolutist.txt`: the 19-word list from Al-Mosaiwi & Johnstone (2018) plus 4 additions marked as mine. **Verified 2026-11-01** against
  the paper's Supplemental Table S2 (19 words): all 19 are present, and the paper's removed words (anything/need/needed)
  are not in our list. The 4 extras (forever, everybody, nobody, entirely) are mine, not from the paper; they were kept
  because they were disclosed from the start and the brief listed absolutist words with "etc.". Dropping them to match
  the published list exactly would need a retrain and re-run (an open option). The paper also warns of false positives
  from negation ("not completely"), qualifiers ("almost completely") and salutations ("hello everyone"); our counter
  has no such protection, so `everyone` in a greeting counts.**
* `negation.txt` plus a rule that any token ending in `n't` counts.
* `negative_emotion.txt`: union of NRC EmoLex words flagged `negative`, `anger`, `fear` or `sadness` (3,722 words).
**Why for NRC:** it is free for research, widely cited, and the specified source. `negative` alone is a sentiment flag;
adding anger/fear/sadness catches distress words that are not flagged negative.
**NRC licence:** non-commercial research use only; **no redistribution**. So the derived file is generated locally by
`src/build_nrc_lexicon.py` and git-ignored. The tests that need it use tiny temporary lexicons, except one sanity test.
**Alternatives:** Bing Liu's opinion lexicon (freely redistributable, but sentiment-only); a hand-written short list
(fully editable but narrow); `negative` flag only (misses fear/sadness words).
**Tokenizer detail:** Dreaddit has encoding damage (`doesn�t`). The tokenizer repairs that to `doesn't`, otherwise
negations and contractions would be silently missed. Contractions stay one token.

## D-06 Tuning criterion: log loss (changed after a failed first attempt)
**Chose:** All hyper-parameters are chosen by lowest 5-fold grouped CV **log loss** on train, for the baseline and for both
interpretable models. F1, precision, recall and AUC are still reported, on test.
**What happened (kept for honesty):**
1. First run tuned on CV **F1**. Baseline picked C=1 (test F1 0.745). Features LR picked C=0.01 (test F1 0.730) and XGBoost
   scored 0.727.
2. The best C sat on the edge of my grid, so I widened it. F1 then selected C=0.0003, a nearly constant model that labels
   74% of test texts "higher signal" (recall 0.90, precision 0.63, test F1 0.741, AUC *fell* to 0.759). I noticed this from
   the test confusion matrix; the same collapse is visible in CV predictions.
3. Cause: F1 on the positive class rewards over-predicting a slightly-majority class, and a near-constant model gives
   probabilities useless as a 0-1 score. So F1 was the wrong *selection* criterion.
4. I switched everything to log loss (a proper scoring rule; the API returns a probability, so calibration matters) and
   re-ran the baseline too, so the comparison stays fair.
**Honesty note:** I had already seen test numbers when I made this change, so it is not a pre-registered choice. It
affects all three models equally and is justified on principle, and the final test results were not used to pick between
alternatives. The previous F1-tuned numbers are listed above so you can judge. Final numbers are in REPORT.md.
**Alternatives:** ROC-AUC (threshold-free but ignores calibration); F1 with a tuned threshold (adds a free parameter and
would need another held-out set); balanced accuracy.

## D-07 Model selection rule
**Chose:** Pick the lowest CV log loss; XGBoost must beat logistic regression by ≥ 0.01 to be chosen. Result: LR 0.5495 vs
XGB 0.5467 (gap 0.003), so logistic regression was chosen.
**Why:** The rule was written before the final run. Logistic regression is exactly explainable and standardised
coefficients can be read directly; a 0.003 gain is well inside noise. A margin stops complexity from winning by luck.
**Alternatives:** Choose by test score (not allowed: that tunes on test); choose purely on CV with no margin (would pick
XGBoost on a coin-flip difference).
**Grids:** LR `C ∈ {0.0003, 0.001, 0.003, 0.01, 0.03, 0.1, 1, 10}`; XGBoost `max_depth ∈ {2,3,4}`, `n_estimators ∈ {100,300}`,
`learning_rate ∈ {0.03, 0.1}`, `min_child_weight ∈ {1,5}`, `subsample=0.8`. Baseline `C ∈ {0.1,…,100}`. The baseline
picked C=10, the grid's second-largest value, so it is not at an edge. XGBoost's best settings sat on several edges of
its grid (depth 2, 100 trees, min_child_weight 5), so I checked with a wider grid (depth {1,2}, trees {50,100,200},
learning rate {0.05,0.1,0.2}, min_child_weight {5,10,20}), CV on train only, run once as a check and not saved: it chose
the identical configuration with the identical CV log loss (0.5467). The grid was not limiting XGBoost.

## D-08 Decision threshold
**Chose:** 0.5 on the predicted probability (`higher_signal` iff score ≥ 0.5).
**Why:** Classes are balanced (52% positive), no cost asymmetry has been agreed, and any other threshold would need
tuning on data I have not set aside. The score is returned alongside the label so the UI can show a gradient.
**Evidence (task 11, `src/design_checks.py`, out-of-fold on train only, AUC 0.793):** F1 is 0.742 at 0.5 and peaks at 0.766 at
0.4, but only by flagging 67% of texts (recall 0.87, precision 0.68), the same F1-rewards-over-flagging effect as in D-06.
At 0.5 the model flags 56% of texts when the true share is 53%, i.e. roughly balanced. Threshold 0.7 gives precision 0.81
but recall 0.46. **Provisional: keep 0.5.** Moving it is a product decision about which error costs more (a missed signal vs
a needless flag) and should be made with the team; full table in `reports/design_checks.json`.
**Alternatives:** Lower the threshold to favour recall (reasonable if missing stress is worse than false alarms; needs a
stakeholder decision and a separate validation set); Youden's J from CV predictions.

## D-09 Metrics
**Chose:** Report precision, recall, F1 (positive class = higher signal), ROC-AUC and the confusion matrix, all on test.
Add a trivial always-positive reference and bootstrap 95% intervals.
**Why:** Precision/recall/F1 were requested and F1 is the dataset's customary metric. Because F1 is flattered here (D-06),
AUC and the trivial reference give honest context. Intervals show that small differences are noise.
**Alternatives:** Accuracy (hides the error type), macro-F1 (fine on balanced data, but the positive class is the
class of interest), PR-AUC.

## D-10 Explainability method and wording
**Chose:** SHAP (`LinearExplainer` for logistic regression on the standardised features; `TreeExplainer` is supported if
XGBoost is ever chosen). 100 training rows are the background. Contributions are in log-odds. Show at most 4 reasons
with |contribution| ≥ 0.02, sorted by size. Wording: "{Higher/Lower} {feature} than typical {increased/decreased} the
signal." "Typical" means the training mean.
**Why:** SHAP was requested; for a linear model it is exact (additivity verified to 1e-15). Describing the feature
value relative to the training mean, and the effect from the SHAP sign, keeps each sentence true even for a feature
with a negative weight (e.g. "More exclamation marks than typical decreased the signal.").
**Alternatives:** Raw coefficients only (global, not per text); LIME (approximate, unstable); percent contributions (SHAP
values are in log-odds and do not add to a percentage of the probability). The cut-offs (4, 0.02) are presentation
choices, not tuned.

## D-11 Safety layer design
**Chose:** An ordered list of regexes (`src/safety.py`) on lower-cased, apostrophe-normalised text, returning a flag and one
fixed human-written message. No imports from the ML code, enforced by a test.
**Deliberate behaviours:**
* **Over-flagging is accepted.** "Suicide" in any context flags (also news, fiction, someone else's threat).
* **No negation handling.** "I would never kill myself" still flags.
* **"kill me" alone does not flag**, only "kill myself". Otherwise "this exam is killing me" triggers constantly. Known miss:
  "just kill me".
* **"going to die" does not flag.** A real-data review showed it mostly appears as fear of dying in panic or assault
  descriptions. "want to die", "wish I was dead", etc. do flag.
**Helplines:** US 988, UK Samaritans 116 123, India Tele-MANAS 14416, plus findahelpline.com. **Numbers verified on
2026-11-01** against 988lifeline.org, samaritans.org, telemanas.mohfw.gov.in (which also lists 1-800-891-4416) and
findahelpline.com. The country list and its order are still my assumption about who will use this; **which countries
to show, and in what order, is a decision for the team** (open). Re-check the numbers periodically.
**Alternatives:** Feed the ML model's score into the flag (couples safety to a weak model: rejected); ML crisis classifier
(no labelled data; opaque); a bigger lexicon with fuzzy matching (higher recall, more false alarms, harder to audit).

## D-12 API behaviour
**Chose:** Safety check runs first and independently. If the ML part throws, respond `503` that still carries
`crisis_flag`/`crisis_message`. Input must be a non-blank string ≤ 5,000 characters. CORS allows localhost:3000/5173 by default
(`CORS_ORIGINS` overrides). Model is loaded once at startup. Text is never stored or logged.
**Why:** A stress-model failure must never hide a helpline. The limits protect the service from huge inputs; Dreaddit texts
average ~86 words.
**Alternatives:** Return 200 with a null score on failure (breaks the typed contract); no length cap; wildcard CORS (unsafe
if auth is added later).

## D-13 Language policy
**Chose:** "stress signal" / "higher_signal" / "lower_signal" everywhere; the fixed disclaimer on every response; no
diagnostic or advice wording in code, API or docs. The only occurrences of such terms are the required disclaimer, statements
that the system does *not* do these things, and the title of a cited paper. (A repo-wide search for diagnos/disorder/
patient/clinical/therap/advice confirmed this.)
**Why:** The system measures how a text resembles texts labelled "stress", not a person's condition (REPORT §7.3).

## D-14 Things deliberately not done
* No LIWC; the 109 pre-computed columns in the dataset are ignored.
* `nltk`/`spacy` were allowed but unnecessary: a regex tokenizer is enough and keeps behaviour transparent.
* No hyper-parameter search beyond the small grids above, no feature selection, no ensembling, and no probability
  calibration step (LR with log-loss tuning is approximately calibrated; I did not measure calibration).

## D-15 Multi-answer entries: score each answer, then average (task 17)
**Chose (provisional):** When a student answers several guided prompts, call `/analyze` **once per answer** and report the
**mean** of the `stress_score` values; the label uses the same 0.5 threshold on that mean; `crisis_flag` is true if **any**
answer is flagged. No API change.
**Why (measured, `src/design_checks.py`, out-of-fold on train only, 7,000 simulated 4-answer entries, same-label answers):**
* Joining the answers into one text (about 343 words, far beyond the training average of 86 and near its 310-word maximum)
  **breaks the model**: 99.4% of calm entries were flagged "higher" (AUC 0.896 but useless at 0.5) because the length feature
  and the rates saturate outside the training range.
* Scoring each answer and averaging: AUC 0.948; calm entries flagged 16.8%, stress entries flagged 92.4%.
* This **reverses my earlier recommendation** (one combined call), which was based on reasoning, not measurement.
**Caveats:** the simulated entries group answers of the same label, which is cleaner than real entries; individual answers
should be at least ~30 words (see the instability note in the contract); it is evidence on Reddit data, not on student
journals. The same length effect means any single text over ~300 words is outside the training range.
**Alternatives:** one combined call (rejected by the measurement above); per-answer display only, no overall score (valid if
the team prefers; the data are still computed per answer); a new `/analyze_entry` endpoint (not needed for now).

## D-16 Guided journaling prompts (task 16)
**Chose:** A fixed, human-reviewed list of 6 neutral prompts in `docs/journaling_prompts.json` (status **DRAFT**: the wording,
language and cultural fit need human review before students see them). Tests (`tests/test_prompts.py`) block diagnosis,
advice, self-harm and distress-presupposing wording.
**Why:** Prompts that already say "stress" or "worry" would prime students toward the vocabulary the model rewards.
They do not ask about self-harm; the safety layer only watches what students choose to write, and that stays a
product/ethics decision for the team and a counsellor.
**Alternatives:** Prompts generated by an AI at runtime (rejected: unreviewed text in front of students); a validated
questionnaire (a different kind of measurement; needs licence and scoring review).

## D-17 Long texts are scored in pieces and averaged (Phase 1, step 4)
**Chose:** `Explainer.analyze` splits any text over 150 words into pieces of about 100 words (`src/chunking.py`, cut at
sentence boundaries), scores each piece, and returns the **mean** score. Texts of 150 words or fewer (96% of training texts)
take exactly the old path, with identical scores and exact SHAP (tested). The response gets one new field, `pieces`
(1 for short texts). The crisis check still runs on the **full** text, never on pieces.
**Why (measured, `src/chunk_check.py`, out-of-fold on train only; results in `reports/chunk_check.json`):**
| entries | method | calm flagged "higher" | stress flagged "higher" | AUC | balanced accuracy |
|---|---|---|---|---|---|
| 4 texts joined (343 words, 7,000) | whole text (before) | 99.5% | 100% | 0.898 | 0.502 |
| | pieces (100 / 150) | 19.4% | 88.9% | 0.927 | 0.848 |
| | each text scored, averaged (reference) | 17.5% | 92.2% | 0.950 | 0.874 |
| 2 texts joined (171 words, 14,050) | whole text (before) | 65.2% | 98.3% | 0.865 | 0.666 |
| | pieces (100 / 150) | 33.1% | 84.0% | 0.836 | 0.755 |
| | each text scored, averaged (reference) | 25.6% | 84.8% | 0.877 | 0.796 |
Chunking removes the failure from D-15 (a long calm text scored "higher" because of its length) and recovers most of the
accuracy of scoring each text separately.
**Choice among settings:** I tried three (piece size / split-above): 80/120, 100/150, 150/200 on train only. 80/120 and
100/150 were within noise of each other; 150/200 barely helped (pieces that long still carry the length effect). I picked
100/150 because it leaves 96% of normal-length texts completely untouched. The test set was not used.
**Caveats (read these):**
* The joined entries are idealised (every part has the same label). On the 106 natural training texts over 150 words
  (75 stress), AUC did **not** improve (0.722 whole vs 0.700 pieces; n is too small to tell them apart). What changed is the
  flagging: calm texts flagged 77% -> 23%, stress texts 92% -> 53%. The old "recall" there was mostly flagging everything.
* **Texts of about 100-150 words are still scored whole**, so a milder version of the length effect remains in that range.
* The reasons for a chunked text are the mean SHAP contribution per feature: approximate (a mean of probabilities is not
  additive in log-odds). `word_count` is left out of them, because every piece is about 100 words by construction.
* The test-set numbers in REPORT.md use whole-text scoring, as trained, and are unchanged. I did not measure the effect of
  chunking on the test set (rule 4: the test set is used once for reporting). `src.explain`'s worked examples also use whole texts.
* Evidence is on Reddit data, not student journals.
**Alternatives:** raise the 5,000-character limit's guidance only (does not fix the bias); retrain with long texts or without
`word_count` (a bigger change, left for Phase 5); a pretrained long-text model (rejected earlier, see the discussion in D-14).

