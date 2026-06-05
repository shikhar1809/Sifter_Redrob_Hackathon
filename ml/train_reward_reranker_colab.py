#!/usr/bin/env python3
"""Fine-tune a Hugging Face cross-encoder reward/reranker model.

This is designed for Google Colab GPU runtimes.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from datasets import load_dataset
from sklearn.metrics import mean_absolute_error, mean_squared_error
from scipy.stats import spearmanr
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    DataCollatorWithPadding,
    Trainer,
    TrainingArguments,
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", default="data/redrob-reranker")
    parser.add_argument("--base-model", default="microsoft/deberta-v3-small")
    parser.add_argument("--output-dir", default="outputs/sifter-redrob-reranker")
    parser.add_argument("--hub-model-id", default="")
    parser.add_argument("--epochs", type=float, default=2)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--learning-rate", type=float, default=2e-5)
    parser.add_argument("--max-length", type=int, default=512)
    parser.add_argument("--push-to-hub", action="store_true")
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    dataset = load_dataset(
        "json",
        data_files={
            "train": str(data_dir / "reranker_train.jsonl"),
            "validation": str(data_dir / "reranker_valid.jsonl"),
        },
    )

    tokenizer = AutoTokenizer.from_pretrained(args.base_model, use_fast=True)

    def tokenize(batch):
        pairs = [f"Job description:\n{q}\n\nCandidate profile:\n{t}" for q, t in zip(batch["query"], batch["text"])]
        encoded = tokenizer(pairs, truncation=True, max_length=args.max_length)
        encoded["labels"] = [float(value) for value in batch["label"]]
        return encoded

    tokenized = dataset.map(tokenize, batched=True, remove_columns=dataset["train"].column_names)

    model = AutoModelForSequenceClassification.from_pretrained(
        args.base_model,
        num_labels=1,
        problem_type="regression",
    )

    training_args = TrainingArguments(
        output_dir=args.output_dir,
        learning_rate=args.learning_rate,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        num_train_epochs=args.epochs,
        weight_decay=0.01,
        eval_strategy="steps",
        eval_steps=250,
        save_steps=250,
        logging_steps=50,
        load_best_model_at_end=True,
        metric_for_best_model="spearman",
        greater_is_better=True,
        fp16=True,
        report_to="none",
        push_to_hub=args.push_to_hub,
        hub_model_id=args.hub_model_id or None,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized["train"],
        eval_dataset=tokenized["validation"],
        tokenizer=tokenizer,
        data_collator=DataCollatorWithPadding(tokenizer),
        compute_metrics=compute_metrics,
    )

    trainer.train()
    metrics = trainer.evaluate()
    trainer.save_model(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)
    Path(args.output_dir, "eval_metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps(metrics, indent=2))

    if args.push_to_hub:
        trainer.push_to_hub()


def compute_metrics(eval_pred):
    predictions, labels = eval_pred
    preds = np.asarray(predictions).reshape(-1)
    labels = np.asarray(labels).reshape(-1)
    spearman = spearmanr(labels, preds).correlation
    if np.isnan(spearman):
        spearman = 0.0
    return {
        "rmse": float(mean_squared_error(labels, preds, squared=False)),
        "mae": float(mean_absolute_error(labels, preds)),
        "spearman": float(spearman),
    }


if __name__ == "__main__":
    main()
