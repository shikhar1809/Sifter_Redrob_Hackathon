#!/usr/bin/env python3
"""Compare Redrob with public hiring/resume datasets and build a review set.

External source files are expected locally under data/external-hiring:
- hf_resume_screening_dataset.csv
- hf_kaggle_resume.csv
- skill2vec_10K.csv

The raw external files are intentionally gitignored. This script writes small,
committable analysis artifacts under docs/dataset-analysis.
"""

from __future__ import annotations

import csv
import json
import math
import re
from collections import Counter, defaultdict
from pathlib import Path
from statistics import mean
from typing import Any, Iterable

import importlib.util


ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "docs" / "dataset-analysis"
EXTERNAL_DIR = ROOT / "data" / "external-hiring"
REVIEW_PATH = OUT_DIR / "redrob_candidate_review_set.csv"
GLOBAL_JSON = OUT_DIR / "global_hiring_comparison.json"
GLOBAL_MD = OUT_DIR / "global_hiring_comparison.md"
RETRAINING_NOTE = OUT_DIR / "candidate_review_and_retraining.md"
GLOBAL_VISUAL = OUT_DIR / "visuals" / "global_hiring_signal_map.svg"

spec = importlib.util.spec_from_file_location("redrob_analysis", OUT_DIR / "analyze_redrob_dataset.py")
redrob = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(redrob)


REDROB_CANDIDATES = ROOT / "Challenge/[PUB] India_runs_data_and_ai_challenge/India_runs_data_and_ai_challenge/candidates.jsonl"
PROFILE_JSON = OUT_DIR / "redrob_dataset_profile.json"

SOURCE_NOTES = {
    "hf_resume_screening": {
        "path": EXTERNAL_DIR / "hf_resume_screening_dataset.csv",
        "url": "https://huggingface.co/datasets/ranaatef/Resume-Screening-Dataset",
        "description": "MIT-licensed Hugging Face resume screening dataset with role, resume, select/reject decision, decision reason, and job description.",
    },
    "hf_kaggle_resume": {
        "path": EXTERNAL_DIR / "hf_kaggle_resume.csv",
        "url": "https://huggingface.co/datasets/Divyaamith/Kaggle-Resume",
        "description": "Hugging Face mirror of Kaggle resume examples, 2,484 resumes with category labels and resume text.",
    },
    "skill2vec": {
        "path": EXTERNAL_DIR / "skill2vec_10K.csv",
        "url": "https://github.com/duyet/skill2vec-dataset",
        "description": "MIT-licensed Skill2vec job-description skill co-occurrence data collected from job descriptions.",
    },
}

GLOBAL_TERMS = {
    "retrieval_search": [
        "retrieval",
        "search",
        "ranking",
        "recommendation",
        "recommendations",
        "vector",
        "embedding",
        "embeddings",
        "semantic",
        "elasticsearch",
        "opensearch",
        "faiss",
        "pinecone",
        "qdrant",
        "milvus",
        "weaviate",
        "bm25",
    ],
    "evaluation": ["ndcg", "mrr", "map", "a/b", "ab test", "experiment", "evaluation", "metrics", "benchmark"],
    "production": ["production", "deployed", "scale", "latency", "monitoring", "pipeline", "platform", "serving", "on-call"],
    "leadership": ["lead", "owned", "mentor", "stakeholder", "cross-functional", "architecture", "strategy"],
    "generic_ai": ["ai", "ml", "machine learning", "llm", "chatgpt", "prompt", "langchain", "deep learning"],
    "availability": ["available", "relocate", "notice", "response", "interview", "offer"],
}


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    global_summary = {
        "sources": SOURCE_NOTES,
        "redrob_hidden_patterns": analyze_redrob_hidden_patterns(),
        "external": analyze_external_sources(),
    }
    global_summary["common_patterns"] = derive_common_patterns(global_summary)
    review_rows = build_review_set(global_summary)
    global_summary["candidate_review_set"] = summarize_review_set(review_rows)

    GLOBAL_JSON.write_text(json.dumps(to_jsonable(global_summary), indent=2), encoding="utf-8")
    GLOBAL_MD.write_text(render_global_markdown(global_summary), encoding="utf-8")
    write_review_csv(review_rows)
    RETRAINING_NOTE.write_text(render_retraining_note(), encoding="utf-8")
    render_global_visual(global_summary)
    print(json.dumps({"review_candidates": len(review_rows), "report": str(GLOBAL_MD), "visual": str(GLOBAL_VISUAL)}, indent=2))


def analyze_redrob_hidden_patterns() -> dict[str, Any]:
    profile = json.loads(PROFILE_JSON.read_text(encoding="utf-8"))
    top100_ids = read_submission_ids()
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    counters: dict[str, Counter] = defaultdict(Counter)
    numeric: dict[str, list[float]] = defaultdict(list)
    cooccurrence = Counter()

    for candidate in redrob.stream_candidates(REDROB_CANDIDATES):
        features = candidate_features(candidate)
        cid = features["candidate_id"]
        bucket = assign_bucket(features)

        counters["bucket"][bucket] += 1
        counters["title_by_bucket"][f"{bucket}::{features['title']}"] += 1
        counters["country_by_bucket"][f"{bucket}::{features['country']}"] += 1
        numeric[f"{bucket}.score"].append(features["score"])
        numeric[f"{bucket}.must_have_skill_count"].append(features["must_have_skill_count"])
        numeric[f"{bucket}.career_ir_hint_count"].append(features["career_ir_hint_count"])
        numeric[f"{bucket}.production_hint_count"].append(features["production_hint_count"])
        numeric[f"{bucket}.response_rate"].append(features["response_rate"])
        numeric[f"{bucket}.notice_period_days"].append(features["notice_period_days"])

        for skill in features["skills_lower"]:
            if skill in redrob.ABSOLUTE_SKILLS or skill in redrob.NICE_SKILLS:
                cooccurrence[skill] += 1
        if cid in top100_ids:
            groups["current_top100"].append(features)
        if bucket in {
            "strong_fit",
            "hidden_fit",
            "good_but_logistics_risk",
            "keyword_trap",
            "consistency_trap",
            "cv_speech_mismatch",
            "services_only_risk",
        }:
            groups[bucket].append(features)

    return {
        "base_profile": profile,
        "bucket_counts": counters["bucket"].most_common(),
        "top_skill_evidence_terms": cooccurrence.most_common(30),
        "numeric_summary": {key: summarize(values) for key, values in numeric.items()},
        "examples": {key: slim_examples(sorted(value, key=lambda row: -row["score"])[:10]) for key, value in groups.items()},
    }


def analyze_external_sources() -> dict[str, Any]:
    return {
        "hf_resume_screening": analyze_resume_screening(SOURCE_NOTES["hf_resume_screening"]["path"]),
        "hf_kaggle_resume": analyze_kaggle_resume(SOURCE_NOTES["hf_kaggle_resume"]["path"]),
        "skill2vec": analyze_skill2vec(SOURCE_NOTES["skill2vec"]["path"]),
    }


def analyze_resume_screening(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"available": False, "message": f"Missing {path}"}
    decisions = Counter()
    roles = Counter()
    selected_roles = Counter()
    rejected_roles = Counter()
    reasons = Counter()
    term_counts = {key: Counter() for key in GLOBAL_TERMS}
    selected_term_counts = {key: Counter() for key in GLOBAL_TERMS}
    rejected_term_counts = {key: Counter() for key in GLOBAL_TERMS}
    role_decision = Counter()
    rows = 0

    with path.open("r", encoding="utf-8", errors="replace", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            rows += 1
            decision = normalize_text(row.get("Decision", "unknown"))
            role = (row.get("Role") or "").strip()
            resume = row.get("Resume") or ""
            jd = row.get("Job_Description") or ""
            reason = row.get("Reason_for_decision") or ""
            text = f"{role} {resume} {jd}".lower()
            decisions[decision] += 1
            roles[role] += 1
            role_decision[f"{role}::{decision}"] += 1
            for reason_key in reason_keywords(reason):
                reasons[reason_key] += 1
            if decision == "select":
                selected_roles[role] += 1
            elif decision == "reject":
                rejected_roles[role] += 1
            for category, terms in GLOBAL_TERMS.items():
                hits = sum(1 for term in terms if term in text)
                if hits:
                    term_counts[category][hits] += 1
                    if decision == "select":
                        selected_term_counts[category][hits] += 1
                    elif decision == "reject":
                        rejected_term_counts[category][hits] += 1

    select_rates = []
    for role, count in roles.items():
        selected = role_decision.get(f"{role}::select", 0)
        if count >= 20:
            select_rates.append((role, selected, count, selected / count))
    select_rates.sort(key=lambda item: item[3], reverse=True)

    return {
        "available": True,
        "source_url": SOURCE_NOTES["hf_resume_screening"]["url"],
        "rows": rows,
        "decisions": decisions.most_common(),
        "top_roles": roles.most_common(20),
        "top_selected_roles": selected_roles.most_common(20),
        "top_rejected_roles": rejected_roles.most_common(20),
        "decision_reason_themes": reasons.most_common(20),
        "highest_select_rate_roles_min20": select_rates[:20],
        "lowest_select_rate_roles_min20": sorted(select_rates, key=lambda item: item[3])[:20],
        "term_hit_summary": summarize_term_hits(term_counts, selected_term_counts, rejected_term_counts, rows, decisions),
    }


def analyze_kaggle_resume(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"available": False, "message": f"Missing {path}"}
    categories = Counter()
    term_counts = {key: Counter() for key in GLOBAL_TERMS}
    section_counts = Counter()
    rows = 0
    text_lengths = []
    technical_categories = {"INFORMATION-TECHNOLOGY", "ENGINEERING", "BUSINESS-DEVELOPMENT", "CONSULTANT"}
    category_term_hits = Counter()

    with path.open("r", encoding="utf-8", errors="replace", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            rows += 1
            category = (row.get("Category") or "").strip()
            text = (row.get("Resume_str") or "").lower()
            categories[category] += 1
            text_lengths.append(len(text))
            for section in ["summary", "experience", "skills", "education", "certifications", "accomplishments"]:
                if section in text:
                    section_counts[section] += 1
            for family, terms in GLOBAL_TERMS.items():
                hits = sum(1 for term in terms if term in text)
                if hits:
                    term_counts[family][hits] += 1
                    if category in technical_categories:
                        category_term_hits[f"{category}::{family}"] += hits

    return {
        "available": True,
        "source_url": SOURCE_NOTES["hf_kaggle_resume"]["url"],
        "rows": rows,
        "categories": categories.most_common(30),
        "resume_text_length": summarize(text_lengths),
        "section_presence": section_counts.most_common(),
        "term_hit_summary": {key: summarize_counter(counter, rows) for key, counter in term_counts.items()},
        "technical_category_term_hits": category_term_hits.most_common(30),
    }


def analyze_skill2vec(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"available": False, "message": f"Missing {path}"}
    rows = 0
    skill_counts = Counter()
    cluster_sizes = []
    anchor_cooccurrence = {anchor: Counter() for anchor in ["python", "search", "recommendation", "machine learning", "data", "java", "sales"]}
    redrob_terms_present = Counter()

    with path.open("r", encoding="utf-8", errors="replace", newline="") as handle:
        reader = csv.reader(handle)
        for row in reader:
            rows += 1
            skills = [clean_skill(cell) for cell in row[1:] if clean_skill(cell)]
            cluster_sizes.append(len(skills))
            skill_set = set(skills)
            for skill in skill_set:
                skill_counts[skill] += 1
            for anchor in anchor_cooccurrence:
                if any(anchor in skill for skill in skill_set):
                    for skill in skill_set:
                        if skill != anchor:
                            anchor_cooccurrence[anchor][skill] += 1
            for term in redrob.ABSOLUTE_SKILLS | redrob.NICE_SKILLS | redrob.EVAL_SKILLS:
                if any(normalize_text(term) == normalize_text(skill) or normalize_text(term) in normalize_text(skill) for skill in skill_set):
                    redrob_terms_present[term] += 1

    return {
        "available": True,
        "source_url": SOURCE_NOTES["skill2vec"]["url"],
        "rows": rows,
        "cluster_size": summarize(cluster_sizes),
        "top_skills": skill_counts.most_common(40),
        "redrob_role_terms_in_global_jd_clusters": redrob_terms_present.most_common(40),
        "anchor_cooccurrence": {anchor: counter.most_common(20) for anchor, counter in anchor_cooccurrence.items()},
    }


def derive_common_patterns(summary: dict[str, Any]) -> list[dict[str, str]]:
    return [
        {
            "pattern": "Role context beats skill count",
            "redrob": "The Redrob docs warn about keyword stuffers; the audit found 1,706 keyword-stuffer shapes and 3,077 nontechnical-title profiles with many AI skills.",
            "global": "The resume-screening dataset contains select/reject decisions where reasons often cite missing leadership, system design, or backend experience rather than raw skill volume.",
            "app": "Keep Sifter's title/career evidence gate before skill boosts. Candidate skills should only score strongly when the career story supports them.",
        },
        {
            "pattern": "Production and ownership language is a stronger signal than buzzwords",
            "redrob": "Only 505 Redrob candidates show repeated career IR/search/ranking evidence, while generic production language is common.",
            "global": "Global resumes frequently include broad skills, but selected/rejected decisions repeatedly reference applied leadership, full-stack/backend/system design, and practical delivery themes.",
            "app": "Boost shipped systems, ownership, evaluation, monitoring, scale, and A/B/testing terms. Keep generic AI terms as weak evidence.",
        },
        {
            "pattern": "Sparse public-footprint signals should not be hard filters",
            "redrob": "Median GitHub activity is -1, so many candidates have no linked GitHub even when other evidence exists.",
            "global": "Global resume datasets often omit external profile links or include inconsistent contact/public-footprint sections.",
            "app": "Use GitHub/public activity as a bonus only, never a rejection condition.",
        },
        {
            "pattern": "Availability changes hireability but can become bias",
            "redrob": "Median recruiter response rate is 0.44, median notice period is 90 days, and only 35.3% are open to work.",
            "global": "External resume datasets focus on fit text and often lack availability fields, so behavior is valuable but not universally available.",
            "app": "Use response rate, notice, relocation, and activity as capped multipliers and show them separately in explanations.",
        },
        {
            "pattern": "Review data must include negatives and traps",
            "redrob": "Honeypots and trap-shaped profiles are explicitly part of the challenge.",
            "global": "The resume-screening dataset has explicit select/reject labels and decision reasons, proving training data should include both good and bad examples.",
            "app": "The candidate review set includes strong fits, maybes, hidden fits, logistics risks, and trap candidates so retraining learns boundaries.",
        },
    ]


def build_review_set(summary: dict[str, Any], limit: int = 180) -> list[dict[str, Any]]:
    all_features = []
    for candidate in redrob.stream_candidates(REDROB_CANDIDATES):
        all_features.append(candidate_features(candidate))
    by_bucket: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for features in all_features:
        by_bucket[assign_bucket(features)].append(features)
    for bucket in by_bucket:
        by_bucket[bucket].sort(key=lambda row: (-row["score"], row["candidate_id"]))

    plan = [
        ("strong_fit", 55, "strong_fit"),
        ("hidden_fit", 20, "strong_fit"),
        ("good_but_logistics_risk", 25, "maybe"),
        ("services_only_risk", 20, "maybe"),
        ("cv_speech_mismatch", 15, "not_fit"),
        ("keyword_trap", 30, "not_fit"),
        ("consistency_trap", 10, "not_fit"),
        ("generic_adjacent", 50, "maybe"),
    ]
    selected = []
    seen = set()
    for bucket, count, suggested_label in plan:
        for row in by_bucket.get(bucket, []):
            if row["candidate_id"] in seen:
                continue
            selected.append(review_row(row, suggested_label))
            seen.add(row["candidate_id"])
            if sum(1 for item in selected if item["review_bucket"] == bucket) >= count:
                break
            if len(selected) >= limit:
                break
        if len(selected) >= limit:
            break

    if len(selected) < limit:
        for row in sorted(all_features, key=lambda item: (-item["score"], item["candidate_id"])):
            if row["candidate_id"] not in seen:
                selected.append(review_row(row, "maybe"))
                seen.add(row["candidate_id"])
                if len(selected) >= limit:
                    break

    selected = selected[:limit]
    for idx, row in enumerate(selected, 1):
        row["review_rank"] = idx
    return selected


def candidate_features(candidate: dict[str, Any]) -> dict[str, Any]:
    profile = candidate.get("profile") or {}
    career = candidate.get("career_history") or []
    skills = candidate.get("skills") or []
    signals = candidate.get("redrob_signals") or {}
    skill_names = [str(skill.get("name", "")).strip() for skill in skills if skill.get("name")]
    skill_set = {skill.lower() for skill in skill_names}
    career_text = " ".join(str(job.get("description", "")) + " " + str(job.get("title", "")) for job in career).lower()
    title = str(profile.get("current_title", ""))
    title_l = title.lower()
    years = float(profile.get("years_of_experience") or 0)
    must = len(skill_set & redrob.ABSOLUTE_SKILLS)
    nice = len(skill_set & redrob.NICE_SKILLS)
    eval_count = len(skill_set & redrob.EVAL_SKILLS)
    cv_count = len(skill_set & redrob.CV_SPEECH_SKILLS)
    ir = sum(1 for hint in redrob.IR_TEXT_HINTS if hint in career_text)
    production = sum(1 for hint in redrob.PRODUCTION_TEXT_HINTS if hint in career_text)
    response = float(signals.get("recruiter_response_rate") or 0)
    notice = float(signals.get("notice_period_days") or 0)
    open_to_work = bool(signals.get("open_to_work_flag"))
    services_only = bool(career) and all(redrob.normalize(job.get("company")) in redrob.CONSULTING_COMPANIES for job in career)
    positive_title = any(pos in title_l for pos in redrob.ROLE_POSITIVE_TITLES)
    negative_title = any(neg in title_l for neg in redrob.ROLE_NEGATIVE_TITLES)
    expert_zero = any(skill.get("proficiency") == "expert" and int(skill.get("duration_months") or 0) == 0 for skill in skills)
    keyword_trap = len(skills) >= 16 and must + nice >= 9 and ir == 0 and not positive_title
    nontechnical_ai = negative_title and must + nice >= 7
    cv_speech = cv_count >= 4 and must <= 2 and ir == 0
    exp_fit = 1 if 5 <= years <= 9 else 0.65 if 4 <= years <= 12 else 0.25
    availability = min(1.0, max(0.0, response * 0.55 + (1 if open_to_work else 0) * 0.2 + max(0, 1 - notice / 150) * 0.25))
    score = (
        must * 7
        + nice * 2
        + eval_count * 6
        + ir * 7
        + production * 4
        + (18 if positive_title else 0)
        + exp_fit * 12
        + availability * 8
        - (18 if keyword_trap else 0)
        - (20 if nontechnical_ai else 0)
        - (12 if cv_speech else 0)
        - (10 if expert_zero else 0)
        - (8 if services_only else 0)
    )
    return {
        "candidate_id": candidate.get("candidate_id"),
        "title": title,
        "country": profile.get("country", ""),
        "location": profile.get("location", ""),
        "years": years,
        "summary": profile.get("summary", ""),
        "skills": skill_names[:14],
        "skills_lower": skill_set,
        "must_have_skill_count": must,
        "nice_skill_count": nice,
        "eval_skill_count": eval_count,
        "cv_speech_skill_count": cv_count,
        "career_ir_hint_count": ir,
        "production_hint_count": production,
        "response_rate": response,
        "notice_period_days": notice,
        "open_to_work": open_to_work,
        "last_active_date": signals.get("last_active_date", ""),
        "preferred_work_mode": signals.get("preferred_work_mode", ""),
        "willing_to_relocate": signals.get("willing_to_relocate", ""),
        "services_only": services_only,
        "positive_title": positive_title,
        "negative_title": negative_title,
        "expert_zero": expert_zero,
        "keyword_trap": keyword_trap,
        "nontechnical_ai": nontechnical_ai,
        "cv_speech_mismatch": cv_speech,
        "score": round(score, 3),
    }


def assign_bucket(features: dict[str, Any]) -> str:
    if features["expert_zero"]:
        return "consistency_trap"
    if features["keyword_trap"] or features["nontechnical_ai"]:
        return "keyword_trap"
    if features["cv_speech_mismatch"]:
        return "cv_speech_mismatch"
    if (
        features["positive_title"]
        and features["career_ir_hint_count"] >= 2
        and features["must_have_skill_count"] <= 2
        and len(features["skills"]) <= 10
    ):
        return "hidden_fit"
    if (
        features["positive_title"]
        and features["must_have_skill_count"] >= 4
        and features["career_ir_hint_count"] >= 2
        and features["production_hint_count"] >= 2
        and 5 <= features["years"] <= 9
    ):
        if features["response_rate"] < 0.35 or features["notice_period_days"] >= 120:
            return "good_but_logistics_risk"
        return "strong_fit"
    if features["services_only"] and features["must_have_skill_count"] >= 2:
        return "services_only_risk"
    if features["score"] >= 55:
        return "generic_adjacent"
    return "low_signal"


def review_row(features: dict[str, Any], suggested_label: str) -> dict[str, Any]:
    evidence = []
    if features["positive_title"]:
        evidence.append("role title")
    if features["must_have_skill_count"]:
        evidence.append(f"{features['must_have_skill_count']} retrieval/search skills")
    if features["career_ir_hint_count"]:
        evidence.append(f"{features['career_ir_hint_count']} career IR hints")
    if features["production_hint_count"]:
        evidence.append(f"{features['production_hint_count']} production hints")
    concerns = []
    if features["keyword_trap"] or features["nontechnical_ai"]:
        concerns.append("keyword/title mismatch")
    if features["cv_speech_mismatch"]:
        concerns.append("CV/speech-heavy, weak IR")
    if features["expert_zero"]:
        concerns.append("expert skill with zero duration")
    if features["services_only"]:
        concerns.append("services-only career")
    if features["notice_period_days"] >= 120:
        concerns.append("long notice")
    if features["response_rate"] < 0.35:
        concerns.append("low response")
    bucket = assign_bucket(features)
    return {
        "review_rank": 0,
        "candidate_id": features["candidate_id"],
        "suggested_label": suggested_label,
        "reviewer_label": "",
        "review_bucket": bucket,
        "score_hint": features["score"],
        "title": features["title"],
        "years": features["years"],
        "location": features["location"],
        "country": features["country"],
        "skills": ", ".join(features["skills"]),
        "evidence_summary": "; ".join(evidence) or "thin role evidence",
        "concern_summary": "; ".join(concerns) or "no major structural concern",
        "response_rate": features["response_rate"],
        "notice_period_days": features["notice_period_days"],
        "last_active_date": features["last_active_date"],
        "reviewer_notes": "",
    }


def write_review_csv(rows: list[dict[str, Any]]) -> None:
    fieldnames = [
        "review_rank",
        "candidate_id",
        "suggested_label",
        "reviewer_label",
        "review_bucket",
        "score_hint",
        "title",
        "years",
        "location",
        "country",
        "skills",
        "evidence_summary",
        "concern_summary",
        "response_rate",
        "notice_period_days",
        "last_active_date",
        "reviewer_notes",
    ]
    with REVIEW_PATH.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def render_global_markdown(summary: dict[str, Any]) -> str:
    external = summary["external"]
    redrob_summary = summary["redrob_hidden_patterns"]
    review = summary["candidate_review_set"]
    lines = [
        "# Global Hiring Dataset Comparison",
        "",
        "This analysis compares Redrob's challenge data with public hiring/resume datasets to identify hiring signals that generalize beyond the challenge file.",
        "",
        "![Global hiring signal map](visuals/global_hiring_signal_map.svg)",
        "",
        "## External Datasets Used",
        "",
        "| Source | Why used |",
        "| --- | --- |",
    ]
    for source in SOURCE_NOTES.values():
        lines.append(f"| [{source['url']}]({source['url']}) | {source['description']} |")

    lines.extend(
        [
            "",
            "Raw external CSVs are kept local under `data/external-hiring/` and are gitignored. The scripts and summarized findings are committed so the analysis stays reproducible without publishing large third-party files.",
            "",
            "## Hidden Redrob Patterns",
            "",
            "The deeper Redrob scan groups candidates into review buckets rather than only score buckets:",
            "",
        ]
    )
    for name, count in redrob_summary["bucket_counts"]:
        lines.append(f"- {name}: `{count}`")

    lines.extend(
        [
            "",
            "## Global Dataset Findings",
            "",
            "### Resume Screening Dataset",
            "",
            f"- Rows: `{external['hf_resume_screening'].get('rows')}`",
            f"- Decisions: {format_items(external['hf_resume_screening'].get('decisions', []), 8)}",
            f"- Top selected roles: {format_items(external['hf_resume_screening'].get('top_selected_roles', []), 10)}",
            f"- Decision-reason themes: {format_items(external['hf_resume_screening'].get('decision_reason_themes', []), 10)}",
            "",
            "### Kaggle Resume Mirror",
            "",
            f"- Rows: `{external['hf_kaggle_resume'].get('rows')}`",
            f"- Categories: {format_items(external['hf_kaggle_resume'].get('categories', []), 12)}",
            f"- Section presence: {format_items(external['hf_kaggle_resume'].get('section_presence', []), 8)}",
            "",
            "### Skill2vec Job-Skill Dataset",
            "",
            f"- Skill clusters: `{external['skill2vec'].get('rows')}`",
            f"- Cluster size: {stat_line(external['skill2vec'].get('cluster_size', {}))}",
            f"- Redrob role terms found globally: {format_items(external['skill2vec'].get('redrob_role_terms_in_global_jd_clusters', []), 16)}",
            "",
            "## What Is Common Across Redrob And Global Data",
            "",
            "| Pattern | Redrob Evidence | Global Evidence | How Sifter Should Apply It |",
            "| --- | --- | --- | --- |",
        ]
    )
    for item in summary["common_patterns"]:
        lines.append(f"| {item['pattern']} | {item['redrob']} | {item['global']} | {item['app']} |")

    lines.extend(
        [
            "",
            "## Candidate Review Set",
            "",
            f"Created `{REVIEW_PATH.as_posix()}` with `{review['rows']}` candidates for manual review before retraining.",
            "",
            "Bucket mix:",
        ]
    )
    for name, count in review["bucket_mix"]:
        lines.append(f"- {name}: `{count}`")
    lines.extend(
        [
            "",
            "Suggested label mix:",
        ]
    )
    for name, count in review["suggested_label_mix"]:
        lines.append(f"- {name}: `{count}`")
    lines.extend(
        [
            "",
            "## App Changes These Findings Suggest",
            "",
            "1. Add a visible `data confidence` label per candidate: strong evidence, hidden fit, logistics risk, or trap risk.",
            "2. Show `why not just keywords` in candidate info when skills are high but career/title evidence is weak.",
            "3. Keep GitHub and platform activity as bonus/caution signals, not hard filters.",
            "4. Collect recruiter feedback using the review set, then retrain the Hugging Face reranker on reviewed labels.",
            "5. Add separate score components for global-transferable patterns: role consistency, production ownership, and evidence consistency.",
        ]
    )
    return "\n".join(lines)


def render_retraining_note() -> str:
    return """# Candidate Review And Retraining Plan

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
"""


def render_global_visual(summary: dict[str, Any]) -> None:
    GLOBAL_VISUAL.parent.mkdir(parents=True, exist_ok=True)
    buckets = summary["redrob_hidden_patterns"]["bucket_counts"]
    max_count = max(count for _, count in buckets)
    bar_rows = []
    for index, (name, count) in enumerate(buckets):
        y = 170 + index * 28
        width = 80 + (math.log10(count + 1) / math.log10(max_count + 1)) * 360
        color = {
            "low_signal": "#737373",
            "keyword_trap": "#d94b4b",
            "generic_adjacent": "#d9892b",
            "services_only_risk": "#b06fbd",
            "cv_speech_mismatch": "#aa5a44",
            "strong_fit": "#248a5b",
            "good_but_logistics_risk": "#2b7fd9",
            "consistency_trap": "#c1a12f",
            "hidden_fit": "#168f9b",
        }.get(name, "#555555")
        bar_rows.append(
            f'<text x="40" y="{y + 17}" class="label">{escape_xml(name.replace("_", " "))}</text>'
            f'<rect x="230" y="{y}" width="{width:.1f}" height="20" rx="4" fill="{color}" />'
            f'<text x="{250 + width:.1f}" y="{y + 16}" class="value">{count:,}</text>'
        )

    review = summary["candidate_review_set"]
    labels = dict(review["suggested_label_mix"])
    label_total = max(1, sum(labels.values()))
    x = 600
    label_segments = []
    label_colors = {"strong_fit": "#248a5b", "maybe": "#d2a72f", "not_fit": "#d94b4b"}
    for name in ["strong_fit", "maybe", "not_fit"]:
        segment_width = 420 * labels.get(name, 0) / label_total
        label_segments.append(
            f'<rect x="{x:.1f}" y="592" width="{segment_width:.1f}" height="30" fill="{label_colors[name]}" />'
        )
        label_segments.append(f'<text x="{x + 8:.1f}" y="614" class="small white">{escape_xml(name)} {labels.get(name, 0)}</text>')
        x += segment_width

    common = [
        ("Role context", "Skill count alone is not enough"),
        ("Ownership proof", "Shipped systems beat buzzwords"),
        ("Public footprint", "Bonus signal, never a hard reject"),
        ("Availability", "Useful but capped for fairness"),
        ("Review labels", "Negatives and traps improve learning"),
    ]
    common_rows = []
    for index, (title, body) in enumerate(common):
        y = 170 + index * 76
        common_rows.append(
            f'<rect x="600" y="{y}" width="420" height="54" rx="8" fill="#f7f4ee" stroke="#222" stroke-width="1" />'
            f'<text x="620" y="{y + 22}" class="signal">{escape_xml(title)}</text>'
            f'<text x="620" y="{y + 42}" class="small">{escape_xml(body)}</text>'
        )

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="680" viewBox="0 0 1080 680" role="img" aria-labelledby="title desc">
  <title id="title">Global hiring signal map</title>
  <desc id="desc">A visual summary of hidden Redrob candidate buckets and hiring signals confirmed by global datasets.</desc>
  <style>
    .bg {{ fill: #fbfaf6; }}
    .title {{ font: 800 30px Arial, sans-serif; fill: #111; }}
    .subtitle {{ font: 400 15px Arial, sans-serif; fill: #444; }}
    .section {{ font: 800 17px Arial, sans-serif; fill: #111; text-transform: uppercase; }}
    .label {{ font: 700 13px Arial, sans-serif; fill: #222; }}
    .value {{ font: 800 13px Arial, sans-serif; fill: #111; }}
    .signal {{ font: 800 16px Arial, sans-serif; fill: #111; }}
    .small {{ font: 400 13px Arial, sans-serif; fill: #333; }}
    .white {{ fill: #fff; font-weight: 700; }}
  </style>
  <rect class="bg" width="1080" height="680" />
  <text x="40" y="52" class="title">What The Data Says Hiring Systems Should Learn</text>
  <text x="40" y="82" class="subtitle">Redrob challenge data was compared with resume screening, Kaggle resume, and Skill2vec job-skill datasets.</text>
  <rect x="40" y="112" width="500" height="510" rx="12" fill="#fff" stroke="#111" stroke-width="1.4" />
  <rect x="580" y="112" width="460" height="510" rx="12" fill="#fff" stroke="#111" stroke-width="1.4" />
  <text x="70" y="146" class="section">Hidden Redrob Buckets</text>
  <text x="600" y="146" class="section">Signals Common Across Datasets</text>
  {"".join(bar_rows)}
  {"".join(common_rows)}
  <text x="600" y="566" class="section">180 Candidate Human Review Set</text>
  {"".join(label_segments)}
  <text x="40" y="652" class="subtitle">Application move: rank fast at 100k scale, then use human-reviewed labels to retrain the learned reranker.</text>
</svg>
"""
    GLOBAL_VISUAL.write_text(svg, encoding="utf-8")


def escape_xml(value: str) -> str:
    return str(value).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def read_submission_ids() -> set[str]:
    path = ROOT / "redrob_submission.csv"
    if not path.exists():
        return set()
    with path.open("r", encoding="utf-8", newline="") as handle:
        return {row["candidate_id"] for row in csv.DictReader(handle)}


def summarize_review_set(rows: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "rows": len(rows),
        "bucket_mix": Counter(row["review_bucket"] for row in rows).most_common(),
        "suggested_label_mix": Counter(row["suggested_label"] for row in rows).most_common(),
    }


def slim_examples(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    keys = ["candidate_id", "title", "years", "country", "score", "must_have_skill_count", "career_ir_hint_count", "production_hint_count", "response_rate", "notice_period_days"]
    return [{key: row[key] for key in keys} for row in rows[:8]]


def reason_keywords(reason: str) -> list[str]:
    text = reason.lower()
    themes = []
    for theme in ["leadership", "system design", "backend", "technical", "communication", "experience", "senior", "full-stack"]:
        if theme in text:
            themes.append(theme)
    if not themes and text.strip():
        themes.append(text.strip()[:60])
    return themes


def summarize_term_hits(term_counts: dict[str, Counter], selected: dict[str, Counter], rejected: dict[str, Counter], rows: int, decisions: Counter) -> dict[str, Any]:
    result = {}
    for category in GLOBAL_TERMS:
        total_hits = sum(count for _, count in term_counts[category].items())
        selected_hits = sum(count for _, count in selected[category].items())
        rejected_hits = sum(count for _, count in rejected[category].items())
        result[category] = {
            "rows_with_term_family": total_hits,
            "overall_rate": round(total_hits / max(1, rows), 4),
            "selected_rate": round(selected_hits / max(1, decisions.get("select", 0)), 4),
            "rejected_rate": round(rejected_hits / max(1, decisions.get("reject", 0)), 4),
        }
    return result


def summarize_counter(counter: Counter, rows: int) -> dict[str, Any]:
    total = sum(counter.values())
    return {"rows_with_family": total, "rate": round(total / max(1, rows), 4), "hit_distribution": counter.most_common(10)}


def summarize(values: list[float]) -> dict[str, Any]:
    clean = sorted(float(v) for v in values if v is not None and not math.isnan(float(v)))
    if not clean:
        return {"count": 0}
    return {
        "count": len(clean),
        "min": round(clean[0], 4),
        "mean": round(mean(clean), 4),
        "p50": round(percentile(clean, 0.5), 4),
        "p95": round(percentile(clean, 0.95), 4),
        "max": round(clean[-1], 4),
    }


def percentile(sorted_values: list[float], q: float) -> float:
    pos = (len(sorted_values) - 1) * q
    low = int(math.floor(pos))
    high = int(math.ceil(pos))
    if low == high:
        return sorted_values[low]
    return sorted_values[low] * (high - pos) + sorted_values[high] * (pos - low)


def normalize_text(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()


def clean_skill(value: str) -> str:
    value = str(value or "").strip()
    if not value:
        return ""
    return re.sub(r"\s+", " ", value).strip().lower()


def format_items(items: list[Any], limit: int) -> str:
    if not items:
        return "`none`"
    formatted = []
    for item in items[:limit]:
        if len(item) == 2:
            formatted.append(f"{item[0]} (`{item[1]}`)")
        elif len(item) >= 4:
            formatted.append(f"{item[0]} (`{item[1]}/{item[2]}`, {item[3]:.1%})")
        else:
            formatted.append(str(item))
    return "; ".join(formatted)


def stat_line(stats: dict[str, Any]) -> str:
    return f"mean `{stats.get('mean')}`, median `{stats.get('p50')}`, p95 `{stats.get('p95')}`"


def to_jsonable(value: Any) -> Any:
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, Counter):
        return value.most_common()
    if isinstance(value, dict):
        return {str(key): to_jsonable(val) for key, val in value.items()}
    if isinstance(value, list):
        return [to_jsonable(item) for item in value]
    if isinstance(value, tuple):
        return [to_jsonable(item) for item in value]
    return value


if __name__ == "__main__":
    main()
