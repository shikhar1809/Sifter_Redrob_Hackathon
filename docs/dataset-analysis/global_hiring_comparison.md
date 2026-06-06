# Global Hiring Dataset Comparison

This analysis compares Redrob's challenge data with public hiring/resume datasets to identify hiring signals that generalize beyond the challenge file.

![Global hiring signal map](visuals/global_hiring_signal_map.svg)

## External Datasets Used

| Source | Why used |
| --- | --- |
| [https://huggingface.co/datasets/ranaatef/Resume-Screening-Dataset](https://huggingface.co/datasets/ranaatef/Resume-Screening-Dataset) | MIT-licensed Hugging Face resume screening dataset with role, resume, select/reject decision, decision reason, and job description. |
| [https://huggingface.co/datasets/Divyaamith/Kaggle-Resume](https://huggingface.co/datasets/Divyaamith/Kaggle-Resume) | Hugging Face mirror of Kaggle resume examples, 2,484 resumes with category labels and resume text. |
| [https://github.com/duyet/skill2vec-dataset](https://github.com/duyet/skill2vec-dataset) | MIT-licensed Skill2vec job-description skill co-occurrence data collected from job descriptions. |

Raw external CSVs are kept local under `data/external-hiring/` and are gitignored. The scripts and summarized findings are committed so the analysis stays reproducible without publishing large third-party files.

## Hidden Redrob Patterns

The deeper Redrob scan groups candidates into review buckets rather than only score buckets:

- low_signal: `92260`
- keyword_trap: `3692`
- generic_adjacent: `3060`
- services_only_risk: `578`
- cv_speech_mismatch: `252`
- strong_fit: `101`
- good_but_logistics_risk: `28`
- consistency_trap: `21`
- hidden_fit: `8`

## Global Dataset Findings

### Resume Screening Dataset

- Rows: `10174`
- Decisions: reject (`5114`); select (`5060`)
- Top selected roles: Data Scientist (`277`); Software Engineer (`250`); Product Manager (`224`); Data Engineer (`205`); UI Engineer (`183`); Data Analyst (`170`); data engineer (`148`); product manager (`147`); software engineer (`140`); E-commerce Specialist (`138`)
- Decision-reason themes: experience (`4328`); leadership (`1430`); senior (`1415`); technical (`1038`); communication (`866`); system design (`739`); needs improvement in machine learning algorithms. (`707`); full-stack (`677`); perfectly aligned with data engineering needs. (`668`); cultural fit (`173`)

### Kaggle Resume Mirror

- Rows: `2484`
- Categories: INFORMATION-TECHNOLOGY (`120`); BUSINESS-DEVELOPMENT (`120`); ADVOCATE (`118`); CHEF (`118`); FINANCE (`118`); ENGINEERING (`118`); ACCOUNTANT (`118`); FITNESS (`117`); AVIATION (`117`); SALES (`116`); HEALTHCARE (`115`); CONSULTANT (`115`)
- Section presence: education (`2462`); skills (`2459`); experience (`2429`); summary (`1904`); accomplishments (`963`); certifications (`395`)

### Skill2vec Job-Skill Dataset

- Skill clusters: `10000`
- Cluster size: mean `9.3376`, median `9.0`, p95 `24.0`
- Redrob role terms found globally: python (`184`); rag (`109`); docker (`11`); information retrieval (`10`); elasticsearch (`8`); lora (`2`); semantic search (`2`); recommendation systems (`1`)

## What Is Common Across Redrob And Global Data

| Pattern | Redrob Evidence | Global Evidence | How Sifter Should Apply It |
| --- | --- | --- | --- |
| Role context beats skill count | The Redrob docs warn about keyword stuffers; the audit found 1,706 keyword-stuffer shapes and 3,077 nontechnical-title profiles with many AI skills. | The resume-screening dataset contains select/reject decisions where reasons often cite missing leadership, system design, or backend experience rather than raw skill volume. | Keep Sifter's title/career evidence gate before skill boosts. Candidate skills should only score strongly when the career story supports them. |
| Production and ownership language is a stronger signal than buzzwords | Only 505 Redrob candidates show repeated career IR/search/ranking evidence, while generic production language is common. | Global resumes frequently include broad skills, but selected/rejected decisions repeatedly reference applied leadership, full-stack/backend/system design, and practical delivery themes. | Boost shipped systems, ownership, evaluation, monitoring, scale, and A/B/testing terms. Keep generic AI terms as weak evidence. |
| Sparse public-footprint signals should not be hard filters | Median GitHub activity is -1, so many candidates have no linked GitHub even when other evidence exists. | Global resume datasets often omit external profile links or include inconsistent contact/public-footprint sections. | Use GitHub/public activity as a bonus only, never a rejection condition. |
| Availability changes hireability but can become bias | Median recruiter response rate is 0.44, median notice period is 90 days, and only 35.3% are open to work. | External resume datasets focus on fit text and often lack availability fields, so behavior is valuable but not universally available. | Use response rate, notice, relocation, and activity as capped multipliers and show them separately in explanations. |
| Review data must include negatives and traps | Honeypots and trap-shaped profiles are explicitly part of the challenge. | The resume-screening dataset has explicit select/reject labels and decision reasons, proving training data should include both good and bad examples. | The candidate review set includes strong fits, maybes, hidden fits, logistics risks, and trap candidates so retraining learns boundaries. |

## Candidate Review Set

Created `C:/Users/royal/Desktop/Archieve/Swifter/docs/dataset-analysis/redrob_candidate_review_set.csv` with `180` candidates for manual review before retraining.

Bucket mix:
- strong_fit: `55`
- keyword_trap: `30`
- good_but_logistics_risk: `25`
- services_only_risk: `20`
- generic_adjacent: `17`
- cv_speech_mismatch: `15`
- consistency_trap: `10`
- hidden_fit: `8`

Suggested label mix:
- strong_fit: `63`
- maybe: `62`
- not_fit: `55`

## App Changes These Findings Suggest

1. Add a visible `data confidence` label per candidate: strong evidence, hidden fit, logistics risk, or trap risk.
2. Show `why not just keywords` in candidate info when skills are high but career/title evidence is weak.
3. Keep GitHub and platform activity as bonus/caution signals, not hard filters.
4. Collect recruiter feedback using the review set, then retrain the Hugging Face reranker on reviewed labels.
5. Add separate score components for global-transferable patterns: role consistency, production ownership, and evidence consistency.