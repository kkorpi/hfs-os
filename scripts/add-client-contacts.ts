/**
 * One-time migration: add additional_contacts column to clients
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
  await c.execute(
    `ALTER TABLE clients ADD COLUMN additional_contacts TEXT DEFAULT '[]'`
  );
  console.log("✓ Added additional_contacts column to clients");
  console.log("\nDone!");
}

main().catch(console.error);
