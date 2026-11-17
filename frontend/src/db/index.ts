import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5434/loomera";

const isProduction = process.env.NODE_ENV === "production";
const isCloudDb =
  connectionString.includes("supabase.co") ||
  connectionString.includes("pooler.supabase.com") ||
  connectionString.includes("sslmode=require") ||
  process.env.DATABASE_SSL === "true";

// Reuse pool across warm serverless functions and Next.js hot reloads
declare global {
  var __dbPool: Pool | undefined;
}

if (!globalThis.__dbPool) {
  globalThis.__dbPool = new Pool({
    connectionString,
    max: isProduction ? 3 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ...(isCloudDb ? { ssl: { rejectUnauthorized: false } } : {}),
  });
}

const pool: Pool = globalThis.__dbPool;

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });
export { pool, schema };
