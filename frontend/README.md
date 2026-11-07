# Specula: reflective journaling (Frontend)

Web user interface for the student stress-signal project, implementing the exact contract in [`../docs/api_contract.md`](../docs/api_contract.md).

## What it does

Takes a student's journal reflection and displays:
1. A **soft stress-signal score** (0 to 1) on a ruler with the 0.5 line marked, plus a neutral label (`higher_signal` / `lower_signal`). Never a diagnosis or severity score.
2. A list of the **word patterns that moved the score**, as centre-line bars sized by SHAP log-odds contributions, with the API's plain-English reasons.
3. An **independent crisis panel** that renders the safety layer's message verbatim whenever it is flagged, with its numbers and link made tappable. It can't be dismissed, and a slim strip keeps the way back on screen after scrolling.
4. **Guided prompts** read directly from [`../docs/journaling_prompts.json`](../docs/journaling_prompts.json) (scored per answer and averaged). They are still drafts pending human review, and the UI says so.
5. The **mandatory non-clinical disclaimer** visible on every view.
6. A **7-day diary** (Diary tab): one typed entry per day, saved in this browser on this device only and deleted
   automatically after 7 days, with a delete-everything button. Every entry goes through the safety check
   (`POST /safety-check`) the moment it is saved, so a worrying entry is noticed straight away. A "signal check" scores each
   saved entry on its own and averages them, with one tick per day. It is worded as a soft signal, never as a trend.
   Photo capture is the next phase and not built yet.

The dev samples under the editor, including the crisis phrase, only exist under `npm run dev`. They are not in production builds.

## Running Locally

### 1. Ensure the ML backend is running
From the repo root:
```powershell
cd ml
.venv\Scripts\python -m uvicorn api.main:app --port 8000
```
Verify: `http://localhost:8000/health` returns `{"status":"ok","model_loaded":true}`.

### 2. Start the frontend development server
In a separate terminal:
```powershell
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

## Strict Operating Rules Followed

1. **No diagnosis or advice**: Uses only neutral "signal" terminology. The disclaimer is attached to every view.
2. **Verbatim crisis handling**: The crisis message comes only from the API (`ml/src/safety.py`). No helpline numbers are hard-coded here, so they can't drift. If a request fails in a way that means the safety layer may not have run, the error says so and links to findahelpline.com.
3. **No server-side storage, and no storage at all outside the diary**: free writing and guided answers live in memory only. The diary is the one deliberate exception: its entries are written to this browser's localStorage (key `specula.diary.v1`), never to a server, and expire after 7 days. Nothing is stored in cookies or remote databases.
4. **Input validation**: Max 5,000 characters, live counters, a hint for short entries (<30 words), and graceful 422 / 503 handling.

## Tests

```powershell
cd frontend
npm test         # 40 tests: diary storage and expiry, save-then-safety-check, scoring, the crisis panel, the diary screen
npm run build    # type-check + production build
npm run lint
```

The tests cover the safety behaviour on purpose: the fixed crisis message must be shown unchanged, a failed safety check must
never lose an entry, a failed answer must never stop the others reaching the safety layer, and the diary must delete what it
says it deletes. Run the API tests from `ml/` (`pytest tests -q`) for the backend side.
