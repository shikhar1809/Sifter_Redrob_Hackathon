# Research-Backed Product Decisions

This document explains why Sifter makes each major ranking decision. It separates three things:

- **External research:** papers, official guidance, and public technical references.
- **Redrob dataset facts:** measured directly from `Challenge/[PUB] India_runs_data_and_ai_challenge/India_runs_data_and_ai_challenge/candidates.jsonl`.
- **Implementation:** what the repo actually does today.

## Redrob Dataset Facts

Measured locally from the released challenge file:

| Fact | Value |
| --- | ---: |
| Candidate records | `100,000` |
| Raw JSONL size | `464.7 MB` |
| Average experience | `7.17 years` |
| Average skills per candidate | `9.6` |
| India candidates | `75,113` |
| USA candidates | `9,978` |
| Hybrid work preference | `25,076` |
| Onsite work preference | `25,000` |
| Flexible work preference | `25,000` |
| Remote work preference | `24,924` |

Signal coverage:

| Signal | Coverage |
| --- | ---: |
| Recruiter response rate | `100,000 / 100,000` |
| Average response time | `100,000 / 100,000` |
| Saved by recruiters | `100,000 / 100,000` |
| Interview completion rate | `100,000 / 100,000` |
| Open to work | `100,000 / 100,000` |
| Notice period | `100,000 / 100,000` |
| Salary range | `100,000 / 100,000` |
| GitHub activity | `35,363 / 100,000` |
| Skill assessment scores | `24,244 / 100,000` |
| Offer acceptance rate | `40,446 / 100,000` |

**Decision from the data:** GitHub activity, skill assessments, and offer acceptance cannot be hard filters because they are incomplete. Behavioral signals can help, but they are capped so they do not overpower job-fit evidence.

## Decision 1: Hybrid Semantic Ranking, Not Keyword Filters

**Research:** IBM Research's resume-job matching work used a deep Siamese architecture for semantic resume/JD matching and reported better results than prior approaches on millions of resume-job pairs:  
https://research.ibm.com/publications/matching-resumes-to-jobs-via-deep-siamese-network

**Challenge evidence:** The Redrob JD explicitly asks for a v2 ranking system using embeddings, hybrid retrieval, and probably LLM-based re-ranking. It also says the person must own ranking, retrieval, and matching systems.

**Implementation:** Sifter now uses a hybrid local ranker:

- Semantic concept fit across retrieval, ranking, evaluation, production ML, shipping ownership, and LLM depth.
- Normalized JD/profile vector similarity so a candidate can match related language even when exact words differ.
- Structured skill evidence from profile text, career history, skills, and assessments.
- Production proof from shipped/deployed/owned/monitored systems.
- Recruiter-learning fit that favors the signals a strong recruiter would reward after reviewing profiles: production proof, ranking/evaluation depth, role evidence, and vector fit.
- Redrob behavioral signals as capped modifiers.
- Penalties for weak or suspicious evidence.
- Proxy guardrails when logistics or behavior would lift a weak technical profile.

The full challenge path remains CPU-only and network-off. For model-backed environments, the API/CLI also includes an optional Transformers.js reranker using `Xenova/all-MiniLM-L6-v2` over the final winner pool.

## Decision 2: Keep Ranking CPU-Only And Network-Off

**Challenge evidence:** `submission_spec.docx` says ranking must run CPU-only, without external network calls, within the challenge constraints.

**Implementation:** The full Redrob ranker runs locally through:

```bash
npm run challenge:rank -- --input "Challenge/[PUB] India_runs_data_and_ai_challenge/India_runs_data_and_ai_challenge/candidates.jsonl" --output redrob_submission.csv --batches 10 --merge-size 2
```

No hosted LLM call is required for the Redrob challenge ranking path.

## Decision 3: Batch Tournament For Large Files

**Dataset evidence:** The Redrob candidate file is `464.7 MB`, too large for a browser-first upload/rank path.

**Implementation:** Sifter splits `100,000` candidates into `10` initial batches, ranks them in parallel workers, merges winners in pairwise rounds, and creates a final top-100 list.

This keeps the live app lightweight while still proving the full dataset was processed.

## Decision 4: Add Vector Matching Without Breaking The 100k Demo

**Research:** FAISS demonstrates large-scale vector similarity search, including billion-scale search work:  
https://arxiv.org/abs/1702.08734

**Research:** HNSW is a graph-based approximate nearest-neighbor method widely used for scalable vector retrieval:  
https://arxiv.org/abs/1603.09320

**Implementation today:** Sifter computes a normalized vector similarity score between the Senior AI Engineer JD and each candidate profile, blends it into the final score, and exposes it in every candidate info dialog. The hosted demo serves all `100,000` ranked candidates as static 100-candidate pages with direct page jump and page-level search.

**Production plan:** Move global candidate search to an indexed backend using BM25 plus embeddings and an ANN index such as HNSW/FAISS-style retrieval.

## Decision 4b: Use Review-Informed Evidence And Prepare A Feedback Loop

**Product evidence:** Recruiters do not only want a one-time rank. They want to mark "strong fit", "maybe", or "not fit" and have the system get sharper from those review decisions.

**Implementation today:** Sifter includes a review-informed evidence score in the hybrid ranker. It rewards the profile patterns that appeared repeatedly in reviewed strong fits: production proof, ranking/evaluation depth, role evidence, vector fit, and realistic logistics. The UI also includes local feedback buttons in the candidate info dialog. Those judgments are stored locally for future training and review workflows; they do not currently retrain the model instantly inside the browser.

**Production plan:** Sync feedback to a team workspace, learn per-role weight adjustments from interview/hire/reject outcomes, and keep an audit log showing how feedback changed future scoring.

## Decision 5: Use Skills Taxonomies As The Future Normalization Layer

**Official sources:** O*NET describes occupations by knowledge, skills, abilities, tasks, and work activities:  
https://www.dol.gov/agencies/eta/onet

**Official sources:** ESCO is the European Commission classification for occupations and skills, with API access and skill/occupation concepts:  
https://esco.ec.europa.eu/en/use-esco/use-esco-services-api/esco-web-service-api

**Implementation today:** The challenge ranker uses Redrob JD-specific concept groups because the task is one released role.

**Production plan:** Normalize skills through O*NET/ESCO-like concepts so "front-end engineer with JS frameworks" can connect to "React developer" without relying on exact words.

## Decision 6: Explain Every Rank

**Challenge evidence:** `submission_spec.docx` strongly recommends a 1-2 sentence explanation and says reasoning is used in manual review.

**Implementation:** Every Redrob row includes:

- `candidate_id`
- `rank`
- `score`
- `reasoning`
- internal score breakdown in the app asset
- evidence list
- concerns

CSV export still follows the official required columns.

## Decision 7: Bias Guardrails Are Mandatory, Not Decoration

**Official guidance:** NIST AI RMF frames trustworthy AI around validity, reliability, transparency, explainability, privacy, and harmful-bias management:  
https://www.nist.gov/itl/ai-risk-management-framework

**Official guidance:** EEOC materials warn that software, algorithms, and AI used in employment decisions must comply with civil rights laws, including ADA and Title VII concerns:  
https://www.eeoc.gov/eeoc-disability-related-resources/artificial-intelligence-and-ada  
https://www.eeoc.gov/laws/guidance/employment-tests-and-selection-procedures

**Official law reference:** NYC Local Law 144 requires bias audits before certain automated employment decision tools are used in covered hiring contexts:  
https://home4.nyc.gov/site/dca/about/automated-employment-decision-tools.page

**Implementation:** Sifter:

- Excludes names, anonymized names, school prestige, education tier, and language from scoring boosts.
- Caps location, availability, and behavioral signals.
- Applies a proxy guardrail when behavioral/logistics lift is not backed by job evidence.
- Audits observable proxy groups such as country, work mode, experience band, and notice period.
- States the limitation clearly: the Redrob file does not provide protected demographic labels, so the system cannot prove protected-class parity on that dataset.

## Decision 8: Measure The Ranker With Ablations

**Research basis:** Information retrieval systems are usually evaluated by comparing ranked outputs, often through metrics and ablations. Because the challenge does not release a hidden ground-truth label set, Sifter records explainable control comparisons instead.

**Implementation:** `createRedrobEvaluationReport` compares:

- `keyword_baseline`: exact JD term overlap.
- `semantic_concept_matcher`: local semantic JD concept fit.
- `vector_similarity_reranker`: JD/profile vector similarity.
- `hybrid_ranker`: final ranking system.

The generated report includes top-100 overlap, average score, average semantic fit, production proof, and behavioral signal contribution.

## Decision 9: Validate Against Human Review, Not Only Internal Scores

**Project evidence:** We created a `180`-candidate reviewed Redrob set with `46` strong fits, `58` maybes, and `76` not-fits. This gives the project a transparent validation layer instead of relying only on a polished top-100 table.

**Implementation:** `docs/dataset-analysis/validate_sifter_review_set.py` compares Sifter against keyword-only, behavior-only, and production-evidence baselines. It reports Spearman, NDCG@25, Top-K strong-fit recall, and a balanced validation score.

**Current result:** On the reviewed set, Sifter reaches `0.7989` Spearman, `0.8740` NDCG@25, and `1.36x` stronger Top-25 strong-fit recall than keyword-only matching. The standalone Hugging Face reranker has a separate `0.7526` Spearman on its own reviewed validation split; that number measures the model alone, not the full hybrid system.

**Limit:** This is a human-reviewed project validation set, not a hidden official Redrob leaderboard. It is still stronger evidence than claiming the shortlist is good without measurement.

## What Is Still Not Claimed

Sifter does **not** claim:

- Protected-class parity on Redrob, because protected-class labels are not present.
- A production ATS-grade global search backend yet.

Sifter **does** claim:

- Full `100,000` candidate processing.
- CPU-only, network-off ranking for the challenge.
- Hybrid semantic, vector, review-informed, and structured scoring.
- A fine-tuned Hugging Face reward/reranker model trained on reviewed Redrob examples.
- A live Hugging Face Docker/FastAPI Space used by the backend finalist-reranking path.
- Human-reviewed validation against keyword-only and behavior-only baselines.
- Explainable top-100 output.
- Bias-aware guardrails with visible limitations.
- Research-backed product decisions documented in this repo.
