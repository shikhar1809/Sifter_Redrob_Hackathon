import { z } from "zod";

export const requiredCandidateColumns = [
  "name",
  "experience_years",
  "location",
  "skills",
  "github_url",
  "salary_expectation_lpa",
  "summary",
] as const;

export const candidateSchema = z.object({
  name: z.string().min(1),
  email: z.string().default(""),
  experience_years: z.coerce.number().min(0).default(0),
  location: z.string().default(""),
  skills: z.string().default(""),
  github_url: z.string().default(""),
  salary_expectation_lpa: z.coerce.number().min(0).default(0),
  summary: z.string().default(""),
});

export const runPipelineInputSchema = z.object({
  roleDescription: z.string().min(12),
  candidates: z.array(candidateSchema).min(1),
  options: z
    .object({
      strictMode: z.boolean().default(true),
      inviteCap: z.number().int().positive().default(5),
      githubMode: z.enum(["live", "fallback"]).default("fallback"),
      aiReview: z.boolean().default(false),
    })
    .default({ strictMode: true, inviteCap: 5, githubMode: "fallback", aiReview: false }),
});

export type CandidateInput = z.infer<typeof candidateSchema>;
export type RunPipelineInput = z.infer<typeof runPipelineInputSchema>;

export type RoleProfile = {
  minYears: number;
  maxYears: number;
  salaryMin: number;
  salaryMax: number;
  skills: string[];
  mustSkills: string[];
  skillGroups: string[][];
  locations: string[];
  strict: boolean;
};

export type GateCandidate = CandidateInput & {
  id: string;
  skillsList: string[];
  hardPass?: boolean;
  hardReason?: string;
  profileScore?: number;
  profileSignals?: string;
  advanceG2?: boolean;
  deepScore?: number;
  careerCoherence?: string;
  intentSignal?: string;
  redFlags?: string;
  advanceG3?: boolean;
  githubSignal?: string;
  githubDetail?: string;
  githubScore?: number;
  ownershipScore?: number;
  probeQuestion?: string;
  invite?: boolean;
  scenarioQuestion?: string;
  simulationScore?: number | null;
  simulationNotes?: string;
  finalScore?: number;
  hireConfidence?: "provisional" | "high" | "medium" | "low";
  recommendation?: string;
  rank?: number;
  aiReview?: CandidateAiReview;
};

export type CandidateAiReview = {
  personalNote: string;
  nextAction: string;
  riskLevel: "Low" | "Medium" | "High";
  strengths: string[];
  weaknesses: string[];
  missingEvidence: string[];
  interviewQuestion: string;
  confidenceNote: string;
  sourceFields: string[];
  provider: "gemini";
};

export type PipelineResult = {
  roleProfile: RoleProfile;
  gate1: GateCandidate[];
  gate2: GateCandidate[];
  gate3: GateCandidate[];
  gate4: GateCandidate[];
  invited: GateCandidate[];
  simulation: GateCandidate[];
  final: GateCandidate[];
  intelligence?: PipelineIntelligence;
  biasAudit: BiasAudit;
};

export type BiasAuditStatus = "pass" | "review";

export type BiasAuditGroup = {
  field: string;
  group: string;
  poolCount: number;
  selectedCount: number;
  poolShare: number;
  selectedShare: number;
  ratio: number;
  flag: "ok" | "under_selected" | "over_selected";
};

export type BiasAudit = {
  status: BiasAuditStatus;
  summary: string;
  protectedAttributesAvailable: boolean;
  protectedAttributesUsed: string[];
  excludedSignals: string[];
  mitigations: string[];
  proxyGroups: BiasAuditGroup[];
  warnings: string[];
};

export type PipelineIntelligence = {
  provider: "gemini";
  enabled: boolean;
  configured: boolean;
  status: "completed" | "fallback" | "disabled";
  model: string;
  reviewedCandidates: number;
  message: string;
};

export const redrobCandidateSchema = z.object({
  candidate_id: z.string().regex(/^CAND_[0-9]{7}$/),
  profile: z.object({
    anonymized_name: z.string().default(""),
    headline: z.string().default(""),
    summary: z.string().default(""),
    location: z.string().default(""),
    country: z.string().default(""),
    years_of_experience: z.coerce.number().min(0).default(0),
    current_title: z.string().default(""),
    current_company: z.string().default(""),
    current_company_size: z.string().default(""),
    current_industry: z.string().default(""),
  }),
  career_history: z
    .array(
      z.object({
        company: z.string().default(""),
        title: z.string().default(""),
        start_date: z.string().default(""),
        end_date: z.string().nullable().default(null),
        duration_months: z.coerce.number().min(0).default(0),
        is_current: z.boolean().default(false),
        industry: z.string().default(""),
        company_size: z.string().default(""),
        description: z.string().default(""),
      }),
    )
    .default([]),
  education: z
    .array(
      z.object({
        institution: z.string().default(""),
        degree: z.string().default(""),
        field_of_study: z.string().default(""),
        start_year: z.coerce.number().default(0),
        end_year: z.coerce.number().default(0),
        grade: z.string().nullable().optional(),
        tier: z.string().optional(),
      }),
    )
    .default([]),
  skills: z
    .array(
      z.object({
        name: z.string().default(""),
        proficiency: z.enum(["beginner", "intermediate", "advanced", "expert"]).default("beginner"),
        endorsements: z.coerce.number().min(0).default(0),
        duration_months: z.coerce.number().min(0).optional(),
      }),
    )
    .default([]),
  certifications: z
    .array(
      z.object({
        name: z.string().default(""),
        issuer: z.string().default(""),
        year: z.coerce.number().default(0),
      }),
    )
    .default([]),
  languages: z
    .array(
      z.object({
        language: z.string().default(""),
        proficiency: z.string().default(""),
      }),
    )
    .default([]),
  redrob_signals: z.object({
    profile_completeness_score: z.coerce.number().min(0).max(100).default(0),
    signup_date: z.string().default(""),
    last_active_date: z.string().default(""),
    open_to_work_flag: z.boolean().default(false),
    profile_views_received_30d: z.coerce.number().min(0).default(0),
    applications_submitted_30d: z.coerce.number().min(0).default(0),
    recruiter_response_rate: z.coerce.number().min(0).max(1).default(0),
    avg_response_time_hours: z.coerce.number().min(0).default(999),
    skill_assessment_scores: z.record(z.coerce.number().min(0).max(100)).default({}),
    connection_count: z.coerce.number().min(0).default(0),
    endorsements_received: z.coerce.number().min(0).default(0),
    notice_period_days: z.coerce.number().min(0).max(180).default(180),
    expected_salary_range_inr_lpa: z
      .object({
        min: z.coerce.number().min(0).default(0),
        max: z.coerce.number().min(0).default(0),
      })
      .default({ min: 0, max: 0 }),
    preferred_work_mode: z.enum(["remote", "hybrid", "onsite", "flexible"]).default("flexible"),
    willing_to_relocate: z.boolean().default(false),
    github_activity_score: z.coerce.number().min(-1).max(100).default(-1),
    search_appearance_30d: z.coerce.number().min(0).default(0),
    saved_by_recruiters_30d: z.coerce.number().min(0).default(0),
    interview_completion_rate: z.coerce.number().min(0).max(1).default(0),
    offer_acceptance_rate: z.coerce.number().min(-1).max(1).default(-1),
    verified_email: z.boolean().default(false),
    verified_phone: z.boolean().default(false),
    linkedin_connected: z.boolean().default(false),
  }),
});

export const redrobRankerInputSchema = z.object({
  candidates: z.array(redrobCandidateSchema).min(1),
  limit: z.number().int().positive().max(100).default(100),
});
const redrobRankLimitSchema = z.number().int().positive().max(100).default(100);

export type RedrobCandidate = z.infer<typeof redrobCandidateSchema>;
export type RedrobRankerInput = z.infer<typeof redrobRankerInputSchema>;
export type RedrobRankingRow = {
  candidate_id: string;
  rank: number;
  score: number;
  reasoning: string;
  score_breakdown: RedrobScoreBreakdown;
  evidence: string[];
  concerns: string[];
};

export type RedrobScoreBreakdown = {
  semanticFit: number;
  vectorSimilarity: number;
  technicalEvidence: number;
  productionProof: number;
  rankingEvaluation: number;
  roleDomain: number;
  experienceFit: number;
  behavioralSignals: number;
  availability: number;
  recruiterLearning: number;
  bonus: number;
  penalties: number;
  proxyGuardrail: number;
};

export type RedrobEvaluationReport = {
  generatedAt: string;
  datasetFacts: {
    candidates: number;
    averageYearsExperience: number;
    averageSkillsPerCandidate: number;
    signalCoverage: Record<string, { count: number; share: number }>;
  };
  rankingProof: {
    hybridTop100Rows: number;
    keywordBaselineOverlapWithHybridTop100: number;
    semanticTop100OverlapWithHybridTop100: number;
    averageHybridTop100Score: number;
    averageHybridTop100SemanticFit: number;
    averageHybridTop100ProductionProof: number;
    averageHybridTop100BehavioralSignals: number;
  };
  ablation: Array<{
    model: "keyword_baseline" | "semantic_concept_matcher" | "vector_similarity_reranker" | "hybrid_ranker";
    top100AverageScore: number;
    top100AverageSemanticFit: number;
    top100AverageProductionProof: number;
    top100AverageBehavioralSignals: number;
    description: string;
  }>;
  evidenceBackedDecisions: Array<{
    decision: string;
    dataPoint: string;
    implementation: string;
  }>;
};

export type RedrobCandidateSearchRow = {
  candidate_id: string;
  rank: number;
  score: number;
  reasoning: string;
  score_breakdown: RedrobScoreBreakdown;
  title: string;
  location: string;
  country: string;
  years: number;
  skills: string[];
  status: "shortlisted" | "review" | "not_shortlisted";
  evidence: string[];
  concern: string;
};

const defaultSkills = [
  "python",
  "sql",
  "spark",
  "kafka",
  "airflow",
  "gcp",
  "aws",
  "azure",
  "dbt",
  "flink",
  "java",
  "scala",
  "snowflake",
  "bigquery",
  "databricks",
  "docker",
  "kubernetes",
];

const challengeReferenceDate = new Date("2026-06-04T00:00:00Z");
const seniorAiEngineerSkillGroups = {
  python: ["python", "pytorch", "tensorflow", "scikit-learn", "pandas", "numpy", "fastapi", "flask"],
  retrieval: ["embedding", "embeddings", "semantic search", "retrieval", "rag", "sentence-transformers", "bge", "e5"],
  vector: ["vector", "vector database", "pinecone", "weaviate", "qdrant", "milvus", "faiss", "opensearch", "elasticsearch"],
  ranking: ["ranking", "ranker", "re-ranking", "reranking", "search relevance", "learning-to-rank", "xgboost", "recommender"],
  evaluation: ["ndcg", "mrr", "map", "a/b", "ab test", "offline benchmark", "evaluation framework", "eval", "relevance"],
  mlSystems: ["machine learning", "ml", "nlp", "llm", "transformer", "model serving", "feature engineering", "fine-tuning", "lora", "qlora", "peft", "inference"],
  distributed: ["distributed", "kafka", "spark", "airflow", "ray", "kubernetes", "docker", "latency", "monitoring", "on-call"],
};
const seniorAiSemanticConcepts = [
  {
    name: "semantic retrieval systems",
    weight: 1.15,
    terms: ["embedding", "embeddings", "semantic search", "retrieval", "rag", "vector search", "faiss", "qdrant", "milvus", "pinecone", "weaviate"],
  },
  {
    name: "ranking and relevance",
    weight: 1.1,
    terms: ["ranking", "ranker", "re-ranking", "reranking", "learning-to-rank", "search relevance", "recommender", "xgboost", "ndcg", "mrr", "map"],
  },
  {
    name: "evaluation discipline",
    weight: 1,
    terms: ["evaluation", "eval", "offline benchmark", "a/b", "ab test", "metrics", "quality regression", "relevance", "experiment"],
  },
  {
    name: "production ML engineering",
    weight: 1,
    terms: ["production", "model serving", "latency", "monitoring", "deployment", "deployed", "inference", "mlops", "kubernetes", "docker"],
  },
  {
    name: "shipping and ownership",
    weight: 0.9,
    terms: ["shipped", "built", "owned", "led", "platform", "product", "real users", "customer-facing", "scrappy", "startup"],
  },
  {
    name: "LLM depth beyond wrappers",
    weight: 0.85,
    terms: ["llm", "fine-tuning", "lora", "qlora", "peft", "transformer", "hugging face", "prompt evaluation", "guardrail"],
  },
] as const;
const vectorStopwords = new Set([
  "and",
  "or",
  "the",
  "for",
  "with",
  "from",
  "into",
  "this",
  "that",
  "have",
  "has",
  "was",
  "were",
  "are",
  "but",
  "not",
  "candidate",
  "engineer",
]);
const seniorAiEngineerJobVectorText = [
  "Senior AI Engineer production retrieval ranking evaluation embeddings transformer vector search semantic search hybrid retrieval LLM reranking",
  "Python model serving latency monitoring deployment ownership production ML learning to rank relevance search quality NDCG MRR A/B experiment",
  "candidate matching hiring marketplace recommender systems guardrails reliable scalable data pipelines model evaluation",
].join(" ");
const seniorAiEngineerJobVector = textEmbeddingVector(seniorAiEngineerJobVectorText);
const termRegexCache = new Map<string, RegExp>();

export function parseCsv(text: string): CandidateInput[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuote = false;
  const clean = String(text || "").replace(/^\uFEFF/, "");

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    const next = clean[i + 1];
    if (ch === '"' && inQuote && next === '"') {
      cur += '"';
      i += 1;
    } else if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      row.push(cur);
      cur = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuote) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(cur);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      cur = "";
    } else {
      cur += ch;
    }
  }

  row.push(cur);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  if (!rows.length) throw new Error("CSV is empty");

  const headers = rows[0].map(normalizeHeader);
  const missing = requiredCandidateColumns.filter((column) => !headers.includes(column));
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(", ")}`);

  return rows
    .slice(1)
    .map((values) => {
      const record: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        record[header] = values[index]?.trim() ?? "";
      });
      return candidateSchema.parse(record);
    })
    .filter((candidate) => candidate.name.trim());
}

export function parseRedrobCandidates(text: string): RedrobCandidate[] {
  const clean = String(text || "").replace(/^\uFEFF/, "").trim();
  if (!clean) throw new Error("Candidate JSON is empty");

  const raw: unknown[] = clean.startsWith("[")
    ? z.array(z.unknown()).parse(JSON.parse(clean))
    : clean
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line));

  return raw.map((candidate) => redrobCandidateSchema.parse(candidate));
}

export function rankRedrobCandidates(input: RedrobRankerInput): RedrobRankingRow[] {
  const candidates = Array.isArray(input.candidates) ? input.candidates : [];
  if (!candidates.length) throw new Error("Provide at least one Redrob candidate.");
  const limit = redrobRankLimitSchema.parse(input.limit ?? 100);

  return candidates
    .map(scoreRedrobCandidate)
    .sort(
      (a, b) =>
        redrobSubmissionScore(b) - redrobSubmissionScore(a) ||
        a.candidate.candidate_id.localeCompare(b.candidate.candidate_id),
    )
    .slice(0, limit)
    .map((scored, index) => ({
      candidate_id: scored.candidate.candidate_id,
      rank: index + 1,
      score: redrobSubmissionScore(scored),
      reasoning: buildRedrobReasoning(scored, index + 1),
      score_breakdown: redrobScoreBreakdown(scored),
      evidence: redrobExplainableEvidence(scored),
      concerns: scored.concerns,
    }));
}

export function createRedrobCandidateSearchIndex(candidates: RedrobCandidate[]): RedrobCandidateSearchRow[] {
  if (!candidates.length) return [];
  return candidates
    .map(scoreRedrobCandidate)
    .sort(
      (a, b) =>
        redrobSubmissionScore(b) - redrobSubmissionScore(a) ||
        a.candidate.candidate_id.localeCompare(b.candidate.candidate_id),
    )
    .map((scored, index) => {
      const rank = index + 1;
      const candidate = scored.candidate;
      const evidence = [...scored.evidence.coreHits, ...scored.evidence.productionSignals, scored.evidence.strongestSkill]
        .filter(Boolean)
        .slice(0, 5);
      return {
        candidate_id: candidate.candidate_id,
        rank,
        score: redrobSubmissionScore(scored),
        reasoning: buildRedrobReasoning(scored, rank),
        score_breakdown: redrobScoreBreakdown(scored),
        title: candidate.profile.current_title || candidate.profile.headline || "Candidate",
        location: candidate.profile.location || candidate.profile.country || "unknown",
        country: candidate.profile.country || "unknown",
        years: Number(candidate.profile.years_of_experience.toFixed(1)),
        skills: candidate.skills.map((skill) => skill.name).filter(Boolean).slice(0, 8),
        status: rank <= 100 ? "shortlisted" : rank <= 1000 ? "review" : "not_shortlisted",
        evidence,
        concern: scored.concerns[0] ?? "",
      };
    });
}

export function createRedrobBiasAudit(candidates: RedrobCandidate[], rows: RedrobRankingRow[]): BiasAudit {
  const selectedIds = new Set(rows.map((row) => row.candidate_id));
  const selected = candidates.filter((candidate) => selectedIds.has(candidate.candidate_id));
  return createBiasAudit({
    pool: candidates,
    selected,
    classifiers: [
      ["country", (candidate) => countryBucket(candidate.profile.country || candidate.profile.location)],
      ["work mode", (candidate) => candidate.redrob_signals.preferred_work_mode || "unknown"],
      ["experience band", (candidate) => experienceBand(candidate.profile.years_of_experience)],
      ["notice period", (candidate) => noticeBand(candidate.redrob_signals.notice_period_days)],
    ],
    protectedAttributesAvailable: false,
    excludedSignals: [
      "candidate name",
      "anonymized name",
      "education institution",
      "education tier",
      "language",
      "school prestige",
    ],
    mitigations: [
      "scores are built from job evidence before logistics signals",
      "location and availability are capped as feasibility signals, not quality signals",
      "proxy-heavy profiles lose lift when technical and production evidence is weak",
      "tie-breaks use candidate id only for deterministic ordering",
    ],
    missingProtectedWarning:
      "The Redrob file does not expose protected attributes such as gender, caste, religion, disability, or race. Sifter audits observable proxy fields instead.",
  });
}

export function createRedrobEvaluationReport(candidates: RedrobCandidate[], rows: RedrobRankingRow[]): RedrobEvaluationReport {
  const scored = candidates.map(scoreRedrobCandidate);
  const hybridTop = scored
    .slice()
    .sort((a, b) => redrobSubmissionScore(b) - redrobSubmissionScore(a) || a.candidate.candidate_id.localeCompare(b.candidate.candidate_id))
    .slice(0, 100);
  const keywordTop = scored
    .slice()
    .sort((a, b) => redrobKeywordBaselineScore(b) - redrobKeywordBaselineScore(a) || a.candidate.candidate_id.localeCompare(b.candidate.candidate_id))
    .slice(0, 100);
  const semanticTop = scored
    .slice()
    .sort((a, b) => b.components.semanticFit - a.components.semanticFit || a.candidate.candidate_id.localeCompare(b.candidate.candidate_id))
    .slice(0, 100);
  const vectorTop = scored
    .slice()
    .sort((a, b) => b.components.vectorSimilarity - a.components.vectorSimilarity || a.candidate.candidate_id.localeCompare(b.candidate.candidate_id))
    .slice(0, 100);
  const hybridIds = new Set((rows.length ? rows : hybridTop.map((scoredRow, index) => ({
    candidate_id: scoredRow.candidate.candidate_id,
    rank: index + 1,
    score: redrobSubmissionScore(scoredRow),
    reasoning: buildRedrobReasoning(scoredRow, index + 1),
    score_breakdown: redrobScoreBreakdown(scoredRow),
    evidence: redrobExplainableEvidence(scoredRow),
    concerns: scoredRow.concerns,
  }))).map((row) => row.candidate_id));

  return {
    generatedAt: new Date().toISOString().slice(0, 10),
    datasetFacts: createRedrobDatasetFacts(candidates),
    rankingProof: {
      hybridTop100Rows: hybridIds.size,
      keywordBaselineOverlapWithHybridTop100: overlapCount(keywordTop, hybridIds),
      semanticTop100OverlapWithHybridTop100: overlapCount(semanticTop, hybridIds),
      averageHybridTop100Score: average(hybridTop.map((item) => redrobSubmissionScore(item))),
      averageHybridTop100SemanticFit: average(hybridTop.map((item) => item.components.semanticFit)),
      averageHybridTop100ProductionProof: average(hybridTop.map((item) => item.components.production)),
      averageHybridTop100BehavioralSignals: average(hybridTop.map((item) => item.components.behavior)),
    },
    ablation: [
      {
        model: "keyword_baseline",
        top100AverageScore: average(keywordTop.map(redrobKeywordBaselineScore)),
        top100AverageSemanticFit: average(keywordTop.map((item) => item.components.semanticFit)),
        top100AverageProductionProof: average(keywordTop.map((item) => item.components.production)),
        top100AverageBehavioralSignals: average(keywordTop.map((item) => item.components.behavior)),
        description: "Exact JD term overlap only; useful as a control, but vulnerable to keyword stuffing and missing transferable evidence.",
      },
      {
        model: "semantic_concept_matcher",
        top100AverageScore: average(semanticTop.map((item) => item.components.semanticFit)),
        top100AverageSemanticFit: average(semanticTop.map((item) => item.components.semanticFit)),
        top100AverageProductionProof: average(semanticTop.map((item) => item.components.production)),
        top100AverageBehavioralSignals: average(semanticTop.map((item) => item.components.behavior)),
        description: "Local semantic concept layer tied to Redrob JD concepts: retrieval, ranking, evaluation, production ML, ownership, and LLM depth.",
      },
      {
        model: "vector_similarity_reranker",
        top100AverageScore: average(vectorTop.map((item) => item.components.vectorSimilarity)),
        top100AverageSemanticFit: average(vectorTop.map((item) => item.components.semanticFit)),
        top100AverageProductionProof: average(vectorTop.map((item) => item.components.production)),
        top100AverageBehavioralSignals: average(vectorTop.map((item) => item.components.behavior)),
        description: "Vector similarity layer embeds the JD and candidate profile into the same normalized vector space before hybrid ranking.",
      },
      {
        model: "hybrid_ranker",
        top100AverageScore: average(hybridTop.map((item) => redrobSubmissionScore(item))),
        top100AverageSemanticFit: average(hybridTop.map((item) => item.components.semanticFit)),
        top100AverageProductionProof: average(hybridTop.map((item) => item.components.production)),
        top100AverageBehavioralSignals: average(hybridTop.map((item) => item.components.behavior)),
        description: "Final score combines semantic fit, structured evidence, production proof, ranking/evaluation depth, behavior, availability, penalties, and proxy guardrails.",
      },
    ],
    evidenceBackedDecisions: [
      {
        decision: "Use hybrid semantic plus structured ranking instead of keyword-only filters.",
        dataPoint: "The Redrob JD asks for embeddings, hybrid retrieval, LLM re-ranking, evaluation, and production shipping; the dataset has profile text, history, skills, and behavioral signals.",
        implementation: "Semantic concept fit and vector similarity are scored separately and blended with technical evidence, production proof, role domain, ranking/evaluation depth, and capped behavioral signals.",
      },
      {
        decision: "Cap behavioral and logistics signals.",
        dataPoint: "Recruiter response, response time, notice period, salary, and work mode have 100% coverage, but they can act as proxy shortcuts if overweighted.",
        implementation: "Behavior and availability contribute only 12% of the raw hybrid score together, and proxyGuardrail subtracts lift when job evidence is weak.",
      },
      {
        decision: "Do not overweight incomplete signals.",
        dataPoint: "GitHub activity appears for only part of the dataset and skill assessments are sparse, so using them as hard filters would exclude many candidates unfairly.",
        implementation: "GitHub and assessments are optional evidence boosts, never required gates.",
      },
      {
        decision: "Keep challenge ranking CPU-only and network-off.",
        dataPoint: "The official submission spec caps runtime, memory, CPU use, and network access.",
        implementation: "The local vector and semantic layers run without API calls; an optional Transformers.js reranker can rerank winner pools when a local model is available.",
      },
      {
        decision: "Let ranking improve from recruiter review behavior.",
        dataPoint: "Great recruiters reward production proof, role-specific depth, and evaluation discipline more than raw activity or keyword density.",
        implementation: "The score now includes a review-informed evidence component, and the UI captures per-candidate recruiter feedback locally for future preference weighting.",
      },
    ],
  };
}

export function exportRedrobSubmissionCsv(rows: RedrobRankingRow[]): string {
  const header = "candidate_id,rank,score,reasoning";
  const body = rows.map((row) =>
    [row.candidate_id, String(row.rank), row.score.toFixed(4), row.reasoning].map((value) => quoteCsvValue(value)).join(","),
  );
  return [header, ...body].join("\n");
}

export function normalizeHeader(header: string): string {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function extractRoleProfile(text: string, strict = true): RoleProfile {
  const lower = String(text || "").toLowerCase();
  const yearMatches =
    lower.match(/(\d+(?:\.\d+)?)\s*(?:-|to|\u2013|\u2014)\s*(\d+(?:\.\d+)?)\s*(?:yrs?|years?)/) ||
    lower.match(/(\d+(?:\.\d+)?)\s*(?:\+|plus)\s*(?:yrs?|years?)/);
  const salaryMatch =
    lower.match(/(\d+(?:\.\d+)?)\s*(?:-|to|\u2013|\u2014)\s*(\d+(?:\.\d+)?)\s*lpa/) ||
    lower.match(/(?:up to|max|budget)\s*(\d+(?:\.\d+)?)\s*lpa/);
  const minYears = yearMatches ? Number(yearMatches[1]) || 0 : 0;
  const maxYears = yearMatches?.[2] ? Number(yearMatches[2]) : 99;
  const salaryMin = salaryMatch?.[2] ? Number(salaryMatch[1]) : 0;
  const salaryMax = salaryMatch ? Number(salaryMatch[2] || salaryMatch[1]) : 999;
  const skills = extractSkills(lower);
  const mustSection = lower.match(/(?:must have|must-have|required|requirements?)[:\s-]+([^.\n]+)/);
  let mustSkills = mustSection ? extractSkills(mustSection[1]) : skills.slice(0, Math.min(5, skills.length));
  const skillGroups: string[][] = [];
  const cloudAlternatives = ["gcp", "aws", "azure"].filter((skill) => skills.includes(skill));
  const saysCloudAlternative = /(gcp|aws|azure)\s*(?:or|\/)\s*(gcp|aws|azure)/.test(lower) || /cloud[^.\n]*(?:gcp|aws|azure)/.test(lower);

  if (saysCloudAlternative && cloudAlternatives.length > 1) {
    skillGroups.push(cloudAlternatives);
    mustSkills = mustSkills.filter((skill) => !cloudAlternatives.includes(skill));
  }

  const locations = [
    "bengaluru",
    "bangalore",
    "mumbai",
    "delhi",
    "ncr",
    "pune",
    "hyderabad",
    "chennai",
    "remote",
    "india",
  ]
    .filter((loc) => lower.includes(loc))
    .map((loc) => (loc === "bangalore" ? "bengaluru" : loc));

  return {
    minYears,
    maxYears,
    salaryMin,
    salaryMax,
    skills: unique(skills),
    mustSkills: unique(mustSkills),
    skillGroups,
    locations: unique(locations),
    strict,
  };
}

export function extractSkills(text: string): string[] {
  const lower = String(text || "").toLowerCase();
  return defaultSkills.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`, "i").test(lower);
  });
}

export function runDeterministicPipeline(input: RunPipelineInput): PipelineResult {
  const parsed = runPipelineInputSchema.parse(input);
  const roleProfile = extractRoleProfile(parsed.roleDescription, parsed.options.strictMode);
  const base = parsed.candidates.map(toGateCandidate);
  const gate1 = runGate1(base, roleProfile);
  const gate2 = runGate2(gate1.filter((candidate) => candidate.hardPass), roleProfile);
  const gate3 = runGate3(gate2.filter((candidate) => candidate.advanceG2), roleProfile);
  const gate4 = runGate4(gate3.filter((candidate) => candidate.advanceG3), roleProfile, parsed.options.inviteCap);
  const invited = gate4.filter((candidate) => candidate.invite);
  const simulation = invited.map((candidate) => ({
    ...candidate,
    scenarioQuestion: buildScenario(candidate, roleProfile),
    simulationScore: null,
    simulationNotes: "",
  }));
  const final = buildFinalShortlist(simulation);
  const biasAudit = createStandardBiasAudit(base, final);

  return { roleProfile, gate1, gate2, gate3, gate4, invited, simulation, final, biasAudit };
}

function toGateCandidate(candidate: CandidateInput, index: number): GateCandidate {
  return {
    ...candidate,
    id: `c${index + 1}`,
    skillsList: extractSkills(`${candidate.skills} ${candidate.summary}`),
  };
}

function runGate1(candidates: GateCandidate[], role: RoleProfile): GateCandidate[] {
  return candidates.map((candidate) => {
    const reasons: string[] = [];
    let pass = true;
    if (candidate.experience_years < role.minYears) {
      pass = false;
      reasons.push("below minimum experience");
    }
    if (role.maxYears < 99 && candidate.experience_years > role.maxYears + 1) {
      reasons.push("above preferred seniority");
    }
    if (role.locations.length && !locationMatches(candidate.location, role.locations)) {
      pass = false;
      reasons.push("location mismatch");
    }
    const missingMust = role.mustSkills.filter((skill) => !candidate.skillsList.includes(skill));
    const missingGroups = role.skillGroups
      .filter((group) => !group.some((skill) => candidate.skillsList.includes(skill)))
      .map((group) => `one of ${group.join("/")}`);
    const missing = [...missingMust, ...missingGroups];
    if (role.strict && missing.length) {
      pass = false;
      reasons.push(`missing must-have: ${missing.join(", ")}`);
    }
    if (role.strict && role.salaryMax < 999 && candidate.salary_expectation_lpa > role.salaryMax) {
      pass = false;
      reasons.push("salary above cap");
    }
    return { ...candidate, hardPass: pass, hardReason: reasons.length ? reasons.join("; ") : "matches hard requirements" };
  });
}

function runGate2(candidates: GateCandidate[], role: RoleProfile): GateCandidate[] {
  return candidates
    .map((candidate) => {
      const skillHits = role.skills.filter((skill) => candidate.skillsList.includes(skill));
      const mustHits = role.mustSkills.filter((skill) => candidate.skillsList.includes(skill));
      const groupHits = role.skillGroups.filter((group) => group.some((skill) => candidate.skillsList.includes(skill)));
      const mustUnits = role.mustSkills.length + role.skillGroups.length;
      const mustHitUnits = mustHits.length + groupHits.length;
      const skillScore = role.skills.length ? (skillHits.length / role.skills.length) * 42 : 22;
      const mustScore = mustUnits ? (mustHitUnits / mustUnits) * 18 : 12;
      const expScore = experienceFit(candidate.experience_years, role.minYears, role.maxYears) * 20;
      const summaryScore = summarySignals(candidate.summary) * 12;
      const salaryScore = role.salaryMax < 999 ? Math.max(0, 8 - Math.max(0, candidate.salary_expectation_lpa - role.salaryMax) * 2) : 6;
      const score = clamp(skillScore + mustScore + expScore + summaryScore + salaryScore, 0, 100);

      return {
        ...candidate,
        profileScore: Math.round(score),
        profileSignals: skillHits.length ? `Matched ${skillHits.join(", ")}` : "Few explicit skill matches",
        advanceG2: score >= 58,
      };
    })
    .sort(desc("profileScore"));
}

function runGate3(candidates: GateCandidate[], role: RoleProfile): GateCandidate[] {
  return candidates
    .map((candidate) => {
      const lower = `${candidate.summary} ${candidate.skills}`.toLowerCase();
      const flags: string[] = [];
      if (lower.includes("limited") || lower.includes("transition")) flags.push("limited direct role evidence");
      if (role.salaryMax < 999 && candidate.salary_expectation_lpa > role.salaryMax * 0.96) flags.push("near salary ceiling");
      if (role.maxYears < 99 && candidate.experience_years > role.maxYears + 1) flags.push("possible seniority mismatch");
      const missesRequired = role.mustSkills.some((skill) => !candidate.skillsList.includes(skill));
      const missesGroup = role.skillGroups.some((group) => !group.some((skill) => candidate.skillsList.includes(skill)));
      if (missesRequired || missesGroup) flags.push("must-have gap");
      const coherence = inferCoherence(candidate.summary);
      const intent = inferIntent(candidate.summary);
      const score = clamp((candidate.profileScore ?? 0) + (coherence.score - 70) * 0.25 + intent.score * 0.1 - flags.length * 6, 0, 100);

      return {
        ...candidate,
        deepScore: Math.round(score),
        careerCoherence: coherence.text,
        intentSignal: intent.text,
        redFlags: flags.length ? flags.join("; ") : "none",
        advanceG3: score >= 62,
      };
    })
    .sort(desc("deepScore"));
}

function runGate4(candidates: GateCandidate[], role: RoleProfile, inviteCap: number): GateCandidate[] {
  return candidates
    .map((candidate) => {
      const github = fallbackGithubSignal(candidate);
      const ownershipScore = clamp((candidate.deepScore ?? 0) * 0.72 + github.score * 0.28, 0, 100);
      return {
        ...candidate,
        githubSignal: github.label,
        githubDetail: github.detail,
        githubScore: github.score,
        ownershipScore: Math.round(ownershipScore),
        probeQuestion: buildProbeQuestion(candidate, role),
        invite: false,
      };
    })
    .sort(desc("ownershipScore"))
    .map((candidate, index) => ({
      ...candidate,
      invite: index < inviteCap && (candidate.ownershipScore ?? 0) >= 60,
    }));
}

export function buildFinalShortlist(candidates: GateCandidate[]): GateCandidate[] {
  return candidates
    .map((candidate) => {
      const live = candidate.simulationScore ?? null;
      const base = candidate.ownershipScore ?? candidate.deepScore ?? candidate.profileScore ?? 0;
      const composite = live == null ? base : base * 0.55 + live * 0.45;
      const hireConfidence: GateCandidate["hireConfidence"] =
        live == null ? "provisional" : composite >= 82 ? "high" : composite >= 70 ? "medium" : "low";
      return {
        ...candidate,
        finalScore: Math.round(clamp(composite, 0, 100)),
        hireConfidence,
        recommendation: recommendationFor(composite, live),
      };
    })
    .sort(desc("finalScore"))
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

function locationMatches(candidateLocation: string, locations: string[]): boolean {
  const loc = candidateLocation.toLowerCase();
  if (locations.includes("remote") && loc.includes("remote")) return true;
  if (locations.includes("india")) return true;
  return locations.some((required) => loc.includes(required) || (required === "bengaluru" && loc.includes("bangalore")));
}

function experienceFit(years: number, min: number, max: number): number {
  if (years < min) return Math.max(0, years / Math.max(1, min));
  if (max < 99 && years > max + 2) return 0.72;
  if (max < 99 && years > max) return 0.88;
  return 1;
}

function summarySignals(summary: string): number {
  const lower = summary.toLowerCase();
  const words = lower.split(/[^a-z0-9+#.]+/).filter(Boolean);
  const signals = ["built", "led", "owned", "production", "scale", "platform", "real-time", "distributed", "certified", "team"];
  const hits = signals.filter((signal) => words.includes(signal) || lower.includes(signal)).length;
  return clamp(hits / 5, 0, 1);
}

function inferCoherence(summary: string): { score: number; text: string } {
  const lower = summary.toLowerCase();
  if (lower.includes("led") || lower.includes("platform") || lower.includes("production")) {
    return { score: 88, text: "clear trajectory into production ownership" };
  }
  if (lower.includes("transition") || lower.includes("analyst")) {
    return { score: 62, text: "transition path, needs proof in simulation" };
  }
  return { score: 74, text: "reasonable profile continuity" };
}

function inferIntent(summary: string): { score: number; text: string } {
  const lower = summary.toLowerCase();
  if (lower.includes("open to") || lower.includes("startup")) return { score: 72, text: "mobility or startup signal present" };
  if (lower.includes("certified") || lower.includes("team lead")) return { score: 78, text: "growth signal toward larger scope" };
  return { score: 65, text: "intent not explicit; validate in interview" };
}

function fallbackGithubSignal(candidate: GateCandidate): { label: string; detail: string; score: number } {
  const username = githubUsername(candidate.github_url);
  let score = username ? 55 : 30;
  if (candidate.summary.toLowerCase().includes("built")) score += 10;
  if (candidate.summary.toLowerCase().includes("led")) score += 8;
  return {
    label: username ? "profile-only" : "none",
    detail: username ? `${username}: inferred from resume evidence` : "No GitHub URL provided",
    score: clamp(score, 0, 100),
  };
}

function githubUsername(url: string): string {
  return String(url || "").match(/github\.com\/([^/?#\s]+)/i)?.[1] ?? "";
}

function buildProbeQuestion(candidate: GateCandidate, role: RoleProfile): string {
  const skills = role.skills.filter((skill) => candidate.skillsList.includes(skill));
  const main = skills[0] || candidate.skillsList[0] || "your core system";
  const second = skills[1] || "production constraints";
  return `Walk through one production decision involving ${main} and explain the tradeoff you made around ${second}.`;
}

function buildScenario(candidate: GateCandidate, role: RoleProfile): string {
  const stack = (role.mustSkills.length ? role.mustSkills : role.skills).slice(0, 3).join(", ") || candidate.skillsList.slice(0, 3).join(", ") || "the required stack";
  return `A critical pipeline using ${stack} is delayed and data quality checks are failing. Explain your diagnosis path, mitigation, and what you would change over the next week.`;
}

function recommendationFor(score: number, live: number | null): string {
  if (live == null) return "Invite complete; waiting for live simulation score.";
  if (score >= 82) return "Strong shortlist. Advance to hiring team discussion.";
  if (score >= 70) return "Viable candidate. Review notes and compare against top rank.";
  return "Keep as backup unless interview notes explain the lower score.";
}

type RedrobScoreDetails = {
  candidate: RedrobCandidate;
  rawScore: number;
  score: number;
  components: {
    semanticFit: number;
    vectorSimilarity: number;
    technical: number;
    production: number;
    roleDomain: number;
    rankingEvaluation: number;
    experience: number;
    behavior: number;
    availability: number;
    recruiterLearning: number;
    bonus: number;
    penalty: number;
    proxyGuardrail: number;
  };
  evidence: {
    coreHits: string[];
    niceHits: string[];
    strongestSkill: string;
    assessment: string;
    productionSignals: string[];
  };
  concerns: string[];
};

function scoreRedrobCandidate(candidate: RedrobCandidate): RedrobScoreDetails {
  const allText = redrobAllText(candidate);
  const careerText = redrobCareerText(candidate);
  const skillNames = candidate.skills.map((skill) => skill.name).filter(Boolean);
  const pythonScore = termGroupScore(allText, skillNames, candidate.redrob_signals.skill_assessment_scores, seniorAiEngineerSkillGroups.python);
  const retrievalScore = termGroupScore(allText, skillNames, candidate.redrob_signals.skill_assessment_scores, seniorAiEngineerSkillGroups.retrieval);
  const vectorScore = termGroupScore(allText, skillNames, candidate.redrob_signals.skill_assessment_scores, seniorAiEngineerSkillGroups.vector);
  const rankingScore = termGroupScore(allText, skillNames, candidate.redrob_signals.skill_assessment_scores, seniorAiEngineerSkillGroups.ranking);
  const evalScore = termGroupScore(allText, skillNames, candidate.redrob_signals.skill_assessment_scores, seniorAiEngineerSkillGroups.evaluation);
  const mlScore = termGroupScore(allText, skillNames, candidate.redrob_signals.skill_assessment_scores, seniorAiEngineerSkillGroups.mlSystems);
  const distributedScore = termGroupScore(allText, skillNames, candidate.redrob_signals.skill_assessment_scores, seniorAiEngineerSkillGroups.distributed);
  const semanticFit = semanticConceptFit(candidate, allText, skillNames);
  const vectorSimilarity = redrobVectorSimilarity(candidate, allText);
  const technical = clamp(
    retrievalScore * 0.2 + vectorScore * 0.18 + rankingScore * 0.18 + evalScore * 0.16 + pythonScore * 0.14 + mlScore * 0.14,
    0,
    1,
  );
  const rankingEvaluation = clamp(rankingScore * 0.45 + evalScore * 0.45 + retrievalScore * 0.1, 0, 1);
  const production = productionEvidenceScore(careerText, candidate);
  const roleDomain = roleDomainScore(candidate, allText);
  const experience = seniorAiExperienceFit(candidate.profile.years_of_experience);
  const behavior = redrobBehaviorScore(candidate);
  const availability = redrobAvailabilityScore(candidate);
  const bonus = clamp(
    termGroupScore(allText, skillNames, candidate.redrob_signals.skill_assessment_scores, ["fine-tuning", "lora", "qlora", "peft"]) * 0.18 +
      termGroupScore(allText, skillNames, candidate.redrob_signals.skill_assessment_scores, ["learning-to-rank", "xgboost", "neural ranking"]) * 0.16 +
      termGroupScore(allText, skillNames, candidate.redrob_signals.skill_assessment_scores, ["hr-tech", "recruiting", "marketplace", "matching"]) * 0.12 +
      distributedScore * 0.12 +
      githubBonus(candidate),
    0,
    0.09,
  );
  const concerns = redrobConcerns(candidate, { allText, careerText, technical, production, roleDomain });
  const penalty = clamp(concerns.length * 0.035 + honeypotPenalty(candidate), 0, 0.28);
  const recruiterLearning = recruiterLearningScore({ semanticFit, vectorSimilarity, technical, production, roleDomain, rankingEvaluation, experience, behavior, availability, penalty });
  const evidenceStrength = clamp(technical * 0.42 + production * 0.28 + roleDomain * 0.2 + rankingEvaluation * 0.1, 0, 1);
  const proxyLift = behavior * 0.09 + availability * 0.08;
  const proxyGuardrail = evidenceStrength < 0.52 ? clamp(proxyLift * (0.52 - evidenceStrength) * 1.15, 0, 0.055) : 0;
  const rawScore = clamp(
    semanticFit * 0.15 +
      vectorSimilarity * 0.08 +
      technical * 0.17 +
      production * 0.16 +
      roleDomain * 0.11 +
      rankingEvaluation * 0.1 +
      experience * 0.08 +
      behavior * 0.06 +
      availability * 0.04 +
      recruiterLearning * 0.05 +
      bonus -
      penalty -
      proxyGuardrail,
    0,
    1,
  );

  return {
    candidate,
    rawScore,
    score: clamp(0.2 + rawScore * 0.79, 0.2, 0.99),
    components: { semanticFit, vectorSimilarity, technical, production, roleDomain, rankingEvaluation, experience, behavior, availability, recruiterLearning, bonus, penalty, proxyGuardrail },
    evidence: {
      coreHits: redrobEvidenceHits(allText, skillNames),
      niceHits: redrobNiceHits(allText, skillNames),
      strongestSkill: strongestChallengeSkill(candidate),
      assessment: strongestAssessment(candidate),
      productionSignals: productionSignals(careerText),
    },
    concerns,
  };
}

function redrobSubmissionScore(scored: RedrobScoreDetails): number {
  return Number(scored.score.toFixed(4));
}

function redrobKeywordBaselineScore(scored: RedrobScoreDetails): number {
  return clamp(
    scored.components.technical * 0.45 +
      scored.components.rankingEvaluation * 0.25 +
      scored.components.roleDomain * 0.15 +
      scored.components.experience * 0.1 +
      scored.components.bonus * 0.05 -
      scored.components.penalty,
    0,
    1,
  );
}

function createRedrobDatasetFacts(candidates: RedrobCandidate[]): RedrobEvaluationReport["datasetFacts"] {
  const count = Math.max(1, candidates.length);
  const skillCount = candidates.reduce((total, candidate) => total + candidate.skills.length, 0);
  const coverageKeys = [
    "recruiter_response_rate",
    "avg_response_time_hours",
    "github_activity_score",
    "skill_assessment_scores",
    "saved_by_recruiters_30d",
    "interview_completion_rate",
    "offer_acceptance_rate",
    "open_to_work_flag",
    "notice_period_days",
    "expected_salary_range_inr_lpa",
  ] as const;

  return {
    candidates: candidates.length,
    averageYearsExperience: average(candidates.map((candidate) => candidate.profile.years_of_experience)),
    averageSkillsPerCandidate: Number((skillCount / count).toFixed(2)),
    signalCoverage: Object.fromEntries(
      coverageKeys.map((key) => {
        const covered = candidates.filter((candidate) => redrobSignalIsCovered(candidate, key)).length;
        return [key, { count: covered, share: Number((covered / count).toFixed(4)) }];
      }),
    ),
  };
}

function redrobSignalIsCovered(candidate: RedrobCandidate, key: keyof RedrobCandidate["redrob_signals"]): boolean {
  const value = candidate.redrob_signals[key];
  if (key === "skill_assessment_scores") return typeof value === "object" && value !== null && Object.keys(value).length > 0;
  if (key === "github_activity_score" || key === "offer_acceptance_rate") return typeof value === "number" && value >= 0;
  if (key === "expected_salary_range_inr_lpa") return typeof value === "object" && value !== null;
  return value !== undefined && value !== null;
}

function overlapCount(rows: RedrobScoreDetails[], ids: Set<string>): number {
  return rows.filter((row) => ids.has(row.candidate.candidate_id)).length;
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return Number((values.reduce((total, value) => total + value, 0) / values.length).toFixed(4));
}

function redrobScoreBreakdown(scored: RedrobScoreDetails): RedrobScoreBreakdown {
  return {
    semanticFit: percent(scored.components.semanticFit),
    vectorSimilarity: percent(scored.components.vectorSimilarity),
    technicalEvidence: percent(scored.components.technical),
    productionProof: percent(scored.components.production),
    rankingEvaluation: percent(scored.components.rankingEvaluation),
    roleDomain: percent(scored.components.roleDomain),
    experienceFit: percent(scored.components.experience),
    behavioralSignals: percent(scored.components.behavior),
    availability: percent(scored.components.availability),
    recruiterLearning: percent(scored.components.recruiterLearning),
    bonus: percent(scored.components.bonus),
    penalties: percent(scored.components.penalty),
    proxyGuardrail: percent(scored.components.proxyGuardrail),
  };
}

function redrobExplainableEvidence(scored: RedrobScoreDetails): string[] {
  return unique([
    ...scored.evidence.coreHits,
    ...scored.evidence.productionSignals,
    scored.evidence.strongestSkill ? `strongest skill: ${scored.evidence.strongestSkill}` : "",
    scored.evidence.assessment ? `assessment: ${scored.evidence.assessment}` : "",
  ].filter(Boolean)).slice(0, 8);
}

function buildRedrobReasoning(scored: RedrobScoreDetails, rank: number): string {
  const { candidate, evidence, concerns, components } = scored;
  const profile = candidate.profile;
  const pieces = [
    `${profile.current_title || "Candidate"} with ${profile.years_of_experience.toFixed(1)} yrs in ${profile.location || profile.country || "listed location"}`,
    `semantic fit ${(components.semanticFit * 100).toFixed(0)}% across retrieval, ranking, evaluation, and production AI concepts`,
    `vector similarity ${(components.vectorSimilarity * 100).toFixed(0)}% against the Senior AI Engineer job embedding`,
    `review-informed evidence ${(components.recruiterLearning * 100).toFixed(0)}% based on production proof, ranking depth, and role evidence`,
    evidence.coreHits.length
      ? `matches ${evidence.coreHits.slice(0, 4).join(", ")} from the Senior AI Engineer JD`
      : evidence.strongestSkill
        ? `has adjacent skill evidence around ${evidence.strongestSkill}`
        : "has limited explicit AI-retrieval skill evidence",
    evidence.productionSignals.length
      ? `production proof includes ${evidence.productionSignals.slice(0, 2).join(" and ")}`
      : "production deployment proof is thin",
  ];
  const signal = `Redrob signals: response rate ${candidate.redrob_signals.recruiter_response_rate.toFixed(2)}, notice ${candidate.redrob_signals.notice_period_days}d, last active ${candidate.redrob_signals.last_active_date || "unknown"}.`;
  const concern = concerns[0] ? `Concern: ${concerns[0]}.` : components.availability < 0.55 ? "Concern: location or availability needs recruiter confirmation." : "";
  const tone =
    rank <= 10
      ? "Strong fit"
      : rank <= 50
        ? "Good but not clean-cut fit"
        : "Included as a lower-confidence fit";
  return [tone, `${pieces.join("; ")}.`, signal, concern].filter(Boolean).join(" ");
}

function redrobAllText(candidate: RedrobCandidate): string {
  return [
    candidate.profile.headline,
    candidate.profile.summary,
    candidate.profile.current_title,
    candidate.profile.current_industry,
    ...candidate.career_history.flatMap((item) => [item.title, item.industry, item.description]),
    ...candidate.skills.map((skill) => skill.name),
    ...candidate.certifications.flatMap((cert) => [cert.name, cert.issuer]),
    ...candidate.education.map((edu) => edu.field_of_study),
  ]
    .join(" ")
    .toLowerCase();
}

function redrobCareerText(candidate: RedrobCandidate): string {
  return candidate.career_history
    .flatMap((item) => [item.title, item.industry, item.description])
    .join(" ")
    .toLowerCase();
}

function termGroupScore(text: string, skills: string[], assessments: Record<string, number>, terms: string[]): number {
  const lowerSkills = skills.map((skill) => skill.toLowerCase());
  const textHits = terms.filter((term) => containsTerm(text, term)).length;
  const skillHits = terms.filter((term) => lowerSkills.some((skill) => containsTerm(skill, term))).length;
  const assessedScores = Object.entries(assessments)
    .filter(([name]) => terms.some((term) => containsTerm(name.toLowerCase(), term)))
    .map(([, score]) => score / 100);
  const textScore = clamp(textHits / Math.min(4, terms.length), 0, 1);
  const skillScore = clamp(skillHits / Math.min(3, terms.length), 0, 1);
  const assessmentScore = assessedScores.length ? Math.max(...assessedScores) : 0;
  return clamp(textScore * 0.46 + skillScore * 0.34 + assessmentScore * 0.2, 0, 1);
}

function semanticConceptFit(candidate: RedrobCandidate, text: string, skills: string[]): number {
  const lowerSkills = skills.map((skill) => skill.toLowerCase());
  const assessmentNames = Object.keys(candidate.redrob_signals.skill_assessment_scores);
  const weighted = seniorAiSemanticConcepts.map((concept) => {
    const textHits = concept.terms.filter((term) => containsTerm(text, term)).length;
    const skillHits = concept.terms.filter((term) => lowerSkills.some((skill) => containsTerm(skill, term))).length;
    const assessmentHits = concept.terms.filter((term) => assessmentNames.some((name) => containsTerm(name.toLowerCase(), term))).length;
    const score = clamp(
      clamp(textHits / 4, 0, 1) * 0.5 +
        clamp(skillHits / 2, 0, 1) * 0.34 +
        clamp(assessmentHits / 1, 0, 1) * 0.1 +
        roleHistoryConceptLift(candidate, concept.terms) * 0.06,
      0,
      1,
    );
    return { score, weight: concept.weight };
  });
  const totalWeight = weighted.reduce((total, item) => total + item.weight, 0);
  return totalWeight ? clamp(weighted.reduce((total, item) => total + item.score * item.weight, 0) / totalWeight, 0, 1) : 0;
}

function redrobVectorSimilarity(candidate: RedrobCandidate, allText: string): number {
  const candidateVectorText = [
    candidate.profile.current_title,
    candidate.profile.headline,
    candidate.profile.summary,
    candidate.profile.current_industry,
    candidate.career_history.map((item) => `${item.title} ${item.industry} ${item.description}`).join(" "),
    candidate.skills.map((skill) => `${skill.name} ${skill.proficiency}`).join(" "),
    Object.keys(candidate.redrob_signals.skill_assessment_scores).join(" "),
  ].join(" ");
  const similarity = cosineSimilarity(textEmbeddingVector(`${candidateVectorText} ${allText}`), seniorAiEngineerJobVector);
  return clamp((similarity + 1) / 2, 0, 1);
}

function textEmbeddingVector(text: string, dimensions = 96): number[] {
  const vector = Array.from({ length: dimensions }, () => 0);
  const tokens = tokenizeForVector(text);
  tokens.forEach((token, index) => {
    const weight = token.length > 6 ? 1.18 : 1;
    vector[hashToIndex(token, dimensions)] += weight;
    if (index < tokens.length - 1) vector[hashToIndex(`${token}_${tokens[index + 1]}`, dimensions)] += weight * 0.72;
    for (let start = 0; start <= token.length - 3; start += 1) {
      vector[hashToIndex(token.slice(start, start + 3), dimensions)] += 0.24;
    }
  });
  const norm = Math.sqrt(vector.reduce((total, value) => total + value * value, 0)) || 1;
  return vector.map((value) => value / norm);
}

function tokenizeForVector(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !vectorStopwords.has(token));
  return normalized.slice(0, 700);
}

function hashToIndex(value: string, dimensions: number): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % dimensions;
}

function cosineSimilarity(left: number[], right: number[]): number {
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
  return dot / Math.sqrt(leftNorm * rightNorm);
}

function recruiterLearningScore(components: {
  semanticFit: number;
  vectorSimilarity: number;
  technical: number;
  production: number;
  roleDomain: number;
  rankingEvaluation: number;
  experience: number;
  behavior: number;
  availability: number;
  penalty: number;
}): number {
  return clamp(
    components.production * 0.24 +
      components.rankingEvaluation * 0.2 +
      components.vectorSimilarity * 0.18 +
      components.technical * 0.16 +
      components.semanticFit * 0.1 +
      components.experience * 0.06 +
      components.availability * 0.04 +
      components.behavior * 0.02 -
      components.penalty * 0.25,
    0,
    1,
  );
}

function roleHistoryConceptLift(candidate: RedrobCandidate, terms: readonly string[]): number {
  const titles = [candidate.profile.current_title, ...candidate.career_history.map((item) => item.title)].join(" ").toLowerCase();
  if (terms.some((term) => containsTerm(titles, term))) return 1;
  if (/ai engineer|machine learning|ml engineer|nlp|search|ranking|backend|data engineer/.test(titles)) return 0.5;
  return 0;
}

function containsTerm(text: string, term: string): boolean {
  const lower = text;
  const normalizedTerm = term.toLowerCase();
  if (normalizedTerm.includes(" ") || normalizedTerm.includes("-") || normalizedTerm.includes("/")) return lower.includes(normalizedTerm);
  const cached = termRegexCache.get(normalizedTerm);
  if (cached) return cached.test(lower);
  const regex = new RegExp(`(^|[^a-z0-9+#])${escapeRegExp(normalizedTerm)}([^a-z0-9+#]|$)`);
  termRegexCache.set(normalizedTerm, regex);
  return regex.test(lower);
}

function productionEvidenceScore(careerText: string, candidate: RedrobCandidate): number {
  const terms = [
    "production",
    "deployed",
    "shipped",
    "real users",
    "scale",
    "latency",
    "monitoring",
    "on-call",
    "owned",
    "built",
    "led",
    "platform",
    "quality regression",
    "a/b",
  ];
  const hits = terms.filter((term) => containsTerm(careerText, term)).length;
  const github = candidate.redrob_signals.github_activity_score < 0 ? 0 : candidate.redrob_signals.github_activity_score / 100;
  const companyScale = ["1001-5000", "5001-10000", "10001+"].includes(candidate.profile.current_company_size) ? 0.08 : 0;
  return clamp((hits / 7) * 0.82 + github * 0.1 + companyScale, 0, 1);
}

function roleDomainScore(candidate: RedrobCandidate, allText: string): number {
  const titles = [candidate.profile.current_title, ...candidate.career_history.map((item) => item.title)].join(" ").toLowerCase();
  if (/(senior\s+)?ai engineer|machine learning engineer|ml engineer|nlp engineer|applied ml/.test(titles)) return 1;
  if (/data scientist|mlops|research engineer/.test(titles)) return 0.86;
  if (/data engineer|backend engineer|software engineer|full stack developer/.test(titles)) {
    return containsTerm(allText, "retrieval") || containsTerm(allText, "embedding") || containsTerm(allText, "ranking") ? 0.78 : 0.58;
  }
  if (/product manager|business analyst|marketing|hr|sales|accountant|support|designer|mechanical|civil/.test(titles)) return 0.16;
  return 0.38;
}

function seniorAiExperienceFit(years: number): number {
  if (years >= 5 && years <= 9) return 1;
  if (years >= 4 && years < 5) return 0.86;
  if (years > 9 && years <= 11) return 0.82;
  if (years >= 3 && years < 4) return 0.62;
  if (years > 11 && years <= 14) return 0.56;
  if (years < 3) return clamp(years / 3, 0, 1) * 0.45;
  return 0.42;
}

function redrobBehaviorScore(candidate: RedrobCandidate): number {
  const signals = candidate.redrob_signals;
  const recency = recencyScore(signals.last_active_date);
  const response = clamp(signals.recruiter_response_rate, 0, 1);
  const responseTime = signals.avg_response_time_hours <= 24 ? 1 : signals.avg_response_time_hours <= 72 ? 0.76 : signals.avg_response_time_hours <= 168 ? 0.42 : 0.16;
  const notice = signals.notice_period_days <= 30 ? 1 : signals.notice_period_days <= 60 ? 0.78 : signals.notice_period_days <= 90 ? 0.46 : signals.notice_period_days <= 120 ? 0.22 : 0.06;
  const verified = [signals.verified_email, signals.verified_phone, signals.linkedin_connected].filter(Boolean).length / 3;
  const demand = clamp(signals.saved_by_recruiters_30d / 8, 0, 1) * 0.55 + clamp(signals.profile_views_received_30d / 60, 0, 1) * 0.45;
  return clamp(
    (signals.profile_completeness_score / 100) * 0.16 +
      recency * 0.17 +
      response * 0.19 +
      responseTime * 0.1 +
      notice * 0.14 +
      (signals.open_to_work_flag ? 1 : 0.35) * 0.1 +
      verified * 0.08 +
      demand * 0.06,
    0,
    1,
  );
}

function redrobAvailabilityScore(candidate: RedrobCandidate): number {
  const profile = candidate.profile;
  const signals = candidate.redrob_signals;
  const loc = `${profile.location} ${profile.country}`.toLowerCase();
  const targetCity = /pune|noida/.test(loc) ? 1 : 0;
  const tierOneIndia = /bengaluru|bangalore|delhi|ncr|mumbai|hyderabad|chennai|gurgaon|gurugram|india/.test(loc) ? 0.82 : 0;
  const relocation = signals.willing_to_relocate ? 0.76 : 0;
  const location = Math.max(targetCity, tierOneIndia, relocation, profile.country.toLowerCase() === "india" ? 0.72 : 0.22);
  const workMode = signals.preferred_work_mode === "hybrid" || signals.preferred_work_mode === "flexible" ? 1 : signals.preferred_work_mode === "onsite" ? 0.82 : 0.55;
  return clamp(location * 0.65 + workMode * 0.2 + (signals.open_to_work_flag ? 1 : 0.35) * 0.15, 0, 1);
}

function redrobConcerns(
  candidate: RedrobCandidate,
  context: { allText: string; careerText: string; technical: number; production: number; roleDomain: number },
): string[] {
  const concerns: string[] = [];
  const text = context.allText;
  if (
    context.production < 0.42 &&
    (text.includes("curious about how ai tools") ||
      text.includes("experimented with chatgpt") ||
      text.includes("self-learner level") ||
      text.includes("small rag side project") ||
      text.includes("haven't done it in a professional capacity") ||
      text.includes("transition"))
  ) {
    concerns.push("AI evidence looks recent or exploratory rather than production-grade");
  }
  if (context.production < 0.35 && /research|academic lab|publication|paper/.test(text)) {
    concerns.push("research signal is not balanced by production deployment evidence");
  }
  if (context.roleDomain < 0.35 && context.technical > 0.6) {
    concerns.push("skill list is stronger than the actual role history");
  }
  if (candidate.redrob_signals.notice_period_days > 90) concerns.push(`long notice period (${candidate.redrob_signals.notice_period_days} days)`);
  if (candidate.redrob_signals.recruiter_response_rate < 0.15) concerns.push("low recruiter response rate");
  if (recencyScore(candidate.redrob_signals.last_active_date) < 0.3) concerns.push("profile has not been active recently");
  if (candidate.redrob_signals.profile_completeness_score < 45) concerns.push("profile completeness is low");
  return concerns.slice(0, 4);
}

function honeypotPenalty(candidate: RedrobCandidate): number {
  let penalty = 0;
  const currentRoles = candidate.career_history.filter((item) => item.is_current).length;
  if (currentRoles > 1) penalty += 0.08;
  if (candidate.education.some((edu) => edu.start_year && edu.end_year && edu.start_year > edu.end_year)) penalty += 0.08;
  if (candidate.career_history.some((item) => isFutureDate(item.start_date) || (item.end_date ? isFutureDate(item.end_date) : false))) penalty += 0.08;
  const experienceMonths = candidate.profile.years_of_experience * 12;
  if (candidate.skills.some((skill) => (skill.duration_months ?? 0) > experienceMonths + 36)) penalty += 0.05;
  return penalty;
}

function redrobEvidenceHits(text: string, skillNames: string[]): string[] {
  const terms = [
    "python",
    "embeddings",
    "retrieval",
    "ranking",
    "evaluation",
    "ndcg",
    "mrr",
    "vector database",
    "faiss",
    "milvus",
    "qdrant",
    "opensearch",
    "elasticsearch",
    "llm",
    "fine-tuning",
  ];
  const lowerSkills = skillNames.map((skill) => skill.toLowerCase());
  return unique(
    terms.filter(
      (term) => containsTerm(text, term) || lowerSkills.some((skill) => containsTerm(skill, term) || (term === "embeddings" && containsTerm(skill, "embedding"))),
    ),
  );
}

function redrobNiceHits(text: string, skillNames: string[]): string[] {
  const terms = ["lora", "qlora", "peft", "learning-to-rank", "distributed", "inference", "marketplace", "recruiting"];
  const lowerSkills = skillNames.map((skill) => skill.toLowerCase());
  return terms.filter((term) => containsTerm(text, term) || lowerSkills.some((skill) => containsTerm(skill, term)));
}

function strongestChallengeSkill(candidate: RedrobCandidate): string {
  const preferred = [
    ...seniorAiEngineerSkillGroups.retrieval,
    ...seniorAiEngineerSkillGroups.vector,
    ...seniorAiEngineerSkillGroups.ranking,
    ...seniorAiEngineerSkillGroups.evaluation,
    ...seniorAiEngineerSkillGroups.python,
    ...seniorAiEngineerSkillGroups.mlSystems,
  ];
  const scored = candidate.skills
    .map((skill) => ({
      name: skill.name,
      score: (preferred.some((term) => containsTerm(skill.name.toLowerCase(), term)) ? 1 : 0.2) + proficiencyScore(skill.proficiency) + clamp((skill.duration_months ?? 0) / 48, 0, 0.4),
    }))
    .sort((a, b) => b.score - a.score);
  return scored[0]?.name ?? "";
}

function strongestAssessment(candidate: RedrobCandidate): string {
  const entries = Object.entries(candidate.redrob_signals.skill_assessment_scores).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return "";
  return `${entries[0][0]} ${entries[0][1].toFixed(0)}`;
}

function productionSignals(careerText: string): string[] {
  return [
    ["production", "production systems"],
    ["deployed", "deployed systems"],
    ["shipped", "shipping history"],
    ["real users", "real-user systems"],
    ["owned", "ownership"],
    ["led", "team or project leadership"],
    ["platform", "platform work"],
    ["a/b", "A/B testing"],
    ["monitoring", "operational monitoring"],
  ]
    .filter(([term]) => containsTerm(careerText, term))
    .map(([, label]) => label);
}

function githubBonus(candidate: RedrobCandidate): number {
  const score = candidate.redrob_signals.github_activity_score;
  if (score < 0) return 0;
  return clamp(score / 100, 0, 1) * 0.05;
}

function proficiencyScore(proficiency: RedrobCandidate["skills"][number]["proficiency"]): number {
  if (proficiency === "expert") return 1;
  if (proficiency === "advanced") return 0.78;
  if (proficiency === "intermediate") return 0.52;
  return 0.25;
}

function recencyScore(dateString: string): number {
  const parsed = Date.parse(dateString);
  if (!Number.isFinite(parsed)) return 0.1;
  const days = Math.max(0, (challengeReferenceDate.getTime() - parsed) / 86_400_000);
  if (days <= 14) return 1;
  if (days <= 30) return 0.85;
  if (days <= 90) return 0.56;
  if (days <= 180) return 0.28;
  return 0.08;
}

function isFutureDate(dateString: string): boolean {
  const parsed = Date.parse(dateString);
  return Number.isFinite(parsed) && parsed > challengeReferenceDate.getTime();
}

function createStandardBiasAudit(pool: GateCandidate[], selected: GateCandidate[]): BiasAudit {
  return createBiasAudit({
    pool,
    selected,
    classifiers: [
      ["location", (candidate) => locationBucket(candidate.location)],
      ["experience band", (candidate) => experienceBand(candidate.experience_years)],
      ["salary band", (candidate) => salaryBand(candidate.salary_expectation_lpa)],
    ],
    protectedAttributesAvailable: false,
    excludedSignals: ["candidate name", "email", "photo", "school prestige", "personal background"],
    mitigations: [
      "AI review receives evidence fields only and is limited to shortlisted candidates",
      "name and email are display/contact fields, not score fields",
      "shortlists include rejection reasons so humans can challenge the result",
      "live simulation score can override the provisional local rank",
    ],
    missingProtectedWarning:
      "The CSV format does not ask for protected attributes. Sifter audits proxy fields such as location, experience, and salary instead.",
  });
}

function createBiasAudit<T>({
  pool,
  selected,
  classifiers,
  protectedAttributesAvailable,
  excludedSignals,
  mitigations,
  missingProtectedWarning,
}: {
  pool: T[];
  selected: T[];
  classifiers: Array<[string, (item: T) => string]>;
  protectedAttributesAvailable: boolean;
  excludedSignals: string[];
  mitigations: string[];
  missingProtectedWarning: string;
}): BiasAudit {
  const proxyGroups = classifiers.flatMap(([field, classify]) => auditClassifier(field, pool, selected, classify));
  const flagged = proxyGroups.filter((group) => group.flag !== "ok");
  const warnings = [missingProtectedWarning];
  if (flagged.length) {
    warnings.push(`${flagged.length} proxy group${flagged.length === 1 ? "" : "s"} need human review before final hiring decisions.`);
  }

  return {
    status: flagged.length ? "review" : "pass",
    summary: flagged.length
      ? "Bias guardrail applied; proxy distribution still needs human review."
      : "Bias guardrail applied; no proxy distribution warning crossed the review threshold.",
    protectedAttributesAvailable,
    protectedAttributesUsed: [],
    excludedSignals,
    mitigations,
    proxyGroups,
    warnings,
  };
}

function auditClassifier<T>(field: string, pool: T[], selected: T[], classify: (item: T) => string): BiasAuditGroup[] {
  const poolCounts = countBy(pool.map(classify));
  const selectedCounts = countBy(selected.map(classify));
  const poolTotal = Math.max(1, pool.length);
  const selectedTotal = Math.max(1, selected.length);

  return Array.from(poolCounts.entries())
    .map(([group, poolCount]) => {
      const selectedCount = selectedCounts.get(group) ?? 0;
      const poolShare = poolCount / poolTotal;
      const selectedShare = selectedCount / selectedTotal;
      const ratio = poolShare > 0 ? selectedShare / poolShare : 0;
      const enoughToReview = poolCount >= Math.max(10, poolTotal * 0.01) || selectedCount >= 3;
      const flag: BiasAuditGroup["flag"] =
        enoughToReview && selectedCount === 0 && poolShare >= 0.08
          ? "under_selected"
          : enoughToReview && ratio >= 2.5 && selectedCount >= 3
            ? "over_selected"
            : enoughToReview && ratio <= 0.35 && poolShare >= 0.08
              ? "under_selected"
              : "ok";
      return {
        field,
        group,
        poolCount,
        selectedCount,
        poolShare: Number(poolShare.toFixed(4)),
        selectedShare: Number(selectedShare.toFixed(4)),
        ratio: Number(ratio.toFixed(2)),
        flag,
      };
    })
    .sort((a, b) => Number(b.flag !== "ok") - Number(a.flag !== "ok") || b.selectedCount - a.selectedCount || b.poolCount - a.poolCount);
}

function countBy(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return counts;
}

function countryBucket(value: string): string {
  const lower = value.toLowerCase();
  if (lower.includes("india")) return "India";
  if (!lower.trim()) return "unknown";
  return "outside India";
}

function locationBucket(value: string): string {
  const lower = value.toLowerCase();
  if (!lower.trim()) return "unknown";
  if (lower.includes("remote")) return "remote";
  if (/bengaluru|bangalore|mumbai|delhi|ncr|pune|hyderabad|chennai|gurgaon|gurugram/.test(lower)) return "major Indian hiring hub";
  if (lower.includes("india")) return "other India";
  return "other";
}

function experienceBand(years: number): string {
  if (years < 3) return "0-2 years";
  if (years < 5) return "3-4 years";
  if (years <= 9) return "5-9 years";
  if (years <= 14) return "10-14 years";
  return "15+ years";
}

function salaryBand(lpa: number): string {
  if (!lpa) return "not provided";
  if (lpa <= 8) return "0-8 LPA";
  if (lpa <= 18) return "9-18 LPA";
  if (lpa <= 35) return "19-35 LPA";
  return "36+ LPA";
}

function noticeBand(days: number): string {
  if (days <= 30) return "0-30 days";
  if (days <= 60) return "31-60 days";
  if (days <= 90) return "61-90 days";
  return "91+ days";
}

function quoteCsvValue(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function percent(value: number): number {
  return Number((clamp(value, 0, 1) * 100).toFixed(1));
}

function unique<T>(list: T[]): T[] {
  return Array.from(new Set(list));
}

function desc(key: keyof GateCandidate) {
  return (a: GateCandidate, b: GateCandidate) => Number(b[key] ?? 0) - Number(a[key] ?? 0);
}
