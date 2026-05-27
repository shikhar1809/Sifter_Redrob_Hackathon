import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { parseCsv, runDeterministicPipeline, runPipelineInputSchema } from "@seederpro/core";
import { z } from "zod";
import { registerAuth } from "./auth.js";
import { config } from "./config.js";
import { checkDatabase, savePipelineRun } from "./db.js";
import { attachAiReviews, reviewCandidatesWithGemini } from "./gemini.js";

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
  max: 120,
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

app.post("/pipeline-runs", async (request, reply) => {
  const body = runPipelineInputSchema.safeParse(request.body);
  if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

  const result = runDeterministicPipeline(body.data);
  let runId: string | null = null;

  try {
    const reviews = await reviewCandidatesWithGemini(body.data.roleDescription, result.final);
    result.invited = attachAiReviews(result.invited, reviews);
    result.simulation = attachAiReviews(result.simulation, reviews);
    result.final = attachAiReviews(result.final, reviews);
  } catch (error) {
    request.log.warn({ error }, "Gemini review failed; continuing with deterministic results");
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
