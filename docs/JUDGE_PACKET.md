# Sifter Judge Packet

This file is the quick evidence trail for the Redrob challenge prompt. It maps the problem statement directly to what is implemented, measured, and submitted.

## One-Line Verdict

Sifter is a full-pool, explainable AI hiring ranker that processes all `100,000` Redrob candidates, produces a validator-ready top-100 CSV, explains every rank, checks bias proxies, and backs the ranking with human-reviewed validation plus a fine-tuned Hugging Face reranker.

## Prompt-To-Proof Map

| Prompt requirement | Sifter proof |
| --- | --- |
| Read a job description and understand what the role needs | The Senior AI Engineer role is decomposed into retrieval, ranking, evaluation, embeddings/vector search, production ML, Python, and ownership signals. These are scored separately instead of counted as raw words. |
| Look at the full picture | The ranker uses profile text, skills, career history, experience, production proof, ranking/evaluation depth, behavioral signals, availability, salary/work-mode feasibility, and consistency checks. |
| Rank candidates like a strong recruiter | The scoring rewards job evidence first, then production proof and career coherence, with capped logistics/behavior signals. Each candidate has a plain-English reason and score breakdown. |
| Avoid keyword-filter failure | Human-reviewed validation compares Sifter against keyword-only matching. Sifter shows `1.36x` stronger Top-25 strong-fit recall than keyword-only and `0.7989` Spearman against reviewed labels. |
| Deliver a shortlist recruiters can trust | The output includes rank, score, reason, evidence, concerns, bias guardrail, reviewer-agent questions, and candidate info dialogs for exact rank reasoning. |
| Build something real | The app is deployed on Firebase, the model is deployed on Hugging Face Space, and the repo contains the full ranking pipeline, validation scripts, generated reports, and final CSV. |

## Evidence Metrics

| Evidence | Result |
| --- | ---: |
| Full candidate pool processed | `100,000` |
| Public candidate pages generated | `1,000` pages, `100` candidates per page |
| Final submission rows | `100` |
| Human-reviewed validation examples | `180` |
| Reviewed labels | `46 strong_fit`, `58 maybe`, `76 not_fit` |
| Sifter reviewed-set Spearman | `0.7989` |
| Sifter NDCG@25 | `0.8740` |
| Keyword-only Top-25 strong-fit recall | `30.4%` |
| Sifter Top-25 strong-fit recall | `41.3%` |
| Sifter lift over keyword-only | `1.36x` |
| Fine-tuned model validation Spearman | `0.7526` |

## Metric Reconciliation

The two Spearman values are not conflicting claims:

| Metric | Scope | Value |
| --- | --- | ---: |
| Fine-tuned model Spearman | Hugging Face reranker alone, measured on its reviewed validation split | `0.7526` |
| Sifter system Spearman | Full hybrid ranker, measured on the 180-candidate reviewed validation set | `0.7989` |

The first number answers: "Did the trained model learn a useful job-candidate fit signal?" The second answers: "Does the complete Sifter ranking system agree with reviewed labels?"

## Reviewed-Set Ablation

| Signal | Balanced Score | Spearman | NDCG@25 | Top-25 Strong-Fit Recall |
| --- | ---: | ---: | ---: | ---: |
| Keyword baseline | `0.5939` | `0.5218` | `0.7155` | `30.4%` |
| Behavioral shortcut | `0.6380` | `0.4723` | `0.8553` | `41.3%` |
| Production evidence | `0.7002` | `0.6327` | `0.8268` | `41.3%` |
| Sifter hybrid ranker | `0.8002` | `0.7989` | `0.8740` | `41.3%` |

This makes the baseline comparison inspectable: Sifter does not only claim to beat keyword filters; it records the reviewed-set comparison and ships the script that generates it.

The repeated `41.3%` Top-25 recall is expected: those methods all catch the same obvious strong-fit candidates inside the first 25. Sifter's improvement is in rank ordering and list quality, which is why Spearman and NDCG@25 increase even when Top-25 recall ties.

## What Makes It Different

Most hiring demos stop at “score + table.” Sifter has four extra layers:

1. **Data-first design:** the Redrob dataset was profiled before ranking logic was finalized.
2. **Scale-first execution:** the 100,000-candidate file is ranked through batch tournament processing instead of pretending a browser should load everything raw.
3. **Trust-first output:** every candidate has an exact reason, evidence, concerns, and score components.
4. **Review-informed loop:** recruiter-reviewed labels train a Hugging Face reranker, and recruiter feedback in the UI is structured as strong fit / maybe / not fit for future training.

## Bias And Fairness Position

Sifter does not claim impossible fairness. The Redrob data does not include protected demographic labels, so protected-class parity cannot be proven on this dataset.

What Sifter does implement:

- does not use name, anonymized name, school prestige, education tier, or language as scoring boosts;
- caps location, response rate, notice period, salary, and availability signals;
- applies proxy guardrails when logistics/behavior would lift weak job evidence;
- shows bias audit output in the UI instead of hiding it;
- keeps human review in the loop for compliance-sensitive decisions.

## Model Position

Sifter uses a hybrid architecture:

1. **Deterministic evidence ranker** for full-pool scale and transparent reasons.
2. **Fine-tuned Hugging Face reranker** for learned finalist judgment.
3. **Reviewer-agent layer** to cross-question the top result from hiring, interview, operations, and compliance perspectives.

The model is not just a model-card link. It is served through a Hugging Face Docker/FastAPI Space and wired into the backend learned-reranking path.

## Reproducibility

Key files:

| File | Purpose |
| --- | --- |
| `redrob_submission.csv` | Final ranked output file |
| `apps/web/public/redrob-challenge-result.json` | Live app Redrob result asset with validation and learned-rerank metadata |
| `docs/validation/sifter_review_validation.md` | Human-reviewed validation report |
| `docs/dataset-analysis/validate_sifter_review_set.py` | Reproducible validation script |
| `docs/dataset-analysis/redrob_dataset_analysis.md` | Structural Redrob data analysis |
| `docs/research-backed-decisions.md` | Research and product decision map |
| `ml/hf_space` | Hugging Face Space model-serving app |

Main checks run before this packet:

```bash
npm run typecheck
npm run build
python docs/dataset-analysis/validate_sifter_review_set.py
```

## Remaining Honest Limitation

The only thing that would make the evidence stronger is an independent Redrob/recruiter-labeled hidden holdout set with multiple annotators. Since the challenge does not provide one, Sifter includes its own transparent human-reviewed validation set and clearly labels it as project validation, not an official leaderboard.
