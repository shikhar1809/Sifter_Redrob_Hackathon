import pg from "pg";
import { config } from "./config.js";
import type { PipelineResult, RoleProfile } from "@seederpro/core";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool | null {
  if (!config.databaseUrl) return null;
  pool ??= new Pool({ connectionString: config.databaseUrl, max: 10 });
  return pool;
}

export async function checkDatabase(): Promise<"disabled" | "ok" | "error"> {
  const db = getPool();
  if (!db) return "disabled";
  try {
    await db.query("select 1");
    return "ok";
  } catch {
    return "error";
  }
}

export async function savePipelineRun(input: {
  roleDescription: string;
  roleProfile: RoleProfile;
  result: PipelineResult;
  actor?: string;
}): Promise<string | null> {
  const db = getPool();
  if (!db) return null;
  const response = await db.query<{ id: string }>(
    `insert into pipeline_runs (role_description, role_profile, result, created_by)
     values ($1, $2, $3, $4)
     returning id`,
    [input.roleDescription, input.roleProfile, input.result, input.actor ?? null],
  );
  return response.rows[0]?.id ?? null;
}
