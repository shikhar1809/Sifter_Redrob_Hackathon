import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "./config.js";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

export async function registerAuth(app: FastifyInstance): Promise<void> {
  app.decorateRequest("actor", null);

  app.addHook("preHandler", async (request, reply) => {
    if (!config.authRequired) {
      request.actor = "dev";
      return;
    }

    if (request.url === "/health") return;
    const token = readBearer(request.headers.authorization);
    if (!token) return unauthorized(reply);
    if (!config.keycloakJwksUrl || !config.keycloakIssuer) return unauthorized(reply);

    try {
      jwks ??= createRemoteJWKSet(new URL(config.keycloakJwksUrl));
      const verified = await jwtVerify(token, jwks, { issuer: config.keycloakIssuer });
      request.actor = String(verified.payload.sub ?? "unknown");
    } catch {
      return unauthorized(reply);
    }
  });
}

function readBearer(header: string | undefined): string | null {
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function unauthorized(reply: FastifyReply) {
  return reply.status(401).send({ error: "Unauthorized" });
}

declare module "fastify" {
  interface FastifyRequest {
    actor: string | null;
  }
}
