#!/usr/bin/env python3
"""Upload the curated Sifter model card to Hugging Face.

Run after `huggingface-cli login` or with HF_TOKEN in the environment.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from huggingface_hub import HfApi
from huggingface_hub.errors import HfHubHTTPError, RepositoryNotFoundError


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-id", default="shikharshahi/sifter-redrob-reranker")
    parser.add_argument("--card", default="ml/huggingface_model_card.md")
    parser.add_argument("--repo-type", default="model", choices=["model", "space", "dataset"])
    args = parser.parse_args()

    card_path = Path(args.card)
    if not card_path.exists():
        raise SystemExit(f"Model card not found: {card_path}")

    api = HfApi()
    try:
        api.upload_file(
            path_or_fileobj=str(card_path),
            path_in_repo="README.md",
            repo_id=args.repo_id,
            repo_type=args.repo_type,
            commit_message="Update Sifter reranker model card",
        )
    except (RepositoryNotFoundError, HfHubHTTPError) as error:
        raise SystemExit(
            "Could not upload the model card. Log in with a Hugging Face write token first, "
            "or set HF_TOKEN in the environment. Original error: "
            f"{error}"
        ) from error
    print(f"Uploaded {card_path} to {args.repo_id}/README.md")


if __name__ == "__main__":
    main()
