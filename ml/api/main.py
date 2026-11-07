"""Step 7: FastAPI service.   Run from /ml:   uvicorn api.main:app --port 8000

Contract: /docs/api_contract.md. Interactive docs (auto-generated): http://localhost:8000/docs
"""
import os
from contextlib import asynccontextmanager
from typing import List, Literal, Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

from src.explain import Explainer
from src.safety import check_crisis

DISCLAIMER = "This is not a diagnosis or a substitute for professional care."
THRESHOLD = 0.5            # score >= 0.5 -> "higher_signal" (see DECISIONS.md D-08)
MAX_CHARS = 5000           # ~800 words; Dreaddit texts average ~85 words

state = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    state["explainer"] = Explainer()   # load model + SHAP explainer once, not per request
    yield
    state.clear()


app = FastAPI(title="Stress-signal analysis API", version="1.0.0", lifespan=lifespan,
              description="Returns a stress-signal score, a transparent explanation and an independent crisis flag. "
                          "Not a diagnosis.")
app.add_middleware(  # the frontend teammate runs on another port; override with CORS_ORIGINS="a,b"
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(","),
    allow_methods=["GET", "POST"], allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    text: str = Field(..., max_length=MAX_CHARS, description="The journal text to analyse.")

    @field_validator("text")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("text must contain at least one non-whitespace character")
        return v


class Reason(BaseModel):
    feature: str
    direction: Literal["increases", "decreases"]
    contribution: float
    plain_text: str


class AnalyzeResponse(BaseModel):
    stress_score: float = Field(..., ge=0, le=1)
    label: Literal["higher_signal", "lower_signal"]
    explanation: List[Reason]
    pieces: int = Field(1, ge=1, description="1 for short texts; >1 when a long text was scored in parts (D-17).")
    crisis_flag: bool
    crisis_message: Optional[str]
    disclaimer: str = DISCLAIMER


class SafetyResponse(BaseModel):
    crisis_flag: bool
    crisis_message: Optional[str]
    disclaimer: str = DISCLAIMER


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": "explainer" in state}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    # 1) Safety layer FIRST and on its own: it must work even if everything below fails.
    crisis = check_crisis(req.text)
    # 2) ML score + explanation.
    try:
        r = state["explainer"].analyze(req.text)
    except Exception:  # noqa: BLE001 - never leak internals or user text; keep the helpline available
        return JSONResponse(status_code=503, content={
            "detail": "Analysis is temporarily unavailable.",
            "crisis_flag": crisis.flag, "crisis_message": crisis.message, "disclaimer": DISCLAIMER})
    score = r["stress_score"]
    return AnalyzeResponse(
        stress_score=round(score, 4),
        label="higher_signal" if score >= THRESHOLD else "lower_signal",
        explanation=r["explanation"],
        pieces=r.get("pieces", 1),
        crisis_flag=crisis.flag,
        crisis_message=crisis.message,
    )


@app.post("/safety-check", response_model=SafetyResponse)
def safety_check(req: AnalyzeRequest):
    """Crisis check only: no score, no explanation, and the ML model is not touched.

    For callers that must check text without scoring it, such as a diary that checks every entry the moment it is saved
    (DECISIONS D-19). It runs the same rules, on the whole text, as the crisis part of /analyze, and it keeps working
    when the model is unavailable. Like /analyze, it does not store or log the text.
    """
    crisis = check_crisis(req.text)
    return SafetyResponse(crisis_flag=crisis.flag, crisis_message=crisis.message)

