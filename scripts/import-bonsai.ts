/**
 * One-time import script for Bonsai CSV exports → Turso database
 *
 * Usage:
 *   npx tsx scripts/import-bonsai.ts
 *
 * Reads the 4 CSV files from ~/Downloads and inserts into Turso.
 * Order: clients → projects → invoices → expenses
 */

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { readFileSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";
import * as schema from "../src/lib/db/schema";

// --- Load env ---
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx);
  const val = trimmed.slice(eqIdx + 1);
  process.env[key] = val;
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client, { schema });

// --- CSV helpers ---
function parseCSV(filePath: string): Record<string, string>[] {
  const raw = readFileSync(filePath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || "").trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function parseDate(d: string): string {
  if (!d) return "";
  // Handle "2019-02-25 08:00:00 UTC" → "2019-02-25"
  return d.split(" ")[0];
}

// --- File paths ---
const downloads = resolve(homedir(), "Downloads");
const clientsFile = resolve(downloads, "holdfast-studio_companiescontact_export_2026-02-27_7e2d38dd12188b05ef0f33ced948.csv");
const projectsFile = resolve(downloads, "holdfast-studio_project_export_2026-02-27_88b1016bbfeb5a30a58ba7f2b10d.csv");
const invoicesFile = resolve(downloads, "holdfast-studio_invoice_export_2026-02-27_5af0488a1a8abc4f8e7fe8139d86.csv");
const expensesFile = resolve(downloads, "holdfast-studio_expense_export_2026-02-27_bf7588ae0e6b611fd1571c13d780.csv");

async function main() {
  const now = todayStr();

  // ================================================================
  // 1. CLIENTS
  // ================================================================
  console.log("Importing clients...");
  const clientRows = parseCSV(clientsFile);
  const clientMap = new Map<string, string>(); // name → id

  for (const row of clientRows) {
    const name = row["Client"] || "";
    if (!name) continue;
    const id = generateId();
    clientMap.set(name, id);

    await db.insert(schema.clients).values({
      id,
      name,
      contact: row["Contact Name"] || "",
      email: row["Contact Email"] || "",
      phone: row["Phone Number"] || "",
      address: "",
      notes: "",
      rate: 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    // Small delay to ensure unique IDs
    await new Promise((r) => setTimeout(r, 2));
  }
  console.log(`  ✓ ${clientMap.size} clients`);

  // ================================================================
  // 2. PROJECTS
  // ================================================================
  console.log("Importing projects...");
  const projectRows = parseCSV(projectsFile);
  const projectMap = new Map<string, string>(); // project title → id
  let projectCount = 0;

  // Resolve client name → id, creating if needed (inserts into DB)
  async function resolveClient(name: string): Promise<string> {
    // Exact match
    if (clientMap.has(name)) return clientMap.get(name)!;

    // Case-insensitive / partial match
    for (const [k, v] of clientMap) {
      if (k.toLowerCase() === name.toLowerCase()) return v;
      if (k.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(k.toLowerCase())) return v;
    }

    // Not found — insert into DB
    const id = generateId();
    await db.insert(schema.clients).values({
      id, name, contact: "", email: "", phone: "", address: "", notes: "",
      rate: 0, status: "active", createdAt: now, updatedAt: now,
    });
    clientMap.set(name, id);
    console.log(`  → Auto-created client: "${name}"`);
    await new Promise((r) => setTimeout(r, 2));
    return id;
  }

  for (const row of projectRows) {
    const title = row["title"] || "";
    const clientName = row["client_or_company_name"] || "";
    if (!title) continue;

    const clientId = await resolveClient(clientName);
    const id = generateId();
    projectMap.set(title, id);

    // Map Bonsai status
    let status = row["status"] || "active";
    if (status === "completed") status = "completed";
    else if (status === "archived") status = "archived";
    else status = "active";

    await db.insert(schema.projects).values({
      id,
      clientId,
      name: title,
      description: "",
      status,
      startDate: parseDate(row["start_date"]),
      endDate: parseDate(row["finish_date"]) || null,
      rate: 0,
      rateType: "monthly",
      createdAt: now,
      updatedAt: now,
    });

    projectCount++;
    await new Promise((r) => setTimeout(r, 2));
  }
  console.log(`  ✓ ${projectCount} projects`);

  // ================================================================
  // 3. INVOICES
  // ================================================================
  console.log("Importing invoices...");
  const invoiceRows = parseCSV(invoicesFile);
  let invoiceCount = 0;

  for (const row of invoiceRows) {
    const clientName = row["client_or_company_name"] || "";
    const projectName = row["contractor_project_name"] || "";
    const invoiceNumber = row["invoice_number"] || "";

    if (!invoiceNumber) continue;

    const clientId = await resolveClient(clientName);

    // Find project by name
    let projectId: string | null = null;
    if (projectName) {
      if (projectMap.has(projectName)) {
        projectId = projectMap.get(projectName)!;
      } else {
        // Fuzzy match
        for (const [k, v] of projectMap) {
          if (k.toLowerCase() === projectName.toLowerCase()) {
            projectId = v;
            break;
          }
        }
      }
    }

    // Map status
    let status = row["status"] || "draft";
    if (status === "paid") status = "paid";
    else if (status === "outstanding" || status === "sent") status = "outstanding";
    else if (status === "overdue") status = "overdue";
    else if (status === "drafted") status = "draft";
    else status = "draft";

    const total = parseFloat(row["total_amount"]) || 0;
    const tax = parseFloat(row["calculated_tax_amount"]) || 0;
    const subtotal = total - tax;

    const viewToken = generateId().replace(/-/g, "").substring(0, 12);
    const clientEmail = row["client_email"] || "";

    const id = generateId();

    await db.insert(schema.invoices).values({
      id,
      number: invoiceNumber,
      clientId,
      projectId,
      status,
      issueDate: parseDate(row["issued_date"]),
      dueDate: parseDate(row["due_date"]),
      paidDate: parseDate(row["paid_date"]) || null,
      notes: "",
      clientNotes: "",
      subtotal,
      tax,
      total,
      viewToken,
      viewedDate: null,
      sentDate: status !== "draft" ? parseDate(row["issued_date"]) : null,
      recipients: JSON.stringify(clientEmail ? [clientEmail] : []),
      createdAt: now,
      updatedAt: now,
    });

    // Create a single line item with the total (since Bonsai CSV doesn't export line items)
    await db.insert(schema.lineItems).values({
      id: generateId(),
      invoiceId: id,
      description: projectName || "Services",
      quantity: 1,
      rate: subtotal,
      amount: subtotal,
      sortOrder: 0,
    });

    invoiceCount++;
    await new Promise((r) => setTimeout(r, 2));
  }
  console.log(`  ✓ ${invoiceCount} invoices`);

  // ================================================================
  // 4. EXPENSES
  // ================================================================
  console.log("Importing expenses...");
  const expenseRows = parseCSV(expensesFile);
  let expenseCount = 0;

  // Map Bonsai categories → our categories
  function mapCategory(tags: string): string {
    const t = tags.toLowerCase();
    if (t.includes("software") || t.includes("devices")) return "software";
    if (t.includes("office")) return "office";
    if (t.includes("travel")) return "travel";
    if (t.includes("meals") || t.includes("food")) return "meals";
    if (t.includes("advertising") || t.includes("marketing")) return "marketing";
    if (t.includes("professional")) return "professional";
    if (t.includes("insurance")) return "insurance";
    if (t.includes("education") || t.includes("training")) return "education";
    return "other";
  }

  for (const row of expenseRows) {
    const date = parseDate(row["date"]);
    const name = row["name"] || "";
    const amount = parseFloat(row["amount_after_tax"]) || parseFloat(row["amount_pre_tax"]) || 0;
    const category = mapCategory(row["tags"] || "");
    const notes = row["notes"] || "";
    const projectName = row["project"] || "";
    const clientName = row["client"] || "";

    let clientId: string | null = null;
    let projectId: string | null = null;

    if (clientName) {
      for (const [k, v] of clientMap) {
        if (k.toLowerCase() === clientName.toLowerCase() ||
            k.toLowerCase().includes(clientName.toLowerCase())) {
          clientId = v;
          break;
        }
      }
    }

    if (projectName) {
      for (const [k, v] of projectMap) {
        if (k.toLowerCase() === projectName.toLowerCase()) {
          projectId = v;
          break;
        }
      }
    }

    const id = generateId();
    await db.insert(schema.expenses).values({
      id,
      date,
      vendor: name,
      description: name,
      category,
      amount,
      clientId,
      projectId,
      notes,
      taxDeductible: 1,
      receiptUrl: null,
      createdAt: now,
      updatedAt: now,
    });

    expenseCount++;
    // Batch delay every 50
    if (expenseCount % 50 === 0) {
      await new Promise((r) => setTimeout(r, 5));
    }
  }
  console.log(`  ✓ ${expenseCount} expenses`);

  console.log("\nDone! All data imported.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
