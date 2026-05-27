import "dotenv/config";

export const config = {
  host: process.env.API_HOST ?? "127.0.0.1",
  port: Number(process.env.API_PORT ?? 4000),
  webOrigin: process.env.WEB_ORIGIN ?? "http://127.0.0.1:3000",
  databaseUrl: process.env.DATABASE_URL,
  authRequired: process.env.AUTH_REQUIRED === "true",
  keycloakJwksUrl: process.env.KEYCLOAK_JWKS_URL,
  keycloakIssuer: process.env.KEYCLOAK_ISSUER,
};
