#!/usr/bin/env python3
"""Convert a reviewed candidate CSV into Sifter recruiter labels.

Input: docs/dataset-analysis/redrob_candidate_review_set.csv
Output: data/redrob-reviewed-labels.csv

Rows without reviewer_label are skipped by default so the model only learns from
human-reviewed decisions.
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path


VALID_LABELS = {"strong_fit", "maybe", "not_fit", "interview", "hire", "review", "reject"}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="docs/dataset-analysis/redrob_candidate_review_set.csv")
    parser.add_argument("--output", default="data/redrob-reviewed-labels.csv")
    parser.add_argument("--include-suggested", action="store_true", help="Use suggested_label when reviewer_label is blank.")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    rows = []
    with input_path.open("r", encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            label = (row.get("reviewer_label") or "").strip().lower()
            if not label and args.include_suggested:
                label = (row.get("suggested_label") or "").strip().lower()
            if not label:
                continue
            if label not in VALID_LABELS:
                raise SystemExit(f"Invalid label for {row.get('candidate_id')}: {label}")
            rows.append(
                {
                    "candidate_id": row["candidate_id"],
                    "label": label,
                    "notes": row.get("reviewer_notes") or f"{row.get('review_bucket', '')}: {row.get('evidence_summary', '')}; {row.get('concern_summary', '')}",
                }
            )

    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["candidate_id", "label", "notes"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} reviewed labels to {output_path}")


if __name__ == "__main__":
    main()
