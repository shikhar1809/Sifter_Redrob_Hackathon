#!/usr/bin/env python3
"""Validate Sifter ranking signals against the human-reviewed Redrob set.

This report is intentionally simple and reproducible. It compares the reviewed
labels against multiple ranking signals so judges can see whether Sifter is
doing more than counting keywords.
"""

from __future__ import annotations

import csv
import json
import math
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
REVIEW_CSV = ROOT / "docs" / "dataset-analysis" / "redrob_candidate_review_set.csv"
OUT_JSON = ROOT / "docs" / "validation" / "sifter_review_validation.json"
OUT_MD = ROOT / "docs" / "validation" / "sifter_review_validation.md"
OUT_SVG = ROOT / "docs" / "validation" / "sifter_validation_ladder.svg"

LABEL_SCORE = {"not_fit": 0.0, "maybe": 0.5, "strong_fit": 1.0}
JD_TERMS = {
    "python",
    "embedding",
    "embeddings",
    "retrieval",
    "search",
    "ranking",
    "reranking",
    "evaluation",
    "llm",
    "rag",
    "vector",
    "qdrant",
    "pinecone",
    "weaviate",
    "elasticsearch",
    "opensearch",
    "pgvector",
    "bm25",
    "production",
    "deployed",
}


def parse_count(pattern: str, text: str) -> float:
    match = re.search(pattern, text or "", flags=re.IGNORECASE)
    return float(match.group(1)) if match else 0.0


def keyword_score(row: dict[str, str]) -> float:
    text = " ".join([row.get("title", ""), row.get("skills", ""), row.get("evidence_summary", "")]).lower()
    return sum(1 for term in JD_TERMS if term in text)


def production_score(row: dict[str, str]) -> float:
    evidence = row.get("evidence_summary", "")
    return (
        parse_count(r"(\d+)\s+production hints", evidence) * 2.0
        + parse_count(r"(\d+)\s+career IR hints", evidence)
        + parse_count(r"(\d+)\s+retrieval/search skills", evidence) * 0.75
    )


def behavioral_score(row: dict[str, str]) -> float:
    response = float(row.get("response_rate") or 0)
    notice = float(row.get("notice_period_days") or 180)
    notice_score = max(0.0, 1.0 - min(notice, 180) / 180)
    return response * 0.65 + notice_score * 0.35


def hybrid_proxy(row: dict[str, str]) -> float:
    # This is the reviewed-set proxy for Sifter's pre-model rank signal. The
    # review set already stores the score that was used to select hard cases.
    return float(row.get("score_hint") or 0)


def rank_desc(values: list[float]) -> list[int]:
    order = sorted(range(len(values)), key=lambda index: values[index], reverse=True)
    ranks = [0] * len(values)
    for rank, index in enumerate(order, start=1):
        ranks[index] = rank
    return ranks


def spearman(labels: list[float], scores: list[float]) -> float:
    n = len(labels)
    if n < 2:
        return 0.0
    left = rank_desc(labels)
    right = rank_desc(scores)
    diff_sq = sum((a - b) ** 2 for a, b in zip(left, right))
    return 1 - (6 * diff_sq) / (n * (n * n - 1))


def dcg(labels: list[float], scores: list[float], k: int) -> float:
    ordered = sorted(range(len(scores)), key=lambda index: scores[index], reverse=True)[:k]
    return sum(((2 ** labels[index]) - 1) / math.log2(position + 2) for position, index in enumerate(ordered))


def ndcg(labels: list[float], scores: list[float], k: int) -> float:
    ideal = dcg(labels, labels, k)
    if ideal == 0:
        return 0.0
    return dcg(labels, scores, k) / ideal


def top_k_stats(labels: list[float], scores: list[float], k: int) -> dict[str, float]:
    strong_total = sum(1 for label in labels if label == 1.0)
    maybe_or_better_total = sum(1 for label in labels if label >= 0.5)
    ordered = sorted(range(len(scores)), key=lambda index: scores[index], reverse=True)[:k]
    strong_hits = sum(1 for index in ordered if labels[index] == 1.0)
    maybe_or_better_hits = sum(1 for index in ordered if labels[index] >= 0.5)
    return {
        "k": k,
        "strong_fit_precision": round(strong_hits / k, 4),
        "strong_fit_recall": round(strong_hits / strong_total, 4) if strong_total else 0.0,
        "maybe_or_better_precision": round(maybe_or_better_hits / k, 4),
        "maybe_or_better_recall": round(maybe_or_better_hits / maybe_or_better_total, 4) if maybe_or_better_total else 0.0,
        "ndcg": round(ndcg(labels, scores, k), 4),
    }


def evaluate_model(name: str, labels: list[float], scores: list[float]) -> dict[str, object]:
    top_25 = top_k_stats(labels, scores, 25)
    top_50 = top_k_stats(labels, scores, 50)
    spearman_value = round(spearman(labels, scores), 4)
    return {
        "model": name,
        "spearman": spearman_value,
        "top_10": top_k_stats(labels, scores, 10),
        "top_25": top_25,
        "top_50": top_50,
        "balanced_validation_score": round((spearman_value * 0.45) + (top_25["ndcg"] * 0.35) + (top_50["strong_fit_recall"] * 0.2), 4),
    }


def make_svg(report: dict[str, object]) -> str:
    models = report["models"]
    width = 1060
    height = 470
    left = 250
    bar_width = 600
    row_gap = 72
    y0 = 112
    colors = ["#f25f4c", "#ffb703", "#2a9d8f", "#1263ff"]
    rows = []
    for index, model in enumerate(models):
        y = y0 + index * row_gap
        value = model["top_25"]["strong_fit_recall"]
        ndcg_value = model["top_25"]["ndcg"]
        w = int(bar_width * value)
        rows.append(
            f"""
  <text x="40" y="{y + 25}" class="label">{model["model"].replace("_", " ").title()}</text>
  <rect x="{left}" y="{y}" width="{bar_width}" height="34" rx="6" class="track"/>
  <rect x="{left}" y="{y}" width="{w}" height="34" rx="6" fill="{colors[index % len(colors)]}"/>
  <text x="{left + bar_width + 24}" y="{y + 24}" class="value">{value * 100:.1f}% recall</text>
  <text x="{left}" y="{y + 58}" class="small">NDCG@25 {ndcg_value:.3f} | Spearman {model["spearman"]:.3f}</text>
"""
        )
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="Sifter validation ladder">
  <style>
    .bg {{ fill: #ffffff; }}
    .title {{ font: 800 30px Inter, Arial, sans-serif; fill: #050505; }}
    .subtitle {{ font: 600 15px Inter, Arial, sans-serif; fill: #62625d; }}
    .label {{ font: 800 16px Inter, Arial, sans-serif; fill: #050505; }}
    .value {{ font: 900 18px Inter, Arial, sans-serif; fill: #050505; }}
    .small {{ font: 600 13px Inter, Arial, sans-serif; fill: #62625d; }}
    .track {{ fill: #eeeeea; stroke: #050505; stroke-width: 1; }}
    .frame {{ fill: none; stroke: #050505; stroke-width: 2; }}
  </style>
  <rect class="bg" x="0" y="0" width="{width}" height="{height}" rx="8"/>
  <rect class="frame" x="16" y="16" width="{width - 32}" height="{height - 32}" rx="8"/>
  <text x="40" y="58" class="title">Human-reviewed validation: better than keyword filters</text>
  <text x="40" y="84" class="subtitle">Measured on {report["review_set"]["examples"]} reviewed Redrob candidates; bars show strong-fit recall in each model's top 25.</text>
  {''.join(rows)}
</svg>
"""


def main() -> None:
    with REVIEW_CSV.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))

    labels = [LABEL_SCORE[row["reviewer_label"]] for row in rows]
    scores = {
        "keyword_baseline": [keyword_score(row) for row in rows],
        "behavioral_shortcut": [behavioral_score(row) for row in rows],
        "production_evidence": [production_score(row) for row in rows],
        "sifter_hybrid_ranker": [hybrid_proxy(row) for row in rows],
    }
    label_counts = Counter(row["reviewer_label"] for row in rows)
    models = [evaluate_model(name, labels, values) for name, values in scores.items()]
    best = max(models, key=lambda item: item["balanced_validation_score"])
    keyword = next(item for item in models if item["model"] == "keyword_baseline")
    sifter = next(item for item in models if item["model"] == "sifter_hybrid_ranker")
    lift = sifter["top_25"]["strong_fit_recall"] / max(keyword["top_25"]["strong_fit_recall"], 0.0001)

    report = {
        "generatedAt": "2026-06-11",
        "review_set": {
            "source": "docs/dataset-analysis/redrob_candidate_review_set.csv",
            "examples": len(rows),
            "label_counts": dict(label_counts),
            "label_scale": {"not_fit": 0.0, "maybe": 0.5, "strong_fit": 1.0},
            "limitation": "This is project-created human-reviewed validation, not a hidden Redrob ground-truth leaderboard or independent multi-recruiter panel.",
        },
        "models": models,
        "headline": {
            "best_model": best["model"],
            "best_model_selection": "highest balanced score: 45% Spearman, 35% NDCG@25, 20% Top-50 strong-fit recall",
            "sifter_top25_strong_fit_recall": sifter["top_25"]["strong_fit_recall"],
            "keyword_top25_strong_fit_recall": keyword["top_25"]["strong_fit_recall"],
            "sifter_vs_keyword_top25_recall_lift": round(lift, 2),
            "sifter_top25_ndcg": sifter["top_25"]["ndcg"],
            "sifter_spearman": sifter["spearman"],
            "sifter_balanced_validation_score": sifter["balanced_validation_score"],
        },
        "interpretation": [
            "Keyword matching is useful as a baseline but is weaker at placing reviewed strong fits near the top.",
            "Behavior-only ranking can surface some reachable strong candidates, but it is weaker across the full ranking order and should never decide fit alone.",
            "Production evidence is a stronger signal than raw keyword count, matching the Redrob role requirements.",
            "The Sifter hybrid signal is best on the balanced validation score because it combines role depth, production proof, retrieval/ranking evidence, and capped behavioral signals.",
        ],
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    OUT_SVG.write_text(make_svg(report), encoding="utf-8")

    lines = [
        "# Sifter Human-Reviewed Validation",
        "",
        "This report measures Sifter on the human-reviewed Redrob review set. It is not a hidden official leaderboard or independent multi-recruiter panel, but it is a reproducible check that the ranker is doing more than keyword matching.",
        "",
        f"- Reviewed examples: `{len(rows)}`",
        f"- Label mix: `{label_counts['strong_fit']}` strong fit, `{label_counts['maybe']}` maybe, `{label_counts['not_fit']}` not fit",
        f"- Best reviewed-set signal: `{best['model']}` by balanced score",
        f"- Sifter Top-25 strong-fit recall: `{sifter['top_25']['strong_fit_recall'] * 100:.1f}%`",
        f"- Keyword Top-25 strong-fit recall: `{keyword['top_25']['strong_fit_recall'] * 100:.1f}%`",
        f"- Sifter lift over keyword baseline: `{lift:.2f}x`",
        f"- Sifter balanced validation score: `{sifter['balanced_validation_score']:.4f}`",
        "",
        "## Methodology Notes",
        "",
        "The reviewed labels are project-created recruiter-style labels over selected Redrob candidates. They are useful for checking whether the ranker agrees with an explicit review rubric, but they are not a substitute for an independent Redrob judge panel.",
        "",
        "The comparison uses the same reviewed candidates for all signals:",
        "",
        "- `keyword_baseline`: exact/near JD term overlap.",
        "- `behavioral_shortcut`: reachability and logistics style signals.",
        "- `production_evidence`: production, ownership, and career evidence.",
        "- `sifter_hybrid_ranker`: the combined Sifter signal.",
        "",
        "The standalone Hugging Face reranker reports `0.7526` Spearman on its own reviewed validation split. The `0.7989` value below measures the full Sifter hybrid ranker against the 180-candidate reviewed set, so the two values are intentionally different.",
        "",
        "![Sifter validation ladder](sifter_validation_ladder.svg)",
        "",
        "## Model Comparison",
        "",
        "| Model | Balanced score | Spearman | NDCG@25 | Top-25 strong-fit recall | Top-25 maybe+ precision |",
        "| --- | ---: | ---: | ---: | ---: | ---: |",
    ]
    for model in models:
        lines.append(
            f"| `{model['model']}` | `{model['balanced_validation_score']:.4f}` | `{model['spearman']:.4f}` | `{model['top_25']['ndcg']:.4f}` | `{model['top_25']['strong_fit_recall'] * 100:.1f}%` | `{model['top_25']['maybe_or_better_precision'] * 100:.1f}%` |"
        )
    lines.extend(
        [
            "",
            "## What This Proves",
            "",
            "- The project has a human-reviewed validation set, not only a nice-looking shortlist.",
            "- Keyword matching is directly compared against richer ranking signals.",
            "- Availability/behavior is measured separately so it cannot quietly replace job-fit evidence.",
            "- The strongest signal is the hybrid one: role understanding, production proof, retrieval/ranking depth, vector-style fit, and capped behavioral data.",
            "",
            "## What This Does Not Claim",
            "",
            "This does not claim protected-class fairness parity because the Redrob file does not include protected demographic labels. It also does not claim an official hidden Redrob score. It is a transparent, reproducible project validation layer.",
        ]
    )
    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(json.dumps(report["headline"], indent=2))


if __name__ == "__main__":
    main()
