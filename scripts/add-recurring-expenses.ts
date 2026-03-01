/**
 * One-time migration: add recurring expense columns
 */

import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  process.env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
}

const c = createClient({
  url: process.env.TURSO_DATABASE_URL as string,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  // Each ALTER TABLE must be a separate statement for SQLite
  await c.execute("ALTER TABLE expenses ADD COLUMN recurring INTEGER DEFAULT 0");
  console.log("  ✓ Added recurring column");
  await c.execute("ALTER TABLE expenses ADD COLUMN recurring_day INTEGER");
  console.log("  ✓ Added recurring_day column");
  await c.execute("ALTER TABLE expenses ADD COLUMN recurring_source_id TEXT");
  console.log("  ✓ Added recurring_source_id column");
  console.log("\nDone!");
}

main().catch(console.error);
