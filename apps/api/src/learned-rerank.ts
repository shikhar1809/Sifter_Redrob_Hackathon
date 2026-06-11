import type { RedrobCandidate, RedrobRankingRow } from "@seederpro/core";
import { config } from "./config.js";

const hfInferenceBaseUrl = "https://router.huggingface.co/hf-inference/models";
const seniorAiEngineerPrompt = [
  "Senior AI Engineer role requiring production retrieval systems, embeddings, vector search, hybrid retrieval, LLM reranking, ranking evaluation, Python, model serving, monitoring, and ownership.",
  "Strong candidates show shipped production AI, search relevance, NDCG/MRR/evaluation, retrieval augmented generation, latency monitoring, and practical system design.",
].join(" ");

export type LearnedRerankMetadata = {
  enabled: boolean;
  configured: boolean;
  model: string;
  status: "disabled" | "not_configured" | "completed" | "fallback";
  reviewedCandidates: number;
  weight: number;
  message: string;
};

export async function rerankRedrobRowsWithLearnedModel(
  candidates: RedrobCandidate[],
  rows: RedrobRankingRow[],
  options: { enabled?: boolean; weight?: number; limit?: number } = {},
): Promise<{ rows: RedrobRankingRow[]; metadata: LearnedRerankMetadata }> {
  const enabled = options.enabled ?? config.learnedRerankEnabled;
  const weight = clamp01(options.weight ?? config.learnedRerankWeight);
  const model = config.sifterRerankerModel;
  const configured = Boolean(config.huggingFaceToken || config.sifterRerankerSpaceUrl);
  const baseMetadata: LearnedRerankMetadata = {
    enabled,
    configured,
    model,
    status: enabled ? "fallback" : "disabled",
    reviewedCandidates: 0,
    weight,
    message: enabled ? "Learned rerank was requested." : "Learned rerank is disabled; deterministic ranking was used.",
  };

  if (!enabled) return { rows, metadata: baseMetadata };
  if (!configured) {
    return {
      rows,
      metadata: {
        ...baseMetadata,
        status: "not_configured",
        message: "Set SIFTER_RERANKER_SPACE_URL or HF_TOKEN on the API server to enable the Hugging Face learned reranker.",
      },
    };
  }
  if (!rows.length) return { rows, metadata: { ...baseMetadata, status: "completed", message: "No rows to rerank." } };

  try {
    const candidateById = new Map(candidates.map((candidate) => [candidate.candidate_id, candidate]));
    const finalistLimit = Math.max(1, Math.min(options.limit ?? config.learnedRerankLimit, rows.length));
    const rowsToScore = rows.slice(0, finalistLimit);
    const learnedScores = await mapWithConcurrency(rowsToScore, 2, async (row) => {
      const candidate = candidateById.get(row.candidate_id);
      return { row, learnedScore: candidate ? await scoreCandidateWithLearnedService(candidate, model) : 0 };
    });
    const scoreByCandidateId = new Map(learnedScores.map((item) => [item.row.candidate_id, item.learnedScore]));

    const rerankedFinalists = rowsToScore
      .map((row) => {
        const learnedScore = scoreByCandidateId.get(row.candidate_id);
        if (learnedScore === undefined) return row;
        const blendedScore = clamp01(row.score * (1 - weight) + learnedScore * weight);
        return {
          ...row,
          score: Number(blendedScore.toFixed(4)),
          reasoning: `${row.reasoning} Learned Hugging Face reranker: ${(learnedScore * 100).toFixed(1)}% fit from ${model}; blended at ${(weight * 100).toFixed(0)}% weight.`,
          score_breakdown: {
            ...row.score_breakdown,
            recruiterLearning: Number(Math.max(row.score_breakdown.recruiterLearning, learnedScore).toFixed(4)),
          },
          evidence: [...row.evidence, `Learned reranker score ${(learnedScore * 100).toFixed(1)}% from ${model}.`],
        };
      })
      .sort((left, right) => right.score - left.score || left.candidate_id.localeCompare(right.candidate_id))
      .map((row, index) => ({ ...row, rank: index + 1 }));
    const calibratedRest = calibrateUnreviewedRowsBelowFinalists(rows.slice(finalistLimit), rerankedFinalists);
    const reranked = [...rerankedFinalists, ...calibratedRest].map((row, index) => ({ ...row, rank: index + 1 }));

    return {
      rows: reranked,
      metadata: {
        ...baseMetadata,
        status: "completed",
        reviewedCandidates: learnedScores.length,
        message: `Learned reranker scored ${learnedScores.length} finalist candidate${learnedScores.length === 1 ? "" : "s"} with ${config.sifterRerankerSpaceUrl ? "Hugging Face Space" : model}.`,
      },
    };
  } catch (error) {
    return {
      rows,
      metadata: {
        ...baseMetadata,
        status: "fallback",
        message: `Learned rerank failed; deterministic ranking was kept. ${error instanceof Error ? error.message : "Unknown error"}`,
      },
    };
  }
}

async function scoreCandidateWithLearnedService(candidate: RedrobCandidate, model: string): Promise<number> {
  const candidateText = redrobLearnedModelText(candidate);
  const errors: string[] = [];
  if (config.sifterRerankerSpaceUrl) {
    try {
      return await scoreCandidateWithHuggingFaceSpace(seniorAiEngineerPrompt, candidateText);
    } catch (error) {
      errors.push(`Space: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }
  if (config.huggingFaceToken) {
    try {
      return await scoreCandidateWithHuggingFaceServerless(model, candidateText);
    } catch (error) {
      errors.push(`Serverless: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }
  throw new Error(errors.length ? errors.join("; ") : "No learned reranker service is configured.");
}

async function scoreCandidateWithHuggingFaceSpace(jobDescription: string, candidateText: string): Promise<number> {
  const spaceUrl = config.sifterRerankerSpaceUrl.replace(/\/+$/, "");
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      const response = await fetch(`${spaceUrl}/api/predict`, {
        method: "POST",
        headers: {
          ...(config.huggingFaceToken ? { Authorization: `Bearer ${config.huggingFaceToken}` } : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: [jobDescription, candidateText],
        }),
        signal: controller.signal,
      });
      const text = await response.text();
      const payload = parseJsonResponse(text);
      if (!response.ok) {
        throw new Error(huggingFaceErrorMessage(payload, response.status));
      }
      return extractSpaceScore(payload);
    } catch (error) {
      lastError = error;
      if (attempt < 3) await delay(attempt * 1200);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Hugging Face Space request failed.");
}

async function scoreCandidateWithHuggingFaceServerless(model: string, candidateText: string): Promise<number> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${hfInferenceBaseUrl}/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.huggingFaceToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: `Job description:\n${seniorAiEngineerPrompt}\n\nCandidate profile:\n${candidateText}`,
        parameters: { function_to_apply: "none", top_k: 1 },
        options: { wait_for_model: true },
      }),
      signal: controller.signal,
    });

    const payload = (await response.json()) as unknown;
    if (!response.ok) {
      throw new Error(huggingFaceErrorMessage(payload, response.status));
    }
    return extractScore(payload);
  } finally {
    clearTimeout(timeout);
  }
}

function extractSpaceScore(payload: unknown): number {
  if (payload && typeof payload === "object" && "data" in payload && Array.isArray(payload.data)) {
    const first = payload.data[0];
    if (typeof first === "number") return clamp01(first);
    if (typeof first === "string") return clamp01(Number(first));
  }
  throw new Error("Hugging Face Space response did not include a usable score.");
}

function redrobLearnedModelText(candidate: RedrobCandidate): string {
  const signals = candidate.redrob_signals;
  return [
    `Title: ${candidate.profile.current_title}`,
    `Headline: ${candidate.profile.headline}`,
    `Summary: ${candidate.profile.summary}`,
    `Experience years: ${candidate.profile.years_of_experience}`,
    `Location: ${candidate.profile.location}, ${candidate.profile.country}`,
    `Career: ${candidate.career_history.map((item) => `${item.title} ${item.industry} ${item.description}`).join(" | ")}`,
    `Skills: ${candidate.skills.map((skill) => `${skill.name} (${skill.proficiency})`).join(", ")}`,
    `Certifications: ${candidate.certifications.map((cert) => `${cert.name} ${cert.issuer}`).join(", ")}`,
    `Assessments: ${Object.keys(signals.skill_assessment_scores).join(", ")}`,
    `Behavior: response_rate=${signals.recruiter_response_rate}, notice_days=${signals.notice_period_days}, open_to_work=${signals.open_to_work_flag}`,
  ]
    .join("\n")
    .slice(0, 3800);
}

function extractScore(payload: unknown): number {
  const first = Array.isArray(payload) && Array.isArray(payload[0]) ? payload[0][0] : Array.isArray(payload) ? payload[0] : payload;
  if (typeof first === "number") return clamp01(first);
  if (first && typeof first === "object" && "score" in first && typeof first.score === "number") {
    return clamp01(first.score);
  }
  if (first && typeof first === "object" && "label" in first && typeof first.label === "string") {
    const numericLabel = Number(first.label);
    if (Number.isFinite(numericLabel)) return clamp01(numericLabel);
  }
  throw new Error("Hugging Face response did not include a usable score.");
}

function huggingFaceErrorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
    return `Hugging Face ${status}: ${payload.error}`;
  }
  return `Hugging Face returned HTTP ${status}`;
}

function parseJsonResponse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Hugging Face returned non-JSON response: ${text.slice(0, 80)}`);
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function calibrateUnreviewedRowsBelowFinalists(rows: RedrobRankingRow[], finalists: RedrobRankingRow[]): RedrobRankingRow[] {
  if (!rows.length || !finalists.length) return rows;
  let ceiling = Math.max(0, finalists[finalists.length - 1].score - 0.0001);
  return rows.map((row) => {
    const score = Math.min(row.score, ceiling);
    ceiling = Math.max(0, score - 0.0001);
    return { ...row, score: Number(score.toFixed(4)) };
  });
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  });
  await Promise.all(workers);
  return results;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
