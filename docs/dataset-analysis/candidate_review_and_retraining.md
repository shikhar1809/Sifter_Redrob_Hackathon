# Candidate Review And Retraining Plan

The file `docs/dataset-analysis/redrob_candidate_review_set.csv` contains 180 candidates selected for human review.

Fill `reviewer_label` with one of:

- `strong_fit`
- `maybe`
- `not_fit`

Optional: add notes in `reviewer_notes`.

After review, convert the labels into model training labels:

```bash
python ml/convert_review_set_to_labels.py --input docs/dataset-analysis/redrob_candidate_review_set.csv --output data/redrob-reviewed-labels.csv
```

Then prepare the reranker dataset from the reviewed labels:

```bash
python ml/prepare_redrob_preference_data.py --candidates "Challenge/[PUB] India_runs_data_and_ai_challenge/India_runs_data_and_ai_challenge/candidates.jsonl" --candidate-pages-dir apps/web/public/redrob-candidate-pages --labels-csv data/redrob-reviewed-labels.csv --out-dir data/redrob-reranker-reviewed --max-records 10000
```

Then retrain:

```bash
python ml/train_reward_reranker_colab.py --data-dir data/redrob-reranker-reviewed --base-model distilbert-base-uncased --output-dir outputs/sifter-redrob-reranker-reviewed --hub-model-id shikharshahi/sifter-redrob-reranker --epochs 2 --batch-size 8 --learning-rate 2e-5 --precision fp32 --push-to-hub
```

Why wait for review: training immediately on suggested labels would still be self-labeling. The score jump judges care about comes from independent human labels.
