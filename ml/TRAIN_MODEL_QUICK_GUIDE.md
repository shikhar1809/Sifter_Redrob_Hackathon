# Train A Sifter Model Again

This is the simple version of how to train and upload the Sifter reranker model again in Google Colab.

## What Happened

You trained a small Hugging Face model that learns how well a candidate fits a job.

In plain English:

1. Sifter reads candidate profiles.
2. It turns them into training examples.
3. The model studies those examples.
4. The model learns to give a fit score.
5. Colab uploads the trained model to Hugging Face automatically.

The upload happened because the training command used:

```bash
--push-to-hub
```

and because you logged in with a Hugging Face write token.

## What You Need

- Google Colab with GPU runtime.
- The GitHub repo.
- The Redrob `candidates.jsonl` file in Google Drive.
- A Hugging Face account.
- A Hugging Face token with write access.

## Step 1: Open Colab With GPU

In Colab, go to:

```text
Runtime -> Change runtime type -> GPU
```

T4 GPU is enough for the quick version.

## Step 2: Get The Code

Run:

```python
%cd /content
![ -d Sifter_Redrob_Hackathon ] || git clone https://github.com/shikhar1809/Sifter_Redrob_Hackathon.git
%cd /content/Sifter_Redrob_Hackathon
!git pull
```

## Step 3: Install Training Tools

Run:

```python
!pip install -q "transformers>=4.41" "datasets>=2.19" "accelerate>=0.30" "sentencepiece" "protobuf" "scikit-learn>=1.5,<1.9" "scipy" "huggingface_hub"
```

## Step 4: Connect Google Drive

Run:

```python
from google.colab import drive
drive.mount("/content/drive")
```

## Step 5: Find The Candidate File

Run:

```python
!find /content/drive/MyDrive -name "candidates.jsonl" | head -20
```

Copy the path it prints.

Example:

```text
/content/drive/MyDrive/redrob/candidates.jsonl
```

## Step 6: Login To Hugging Face

Run:

```python
from huggingface_hub import notebook_login
notebook_login()
```

Paste a Hugging Face token with write access.

Use a fine-grained token if Hugging Face asks. It needs repository write access so Colab can upload the model.

## Step 7: Train And Upload

Run this cell:

```python
HF_USERNAME = "shikharshahi"
MODEL_ID = f"{HF_USERNAME}/sifter-redrob-reranker"

import glob
import os
import subprocess

CANDIDATES = "/content/drive/MyDrive/redrob/candidates.jsonl"
if not os.path.exists(CANDIDATES):
    matches = glob.glob("/content/drive/MyDrive/**/candidates.jsonl", recursive=True)
    if not matches:
        raise FileNotFoundError("Could not find candidates.jsonl in Google Drive.")
    CANDIDATES = matches[0]

print(f"Using candidate file: {CANDIDATES}")

subprocess.run([
    "python", "ml/prepare_redrob_preference_data.py",
    "--candidates", CANDIDATES,
    "--candidate-pages-dir", "apps/web/public/redrob-candidate-pages",
    "--labels-csv", "ml/recruiter_labels_template.csv",
    "--out-dir", "data/redrob-reranker",
    "--max-records", "2000",
    "--seed", "42",
], check=True)

subprocess.run([
    "python", "ml/train_reward_reranker_colab.py",
    "--data-dir", "data/redrob-reranker",
    "--base-model", "distilbert-base-uncased",
    "--output-dir", "outputs/sifter-redrob-reranker",
    "--hub-model-id", MODEL_ID,
    "--epochs", "1",
    "--batch-size", "8",
    "--learning-rate", "2e-5",
    "--precision", "fp32",
    "--push-to-hub",
], check=True)
```

## Step 8: Check That It Worked

In Colab:

```python
!ls outputs/sifter-redrob-reranker
```

You should see files like:

```text
config.json
model.safetensors
tokenizer.json
eval_metrics.json
```

Then open:

```text
https://huggingface.co/shikharshahi/sifter-redrob-reranker
```

If the model files are there, training and upload worked.

## What The Numbers Mean

During training, you may see:

```text
eval_rmse
eval_mae
eval_spearman
```

Layman meaning:

- `eval_rmse`: how far off the model's score is. Lower is better.
- `eval_mae`: average mistake size. Lower is better.
- `eval_spearman`: how well the model orders candidates. Higher is better.

For `eval_spearman`:

- `0.0` means useless ordering.
- `0.5` means decent signal.
- `0.75+` means strong ranking signal for a first pass.
- `1.0` means perfect ordering.

## Quick Model vs Strong Model

The quick version uses:

```text
2,000 candidates
distilbert-base-uncased
1 epoch
```

This is meant to finish in Colab.

For a stronger later run, try:

```text
10,000 or 50,000 candidates
microsoft/deberta-v3-small
1-2 epochs
```

That will be slower and may need a better GPU.

## If Colab Gets Stuck

Do not wait forever.

If the same progress number does not move for 15 minutes:

1. Stop the cell.
2. Reduce `--max-records`.
3. Use `distilbert-base-uncased`.
4. Keep `--precision fp32`.

For a very fast smoke test, use:

```text
--max-records 500
```

## Important Honest Note

This model is trained from Sifter's bootstrapped ranking plus optional recruiter labels. That means it is a real learned reranker, but the best future version needs more human recruiter feedback.

The improvement loop is:

1. Recruiter reviews candidates.
2. Recruiter marks strong fit, maybe, or not fit.
3. Those labels go into `ml/recruiter_labels_template.csv`.
4. Train again.
5. The model becomes less hand-tuned and more recruiter-learned over time.
