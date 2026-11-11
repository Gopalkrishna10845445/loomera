import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5434/loomera";

// Reuse pool across Next.js hot reloads in development
declare global {
  var __dbPool: Pool | undefined;
}

let pool: Pool;

if (process.env.NODE_ENV === "production") {
  pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
} else {
  if (!globalThis.__dbPool) {
    globalThis.__dbPool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  pool = globalThis.__dbPool;
}

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });
export { pool, schema };
