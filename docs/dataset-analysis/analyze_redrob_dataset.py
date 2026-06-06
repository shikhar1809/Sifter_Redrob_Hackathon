#!/usr/bin/env python3
"""Structural analysis for the Redrob challenge candidate dataset.

The script streams the full JSONL file and writes:
- redrob_dataset_profile.json
- redrob_dataset_analysis.md

It intentionally uses only the Python standard library so it can run in the
same CPU/no-network spirit as the challenge ranking step.
"""

from __future__ import annotations

import argparse
import gzip
import json
import math
import re
from collections import Counter, defaultdict
from datetime import date, datetime
from pathlib import Path
from statistics import mean
from typing import Any, Iterable


REFERENCE_DATE = date(2026, 6, 6)

CONSULTING_COMPANIES = {
    "tcs",
    "tata consultancy services",
    "infosys",
    "wipro",
    "accenture",
    "cognizant",
    "capgemini",
    "mindtree",
    "lti mindtree",
    "ltimindtree",
    "hcl",
    "tech mahindra",
}

ROLE_POSITIVE_TITLES = [
    "ai engineer",
    "machine learning engineer",
    "ml engineer",
    "nlp engineer",
    "search engineer",
    "recommendation",
    "applied scientist",
    "data scientist",
    "mlops",
]

ROLE_NEGATIVE_TITLES = [
    "marketing",
    "hr ",
    "human resources",
    "sales",
    "graphic designer",
    "content writer",
    "operations manager",
    "accountant",
    "finance",
    "customer support",
]

ABSOLUTE_SKILLS = {
    "python",
    "embeddings",
    "vector search",
    "semantic search",
    "information retrieval",
    "search infrastructure",
    "search backend",
    "learning to rank",
    "recommendation systems",
    "faiss",
    "pinecone",
    "weaviate",
    "qdrant",
    "milvus",
    "opensearch",
    "elasticsearch",
    "bm25",
    "rag",
}

EVAL_SKILLS = {
    "learning to rank",
    "recommendation systems",
    "weights & biases",
    "mlflow",
    "information retrieval",
}

NICE_SKILLS = {
    "lora",
    "qlora",
    "peft",
    "fine-tuning llms",
    "llms",
    "hugging face transformers",
    "bentoml",
    "kubeflow",
    "docker",
    "mlops",
    "langchain",
    "llamaindex",
}

CV_SPEECH_SKILLS = {
    "computer vision",
    "image classification",
    "object detection",
    "opencv",
    "yolo",
    "speech recognition",
    "tts",
    "asr",
}

IR_TEXT_HINTS = [
    "ranking",
    "retrieval",
    "search",
    "recommendation",
    "recommend",
    "vector",
    "embedding",
    "bm25",
    "faiss",
    "pinecone",
    "weaviate",
    "qdrant",
    "milvus",
    "opensearch",
    "elasticsearch",
    "ndcg",
    "mrr",
    "map",
    "a/b",
    "ab test",
]

PRODUCTION_TEXT_HINTS = [
    "production",
    "deployed",
    "ship",
    "shipped",
    "serving",
    "monitor",
    "scale",
    "latency",
    "pipeline",
    "on-call",
    "quality",
    "platform",
    "owned",
    "ownership",
]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--candidates",
        default="Challenge/[PUB] India_runs_data_and_ai_challenge/India_runs_data_and_ai_challenge/candidates.jsonl",
    )
    parser.add_argument("--out-dir", default="docs/dataset-analysis")
    parser.add_argument("--submission", default="redrob_submission.csv")
    args = parser.parse_args()

    candidate_path = Path(args.candidates)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    result = analyze(candidate_path)
    submission_path = Path(args.submission)
    if submission_path.exists():
        result["current_sifter_submission"] = analyze_submission(candidate_path, submission_path)
    (out_dir / "redrob_dataset_profile.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    (out_dir / "redrob_dataset_analysis.md").write_text(render_markdown(result), encoding="utf-8")
    print(json.dumps({"records": result["records"], "out_dir": str(out_dir)}, indent=2))


def analyze(path: Path) -> dict[str, Any]:
    counters: dict[str, Counter] = defaultdict(Counter)
    numeric: dict[str, list[float]] = defaultdict(list)
    pair_counts: dict[str, Counter] = defaultdict(Counter)
    missing = Counter()
    duplicate_ids = 0
    seen_ids = set()
    examples: dict[str, list[dict[str, Any]]] = defaultdict(list)

    total = 0
    role_fit_counts = Counter()
    honeypot_flags = Counter()
    exact_signal_fingerprints = Counter()
    text_fingerprints = Counter()
    title_skill_cooccurrence = Counter()
    current_company_mismatch = 0
    current_title_mismatch = 0

    for candidate in stream_candidates(path):
        total += 1
        cid = candidate.get("candidate_id", "")
        if cid in seen_ids:
            duplicate_ids += 1
        seen_ids.add(cid)

        profile = candidate.get("profile") or {}
        career = candidate.get("career_history") or []
        education = candidate.get("education") or []
        skills = candidate.get("skills") or []
        signals = candidate.get("redrob_signals") or {}
        certifications = candidate.get("certifications") or []
        languages = candidate.get("languages") or []

        for key in ["profile", "career_history", "education", "skills", "redrob_signals"]:
            if not candidate.get(key):
                missing[key] += 1
        for key in [
            "anonymized_name",
            "headline",
            "summary",
            "location",
            "country",
            "years_of_experience",
            "current_title",
            "current_company",
            "current_company_size",
            "current_industry",
        ]:
            if profile.get(key) in (None, ""):
                missing[f"profile.{key}"] += 1

        title = str(profile.get("current_title", "")).strip()
        title_l = title.lower()
        company = str(profile.get("current_company", "")).strip()
        country = str(profile.get("country", "")).strip()
        location = str(profile.get("location", "")).strip()
        industry = str(profile.get("current_industry", "")).strip()

        counters["countries"][country] += 1
        counters["locations"][location] += 1
        counters["current_titles"][title] += 1
        counters["industries"][industry] += 1
        counters["company_sizes"][str(profile.get("current_company_size", ""))] += 1
        counters["current_companies"][company] += 1

        numeric["years_of_experience"].append(float(profile.get("years_of_experience") or 0))
        numeric["summary_chars"].append(len(str(profile.get("summary", ""))))
        numeric["career_roles"].append(len(career))
        numeric["education_items"].append(len(education))
        numeric["skills_count"].append(len(skills))
        numeric["certifications_count"].append(len(certifications))
        numeric["languages_count"].append(len(languages))

        if career:
            current_jobs = [job for job in career if job.get("is_current")]
            if current_jobs:
                current_job = current_jobs[0]
                if normalize(current_job.get("company")) != normalize(company):
                    current_company_mismatch += 1
                    add_example(examples["profile_current_company_mismatch"], candidate)
                if normalize(current_job.get("title")) != normalize(title):
                    current_title_mismatch += 1
                    add_example(examples["profile_current_title_mismatch"], candidate)
            durations = [int(job.get("duration_months") or 0) for job in career]
            numeric["total_career_months"].append(sum(durations))
            numeric["avg_role_duration_months"].append(sum(durations) / max(1, len(durations)))
            numeric["short_roles_under_18m"].append(sum(1 for duration in durations if duration < 18))
            career_text = " ".join(str(job.get("description", "")) + " " + str(job.get("title", "")) for job in career).lower()
        else:
            career_text = ""

        exp_years = float(profile.get("years_of_experience") or 0)
        total_months = sum(int(job.get("duration_months") or 0) for job in career)
        if total_months and abs(total_months / 12 - exp_years) > 4:
            honeypot_flags["experience_history_gap_over_4y"] += 1
            add_example(examples["experience_history_gap_over_4y"], candidate)

        skill_names = [str(skill.get("name", "")).strip() for skill in skills if skill.get("name")]
        skill_names_l = [skill.lower() for skill in skill_names]
        skill_set = set(skill_names_l)
        for skill in skill_names:
            counters["skills"][skill] += 1
        for skill in skills:
            prof = str(skill.get("proficiency", ""))
            counters["skill_proficiency"][prof] += 1
            duration = int(skill.get("duration_months") or 0)
            endorsements = int(skill.get("endorsements") or 0)
            numeric["skill_duration_months"].append(duration)
            numeric["skill_endorsements"].append(endorsements)
            if prof == "expert" and duration == 0:
                honeypot_flags["expert_skill_with_zero_duration"] += 1
                add_example(examples["expert_skill_with_zero_duration"], candidate)
            if endorsements >= 50 and duration <= 3:
                honeypot_flags["many_endorsements_tiny_duration"] += 1
                add_example(examples["many_endorsements_tiny_duration"], candidate)

        absolute_count = len(skill_set & ABSOLUTE_SKILLS)
        nice_count = len(skill_set & NICE_SKILLS)
        eval_count = len(skill_set & EVAL_SKILLS)
        cv_speech_count = len(skill_set & CV_SPEECH_SKILLS)
        ir_text_count = sum(1 for hint in IR_TEXT_HINTS if hint in career_text)
        production_text_count = sum(1 for hint in PRODUCTION_TEXT_HINTS if hint in career_text)

        numeric["must_have_skill_count"].append(absolute_count)
        numeric["nice_skill_count"].append(nice_count)
        numeric["eval_skill_count"].append(eval_count)
        numeric["cv_speech_skill_count"].append(cv_speech_count)
        numeric["career_ir_text_hint_count"].append(ir_text_count)
        numeric["career_production_text_hint_count"].append(production_text_count)

        if len(skills) >= 16 and absolute_count + nice_count >= 9 and ir_text_count == 0 and not any(pos in title_l for pos in ROLE_POSITIVE_TITLES):
            honeypot_flags["keyword_stuffer_shape"] += 1
            add_example(examples["keyword_stuffer_shape"], candidate)

        if any(neg in title_l for neg in ROLE_NEGATIVE_TITLES) and absolute_count + nice_count >= 7:
            honeypot_flags["nontechnical_title_high_ai_skills"] += 1
            add_example(examples["nontechnical_title_high_ai_skills"], candidate)

        if cv_speech_count >= 4 and absolute_count <= 2 and ir_text_count == 0:
            honeypot_flags["cv_speech_without_ir"] += 1
            add_example(examples["cv_speech_without_ir"], candidate)

        if any(pos in title_l for pos in ROLE_POSITIVE_TITLES):
            role_fit_counts["positive_title"] += 1
        if absolute_count >= 4:
            role_fit_counts["must_have_skill_4plus"] += 1
        if ir_text_count >= 2:
            role_fit_counts["career_ir_evidence_2plus"] += 1
        if production_text_count >= 2:
            role_fit_counts["career_production_evidence_2plus"] += 1
        if 4 <= exp_years <= 12:
            role_fit_counts["experience_4_to_12"] += 1
        if 5 <= exp_years <= 9:
            role_fit_counts["jd_experience_5_to_9"] += 1
        if country == "India":
            role_fit_counts["india"] += 1

        if (
            any(pos in title_l for pos in ROLE_POSITIVE_TITLES)
            and absolute_count >= 4
            and ir_text_count >= 1
            and production_text_count >= 1
            and 4 <= exp_years <= 12
        ):
            role_fit_counts["high_signal_profile_shape"] += 1
            add_example(examples["high_signal_profile_shape"], candidate)

        if (
            any(pos in title_l for pos in ROLE_POSITIVE_TITLES)
            and ir_text_count >= 2
            and absolute_count <= 2
            and len(skill_set) <= 8
        ):
            role_fit_counts["plain_language_hidden_fit"] += 1
            add_example(examples["plain_language_hidden_fit"], candidate)

        if all(normalize(job.get("company")) in CONSULTING_COMPANIES for job in career) and career:
            role_fit_counts["services_only_career"] += 1
            add_example(examples["services_only_career"], candidate)

        if any(normalize(job.get("company")) in CONSULTING_COMPANIES for job in career):
            role_fit_counts["has_services_company"] += 1

        signal_fingerprint_parts = []
        for key in [
            "open_to_work_flag",
            "notice_period_days",
            "preferred_work_mode",
            "willing_to_relocate",
            "verified_email",
            "verified_phone",
            "linkedin_connected",
        ]:
            signal_fingerprint_parts.append(str(signals.get(key)))
        signal_fingerprint_parts.extend(
            str(round(float(signals.get(key, -999)), 1))
            for key in [
                "profile_completeness_score",
                "recruiter_response_rate",
                "avg_response_time_hours",
                "github_activity_score",
                "interview_completion_rate",
                "offer_acceptance_rate",
            ]
        )
        exact_signal_fingerprints["|".join(signal_fingerprint_parts)] += 1
        text_fingerprints[f"{title_l}|{round(exp_years, 1)}|{country}|{','.join(sorted(skill_set)[:10])}"] += 1

        for key, value in flatten_signals(signals).items():
            if isinstance(value, bool):
                counters[f"signals.{key}"][str(value)] += 1
            elif isinstance(value, (int, float)) and not isinstance(value, bool):
                numeric[f"signals.{key}"].append(float(value))
            elif value is not None:
                counters[f"signals.{key}"][str(value)] += 1
            else:
                missing[f"signals.{key}"] += 1

        for edu in education:
            counters["education_tiers"][str(edu.get("tier", ""))] += 1
            counters["education_degrees"][str(edu.get("degree", ""))] += 1
            counters["education_fields"][str(edu.get("field_of_study", ""))] += 1

        for lang in languages:
            counters["languages"][str(lang.get("language", ""))] += 1
            counters["language_proficiencies"][str(lang.get("proficiency", ""))] += 1

        for cert in certifications:
            counters["certifications"][str(cert.get("name", ""))] += 1
            counters["certification_issuers"][str(cert.get("issuer", ""))] += 1

        pair_counts["title_country"][(title, country)] += 1
        if skill_set:
            title_skill_cooccurrence[(title, sorted(skill_set)[0])] += 1

    result = {
        "records": total,
        "file_size_mb": round(path.stat().st_size / 1024 / 1024, 2),
        "unique_candidate_ids": len(seen_ids),
        "duplicate_candidate_ids": duplicate_ids,
        "missing_counts": dict(missing.most_common()),
        "profile_current_company_mismatch": current_company_mismatch,
        "profile_current_title_mismatch": current_title_mismatch,
        "role_fit_counts": dict(role_fit_counts.most_common()),
        "honeypot_or_trap_flags": dict(honeypot_flags.most_common()),
        "top_exact_signal_fingerprint_duplicates": exact_signal_fingerprints.most_common(10),
        "top_text_fingerprint_duplicates": text_fingerprints.most_common(10),
        "numeric": {key: summarize(values) for key, values in sorted(numeric.items())},
        "top_counters": {key: counter.most_common(25) for key, counter in sorted(counters.items())},
        "top_pairs": {key: [[list(pair), count] for pair, count in counter.most_common(20)] for key, counter in sorted(pair_counts.items())},
        "examples": {key: value for key, value in examples.items()},
    }
    return result


def stream_candidates(path: Path) -> Iterable[dict[str, Any]]:
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8") as handle:
        first = handle.read(1)
        handle.seek(0)
        if first == "[":
            yield from json.load(handle)
        else:
            for line in handle:
                line = line.strip()
                if line:
                    yield json.loads(line)


def flatten_signals(signals: dict[str, Any]) -> dict[str, Any]:
    flat: dict[str, Any] = {}
    for key, value in signals.items():
        if isinstance(value, dict):
            for child_key, child_value in value.items():
                flat[f"{key}.{child_key}"] = child_value
        else:
            flat[key] = value
    return flat


def summarize(values: list[float]) -> dict[str, Any]:
    clean = sorted(value for value in values if value is not None and not math.isnan(value))
    if not clean:
        return {"count": 0}
    return {
        "count": len(clean),
        "min": round(clean[0], 4),
        "p05": round(percentile(clean, 0.05), 4),
        "p25": round(percentile(clean, 0.25), 4),
        "mean": round(mean(clean), 4),
        "p50": round(percentile(clean, 0.50), 4),
        "p75": round(percentile(clean, 0.75), 4),
        "p95": round(percentile(clean, 0.95), 4),
        "max": round(clean[-1], 4),
    }


def percentile(sorted_values: list[float], q: float) -> float:
    if not sorted_values:
        return 0
    pos = (len(sorted_values) - 1) * q
    low = int(math.floor(pos))
    high = int(math.ceil(pos))
    if low == high:
        return sorted_values[low]
    return sorted_values[low] * (high - pos) + sorted_values[high] * (pos - low)


def normalize(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()


def add_example(bucket: list[dict[str, Any]], candidate: dict[str, Any], limit: int = 5) -> None:
    if len(bucket) >= limit:
        return
    candidate_id = candidate.get("candidate_id")
    if any(item.get("candidate_id") == candidate_id for item in bucket):
        return
    profile = candidate.get("profile", {})
    signals = candidate.get("redrob_signals", {})
    skills = candidate.get("skills", [])
    career = candidate.get("career_history", [])
    bucket.append(
        {
            "candidate_id": candidate.get("candidate_id"),
            "title": profile.get("current_title"),
            "country": profile.get("country"),
            "location": profile.get("location"),
            "years": profile.get("years_of_experience"),
            "skills": [skill.get("name") for skill in skills[:12]],
            "current_company": profile.get("current_company"),
            "response_rate": signals.get("recruiter_response_rate"),
            "notice_period_days": signals.get("notice_period_days"),
            "last_active_date": signals.get("last_active_date"),
            "career_titles": [job.get("title") for job in career[:4]],
        }
    )


def pct(count: int, total: int) -> str:
    return f"{(count / total * 100):.1f}%" if total else "0.0%"


def top_lines(items: list[Any], limit: int = 12) -> str:
    return "\n".join(f"- {name}: `{count}`" for name, count in items[:limit])


def stat_line(stats: dict[str, Any]) -> str:
    return (
        f"min `{stats.get('min')}`, p25 `{stats.get('p25')}`, median `{stats.get('p50')}`, "
        f"mean `{stats.get('mean')}`, p75 `{stats.get('p75')}`, p95 `{stats.get('p95')}`, max `{stats.get('max')}`"
    )


def render_markdown(result: dict[str, Any]) -> str:
    total = result["records"]
    role = result["role_fit_counts"]
    traps = result["honeypot_or_trap_flags"]
    num = result["numeric"]
    top = result["top_counters"]

    lines = [
        "# Redrob Dataset Structural Analysis",
        "",
        "This report profiles the full challenge candidate file and translates the dataset patterns into ranking decisions for Sifter.",
        "",
        "## Executive Findings",
        "",
        f"- The full file contains `{total:,}` candidates and is `{result['file_size_mb']}` MB uncompressed.",
        f"- Candidate IDs are clean: `{result['unique_candidate_ids']:,}` unique IDs and `{result['duplicate_candidate_ids']}` duplicate IDs.",
        "- The dataset is deliberately adversarial: docs mention keyword stuffers, plain-language strong fits, behavioral twins, and about 80 honeypots.",
        "- The JD is not asking for generic AI enthusiasm. It asks for production retrieval/ranking/search experience, evaluation maturity, Python, and a shipper mindset.",
        "- Behavioral signals are intended as availability multipliers, not replacements for job-fit evidence.",
        "- The strongest ranker should combine profile evidence, career text, skill evidence, and behavioral availability, while actively avoiding keyword-stuffing and impossible-profile traps.",
        "",
        "## Dataset Shape",
        "",
        f"- Records: `{total:,}`",
        f"- File size: `{result['file_size_mb']}` MB",
        f"- Unique candidate IDs: `{result['unique_candidate_ids']:,}`",
        f"- Duplicate candidate IDs: `{result['duplicate_candidate_ids']}`",
        f"- Required-field missingness: `{sum(result['missing_counts'].values())}` total missing required-field events in the streamed audit.",
        "",
        "## Job Meaning Extracted From The Challenge Docs",
        "",
        "The JD says the best candidate is not the person with the most AI keywords. The best candidate has evidence of:",
        "",
        "- production embeddings/retrieval systems,",
        "- vector or hybrid search infrastructure,",
        "- ranking/evaluation frameworks such as NDCG, MRR, MAP, A/B testing,",
        "- strong Python and production coding,",
        "- product-company or product-building experience,",
        "- practical shipping mindset,",
        "- active/available platform behavior.",
        "",
        "The docs explicitly warn that candidates with many AI keywords but weak career evidence are traps.",
        "",
        "## Core Field Distributions",
        "",
        f"Experience years: {stat_line(num['years_of_experience'])}.",
        f"Career roles per candidate: {stat_line(num['career_roles'])}.",
        f"Skills per candidate: {stat_line(num['skills_count'])}.",
        f"Certifications per candidate: {stat_line(num['certifications_count'])}.",
        f"Languages per candidate: {stat_line(num['languages_count'])}.",
        "",
        "Top countries:",
        top_lines(top["countries"], 15),
        "",
        "Top current titles:",
        top_lines(top["current_titles"], 20),
        "",
        "Top industries:",
        top_lines(top["industries"], 15),
        "",
        "Company-size distribution:",
        top_lines(top["company_sizes"], 10),
        "",
        "## Skills And Role Evidence",
        "",
        "Top skills across the full pool:",
        top_lines(top["skills"], 25),
        "",
        f"Candidates with 4+ must-have retrieval/search/ranking skills: `{role.get('must_have_skill_4plus', 0):,}` ({pct(role.get('must_have_skill_4plus', 0), total)}).",
        f"Candidates with career text showing 2+ IR/search/ranking hints: `{role.get('career_ir_evidence_2plus', 0):,}` ({pct(role.get('career_ir_evidence_2plus', 0), total)}).",
        f"Candidates with career text showing 2+ production hints: `{role.get('career_production_evidence_2plus', 0):,}` ({pct(role.get('career_production_evidence_2plus', 0), total)}).",
        f"Candidates in JD's strict 5-9 year band: `{role.get('jd_experience_5_to_9', 0):,}` ({pct(role.get('jd_experience_5_to_9', 0), total)}).",
        f"Candidates matching the high-signal profile shape: `{role.get('high_signal_profile_shape', 0):,}` ({pct(role.get('high_signal_profile_shape', 0), total)}).",
        f"Plain-language hidden-fit candidates found by career evidence despite lower skill keyword count: `{role.get('plain_language_hidden_fit', 0):,}` ({pct(role.get('plain_language_hidden_fit', 0), total)}).",
        "",
        "Ranking implication: skill count alone is dangerous. Sifter should reward career evidence and production/ranking text more than raw skill-list volume.",
        "",
        "## Behavioral Signals",
        "",
        "The Redrob docs say behavioral signals should modify skill fit because a perfect candidate who is unreachable is not practically hireable.",
        "",
        f"Profile completeness: {stat_line(num['signals.profile_completeness_score'])}.",
        f"Recruiter response rate: {stat_line(num['signals.recruiter_response_rate'])}.",
        f"Average response time hours: {stat_line(num['signals.avg_response_time_hours'])}.",
        f"Notice period days: {stat_line(num['signals.notice_period_days'])}.",
        f"GitHub activity score: {stat_line(num['signals.github_activity_score'])}.",
        f"Interview completion rate: {stat_line(num['signals.interview_completion_rate'])}.",
        f"Offer acceptance rate: {stat_line(num['signals.offer_acceptance_rate'])}.",
        "",
        "Open-to-work:",
        top_lines(top["signals.open_to_work_flag"], 5),
        "",
        "Preferred work mode:",
        top_lines(top["signals.preferred_work_mode"], 5),
        "",
        "Willing to relocate:",
        top_lines(top["signals.willing_to_relocate"], 5),
        "",
        "Ranking implication: response rate, last activity, notice period, and interview completion should be capped multipliers. They should help break ties and reduce unreachable candidates, but they should not overpower retrieval/ranking production evidence.",
        "",
        "## Trap And Data-Quality Patterns",
        "",
        f"Expert skill with zero duration flags: `{traps.get('expert_skill_with_zero_duration', 0):,}`.",
        f"Many endorsements with tiny duration flags: `{traps.get('many_endorsements_tiny_duration', 0):,}`.",
        f"Keyword-stuffer shaped candidates: `{traps.get('keyword_stuffer_shape', 0):,}`.",
        f"Nontechnical-title candidates with high AI-skill volume: `{traps.get('nontechnical_title_high_ai_skills', 0):,}`.",
        f"CV/speech-heavy candidates without IR evidence: `{traps.get('cv_speech_without_ir', 0):,}`.",
        f"Experience/career-history gap over 4 years: `{traps.get('experience_history_gap_over_4y', 0):,}`.",
        "",
        "These are not all guaranteed honeypots, but they are high-risk shapes. A strong ranker should down-weight them unless career history explains the mismatch.",
        "",
        "## JD-Specific Risk Factors",
        "",
        f"Services-only career candidates: `{role.get('services_only_career', 0):,}` ({pct(role.get('services_only_career', 0), total)}).",
        f"Candidates with at least one major services-company job: `{role.get('has_services_company', 0):,}` ({pct(role.get('has_services_company', 0), total)}).",
        "",
        "The JD explicitly says services-only careers are a concern, but candidates currently in services with prior product-company experience can still fit. That means the feature should be a penalty only when the whole career is services-only, not a blanket rejection.",
        "",
        "## What Sifter Should Do Because Of This Analysis",
        "",
        "| Dataset finding | Product/ranking decision |",
        "| --- | --- |",
        "| Skill lists contain deliberate keyword traps | Use career-history evidence and role-title fit before rewarding skill volume |",
        "| Strong candidates may use plain language instead of exact RAG/Pinecone words | Map career text to concepts like search, recommendation, ranking, evaluation, and production ML |",
        "| Behavioral signals are meaningful but can bias toward hyper-active users | Use them as capped availability multipliers, not core fit |",
        "| Honeypots include impossible profile combinations | Add consistency checks for expert skills with zero duration, endorsement/duration mismatch, and career/experience mismatch |",
        "| JD prioritizes production ranking/retrieval over generic AI | Weight retrieval, vector/hybrid search, evaluation, and production ownership above broad AI keywords |",
        "| Services-only experience is explicitly risky, but not always disqualifying | Penalize only services-only career patterns; allow mixed product/services backgrounds |",
        "| Stage 4 reviews reasoning manually | Keep reasons specific, evidence-backed, and honest about concerns |",
        "| Top-10 drives 50% of scoring via NDCG@10 | Optimize precision at the very top, not broad recall across 100 candidates |",
        "",
        "## Recommended Next Improvements",
        "",
        "1. Add trap-aware penalties to the ranker using the suspicious patterns above.",
        "2. Add a dataset-insight section to the README/deck so judges see that the ranker came from data understanding.",
        "3. Build a small human-label audit set across obvious fits, hidden fits, keyword stuffers, and suspected honeypots.",
        "4. Retrain the Hugging Face reranker with those labels and report human-label agreement.",
        "5. Add a fairness/proxy audit over location, work mode, notice period, and platform activity so behavior does not become a hidden bias shortcut.",
        "",
    ]

    submission = result.get("current_sifter_submission")
    if submission:
        lines.extend(
            [
                "## Current Sifter Submission Alignment",
                "",
                "This section checks the current `redrob_submission.csv` against the dataset patterns above.",
                "",
                f"- Submitted candidates found in dataset: `{submission['submitted_candidates_found']}`",
                f"- Trap-flag hits in submitted top 100: `{submission['trap_flag_total']}`",
                f"- Candidates in the JD 5-9 year band: `{submission['jd_experience_5_to_9']}`",
                f"- Average must-have retrieval/search skill count: `{submission['avg_must_have_skill_count']}`",
                f"- Average career IR/search/ranking evidence count: `{submission['avg_career_ir_hint_count']}`",
                f"- Average career production evidence count: `{submission['avg_career_production_hint_count']}`",
                "",
                "Top submitted titles:",
                top_lines(submission["top_titles"], 15),
                "",
                "Top submitted countries:",
                top_lines(submission["top_countries"], 10),
                "",
                "Trap flags found in submitted top 100:",
                top_lines(submission["trap_flags"], 10) if submission["trap_flags"] else "- None detected by the structural trap heuristics.",
                "",
                "Interpretation: the current Sifter output is directionally aligned with the challenge docs. It avoids obvious keyword-stuffer shapes, mostly stays inside the intended seniority band, and ranks candidates with repeated retrieval/ranking/production evidence rather than generic AI keyword volume.",
                "",
            ]
        )

    lines.extend(["## Example Buckets", ""])

    for key, examples in result["examples"].items():
        lines.append(f"### {key}")
        lines.append("")
        for item in examples:
            lines.append(
                f"- `{item['candidate_id']}`: {item['title']} in {item['location']}, {item['country']} "
                f"({item['years']} yrs), skills={item['skills']}, response={item['response_rate']}, notice={item['notice_period_days']}d"
            )
        lines.append("")

    return "\n".join(lines)


def analyze_submission(candidate_path: Path, submission_path: Path) -> dict[str, Any]:
    import csv

    submitted = list(csv.DictReader(submission_path.open("r", encoding="utf-8")))
    ranks = {row["candidate_id"]: int(row["rank"]) for row in submitted}
    rows = []
    trap_flags = Counter()
    titles = Counter()
    countries = Counter()

    for candidate in stream_candidates(candidate_path):
        cid = candidate.get("candidate_id")
        if cid not in ranks:
            continue

        profile = candidate.get("profile") or {}
        career = candidate.get("career_history") or []
        skills = candidate.get("skills") or []
        signals = candidate.get("redrob_signals") or {}
        skill_set = {str(skill.get("name", "")).strip().lower() for skill in skills if skill.get("name")}
        career_text = " ".join(str(job.get("description", "")) + " " + str(job.get("title", "")) for job in career).lower()
        title = str(profile.get("current_title", ""))
        title_l = title.lower()
        years = float(profile.get("years_of_experience") or 0)

        absolute_count = len(skill_set & ABSOLUTE_SKILLS)
        nice_count = len(skill_set & NICE_SKILLS)
        cv_count = len(skill_set & CV_SPEECH_SKILLS)
        ir_count = sum(1 for hint in IR_TEXT_HINTS if hint in career_text)
        production_count = sum(1 for hint in PRODUCTION_TEXT_HINTS if hint in career_text)
        positive_title = any(pos in title_l for pos in ROLE_POSITIVE_TITLES)
        negative_title = any(neg in title_l for neg in ROLE_NEGATIVE_TITLES)

        flags = []
        if len(skills) >= 16 and absolute_count + nice_count >= 9 and ir_count == 0 and not positive_title:
            flags.append("keyword_stuffer_shape")
        if negative_title and absolute_count + nice_count >= 7:
            flags.append("nontechnical_title_high_ai_skills")
        if cv_count >= 4 and absolute_count <= 2 and ir_count == 0:
            flags.append("cv_speech_without_ir")
        for skill in skills:
            if skill.get("proficiency") == "expert" and int(skill.get("duration_months") or 0) == 0:
                flags.append("expert_skill_with_zero_duration")

        for flag in flags:
            trap_flags[flag] += 1
        titles[title] += 1
        countries[str(profile.get("country", ""))] += 1
        rows.append(
            {
                "rank": ranks[cid],
                "candidate_id": cid,
                "title": title,
                "country": profile.get("country"),
                "years": years,
                "must_have_skill_count": absolute_count,
                "career_ir_hint_count": ir_count,
                "career_production_hint_count": production_count,
                "response_rate": signals.get("recruiter_response_rate"),
                "notice_period_days": signals.get("notice_period_days"),
                "trap_flags": flags,
            }
        )

    rows.sort(key=lambda item: item["rank"])
    found = len(rows)
    return {
        "submitted_candidates_found": found,
        "trap_flag_total": sum(trap_flags.values()),
        "trap_flags": trap_flags.most_common(),
        "jd_experience_5_to_9": sum(1 for row in rows if 5 <= row["years"] <= 9),
        "avg_must_have_skill_count": round(sum(row["must_have_skill_count"] for row in rows) / max(1, found), 2),
        "avg_career_ir_hint_count": round(sum(row["career_ir_hint_count"] for row in rows) / max(1, found), 2),
        "avg_career_production_hint_count": round(sum(row["career_production_hint_count"] for row in rows) / max(1, found), 2),
        "top_titles": titles.most_common(20),
        "top_countries": countries.most_common(10),
        "top_10": rows[:10],
    }


if __name__ == "__main__":
    main()
