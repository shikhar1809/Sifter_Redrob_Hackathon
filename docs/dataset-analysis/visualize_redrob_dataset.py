#!/usr/bin/env python3
"""Create high-level 2D graphics from the Redrob dataset analysis profile."""

from __future__ import annotations

import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np


ROOT = Path(__file__).resolve().parent
PROFILE_PATH = ROOT / "redrob_dataset_profile.json"
OUT_DIR = ROOT / "visuals"

INK = "#111111"
MUTED = "#666666"
PAPER = "#f7f6f0"
BLUE = "#1769ff"
TEAL = "#0f9b8e"
GREEN = "#1f8f4d"
GOLD = "#c58a00"
RED = "#d63f2f"
PURPLE = "#6a4bc2"
GRAY = "#d8d6cc"


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    profile = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "axes.facecolor": PAPER,
            "figure.facecolor": PAPER,
            "axes.edgecolor": INK,
            "axes.labelcolor": INK,
            "xtick.color": INK,
            "ytick.color": INK,
            "axes.titleweight": "bold",
        }
    )

    draw_signal_rarity(profile)
    draw_trap_landscape(profile)
    draw_behavioral_dashboard(profile)
    draw_sifter_alignment(profile)
    print(f"Wrote visuals to {OUT_DIR}")


def draw_signal_rarity(profile: dict) -> None:
    total = profile["records"]
    role = profile["role_fit_counts"]
    items = [
        ("All candidates", total, BLUE),
        ("5-9 yrs", role["jd_experience_5_to_9"], TEAL),
        ("4+ retrieval/search skills", role["must_have_skill_4plus"], GREEN),
        ("Career IR evidence", role["career_ir_evidence_2plus"], GOLD),
        ("Strict high-signal shape", role["high_signal_profile_shape"], RED),
    ]

    fig, ax = plt.subplots(figsize=(13, 7.2))
    ax.set_title("Redrob dataset: the real fit pool is intentionally narrow", fontsize=22, loc="left", pad=24)
    ax.text(
        0,
        1.03,
        "The challenge is not to find AI keywords. It is to separate a small group of production retrieval/ranking candidates from 100,000 profiles.",
        transform=ax.transAxes,
        fontsize=12.5,
        color=MUTED,
    )

    y = np.arange(len(items))
    counts = [item[1] for item in items]
    colors = [item[2] for item in items]
    ax.barh(y, counts, color=colors, height=0.58)
    ax.set_yticks(y)
    ax.set_yticklabels([item[0] for item in items], fontsize=12)
    ax.invert_yaxis()
    ax.set_xlim(0, total * 1.04)
    ax.set_xlabel("Candidate count", fontsize=11)
    ax.grid(axis="x", color="#e4e1d6", linewidth=1)
    ax.spines[["top", "right"]].set_visible(False)

    for i, (_, count, _) in enumerate(items):
        pct = count / total * 100
        ax.text(count + total * 0.012, i, f"{count:,}  ({pct:.1f}%)", va="center", fontsize=12, weight="bold")

    ax.text(
        0.62,
        0.18,
        "Data-science takeaway:\nA top-100 ranker must be precise.\nOnly 210 candidates matched the strict\nhigh-signal shape in our structural audit.",
        transform=ax.transAxes,
        fontsize=14,
        color=INK,
        bbox=dict(boxstyle="round,pad=0.55", facecolor="white", edgecolor=INK, linewidth=1.3),
    )
    save(fig, "redrob_signal_rarity.png")


def draw_trap_landscape(profile: dict) -> None:
    traps = profile["honeypot_or_trap_flags"]
    labels = [
        "Nontechnical title\nwith AI skills",
        "Keyword-stuffer\nshape",
        "CV/speech heavy\nwithout IR",
        "Expert skill\n0 duration",
        "Experience/history\ngap",
    ]
    keys = [
        "nontechnical_title_high_ai_skills",
        "keyword_stuffer_shape",
        "cv_speech_without_ir",
        "expert_skill_with_zero_duration",
        "experience_history_gap_over_4y",
    ]
    values = [traps.get(key, 0) for key in keys]
    colors = [RED, GOLD, PURPLE, TEAL, BLUE]

    fig, ax = plt.subplots(figsize=(13, 7.2))
    ax.set_title("Trap landscape: why keyword matching is dangerous", fontsize=22, loc="left", pad=24)
    ax.text(
        0,
        1.03,
        "The challenge docs warn about keyword stuffers, behavioral twins, plain-language fits, and honeypots. The structural scan found these high-risk shapes.",
        transform=ax.transAxes,
        fontsize=12.5,
        color=MUTED,
    )
    bars = ax.bar(labels, values, color=colors, width=0.62)
    ax.set_ylabel("Candidate/profile-signal count", fontsize=11)
    ax.grid(axis="y", color="#e4e1d6", linewidth=1)
    ax.spines[["top", "right"]].set_visible(False)
    ax.tick_params(axis="x", labelsize=11)
    for bar, value in zip(bars, values):
        ax.text(bar.get_x() + bar.get_width() / 2, value + 65, f"{value:,}", ha="center", fontsize=13, weight="bold")

    ax.text(
        0.57,
        0.64,
        "Ranking decision:\nDo not reward skill count blindly.\nRequire role-title fit, career evidence,\nand consistency checks before boosting.",
        transform=ax.transAxes,
        fontsize=14,
        color=INK,
        bbox=dict(boxstyle="round,pad=0.55", facecolor="white", edgecolor=INK, linewidth=1.3),
    )
    save(fig, "redrob_trap_landscape.png")


def draw_behavioral_dashboard(profile: dict) -> None:
    num = profile["numeric"]
    top = profile["top_counters"]

    fig, axes = plt.subplots(2, 2, figsize=(13, 8.2))
    fig.suptitle("Behavioral signals: useful for availability, risky as a primary score", fontsize=22, x=0.03, y=0.98, ha="left", weight="bold")
    fig.text(
        0.03,
        0.925,
        "Redrob says behavior should modify fit. The audit shows why it should be capped: many profiles are not open, not relocatable, or slow to respond.",
        fontsize=12.5,
        color=MUTED,
    )

    metric_bars(
        axes[0, 0],
        "Availability medians",
        ["Response rate", "Notice days", "Response hours"],
        [
            num["signals.recruiter_response_rate"]["p50"] * 100,
            num["signals.notice_period_days"]["p50"],
            num["signals.avg_response_time_hours"]["p50"],
        ],
        [TEAL, GOLD, RED],
        ["44%", "90 days", "129.9 hrs"],
    )

    metric_bars(
        axes[0, 1],
        "Practical hiring flags",
        ["Open to work", "Willing relocate", "LinkedIn connected"],
        [
            counter_value(top["signals.open_to_work_flag"], "True") / profile["records"] * 100,
            counter_value(top["signals.willing_to_relocate"], "True") / profile["records"] * 100,
            counter_value(top["signals.linkedin_connected"], "True") / profile["records"] * 100,
        ],
        [GREEN, BLUE, PURPLE],
        [
            f"{counter_value(top['signals.open_to_work_flag'], 'True') / profile['records'] * 100:.1f}%",
            f"{counter_value(top['signals.willing_to_relocate'], 'True') / profile['records'] * 100:.1f}%",
            f"{counter_value(top['signals.linkedin_connected'], 'True') / profile['records'] * 100:.1f}%",
        ],
        percent_axis=True,
    )

    work_mode_items = profile["top_counters"]["signals.preferred_work_mode"][:4]
    axes[1, 0].pie(
        [count for _, count in work_mode_items],
        labels=[name for name, _ in work_mode_items],
        autopct="%1.1f%%",
        startangle=90,
        colors=[BLUE, TEAL, GOLD, GREEN],
        textprops={"fontsize": 11},
        wedgeprops={"linewidth": 1, "edgecolor": PAPER},
    )
    axes[1, 0].set_title("Preferred work mode is evenly distributed", fontsize=14, weight="bold")

    gh = num["signals.github_activity_score"]
    axes[1, 1].bar(["p25", "median", "p75", "p95"], [gh["p25"], gh["p50"], gh["p75"], gh["p95"]], color=[GRAY, GRAY, BLUE, TEAL])
    axes[1, 1].set_title("GitHub activity is sparse", fontsize=14, weight="bold")
    axes[1, 1].set_ylabel("GitHub activity score")
    axes[1, 1].grid(axis="y", color="#e4e1d6")
    axes[1, 1].spines[["top", "right"]].set_visible(False)
    axes[1, 1].text(
        0.08,
        0.84,
        "Median is -1:\nno GitHub linked for many profiles.\nUseful signal, bad hard filter.",
        transform=axes[1, 1].transAxes,
        fontsize=12,
        bbox=dict(boxstyle="round,pad=0.4", facecolor="white", edgecolor=INK),
    )

    save(fig, "redrob_behavioral_signals.png")


def draw_sifter_alignment(profile: dict) -> None:
    submission = profile["current_sifter_submission"]
    total = profile["records"]
    full = {
        "Must-have skills\n(avg count)": profile["numeric"]["must_have_skill_count"]["mean"],
        "Career IR evidence\n(avg count)": profile["numeric"]["career_ir_text_hint_count"]["mean"],
        "Production evidence\n(avg count)": profile["numeric"]["career_production_text_hint_count"]["mean"],
        "JD 5-9 yrs\n(% candidates)": profile["role_fit_counts"]["jd_experience_5_to_9"] / total * 100,
        "Trap shape rate\n(% candidates)": sum(profile["honeypot_or_trap_flags"].values()) / total * 100,
    }
    sifter = {
        "Must-have skills\n(avg count)": submission["avg_must_have_skill_count"],
        "Career IR evidence\n(avg count)": submission["avg_career_ir_hint_count"],
        "Production evidence\n(avg count)": submission["avg_career_production_hint_count"],
        "JD 5-9 yrs\n(% candidates)": submission["jd_experience_5_to_9"],
        "Trap shape rate\n(% candidates)": submission["trap_flag_total"],
    }

    labels = list(full)
    x = np.arange(len(labels))
    width = 0.36

    fig, ax = plt.subplots(figsize=(13, 7.2))
    ax.set_title("Sifter top 100 alignment: evidence up, traps down", fontsize=22, loc="left", pad=24)
    ax.text(
        0,
        1.03,
        "The submitted top 100 is not just keyword-heavy. It concentrates retrieval/ranking/production evidence and avoids structural trap flags.",
        transform=ax.transAxes,
        fontsize=12.5,
        color=MUTED,
    )
    full_values = [full[label] for label in labels]
    sifter_values = [sifter[label] for label in labels]
    ax.bar(x - width / 2, full_values, width, label="Full dataset baseline", color=GRAY, edgecolor=INK, linewidth=0.6)
    ax.bar(x + width / 2, sifter_values, width, label="Sifter submitted top 100", color=BLUE)
    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontsize=10)
    ax.grid(axis="y", color="#e4e1d6")
    ax.spines[["top", "right"]].set_visible(False)
    ax.legend(frameon=False, fontsize=11)

    for xpos, values in [(x - width / 2, full_values), (x + width / 2, sifter_values)]:
        for xp, value in zip(xpos, values):
            ax.text(xp, value + max(full_values + sifter_values) * 0.015, f"{value:.2f}" if value < 20 else f"{value:.0f}", ha="center", fontsize=10, weight="bold")

    ax.text(
        0.62,
        0.56,
        "Top-100 audit:\n100/100 found in dataset\n0 trap-flag hits\n90/100 in the JD experience band",
        transform=ax.transAxes,
        fontsize=14,
        bbox=dict(boxstyle="round,pad=0.55", facecolor="white", edgecolor=INK, linewidth=1.3),
    )

    save(fig, "redrob_sifter_alignment.png")


def metric_bars(ax, title: str, labels: list[str], values: list[float], colors: list[str], annotations: list[str], percent_axis: bool = False) -> None:
    bars = ax.bar(labels, values, color=colors, width=0.58)
    ax.set_title(title, fontsize=14, weight="bold")
    if percent_axis:
        ax.set_ylim(0, 100)
        ax.set_ylabel("% of profiles")
    ax.grid(axis="y", color="#e4e1d6")
    ax.spines[["top", "right"]].set_visible(False)
    ax.tick_params(axis="x", labelsize=10)
    for bar, text in zip(bars, annotations):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 2, text, ha="center", fontsize=11, weight="bold")


def counter_value(items: list[list], name: str) -> int:
    for item_name, count in items:
        if str(item_name) == name:
            return int(count)
    return 0


def save(fig, filename: str) -> None:
    fig.tight_layout(rect=[0, 0, 1, 0.96])
    path = OUT_DIR / filename
    fig.savefig(path, dpi=180, bbox_inches="tight")
    plt.close(fig)


if __name__ == "__main__":
    main()
