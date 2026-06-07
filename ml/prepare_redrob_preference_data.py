#!/usr/bin/env python3
"""Prepare Redrob training data for a learned Sifter reranker.

Outputs:
- reranker_train.jsonl / reranker_valid.jsonl for regression reward-model training.
- dpo_train.jsonl / dpo_valid.jsonl for optional DPO-style LLM preference training.

The script accepts weak labels from Sifter's ranked pages and optional recruiter labels.
Recruiter labels override weak labels.
"""

from __future__ import annotations

import argparse
import csv
import gzip
import json
import random
from pathlib import Path
from typing import Any


DEFAULT_JOB_DESCRIPTION = (
    "Senior AI Engineer for production retrieval, embeddings, vector search, hybrid retrieval, "
    "LLM reranking, ranking evaluation, Python, model serving, monitoring, and ownership."
)

LABEL_TO_SCORE = {
    "hire": 1.0,
    "strong_fit": 0.95,
    "interview": 0.9,
    "review": 0.62,
    "maybe": 0.55,
    "not_fit": 0.08,
    "reject": 0.0,
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidates", required=True, help="Path to Redrob candidates.jsonl/json/jsonl.gz")
    parser.add_argument("--candidate-pages-dir", default="apps/web/public/redrob-candidate-pages")
    parser.add_argument("--labels-csv", default="")
    parser.add_argument("--job-description-file", default="")
    parser.add_argument("--out-dir", default="data/redrob-reranker")
    parser.add_argument("--max-records", type=int, default=50000)
    parser.add_argument("--valid-share", type=float, default=0.08)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--only-labeled", action="store_true", help="Keep only candidates present in --labels-csv.")
    args = parser.parse_args()

    random.seed(args.seed)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    job_description = Path(args.job_description_file).read_text(encoding="utf-8") if args.job_description_file else DEFAULT_JOB_DESCRIPTION
    weak_rankings = read_ranked_pages(Path(args.candidate_pages_dir))
    recruiter_labels = read_recruiter_labels(Path(args.labels_csv)) if args.labels_csv else {}

    records = []
    for candidate in stream_candidates(Path(args.candidates)):
      candidate_id = str(candidate.get("candidate_id", ""))
      if not candidate_id:
          continue
      ranked = weak_rankings.get(candidate_id, {})
      weak_score = weak_score_from_rank(ranked.get("rank"), ranked.get("score"))
      label_score = recruiter_labels.get(candidate_id, {}).get("score")
      if args.only_labeled and label_score is None:
          continue
      label_source = "recruiter" if label_score is not None else "weak_ranker"
      score = label_score if label_score is not None else weak_score
      records.append({
          "candidate_id": candidate_id,
          "query": job_description,
          "text": candidate_to_text(candidate),
          "label": round(float(score), 4),
          "source": label_source,
          "weak_rank": ranked.get("rank"),
          "weak_score": ranked.get("score"),
          "recruiter_notes": recruiter_labels.get(candidate_id, {}).get("notes", ""),
      })
      if len(records) >= args.max_records:
          break

    if len(records) < 50:
        raise SystemExit("Need at least 50 records. Check candidate path and ranked page path.")

    random.shuffle(records)
    valid_count = max(1, int(len(records) * args.valid_share))
    valid = records[:valid_count]
    train = records[valid_count:]

    write_jsonl(out_dir / "reranker_train.jsonl", train)
    write_jsonl(out_dir / "reranker_valid.jsonl", valid)

    train_pairs = build_dpo_pairs(train)
    valid_pairs = build_dpo_pairs(valid)
    write_jsonl(out_dir / "dpo_train.jsonl", train_pairs)
    write_jsonl(out_dir / "dpo_valid.jsonl", valid_pairs)

    summary = {
        "train_records": len(train),
        "valid_records": len(valid),
        "train_pairs": len(train_pairs),
        "valid_pairs": len(valid_pairs),
        "recruiter_labeled_records": sum(1 for item in records if item["source"] == "recruiter"),
        "weak_labeled_records": sum(1 for item in records if item["source"] == "weak_ranker"),
    }
    (out_dir / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


def stream_candidates(path: Path):
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8") as handle:
        first = handle.read(1)
        handle.seek(0)
        if first == "[":
            for item in json.load(handle):
                yield item
        else:
            for line in handle:
                line = line.strip()
                if line:
                    yield json.loads(line)


def read_ranked_pages(page_dir: Path) -> dict[str, dict[str, Any]]:
    rankings: dict[str, dict[str, Any]] = {}
    if not page_dir.exists():
        return rankings
    for path in sorted(page_dir.glob("page-*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        for row in payload.get("rows", []):
            rankings[row["candidate_id"]] = {"rank": row.get("rank"), "score": row.get("score")}
    return rankings


def read_recruiter_labels(path: Path) -> dict[str, dict[str, Any]]:
    if not path.exists():
        return {}
    labels: dict[str, dict[str, Any]] = {}
    with path.open("r", encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            candidate_id = (row.get("candidate_id") or "").strip()
            label = (row.get("label") or "").strip().lower()
            if candidate_id and label in LABEL_TO_SCORE:
                labels[candidate_id] = {"score": LABEL_TO_SCORE[label], "label": label, "notes": row.get("notes", "")}
    return labels


def weak_score_from_rank(rank: Any, score: Any) -> float:
    if score is not None:
        return max(0.0, min(1.0, float(score)))
    if rank is None:
        return 0.15
    rank = int(rank)
    if rank <= 100:
        return 0.9
    if rank <= 1000:
        return 0.72
    if rank <= 10000:
        return 0.45
    return 0.12


def candidate_to_text(candidate: dict[str, Any]) -> str:
    profile = candidate.get("profile", {})
    career = candidate.get("career_history", [])
    skills = candidate.get("skills", [])
    certs = candidate.get("certifications", [])
    signals = candidate.get("redrob_signals", {})
    parts = [
        f"Title: {profile.get('current_title', '')}",
        f"Headline: {profile.get('headline', '')}",
        f"Summary: {profile.get('summary', '')}",
        f"Experience years: {profile.get('years_of_experience', '')}",
        f"Location: {profile.get('location', '')}, {profile.get('country', '')}",
        "Career: " + " | ".join(f"{item.get('title','')} {item.get('industry','')} {item.get('description','')}" for item in career[:6]),
        "Skills: " + ", ".join(f"{item.get('name','')} ({item.get('proficiency','')})" for item in skills[:30]),
        "Certifications: " + ", ".join(f"{item.get('name','')} {item.get('issuer','')}" for item in certs[:8]),
        "Assessments: " + ", ".join((signals.get("skill_assessment_scores") or {}).keys()),
        f"Behavior: response_rate={signals.get('recruiter_response_rate','')}, notice_days={signals.get('notice_period_days','')}, open_to_work={signals.get('open_to_work_flag','')}",
    ]
    return "\n".join(part for part in parts if part.strip())


def build_dpo_pairs(records: list[dict[str, Any]]) -> list[dict[str, str]]:
    ordered = sorted(records, key=lambda item: item["label"], reverse=True)
    top = ordered[: max(20, len(ordered) // 5)]
    bottom = ordered[-max(20, len(ordered) // 5):]
    pairs = []
    for chosen in top:
        rejected = random.choice(bottom)
        if chosen["candidate_id"] == rejected["candidate_id"] or chosen["label"] <= rejected["label"]:
            continue
        pairs.append({
            "prompt": f"Job description:\n{chosen['query']}\n\nChoose the stronger candidate for this role and explain briefly.",
            "chosen": f"Candidate {chosen['candidate_id']}:\n{chosen['text']}\n\nDecision: stronger fit.",
            "rejected": f"Candidate {rejected['candidate_id']}:\n{rejected['text']}\n\nDecision: weaker fit.",
        })
    return pairs


def write_jsonl(path: Path, records: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
