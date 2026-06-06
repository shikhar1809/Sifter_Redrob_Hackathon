import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import {
  exportRedrobSubmissionCsv,
  createRedrobBiasAudit,
  createRedrobEvaluationReport,
  parseCsv,
  parseRedrobCandidates,
  rankRedrobCandidates,
  runDeterministicPipeline,
  runPipelineInputSchema,
} from "@seederpro/core";
import { z } from "zod";
import { registerAuth } from "./auth.js";
import { config } from "./config.js";
import { checkDatabase, savePipelineRun } from "./db.js";
import { attachAiReviews, geminiReviewCandidateLimit, reviewCandidatesWithGemini } from "./gemini.js";
import { rerankRedrobRowsWithLearnedModel } from "./learned-rerank.js";
import { rerankRedrobRowsWithTransformer } from "./transformer-rerank.js";

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
  },
  bodyLimit: 8 * 1024 * 1024,
});

await app.register(cors, {
  origin: [config.webOrigin, "http://localhost:3000"],
});

await app.register(rateLimit, {
  max: 80,
  timeWindow: "1 minute",
});

await registerAuth(app);

app.get("/health", async () => ({
  ok: true,
  database: await checkDatabase(),
  authRequired: config.authRequired,
  intelligence: {
    provider: "gemini",
    enabled: config.geminiReviewEnabled,
    configured: Boolean(config.geminiApiKey),
    model: config.geminiModel,
  },
  learnedReranker: {
    provider: "huggingface",
    enabled: config.learnedRerankEnabled,
    configured: Boolean(config.huggingFaceToken),
    model: config.sifterRerankerModel,
    weight: config.learnedRerankWeight,
  },
}));

app.post("/csv/parse", async (request, reply) => {
  const body = z.object({ csv: z.string().min(1) }).safeParse(request.body);
  if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

  try {
    return { candidates: parseCsv(body.data.csv) };
  } catch (error) {
    return reply.status(400).send({ error: error instanceof Error ? error.message : "Invalid CSV" });
  }
});

app.post("/redrob/parse", async (request, reply) => {
  const body = z.object({ text: z.string().min(1) }).safeParse(request.body);
  if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

  try {
    const candidates = parseRedrobCandidates(body.data.text);
    return {
      candidates,
      count: candidates.length,
      message: `Parsed ${candidates.length} Redrob candidate${candidates.length === 1 ? "" : "s"}.`,
    };
  } catch (error) {
    return reply.status(400).send({ error: error instanceof Error ? error.message : "Invalid Redrob JSON/JSONL" });
  }
});

app.post("/redrob/rank", async (request, reply) => {
  const body = z
    .object({
      text: z.string().optional(),
      candidates: z.array(z.unknown()).optional(),
      limit: z.number().int().positive().max(100).default(100),
      transformerRerank: z.boolean().default(false),
      learnedRerank: z.boolean().default(false),
      learnedRerankWeight: z.number().min(0).max(1).optional(),
    })
    .refine((value) => value.text || value.candidates?.length, "Provide candidate text or candidate objects")
    .safeParse(request.body);
  if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

  try {
    const candidates = body.data.candidates?.length ? parseRedrobCandidates(JSON.stringify(body.data.candidates)) : parseRedrobCandidates(body.data.text ?? "");
    const baseRows = rankRedrobCandidates({ candidates, limit: body.data.limit });
    const transformerRows = body.data.transformerRerank ? await rerankRedrobRowsWithTransformer(candidates, baseRows) : baseRows;
    const learned = await rerankRedrobRowsWithLearnedModel(candidates, transformerRows, {
      enabled: body.data.learnedRerank,
      weight: body.data.learnedRerankWeight,
    });
    const rows = learned.rows;
    return {
      rows,
      csv: exportRedrobSubmissionCsv(rows),
      count: candidates.length,
      transformerRerank: body.data.transformerRerank,
      learnedRerank: learned.metadata,
      biasAudit: createRedrobBiasAudit(candidates, rows),
      evaluationReport: createRedrobEvaluationReport(candidates, rows),
    };
  } catch (error) {
    return reply.status(400).send({ error: error instanceof Error ? error.message : "Could not rank Redrob candidates" });
  }
});

app.addHook("preHandler", async (request, reply) => {
  if (request.method === "POST" && request.url === "/pipeline-runs") {
    const contentLength = Number(request.headers["content-length"] ?? 0);
    if (contentLength > 4 * 1024 * 1024) {
      return reply.status(413).send({ error: "Pipeline request is too large. Split the CSV or reduce candidate count." });
    }
  }
});

app.post("/pipeline-runs", async (request, reply) => {
  const body = runPipelineInputSchema.safeParse(request.body);
  if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

  const result = runDeterministicPipeline(body.data);
  let runId: string | null = null;
  result.intelligence = {
    provider: "gemini",
    enabled: config.geminiReviewEnabled && body.data.options.aiReview,
    configured: Boolean(config.geminiApiKey),
    status: config.geminiReviewEnabled && body.data.options.aiReview && config.geminiApiKey ? "fallback" : "disabled",
    model: config.geminiModel,
    reviewedCandidates: 0,
    message:
      config.geminiReviewEnabled && body.data.options.aiReview && config.geminiApiKey
        ? "AI review did not attach; local deterministic report is available."
        : "AI review is off or not configured; local deterministic report is available.",
  };

  if (body.data.options.aiReview) {
    try {
      const candidatesForReview = result.final.slice(0, geminiReviewCandidateLimit);
      const reviews = await reviewCandidatesWithGemini(body.data.roleDescription, candidatesForReview);
      result.invited = attachAiReviews(result.invited, reviews);
      result.simulation = attachAiReviews(result.simulation, reviews);
      result.final = attachAiReviews(result.final, reviews);
      result.intelligence = {
        provider: "gemini",
        enabled: config.geminiReviewEnabled,
        configured: Boolean(config.geminiApiKey),
        status: reviews.size ? "completed" : result.intelligence.status,
        model: config.geminiModel,
        reviewedCandidates: reviews.size,
        message: reviews.size
          ? `AI reviewed the top ${reviews.size} recommended candidate${reviews.size === 1 ? "" : "s"}.`
          : result.intelligence.message,
      };
    } catch (error) {
      result.intelligence.message = "AI review failed during this run; local deterministic report is available.";
      request.log.warn({ error }, "AI review failed; continuing with deterministic results");
    }
  }

  try {
    runId = await savePipelineRun({
      roleDescription: body.data.roleDescription,
      roleProfile: result.roleProfile,
      result,
      actor: request.actor ?? undefined,
    });
  } catch (error) {
    request.log.warn({ error }, "pipeline run was computed but not persisted");
  }

  return reply.send({ runId, result });
});

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  return reply.status(500).send({ error: "Internal server error" });
});

await app.listen({ host: config.host, port: config.port });
