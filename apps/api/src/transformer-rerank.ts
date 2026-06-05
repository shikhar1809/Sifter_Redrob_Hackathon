import type { RedrobCandidate, RedrobRankingRow } from "@seederpro/core";

type TransformerPipeline = (text: string, options: { pooling: "mean"; normalize: boolean }) => Promise<{ data: ArrayLike<number> }>;

const transformerModel = "Xenova/all-MiniLM-L6-v2";
const seniorAiEngineerEmbeddingPrompt = [
  "Senior AI Engineer role requiring production retrieval systems, embeddings, vector search, LLM reranking, ranking evaluation, Python, model serving, and ownership.",
  "Strong candidates show shipped production AI, search relevance, NDCG/MRR/evaluation, retrieval augmented generation, latency monitoring, and practical system design.",
].join(" ");

export async function rerankRedrobRowsWithTransformer(candidates: RedrobCandidate[], rows: RedrobRankingRow[]): Promise<RedrobRankingRow[]> {
  if (!rows.length) return rows;
  const candidateById = new Map(candidates.map((candidate) => [candidate.candidate_id, candidate]));
  const extractor = await loadTransformerExtractor();
  const jobEmbedding = await embedText(extractor, seniorAiEngineerEmbeddingPrompt);
  const enriched = await Promise.all(
    rows.map(async (row) => {
      const candidate = candidateById.get(row.candidate_id);
      if (!candidate) return { row, transformerScore: 0 };
      const transformerScore = normalizedCosine(jobEmbedding, await embedText(extractor, redrobTransformerText(candidate)));
      return { row, transformerScore };
    }),
  );

  return enriched
    .map(({ row, transformerScore }) => ({
      ...row,
      score: Number((row.score * 0.86 + transformerScore * 0.14).toFixed(4)),
      reasoning: `${row.reasoning} Transformer embedding rerank: ${(transformerScore * 100).toFixed(0)}% JD/profile similarity using ${transformerModel}.`,
    }))
    .sort((left, right) => right.score - left.score || left.candidate_id.localeCompare(right.candidate_id))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

async function loadTransformerExtractor(): Promise<TransformerPipeline> {
  const transformers = (await import("@xenova/transformers")) as unknown as {
    env?: { allowLocalModels?: boolean; useBrowserCache?: boolean };
    pipeline: (task: "feature-extraction", model: string) => Promise<TransformerPipeline>;
  };
  if (transformers.env) {
    transformers.env.allowLocalModels = true;
    transformers.env.useBrowserCache = false;
  }
  return transformers.pipeline("feature-extraction", transformerModel);
}

async function embedText(extractor: TransformerPipeline, text: string): Promise<number[]> {
  const output = await extractor(text.slice(0, 2400), { pooling: "mean", normalize: true });
  return Array.from(output.data, Number);
}

function normalizedCosine(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length);
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }
  if (!leftNorm || !rightNorm) return 0;
  return Math.max(0, Math.min(1, (dot / Math.sqrt(leftNorm * rightNorm) + 1) / 2));
}

function redrobTransformerText(candidate: RedrobCandidate): string {
  return [
    candidate.profile.current_title,
    candidate.profile.headline,
    candidate.profile.summary,
    candidate.profile.current_industry,
    candidate.profile.years_of_experience.toFixed(1),
    candidate.career_history.map((item) => `${item.title} ${item.industry} ${item.description}`).join(" "),
    candidate.skills.map((skill) => `${skill.name} ${skill.proficiency}`).join(" "),
    candidate.certifications.map((cert) => `${cert.name} ${cert.issuer}`).join(" "),
    Object.keys(candidate.redrob_signals.skill_assessment_scores).join(" "),
  ].join(" ");
}
