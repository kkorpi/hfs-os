/**
 * One-time script to split single Bonsai projects into correct project breakdowns.
 *
 * Superpilot: 1 project → "Website Design" (completed) + "Product Design Retainer" (active)
 * Simular:    1 project → "UX Audit" (completed) + "Product Design Retainer" (active)
 */

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { readFileSync } from "fs";
import { resolve } from "path";
import { eq, and } from "drizzle-orm";
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

function genId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function main() {
  const now = new Date().toISOString().split("T")[0];

  // ─── SUPERPILOT ───
  const superpilot = await db.select().from(schema.clients).where(eq(schema.clients.name, "Superpilot")).get();
  if (!superpilot) {
    console.log("✗ Superpilot client not found");
  } else {
    console.log(`\nSuperpilot (${superpilot.id}):`);

    // Find existing project(s)
    const spProjects = await db.select().from(schema.projects).where(eq(schema.projects.clientId, superpilot.id));
    console.log(`  Current projects: ${spProjects.map((p) => `"${p.name}" (${p.id})`).join(", ") || "none"}`);

    // Get all invoices for Superpilot
    const spInvoices = await db.select().from(schema.invoices).where(eq(schema.invoices.clientId, superpilot.id));
    console.log(`  Invoices: ${spInvoices.map((i) => `${i.number} $${i.total}`).join(", ")}`);

    // Rename existing project → Website Design (completed)
    const existingProj = spProjects[0];
    if (existingProj) {
      await db.update(schema.projects).set({
        name: "Website Design",
        description: "Website design project",
        status: "completed",
        rate: 0,
        updatedAt: now,
      }).where(eq(schema.projects.id, existingProj.id));
      console.log(`  ✓ Renamed "${existingProj.name}" → "Website Design" (completed)`);
    }

    // Create Product Design Retainer project
    const spRetainerId = genId();
    await db.insert(schema.projects).values({
      id: spRetainerId,
      clientId: superpilot.id,
      name: "Product Design Retainer",
      description: "Ongoing product design retainer",
      status: "active",
      startDate: "2026-01-27",
      rate: 5000,
      rateType: "monthly",
      createdAt: now,
      updatedAt: now,
    });
    console.log(`  ✓ Created "Product Design Retainer" (active, $5k/mo)`);

    // Reassign invoices:
    // Website Design: $15k (Oct), $3k (Nov), $15k (Jan 5) = first 3 invoices by date
    // Product Design Retainer: $5k (Jan 27) = the $5k invoice
    const websiteProjectId = existingProj?.id;
    for (const inv of spInvoices) {
      if (inv.total === 5000) {
        // $5k → Product Design Retainer
        await db.update(schema.invoices).set({ projectId: spRetainerId }).where(eq(schema.invoices.id, inv.id));
        console.log(`  ✓ ${inv.number} ($${inv.total}) → Product Design Retainer`);
      } else if (websiteProjectId) {
        // Everything else → Website Design
        await db.update(schema.invoices).set({ projectId: websiteProjectId }).where(eq(schema.invoices.id, inv.id));
        console.log(`  ✓ ${inv.number} ($${inv.total}) → Website Design`);
      }
    }
  }

  // ─── SIMULAR ───
  const simular = await db.select().from(schema.clients).where(eq(schema.clients.name, "Simular")).get();
  if (!simular) {
    console.log("✗ Simular client not found");
  } else {
    console.log(`\nSimular (${simular.id}):`);

    const smProjects = await db.select().from(schema.projects).where(eq(schema.projects.clientId, simular.id));
    console.log(`  Current projects: ${smProjects.map((p) => `"${p.name}" (${p.id})`).join(", ") || "none"}`);

    const smInvoices = await db.select().from(schema.invoices).where(eq(schema.invoices.clientId, simular.id));
    console.log(`  Invoices: ${smInvoices.map((i) => `${i.number} $${i.total}`).join(", ")}`);

    // Rename existing project → UX Audit (completed)
    const existingProj = smProjects[0];
    if (existingProj) {
      await db.update(schema.projects).set({
        name: "UX Audit",
        description: "UX audit engagement",
        status: "completed",
        rate: 12000,
        rateType: "fixed",
        updatedAt: now,
      }).where(eq(schema.projects.id, existingProj.id));
      console.log(`  ✓ Renamed "${existingProj.name}" → "UX Audit" (completed)`);
    }

    // Create Product Design Retainer project
    const smRetainerId = genId();
    await db.insert(schema.projects).values({
      id: smRetainerId,
      clientId: simular.id,
      name: "Product Design Retainer",
      description: "Ongoing product design retainer",
      status: "active",
      startDate: "2026-01-13",
      rate: 22000,
      rateType: "monthly",
      createdAt: now,
      updatedAt: now,
    });
    console.log(`  ✓ Created "Product Design Retainer" (active, $22k/mo)`);

    // Reassign invoices:
    // UX Audit: two $6k invoices (Dec)
    // Product Design Retainer: $22k+ invoices (Jan onward)
    const auditProjectId = existingProj?.id;
    for (const inv of smInvoices) {
      if ((inv.total ?? 0) <= 6000) {
        // $6k invoices → UX Audit
        if (auditProjectId) {
          await db.update(schema.invoices).set({ projectId: auditProjectId }).where(eq(schema.invoices.id, inv.id));
          console.log(`  ✓ ${inv.number} ($${inv.total}) → UX Audit`);
        }
      } else {
        // $22k+ invoices → Product Design Retainer
        await db.update(schema.invoices).set({ projectId: smRetainerId }).where(eq(schema.invoices.id, inv.id));
        console.log(`  ✓ ${inv.number} ($${inv.total}) → Product Design Retainer`);
      }
    }
  }

  // ─── Summary ───
  console.log("\n--- Final State ---");
  for (const clientName of ["Superpilot", "Simular"]) {
    const c = await db.select().from(schema.clients).where(eq(schema.clients.name, clientName)).get();
    if (!c) continue;
    const projs = await db.select().from(schema.projects).where(eq(schema.projects.clientId, c.id));
    console.log(`\n${clientName}:`);
    for (const p of projs) {
      const invs = await db.select().from(schema.invoices).where(eq(schema.invoices.projectId, p.id));
      const total = invs.reduce((s, i) => s + (i.total ?? 0), 0);
      console.log(`  ${p.name} [${p.status}] — ${invs.length} invoices, $${total.toLocaleString()}`);
    }
  }

  console.log("\nDone!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
