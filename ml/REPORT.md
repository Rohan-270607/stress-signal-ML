# Evaluation report: interpretable stress-signal model

All numbers below were produced by the code in `ml/src` and are saved in `ml/reports/` (`results.json`,
`final_eval.json`). **Every metric in the tables is computed on the held-out test set, once per model, after all tuning
and selection was finished on the training set only.** `python -m src.final_eval` re-fits the chosen configurations
and confirms the numbers reproduce exactly.

## 1. Dataset

* **Dreaddit** (Turcan & McKeown, 2019, *Dreaddit: A Reddit Dataset for Stress Analysis in Social Media*).
  Reddit text segments from 10 subreddits (e.g. r/anxiety, r/ptsd, r/relationships, r/homeless, r/assistance).
  Each segment was labelled by 5 crowd workers; the label is the majority vote.
* Obtained from the Hugging Face mirror `andreagasparini/dreaddit`. Its train/test sizes (2,838 / 715) match the
  published split. I did not verify the mirror byte-for-byte against the original repository.
* `label = 1` means annotators judged the text as **expressing stress**; `0` means not. `confidence` is the share of
  annotators who agreed (0.43-1.0; mean 0.81). 34% of training rows have confidence below 0.7.
* The file also contains 109 pre-computed columns (LIWC, DAL, readability). **They are not used.** LIWC is licensed, and
  the project's goal is features you can read and edit yourself.
* Classes are nearly balanced: 52.6% stress in train, 51.6% in test. Texts average ~86 words (range 1-310).

## 2. Split and cleaning

| | rows | notes |
|---|---|---|
| Raw train | 2,838 | official split |
| Removed: text also in test | 3 | leakage |
| Removed: duplicate texts with conflicting labels | 8 | label unreliable, all copies dropped |
| Removed: redundant exact copies | 14 | one copy kept |
| **Train used** | **2,813** | |
| **Test used** | **715** | official test split, **not modified** |

* No `post_id` appears in both train and test (checked), so the official split does not leak at the post level.
* Several training rows are segments of the same post (2,343 unique posts for 2,838 rows). All cross-validation
  therefore uses `StratifiedGroupKFold` grouped by `post_id`, so one post never sits in both the fitting and the
  validation part of a fold.

## 3. Models

| Name | Inputs | Notes |
|---|---|---|
| **Baseline** `tfidf_logreg_baseline` | TF-IDF of 1-2-grams (`min_df=3`) | logistic regression, C=10 |
| `features_logreg` (**chosen**) | 7 hand-built linguistic features, standardised | logistic regression, C=0.1 |
| `features_xgboost` | same 7 features | depth 2, 100 trees, lr 0.1 |

The 7 features (all per-word rates unless noted; lexicons in `ml/lexicons/`): first-person singular pronouns,
absolutist words, negative-emotion words (NRC), negation, question marks, exclamation marks, and text length (raw word
count).

Hyper-parameters were tuned by 5-fold grouped CV on train, minimising **log loss** (see DECISIONS D-06). The chosen model
was selected by a rule fixed in advance: lowest CV log loss, with XGBoost needing to win by at least 0.01 to replace
logistic regression. XGBoost won by only 0.003 (0.5467 vs 0.5495), so logistic regression was kept.

## 4. Results (test set, n = 715, positive class = "higher signal", threshold 0.5)

| Model | Precision | Recall | F1 | ROC-AUC |
|---|---|---|---|---|
| Always predict "higher signal" (reference) | 0.516 | 1.000 | 0.681 | 0.500 |
| **TF-IDF + LR (baseline)** | 0.725 | 0.778 | **0.750** | **0.821** |
| **Features + LR (chosen)** | 0.701 | 0.762 | **0.730** | 0.765 |
| Features + XGBoost | 0.677 | 0.745 | 0.710 | 0.768 |

Confusion matrices (rows = truth, columns = prediction):

| Baseline | pred lower | pred higher | | Features + LR | pred lower | pred higher | | Features + XGB | pred lower | pred higher |
|---|---|---|---|---|---|---|---|---|---|---|
| true lower | 237 | 109 | | true lower | 226 | 120 | | true lower | 215 | 131 |
| true higher | 82 | 287 | | true higher | 88 | 281 | | true higher | 94 | 275 |

95% bootstrap confidence intervals for F1 (2,000 resamples of the test set):
baseline 0.715-0.784, features + LR 0.694-0.765, features + XGBoost 0.675-0.747.

### What this means: the honest trade-off

* **The interpretable model is a little worse than the black-box-ish baseline.** F1 is 0.020 lower (0.730 vs 0.750),
  and AUC is 0.056 lower (0.765 vs 0.821). The AUC gap is the clearer sign: the 7 features rank texts less well than
  thousands of word features.
* **On F1 the difference is within noise.** The 95% interval for (baseline − features LR) F1 is **[−0.017, +0.059]**,
  which includes zero. With 715 test rows I cannot claim that either is better *on F1*.
* **Context for "good":** a rule that labels everything "higher signal" scores F1 0.681. The chosen model is ~0.05
  above that. On a roughly balanced dataset F1 is flattered by predicting the positive class; AUC is the fairer
  yardstick, and 0.765 is modest.
* **XGBoost did not help.** With 7 features and 2.8k rows, a small tree ensemble found no signal that a linear model
  missed (CV log loss 0.5467 vs 0.5495; test F1 0.710 vs 0.730, with a difference interval of about [0.000, 0.041]).
  A linear model is simpler and its explanations are exact, so it wins.
* The baseline's CV F1 (0.778) was higher than its test F1 (0.750), the features LR's was 0.742 vs 0.730. Some
  optimism from tuning on train is normal; the test numbers are the ones to quote.

### Where the model does better and worse

By text length (F1; chosen model vs baseline): 0-50 words 0.692 vs 0.706 (n=58); 50-80 words 0.703 vs 0.731 (n=294);
80-110 words 0.729 vs 0.763 (n=236); 110+ words 0.790 vs 0.777 (n=127). The share of texts the chosen model labels
"higher signal" rises from 43% (under 50 words) to 72% (over 110 words), **so text length is acting partly as a proxy**.
That is a weakness: a long calm text is pushed up, a short distressed text is pushed down.

By subreddit (F1, chosen vs baseline, only groups with n ≥ 20): anxiety 0.80 vs 0.82; ptsd 0.79 vs 0.81;
domesticviolence 0.79 vs 0.80; survivorsofabuse 0.68 vs 0.66; relationships 0.65 vs 0.62; assistance 0.60 vs 0.75;
homeless 0.52 vs 0.63. The features work best on emotionally expressive first-person posts and worst on practical
financial/housing posts, where stress is expressed through circumstances rather than emotional vocabulary.

## 5. Explainability

Global importance (mean |SHAP value| in log-odds, test set; plots: `reports/shap_global_importance.png`,
`reports/shap_beeswarm.png`):

| Feature | mean abs SHAP | LR standardised coefficient |
|---|---|---|
| first_person_rate | 0.666 | +0.871 |
| negative_emotion_rate | 0.504 | +0.673 |
| word_count | 0.266 | +0.366 |
| negation_rate | 0.190 | +0.244 |
| question_rate | 0.115 | +0.338 |
| exclamation_rate | 0.073 | −0.227 |
| absolutist_rate | 0.058 | +0.073 |

* More first-person pronouns and more negative-emotion words are the strongest drivers of a higher score.
* **The absolutist-word feature barely matters in this data**, although the literature (Al-Mosaiwi & Johnstone, 2018)
  links such words to anxiety and low mood. Class means are close (1.15% of words in "not stress" vs 1.35% in
  "stress"). One possible reason, not tested here, is that *both* classes come from distress-related subreddits, so the
  contrast the literature describes is weaker. I did not assume the hypothesis would hold.
* Exclamation marks push the score *down*: more exclamation marks appear in "not stress" texts.
* SHAP additivity was verified numerically: baseline value + sum of contributions equals the model's log-odds to
  1.8e-15 for every test text.

Five worked examples (text, score, plain-English reasons; two correct "higher", two correct "lower", one deliberate
error) are in `reports/worked_examples.md`. Example 3 is instructive: a safety-planning text scores 0.04 because it has no
first-person pronouns, even though the topic is serious. The model reads word *patterns*, not meaning.

## 6. Safety layer

Rule-based and independent of the model (`src/safety.py`, 40 test cases in `tests/test_safety.py`). On the Dreaddit
test texts it fires on 20/715 (2.8%): 1.7% of "not stress" texts and 3.8% of "stress" texts. I read the first dozen
matches: most are genuine mentions of suicidal thoughts or self-harm; some are descriptions of *someone else's* threats
or a bystander's attempt (for example an abuser's "suicide threats"). Those are false alarms for the writer's own
state, accepted on purpose (over-flagging is the safer failure). Recall of the layer was **not measured**; there is no
labelled crisis data here, so I cannot report how many real crisis texts it misses.

## 7. Limitations

1. **Reddit, not student journals.** Dreaddit is public, anonymous, written *to ask a community for help*, often about
   housing, abuse and PTSD. Student journals are private, reflective and about different things (exams, deadlines).
   Performance on journals is unknown and probably lower. Validate on consented student data before relying on it.
2. **Label noise.** Labels are crowd majority votes on short segments; 34% of training rows have <70% annotator
   agreement, and 8 duplicate texts carried conflicting labels. There is a ceiling on any model's accuracy here.
3. **"Stress" here means "annotators judged this text as expressing stress"**, not a measured state. The score says a
   text *looks like* texts labelled stressful. It is not a measurement of a person.
4. **No clinical validity.** Nothing here has been checked against clinical measures or professionals. The system must
   not be used to diagnose, screen, triage or make decisions about a person.
5. **Weak absolute accuracy.** The chosen model misclassifies 208 of 715 test texts (29%) at the 0.5 threshold:
   120 false "higher signal" and 88 false "lower signal". The baseline misclassifies 191 (27%).
6. **Length and style confounds** (section 4), including features tied to how Reddit users write.
7. **Lexicon limits.** Word lists ignore context, sarcasm, spelling variants, slang and non-English text. The negative
   emotion list (NRC) marks the *word*, so "not sad" still counts "sad". The absolutist list was written from memory of
   the published list; only part of it has been checked against the paper (see DECISIONS D-05). The paper also warns that
   negation, qualifiers and salutations ("hello everyone") inflate such counts; this extractor does not guard against them.
8. **Safety layer is a net, not a classifier** (README). Unmeasured recall; English only; no context understanding.
9. **Single split, single seed.** The test set is 715 rows; intervals above show the uncertainty. No repeated-split or
   external-dataset validation was done.
10. **Fairness not evaluated.** No demographic information exists in the data; performance could differ across writing
    styles, dialects and non-native English, and I did not test this.

## 8. Ethical notes

* **Purpose and framing.** Output is a "signal" with the constant disclaimer *not a diagnosis or a substitute for
  professional care*. The API never gives advice. The only human-facing guidance is the fixed, human-written helpline
  message from the safety layer.
* **Never an AI-generated crisis message.** Crisis text is a constant authored by a person and reviewed in code.
* **Privacy.** Journal text is sensitive. The API processes text in memory and does not store or log it. Any future
  deployment needs consent, retention rules, and ideally on-device or institution-controlled hosting.
* **Consequences of errors.** A false "higher signal" may cause needless worry; a false "lower signal" may reassure
  someone wrongly. The UI should present the score as a soft signal, keep the disclaimer visible, and never use it to
  rank, flag or report students to anyone.
* **Data provenance.** Dreaddit is public Reddit data collected for research. The NRC Emotion Lexicon is free for
  non-commercial research only and may not be redistributed (hence git-ignored); commercial use needs a licence from
  its authors.
* **Transparency over accuracy.** The project accepts a small accuracy cost so every reason can be inspected and edited.
  The report quantifies that cost rather than hiding it.
