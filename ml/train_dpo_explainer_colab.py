#!/usr/bin/env python3
"""Optional DPO training for an LLM-style candidate preference explainer.

Use this after prepare_redrob_preference_data.py creates dpo_train.jsonl and dpo_valid.jsonl.
This is heavier than the reward reranker and is meant for Colab GPU/A100-style runtimes.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from datasets import load_dataset
from peft import LoraConfig
from transformers import AutoModelForCausalLM, AutoTokenizer
from trl import DPOConfig, DPOTrainer


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", default="data/redrob-reranker")
    parser.add_argument("--base-model", default="Qwen/Qwen2.5-0.5B-Instruct")
    parser.add_argument("--output-dir", default="outputs/sifter-redrob-dpo-explainer")
    parser.add_argument("--hub-model-id", default="")
    parser.add_argument("--epochs", type=float, default=1)
    parser.add_argument("--batch-size", type=int, default=2)
    parser.add_argument("--learning-rate", type=float, default=5e-6)
    parser.add_argument("--push-to-hub", action="store_true")
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    dataset = load_dataset(
        "json",
        data_files={
            "train": str(data_dir / "dpo_train.jsonl"),
            "validation": str(data_dir / "dpo_valid.jsonl"),
        },
    )

    tokenizer = AutoTokenizer.from_pretrained(args.base_model, use_fast=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(args.base_model, device_map="auto")
    peft_config = LoraConfig(
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
    )

    training_args = DPOConfig(
        output_dir=args.output_dir,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        num_train_epochs=args.epochs,
        learning_rate=args.learning_rate,
        beta=0.1,
        max_length=1024,
        max_prompt_length=512,
        eval_strategy="steps",
        eval_steps=100,
        save_steps=100,
        logging_steps=25,
        fp16=True,
        report_to="none",
        push_to_hub=args.push_to_hub,
        hub_model_id=args.hub_model_id or None,
    )

    trainer = DPOTrainer(
        model=model,
        args=training_args,
        train_dataset=dataset["train"],
        eval_dataset=dataset["validation"],
        processing_class=tokenizer,
        peft_config=peft_config,
    )
    trainer.train()
    trainer.save_model(args.output_dir)
    if args.push_to_hub:
        trainer.push_to_hub()


if __name__ == "__main__":
    main()
