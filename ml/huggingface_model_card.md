---
library_name: transformers
license: apache-2.0
base_model: distilbert-base-uncased
pipeline_tag: text-classification
tags:
  - sifter
  - redrob
  - reranker
  - reward-model
  - recruitment
  - explainable-ai
  - human-feedback
metrics:
  - spearmanr
  - rmse
  - mae
model-index:
  - name: sifter-redrob-reranker
    results:
      - task:
          type: text-classification
          name: Job-candidate fit regression
        dataset:
          name: Redrob Challenge human-reviewed validation split
          type: custom-redrob-sifter-human-feedback-data
          split: validation
        metrics:
          - type: spearmanr
            value: 0.7526
            name: Spearman rank correlation
          - type: rmse
            value: 0.2104
            name: RMSE
          - type: mae
            value: 0.1884
            name: MAE
widget:
  - text: |
      Job description:
      Senior AI Engineer for production retrieval, embeddings, vector search, hybrid retrieval, LLM reranking, ranking evaluation, Python, model serving, monitoring, and ownership.

      Candidate profile:
      Senior AI Engineer with 7.8 years experience. Skills: retrieval, ranking, evaluation, embeddings, vector search, Python, production ML systems.
---

# Sifter Redrob Reranker

This is the first trained reranker for **Sifter**, an AI hiring-ranking system built for the Redrob challenge.

The model reads a job description and one candidate profile together, then predicts a `0-1` fit score. In Sifter, it is used as a learned second opinion on the finalist pool after the full 100,000-candidate explainable ranker has already run.

Project repo: [Sifter_Redrob_Hackathon](https://github.com/shikhar1809/Sifter_Redrob_Hackathon)  
Live app: [https://sifter1011.web.app](https://sifter1011.web.app)

## What This Model Does

Sifter already has a deterministic evidence ranker that can process the full Redrob candidate pool locally. This model adds a trainable layer on top:

1. Sifter ranks the full candidate pool using explainable evidence.
2. The backend sends only the finalist pool to this Hugging Face model.
3. The model returns a learned fit score.
4. Sifter blends the scores and keeps the explanation/bias guardrails visible.

Current blend in the Sifter backend:

```text
70% explainable Sifter evidence score
30% learned reranker score
```

Default rerank scope:

```text
top 25 finalist candidates
```

## Training Data

This revised public model was trained on Redrob-derived Sifter preference data with human-reviewed recruiter-style labels, not on a generic public ranking benchmark.

Training run:

| Item | Value |
| --- | --- |
| Source | Redrob candidate profiles + human-reviewed Sifter candidate review set |
| Total examples | 180 job-candidate examples |
| Train split | 166 examples |
| Validation split | 14 examples |
| Job description | Redrob Senior AI Engineer style role brief |
| Label type | Continuous fit score from `0.0` to `1.0` |
| Label source | Human-reviewed labels from the 180-candidate review set |
| Human label mix | 46 `strong_fit`, 58 `maybe`, 76 `not_fit` |
| Human independent holdout | Small reviewed validation split; no separate multi-recruiter panel yet |

Each training example is shaped like this:

```text
Job description + candidate profile -> fit score
```

The candidate profile text includes title, summary/headline, years of experience, location, career history, skills, certifications, assessments, and Redrob behavioral/logistics signals.

## Label Scale

The revised run uses human-reviewed labels so the model learns from actual recruiter-style judgment instead of only bootstrapped scores.

| Label area | Meaning |
| --- | --- |
| `0.90 - 1.00` | Strong shortlist / interview-style fit |
| `0.55 - 0.72` | Review or maybe-fit candidates |
| `0.08 - 0.15` | Weak fit, rejected, or unranked lower-priority candidates |

Recruiter labels are supported by the training script and override weak labels when present:

| Recruiter label | Score |
| --- | --- |
| `hire` | `1.00` |
| `strong_fit` | `0.95` |
| `interview` | `0.90` |
| `review` | `0.62` |
| `maybe` | `0.55` |
| `not_fit` | `0.08` |
| `reject` | `0.00` |

Important: these labels are stronger than weak supervision, but they are still a compact review set. The next stronger version should add more reviewers and a separate held-out recruiter panel.

## Metrics

Validation results from the human-reviewed revised run:

| Metric | Value |
| --- | ---: |
| Validation loss | `0.0443` |
| RMSE | `0.2104` |
| MAE | `0.1884` |
| Spearman rank correlation | `0.7526` |

What Spearman means in plain language: when the human-reviewed labels say candidate A should usually rank above candidate B, the model's scores mostly move in the same direction. `0.7526` is a strong sign that the learned reranker is now aligned with the reviewed candidate judgments.

## Training Procedure

Base model:

```text
distilbert-base-uncased
```

Fine-tuning method:

```text
Supervised reward-model regression fine-tuning
```

Training setup:

| Hyperparameter | Value |
| --- | --- |
| Epochs | `3.0` |
| Training steps | Colab GPU run on 166 reviewed training rows |
| Batch size | `8` |
| Learning rate | `2e-5` |
| Max sequence length | `256` |
| Optimizer | AdamW |
| Precision | FP32 |

The model head is a single regression output (`num_labels=1`) trained with mean squared error loss.

## Why This Is Still Human-In-The-Loop

This model is not treated as an automatic hiring decision system. The reviewed-label run improves the learned ranking signal, but Sifter still keeps human-facing checks:

- every rank still shows evidence and concern text,
- the bias guardrail stays visible,
- reviewer-agent questions challenge the result,
- recruiters can add more labels for future retraining.

## How It Is Integrated Into Sifter

The model is wired into the Sifter backend:

| Code path | Purpose |
| --- | --- |
| `apps/api/src/learned-rerank.ts` | Calls this Hugging Face model, parses the returned score, blends it into finalist ranking, and falls back safely |
| `apps/api/src/config.ts` | Reads `HF_TOKEN`, `SIFTER_RERANKER_MODEL`, rerank weight, and finalist limit |
| `apps/api/src/server.ts` | Exposes learned reranking through the Redrob API flow |
| `apps/web/src/App.tsx` | Shows learned-reranker status in the UI |

The model is not allowed to become an unchecked black box. The deterministic Sifter reason, score breakdown, bias guardrail, and reviewer-agent questions remain visible after reranking.

## Limitations

- The model is trained for the Redrob/Sifter Senior AI Engineer ranking setup, not general hiring across every role.
- The revised run uses 180 human-reviewed examples, so it is stronger than weak supervision but still small.
- The validation metric is measured on a 14-row reviewed validation split, not a large independent recruiter panel.
- The model can learn patterns present in the review labels, so Sifter keeps deterministic explanations and bias guardrails in the final product.
- The Redrob dataset does not include protected demographic labels, so this model card does not claim protected-class fairness parity.

## Responsible Use

Use this model as a recruiter-assist reranker, not as an automatic hiring decision system. It should support human review by providing an additional fit signal while Sifter continues to show evidence, concerns, and bias checks.

Recommended use:

- rerank finalist pools,
- compare candidate-job fit,
- support interview shortlist review,
- collect recruiter labels for a better second version.

Not recommended:

- automatic rejection without human review,
- ranking based on identity or protected traits,
- claiming fairness parity without a protected-label audit,
- using the score without reading the explanation and evidence.
