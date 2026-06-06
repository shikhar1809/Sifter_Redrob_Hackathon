---
title: Sifter Redrob Reranker
colorFrom: blue
colorTo: green
sdk: gradio
sdk_version: 4.44.1
app_file: app.py
pinned: false
---

# Sifter Redrob Reranker

This Space scores candidate profiles against a job description using the fine-tuned Sifter reward/reranker model:

[shikharshahi/sifter-redrob-reranker](https://huggingface.co/shikharshahi/sifter-redrob-reranker)

The model is a DistilBERT regression reranker trained on Redrob-derived Sifter preference data. It is meant to be used as a learned second opinion on finalist candidates, not as an automatic hiring decision.

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
| Training examples | `2,000` |
| Train / validation split | `1,840 / 160` |
| Epochs | `1` |
| Validation Spearman | `0.6824` against weak Sifter labels |

The validation score is measured against weak labels from Sifter's own ranked Redrob output, not against an independent recruiter-labeled holdout. That is why Sifter keeps explanations, bias guardrails, and human review in the main product.

Set the Space secret:

```text
SIFTER_RERANKER_MODEL=shikharshahi/sifter-redrob-reranker
```
