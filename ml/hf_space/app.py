import os
from typing import Any

import torch
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoModelForSequenceClassification, AutoTokenizer


MODEL_ID = os.environ.get("SIFTER_RERANKER_MODEL", "shikharshahi/sifter-redrob-reranker")

app = FastAPI(title="Sifter Redrob Reranker")
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_ID)
model.eval()


class PredictRequest(BaseModel):
    data: list[str]


def score_candidate(job_description: str, candidate_profile: str) -> tuple[float, str]:
    text = f"Job description:\n{job_description}\n\nCandidate profile:\n{candidate_profile}"
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=256)
    with torch.no_grad():
        score = model(**inputs).logits.reshape(-1)[0].item()
    score = max(0.0, min(1.0, float(score)))
    if score >= 0.82:
        verdict = "Strong fit"
    elif score >= 0.58:
        verdict = "Review"
    else:
        verdict = "Not fit"
    return round(score, 4), verdict


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "ok": True,
        "model": MODEL_ID,
        "usage": "POST /api/predict with {'data': [job_description, candidate_profile]}",
    }


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "model": MODEL_ID}


@app.post("/api/predict")
def predict(request: PredictRequest) -> dict[str, Any]:
    if len(request.data) < 2:
        return {"error": "Provide data as [job_description, candidate_profile]."}
    score, verdict = score_candidate(request.data[0], request.data[1])
    return {"data": [score, verdict], "model": MODEL_ID}
