# Sifter Learned Reranker Training

This folder turns Sifter from a hand-weighted ranker into a trainable ranking system.

It has three parts:

1. `prepare_redrob_preference_data.py` builds train/validation data from the Redrob candidates, the ranked public pages, and optional recruiter labels.
2. `train_reward_reranker_colab.py` fine-tunes a Hugging Face cross-encoder reward/reranker model.
3. `hf_space/` contains a deployable Gradio Space for scoring and ranking candidates with the trained model.

## What This Actually Learns

The first model is a **learned reward/reranker**, not another hand-written score. It reads:

- the job description
- the candidate profile
- recruiter labels when available
- weak bootstrapped labels from Sifter's existing ranking when human labels are missing

Then it learns to predict candidate fit as a scalar score.

Important: weak labels are only a bootstrap. The revised model now uses a human-reviewed Redrob review set so quality claims are based on recruiter-style labels, not only Sifter's own ranking.

## Model Choice

The first trained model uses:

```text
distilbert-base-uncased
```

Why:

- it is small enough for Google Colab T4 runs
- it trains faster than heavier rerankers
- it is stable enough for a repeatable demo
- it can still read the job and candidate profile together as one pair

The stronger next model path is:

```text
microsoft/deberta-v3-small
```

That should give more depth, but it is slower and was less Colab-friendly during the first working run.

## Training Methodology

Each training row looks like:

```text
Job description + candidate profile -> fit score from 0 to 1
```

The score comes from recruiter labels when available. When recruiter labels are missing, Sifter uses its existing ranked Redrob output as a weak starter label.

This is reward-style fine-tuning for ranking. It is not full RLHF yet. The goal is to create a learned second opinion that can improve as more recruiter labels arrive.

For the metrics reported in the main README, the reviewed-label run is clean: all `166` training examples and all `14` validation examples come from the `180` project-reviewed Redrob labels. Weak bootstrapped Sifter labels were used only in the earlier bootstrap path, not in the reported `0.7526` reviewed-model metric.

## Colab Quick Start

Use a GPU runtime in Google Colab.

```bash
%cd /content
![ -d Sifter_Redrob_Hackathon ] || git clone https://github.com/shikhar1809/Sifter_Redrob_Hackathon.git
%cd /content/Sifter_Redrob_Hackathon
!git pull
!pip install -q "transformers>=4.41" "datasets>=2.19" "accelerate>=0.30" "sentencepiece" "protobuf" "scikit-learn>=1.5,<1.9" "scipy" "huggingface_hub"
```

Mount Drive or upload the Redrob challenge file:

```bash
from google.colab import drive
drive.mount("/content/drive")
```

Prepare weak/bootstrap training data:

```bash
!find /content/drive/MyDrive -name "candidates.jsonl" | head -20

!python ml/prepare_redrob_preference_data.py \
  --candidates "/content/drive/MyDrive/redrob/candidates.jsonl" \
  --candidate-pages-dir apps/web/public/redrob-candidate-pages \
  --labels-csv ml/recruiter_labels_template.csv \
  --out-dir data/redrob-reranker \
  --max-records 2000 \
  --seed 42
```

Train and push a model:

```bash
from huggingface_hub import notebook_login
notebook_login()
```

```bash
!python ml/train_reward_reranker_colab.py \
  --data-dir data/redrob-reranker \
  --base-model distilbert-base-uncased \
  --output-dir outputs/sifter-redrob-reranker \
  --hub-model-id shikharshahi/sifter-redrob-reranker \
  --epochs 1 \
  --batch-size 8 \
  --learning-rate 2e-5 \
  --precision fp32 \
  --push-to-hub
```

This is the fast bootstrap setting. The stronger reviewed-label path uses:

```text
ml/sifter_reviewed_reranker_train_colab.ipynb
```

That notebook trains on the reviewed dataset:

| Item | Value |
| --- | --- |
| Reviewed candidates | `180` |
| Train split | `166` |
| Validation split | `14` |
| Label mix | `46 strong_fit`, `58 maybe`, `76 not_fit` |
| Epochs | `3` |
| Base model | `distilbert-base-uncased` |
| Spearman | `0.7526` |
| RMSE | `0.2104` |
| MAE | `0.1884` |

This is the current preferred model story: Sifter studies the data, selects hard review cases, gets human labels, and fine-tunes a reward/reranker model from that feedback.

Training-data composition for that reported run:

| Split | Human-reviewed labels | Weak bootstrapped labels |
| --- | ---: | ---: |
| Train | `166` | `0` |
| Validation | `14` | `0` |
| Total | `180` | `0` |

The notebook version now makes the final training cell prepare the data first, verify `reranker_train.jsonl` and `reranker_valid.jsonl`, and only then start training. That keeps Colab from failing because a previous data-prep cell was skipped.

Optional DPO preference fine-tuning for an LLM-style rank explanation model:

```bash
!python ml/train_dpo_explainer_colab.py \
  --data-dir data/redrob-reranker \
  --base-model Qwen/Qwen2.5-0.5B-Instruct \
  --output-dir outputs/sifter-redrob-dpo-explainer \
  --hub-model-id YOUR_HF_USERNAME/sifter-redrob-dpo-explainer \
  --epochs 1 \
  --batch-size 2 \
  --learning-rate 5e-6 \
  --push-to-hub
```

## Deploy To Hugging Face Spaces

Create a new Hugging Face Space with SDK `Gradio`, then upload the files from `ml/hf_space`.

Set this Space secret:

```text
SIFTER_RERANKER_MODEL=YOUR_HF_USERNAME/sifter-redrob-reranker
```

Local preview:

```bash
cd ml/hf_space
pip install -r requirements.txt
SIFTER_RERANKER_MODEL=YOUR_HF_USERNAME/sifter-redrob-reranker python app.py
```

## Human Label Format

Use `ml/recruiter_labels_template.csv` as the starting point:

```csv
candidate_id,label,notes
CAND_0071974,strong_fit,Production retrieval and ranking proof
CAND_0044855,maybe,Good ML background but weaker retrieval proof
CAND_0000001,not_fit,Wrong role family
```

Supported labels:

- `strong_fit`, `interview`, `hire` => positive
- `maybe`, `review` => medium
- `not_fit`, `reject` => negative

## Why This Helps The Hackathon Story

This gives Sifter a real learned layer:

- learned reward/reranker model
- optional DPO preference model for rank explanations
- train/validation split
- validation metrics
- deployable Hugging Face model
- deployable Hugging Face Space
- human feedback path for improving beyond the original heuristic ranker

The public Hugging Face model card source is maintained in:

```text
ml/huggingface_model_card.md
```

It documents the revised model's human-reviewed training data, split, label scale, metrics, limitation, and Sifter backend integration path. Upload it with `ml/update_hf_model_card.py` after Hugging Face auth is available.

The honest phrasing is:

> Sifter uses deterministic ranking for the full 100,000 candidate offline run, then trains a learned reward/reranker from recruiter preference data and bootstrapped rankings. As recruiter labels are added, the learned model replaces more of the hand-tuned scoring.
