---
title: Sifter Redrob Reranker
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# Sifter Redrob Reranker

This Docker Space scores candidate profiles against a job description using the fine-tuned Sifter reward/reranker model:

[shikharshahi/sifter-redrob-reranker](https://huggingface.co/shikharshahi/sifter-redrob-reranker)

The model is a DistilBERT regression reranker trained on Redrob-derived Sifter preference data and a human-reviewed candidate review set. It is meant to be used as a learned second opinion on finalist candidates, not as an automatic hiring decision.

## What The Space Shows

- job description + candidate profile scoring
- learned `0-1` fit score
- quick sanity check for the trained model outside the Sifter app
- the same model family that Sifter can call from its backend finalist-reranking path

## Training Summary

| Item | Value |
| --- | --- |
| Base model | `distilbert-base-uncased` |
| Training method | supervised reward-model regression fine-tuning |
| Human-reviewed examples | `180` |
| Train / validation split | `166 / 14` |
| Label mix | `46 strong_fit`, `58 maybe`, `76 not_fit` |
| Epochs | `3` |
| Validation Spearman | `0.7526` against reviewed labels |

The validation score is measured against a small human-reviewed validation split. That is why Sifter keeps explanations, bias guardrails, and human review in the main product.

API usage:

```text
POST /api/predict
{"data": ["job description", "candidate profile"]}
```

Set the Space variable:

```text
SIFTER_RERANKER_MODEL=shikharshahi/sifter-redrob-reranker
```
