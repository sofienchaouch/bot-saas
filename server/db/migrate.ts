import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb, isDbAvailable } from "./index";
import path from "path";
import { logger } from "../lib/logger";

export async function runMigrations(): Promise<void> {
  if (!isDbAvailable()) {
    logger.info("[DB] DATABASE_URL not set — skipping migrations (in-memory mode).");
    return;
  }
  try {
    const db = getDb();
    await migrate(db, {
      migrationsFolder: path.join(process.cwd(), "drizzle"),
    });
    logger.info("[DB] Migrations applied successfully.");
  } catch (err) {
    logger.error({ err }, "[DB] Migration failed");
    throw err;
  }
}
