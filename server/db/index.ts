import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { DATABASE_URL } from "../config";

export function isDbAvailable(): boolean {
  return !!DATABASE_URL;
}

let _pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!_pool) {
    _pool = new pg.Pool({ connectionString: DATABASE_URL! });
  }
  return _pool;
}

export { schema };

// Lazily create the drizzle client — only callable when DATABASE_URL is set.
// For in-memory fallback mode (tests without DB), don't call this.
export function getDb() {
  return drizzle(getPool(), { schema });
}

export type Db = ReturnType<typeof getDb>;

// Convenience: close the pool (useful in test teardown)
export async function closeDb(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}
