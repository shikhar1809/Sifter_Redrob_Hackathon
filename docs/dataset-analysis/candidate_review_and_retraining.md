# Candidate Review And Retraining Result

The file `docs/dataset-analysis/redrob_candidate_review_set.csv` contains 180 candidates selected for human review.

The review is complete. Label mix:

- `strong_fit`: 46
- `maybe`: 58
- `not_fit`: 76

Label provenance is explicit in the CSV:

- `annotator`: `project_reviewer` for all 180 rows
- `label_source`: `project_human_review` for all 180 rows
- `review_round`: `reviewed_model_v1` for all 180 rows

This does not turn the review set into a multi-annotator panel. It makes the single-reviewer source auditable and gives the next reviewer a clean place to add independent labels.

## Blind Technical-Recruiter Holdout

A technical recruiter independently reviewed 50 candidates from the review set without seeing Sifter rank, Sifter score, suggested labels, or the project reviewer label.

- Holdout examples: 50
- Technical-recruiter labels: 8 `strong_fit`, 21 `maybe`, 21 `not_fit`
- Exact agreement with project reviewer: 84.0%
- Near-or-exact agreement: 100.0%
- Cohen's kappa: 0.7568
- Sifter Spearman on the technical-recruiter holdout: 0.9796
- Keyword Spearman on the technical-recruiter holdout: 0.4992

The holdout labels are not used for training. They are an independent check that Sifter's ranking agrees with a second technical recruiting judgment source.

The reviewed labels were converted into model-training labels with:

```bash
python ml/convert_review_set_to_labels.py --input docs/dataset-analysis/redrob_candidate_review_set.csv --output data/redrob-reviewed-labels.csv
```

The clean reviewed reranker dataset was prepared with:

```bash
python ml/prepare_redrob_preference_data.py --candidates "Challenge/[PUB] India_runs_data_and_ai_challenge/India_runs_data_and_ai_challenge/candidates.jsonl" --candidate-pages-dir apps/web/public/redrob-candidate-pages --labels-csv data/redrob-reviewed-labels.csv --out-dir data/redrob-reranker-reviewed --only-labeled --max-records 100000
```

Dataset split:

- train records: 166
- validation records: 14
- recruiter-labeled records: 180
- weak-labeled records: 0

The revised model was trained in Google Colab with:

```bash
python ml/train_reward_reranker_colab.py --data-dir data/redrob-reranker-reviewed --base-model distilbert-base-uncased --output-dir outputs/sifter-redrob-reranker-reviewed --hub-model-id shikharshahi/sifter-redrob-reranker --epochs 3 --batch-size 8 --learning-rate 2e-5 --max-length 256 --precision fp32 --push-to-hub
```

Validation result:

| Metric | Value |
| --- | ---: |
| Validation loss | `0.0443` |
| RMSE | `0.2104` |
| MAE | `0.1884` |
| Spearman rank correlation | `0.7526` |

Why this matters: the model now learns from human-reviewed candidate decisions instead of only Sifter's weak labels.
