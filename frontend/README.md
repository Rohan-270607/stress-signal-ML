# Specula: Student Stress-Signal Navigator (Frontend)

Web user interface for the student stress-signal project, implementing the exact contract in [`../docs/api_contract.md`](../docs/api_contract.md).

## What it does

Takes a student's journal reflection and displays:
1. A **soft stress-signal score** (0.000 to 1.000) and neutral indicator (`higher_signal` / `lower_signal`). Never a diagnosis or severity score.
2. A transparent **psycholinguistic feature attribution** list with horizontal bars sized by SHAP log-odds contributions and plain-English reasons.
3. An **independent crisis override banner** that renders verbatim helpline information whenever the rule-based safety layer flags crisis keywords.
4. **Guided Journaling Inquiries** based on fixed, human-reviewed prompts from [`../docs/journaling_prompts.json`](../docs/journaling_prompts.json) (scored per-answer and averaged).
5. The **mandatory non-clinical disclaimer** prominently visible on every result.

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
2. **Verbatim crisis handling**: The crisis message and helpline phone numbers are non-dismissible and verbatim from `ml/src/safety.py`.
3. **Zero data persistence**: Reflections are processed in volatile memory only and never written to localStorage, cookies, or remote databases.
4. **Input validation**: Max 5,000 characters, live counters, advisory for short entries (<30 words), and graceful 422 / 503 handling.
