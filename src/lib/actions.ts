"use server";

import { db } from "@/lib/db";
import { clients, projects, invoices, lineItems, expenses, prospects, settings } from "@/lib/db/schema";
import { SETTINGS_DEFAULTS } from "@/lib/settings-defaults";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

async function requireAuth() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  return session;
}

// ============================================================
// LOAD ALL DATA
// ============================================================

export async function getAllData() {
  await requireAuth();
  const [allClients, allProjects, allInvoices, allLineItems, allExpenses, allProspects] =
    await Promise.all([
      db.select().from(clients),
      db.select().from(projects),
      db.select().from(invoices),
      db.select().from(lineItems),
      db.select().from(expenses),
      db.select().from(prospects),
    ]);

  return {
    clients: allClients.map((c) => ({
      ...c,
      additionalContacts: c.additionalContacts ? JSON.parse(c.additionalContacts) : [],
    })),
    projects: allProjects,
    invoices: allInvoices.map((inv) => ({
      ...inv,
      recipients: inv.recipients ? JSON.parse(inv.recipients) : [],
    })),
    lineItems: allLineItems,
    expenses: allExpenses,
    prospects: allProspects,
  };
}

// ============================================================
// CLIENTS
// ============================================================

export async function createClient(data: Record<string, unknown>) {
  await requireAuth();
  const id = (data.id as string) || generateId();
  const now = todayStr();
  const row = {
    id,
    name: (data.name as string) || "",
    contact: (data.contact as string) || "",
    email: (data.email as string) || "",
    phone: (data.phone as string) || "",
    address: (data.address as string) || "",
    notes: (data.notes as string) || "",
    rate: parseFloat(data.rate as string) || 0,
    status: (data.status as string) || "active",
    additionalContacts: JSON.stringify(data.additionalContacts || []),
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(clients).values(row);
  return { ...row, additionalContacts: data.additionalContacts || [] };
}

export async function updateClient(id: string, data: Record<string, unknown>) {
  await requireAuth();
  const updates = {
    name: (data.name as string) || "",
    contact: (data.contact as string) || "",
    email: (data.email as string) || "",
    phone: (data.phone as string) || "",
    address: (data.address as string) || "",
    notes: (data.notes as string) || "",
    rate: parseFloat(data.rate as string) || 0,
    status: (data.status as string) || "active",
    additionalContacts: JSON.stringify(data.additionalContacts || []),
    updatedAt: todayStr(),
  };
  await db.update(clients).set(updates).where(eq(clients.id, id));
  return { id, ...updates, additionalContacts: data.additionalContacts || [] };
}

export async function deleteClient(id: string) {
  await requireAuth();
  // Cascade handled by DB foreign keys, but also clean up explicitly
  const clientInvoices = await db.select({ id: invoices.id }).from(invoices).where(eq(invoices.clientId, id));
  for (const inv of clientInvoices) {
    await db.delete(lineItems).where(eq(lineItems.invoiceId, inv.id));
  }
  await db.delete(invoices).where(eq(invoices.clientId, id));
  await db.delete(expenses).where(eq(expenses.clientId, id));
  await db.delete(projects).where(eq(projects.clientId, id));
  await db.delete(clients).where(eq(clients.id, id));
}

// ============================================================
// PROJECTS
// ============================================================

export async function createProject(data: Record<string, unknown>) {
  await requireAuth();
  const id = (data.id as string) || generateId();
  const now = todayStr();
  const row = {
    id,
    clientId: (data.clientId as string) || "",
    name: (data.name as string) || "",
    description: (data.description as string) || "",
    status: (data.status as string) || "active",
    startDate: (data.startDate as string) || "",
    endDate: (data.endDate as string) || null,
    rate: parseFloat(data.rate as string) || 0,
    rateType: (data.rateType as string) || "monthly",
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(projects).values(row);
  return row;
}

export async function updateProject(id: string, data: Record<string, unknown>) {
  await requireAuth();
  const updates = {
    clientId: (data.clientId as string) || "",
    name: (data.name as string) || "",
    description: (data.description as string) || "",
    status: (data.status as string) || "active",
    startDate: (data.startDate as string) || "",
    endDate: (data.endDate as string) || null,
    rate: parseFloat(data.rate as string) || 0,
    rateType: (data.rateType as string) || "monthly",
    updatedAt: todayStr(),
  };
  await db.update(projects).set(updates).where(eq(projects.id, id));
  return { id, ...updates };
}

export async function deleteProject(id: string) {
  await requireAuth();
  await db.delete(projects).where(eq(projects.id, id));
}

// ============================================================
// INVOICES
// ============================================================

export async function createInvoice(
  data: Record<string, unknown>,
  items: Array<Record<string, unknown>>
) {
  await requireAuth();
  const id = (data.id as string) || generateId();
  const viewToken = (data.viewToken as string) || crypto.randomUUID().replace(/-/g, "");
  const now = todayStr();

  const row = {
    id,
    number: (data.number as string) || "",
    clientId: (data.clientId as string) || "",
    projectId: (data.projectId as string) || null,
    status: (data.status as string) || "draft",
    issueDate: (data.issueDate as string) || "",
    dueDate: (data.dueDate as string) || "",
    paidDate: (data.paidDate as string) || null,
    notes: (data.notes as string) || "",
    clientNotes: (data.clientNotes as string) || "",
    subtotal: (data.subtotal as number) || 0,
    tax: (data.tax as number) || 0,
    total: (data.total as number) || 0,
    viewToken,
    viewedDate: (data.viewedDate as string) || null,
    sentDate: (data.sentDate as string) || null,
    recipients: JSON.stringify(data.recipients || []),
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(invoices).values(row);

  if (items.length > 0) {
    const itemRows = items.map((item, idx) => ({
      id: (item.id as string) || generateId(),
      invoiceId: id,
      description: (item.description as string) || "",
      quantity: (item.quantity as number) || 1,
      rate: (item.rate as number) || 0,
      amount: (item.amount as number) || 0,
      sortOrder: idx,
    }));
    await db.insert(lineItems).values(itemRows);
  }

  return { ...row, recipients: data.recipients || [], id, viewToken };
}

export async function updateInvoice(
  id: string,
  data: Record<string, unknown>,
  items: Array<Record<string, unknown>>
) {
  await requireAuth();
  const updates = {
    number: (data.number as string) || "",
    clientId: (data.clientId as string) || "",
    projectId: (data.projectId as string) || null,
    status: (data.status as string) || "draft",
    issueDate: (data.issueDate as string) || "",
    dueDate: (data.dueDate as string) || "",
    paidDate: (data.paidDate as string) || null,
    notes: (data.notes as string) || "",
    clientNotes: (data.clientNotes as string) || "",
    subtotal: (data.subtotal as number) || 0,
    tax: (data.tax as number) || 0,
    total: (data.total as number) || 0,
    viewedDate: (data.viewedDate as string) || null,
    sentDate: (data.sentDate as string) || null,
    recipients: JSON.stringify(data.recipients || []),
    updatedAt: todayStr(),
  };
  await db.update(invoices).set(updates).where(eq(invoices.id, id));

  // Replace line items
  await db.delete(lineItems).where(eq(lineItems.invoiceId, id));
  if (items.length > 0) {
    const itemRows = items.map((item, idx) => ({
      id: (item.id as string) || generateId(),
      invoiceId: id,
      description: (item.description as string) || "",
      quantity: (item.quantity as number) || 1,
      rate: (item.rate as number) || 0,
      amount: (item.amount as number) || 0,
      sortOrder: idx,
    }));
    await db.insert(lineItems).values(itemRows);
  }

  return { id, ...updates, recipients: data.recipients || [] };
}

export async function deleteInvoice(id: string) {
  await requireAuth();
  await db.delete(lineItems).where(eq(lineItems.invoiceId, id));
  await db.delete(invoices).where(eq(invoices.id, id));
}

export async function markInvoicePaid(id: string, paidDate: string | null) {
  await requireAuth();
  if (paidDate === null) {
    // Unmark — revert status
    const inv = await db.select().from(invoices).where(eq(invoices.id, id)).get();
    if (!inv) return null;
    const today = todayStr();
    const revertStatus = inv.sentDate ? ((inv.dueDate ?? "") < today ? "overdue" : "outstanding") : "draft";
    await db.update(invoices).set({ status: revertStatus, paidDate: null, updatedAt: todayStr() }).where(eq(invoices.id, id));
    return { ...inv, status: revertStatus, paidDate: null, recipients: inv.recipients ? JSON.parse(inv.recipients) : [] };
  } else {
    const date = paidDate || todayStr();
    await db.update(invoices).set({ status: "paid", paidDate: date, updatedAt: todayStr() }).where(eq(invoices.id, id));
    return { status: "paid", paidDate: date };
  }
}

export async function markInvoiceSent(id: string) {
  await requireAuth();
  await db.update(invoices).set({ status: "outstanding", sentDate: todayStr(), updatedAt: todayStr() }).where(eq(invoices.id, id));
}

export async function updateInvoiceStatus(id: string, status: string) {
  await requireAuth();
  await db.update(invoices).set({ status, updatedAt: todayStr() }).where(eq(invoices.id, id));
}

// ============================================================
// EXPENSES
// ============================================================

export async function createExpense(data: Record<string, unknown>) {
  await requireAuth();
  const id = (data.id as string) || generateId();
  const now = todayStr();
  const row = {
    id,
    date: (data.date as string) || "",
    vendor: (data.vendor as string) || "",
    description: (data.description as string) || "",
    category: (data.category as string) || "other",
    amount: parseFloat(data.amount as string) || 0,
    clientId: (data.clientId as string) || null,
    projectId: (data.projectId as string) || null,
    notes: (data.notes as string) || "",
    taxDeductible: data.taxDeductible !== undefined ? (data.taxDeductible as number) : 1,
    receiptUrl: (data.receiptUrl as string) || null,
    recurring: (data.recurring as number) || 0,
    recurringDay: (data.recurringDay as number) || null,
    recurringSourceId: (data.recurringSourceId as string) || null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(expenses).values(row);
  return row;
}

export async function updateExpense(id: string, data: Record<string, unknown>) {
  await requireAuth();
  const updates = {
    date: (data.date as string) || "",
    vendor: (data.vendor as string) || "",
    description: (data.description as string) || "",
    category: (data.category as string) || "other",
    amount: parseFloat(data.amount as string) || 0,
    clientId: (data.clientId as string) || null,
    projectId: (data.projectId as string) || null,
    notes: (data.notes as string) || "",
    taxDeductible: data.taxDeductible !== undefined ? (data.taxDeductible as number) : 1,
    recurring: (data.recurring as number) || 0,
    recurringDay: (data.recurringDay as number) || null,
    recurringSourceId: (data.recurringSourceId as string) || null,
    updatedAt: todayStr(),
  };
  await db.update(expenses).set(updates).where(eq(expenses.id, id));
  return { id, ...updates };
}

export async function deleteExpense(id: string) {
  await requireAuth();
  await db.delete(expenses).where(eq(expenses.id, id));
}

export async function processRecurringExpenses() {
  await requireAuth();
  const allExpenses = await db.select().from(expenses);
  const templates = allExpenses.filter((e) => e.recurring === 1);
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const created: typeof allExpenses = [];

  for (const template of templates) {
    // Check if a generated expense already exists for this month
    const existsThisMonth = allExpenses.some(
      (e) => e.recurringSourceId === template.id && e.date?.startsWith(currentYearMonth)
    );
    if (existsThisMonth) continue;

    const day = template.recurringDay || 1;
    const dateStr = `${currentYearMonth}-${String(day).padStart(2, "0")}`;
    const id = generateId();
    const todayDate = todayStr();
    const row = {
      id,
      date: dateStr,
      vendor: template.vendor || "",
      description: template.description || "",
      category: template.category || "other",
      amount: template.amount || 0,
      clientId: template.clientId || null,
      projectId: template.projectId || null,
      notes: template.notes || "",
      taxDeductible: template.taxDeductible ?? 1,
      receiptUrl: null,
      recurring: 0,
      recurringDay: null,
      recurringSourceId: template.id,
      createdAt: todayDate,
      updatedAt: todayDate,
    };
    await db.insert(expenses).values(row);
    created.push(row);
  }

  return created;
}

// ============================================================
// PUBLIC (no auth required)
// ============================================================

export async function getInvoiceByToken(token: string) {
  const invoice = await db.select().from(invoices).where(eq(invoices.viewToken, token)).get();
  if (!invoice) return null;

  const client = await db.select().from(clients).where(eq(clients.id, invoice.clientId)).get();
  const items = await db.select().from(lineItems).where(eq(lineItems.invoiceId, invoice.id));

  return {
    invoice: { ...invoice, recipients: invoice.recipients ? JSON.parse(invoice.recipients) : [] },
    client: client ? { ...client, additionalContacts: client.additionalContacts ? JSON.parse(client.additionalContacts) : [] } : client,
    lineItems: items,
  };
}

// ============================================================
// PROSPECTS
// ============================================================

export async function createProspect(data: Record<string, unknown>) {
  await requireAuth();
  const id = (data.id as string) || generateId();
  const now = todayStr();
  const row = {
    id,
    company: (data.company as string) || "",
    contact: (data.contact as string) || "",
    email: (data.email as string) || "",
    opportunity: (data.opportunity as string) || "",
    status: (data.status as string) || "lead",
    dealSize: (data.dealSize as string) || "",
    source: (data.source as string) || "",
    temperature: (data.temperature as string) || "warm",
    lastContact: (data.lastContact as string) || "",
    nextAction: (data.nextAction as string) || "",
    notes: (data.notes as string) || "",
    convertedClientId: (data.convertedClientId as string) || null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(prospects).values(row);
  return row;
}

export async function updateProspect(id: string, data: Record<string, unknown>) {
  await requireAuth();
  const updates = {
    company: (data.company as string) || "",
    contact: (data.contact as string) || "",
    email: (data.email as string) || "",
    opportunity: (data.opportunity as string) || "",
    status: (data.status as string) || "lead",
    dealSize: (data.dealSize as string) || "",
    source: (data.source as string) || "",
    temperature: (data.temperature as string) || "warm",
    lastContact: (data.lastContact as string) || "",
    nextAction: (data.nextAction as string) || "",
    notes: (data.notes as string) || "",
    convertedClientId: (data.convertedClientId as string) || null,
    updatedAt: todayStr(),
  };
  await db.update(prospects).set(updates).where(eq(prospects.id, id));
  return { id, ...updates };
}

export async function deleteProspect(id: string) {
  await requireAuth();
  await db.delete(prospects).where(eq(prospects.id, id));
}

export async function recordInvoiceView(token: string) {
  const invoice = await db.select().from(invoices).where(eq(invoices.viewToken, token)).get();
  if (invoice && !invoice.viewedDate) {
    await db.update(invoices).set({ viewedDate: new Date().toISOString() }).where(eq(invoices.id, invoice.id));
  }
}

// ============================================================
// SETTINGS
// ============================================================

export async function getSettings() {
  await requireAuth();
  const row = await db.select().from(settings).where(eq(settings.id, "default")).get();
  if (!row) return { ...SETTINGS_DEFAULTS };
  return row;
}

export async function updateSettings(data: Record<string, unknown>) {
  await requireAuth();
  const existing = await db.select().from(settings).where(eq(settings.id, "default")).get();
  const now = todayStr();
  const clean = { ...data };
  delete clean.id;

  if (existing) {
    await db.update(settings).set({ ...clean, updatedAt: now }).where(eq(settings.id, "default"));
  } else {
    await db.insert(settings).values({ ...SETTINGS_DEFAULTS, ...clean, id: "default", updatedAt: now });
  }

  return await db.select().from(settings).where(eq(settings.id, "default")).get() ?? { ...SETTINGS_DEFAULTS };
}

export async function getSettingsPublic() {
  const row = await db.select().from(settings).where(eq(settings.id, "default")).get();
  if (!row) return { ...SETTINGS_DEFAULTS, ein: undefined };
  const { ein, ...publicSettings } = row;
  return publicSettings;
}

// ============================================================
// EMAIL
// ============================================================

function getFromAddress(companyName: string, businessEmail: string) {
  // Use RESEND_FROM_EMAIL if set (e.g. "kevin@holdfast.studio"), otherwise fall back
  // to Resend's test sender for local development
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  return `${companyName} <${fromEmail}>`;
}

export async function sendInvoiceEmail(
  invoiceId: string,
  recipients: string[],
  subject: string,
  bodyText: string
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();

  const invoice = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).get();
  if (!invoice) return { success: false, error: "Invoice not found" };

  const client = invoice.clientId
    ? await db.select().from(clients).where(eq(clients.id, invoice.clientId)).get()
    : null;

  const s = await db.select().from(settings).where(eq(settings.id, "default")).get() ?? { ...SETTINGS_DEFAULTS };

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://os.holdfast.studio";
  const invoiceUrl = `${baseUrl}/invoice/${invoice.viewToken}`;

  const { sendEmail, buildInvoiceEmailHtml } = await import("@/lib/email");

  const html = buildInvoiceEmailHtml({
    logoUrl: `${baseUrl}/logo.svg`,
    companyName: s.companyName ?? SETTINGS_DEFAULTS.companyName,
    location: s.location ?? SETTINGS_DEFAULTS.location,
    bodyText,
    invoiceNumber: invoice.number ?? "",
    total: invoice.total ?? 0,
    dueDate: invoice.dueDate ?? "",
    invoiceUrl,
    signature: s.emailSignature ?? SETTINGS_DEFAULTS.emailSignature,
  });

  try {
    await sendEmail({
      from: getFromAddress(s.companyName ?? SETTINGS_DEFAULTS.companyName, s.businessEmail ?? SETTINGS_DEFAULTS.businessEmail),
      to: recipients,
      subject,
      html,
    });
  } catch (err) {
    console.error("Email send failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to send email" };
  }

  // Only update DB on successful send
  const now = todayStr();
  await db.update(invoices).set({
    status: "outstanding",
    sentDate: now,
    recipients: JSON.stringify(recipients),
    updatedAt: now,
  }).where(eq(invoices.id, invoiceId));

  return { success: true };
}

export async function sendReminderEmail(
  invoiceId: string,
  recipients: string[],
  subject: string,
  bodyText: string
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();

  const invoice = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).get();
  if (!invoice) return { success: false, error: "Invoice not found" };

  const s = await db.select().from(settings).where(eq(settings.id, "default")).get() ?? { ...SETTINGS_DEFAULTS };

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://os.holdfast.studio";
  const invoiceUrl = `${baseUrl}/invoice/${invoice.viewToken}`;

  const dueDate = invoice.dueDate ?? "";
  const today = todayStr();
  const daysOverdue = dueDate ? Math.abs(Math.round((new Date(today + "T00:00:00").getTime() - new Date(dueDate + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24))) : 0;

  const { sendEmail, buildInvoiceEmailHtml } = await import("@/lib/email");

  const html = buildInvoiceEmailHtml({
    logoUrl: `${baseUrl}/logo.svg`,
    companyName: s.companyName ?? SETTINGS_DEFAULTS.companyName,
    location: s.location ?? SETTINGS_DEFAULTS.location,
    bodyText,
    invoiceNumber: invoice.number ?? "",
    total: invoice.total ?? 0,
    dueDate,
    invoiceUrl,
    signature: s.emailSignature ?? SETTINGS_DEFAULTS.emailSignature,
    isReminder: true,
    daysOverdue,
  });

  try {
    await sendEmail({
      from: getFromAddress(s.companyName ?? SETTINGS_DEFAULTS.companyName, s.businessEmail ?? SETTINGS_DEFAULTS.businessEmail),
      to: recipients,
      subject,
      html,
    });
  } catch (err) {
    console.error("Reminder send failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to send reminder" };
  }

  return { success: true };
}
