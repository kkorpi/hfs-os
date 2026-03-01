/**
 * One-time script to fix client names (person → company)
 */

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { readFileSync } from "fs";
import { resolve } from "path";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

// Load env
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  process.env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL as string,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client, { schema });

const renames: [string, string, string][] = [
  // [old name, new name, contact name]
  ["Troy Bannister", "Onboard AI", "Troy Bannister"],
  ["Ang Li", "Simular", "Ang Li"],
  ["Igor Faletski", "Superpilot", "Igor Faletski"],
  ["Basil Varghese", "AutonomyNext", "Basil Varghese"],
  ["Sib Mahapatra", "Branch", "Sib Mahapatra"],
  ["Grant Goodale", "Girder AI", "Grant Goodale"],
  ["Zach Blank - Straightaway", "Mapbox", "Zach Blank"],
  ["Rapptr Labs - Drew Johnson", "Rapptr Labs", "Drew Johnson"],
  ["CdC Ventures", "CdC Ventures", "Christopher deCharms"],
];

async function main() {
  // Rename clients
  for (const [oldName, newName, contact] of renames) {
    const found = await db.select().from(schema.clients).where(eq(schema.clients.name, oldName)).get();
    if (!found) {
      console.log(`  ✗ Not found: "${oldName}"`);
      continue;
    }
    await db.update(schema.clients).set({ name: newName, contact }).where(eq(schema.clients.id, found.id));
    console.log(`  ✓ "${oldName}" → "${newName}" (contact: ${contact})`);
  }

  // Alex Czarnecki / Cottage → archive as prospect
  const cottage = await db.select().from(schema.clients).where(eq(schema.clients.name, "Alex Czarnecki")).get();
  if (cottage) {
    await db.update(schema.clients).set({ name: "Cottage", status: "archived", contact: "Alex Czarnecki" }).where(eq(schema.clients.id, cottage.id));
    console.log(`  ✓ "Alex Czarnecki" → "Cottage" (archived)`);
  }

  // Also clean up the auto-created duplicates
  // "Onboard AI" was auto-created during import, now "Troy Bannister" is renamed to "Onboard AI"
  // We need to merge: find invoices pointing to the old "Onboard AI" and repoint them
  const allClients = await db.select().from(schema.clients);
  const dupes = new Map<string, typeof allClients>();
  for (const c of allClients) {
    const existing = dupes.get(c.name) || [];
    existing.push(c);
    dupes.set(c.name, existing);
  }

  for (const [name, entries] of dupes) {
    if (entries.length <= 1) continue;
    // Keep the one with more data (email, contact)
    const primary = entries.sort((a, b) => ((b.email || "").length + (b.contact || "").length) - ((a.email || "").length + (a.contact || "").length))[0];
    const others = entries.filter((e) => e.id !== primary.id);

    for (const dup of others) {
      // Repoint invoices
      const invs = await db.select({ id: schema.invoices.id }).from(schema.invoices).where(eq(schema.invoices.clientId, dup.id));
      for (const inv of invs) {
        await db.update(schema.invoices).set({ clientId: primary.id }).where(eq(schema.invoices.id, inv.id));
      }
      // Repoint projects
      const projs = await db.select({ id: schema.projects.id }).from(schema.projects).where(eq(schema.projects.clientId, dup.id));
      for (const proj of projs) {
        await db.update(schema.projects).set({ clientId: primary.id }).where(eq(schema.projects.id, proj.id));
      }
      // Repoint expenses
      const exps = await db.select({ id: schema.expenses.id }).from(schema.expenses).where(eq(schema.expenses.clientId, dup.id));
      for (const exp of exps) {
        await db.update(schema.expenses).set({ clientId: primary.id }).where(eq(schema.expenses.id, exp.id));
      }
      // Delete duplicate
      await db.delete(schema.clients).where(eq(schema.clients.id, dup.id));
      console.log(`  ✓ Merged duplicate "${name}" (${invs.length} invoices, ${projs.length} projects repointed)`);
    }
  }

  // Also clean up "Girdir AI" → merge into "Girder AI"
  const girdir = await db.select().from(schema.clients).where(eq(schema.clients.name, "Girdir AI")).get();
  const girder = await db.select().from(schema.clients).where(eq(schema.clients.name, "Girder AI")).get();
  if (girdir && girder) {
    const invs = await db.select({ id: schema.invoices.id }).from(schema.invoices).where(eq(schema.invoices.clientId, girdir.id));
    for (const inv of invs) {
      await db.update(schema.invoices).set({ clientId: girder.id }).where(eq(schema.invoices.id, inv.id));
    }
    await db.delete(schema.clients).where(eq(schema.clients.id, girdir.id));
    console.log(`  ✓ Merged "Girdir AI" into "Girder AI" (${invs.length} invoices repointed)`);
  }

  console.log("\nDone!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
