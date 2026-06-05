import os

import gradio as gr
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer


MODEL_ID = os.environ.get("SIFTER_RERANKER_MODEL", "YOUR_HF_USERNAME/sifter-redrob-reranker")

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_ID)
model.eval()


def score_candidate(job_description: str, candidate_profile: str):
    text = f"Job description:\n{job_description}\n\nCandidate profile:\n{candidate_profile}"
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
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


demo = gr.Interface(
    fn=score_candidate,
    inputs=[
        gr.Textbox(label="Job description", lines=8, value="Senior AI Engineer for production retrieval, embeddings, vector search, LLM reranking, ranking evaluation, Python, model serving, and ownership."),
        gr.Textbox(label="Candidate profile", lines=12, value="Senior ML engineer with Python, embeddings, retrieval systems, FAISS, ranking evaluation, production model serving, and monitoring experience."),
    ],
    outputs=[gr.Number(label="Learned fit score"), gr.Textbox(label="Verdict")],
    title="Sifter Learned Candidate Reranker",
    description="Fine-tuned reward/reranker model for ranking candidates against a job description.",
)


if __name__ == "__main__":
    demo.launch()
