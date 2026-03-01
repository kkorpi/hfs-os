/**
 * One-time migration: create prospects table
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
  await c.execute(`
    CREATE TABLE IF NOT EXISTS prospects (
      id TEXT PRIMARY KEY,
      company TEXT DEFAULT '',
      contact TEXT DEFAULT '',
      email TEXT DEFAULT '',
      opportunity TEXT DEFAULT '',
      status TEXT DEFAULT 'lead',
      deal_size TEXT DEFAULT '',
      source TEXT DEFAULT '',
      temperature TEXT DEFAULT 'warm',
      last_contact TEXT DEFAULT '',
      next_action TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      converted_client_id TEXT,
      created_at TEXT DEFAULT '',
      updated_at TEXT DEFAULT ''
    )
  `);
  console.log("✓ Created prospects table");
  console.log("\nDone!");
}

main().catch(console.error);
