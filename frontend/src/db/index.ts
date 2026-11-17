import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, PoolConfig } from "pg";
import * as schema from "./schema";

const isProduction = process.env.NODE_ENV === "production";

// In development and test environments, fall back to local PostgreSQL on port 5434.
// In production, do not silently fall back to localhost.
if (isProduction && !process.env.DATABASE_URL) {
  console.warn(
    "[LOOMERA DB] WARNING: DATABASE_URL is not set in production environment. Configure DATABASE_URL in Vercel Project Settings."
  );
}

const rawConnectionString =
  process.env.DATABASE_URL ||
  (isProduction ? "" : "postgresql://postgres@127.0.0.1:5434/loomera");

const isCloudDb =
  rawConnectionString.includes("supabase.co") ||
  rawConnectionString.includes("pooler.supabase.com") ||
  rawConnectionString.includes("sslmode=require") ||
  rawConnectionString.includes("sslmode=no-verify") ||
  process.env.DATABASE_SSL === "true";

// Reuse pool across warm serverless functions and Next.js hot reloads
declare global {
  var __dbPool: Pool | undefined;
}

if (!globalThis.__dbPool) {
  // Strip query sslmode so pg-connection-string does not overwrite ssl: { rejectUnauthorized: false } with empty ssl: {}
  const sanitizedConnectionString = isCloudDb
    ? rawConnectionString.replace(/([?&])sslmode=[^&]+(&|$)/, "$1").replace(/[?&]$/, "")
    : rawConnectionString;

  const poolConfig: PoolConfig = {
    connectionString: sanitizedConnectionString,
    max: isProduction ? 3 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ...(isCloudDb ? { ssl: { rejectUnauthorized: false } } : {}),
  };

  globalThis.__dbPool = new Pool(poolConfig);
}

const pool: Pool = globalThis.__dbPool;

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });
export { pool, schema };
