import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

export const clients = sqliteTable("clients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  contact: text("contact").default(""),
  email: text("email").default(""),
  phone: text("phone").default(""),
  address: text("address").default(""),
  notes: text("notes").default(""),
  rate: real("rate").default(0),
  status: text("status").default("active"),
  additionalContacts: text("additional_contacts").default("[]"),
  createdAt: text("created_at").default(""),
  updatedAt: text("updated_at").default(""),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  clientId: text("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description").default(""),
  status: text("status").default("active"),
  startDate: text("start_date").default(""),
  endDate: text("end_date"),
  rate: real("rate").default(0),
  rateType: text("rate_type").default("monthly"),
  createdAt: text("created_at").default(""),
  updatedAt: text("updated_at").default(""),
});

export const invoices = sqliteTable("invoices", {
  id: text("id").primaryKey(),
  number: text("number").unique().notNull(),
  clientId: text("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
  status: text("status").default("draft"),
  issueDate: text("issue_date").default(""),
  dueDate: text("due_date").default(""),
  paidDate: text("paid_date"),
  notes: text("notes").default(""),
  clientNotes: text("client_notes").default(""),
  subtotal: real("subtotal").default(0),
  tax: real("tax").default(0),
  total: real("total").default(0),
  viewToken: text("view_token").unique(),
  viewedDate: text("viewed_date"),
  sentDate: text("sent_date"),
  recipients: text("recipients").default("[]"), // JSON array
  createdAt: text("created_at").default(""),
  updatedAt: text("updated_at").default(""),
});

export const lineItems = sqliteTable("line_items", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id").references(() => invoices.id, { onDelete: "cascade" }).notNull(),
  description: text("description").default(""),
  quantity: real("quantity").default(1),
  rate: real("rate").default(0),
  amount: real("amount").default(0),
  sortOrder: integer("sort_order").default(0),
});

export const prospects = sqliteTable("prospects", {
  id: text("id").primaryKey(),
  company: text("company").default(""),
  contact: text("contact").default(""),
  email: text("email").default(""),
  opportunity: text("opportunity").default(""),
  status: text("status").default("lead"),
  dealSize: text("deal_size").default(""),
  source: text("source").default(""),
  temperature: text("temperature").default("warm"),
  lastContact: text("last_contact").default(""),
  nextAction: text("next_action").default(""),
  notes: text("notes").default(""),
  convertedClientId: text("converted_client_id"),
  createdAt: text("created_at").default(""),
  updatedAt: text("updated_at").default(""),
});

export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey(),
  date: text("date").default(""),
  vendor: text("vendor").default(""),
  description: text("description").default(""),
  category: text("category").default("other"),
  amount: real("amount").default(0),
  clientId: text("client_id").references(() => clients.id, { onDelete: "set null" }),
  projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
  notes: text("notes").default(""),
  taxDeductible: integer("tax_deductible").default(1),
  receiptUrl: text("receipt_url"),
  recurring: integer("recurring").default(0),
  recurringDay: integer("recurring_day"),
  recurringSourceId: text("recurring_source_id"),
  createdAt: text("created_at").default(""),
  updatedAt: text("updated_at").default(""),
});

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(), // always "default"
  // Profile
  ownerName: text("owner_name").default("Kevin Korpi"),
  // Business Info
  companyName: text("company_name").default("Hold Fast Studio"),
  location: text("location").default("Bend, Oregon"),
  businessEmail: text("business_email").default("kevin@holdfaststudio.com"),
  logoUrl: text("logo_url").default(""),
  ein: text("ein").default(""),
  // Payment Details
  paymentMethodLabel: text("payment_method_label").default("Wire Transfer / ACH"),
  bankName: text("bank_name").default("Chase"),
  accountNumber: text("account_number").default("686033815"),
  routingNumber: text("routing_number").default("325070760"),
  lateFeeRate: real("late_fee_rate").default(1.5),
  // Invoice Defaults
  paymentTermsDays: integer("payment_terms_days").default(15),
  invoicePrefix: text("invoice_prefix").default("HFS"),
  defaultTaxRate: real("default_tax_rate").default(0),
  currency: text("currency").default("USD"),
  invoiceEmailSubject: text("invoice_email_subject").default("Invoice {number} from {company}"),
  reminderEmailSubject: text("reminder_email_subject").default("Reminder: Invoice {number} is overdue"),
  emailSignature: text("email_signature").default("Thanks,\nKevin"),
  // Expense Defaults
  defaultTaxDeductible: integer("default_tax_deductible").default(1),
  updatedAt: text("updated_at").default(""),
});
