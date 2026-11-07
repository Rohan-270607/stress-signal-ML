# API contract: stress-signal analysis service

Base URL (local dev): `http://localhost:8000` · Interactive docs: `/docs` · OpenAPI JSON: `/openapi.json`
Content type: `application/json`. No authentication (local prototype; add auth before any real deployment).

> The service returns a **signal**, never a diagnosis. The frontend must show `disclaimer` with every result and
> must show `crisis_message` prominently whenever `crisis_flag` is true.

## `GET /health`

`200 OK` → `{"status": "ok", "model_loaded": true}`

## `POST /analyze`

### Request

```json
{ "text": "string, 1-5000 characters, not blank" }
```

### Response `200 OK`

```json
{
  "stress_score": 0.9833,
  "label": "higher_signal",
  "explanation": [
    {
      "feature": "first_person_rate",
      "direction": "increases",
      "contribution": 1.422,
      "plain_text": "Higher use of first-person singular pronouns (I, me, my) than typical increased the signal."
    }
  ],
  "pieces": 1,
  "crisis_flag": false,
  "crisis_message": null,
  "disclaimer": "This is not a diagnosis or a substitute for professional care."
}
```

| Field | Type | Meaning |
|---|---|---|
| `stress_score` | float, 0-1 | Model probability that the text resembles texts annotators labelled as expressing stress. **Not** a severity or a clinical measure. Rounded to 4 d.p. |
| `label` | `"higher_signal"` \| `"lower_signal"` | `higher_signal` iff `stress_score >= 0.5`. |
| `explanation` | array (0-4 items) | The features that moved this text's score most, sorted by absolute size. May be empty if every contribution is tiny (< 0.02). |
| `explanation[].feature` | string | One of `first_person_rate`, `absolutist_rate`, `negative_emotion_rate`, `negation_rate`, `question_rate`, `exclamation_rate`, `word_count`. Stable identifiers; safe to map to icons/labels. |
| `explanation[].direction` | `"increases"` \| `"decreases"` | Whether the feature pushed the score up or down **relative to an average training text**. |
| `explanation[].contribution` | float | SHAP value in log-odds. Sign matches `direction` (positive = increases). Use `abs()` for bar lengths; units are not percentages. |
| `explanation[].plain_text` | string | Ready-to-display English sentence. |
| `pieces` | int, >= 1 | `1` for texts up to 150 words. For longer texts the service scores pieces of about 100 words and returns the mean, and this is the number of pieces (see "Known behaviours"). Added later; older clients can ignore it. |
| `crisis_flag` | bool | Set by an **independent rule-based** detector (keywords/regex), not by the ML model. Can be true while `label` is `lower_signal` and vice-versa. |
| `crisis_message` | string \| null | A fixed, pre-written message with helpline information when `crisis_flag` is true, otherwise `null`. Display verbatim. |
| `disclaimer` | string | Constant. Display with every result. |

### Errors

| Status | When | Body |
|---|---|---|
| `422` | Missing/non-string/blank `text`, or longer than 5000 chars | FastAPI default: `{"detail":[{"type":"...","loc":["body","text"],"msg":"..."}]}` |
| `503` | The ML model failed at runtime. The safety layer still ran. | `{"detail":"Analysis is temporarily unavailable.","crisis_flag":bool,"crisis_message":string\|null,"disclaimer":"..."}` |

**Frontend note:** on `503`, still check `crisis_flag` and show `crisis_message` if present.

### CORS

Allowed origins default to `http://localhost:3000` and `http://localhost:5173`. Override with the
`CORS_ORIGINS` environment variable (comma-separated) when starting the server.

### Example

```bash
curl -X POST http://localhost:8000/analyze -H "Content-Type: application/json" \
     -d '{"text":"I never get anything right and I am so afraid nothing will change."}'
```

### Known behaviours the UI should be ready for

* **Very short texts give less stable scores.** The features are per-word rates, so one "I" in a 10-word text moves
  them a lot. Measured on the test set: score standard deviation was 0.39 for texts under 30 words (only 7 texts,
  so treat as indicative) versus about 0.20-0.28 for longer ones. Consider a hint such as "longer entries give
  steadier results".
* **Multi-answer entries (guided prompts): score each answer separately.** Call `/analyze` once per answer, show the
  mean of the `stress_score` values as the overall signal (label `higher_signal` iff mean >= 0.5), and treat the entry as
  crisis-flagged if **any** response has `crisis_flag: true`. **Do not join answers into one long text**: measured on
  training data, ~99% of calm four-answer entries were pushed to "higher". Prompts: `docs/journaling_prompts.json`.
  Texts much longer than ~300 words are outside the range the model was trained on.
* **Long texts are scored in pieces.** Over 150 words, the text is cut into pieces of about 100 words at sentence
  boundaries, each piece is scored, and `stress_score` is the mean (`pieces` says how many). Without this, a long calm text
  scored "higher" mostly because of its length (measured: `ml/DECISIONS.md` D-17). For these texts `explanation` is the
  average per-feature contribution (approximate) and never includes `word_count`. The crisis check always runs on the whole text.
* **Texts of about 100-150 words are still scored whole**, so a milder length effect remains there.
* **The model is weak by design** (see `ml/REPORT.md`): about 73% F1 on Reddit data. Present the score as a soft
  signal, not a verdict.
* Text is processed in memory and **not stored or logged** by the service.

## `POST /safety-check`

The crisis check on its own: no score, no explanation, and the ML model is not used. It exists for callers that must check
text without scoring it, such as a diary that checks every entry the moment it is saved. It runs the same rules, on the
whole text, as the crisis part of `/analyze` (a test requires the two to always agree) and it keeps working when the model
is unavailable. The text is not stored or logged.

### Request

```json
{ "text": "string, 1-5000 characters, not blank" }
```

### Response `200 OK`

```json
{
  "crisis_flag": true,
  "crisis_message": "string, the fixed message from the safety layer (null when crisis_flag is false)",
  "disclaimer": "This is not a diagnosis or a substitute for professional care."
}
```

When `crisis_flag` is true, show `crisis_message` verbatim and prominently, exactly as for `/analyze`.

### Errors

| Status | When | Body |
|---|---|---|
| `422` | Missing/non-string/blank `text`, or longer than 5000 chars | FastAPI default |

There is no `503`: nothing here depends on the model. The same limits as the rest of the safety layer apply: it only knows
the phrases on its list, will miss indirect wording and will raise some false alarms (`ml/README.md`).
