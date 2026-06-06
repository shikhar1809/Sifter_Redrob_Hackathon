import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
loadEnv();
loadEnv({ path: resolve(here, "../../../.env") });

export const config = {
  host: process.env.API_HOST ?? (process.env.PORT ? "0.0.0.0" : "127.0.0.1"),
  port: Number(process.env.API_PORT ?? process.env.PORT ?? 4000),
  webOrigin: process.env.WEB_ORIGIN ?? "http://127.0.0.1:3000",
  databaseUrl: process.env.DATABASE_URL,
  authRequired: process.env.AUTH_REQUIRED === "true",
  keycloakJwksUrl: process.env.KEYCLOAK_JWKS_URL,
  keycloakIssuer: process.env.KEYCLOAK_ISSUER,
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  geminiReviewEnabled: process.env.GEMINI_REVIEW_ENABLED !== "false",
  huggingFaceToken: process.env.HF_TOKEN,
  sifterRerankerModel: process.env.SIFTER_RERANKER_MODEL ?? "shikharshahi/sifter-redrob-reranker",
  learnedRerankEnabled: process.env.SIFTER_LEARNED_RERANK_ENABLED === "true",
  learnedRerankWeight: Number(process.env.SIFTER_LEARNED_RERANK_WEIGHT ?? 0.3),
};
