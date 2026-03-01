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
  await c.executeMultiple(
    "DELETE FROM line_items; DELETE FROM expenses; DELETE FROM invoices; DELETE FROM projects; DELETE FROM clients;"
  );
  const r = await c.execute("SELECT count(*) as n FROM clients");
  console.log("Cleared. Clients remaining:", r.rows[0].n);
}

main().catch(console.error);
