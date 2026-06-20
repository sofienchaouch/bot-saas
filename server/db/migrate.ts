import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb, isDbAvailable } from "./index";
import path from "path";

export async function runMigrations(): Promise<void> {
  if (!isDbAvailable()) {
    console.log("[DB] DATABASE_URL not set — skipping migrations (in-memory mode).");
    return;
  }
  try {
    const db = getDb();
    await migrate(db, {
      migrationsFolder: path.join(process.cwd(), "drizzle"),
    });
    console.log("[DB] Migrations applied successfully.");
  } catch (err) {
    console.error("[DB] Migration failed:", err);
    throw err;
  }
}
