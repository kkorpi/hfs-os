// @ts-nocheck
"use client";

import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Search, Send, Plus, X, Eye, Check, Copy, ArrowLeft, ArrowRight, MoreHorizontal, Pencil, Trash2, CopyPlus, Settings, LogOut, Archive, PlayCircle, CheckCircle, Calendar, Repeat, LayoutDashboard, Users, FolderKanban, FileText, Receipt, TrendingUp, UserPlus, Flame, Snowflake, ThermometerSun, Menu } from "lucide-react";
import {
  getAllData,
  createClient as dbCreateClient,
  updateClient as dbUpdateClient,
  deleteClient as dbDeleteClient,
  createProject as dbCreateProject,
  updateProject as dbUpdateProject,
  deleteProject as dbDeleteProject,
  createInvoice as dbCreateInvoice,
  updateInvoice as dbUpdateInvoice,
  deleteInvoice as dbDeleteInvoice,
  markInvoicePaid as dbMarkPaid,
  markInvoiceSent as dbMarkSent,
  updateInvoiceStatus as dbUpdateInvoiceStatus,
  createExpense as dbCreateExpense,
  updateExpense as dbUpdateExpense,
  deleteExpense as dbDeleteExpense,
  processRecurringExpenses as dbProcessRecurring,
  createProspect as dbCreateProspect,
  updateProspect as dbUpdateProspect,
  deleteProspect as dbDeleteProspect,
  getSettings,
  updateSettings as dbUpdateSettings,
  sendInvoiceEmail,
  sendReminderEmail,
} from "@/lib/actions";
import { SETTINGS_DEFAULTS } from "@/lib/settings-defaults";
import type { Settings } from "@/lib/settings-defaults";
import { getDemoData, getDemoSettings } from "@/lib/demo-data";

// ============================================================
// HOLD FAST STUDIO — Invoice & Client OS
// ============================================================

// --- Utilities ---
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount || 0);
}
function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function daysBetween(d1, d2) {
  const a = new Date(d1 + "T00:00:00");
  const b = new Date(d2 + "T00:00:00");
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}
function todayStr() {
  return new Date().toISOString().split("T")[0];
}
function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
function getClientEmails(client) {
  const emails: string[] = [];
  if (client?.email) emails.push(client.email);
  const contacts = client?.additionalContacts || [];
  for (const c of contacts) {
    if (c.email && !emails.includes(c.email)) emails.push(c.email);
  }
  return emails;
}
function nextInvoiceNumber(invoices, prefix = "HFS") {
  const year = new Date().getFullYear();
  const existing = invoices.filter((i) => i.number?.startsWith(`${prefix}-${year}`));
  const maxSeq = existing.reduce((max, i) => {
    const parts = i.number?.split("-");
    const seq = parseInt(parts?.[parts.length - 1] || "0");
    return seq > max ? seq : max;
  }, 0);
  return `${prefix}-${year}-${String(maxSeq + 1).padStart(3, "0")}`;
}

// --- Constants ---
const ALL_INVOICE_STATUSES = ["draft", "outstanding", "paid", "overdue"];
const ALL_PROJECT_STATUSES = ["active", "completed"];
const ALL_CLIENT_STATUSES = ["active", "archived"];
const ALL_PROSPECT_STATUSES = ["lead", "intro", "proposal", "negotiation", "won", "lost", "deferred"];
const PROSPECT_SOURCES = ["referral", "warm intro", "cold", "inbound", "email", "conference", "other"];
const STATUS_COLORS = {
  draft: { bg: "#1A1A1E", text: "#7B7B88", border: "#2A2A30" },
  outstanding: { bg: "rgba(52,110,150,0.12)", text: "#4A8DB8", border: "rgba(52,110,150,0.22)" },
  paid: { bg: "rgba(74,222,128,0.10)", text: "#4ADE80", border: "rgba(74,222,128,0.22)" },
  overdue: { bg: "rgba(239,68,68,0.10)", text: "#F87171", border: "rgba(239,68,68,0.20)" },
};
const EXPENSE_CATEGORIES = [
  { group: "Ads & Marketing", items: [{ value: "advertising", label: "Advertising" }] },
  { group: "Cost of Goods Sold", items: [
    { value: "cost-of-labor", label: "Cost of Labor" },
    { value: "materials-supplies", label: "Materials & Supplies" },
    { value: "misc-cogs", label: "Misc COGS" },
  ]},
  { group: "Commissions & Fees", items: [
    { value: "misc-fees", label: "Misc Fees" },
  ]},
  { group: "Work Devices & Software", items: [
    { value: "software", label: "Software & Subscriptions" },
    { value: "hardware", label: "Hardware & Equipment" },
  ]},
  { group: "Meals & Entertainment", items: [
    { value: "meals", label: "Meals" },
    { value: "entertainment", label: "Entertainment" },
  ]},
  { group: "Office Expenses", items: [
    { value: "office", label: "Office Supplies" },
    { value: "office-rent", label: "Office Rent" },
  ]},
  { group: "Travel", items: [
    { value: "travel", label: "Travel" },
    { value: "car-truck", label: "Car & Truck Expenses" },
  ]},
  { group: "Professional Services", items: [
    { value: "legal", label: "Legal & Professional" },
    { value: "accounting", label: "Accounting" },
    { value: "contractors", label: "Contract Labor" },
  ]},
  { group: "Other", items: [
    { value: "insurance", label: "Insurance" },
    { value: "taxes-licenses", label: "Taxes & Licenses" },
    { value: "education", label: "Education & Training" },
    { value: "other", label: "Other Expenses" },
  ]},
];
const ALL_EXPENSE_ITEMS = EXPENSE_CATEGORIES.flatMap((g) => g.items);
function getCategoryLabel(value) {
  return ALL_EXPENSE_ITEMS.find((i) => i.value === value)?.label || value;
}
function getCategoryGroup(value) {
  return EXPENSE_CATEGORIES.find((g) => g.items.some((i) => i.value === value))?.group || "";
}

const STORAGE_KEYS = {
  clients: "hfs_clients",
  projects: "hfs_projects",
  invoices: "hfs_invoices",
  lineItems: "hfs_lineItems",
  expenses: "hfs_expenses",
};

// --- Seed Data ---
function createSeedData() {
  const clients = [
    { id: "c1", name: "Onboard AI", contact: "Alex Chen", email: "alex@onboard.ai", phone: "", address: "San Francisco, CA", notes: "AI vendor assessment platform. Primary contact for design system work.", rate: 20000, status: "active", createdAt: "2025-09-15" },
    { id: "c2", name: "Superpilot", contact: "Jordan Mills", email: "jordan@superpilot.io", phone: "", address: "Austin, TX", notes: "AI visibility platform. Marketing and product design.", rate: 15000, status: "active", createdAt: "2025-11-01" },
  ];
  const projects = [
    { id: "p1", clientId: "c1", name: "Design System v2", description: "Comprehensive design system for vendor assessment platform", status: "active", startDate: "2025-10-01", rate: 20000, rateType: "monthly" },
    { id: "p2", clientId: "c1", name: "Dashboard Redesign", description: "Executive dashboard and reporting views", status: "active", startDate: "2026-01-15", rate: 20000, rateType: "monthly" },
    { id: "p3", clientId: "c2", name: "Marketing Site", description: "Website redesign and marketing materials", status: "active", startDate: "2025-11-15", rate: 15000, rateType: "monthly" },
  ];
  const invoices = [
    { id: "inv1", number: "HFS-2025-001", clientId: "c1", projectId: "p1", status: "paid", issueDate: "2025-10-01", dueDate: "2025-10-15", paidDate: "2025-10-12", notes: "October retainer", clientNotes: "", subtotal: 20000, tax: 0, total: 20000, viewToken: "tok_001" },
    { id: "inv2", number: "HFS-2025-002", clientId: "c1", projectId: "p1", status: "paid", issueDate: "2025-11-01", dueDate: "2025-11-15", paidDate: "2025-11-14", notes: "November retainer", clientNotes: "", subtotal: 20000, tax: 0, total: 20000, viewToken: "tok_002" },
    { id: "inv3", number: "HFS-2025-003", clientId: "c2", projectId: "p3", status: "paid", issueDate: "2025-12-01", dueDate: "2025-12-15", paidDate: "2025-12-18", notes: "December retainer", clientNotes: "", subtotal: 15000, tax: 0, total: 15000, viewToken: "tok_003" },
    { id: "inv4", number: "HFS-2026-001", clientId: "c1", projectId: "p2", status: "paid", issueDate: "2026-01-15", dueDate: "2026-01-30", paidDate: "2026-01-28", notes: "January retainer", clientNotes: "", subtotal: 20000, tax: 0, total: 20000, viewToken: "tok_004" },
    { id: "inv5", number: "HFS-2026-002", clientId: "c2", projectId: "p3", status: "outstanding", issueDate: "2026-02-01", dueDate: "2026-02-15", paidDate: null, notes: "February retainer", clientNotes: "", subtotal: 15000, tax: 0, total: 15000, viewToken: "tok_005" },
    { id: "inv6", number: "HFS-2026-003", clientId: "c1", projectId: "p2", status: "draft", issueDate: "2026-02-15", dueDate: "2026-03-01", paidDate: null, notes: "February retainer", clientNotes: "Thank you for the continued partnership.", subtotal: 20000, tax: 0, total: 20000, viewToken: "tok_006" },
  ];
  const lineItems = [
    { id: "li1", invoiceId: "inv1", description: "Product Design Retainer — October 2025", quantity: 1, rate: 20000, amount: 20000, sortOrder: 0 },
    { id: "li2", invoiceId: "inv2", description: "Product Design Retainer — November 2025", quantity: 1, rate: 20000, amount: 20000, sortOrder: 0 },
    { id: "li3", invoiceId: "inv3", description: "Product Design Retainer — December 2025", quantity: 1, rate: 15000, amount: 15000, sortOrder: 0 },
    { id: "li4", invoiceId: "inv4", description: "Product Design Retainer — January 2026", quantity: 1, rate: 20000, amount: 20000, sortOrder: 0 },
    { id: "li5", invoiceId: "inv5", description: "Product Design Retainer — February 2026", quantity: 1, rate: 15000, amount: 15000, sortOrder: 0 },
    { id: "li6", invoiceId: "inv6", description: "Product Design Retainer — February 2026", quantity: 1, rate: 20000, amount: 20000, sortOrder: 0 },
  ];
  const expenses = [
    { id: "exp1", date: "2026-01-15", vendor: "Figma", description: "Organization plan", category: "software", amount: 75, clientId: "", projectId: "", notes: "", taxDeductible: 1, createdAt: "2026-01-15" },
    { id: "exp2", date: "2026-01-20", vendor: "Vercel", description: "Pro plan", category: "software", amount: 20, clientId: "", projectId: "", notes: "", taxDeductible: 1, createdAt: "2026-01-20" },
    { id: "exp3", date: "2026-02-01", vendor: "Adobe", description: "Creative Cloud", category: "software", amount: 55, clientId: "", projectId: "", notes: "", taxDeductible: 1, createdAt: "2026-02-01" },
    { id: "exp4", date: "2026-02-05", vendor: "WeWork", description: "Day pass — client meeting", category: "office", amount: 45, clientId: "c1", projectId: "p2", notes: "Meeting with Alex re: dashboard kickoff", taxDeductible: 1, createdAt: "2026-02-05" },
    { id: "exp5", date: "2026-02-10", vendor: "Delta Airlines", description: "SFO round trip — Onboard AI onsite", category: "travel", amount: 380, clientId: "c1", projectId: "p2", notes: "", taxDeductible: 1, createdAt: "2026-02-10" },
    { id: "exp6", date: "2026-02-12", vendor: "The Press", description: "Client dinner — Jordan", category: "meals", amount: 120, clientId: "c2", projectId: "", notes: "", taxDeductible: 1, createdAt: "2026-02-12" },
  ];
  return { clients, projects, invoices, lineItems, expenses };
}

// --- Persistent State Hook ---
function usePersistedState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);
  return [state, setState];
}

// ============================================================
// ANIMATIONS
// ============================================================

const ANIMATION_STYLES = `
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes modalIn { from { opacity: 0; transform: scale(0.97) } to { opacity: 1; transform: scale(1) } }
@keyframes toastIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
@keyframes toastOut { from { opacity: 1; transform: translateY(0) } to { opacity: 0; transform: translateY(8px) } }
@keyframes loaderPulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
@keyframes loaderShimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }

/* Selection */
::selection { background: rgba(237,237,240,0.3); color: #fff; }

/* Global interactive hover */
button, a { transition: filter 0.12s ease, background 0.12s ease, color 0.12s ease, border-color 0.12s ease, opacity 0.12s ease; }
button:hover:not(:disabled) { filter: brightness(1.15); }
button:active:not(:disabled) { filter: brightness(0.95); }

/* Ghost action buttons (invoice actions, etc.) */
.act { filter: none !important; }
.act:hover { background: #1A1A1E !important; color: #EDEDF0 !important; filter: none !important; }
`;

function AnimationStyles() {
  return <style dangerouslySetInnerHTML={{ __html: ANIMATION_STYLES }} />;
}

// ============================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================

type ToastType = "success" | "info" | "error";
type ToastItem = { id: number; message: string; type: ToastType; exiting: boolean; onUndo?: () => void };
type ToastFn = (message: string, type?: ToastType, onUndo?: () => void) => void;

const ToastContext = createContext<ToastFn>(() => {});
const useToast = () => useContext(ToastContext);

// Module-level ref so toast() can be called from HoldFastApp action functions
let _toastFn: ToastFn = () => {};

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((message: string, type: ToastType = "success", onUndo?: () => void) => {
    const id = nextId.current++;
    setToasts((prev: ToastItem[]) => {
      const next = [...prev, { id, message, type, exiting: false, onUndo }];
      return next.length > 3 ? next.slice(-3) : next;
    });
    const duration = onUndo ? 5000 : 3000;
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 200);
    }, duration);
  }, []);

  // Expose to module-level for HoldFastApp action functions
  useEffect(() => { _toastFn = toast; }, [toast]);

  const toastIcons = {
    success: <Check size={14} style={{ flexShrink: 0 }} />,
    info: <Check size={14} style={{ flexShrink: 0 }} />,
    error: <X size={14} style={{ flexShrink: 0 }} />,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 2000, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
        {toasts.map((t) => (
          <div key={t.id} style={{
            padding: "10px 16px",
            background: "#1A1A1E",
            border: "1px solid #2A2A30",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            color: "#EDEDF0",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            animation: t.exiting ? "toastOut 200ms ease forwards" : "toastIn 200ms ease",
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <span style={{ color: "#5E5E6E" }}>{toastIcons[t.type]}</span>
            {t.message}
            {t.onUndo && (
              <button onClick={() => { t.onUndo?.(); setToasts((prev) => prev.filter((x) => x.id !== t.id)); }} style={{ background: "none", border: "none", color: "#60A5FA", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", padding: "0 0 0 4px", whiteSpace: "nowrap" }}>Undo</button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ============================================================
// CONFIRM DIALOG
// ============================================================

type ConfirmOptions = { title: string; message?: string; confirmLabel?: string; danger?: boolean };
type ConfirmState = ConfirmOptions & { resolve: (v: boolean) => void } | null;

const ConfirmContext = createContext<(opts: ConfirmOptions) => Promise<boolean>>(async () => false);
const useConfirm = () => useContext(ConfirmContext);
let _confirmFn: (opts: ConfirmOptions) => Promise<boolean> = async () => false;

function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...opts, resolve });
    });
  }, []);

  useEffect(() => { _confirmFn = confirm; }, [confirm]);

  function handleClose(result: boolean) {
    state?.resolve(result);
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", animation: "fadeIn 150ms ease" }} onClick={() => handleClose(false)}>
          <div style={{ background: "#141416", border: "1px solid #1C1C20", borderRadius: 12, width: "min(400px, 90vw)", padding: 24, boxShadow: "0 24px 48px rgba(0,0,0,0.4)", animation: "modalIn 150ms ease" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 600, color: "#EDEDF0" }}>{state.title}</h3>
            {state.message && <p style={{ margin: "0 0 20px", fontSize: 13, color: "#7B7B88", lineHeight: 1.5 }}>{state.message}</p>}
            {!state.message && <div style={{ marginBottom: 20 }} />}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => handleClose(false)} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #2A2A30", borderRadius: 6, color: "#7B7B88", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => handleClose(true)} style={{ padding: "8px 16px", background: state.danger ? "rgba(239,68,68,0.15)" : "#EDEDF0", border: state.danger ? "1px solid rgba(239,68,68,0.20)" : "none", borderRadius: 6, color: state.danger ? "#F87171" : "#0A0A0C", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>{state.confirmLabel || "Confirm"}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

// ============================================================
// SHARED UI COMPONENTS
// ============================================================

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  background: "#141416",
  border: "1px solid #2A2A30",
  borderRadius: "8px",
  color: "#EDEDF0",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box" as const,
  fontFamily: "inherit",
};
const selectStyle = { ...inputStyle, cursor: "pointer" };
const btnPrimary = {
  padding: "10px 20px",
  background: "#EDEDF0",
  color: "#0A0A0C",
  border: "none",
  borderRadius: "6px",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
};
const btnSecondary = {
  ...btnPrimary,
  background: "transparent",
  color: "#7B7B88",
  border: "1px solid #2A2A30",
};
const btnDanger = {
  ...btnPrimary,
  background: "rgba(239,68,68,0.10)",
  color: "#F87171",
  border: "1px solid rgba(239,68,68,0.20)",
};

// Time period filter
function getTimePeriodRange(period: string): { start: string; end: string } | null {
  if (period === "all") return null;
  const now = new Date();
  const year = now.getFullYear();
  if (period === "year") return { start: `${year}-01-01`, end: `${year}-12-31` };
  const q = Math.floor(now.getMonth() / 3);
  const qStart = new Date(year, q * 3, 1);
  const qEnd = new Date(year, q * 3 + 3, 0);
  return { start: qStart.toISOString().split("T")[0], end: qEnd.toISOString().split("T")[0] };
}

function filterByTimePeriod(items: any[], dateField: string, period: string) {
  const range = getTimePeriodRange(period);
  if (!range) return items;
  return items.filter((item) => {
    const d = item[dateField];
    if (!d) return false;
    return d >= range.start && d <= range.end;
  });
}

function getTimePeriodLabel(period: string): string {
  const now = new Date();
  if (period === "year") return String(now.getFullYear());
  if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3) + 1;
    return `Q${q} ${now.getFullYear()}`;
  }
  return "All Time";
}

function TimePeriodFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = [
    { key: "quarter", label: getTimePeriodLabel("quarter") },
    { key: "year", label: getTimePeriodLabel("year") },
    { key: "all", label: "All Time" },
  ];
  return (
    <div style={{ display: "flex", gap: 4, background: "#0A0A0C", borderRadius: 6, padding: 2, border: "1px solid #1C1C20" }}>
      {options.map((o) => (
        <button key={o.key} onClick={() => onChange(o.key)}
          className={value !== o.key ? "act" : ""}
          style={{ padding: "5px 12px", borderRadius: 4, border: "none", background: value === o.key ? "#1A1A1E" : "transparent", color: value === o.key ? "#EDEDF0" : "#3E3E4A", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function StatusDropdown({ value, onChange, options, counts }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; counts: Record<string, number> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  const selected = options.find((o) => o.value === value);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 6, border: "1px solid #1C1C20", background: value !== "all" ? "#1A1A1E" : "transparent", color: value !== "all" ? "#EDEDF0" : "#5E5E6E", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
        {selected?.label || "All"} ({counts[value] ?? 0}) <ChevronDown size={12} />
      </button>
      <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#141416", border: "1px solid #1C1C20", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.6)", zIndex: 100, minWidth: 180, padding: 4, opacity: open ? 1 : 0, transform: open ? "translateY(0)" : "translateY(-4px)", pointerEvents: open ? "auto" : "none", transition: "opacity 150ms ease, transform 150ms ease" }}>
          {options.map((o) => (
            <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "8px 12px", background: "transparent", border: "none", borderRadius: 4, color: value === o.value ? "#EDEDF0" : "#5E5E6E", fontSize: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#1A1A1E")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <span>{o.label}</span>
              <span style={{ color: "#3E3E4A", fontFamily: "var(--font-mono), monospace", fontSize: 11 }}>{counts[o.value] ?? 0}</span>
            </button>
          ))}
        </div>
    </div>
  );
}

function StatusBadge({ status, detail }: { status: string; detail?: string }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 4, background: colors.bg, color: colors.text, textTransform: "capitalize", whiteSpace: "nowrap" }}>{status}</span>
      {detail && <span style={{ color: status === "paid" ? colors.text : "#5E5E6E", fontWeight: 400, fontSize: 11 }}>· {detail}</span>}
    </span>
  );
}

const GENERAL_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "rgba(74,222,128,0.10)", text: "#4ADE80" },
  archived: { bg: "#1A1A1E", text: "#5E5E6E" },
  completed: { bg: "#1A1A1E", text: "#5E5E6E" },
};

function StatusChip({ status }: { status: string }) {
  const colors = GENERAL_STATUS_COLORS[status] || GENERAL_STATUS_COLORS.archived;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: colors.bg, color: colors.text, textTransform: "capitalize", whiteSpace: "nowrap" }}>{status}</span>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#7B7B88", marginBottom: 6, letterSpacing: "0.3px" }}>{label}</label>
      {children}
    </div>
  );
}

function PageHeader({ title, backLabel, onBack, actions, isMobile }: any) {
  return (
    <div style={{ marginBottom: isMobile ? 20 : 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, minWidth: 0 }}>
          {onBack && (
            <button onClick={onBack} style={{ background: "none", border: "none", color: "#5E5E6E", cursor: "pointer", fontFamily: "inherit", padding: 0, display: "flex", alignItems: "center", gap: 6, marginRight: 8, fontSize: isMobile ? 13 : 15, flexShrink: 0 }}>
              <ArrowLeft size={16} color="#5E5E6E" />
              {!isMobile && <span>{backLabel || "Back"}</span>}
              {!isMobile && title && <span style={{ color: "#2A2A30", margin: "0 2px" }}>/</span>}
            </button>
          )}
          <h1 style={{ fontSize: isMobile ? 18 : (onBack ? 15 : 22), fontWeight: 600, margin: 0, color: "#EDEDF0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</h1>
        </div>
        {actions && <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>{actions}</div>}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, warn, isMobile }: any) {
  return (
    <div style={{ padding: isMobile ? "14px 16px" : "20px 24px", background: warn ? "rgba(239,68,68,0.08)" : "#141416", borderRadius: 10, border: `1px solid ${warn ? "rgba(239,68,68,0.12)" : "#1C1C20"}` }}>
      <div style={{ fontSize: 11, color: "#5E5E6E", letterSpacing: "0.5px", fontWeight: 500, marginBottom: isMobile ? 4 : 8 }}>{label}</div>
      <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 600, color: warn ? "#F87171" : "#EDEDF0", fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#3E3E4A", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function Modal({ title, onClose, children, width = 560 }) {
  const isMobileModal = typeof window !== "undefined" && window.innerWidth <= 768;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: isMobileModal ? "flex-end" : "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", animation: "fadeIn 150ms ease" }} onClick={onClose}>
      <div style={{ background: "#141416", border: "1px solid #1C1C20", borderRadius: isMobileModal ? "16px 16px 0 0" : "12px", width: isMobileModal ? "100%" : `min(${width}px, 95vw)`, maxHeight: isMobileModal ? "85vh" : "90vh", overflow: "auto", padding: isMobileModal ? "24px 20px" : "32px", boxShadow: "0 24px 48px rgba(0,0,0,0.4)", animation: "modalIn 150ms ease" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isMobileModal ? 16 : 24 }}>
          <h2 style={{ margin: 0, fontSize: isMobileModal ? 16 : 18, fontWeight: 600, color: "#EDEDF0" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#5E5E6E", fontSize: 20, cursor: "pointer", padding: "4px 8px" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const mono = "var(--font-jetbrains-mono), 'JetBrains Mono', monospace";

// --- Custom Select Dropdown ---
function Select({ value, onChange, options, groups, placeholder, style: overrideStyle, triggerStyle: overrideTriggerStyle, onBlur }: {
  value: string;
  onChange: (value: string) => void;
  options?: { value: string; label: string }[];
  groups?: { group: string; items: { value: string; label: string }[] }[];
  placeholder?: string;
  style?: any;
  triggerStyle?: any;
  onBlur?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Flatten for lookup
  const allOptions = groups ? groups.flatMap((g) => g.items) : (options || []);
  const selectedLabel = allOptions.find((o) => o.value === value)?.label || placeholder || "Select...";

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(""); onBlur?.(); }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onBlur]);

  // Focus search when opened
  useEffect(() => { if (open && searchRef.current) searchRef.current.focus(); }, [open]);

  // Smart positioning — never clip offscreen
  const [dropPos, setDropPos] = useState<any>({});
  useEffect(() => {
    if (!open || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const pos: any = {};
    const neededHeight = 280;
    if (rect.bottom + neededHeight > window.innerHeight) {
      pos.bottom = "100%";
      pos.marginBottom = 4;
    } else {
      pos.top = "100%";
      pos.marginTop = 4;
    }
    if (rect.left + 220 > window.innerWidth) {
      pos.right = 0;
    } else {
      pos.left = 0;
    }
    setDropPos(pos);
  }, [open]);

  function handleSelect(val) {
    onChange(val);
    setOpen(false);
    setSearch("");
    onBlur?.();
  }

  // Filter options by search
  const filterMatch = (label) => !search || label.toLowerCase().includes(search.toLowerCase());
  const hasResults = groups
    ? groups.some((g) => g.items.some((i) => filterMatch(i.label)))
    : allOptions.some((o) => filterMatch(o.label));

  return (
    <div ref={ref} style={{ position: "relative", ...overrideStyle }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          ...selectStyle,
          background: "transparent",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          textAlign: "left",
          ...overrideTriggerStyle,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{selectedLabel}</span>
        <ChevronDown size={14} color="#5E5E6E" style={{ flexShrink: 0, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      <div style={{ position: "absolute", ...dropPos, right: dropPos.right !== undefined ? 0 : undefined, background: "#141416", border: "1px solid #1C1C20", borderRadius: 8, padding: 4, zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.6)", minWidth: 180, maxHeight: 280, opacity: open ? 1 : 0, transform: open ? "translateY(0)" : "translateY(-4px)", pointerEvents: open ? "auto" : "none", transition: "opacity 150ms ease, transform 150ms ease" }}>
          {allOptions.length > 5 && (
            <div style={{ padding: "4px 4px 4px" }}>
              <div style={{ position: "relative" }}>
                <Search size={12} color="#3E3E4A" style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  ref={searchRef}
                  style={{ ...inputStyle, fontSize: 12, padding: "6px 8px 6px 26px", background: "#141416", border: "1px solid #1C1C20" }}
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") { setOpen(false); setSearch(""); }
                  }}
                />
              </div>
            </div>
          )}
          <div style={{ overflow: "auto", maxHeight: allOptions.length > 5 ? 224 : 280 }}>
            {groups ? (
              groups.map((g) => {
                const filtered = g.items.filter((i) => filterMatch(i.label));
                if (filtered.length === 0) return null;
                return (
                  <div key={g.group}>
                    <div style={{ padding: "6px 12px 2px", fontSize: 10, fontWeight: 600, letterSpacing: "0.5px", color: "#3E3E4A", textTransform: "uppercase" }}>{g.group}</div>
                    {filtered.map((item) => (
                      <button key={item.value} onClick={() => handleSelect(item.value)}
                        style={{ display: "block", width: "100%", padding: "7px 12px 7px 18px", background: item.value === value ? "#1C1C20" : "transparent", border: "none", borderRadius: 4, color: item.value === value ? "#EDEDF0" : "#7B7B88", fontSize: 13, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#1A1A1E")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = item.value === value ? "#1C1C20" : "transparent")}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                );
              })
            ) : (
              allOptions.filter((o) => filterMatch(o.label)).map((opt) => (
                <button key={opt.value} onClick={() => handleSelect(opt.value)}
                  style={{ display: "block", width: "100%", padding: "8px 10px", background: opt.value === value ? "#1C1C20" : "transparent", border: "none", borderRadius: 4, color: opt.value === value ? "#EDEDF0" : "#7B7B88", fontSize: 13, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#1A1A1E")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = opt.value === value ? "#1C1C20" : "transparent")}>
                  {opt.label}
                </button>
              ))
            )}
            {!hasResults && <div style={{ padding: "12px", color: "#5E5E6E", fontSize: 12, textAlign: "center" }}>No results</div>}
          </div>
        </div>
    </div>
  );
}

// --- Custom Date Picker ---
function DatePicker({ value, onChange, onBlur, style: overrideStyle, triggerStyle: overrideTriggerStyle, hideChevron }: { value: string; onChange: (v: string) => void; onBlur?: () => void; style?: any; triggerStyle?: any; hideChevron?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const d = value ? new Date(value + "T00:00:00") : new Date();
  const [viewYear, setViewYear] = useState(d.getFullYear());
  const [viewMonth, setViewMonth] = useState(d.getMonth());

  useEffect(() => {
    if (!open) return;
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); onBlur?.(); } }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onBlur]);

  function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
  function firstDayOfMonth(y, m) { const day = new Date(y, m, 1).getDay(); return day === 0 ? 6 : day - 1; } // Mon=0

  function selectDay(day) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onChange(dateStr);
    setOpen(false);
    onBlur?.();
  }

  function prevMonth() { if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); } else setViewMonth(viewMonth - 1); }
  function nextMonth() { if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); } else setViewMonth(viewMonth + 1); }

  const days = daysInMonth(viewYear, viewMonth);
  const startDay = firstDayOfMonth(viewYear, viewMonth);
  const selectedDay = value ? new Date(value + "T00:00:00") : null;
  const isSelected = (day) => selectedDay && selectedDay.getFullYear() === viewYear && selectedDay.getMonth() === viewMonth && selectedDay.getDate() === day;
  const isToday = (day) => { const t = new Date(); return t.getFullYear() === viewYear && t.getMonth() === viewMonth && t.getDate() === day; };
  const monthLabel = new Date(viewYear, viewMonth).toLocaleString("en", { month: "long", year: "numeric" });
  const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  // Smart positioning — check if dropdown would go offscreen
  const [dropPos, setDropPos] = useState<{ top?: number; bottom?: number; left?: number; right?: number }>({});
  useEffect(() => {
    if (!open || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const pos: any = {};
    // If the dropdown would go below the viewport, open upward
    if (rect.bottom + 300 > window.innerHeight) {
      pos.bottom = "100%";
      pos.marginBottom = 4;
    } else {
      pos.top = "100%";
      pos.marginTop = 4;
    }
    // If it would go off the right edge, align to right
    if (rect.left + 260 > window.innerWidth) {
      pos.right = 0;
    } else {
      pos.left = 0;
    }
    setDropPos(pos);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", ...overrideStyle }}>
      <button type="button" onClick={() => { setOpen(!open); if (!open && value) { const dv = new Date(value + "T00:00:00"); setViewYear(dv.getFullYear()); setViewMonth(dv.getMonth()); } }}
        style={{ ...selectStyle, background: "transparent", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left", ...overrideTriggerStyle }}>
        <span>{value ? formatDate(value) : "Select date..."}</span>
        {!hideChevron && <ChevronDown size={14} color="#5E5E6E" />}
      </button>
      <div style={{ position: "absolute", ...dropPos, background: "#141416", border: "1px solid #1C1C20", borderRadius: 8, padding: 12, zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.6)", width: 260, opacity: open ? 1 : 0, transform: open ? "translateY(0)" : "translateY(-4px)", pointerEvents: open ? "auto" : "none", transition: "opacity 150ms ease, transform 150ms ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <button onClick={prevMonth} style={{ background: "none", border: "none", color: "#5E5E6E", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", borderRadius: 4 }}><ChevronLeft size={16} /></button>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#EDEDF0" }}>{monthLabel}</span>
            <button onClick={nextMonth} style={{ background: "none", border: "none", color: "#5E5E6E", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", borderRadius: 4 }}><ChevronRight size={16} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0, textAlign: "center" }}>
            {weekDays.map((wd) => <div key={wd} style={{ padding: "4px 0", fontSize: 10, color: "#3E3E4A", fontWeight: 600 }}>{wd}</div>)}
            {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: days }).map((_, i) => {
              const day = i + 1;
              return (
                <button key={day} onClick={() => selectDay(day)}
                  style={{ padding: "6px 0", fontSize: 12, border: "none", borderRadius: 4, cursor: "pointer", fontFamily: "inherit",
                    background: isSelected(day) ? "#EDEDF0" : "transparent",
                    color: isSelected(day) ? "#0A0A0C" : isToday(day) ? "#EDEDF0" : "#7B7B88",
                    fontWeight: isSelected(day) || isToday(day) ? 600 : 400,
                    outline: isToday(day) && !isSelected(day) ? "1px solid #2A2A30" : "none",
                  }}
                  onMouseEnter={(e) => { if (!isSelected(day)) e.currentTarget.style.background = "#1C1C20"; }}
                  onMouseLeave={(e) => { if (!isSelected(day)) e.currentTarget.style.background = "transparent"; }}>
                  {day}
                </button>
              );
            })}
          </div>
        </div>
    </div>
  );
}

// --- Due Date Picker (Upon Receipt / After X Days / Custom) ---
function DueDatePicker({ issueDate, value, onChange, onBlur, style: overrideStyle, triggerStyle: overrideTriggerStyle, hideChevron, dateOnly }: { issueDate: string; value: string; onChange: (v: string) => void; onBlur?: () => void; style?: any; triggerStyle?: any; hideChevron?: boolean; dateOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"options" | "calendar">("options");
  const [mode, setMode] = useState<"receipt" | "days" | "custom">(() => {
    if (!value || !issueDate) return "days";
    if (value === issueDate) return "receipt";
    const diff = daysBetween(issueDate, value);
    if ([7, 14, 15, 30, 90].includes(diff)) return "days";
    return "custom";
  });
  const [customDays, setCustomDays] = useState(() => {
    if (!value || !issueDate) return 15;
    return daysBetween(issueDate, value) || 15;
  });
  const ref = useRef<HTMLDivElement>(null);

  // Calendar state for custom date
  const calDate = value ? new Date(value + "T00:00:00") : new Date();
  const [viewYear, setViewYear] = useState(calDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(calDate.getMonth());

  useEffect(() => {
    if (!open) return;
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setView("options"); onBlur?.(); } }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onBlur]);

  function displayLabel() {
    if (!value || !issueDate) return "Select...";
    if (value === issueDate) return "Upon Receipt";
    const diff = daysBetween(issueDate, value);
    if (diff > 0) return `Net ${diff}`;
    return formatDate(value);
  }

  function apply(m, days?) {
    if (m === "receipt") {
      onChange(issueDate);
    } else if (m === "days") {
      onChange(addDays(issueDate, days ?? customDays));
    }
    setOpen(false);
    setView("options");
    onBlur?.();
  }

  function selectCustomDate(day) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onChange(dateStr);
    setMode("custom");
    setOpen(false);
    setView("options");
    onBlur?.();
  }

  function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
  function firstDayOfMonth(y, m) { const day = new Date(y, m, 1).getDay(); return day === 0 ? 6 : day - 1; }
  const calDays = daysInMonth(viewYear, viewMonth);
  const calStart = firstDayOfMonth(viewYear, viewMonth);
  const selectedDay = value ? new Date(value + "T00:00:00") : null;
  const isCalSelected = (day) => selectedDay && selectedDay.getFullYear() === viewYear && selectedDay.getMonth() === viewMonth && selectedDay.getDate() === day;
  const isCalToday = (day) => { const t = new Date(); return t.getFullYear() === viewYear && t.getMonth() === viewMonth && t.getDate() === day; };
  const calMonthLabel = new Date(viewYear, viewMonth).toLocaleString("en", { month: "long", year: "numeric" });
  const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  function prevMonth() { if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); } else setViewMonth(viewMonth - 1); }
  function nextMonth() { if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); } else setViewMonth(viewMonth + 1); }

  // Smart positioning
  const [dropPos, setDropPos] = useState<{ top?: number; bottom?: number; left?: number; right?: number }>({});
  useEffect(() => {
    if (!open || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const pos: any = {};
    const neededHeight = view === "calendar" ? 320 : 280;
    if (rect.bottom + neededHeight > window.innerHeight) {
      pos.bottom = "100%";
      pos.marginBottom = 4;
    } else {
      pos.top = "100%";
      pos.marginTop = 4;
    }
    if (rect.left + 260 > window.innerWidth) {
      pos.right = 0;
    } else {
      pos.left = 0;
    }
    setDropPos(pos);
  }, [open, view]);

  return (
    <div ref={ref} style={{ position: "relative", ...overrideStyle }}>
      <button type="button" onClick={() => { setOpen(!open); if (open) setView("options"); }}
        style={{ ...selectStyle, background: "transparent", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left", ...overrideTriggerStyle }}>
        <div>
          {dateOnly ? (
            <span>{value ? formatDate(value) : "Select date..."}</span>
          ) : (
            <>
              <span>{displayLabel()}</span>
              {value && value !== issueDate && <span style={{ fontSize: 11, color: "#5E5E6E", marginLeft: 8 }}>{formatDate(value)}</span>}
            </>
          )}
        </div>
        {!hideChevron && <ChevronDown size={14} color="#5E5E6E" />}
      </button>
      <div style={{ position: "absolute", ...dropPos, background: "#141416", border: "1px solid #1C1C20", borderRadius: 8, padding: view === "calendar" ? 12 : 16, zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.6)", width: view === "calendar" ? 260 : 240, opacity: open ? 1 : 0, transform: open ? "translateY(0)" : "translateY(-4px)", pointerEvents: open ? "auto" : "none", transition: "opacity 150ms ease, transform 150ms ease" }}>
          {view === "calendar" ? (
            <>
              <button onClick={() => setView("options")} style={{ background: "none", border: "none", color: "#5E5E6E", cursor: "pointer", padding: "4px 0 8px", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontFamily: "inherit" }}>
                <ChevronLeft size={14} /> Back
              </button>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <button onClick={prevMonth} style={{ background: "none", border: "none", color: "#5E5E6E", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", borderRadius: 4 }}><ChevronLeft size={16} /></button>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#EDEDF0" }}>{calMonthLabel}</span>
                <button onClick={nextMonth} style={{ background: "none", border: "none", color: "#5E5E6E", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", borderRadius: 4 }}><ChevronRight size={16} /></button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0, textAlign: "center" }}>
                {weekDays.map((wd) => <div key={wd} style={{ padding: "4px 0", fontSize: 10, color: "#3E3E4A", fontWeight: 600 }}>{wd}</div>)}
                {Array.from({ length: calStart }).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: calDays }).map((_, i) => {
                  const day = i + 1;
                  return (
                    <button key={day} onClick={() => selectCustomDate(day)}
                      style={{ padding: "6px 0", fontSize: 12, border: "none", borderRadius: 4, cursor: "pointer", fontFamily: "inherit",
                        background: isCalSelected(day) ? "#EDEDF0" : "transparent",
                        color: isCalSelected(day) ? "#0A0A0C" : isCalToday(day) ? "#EDEDF0" : "#7B7B88",
                        fontWeight: isCalSelected(day) || isCalToday(day) ? 600 : 400,
                        outline: isCalToday(day) && !isCalSelected(day) ? "1px solid #2A2A30" : "none",
                      }}
                      onMouseEnter={(e) => { if (!isCalSelected(day)) e.currentTarget.style.background = "#1C1C20"; }}
                      onMouseLeave={(e) => { if (!isCalSelected(day)) e.currentTarget.style.background = "transparent"; }}>
                      {day}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {/* Upon Receipt */}
              <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer", borderBottom: "1px solid #1C1C20" }}
                onClick={() => { setMode("receipt"); apply("receipt"); }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", border: mode === "receipt" ? "2px solid #EDEDF0" : "2px solid #2A2A30", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {mode === "receipt" && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#EDEDF0" }} />}
                </div>
                <span style={{ fontSize: 13, color: "#EDEDF0", fontWeight: 500 }}>Upon Receipt</span>
              </label>

              {/* After X Days */}
              <div style={{ padding: "8px 0", borderBottom: "1px solid #1C1C20" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 8 }}
                  onClick={() => setMode("days")}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", border: mode === "days" ? "2px solid #EDEDF0" : "2px solid #2A2A30", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {mode === "days" && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#EDEDF0" }} />}
                  </div>
                  <span style={{ fontSize: 13, color: "#EDEDF0" }}>After</span>
                  <input type="text" inputMode="decimal" value={customDays} onChange={(e) => setCustomDays(parseInt(e.target.value) || 0)} onFocus={() => setMode("days")}
                    style={{ ...inputStyle, width: 50, padding: "4px 6px", fontSize: 13, textAlign: "center", background: "#141416", border: "1px solid #1C1C20" }} />
                  <span style={{ fontSize: 13, color: "#EDEDF0" }}>Days</span>
                </label>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", paddingLeft: 26 }}>
                  {[7, 15, 30, 90].map((n) => {
                    const active = customDays === n && mode === "days";
                    return (
                    <button key={n} onClick={() => { setMode("days"); setCustomDays(n); apply("days", n); }}
                      style={{ padding: "2px 8px", borderRadius: 4, border: `1px solid ${active ? "#3E3E4A" : "#1A1A1E"}`, background: active ? "#1C1C20" : "transparent", color: active ? "#EDEDF0" : "#5E5E6E", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}
                      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "#1A1A1E"; e.currentTarget.style.borderColor = "#2A2A30"; } }}
                      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#1A1A1E"; } }}>
                      {n}
                    </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom date */}
              <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer" }}
                onClick={() => { setMode("custom"); setView("calendar"); if (value) { const dv = new Date(value + "T00:00:00"); setViewYear(dv.getFullYear()); setViewMonth(dv.getMonth()); } }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", border: mode === "custom" ? "2px solid #EDEDF0" : "2px solid #2A2A30", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {mode === "custom" && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#EDEDF0" }} />}
                </div>
                <span style={{ fontSize: 13, color: "#EDEDF0" }}>Custom Date</span>
              </label>

              {mode === "days" && (
                <button onClick={() => apply(mode)} style={{ ...btnPrimary, width: "100%", marginTop: 8, padding: "8px", fontSize: 12 }}>Apply</button>
              )}
            </>
          )}
        </div>
    </div>
  );
}

// ============================================================
// PAGE: DASHBOARD
// ============================================================
function DashboardPage({ invoices, clients, expenses, navigate, timePeriod, onTimePeriodChange, isMobile }) {
  const today = todayStr();
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const periodLabel = getTimePeriodLabel(timePeriod);
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const periodPaid = filterByTimePeriod(paidInvoices, "paidDate", timePeriod);
  const periodRevenue = periodPaid.reduce((s, i) => s + i.total, 0);
  const thisMonthRevenue = paidInvoices.filter((i) => { const d = new Date(i.paidDate + "T00:00:00"); return d.getFullYear() === thisYear && d.getMonth() === thisMonth; }).reduce((s, i) => s + i.total, 0);
  const outstandingInvoices = invoices.filter((i) => ["outstanding", "overdue"].includes(i.status));
  const outstandingTotal = outstandingInvoices.reduce((s, i) => s + i.total, 0);
  const overdueInvoices = invoices.filter((i) => i.status === "overdue");
  const periodExpenses = filterByTimePeriod(expenses, "date", timePeriod).reduce((s, e) => s + e.amount, 0);

  const getClientName = (id) => clients.find((c) => c.id === id)?.name || "—";

  return (
    <div>
      <PageHeader title="Dashboard" actions={<button style={btnPrimary} onClick={() => navigate({ page: "invoices", sub: "new" })}><Plus size={14} />{isMobile ? "Invoice" : "New Invoice"}</button>} isMobile={isMobile} />

      {/* Time Period + Stat Cards */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <TimePeriodFilter value={timePeriod} onChange={onTimePeriodChange} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: isMobile ? 8 : 16, marginBottom: isMobile ? 20 : 32 }}>
        <StatCard label="This Month" value={formatCurrency(thisMonthRevenue)} sub={new Date().toLocaleString("en", { month: "long", year: "numeric" })} isMobile={isMobile} />
        <StatCard label="Revenue" value={formatCurrency(periodRevenue)} sub={periodLabel} isMobile={isMobile} />
        <StatCard label="Outstanding" value={formatCurrency(outstandingTotal)} sub={`${outstandingInvoices.length} invoice${outstandingInvoices.length !== 1 ? "s" : ""}`} isMobile={isMobile} />
        <StatCard label="Expenses" value={formatCurrency(periodExpenses)} sub={periodLabel} isMobile={isMobile} />
      </div>

      {/* Overdue Alerts */}
      {overdueInvoices.length > 0 && (
        <div style={{ marginBottom: 24, padding: "16px 20px", background: "rgba(239,68,68,0.06)", borderRadius: 8, border: "1px solid #2a1a1a" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#F87171", marginBottom: 8 }}>Overdue Invoices</div>
          {overdueInvoices.map((inv) => (
            <div key={inv.id} onClick={() => navigate({ page: "invoices", sub: "detail", id: inv.id })} style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", padding: "8px 0", borderTop: "1px solid #221818", cursor: "pointer", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 4 : 0 }}>
              <div>
                <span style={{ color: "#EDEDF0", fontSize: 13, fontFamily: mono }}>{inv.number}</span>
                <span style={{ color: "#5E5E6E", fontSize: 13, marginLeft: 12 }}>{getClientName(inv.clientId)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 16 }}>
                <span style={{ color: "#F87171", fontSize: 12 }}>{Math.abs(daysBetween(inv.dueDate, today))} days overdue</span>
                <span style={{ color: "#EDEDF0", fontWeight: 500, fontFamily: mono }}>{formatCurrency(inv.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Invoices */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, margin: 0, color: "#7B7B88" }}>Recent Invoices</h2>
          <button style={{ background: "none", border: "none", color: "#5E5E6E", fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, padding: 0 }} onClick={() => navigate({ page: "invoices" })}>View All <ArrowRight size={12} /></button>
        </div>
        <div style={{ borderRadius: 8, border: "1px solid #1C1C20" }}>
          {invoices.sort((a, b) => (b.issueDate > a.issueDate ? 1 : -1)).slice(0, isMobile ? 5 : 8).map((inv, idx) => (
            <div key={inv.id} onClick={() => navigate({ page: "invoices", sub: "detail", id: inv.id })} style={isMobile ? { padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #1C1C20" } : { display: "grid", gridTemplateColumns: "100px 1fr 140px 100px 100px", gap: 16, alignItems: "center", padding: "14px 20px", background: "transparent", cursor: "pointer", borderBottom: "1px solid #1C1C20", transition: "background 120ms ease", ...(idx === 0 ? { borderRadius: "8px 8px 0 0" } : {}) }}
              onMouseEnter={(e) => { if (!isMobile) e.currentTarget.style.background = "#141416"; }}
              onMouseLeave={(e) => { if (!isMobile) e.currentTarget.style.background = "transparent"; }}>
              {isMobile ? (<>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ color: "#EDEDF0", fontSize: 13 }}>{getClientName(inv.clientId)}</span>
                  <span style={{ fontFamily: mono, fontSize: 13, color: "#EDEDF0" }}>{formatCurrency(inv.total)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: mono, fontSize: 11, color: "#5E5E6E" }}>{inv.number} · {formatDate(inv.issueDate)}</span>
                  <StatusBadge status={inv.status} />
                </div>
              </>) : (<>
                <span style={{ fontFamily: mono, fontSize: 12, color: "#7B7B88" }}>{inv.number}</span>
                <span style={{ color: "#EDEDF0", fontSize: 13 }}>{getClientName(inv.clientId)}</span>
                <span style={{ fontSize: 12, color: "#5E5E6E" }}>{formatDate(inv.issueDate)}</span>
                <span style={{ fontFamily: mono, fontSize: 13, color: "#EDEDF0", textAlign: "right" }}>{formatCurrency(inv.total)}</span>
                <span><StatusBadge status={inv.status} /></span>
              </>)}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Expenses */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, margin: 0, color: "#7B7B88" }}>Recent Expenses</h2>
          <button style={{ background: "none", border: "none", color: "#5E5E6E", fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, padding: 0 }} onClick={() => navigate({ page: "expenses" })}>View All <ArrowRight size={12} /></button>
        </div>
        <div style={{ borderRadius: 8, border: "1px solid #1C1C20" }}>
          {expenses.sort((a, b) => (b.date > a.date ? 1 : -1)).slice(0, 5).map((exp, idx) => (
            <div key={exp.id} onClick={() => navigate({ page: "expenses", sub: "edit", id: exp.id })} style={isMobile ? { padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #1C1C20" } : { display: "grid", gridTemplateColumns: "100px 1fr 140px 100px 100px", gap: 16, alignItems: "center", padding: "12px 20px", background: "transparent", cursor: "pointer", borderBottom: "1px solid #1C1C20", transition: "background 120ms ease", ...(idx === 0 ? { borderRadius: "8px 8px 0 0" } : {}) }}
              onMouseEnter={(e) => { if (!isMobile) e.currentTarget.style.background = "#141416"; }}
              onMouseLeave={(e) => { if (!isMobile) e.currentTarget.style.background = "transparent"; }}>
              {isMobile ? (<>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ color: "#EDEDF0", fontSize: 13 }}>{exp.vendor}</span>
                  <span style={{ fontFamily: mono, fontSize: 13, color: "#EDEDF0" }}>{formatCurrency(exp.amount)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#5E5E6E" }}>{formatDate(exp.date)}</span>
                  <span style={{ fontSize: 11, color: "#5E5E6E", textTransform: "capitalize" }}>{exp.category}</span>
                </div>
              </>) : (<>
                <span style={{ fontSize: 12, color: "#5E5E6E" }}>{formatDate(exp.date)}</span>
                <span style={{ color: "#EDEDF0", fontSize: 13 }}>{exp.vendor}</span>
                <span style={{ fontSize: 12, color: "#5E5E6E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exp.description}</span>
                <span style={{ fontSize: 11, color: "#5E5E6E", textTransform: "capitalize" }}>{exp.category}</span>
                <span style={{ fontFamily: mono, fontSize: 13, color: "#EDEDF0", textAlign: "right" }}>{formatCurrency(exp.amount)}</span>
              </>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAGE: CLIENTS
// ============================================================
function ClientsListPage({ clients, projects, invoices, navigate, onSave, onDelete, timePeriod, onTimePeriodChange, isMobile }) {
  const [statusFilter, setStatusFilter] = useState("active");
  const lastClientInvoice = (clientId: string) => invoices.filter((i) => i.clientId === clientId).reduce((max, i) => i.issueDate > max ? i.issueDate : max, "");
  const filteredClients = clients.filter((c) => statusFilter === "all" || c.status === statusFilter).sort((a, b) => (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1) || (lastClientInvoice(b.id) || b.createdAt || "").localeCompare(lastClientInvoice(a.id) || a.createdAt || ""));

  return (
    <div>
      <PageHeader title="Clients" actions={<button style={btnPrimary} onClick={() => navigate({ page: "clients", sub: "new" })}><Plus size={14} />{isMobile ? "Client" : "New Client"}</button>} isMobile={isMobile} />
      <div style={{ display: "flex", gap: 8, marginBottom: 20, justifyContent: "space-between", alignItems: "center" }}>
        <StatusDropdown value={statusFilter} onChange={setStatusFilter} options={[{ value: "all", label: "All" }, ...ALL_CLIENT_STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))]} counts={Object.fromEntries([["all", clients.length], ...ALL_CLIENT_STATUSES.map((s) => [s, clients.filter((c) => c.status === s).length])])} />
      </div>
      <div style={{ display: "grid", gap: 16 }}>
        {filteredClients.map((client) => {
          const clientInvoices = invoices.filter((i) => i.clientId === client.id);
          const clientRevenue = clientInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0);
          const clientOutstanding = clientInvoices.filter((i) => ["outstanding", "overdue"].includes(i.status)).reduce((s, i) => s + i.total, 0);
          const clientProjects = projects.filter((p) => p.clientId === client.id);
          return (
            <div key={client.id} onClick={() => navigate({ page: "clients", sub: "detail", id: client.id })} style={{ padding: "24px", background: "#141416", borderRadius: 10, border: "1px solid #1C1C20", cursor: "pointer", transition: "border-color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2A2A30")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1C1C20")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#EDEDF0", marginBottom: 4 }}>{client.name}</div>
                  <div style={{ fontSize: 13, color: "#5E5E6E" }}>{client.contact}{client.email && ` · ${client.email}`}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <StatusChip status={client.status} />
                  <ActionMenu items={[
                    { icon: <Eye size={13} />, label: "View", onClick: () => navigate({ page: "clients", sub: "detail", id: client.id }) },
                    ...(client.status === "active"
                      ? [{ icon: <Archive size={13} />, label: "Archive", onClick: () => onSave({ ...client, status: "archived" }, { skipNavigate: true }) }]
                      : [{ icon: <PlayCircle size={13} />, label: "Mark Active", onClick: () => onSave({ ...client, status: "active" }, { skipNavigate: true }) }]),
                    { divider: true, icon: null, label: "", onClick: () => {} },
                    { icon: <Trash2 size={13} />, label: "Delete", onClick: async () => { if (await _confirmFn({ title: `Delete ${client.name}?`, message: "This will also delete their projects, invoices, and expenses.", confirmLabel: "Delete", danger: true })) onDelete(client.id); }, danger: true },
                  ]} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: isMobile ? 8 : 16, marginTop: isMobile ? 12 : 16, paddingTop: isMobile ? 12 : 16, borderTop: "1px solid #1C1C20" }}>
                <div><div style={{ fontSize: 10, color: "#5E5E6E", letterSpacing: "0.5px" }}>PROJECTS</div><div style={{ fontSize: 14, fontWeight: 500, color: "#7B7B88" }}>{clientProjects.filter((p) => p.status === "active").length} active</div></div>
                <div><div style={{ fontSize: 10, color: "#5E5E6E", letterSpacing: "0.5px" }}>INVOICES</div><div style={{ fontSize: 14, fontWeight: 500, color: "#7B7B88" }}>{clientInvoices.length}</div></div>
                <div><div style={{ fontSize: 10, color: "#5E5E6E", letterSpacing: "0.5px" }}>REVENUE</div><div style={{ fontSize: 14, fontWeight: 500, color: "#4ADE80", fontFamily: mono }}>{formatCurrency(clientRevenue)}</div></div>
                <div><div style={{ fontSize: 10, color: "#5E5E6E", letterSpacing: "0.5px" }}>OUTSTANDING</div><div style={{ fontSize: 14, fontWeight: 500, color: clientOutstanding > 0 ? "#FBBF24" : "#3E3E4A", fontFamily: mono }}>{formatCurrency(clientOutstanding)}</div></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClientDetailPage({ clientId, clients, projects, invoices, onSave, onDelete, onSaveProject, onDeleteProject, navigate, isMobile }) {
  const client = clients.find((c) => c.id === clientId);
  const [form, setForm] = useState(client || {});
  const [editing, setEditing] = useState(!client);
  const clientProjects = projects.filter((p) => p.clientId === clientId);
  const clientInvoices = invoices.filter((i) => i.clientId === clientId);

  if (!client && clientId !== "new") return <div style={{ color: "#5E5E6E" }}>Client not found.</div>;

  const upd = (k, v) => setForm({ ...form, [k]: v });

  function handleSave() {
    onSave(form);
    setEditing(false);
  }

  return (
    <div>
      <PageHeader title={editing ? (clientId === "new" ? "New Client" : "Edit Client") : form.name} backLabel="Clients" onBack={() => navigate({ page: "clients" })} isMobile={isMobile}
        actions={!editing ? (
          <>
            <button style={btnSecondary} onClick={() => setEditing(true)}>Edit</button>
            <button style={btnDanger} onClick={() => { void (async () => { if (await _confirmFn({ title: "Delete this client?", message: "This will also delete all associated projects, invoices, and expenses.", confirmLabel: "Delete", danger: true })) { onDelete(clientId); navigate({ page: "clients" }); } })() }}>Delete</button>
          </>
        ) : null} />

      {editing ? (
        <div style={{ maxWidth: 600 }}>
          <Field label="Company / Client Name"><input style={inputStyle} value={form.name || ""} onChange={(e) => upd("name", e.target.value)} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
            <Field label="Primary Contact"><input style={inputStyle} value={form.contact || ""} onChange={(e) => upd("contact", e.target.value)} /></Field>
            <Field label="Email"><input style={inputStyle} type="email" value={form.email || ""} onChange={(e) => upd("email", e.target.value)} /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
            <Field label="Phone"><input style={inputStyle} value={form.phone || ""} onChange={(e) => upd("phone", e.target.value)} /></Field>
            <Field label="Status"><Select value={form.status || "active"} onChange={(v) => upd("status", v)} options={[{ value: "active", label: "Active" }, { value: "archived", label: "Archived" }]} /></Field>
          </div>
          <Field label="Address"><input style={inputStyle} value={form.address || ""} onChange={(e) => upd("address", e.target.value)} /></Field>

          {/* Additional Contacts */}
          <div style={{ marginTop: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#7B7B88", marginBottom: 8, letterSpacing: "0.3px" }}>ADDITIONAL CONTACTS</div>
            {(form.additionalContacts || []).map((ac, idx) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 28px" : "1fr 1fr 120px 28px", gap: 8, marginBottom: 6 }}>
                <input style={inputStyle} placeholder="Name" value={ac.name || ""} onChange={(e) => { const updated = [...(form.additionalContacts || [])]; updated[idx] = { ...updated[idx], name: e.target.value }; upd("additionalContacts", updated); }} />
                <input style={inputStyle} placeholder="Email" type="email" value={ac.email || ""} onChange={(e) => { const updated = [...(form.additionalContacts || [])]; updated[idx] = { ...updated[idx], email: e.target.value }; upd("additionalContacts", updated); }} />
                <input style={inputStyle} placeholder="Role" value={ac.role || ""} onChange={(e) => { const updated = [...(form.additionalContacts || [])]; updated[idx] = { ...updated[idx], role: e.target.value }; upd("additionalContacts", updated); }} />
                <button onClick={() => { const updated = (form.additionalContacts || []).filter((_, i) => i !== idx); upd("additionalContacts", updated); }} style={{ background: "none", border: "1px solid #2A2A30", borderRadius: 6, color: "#5E5E6E", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}><X size={14} /></button>
              </div>
            ))}
            <button onClick={() => upd("additionalContacts", [...(form.additionalContacts || []), { name: "", email: "", role: "" }])} style={{ background: "none", border: "none", color: "#4A8DB8", fontSize: 12, cursor: "pointer", padding: "4px 0", fontFamily: "inherit" }}>+ Add Contact</button>
          </div>

          <Field label="Notes"><textarea style={{ ...inputStyle, height: 80, resize: "vertical" }} value={form.notes || ""} onChange={(e) => upd("notes", e.target.value)} /></Field>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btnPrimary} onClick={handleSave}>Save Client</button>
            {clientId !== "new" && <button style={btnSecondary} onClick={() => { setForm(client); setEditing(false); }}>Cancel</button>}
          </div>
        </div>
      ) : (
        <div>
          {/* Client Info */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: isMobile ? 16 : 24, marginBottom: 32, padding: isMobile ? 16 : 24, background: "#141416", borderRadius: 10, border: "1px solid #1C1C20" }}>
            <div>
              <div style={{ fontSize: 10, color: "#5E5E6E", letterSpacing: "0.5px", marginBottom: 4 }}>CONTACTS</div>
              <div style={{ color: "#EDEDF0", fontSize: 14 }}>{client.contact || "—"}</div>
              <div style={{ color: "#5E5E6E", fontSize: 13 }}>{client.email}</div>
              {client.phone && <div style={{ color: "#5E5E6E", fontSize: 13 }}>{client.phone}</div>}
              {(client.additionalContacts || []).map((ac, idx) => (
                <div key={idx} style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #1C1C20" }}>
                  <div style={{ color: "#EDEDF0", fontSize: 13 }}>{ac.name}{ac.role && <span style={{ color: "#3E3E4A", fontSize: 11, marginLeft: 6 }}>{ac.role}</span>}</div>
                  {ac.email && <div style={{ color: "#5E5E6E", fontSize: 12 }}>{ac.email}</div>}
                </div>
              ))}
            </div>
            <div><div style={{ fontSize: 10, color: "#5E5E6E", letterSpacing: "0.5px", marginBottom: 4 }}>ADDRESS</div><div style={{ color: "#7B7B88", fontSize: 13 }}>{client.address || "—"}</div></div>
            <div><div style={{ fontSize: 10, color: "#5E5E6E", letterSpacing: "0.5px", marginBottom: 4 }}>REVENUE</div><div style={{ color: "#4ADE80", fontSize: 16, fontWeight: 500, fontFamily: mono }}>{formatCurrency(clientInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0))}</div></div>
          </div>
          {client.notes && <div style={{ fontSize: 13, color: "#5E5E6E", fontStyle: "italic", marginBottom: 24 }}>{client.notes}</div>}

          {/* Projects */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontSize: 15, fontWeight: 500, color: "#7B7B88", margin: 0 }}>Projects ({clientProjects.length})</h2>
            <button onClick={() => navigate({ page: "projects", sub: "new", clientId: client.id })} style={{ ...btnSecondary, fontSize: 11, padding: "4px 10px" }}><Plus size={12} />New Project</button>
          </div>
          <div style={{ display: "grid", gap: 8, marginBottom: 32 }}>
            {clientProjects.map((p) => {
              const projInvCount = invoices.filter((i) => i.projectId === p.id).length;
              const projRevenue = invoices.filter((i) => i.projectId === p.id).reduce((s, i) => s + (i.total || 0), 0);
              const statusActions = p.status === "active"
                ? [{ icon: <CheckCircle size={13} />, label: "Mark Completed", onClick: () => onSaveProject({ ...p, status: "completed" }) }]
                : [{ icon: <PlayCircle size={13} />, label: "Reactivate", onClick: () => onSaveProject({ ...p, status: "active" }) }];
              return (
                <div key={p.id} onClick={() => navigate({ page: "projects", sub: "edit", id: p.id })}
                  style={isMobile ? { padding: "12px 16px", background: "#141416", borderRadius: 8, border: "1px solid #1C1C20", cursor: "pointer" } : { display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 16, alignItems: "center", padding: "12px 16px", background: "#141416", borderRadius: 8, border: "1px solid #1C1C20", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2A2A30")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1C1C20")}>
                  {isMobile ? (<>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ color: "#EDEDF0", fontSize: 14 }}>{p.name}</span>
                      <StatusChip status={p.status} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#5E5E6E" }}>{projInvCount > 0 ? `${projInvCount} invoice${projInvCount !== 1 ? "s" : ""}` : "No invoices"}</span>
                      <span style={{ fontFamily: mono, color: projRevenue > 0 ? "#4ADE80" : "#3E3E4A", fontSize: 13 }}>{projRevenue > 0 ? formatCurrency(projRevenue) : "—"}</span>
                    </div>
                  </>) : (<>
                    <div>
                      <span style={{ color: "#EDEDF0", fontSize: 14 }}>{p.name}</span>
                      {p.description && <span style={{ color: "#5E5E6E", fontSize: 12, marginLeft: 12 }}>{p.description}</span>}
                    </div>
                    <span style={{ fontSize: 12, color: "#5E5E6E" }}>{projInvCount > 0 ? `${projInvCount} invoice${projInvCount !== 1 ? "s" : ""}` : "No invoices"}</span>
                    <span style={{ fontFamily: mono, color: projRevenue > 0 ? "#4ADE80" : "#3E3E4A", fontSize: 13 }}>{projRevenue > 0 ? formatCurrency(projRevenue) : "—"}</span>
                    <StatusChip status={p.status} />
                  </>)}
                  {!isMobile && <ActionMenu items={[
                    { icon: <Pencil size={13} />, label: "Edit", onClick: () => navigate({ page: "projects", sub: "edit", id: p.id }) },
                    ...statusActions,
                    { divider: true, icon: null, label: "", onClick: () => {} },
                    { icon: <Trash2 size={13} />, label: "Delete", onClick: async () => { if (await _confirmFn({ title: `Delete "${p.name}"?`, confirmLabel: "Delete", danger: true })) onDeleteProject(p.id); }, danger: true },
                  ]} />}
                </div>
              );
            })}
          </div>

          {/* Invoices */}
          <h2 style={{ fontSize: 15, fontWeight: 500, color: "#7B7B88", marginBottom: 12 }}>Invoices ({clientInvoices.length})</h2>
          <div style={{ borderRadius: 8, border: "1px solid #1C1C20" }}>
            {clientInvoices.sort((a, b) => (b.issueDate > a.issueDate ? 1 : -1)).map((inv, idx) => (
              <div key={inv.id} onClick={() => navigate({ page: "invoices", sub: "detail", id: inv.id })}
                style={isMobile ? { padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #1C1C20", ...(idx === 0 ? { borderRadius: "8px 8px 0 0" } : {}) } : { display: "grid", gridTemplateColumns: "120px 140px 120px 80px", gap: 16, alignItems: "center", padding: "12px 16px", background: "transparent", cursor: "pointer", borderBottom: "1px solid #1C1C20", transition: "background 120ms ease", ...(idx === 0 ? { borderRadius: "8px 8px 0 0" } : {}) }}>
                {isMobile ? (<>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontFamily: mono, fontSize: 12, color: "#7B7B88" }}>{inv.number}</span>
                    <span style={{ fontFamily: mono, fontSize: 13, color: "#EDEDF0", fontWeight: 500 }}>{formatCurrency(inv.total)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#5E5E6E" }}>{formatDate(inv.issueDate)}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                </>) : (<>
                  <span style={{ fontFamily: mono, fontSize: 12, color: "#7B7B88" }}>{inv.number}</span>
                  <span style={{ fontSize: 12, color: "#5E5E6E" }}>{formatDate(inv.issueDate)}</span>
                  <span style={{ fontFamily: mono, fontSize: 13, color: "#EDEDF0", textAlign: "right" }}>{formatCurrency(inv.total)}</span>
                  <span style={{ textAlign: "right" }}><StatusBadge status={inv.status} /></span>
                </>)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PAGE: PROSPECTS
// ============================================================
const PROSPECT_STATUS_COLORS = {
  lead: { bg: "#1A1A1E", text: "#7B7B88", border: "#2A2A30" },
  intro: { bg: "rgba(52,110,150,0.12)", text: "#4A8DB8", border: "rgba(52,110,150,0.22)" },
  proposal: { bg: "rgba(168,130,50,0.12)", text: "#FBBF24", border: "rgba(168,130,50,0.22)" },
  negotiation: { bg: "rgba(168,85,247,0.12)", text: "#A855F7", border: "rgba(168,85,247,0.22)" },
  won: { bg: "rgba(61,214,140,0.10)", text: "#4ADE80", border: "rgba(61,214,140,0.22)" },
  lost: { bg: "rgba(239,68,68,0.10)", text: "#F87171", border: "rgba(239,68,68,0.20)" },
  deferred: { bg: "#1A1A1E", text: "#5E5E6E", border: "#2A2A30" },
};

function ProspectsListPage({ prospects, onSave, onDelete, onConvert, navigate, isMobile }) {
  const [statusFilter, setStatusFilter] = useState("active");
  const activeStatuses = ["lead", "intro", "proposal", "negotiation"];
  const filtered = statusFilter === "all" ? prospects
    : statusFilter === "active" ? prospects.filter((p) => activeStatuses.includes(p.status))
    : prospects.filter((p) => p.status === statusFilter);
  const sorted = [...filtered].sort((a, b) => {
    // Sort by next action date (soonest first), then by last contact
    if (a.nextAction && b.nextAction) return a.nextAction < b.nextAction ? -1 : 1;
    if (a.nextAction) return -1;
    if (b.nextAction) return 1;
    return (b.lastContact || "") > (a.lastContact || "") ? 1 : -1;
  });

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "all", label: "All" },
    ...ALL_PROSPECT_STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
  ];
  const statusCounts = Object.fromEntries([
    ["active", prospects.filter((p) => activeStatuses.includes(p.status)).length],
    ["all", prospects.length],
    ...ALL_PROSPECT_STATUSES.map((s) => [s, prospects.filter((p) => p.status === s).length]),
  ]);

  const tempIcon = (t) => t === "hot" ? <Flame size={12} style={{ color: "#F87171" }} /> : t === "cold" ? <Snowflake size={12} style={{ color: "#4A8DB8" }} /> : <ThermometerSun size={12} style={{ color: "#FBBF24" }} />;

  return (
    <div>
      <PageHeader title="Prospects" actions={<button style={btnPrimary} onClick={() => navigate({ page: "prospects", sub: "new" })}>+ New Prospect</button>} isMobile={isMobile} />
      <div style={{ display: "flex", gap: 8, marginBottom: 20, justifyContent: "space-between", alignItems: "center" }}>
        <StatusDropdown value={statusFilter} onChange={setStatusFilter} options={statusOptions} counts={statusCounts} />
      </div>
      <div style={{ borderRadius: 8, border: "1px solid #1C1C20" }}>
        {!isMobile && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 140px 120px 100px 100px 36px", gap: 12, padding: "10px 20px", background: "#0A0A0C", borderBottom: "1px solid #1C1C20", borderRadius: "8px 8px 0 0" }}>
            {["COMPANY", "OPPORTUNITY", "DEAL SIZE", "STATUS", "LAST CONTACT", "NEXT ACTION", ""].map((h) => (
              <span key={h} style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#3E3E4A" }}>{h}</span>
            ))}
          </div>
        )}
        {sorted.length === 0 && <div style={{ padding: 20, color: "#3E3E4A", fontSize: 13, textAlign: "center" }}>No prospects yet</div>}
        {sorted.map((p, idx) => {
          const sc = PROSPECT_STATUS_COLORS[p.status] || PROSPECT_STATUS_COLORS.lead;
          const isOverdue = p.nextAction && p.nextAction < todayStr();
          return (
            <div key={p.id} onClick={() => navigate({ page: "prospects", sub: "edit", id: p.id })}
              style={isMobile ? { padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #1C1C20" } : { display: "grid", gridTemplateColumns: "1fr 160px 140px 120px 100px 100px 36px", gap: 12, alignItems: "center", padding: "14px 20px", background: "transparent", borderBottom: "1px solid #1C1C20", cursor: "pointer" }}
              onMouseEnter={(e) => { if (!isMobile) e.currentTarget.style.background = "#141416"; }}
              onMouseLeave={(e) => { if (!isMobile) e.currentTarget.style.background = "transparent"; }}>
              {isMobile ? (<>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {tempIcon(p.temperature)}
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#EDEDF0" }}>{p.company || "Untitled"}</span>
                  </div>
                  <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: sc.bg, color: sc.text, textTransform: "capitalize", whiteSpace: "nowrap", width: "fit-content" }}>{p.status}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#5E5E6E" }}>{p.opportunity}{p.dealSize ? ` · ${p.dealSize}` : ""}</span>
                  {p.nextAction && <span style={{ fontSize: 11, color: isOverdue ? "#F87171" : "#7B7B88" }}>{formatDate(p.nextAction)}</span>}
                </div>
              </>) : (<>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {tempIcon(p.temperature)}
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#EDEDF0" }}>{p.company || "Untitled"}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#5E5E6E", marginTop: 2 }}>{p.contact}</div>
                </div>
                <span style={{ fontSize: 12, color: "#7B7B88" }}>{p.opportunity}</span>
                <span style={{ fontSize: 12, color: "#7B7B88", fontFamily: "var(--font-mono), monospace" }}>{p.dealSize || "—"}</span>
                <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: sc.bg, color: sc.text, textTransform: "capitalize", whiteSpace: "nowrap", width: "fit-content" }}>{p.status}</span>
                <span style={{ fontSize: 12, color: "#5E5E6E" }}>{p.lastContact ? formatDate(p.lastContact) : "—"}</span>
                <span style={{ fontSize: 12, color: isOverdue ? "#F87171" : "#7B7B88", fontWeight: isOverdue ? 600 : 400 }}>{p.nextAction ? formatDate(p.nextAction) : "—"}</span>
                <ActionMenu items={[
                  { icon: <Pencil size={13} />, label: "Edit", onClick: () => navigate({ page: "prospects", sub: "edit", id: p.id }) },
                  ...(p.status !== "won" ? [{ icon: <UserPlus size={13} />, label: "Convert to Client", onClick: async () => { if (await _confirmFn({ title: `Convert "${p.company}" to a client?`, confirmLabel: "Convert" })) onConvert(p); } }] : []),
                  { divider: true, icon: null, label: "", onClick: () => {} },
                  { icon: <Trash2 size={13} />, label: "Delete", onClick: async () => { if (await _confirmFn({ title: "Delete this prospect?", confirmLabel: "Delete", danger: true })) onDelete(p.id); }, danger: true },
                ]} />
              </>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProspectEditPage({ prospectId, prospects, onSave, onDelete, onConvert, navigate, isMobile }) {
  const prospect = prospects.find((p) => p.id === prospectId);
  const [form, setForm] = useState(prospect || { company: "", contact: "", email: "", opportunity: "", status: "lead", dealSize: "", source: "", temperature: "warm", lastContact: todayStr(), nextAction: "", notes: "" });
  const upd = (k, v) => setForm({ ...form, [k]: v });
  return (
    <div>
      <PageHeader title={prospect ? `Edit: ${form.company || "Prospect"}` : "New Prospect"} backLabel="Prospects" onBack={() => navigate({ page: "prospects" })} isMobile={isMobile} />
      <div style={{ maxWidth: 600 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
          <Field label="Company"><input style={inputStyle} value={form.company} onChange={(e) => upd("company", e.target.value)} placeholder="Company name" /></Field>
          <Field label="Contact Name"><input style={inputStyle} value={form.contact} onChange={(e) => upd("contact", e.target.value)} placeholder="Name(s)" /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
          <Field label="Email"><input style={inputStyle} type="email" value={form.email} onChange={(e) => upd("email", e.target.value)} placeholder="email@company.com" /></Field>
          <Field label="Opportunity / Role"><input style={inputStyle} value={form.opportunity} onChange={(e) => upd("opportunity", e.target.value)} placeholder="e.g. Fractional designer" /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Status"><Select value={form.status} onChange={(v) => upd("status", v)} options={ALL_PROSPECT_STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} /></Field>
          <Field label="Temperature"><Select value={form.temperature} onChange={(v) => upd("temperature", v)} options={[{ value: "hot", label: "Hot" }, { value: "warm", label: "Warm" }, { value: "cold", label: "Cold" }]} /></Field>
          <Field label="Source"><Select value={form.source} onChange={(v) => upd("source", v)} options={PROSPECT_SOURCES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} /></Field>
        </div>
        <Field label="Potential Deal Size"><input style={inputStyle} value={form.dealSize} onChange={(e) => upd("dealSize", e.target.value)} placeholder="e.g. 20k/mo ($60k)" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
          <Field label="Last Contact"><DatePicker value={form.lastContact} onChange={(v) => upd("lastContact", v)} /></Field>
          <Field label="Next Action Date"><DatePicker value={form.nextAction} onChange={(v) => upd("nextAction", v)} /></Field>
        </div>
        <Field label="Notes"><textarea style={{ ...inputStyle, height: 80, resize: "vertical" }} value={form.notes || ""} onChange={(e) => upd("notes", e.target.value)} placeholder="Notes, context, next steps..." /></Field>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button style={btnPrimary} onClick={async () => { await onSave(form); navigate({ page: "prospects" }); }}>Save Prospect</button>
          {prospect && prospect.status !== "won" && (
            <button style={btnSecondary} onClick={() => { void (async () => { if (await _confirmFn({ title: `Convert "${form.company}" to a client?`, confirmLabel: "Convert" })) onConvert({ ...form }); })(); }}>Convert to Client</button>
          )}
          {prospect && <button style={btnDanger} onClick={() => { void (async () => { if (await _confirmFn({ title: "Delete this prospect?", confirmLabel: "Delete", danger: true })) { onDelete(prospectId); navigate({ page: "prospects" }); } })() }}>Delete</button>}
          <button style={btnSecondary} onClick={() => navigate({ page: "prospects" })}>Cancel</button>
        </div>
        {prospect?.convertedClientId && (
          <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(61,214,140,0.08)", borderRadius: 8, border: "1px solid rgba(61,214,140,0.20)", fontSize: 12, color: "#4ADE80" }}>
            This prospect has been converted to a client.
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PAGE: PROJECTS
// ============================================================
function ProjectsListPage({ projects, clients, invoices, navigate, onSave, onDelete, timePeriod, onTimePeriodChange, isMobile }) {
  const [statusFilter, setStatusFilter] = useState("active");
  const timeFilteredInvoices = filterByTimePeriod(invoices, "issueDate", timePeriod);
  const activeProjectIds = new Set(timeFilteredInvoices.map((i) => i.projectId).filter(Boolean));
  const timeFiltered = timePeriod === "all" ? projects : projects.filter((p) => {
    const range = getTimePeriodRange(timePeriod);
    if (!range) return true;
    if (activeProjectIds.has(p.id)) return true;
    if (p.startDate && p.startDate >= range.start && p.startDate <= range.end) return true;
    return false;
  });
  const lastInvoiceDate = (projId: string) => invoices.filter((i) => i.projectId === projId).reduce((max, i) => i.issueDate > max ? i.issueDate : max, "");
  const filteredProjects = timeFiltered.filter((p) => statusFilter === "all" || p.status === statusFilter).sort((a, b) => (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1) || (lastInvoiceDate(b.id) || b.startDate || b.createdAt || "").localeCompare(lastInvoiceDate(a.id) || a.startDate || a.createdAt || ""));

  return (
    <div>
      <PageHeader title="Projects" actions={<button style={btnPrimary} onClick={() => navigate({ page: "projects", sub: "new" })}><Plus size={14} />{isMobile ? "Project" : "New Project"}</button>} isMobile={isMobile} />
      <div style={{ display: "flex", gap: 8, marginBottom: 20, justifyContent: "space-between", alignItems: "center" }}>
        <StatusDropdown value={statusFilter} onChange={setStatusFilter} options={[{ value: "all", label: "All" }, ...ALL_PROJECT_STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))]} counts={Object.fromEntries([["all", timeFiltered.length], ...ALL_PROJECT_STATUSES.map((s) => [s, timeFiltered.filter((p) => p.status === s).length])])} />
        <TimePeriodFilter value={timePeriod} onChange={onTimePeriodChange} />
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {filteredProjects.map((proj) => {
          const projInvoices = invoices.filter((i) => i.projectId === proj.id);
          const projRevenue = projInvoices.reduce((s, i) => s + (i.total || 0), 0);
          const clientName = clients.find((c) => c.id === proj.clientId)?.name || "—";
          const statusActions = proj.status === "active"
            ? [{ icon: <CheckCircle size={13} />, label: "Mark Completed", onClick: () => onSave({ ...proj, status: "completed" }) }]
            : [{ icon: <PlayCircle size={13} />, label: "Reactivate", onClick: () => onSave({ ...proj, status: "active" }) }];
          return (
            <div key={proj.id} onClick={() => navigate({ page: "projects", sub: "edit", id: proj.id })}
              style={isMobile ? { padding: "14px 16px", background: "#141416", borderRadius: 8, border: "1px solid #1C1C20", cursor: "pointer" } : { display: "grid", gridTemplateColumns: "1fr 160px 140px 120px 100px 36px", gap: 16, alignItems: "center", padding: "16px 20px", background: "#141416", borderRadius: 8, border: "1px solid #1C1C20", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2A2A30")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1C1C20")}>
              {isMobile ? (<>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#EDEDF0" }}>{proj.name}</div>
                    <div style={{ fontSize: 12, color: "#5E5E6E" }}>{clientName}</div>
                  </div>
                  <StatusChip status={proj.status} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#7B7B88", fontFamily: mono }}>{proj.rate ? `${formatCurrency(proj.rate)}/${proj.rateType === "monthly" ? "mo" : proj.rateType === "hourly" ? "hr" : "fixed"}` : ""}</span>
                  <span style={{ fontSize: 13, color: "#4ADE80", fontFamily: mono }}>{formatCurrency(projRevenue)}</span>
                </div>
              </>) : (<>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#EDEDF0" }}>{proj.name}</div>
                  <div style={{ fontSize: 12, color: "#5E5E6E" }}>{clientName}</div>
                </div>
                <div style={{ fontSize: 12, color: "#5E5E6E" }}>{proj.description?.substring(0, 40)}</div>
                <div style={{ fontSize: 13, color: "#7B7B88", fontFamily: mono }}>{proj.rate ? `${formatCurrency(proj.rate)}/${proj.rateType === "monthly" ? "mo" : proj.rateType === "hourly" ? "hr" : "fixed"}` : "—"}</div>
                <div><div style={{ fontSize: 13, color: "#4ADE80", fontFamily: mono }}>{formatCurrency(projRevenue)}</div>{projInvoices.length > 0 && <div style={{ fontSize: 11, color: "#3E3E4A" }}>{projInvoices.length} invoice{projInvoices.length !== 1 ? "s" : ""}</div>}</div>
                <StatusChip status={proj.status} />
                <ActionMenu items={[
                  { icon: <Pencil size={13} />, label: "Edit", onClick: () => navigate({ page: "projects", sub: "edit", id: proj.id }) },
                  ...(proj.clientId ? [{ icon: <Users size={13} />, label: "View Client", onClick: () => navigate({ page: "clients", sub: "detail", id: proj.clientId }) }] : []),
                  ...statusActions,
                  { divider: true, icon: null, label: "", onClick: () => {} },
                  { icon: <Trash2 size={13} />, label: "Delete", onClick: async () => { if (await _confirmFn({ title: `Delete "${proj.name}"?`, confirmLabel: "Delete", danger: true })) onDelete(proj.id); }, danger: true },
                ]} />
              </>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProjectEditPage({ projectId, defaultClientId, clients, projects, onSave, onDelete, navigate, isMobile }) {
  const project = projects.find((p) => p.id === projectId);
  const [form, setForm] = useState(project || { clientId: defaultClientId || clients[0]?.id || "", name: "", description: "", status: "active", startDate: todayStr(), rate: "", rateType: "monthly" });
  const upd = (k, v) => setForm({ ...form, [k]: v });
  return (
    <div>
      <PageHeader title={project ? `Edit: ${project.name}` : "New Project"} backLabel="Projects" onBack={() => navigate({ page: "projects" })} isMobile={isMobile} />
      <div style={{ maxWidth: 600 }}>
        <Field label="Client"><Select value={form.clientId} onChange={(v) => upd("clientId", v)} options={clients.map((c) => ({ value: c.id, label: c.name }))} /></Field>
        <Field label="Project Name"><input style={inputStyle} value={form.name} onChange={(e) => upd("name", e.target.value)} /></Field>
        <Field label="Description"><textarea style={{ ...inputStyle, height: 60, resize: "vertical" }} value={form.description} onChange={(e) => upd("description", e.target.value)} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Rate"><input style={inputStyle} type="text" inputMode="decimal" value={form.rate} onChange={(e) => upd("rate", e.target.value)} /></Field>
          <Field label="Rate Type"><Select value={form.rateType} onChange={(v) => upd("rateType", v)} options={[{ value: "monthly", label: "Monthly" }, { value: "hourly", label: "Hourly" }, { value: "fixed", label: "Fixed" }]} /></Field>
          <Field label="Status"><Select value={form.status} onChange={(v) => upd("status", v)} options={[{ value: "active", label: "Active" }, { value: "completed", label: "Completed" }]} /></Field>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button style={btnPrimary} onClick={async () => { await onSave({ ...form, rate: parseFloat(form.rate) || 0 }); navigate({ page: "projects" }); }}>Save Project</button>
          {project && <button style={btnDanger} onClick={() => { void (async () => { if (await _confirmFn({ title: "Delete this project?", confirmLabel: "Delete", danger: true })) { onDelete(projectId); navigate({ page: "projects" }); } })() }}>Delete</button>}
          <button style={btnSecondary} onClick={() => navigate({ page: "projects" })}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAGE: INVOICES
// ============================================================
function ActionMenu({ items }: { items: Array<{ icon: any; label: string; onClick: () => void; danger?: boolean; divider?: boolean }> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        style={{ background: "none", border: "none", color: "#5E5E6E", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", borderRadius: 4 }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#7B7B88")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#5E5E6E")}>
        <MoreHorizontal size={16} />
      </button>
      <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, background: "#141416", border: "1px solid #1C1C20", borderRadius: 8, padding: 4, minWidth: 160, zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", opacity: open ? 1 : 0, transform: open ? "translateY(0)" : "translateY(-4px)", pointerEvents: open ? "auto" : "none", transition: "opacity 150ms ease, transform 150ms ease" }}>
          {items.map((item, i) => item.divider ? (
            <div key={i} style={{ borderTop: "1px solid #1C1C20", margin: "4px 0" }} />
          ) : (
            <button key={i} onClick={(e) => { e.stopPropagation(); item.onClick(); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", background: "transparent", border: "none", borderRadius: 4, color: item.danger ? "#F87171" : "#EDEDF0", fontSize: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#1A1A1E")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              {item.icon}{item.label}
            </button>
          ))}
        </div>
    </div>
  );
}

function InvoiceRowMenu({ inv, onDelete, onMarkPaid, onDuplicate, navigate }) {
  const items = [
    { icon: <Eye size={13} />, label: "Preview", onClick: () => window.open(`/invoice/${inv.viewToken}?preview`, "_blank") },
    { icon: <Pencil size={13} />, label: "Edit", onClick: () => navigate({ page: "invoices", sub: "detail", id: inv.id }) },
    ...(inv.status !== "paid" ? [{ icon: <Check size={13} />, label: "Mark as Paid", onClick: () => onMarkPaid(inv.id, todayStr()) }] : []),
    { icon: <CopyPlus size={13} />, label: "Duplicate", onClick: () => onDuplicate(inv) },
    { divider: true, icon: null, label: "", onClick: () => {} },
    { icon: <Trash2 size={13} />, label: "Delete", onClick: async () => { if (await _confirmFn({ title: "Delete this invoice?", confirmLabel: "Delete", danger: true })) onDelete(inv.id); }, danger: true },
  ];
  return <ActionMenu items={items} />;
}

function InvoicesListPage({ invoices, clients, projects, lineItems, onDelete, onMarkPaid, onDuplicate, navigate, timePeriod, onTimePeriodChange, isMobile }) {
  const [filter, setFilter] = useState("all");
  const getClientName = (id) => clients.find((c) => c.id === id)?.name || "—";

  const timeFiltered = filterByTimePeriod(invoices, "issueDate", timePeriod);
  const filtered = timeFiltered
    .filter((inv) => {
      if (filter === "all") return true;
      if (filter === "outstanding") return inv.status === "outstanding" || inv.status === "overdue";
      return inv.status === filter;
    })
    .sort((a, b) => (b.issueDate > a.issueDate ? 1 : -1));

  const outstandingCount = timeFiltered.filter((i) => i.status === "outstanding" || i.status === "overdue").length;
  const filterCounts: Record<string, number> = {
    all: timeFiltered.length,
    draft: timeFiltered.filter((i) => i.status === "draft").length,
    outstanding: outstandingCount,
    overdue: timeFiltered.filter((i) => i.status === "overdue").length,
    paid: timeFiltered.filter((i) => i.status === "paid").length,
  };

  return (
    <div>
      <PageHeader title="Invoices" actions={<button style={btnPrimary} onClick={() => navigate({ page: "invoices", sub: "new" })}><Plus size={14} />{isMobile ? "Invoice" : "New Invoice"}</button>} isMobile={isMobile} />

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, justifyContent: "space-between", alignItems: "center", flexWrap: isMobile ? "wrap" : "nowrap" }}>
        <StatusDropdown value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, ...ALL_INVOICE_STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))]} counts={filterCounts} />
        <TimePeriodFilter value={timePeriod} onChange={onTimePeriodChange} />
      </div>

      {/* Table / Cards */}
      <div style={{ borderRadius: 8, border: "1px solid #1C1C20" }}>
        {!isMobile && (
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 130px 100px 120px 80px 36px", gap: 12, padding: "10px 20px", background: "#0A0A0C", borderBottom: "1px solid #1C1C20", borderRadius: "8px 8px 0 0" }}>
            {["NUMBER", "CLIENT", "ISSUED", "DUE", "AMOUNT", "STATUS", ""].map((h) => (
              <span key={h} style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#3E3E4A" }}>{h}</span>
            ))}
          </div>
        )}
        {filtered.map((inv, idx) => (
          <div key={inv.id} onClick={() => navigate({ page: "invoices", sub: "detail", id: inv.id })}
            style={isMobile ? { padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #1C1C20" } : { display: "grid", gridTemplateColumns: "120px 1fr 130px 100px 120px 80px 36px", gap: 12, alignItems: "center", padding: "14px 20px", background: "transparent", borderBottom: "1px solid #1C1C20", cursor: "pointer" }}
            onMouseEnter={(e) => { if (!isMobile) e.currentTarget.style.background = "#141416"; }}
            onMouseLeave={(e) => { if (!isMobile) e.currentTarget.style.background = "transparent"; }}>
            {isMobile ? (<>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ color: "#EDEDF0", fontSize: 13 }}>{getClientName(inv.clientId)}</span>
                <span style={{ fontFamily: mono, fontSize: 13, color: "#EDEDF0", fontWeight: 500 }}>{formatCurrency(inv.total)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: mono, fontSize: 11, color: "#5E5E6E" }}>{inv.number} · {formatDate(inv.issueDate)}</span>
                <StatusBadge status={inv.status} />
              </div>
            </>) : (<>
              <span style={{ fontFamily: mono, fontSize: 12, color: "#7B7B88" }}>{inv.number}</span>
              <span style={{ color: "#EDEDF0", fontSize: 13 }}>{getClientName(inv.clientId)}</span>
              <span style={{ fontSize: 12, color: "#5E5E6E" }}>{formatDate(inv.issueDate)}</span>
              <span style={{ fontSize: 12, color: inv.status === "overdue" ? "#F87171" : "#5E5E6E" }}>{formatDate(inv.dueDate)}</span>
              <span style={{ fontFamily: mono, fontSize: 13, color: "#EDEDF0", fontWeight: 500 }}>{formatCurrency(inv.total)}</span>
              <StatusBadge status={inv.status} />
              <InvoiceRowMenu inv={inv} onDelete={onDelete} onMarkPaid={onMarkPaid} onDuplicate={onDuplicate} navigate={navigate} />
            </>)}
          </div>
        ))}
      </div>
    </div>
  );
}

function SendInvoiceModal({ invoice, client, onClose, onSend, settings }: { invoice: any; client: any; onClose: () => void; onSend: (r: string[]) => void; settings: Settings }) {
  const [recipients, setRecipients] = useState<string[]>(() => {
    if (invoice.recipients?.length) return [...invoice.recipients];
    return getClientEmails(client);
  });
  const [newEmail, setNewEmail] = useState("");
  const [subject, setSubject] = useState(
    settings.invoiceEmailSubject.replace("{number}", invoice.number).replace("{company}", settings.companyName)
  );
  const [message, setMessage] = useState(
    `Hi${client?.contact ? ` ${client.contact.split(" ")[0]}` : ""},\n\nPlease find your invoice ${invoice.number} for ${formatCurrency(invoice.total)}. Payment is due ${invoice.dueDate === invoice.issueDate ? "upon receipt" : `by ${formatDate(invoice.dueDate)}`}.\n\nPlease let me know if you have any questions.`
  );

  function addRecipient() {
    const email = newEmail.trim().toLowerCase();
    if (email && email.includes("@") && !recipients.includes(email)) {
      setRecipients([...recipients, email]);
      setNewEmail("");
    }
  }

  function removeRecipient(idx) {
    setRecipients(recipients.filter((_, i) => i !== idx));
  }

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    // Auto-add any email typed in the input field
    const pending = newEmail.trim().toLowerCase();
    const finalRecipients = pending && pending.includes("@") && !recipients.includes(pending)
      ? [...recipients, pending]
      : [...recipients];
    if (finalRecipients.length === 0) return;
    setRecipients(finalRecipients);
    setNewEmail("");

    setSending(true);
    setError(null);
    try {
      const result = await sendInvoiceEmail(invoice.id, finalRecipients, subject, message);
      if (result.success) {
        _toastFn("Invoice sent");
        onSend(finalRecipients);
      } else {
        setError(result.error || "Failed to send email. Please try again.");
      }
    } catch (err) {
      setError("Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal title="Send Invoice" onClose={onClose} width={520}>
      {/* Recipients */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#7B7B88", marginBottom: 6 }}>To</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {recipients.map((email, idx) => (
            <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px 4px 10px", background: "#1C1C20", borderRadius: 4, fontSize: 12, color: "#EDEDF0", border: "1px solid #1C1C20" }}>
              {email}
              <button onClick={() => removeRecipient(idx)} style={{ background: "none", border: "none", color: "#5E5E6E", cursor: "pointer", padding: "0 2px", display: "flex", alignItems: "center" }}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={{ ...inputStyle, flex: 1, fontSize: 13 }}
            placeholder="Add recipient email..."
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRecipient(); } }}
          />
          <button onClick={addRecipient} style={{ ...btnSecondary, padding: "8px 12px", display: "flex", alignItems: "center", gap: 4 }}>
            <Plus size={14} /> Add
          </button>
        </div>
        {/* Quick-add client contacts */}
        {(() => { const allEmails = getClientEmails(client); const missing = allEmails.filter((e) => !recipients.includes(e)); return missing.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
            {missing.map((email) => {
              const ac = (client?.additionalContacts || []).find((c) => c.email === email);
              const label = ac ? (ac.name || ac.role || email) : (client?.contact || email);
              return (
                <button key={email} onClick={() => setRecipients([...recipients, email])}
                  style={{ background: "none", border: "1px dashed #2A2A30", borderRadius: 4, padding: "3px 8px", fontSize: 11, color: "#4A8DB8", cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Plus size={10} />{label}
                </button>
              );
            })}
          </div>
        ) : null; })()}
      </div>

      {/* Subject */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#7B7B88", marginBottom: 6 }}>Subject</label>
        <input style={inputStyle} value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>

      {/* Message */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#7B7B88", marginBottom: 6 }}>Message</label>
        <textarea
          style={{ ...inputStyle, height: 160, resize: "vertical", lineHeight: 1.5 }}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: 12, background: "rgba(239,68,68,0.06)", borderRadius: 6, marginBottom: 20, fontSize: 12, color: "#F87171", lineHeight: 1.6, border: "1px solid rgba(239,68,68,0.20)", animation: "fadeIn 150ms ease" }}>
          {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button style={btnSecondary} onClick={onClose}>Cancel</button>
        <button
          style={{ ...btnPrimary, display: "flex", alignItems: "center", gap: 6, opacity: (recipients.length === 0 && !newEmail.trim().includes("@")) || sending ? 0.5 : 1 }}
          onClick={handleSend}
          disabled={(recipients.length === 0 && !newEmail.trim().includes("@")) || sending}
        >
          {sending ? <>Sending...</> : <><Send size={13} /> Send Invoice</>}
        </button>
      </div>
    </Modal>
  );
}

function MarkPaidModal({ onClose, onConfirm }) {
  const [paidDate, setPaidDate] = useState(todayStr());
  return (
    <Modal title="Mark as Paid" onClose={onClose} width={360}>
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#7B7B88", marginBottom: 6 }}>Payment Date</label>
        <DatePicker value={paidDate} onChange={setPaidDate} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button style={btnSecondary} onClick={onClose}>Cancel</button>
        <button style={{ ...btnPrimary, background: "rgba(61,214,140,0.22)", color: "#4ADE80" }} onClick={() => onConfirm(paidDate)}>Confirm Payment</button>
      </div>
    </Modal>
  );
}

function SendReminderModal({ invoice, client, onClose, onSend, settings }: { invoice: any; client: any; onClose: () => void; onSend: () => void; settings: Settings }) {
  const daysOverdue = Math.abs(daysBetween(invoice.dueDate, todayStr()));
  const [recipients, setRecipients] = useState<string[]>(() => {
    if (invoice.recipients?.length) return [...invoice.recipients];
    return getClientEmails(client);
  });
  const [newEmail, setNewEmail] = useState("");
  const [subject, setSubject] = useState(
    settings.reminderEmailSubject.replace("{number}", invoice.number).replace("{company}", settings.companyName)
  );
  const [message, setMessage] = useState(
    `Hi${client?.contact ? ` ${client.contact.split(" ")[0]}` : ""},\n\nThis is a friendly reminder that invoice ${invoice.number} for ${formatCurrency(invoice.total)} was due on ${formatDate(invoice.dueDate)} (${daysOverdue} days ago).\n\nPlease let me know if you have any questions or if payment has already been sent.`
  );

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addRecipient() {
    const email = newEmail.trim().toLowerCase();
    if (email && email.includes("@") && !recipients.includes(email)) {
      setRecipients([...recipients, email]);
      setNewEmail("");
    }
  }

  function removeRecipient(idx) {
    setRecipients(recipients.filter((_, i) => i !== idx));
  }

  async function handleSend() {
    const pending = newEmail.trim().toLowerCase();
    const finalRecipients = pending && pending.includes("@") && !recipients.includes(pending)
      ? [...recipients, pending]
      : [...recipients];
    if (finalRecipients.length === 0) return;
    setRecipients(finalRecipients);
    setNewEmail("");

    setSending(true);
    setError(null);
    try {
      const result = await sendReminderEmail(invoice.id, finalRecipients, subject, message);
      if (result.success) {
        _toastFn("Reminder sent");
        onSend();
      } else {
        setError(result.error || "Failed to send reminder. Please try again.");
      }
    } catch (err) {
      setError("Failed to send reminder. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal title="Send Reminder" onClose={onClose} width={520}>
      <div style={{ marginBottom: 16, padding: 12, background: "rgba(239,68,68,0.06)", borderRadius: 6, border: "1px solid #2a1a1a" }}>
        <span style={{ fontSize: 12, color: "#F87171" }}>{daysOverdue} days overdue</span>
        <span style={{ fontSize: 12, color: "#F87171", marginLeft: 12 }}>Due {formatDate(invoice.dueDate)} · {formatCurrency(invoice.total)}</span>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#7B7B88", marginBottom: 6 }}>To</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {recipients.map((email, idx) => (
            <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px 4px 10px", background: "#1C1C20", borderRadius: 4, fontSize: 12, color: "#EDEDF0", border: "1px solid #1C1C20" }}>
              {email}
              <button onClick={() => removeRecipient(idx)} style={{ background: "none", border: "none", color: "#5E5E6E", cursor: "pointer", padding: "0 2px", display: "flex", alignItems: "center" }}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={{ ...inputStyle, flex: 1, fontSize: 13 }}
            placeholder="Add recipient email..."
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRecipient(); } }}
          />
          <button onClick={addRecipient} style={{ ...btnSecondary, padding: "8px 12px", display: "flex", alignItems: "center", gap: 4 }}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#7B7B88", marginBottom: 6 }}>Subject</label>
        <input style={inputStyle} value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#7B7B88", marginBottom: 6 }}>Message</label>
        <textarea style={{ ...inputStyle, height: 160, resize: "vertical", lineHeight: 1.5 }} value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: 12, background: "rgba(239,68,68,0.06)", borderRadius: 6, marginBottom: 20, fontSize: 12, color: "#F87171", lineHeight: 1.6, border: "1px solid rgba(239,68,68,0.20)", animation: "fadeIn 150ms ease" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button style={btnSecondary} onClick={onClose}>Cancel</button>
        <button
          style={{ ...btnPrimary, display: "flex", alignItems: "center", gap: 6, opacity: recipients.length === 0 || sending ? 0.5 : 1 }}
          onClick={handleSend}
          disabled={recipients.length === 0 || sending}
        >
          {sending ? <>Sending...</> : <><Send size={13} /> Send Reminder</>}
        </button>
      </div>
    </Modal>
  );
}

function NewClientModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: "", contact: "", email: "", address: "" });
  const valid = form.name.trim().length > 0;
  return (
    <Modal title="New Client" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Field label="Company / Client Name *">
          <input autoFocus style={{ width: "100%", padding: "8px 10px", background: "#141416", border: "1px solid #2A2A30", borderRadius: 6, color: "#EDEDF0", fontSize: 14, fontFamily: "inherit", outline: "none" }}
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Corp" />
        </Field>
        <Field label="Contact Name">
          <input style={{ width: "100%", padding: "8px 10px", background: "#141416", border: "1px solid #2A2A30", borderRadius: 6, color: "#EDEDF0", fontSize: 14, fontFamily: "inherit", outline: "none" }}
            value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="Jane Smith" />
        </Field>
        <Field label="Email">
          <input style={{ width: "100%", padding: "8px 10px", background: "#141416", border: "1px solid #2A2A30", borderRadius: 6, color: "#EDEDF0", fontSize: 14, fontFamily: "inherit", outline: "none" }}
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@acme.com" />
        </Field>
        <Field label="Address">
          <input style={{ width: "100%", padding: "8px 10px", background: "#141416", border: "1px solid #2A2A30", borderRadius: 6, color: "#EDEDF0", fontSize: 14, fontFamily: "inherit", outline: "none" }}
            value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="City, State" />
        </Field>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #2A2A30", borderRadius: 6, color: "#7B7B88", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>Cancel</button>
          <button disabled={!valid} onClick={() => onCreate({ id: generateId(), name: form.name.trim(), contact: form.contact.trim(), email: form.email.trim(), address: form.address.trim(), status: "active" })}
            style={{ padding: "8px 16px", background: valid ? "#EDEDF0" : "#2A2A30", border: "none", borderRadius: 6, color: valid ? "#0A0A0C" : "#5E5E6E", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: valid ? "pointer" : "default", opacity: valid ? 1 : 0.5 }}>Create Client</button>
        </div>
      </div>
    </Modal>
  );
}

function InvoiceDetailPage({ invoiceId, invoices, clients, projects, lineItems, onSave, onSaveLineItems, onDelete, onMarkPaid, onMarkSent, onAddClient, onDuplicate, navigate, settings, isMobile }: { invoiceId: string; invoices: any[]; clients: any[]; projects: any[]; lineItems: any[]; onSave: any; onSaveLineItems: any; onDelete: any; onMarkPaid: any; onMarkSent: any; onAddClient: any; onDuplicate: any; navigate: any; settings: Settings; isMobile?: boolean }) {
  const invoice = invoices.find((i) => i.id === invoiceId);
  const client = clients.find((c) => c.id === invoice?.clientId);
  const project = projects.find((p) => p.id === invoice?.projectId);
  const invLineItems = lineItems.filter((li) => li.invoiceId === invoiceId);
  // Inline edit state — mirrors the invoice, auto-saves on blur
  const [form, setForm] = useState(invoice ? { ...invoice } : null);
  const [items, setItems] = useState(invLineItems.length > 0 ? invLineItems.map((i) => ({ ...i })) : []);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);

  // Refs to always hold the latest form/items values — fixes stale closure in persist()
  const formRef = useRef(form);
  const itemsRef = useRef(items);
  formRef.current = form;
  itemsRef.current = items;

  if (!invoice || !form) return <div style={{ color: "#5E5E6E" }}>Invoice not found.</div>;

  // Recompute status based on current dates and state
  function recomputeStatus(f) {
    if (f.status === "paid") return "paid";
    if (f.status === "draft" && !f.sentDate) return "draft";
    // Sent invoice: check if overdue
    const today = todayStr();
    return f.dueDate < today ? "overdue" : "outstanding";
  }

  const upd = (k, v) => setForm((prev) => {
    const next = { ...prev, [k]: v };
    if (k === "dueDate" || k === "issueDate") {
      next.status = recomputeStatus(next);
    }
    formRef.current = next;
    return next;
  });

  function updateItem(idx, field, value) {
    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === "quantity" || field === "rate") {
        updated[idx].amount = (parseFloat(updated[idx].quantity) || 0) * (parseFloat(updated[idx].rate) || 0);
      }
      itemsRef.current = updated;
      return updated;
    });
  }
  function addItem() { setItems((prev) => { const next = [...prev, { id: generateId(), description: "", quantity: 1, rate: 0, amount: 0 }]; itemsRef.current = next; return next; }); }
  function removeItem(idx) { if (items.length > 1) setItems((prev) => { const next = prev.filter((_, i) => i !== idx); itemsRef.current = next; return next; }); }
  const subtotal = items.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

  function persist() {
    const f = formRef.current;
    const it = itemsRef.current;
    const sub = it.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
    onSave({ ...f, subtotal: sub, tax: 0, total: sub }, it);
  }

  // Inline input style — minimal, blends with the detail view
  const inlineInput = { background: "transparent", border: "1px solid transparent", borderRadius: 4, color: "#EDEDF0", fontSize: 14, padding: "4px 6px", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" as const, transition: "border-color 120ms ease" };
  const handleInlineFocus = (e) => { e.target.style.border = "1px solid #2A2A30"; };
  const handleInlineBlur = (e) => { e.target.style.border = "1px solid transparent"; persist(); };

  return (
    <div>
      <PageHeader title={form.number} backLabel="Invoices" onBack={() => navigate({ page: "invoices" })} isMobile={isMobile} />
      {/* Top bar: Status + Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, padding: isMobile ? "8px 8px 8px 12px" : "10px 10px 10px 18px", background: "#141416", border: "1px solid #1C1C20", borderRadius: 10, flexWrap: isMobile ? "wrap" : "nowrap", gap: isMobile ? 8 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <StatusBadge
            status={form.status}
            detail={
              form.status === "paid" && form.paidDate ? formatDate(form.paidDate) :
              form.status === "overdue" ? `${Math.abs(daysBetween(form.dueDate, todayStr()))} days` :
              form.viewedDate ? `Viewed ${formatDate(form.viewedDate)}` :
              undefined
            }
          />
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {form.status === "draft" ? (<>
            <button className="act" style={{ background: "none", border: "none", borderRadius: 4, color: "#7B7B88", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, padding: "5px 10px" }} onClick={() => setShowSendModal(true)}>
              <Send size={12} /> Send
            </button>
            <a className="act" href={`/invoice/${invoice.viewToken}?preview`} target="_blank" rel="noopener noreferrer" style={{ background: "none", border: "none", borderRadius: 4, color: "#7B7B88", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", textDecoration: "none" }}><Eye size={12} /> Preview</a>
            <button className="act" style={{ background: "none", border: "none", borderRadius: 4, color: "#7B7B88", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, padding: "5px 10px" }} onClick={() => void (async () => { if (await _confirmFn({ title: "Delete this invoice?", confirmLabel: "Delete", danger: true })) { onDelete(invoiceId); navigate({ page: "invoices" }); } })()}><Trash2 size={12} /> Delete</button>
            <ActionMenu items={[
              { icon: <Check size={13} />, label: "Mark Paid", onClick: () => setShowPaidModal(true) },
              { icon: <CopyPlus size={13} />, label: "Duplicate", onClick: () => onDuplicate(invoice) },
              { icon: <Copy size={13} />, label: "Copy Link", onClick: () => { navigator.clipboard?.writeText(`${window.location.origin}/invoice/${invoice.viewToken}`); _toastFn("Link copied", "info"); } },
            ]} />
          </>) : form.status === "paid" ? (<>
            <button className="act" style={{ background: "none", border: "none", borderRadius: 4, color: "#7B7B88", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, padding: "5px 10px" }} onClick={() => {
                setForm((prev) => {
                  const revertStatus = prev.sentDate ? (prev.dueDate < todayStr() ? "overdue" : "outstanding") : "draft";
                  const next = { ...prev, status: revertStatus, paidDate: null };
                  formRef.current = next;
                  return next;
                });
                persist();
                onMarkPaid(invoice.id, null);
              }}><X size={12} /> Mark Unpaid</button>
            <button className="act" style={{ background: "none", border: "none", borderRadius: 4, color: "#7B7B88", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, padding: "5px 10px" }} onClick={() => void (async () => { if (await _confirmFn({ title: "Delete this invoice?", confirmLabel: "Delete", danger: true })) { onDelete(invoiceId); navigate({ page: "invoices" }); } })()}><Trash2 size={12} /> Delete</button>
          </>) : (<>
            <button className="act" style={{ background: "none", border: "none", borderRadius: 4, color: "#7B7B88", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, padding: "5px 10px" }} onClick={() => setShowReminderModal(true)}>
              <Send size={12} /> Send Reminder
            </button>
            <button className="act" style={{ background: "none", border: "none", borderRadius: 4, color: "#7B7B88", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, padding: "5px 10px" }} onClick={() => setShowPaidModal(true)}><Check size={12} /> Mark Paid</button>
            <button className="act" style={{ background: "none", border: "none", borderRadius: 4, color: "#7B7B88", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, padding: "5px 10px" }} onClick={() => void (async () => { if (await _confirmFn({ title: "Delete this invoice?", confirmLabel: "Delete", danger: true })) { onDelete(invoiceId); navigate({ page: "invoices" }); } })()}><Trash2 size={12} /> Delete</button>
            <ActionMenu items={[
              { icon: <Send size={13} />, label: "Resend", onClick: () => setShowSendModal(true) },
              { icon: <Eye size={13} />, label: "Preview", onClick: () => window.open(`/invoice/${invoice.viewToken}?preview`, "_blank") },
              { icon: <CopyPlus size={13} />, label: "Duplicate", onClick: () => onDuplicate(invoice) },
              { icon: <Copy size={13} />, label: "Copy Link", onClick: () => { navigator.clipboard?.writeText(`${window.location.origin}/invoice/${invoice.viewToken}`); _toastFn("Link copied", "info"); } },
            ]} />
          </>)}
        </div>
      </div>

      {/* Modals */}
      {showSendModal && (
        <SendInvoiceModal
          invoice={{ ...form }}
          client={client}
          settings={settings}
          onClose={() => setShowSendModal(false)}
          onSend={(recipients) => {
            const sentDate = todayStr();
            const updates = { recipients, status: "outstanding", sentDate };
            setForm((prev) => {
              const next = { ...prev, ...updates };
              formRef.current = next;
              return next;
            });
            persist();
            onMarkSent(invoice.id);
            setShowSendModal(false);
          }}
        />
      )}
      {showPaidModal && (
        <MarkPaidModal
          onClose={() => setShowPaidModal(false)}
          onConfirm={(paidDate) => {
            onMarkPaid(invoice.id, paidDate);
            setForm((prev) => ({ ...prev, status: "paid", paidDate }));
            setShowPaidModal(false);
          }}
        />
      )}
      {showReminderModal && (
        <SendReminderModal
          invoice={{ ...form }}
          client={client}
          settings={settings}
          onClose={() => setShowReminderModal(false)}
          onSend={() => {
            setShowReminderModal(false);
          }}
        />
      )}

      {/* New Client Modal */}
      {showNewClientModal && (
        <NewClientModal
          onClose={() => setShowNewClientModal(false)}
          onCreate={async (newClient) => {
            const newId = await onAddClient(newClient, { skipNavigate: true });
            setForm((prev) => {
              const next = { ...prev, clientId: newId || newClient.id, recipients: getClientEmails(newClient) };
              formRef.current = next;
              return next;
            });
            persist();
            setShowNewClientModal(false);
          }}
        />
      )}

      {/* Invoice Document */}
      <div style={{ background: "#0E0E11", borderRadius: 10, border: "1px solid #1C1C20", padding: isMobile ? "20px 16px" : "32px 36px", position: "relative", overflow: "hidden" }}>

        {/* Paid stamp overlay */}
        {form.status === "paid" && (
          <svg width="416" height="307" viewBox="0 0 416 307" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", top: -30, right: -30, width: 240, height: "auto", pointerEvents: "none", opacity: 0.45 }}>
            <mask id="mask0_152_2054" style={{ maskType: "luminance" }} maskUnits="userSpaceOnUse" x="0" y="0" width="416" height="307"><path d="M415.168 206.5L57.5 0L0 99.5929L357.668 306.093L415.168 206.5Z" fill="white"/></mask>
            <g mask="url(#mask0_152_2054)"><g opacity="0.204291">
              <path d="M403.162 201.299L68.0101 7.79883C62.5097 4.62319 55.4764 6.50776 52.3008 12.0081L7.80078 89.0844C4.62514 94.5847 6.50971 101.618 12.0101 104.794L347.162 298.294C352.662 301.469 359.696 299.585 362.871 294.084L407.371 217.008C410.547 211.508 408.662 204.474 403.162 201.299Z" stroke="#4ADE80" strokeWidth="3"/>
              <path d="M114.947 105.679L104.697 123.433C103.93 124.761 104.016 126.08 104.952 127.391C105.923 128.644 107.578 130.177 109.918 131.99C110.544 132.505 110.607 133.196 110.107 134.062C109.874 134.466 109.533 134.924 109.084 135.434C107.476 134.352 105.638 133.137 103.568 131.788C101.466 130.497 99.1724 129.135 96.6898 127.701C95.1886 126.835 93.4688 125.88 91.5302 124.838C89.5583 123.853 87.7018 122.935 85.9609 122.084C86.1787 121.44 86.3876 120.945 86.5876 120.599C87.0543 119.79 87.6097 119.495 88.2537 119.713C90.8297 120.584 92.6097 121.035 93.5936 121.064C94.6686 121.069 95.5394 120.494 96.206 119.339L121.656 75.2584C122.323 74.1037 122.345 72.9999 121.721 71.947C121.155 70.9273 119.8 69.6065 117.658 67.9845C117.147 67.5357 117.158 66.8494 117.692 65.9257C117.925 65.5215 118.233 65.1219 118.615 64.7266C120.165 65.7754 121.801 66.8742 123.524 68.0231C125.339 69.1475 127.054 70.1763 128.671 71.1097L140.882 78.1597C147.117 81.7597 150.943 85.9319 152.361 90.6764C153.779 95.4209 153.138 100.131 150.438 104.808C149.371 106.655 147.855 108.282 145.889 109.687C143.98 111.126 141.768 112.158 139.251 112.783C136.826 113.384 134.146 113.492 131.212 113.107C128.336 112.755 125.426 111.729 122.482 110.029L114.947 105.679ZM121.587 104.779C125.628 107.112 129.263 108.017 132.49 107.494C135.717 106.971 138.564 104.573 141.031 100.301C142.064 98.511 142.829 96.72 143.325 94.9278C143.821 93.1356 143.911 91.3788 143.596 89.6575C143.315 87.8784 142.566 86.1757 141.349 84.5496C140.133 82.9234 138.312 81.4104 135.887 80.0104L131.297 77.3604L116.997 102.129L121.587 104.779Z" fill="#4ADE80"/>
              <path d="M183.415 150.292L164.103 139.142L150.51 149.885C149.822 150.411 149.344 150.905 149.077 151.367C148.377 152.58 149.638 154.462 152.86 157.015C153.231 157.306 153.391 157.63 153.34 157.985C153.38 158.316 153.299 158.655 153.099 159.001C152.899 159.347 152.575 159.776 152.126 160.287C150.634 159.271 149.055 158.206 147.39 157.09C145.691 156.032 144.005 155.02 142.33 154.054C141.176 153.387 139.975 152.732 138.73 152.09C137.484 151.448 136.147 150.83 134.719 150.237C134.87 149.708 135.079 149.213 135.346 148.751C135.579 148.347 135.837 148.034 136.119 147.812C136.459 147.623 136.877 147.633 137.372 147.842C139.328 148.587 140.856 149.007 141.956 149.103C143.146 149.174 144.21 148.865 145.147 148.174L195.019 109.995C195.989 109.247 196.821 109.073 197.514 109.473C197.745 109.606 198.058 109.864 198.453 110.246L189.511 174.134C189.391 175.143 189.804 176.228 190.749 177.389C191.695 178.551 192.695 179.552 193.75 180.392C194.03 180.708 194.19 181.031 194.229 181.362C194.36 181.668 194.276 182.081 193.976 182.601C193.776 182.947 193.451 183.376 193.003 183.887C191.222 182.704 189.47 181.539 187.747 180.39C185.99 179.299 184.333 178.304 182.774 177.404C181.157 176.47 179.293 175.432 177.181 174.29C175.036 173.206 173.093 172.238 171.352 171.387C171.57 170.743 171.779 170.247 171.979 169.901C172.279 169.381 172.565 169.085 172.839 169.012C173.203 168.914 173.472 168.915 173.645 169.015C175.313 169.593 176.708 169.976 177.832 170.163C178.989 170.292 179.784 169.981 180.218 169.231C180.418 168.884 180.552 168.385 180.621 167.732L183.415 150.292ZM184.08 145.941L188.276 120.074L167.625 136.441L184.08 145.941Z" fill="#4ADE80"/>
              <path d="M229.014 196.016C228.347 197.17 228.285 198.212 228.827 199.14C229.402 200.011 230.653 201.311 232.58 203.039C233.091 203.488 233.113 204.117 232.646 204.925C232.446 205.272 232.122 205.7 231.673 206.211C229.95 205.062 228.226 203.913 226.503 202.764C224.747 201.673 223.06 200.661 221.444 199.728C219.885 198.828 218.136 197.857 216.198 196.814C214.283 195.863 212.456 194.962 210.715 194.111C210.933 193.467 211.142 192.972 211.342 192.625C211.808 191.817 212.364 191.522 213.008 191.74C215.435 192.602 217.186 193.036 218.261 193.04C219.336 193.045 220.207 192.47 220.873 191.316L246.324 147.235C246.99 146.08 247.053 145.039 246.511 144.11C246.003 143.124 244.752 141.824 242.758 140.211C242.445 139.953 242.314 139.647 242.365 139.291C242.416 138.936 242.542 138.585 242.742 138.239C242.942 137.892 243.266 137.464 243.715 136.953C245.38 138.069 247.103 139.217 248.884 140.4C250.756 141.557 252.443 142.569 253.944 143.436C255.387 144.269 257.049 145.191 258.93 146.2C260.902 147.184 262.816 148.135 264.673 149.053C264.455 149.697 264.246 150.192 264.046 150.539C263.546 151.405 262.974 151.729 262.33 151.511C259.936 150.591 258.185 150.157 257.077 150.21C256.002 150.205 255.131 150.78 254.464 151.935L229.014 196.016Z" fill="#4ADE80"/>
              <path d="M317.012 219.571C322.145 210.68 323.722 202.814 321.743 195.975C319.856 189.112 314.668 183.23 306.181 178.33L298.647 173.98L272.047 220.053C271.713 220.63 271.574 221.204 271.63 221.775C271.685 222.346 271.992 222.947 272.552 223.578C273.111 224.209 273.964 224.932 275.11 225.747C276.256 226.563 277.752 227.504 279.6 228.57C284.045 231.137 288.098 232.784 291.758 233.512C295.451 234.181 298.817 234.085 301.856 233.222C304.928 232.301 307.713 230.676 310.213 228.347C312.712 226.018 314.979 223.093 317.012 219.571ZM327.055 223.175C325.088 226.582 322.532 229.609 319.386 232.258C316.298 234.94 312.759 236.938 308.767 238.251C304.867 239.54 300.586 239.955 295.924 239.496C291.353 239.013 286.614 237.354 281.707 234.521L263.953 224.271C262.452 223.404 260.732 222.45 258.794 221.408C256.822 220.423 254.908 219.472 253.051 218.554C253.269 217.91 253.478 217.415 253.678 217.069C254.145 216.26 254.729 215.982 255.43 216.233C257.867 216.947 259.68 217.339 260.87 217.411C262.061 217.482 262.956 216.998 263.556 215.959L289.006 171.878C289.673 170.724 289.706 169.665 289.107 168.703C288.508 167.742 287.199 166.408 285.18 164.704C284.867 164.447 284.708 164.123 284.701 163.735C284.752 163.379 284.878 163.029 285.078 162.682C285.278 162.336 285.602 161.907 286.051 161.396C287.197 162.212 288.186 162.899 289.019 163.456C289.943 163.99 290.792 164.518 291.567 165.043C292.342 165.567 293.105 166.046 293.855 166.479C294.663 166.946 295.501 167.429 296.367 167.929L314.12 178.179C318.97 180.979 322.78 184.18 325.551 187.781C328.379 191.416 330.272 195.203 331.231 199.143C332.189 203.084 332.291 207.107 331.537 211.213C330.782 215.32 329.288 219.307 327.055 223.175Z" fill="#4ADE80"/>
            </g></g>
          </svg>
        )}

        {/* Header: Logo left, Invoice # right — Bonsai style */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: isMobile ? 40 : 120 }}>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt={settings.companyName} style={{ height: 56 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#EDEDF0", marginBottom: 4 }}>INVOICE</div>
            <div style={{ fontSize: 14, color: "#5E5E6E", fontFamily: mono }}>{form.number}</div>
          </div>
        </div>


        {/* FROM / BILL TO / DATES row */}
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 24 : 20, marginBottom: 32 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#3E3E4A", marginBottom: 8 }}>FROM</div>
            <div style={{ color: "#EDEDF0", fontSize: 14, fontWeight: 500 }}>{settings.companyName}</div>
            <div style={{ color: "#5E5E6E", fontSize: 13, lineHeight: 1.7 }}>{settings.ownerName}<br />{settings.location}<br />{settings.businessEmail}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#3E3E4A", marginBottom: 8 }}>BILL TO</div>
            <Select value={form.clientId} onChange={(v) => { if (v === "__new__") { setShowNewClientModal(true); return; } const sel = clients.find((c) => c.id === v); const newRecipients = getClientEmails(sel); setForm((prev) => { const next = { ...prev, clientId: v, recipients: newRecipients }; formRef.current = next; return next; }); persist(); }} onBlur={persist}
              options={[...clients.map((c) => ({ value: c.id, label: c.name })), { value: "__new__", label: "+ New Client" }]}
              style={{ maxWidth: 220 }}
              triggerStyle={{ fontSize: 14, fontWeight: 500, padding: "2px 0", background: "transparent", border: "none", color: "#EDEDF0", gap: 4 }} />
            {client?.contact && <div style={{ color: "#5E5E6E", fontSize: 13 }}>{client.contact}</div>}
            {client?.email && <div style={{ color: "#5E5E6E", fontSize: 13 }}>{client.email}</div>}
            {client?.address && <div style={{ color: "#5E5E6E", fontSize: 13, marginTop: 2 }}>{client.address}</div>}
            {(() => { const cp = projects.filter((p) => p.clientId === form.clientId); return cp.length > 0 ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#3E3E4A", marginBottom: 4 }}>PROJECT</div>
                <Select value={form.projectId || ""} onChange={(v) => { setForm((prev) => { const next = { ...prev, projectId: v }; formRef.current = next; return next; }); persist(); }}
                  options={[{ value: "", label: "None" }, ...cp.map((p) => ({ value: p.id, label: p.name }))]}
                  style={{ maxWidth: 220 }}
                  triggerStyle={{ fontSize: 13, padding: "2px 0", background: "transparent", border: "none", color: "#7B7B88", gap: 4 }} />
              </div>
            ) : null; })()}
            {/* Inline recipients */}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#3E3E4A", marginBottom: 4 }}>RECIPIENTS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                {(form.recipients || []).map((email, idx) => (
                  <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 6px 2px 8px", background: "#1A1A1E", borderRadius: 4, fontSize: 11, color: "#7B7B88", border: "1px solid #1C1C20" }}>
                    {email}
                    <button onClick={() => { const updated = form.recipients.filter((_, i) => i !== idx); setForm((prev) => { const next = { ...prev, recipients: updated }; formRef.current = next; return next; }); persist(); }}
                      style={{ background: "none", border: "none", color: "#3E3E4A", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}><X size={10} /></button>
                  </span>
                ))}
                <input
                  placeholder={form.recipients?.length ? "+" : "Add email..."}
                  style={{ background: "transparent", border: "none", outline: "none", color: "#7B7B88", fontSize: 11, fontFamily: "inherit", width: form.recipients?.length ? 60 : 100, padding: "2px 0" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      const email = (e.target as HTMLInputElement).value.trim().toLowerCase().replace(/,$/, "");
                      if (email && email.includes("@") && !(form.recipients || []).includes(email)) {
                        setForm((prev) => { const next = { ...prev, recipients: [...(prev.recipients || []), email] }; formRef.current = next; return next; });
                        (e.target as HTMLInputElement).value = "";
                        persist();
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const email = e.target.value.trim().toLowerCase();
                    if (email && email.includes("@") && !(form.recipients || []).includes(email)) {
                      setForm((prev) => { const next = { ...prev, recipients: [...(prev.recipients || []), email] }; formRef.current = next; return next; });
                      e.target.value = "";
                      persist();
                    }
                  }}
                />
              </div>
              {/* Quick-add client contacts */}
              {(() => { const allEmails = getClientEmails(client); const missing = allEmails.filter((e) => !(form.recipients || []).includes(e)); return missing.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
                  {missing.map((email) => {
                    const ac = (client?.additionalContacts || []).find((c) => c.email === email);
                    const label = ac ? (ac.name || ac.role || email) : (client?.contact || email);
                    return (
                      <button key={email} onClick={() => { setForm((prev) => { const next = { ...prev, recipients: [...(prev.recipients || []), email] }; formRef.current = next; return next; }); persist(); }}
                        style={{ background: "none", border: "1px dashed #2A2A30", borderRadius: 4, padding: "1px 6px", fontSize: 10, color: "#4A8DB8", cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <Plus size={8} />{label}
                      </button>
                    );
                  })}
                </div>
              ) : null; })()}
            </div>
          </div>
          <div style={{ marginLeft: isMobile ? 0 : "auto" }}>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#3E3E4A", marginBottom: 4 }}>ISSUED ON</div>
              <DatePicker value={form.issueDate} onChange={(v) => { upd("issueDate", v); persist(); }} onBlur={persist} hideChevron
                triggerStyle={{ background: "transparent", border: "none", padding: "2px 0", fontSize: 13, color: "#7B7B88", width: "auto", cursor: "pointer" }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#3E3E4A", marginBottom: 4 }}>DUE DATE</div>
              <DueDatePicker issueDate={form.issueDate} value={form.dueDate} onChange={(v) => { upd("dueDate", v); persist(); }} onBlur={persist} hideChevron dateOnly
                triggerStyle={{ background: "transparent", border: "none", padding: "2px 0", fontSize: 13, fontWeight: 600, color: form.status === "overdue" ? "#F87171" : "#EDEDF0", width: "auto", cursor: "pointer" }} />
            </div>
            {form.paidDate && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#3E3E4A", marginBottom: 4 }}>PAID</div>
                <div style={{ fontSize: 13, color: "#4ADE80" }}>{formatDate(form.paidDate)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Line Items */}
        {isMobile ? (
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "2px solid #1C1C20" }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#3E3E4A" }}>DESCRIPTION</span>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#3E3E4A" }}>AMOUNT</span>
            </div>
            {items.map((item, idx) => (
              <div key={item.id} style={{ borderBottom: "1px solid #1C1C20", padding: "10px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input style={{ ...inlineInput, color: "#EDEDF0", fontSize: 14 }} value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} onBlur={handleInlineBlur} onFocus={handleInlineFocus} placeholder="Description" />
                    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 6px" }}>
                      <input style={{ ...inlineInput, color: "#5E5E6E", fontFamily: mono, fontSize: 12, width: 30, padding: "1px 2px", textAlign: "center" }} type="text" inputMode="decimal" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} onBlur={handleInlineBlur} onFocus={handleInlineFocus} />
                      <span style={{ color: "#3E3E4A", fontSize: 12 }}>x</span>
                      <input style={{ ...inlineInput, color: "#5E5E6E", fontFamily: mono, fontSize: 12, width: 80, padding: "1px 2px" }} type="text" inputMode="decimal" value={item.rate} onChange={(e) => updateItem(idx, "rate", e.target.value)} onBlur={handleInlineBlur} onFocus={handleInlineFocus} />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, paddingTop: 4, flexShrink: 0 }}>
                    <span style={{ color: "#EDEDF0", fontSize: 14, fontWeight: 500, fontFamily: mono }}>{formatCurrency(item.amount)}</span>
                    {items.length > 1 && <button onClick={() => { removeItem(idx); persist(); }} style={{ background: "none", border: "none", color: "#3E3E4A", cursor: "pointer", fontSize: 14, padding: "4px" }}>×</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
            <thead><tr style={{ borderBottom: "2px solid #1C1C20" }}>
              <th style={{ textAlign: "left", padding: "10px 0", fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#3E3E4A" }}>DESCRIPTION</th>
              <th style={{ textAlign: "center", padding: "10px 0", fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#3E3E4A", width: 70 }}>QTY</th>
              <th style={{ textAlign: "right", padding: "10px 0", fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#3E3E4A", width: 110 }}>RATE</th>
              <th style={{ textAlign: "right", padding: "10px 0", fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#3E3E4A", width: 110 }}>AMOUNT</th>
              <th style={{ width: 32 }} />
            </tr></thead>
            <tbody>{items.map((item, idx) => (
              <tr key={item.id} style={{ borderBottom: "1px solid #1C1C20" }}>
                <td style={{ padding: "4px 0" }}>
                  <input style={{ ...inlineInput, color: "#EDEDF0" }} value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} onBlur={handleInlineBlur} onFocus={handleInlineFocus} placeholder="Description" />
                  <input style={{ ...inlineInput, color: "#5E5E6E", fontSize: 11, padding: "0px 6px 4px" }} value={item.subtext || ""} onChange={(e) => updateItem(idx, "subtext", e.target.value)} onBlur={handleInlineBlur} onFocus={handleInlineFocus} placeholder="Optional note..." />
                </td>
                <td style={{ padding: "4px 0", verticalAlign: "top" }}>
                  <input style={{ ...inlineInput, textAlign: "center", color: "#7B7B88", fontFamily: mono }} type="text" inputMode="decimal" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} onBlur={handleInlineBlur} onFocus={handleInlineFocus} />
                </td>
                <td style={{ padding: "4px 0", verticalAlign: "top" }}>
                  <input style={{ ...inlineInput, textAlign: "right", color: "#7B7B88", fontFamily: mono }} type="text" inputMode="decimal" value={item.rate} onChange={(e) => updateItem(idx, "rate", e.target.value)} onBlur={handleInlineBlur} onFocus={handleInlineFocus} />
                </td>
                <td style={{ padding: "12px 0", color: "#EDEDF0", fontSize: 14, textAlign: "right", fontWeight: 500, fontFamily: mono, verticalAlign: "top" }}>{formatCurrency(item.amount)}</td>
                <td style={{ textAlign: "center", verticalAlign: "top" }}>
                  {items.length > 1 && <button onClick={() => { removeItem(idx); persist(); }} style={{ background: "none", border: "none", color: "#3E3E4A", cursor: "pointer", fontSize: 14, padding: "4px" }}>×</button>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
        <button onClick={() => addItem()} style={{ ...btnSecondary, fontSize: 11, padding: "4px 10px", marginBottom: 24 }}>+ Add Line Item</button>

        {/* Total */}
        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 20, borderTop: "2px solid #1C1C20" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#3E3E4A", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>TOTAL DUE</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#EDEDF0", fontFamily: mono }}>{formatCurrency(subtotal)}</div>
          </div>
        </div>

        {/* Client-facing notes inside the document */}
        {(form.clientNotes || true) && (
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #1C1C20" }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#3E3E4A", marginBottom: 4 }}>CLIENT NOTES</div>
            <textarea style={{ ...inlineInput, fontSize: 13, color: "#5E5E6E", lineHeight: 1.5, height: 40, resize: "vertical" }} value={form.clientNotes || ""} onChange={(e) => upd("clientNotes", e.target.value)} onBlur={handleInlineBlur} onFocus={handleInlineFocus} placeholder="Shown on the public invoice..." />
          </div>
        )}

        {/* Payment Details */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #1C1C20" }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#3E3E4A", marginBottom: 8 }}>PAYMENT</div>
          <div style={{ fontSize: 13, color: "#5E5E6E", lineHeight: 1.8 }}>
            {settings.paymentMethodLabel}<br />
            Bank: {settings.bankName}<br />
            Checking Account Number: {settings.accountNumber}<br />
            ABA Routing Number: {settings.routingNumber}<br />
            <br />
            Late payments subject to {settings.lateFeeRate}% monthly interest.
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", paddingTop: 20, marginTop: 24, borderTop: "1px solid #1C1C20" }}>
          <a href="https://holdfast.studio" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#2A2A30", letterSpacing: "0.5px", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, textDecoration: "none" }}>{settings.companyName}<img src="/bolt-icon@2x.png" alt="⚡" width={10} height={10} style={{ opacity: 0.6 }} />{settings.location}</a>
        </div>

      </div>

      {/* Internal notes — outside the invoice document */}
      <div style={{ marginTop: 16, padding: 16, background: "#0A0A0C", borderRadius: 8, border: "1px solid #1C1C20" }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#3E3E4A", marginBottom: 4 }}>INTERNAL NOTES</div>
        <textarea style={{ ...inlineInput, fontSize: 13, color: "#5E5E6E", lineHeight: 1.5, height: 40, resize: "vertical" }} value={form.notes || ""} onChange={(e) => upd("notes", e.target.value)} onBlur={handleInlineBlur} onFocus={handleInlineFocus} placeholder="Private notes (not visible on invoice)..." />
      </div>
    </div>
  );
}

function InvoiceEditView({ invoice, invoices, clients, projects, lineItems: existingItems, onSave, onCancel, settings }: { invoice: any; invoices: any[]; clients: any[]; projects: any[]; lineItems: any; onSave: any; onCancel: any; settings: Settings }) {
  const [form, setForm] = useState(invoice ? { ...invoice } : { clientId: clients[0]?.id || "", projectId: "", status: "draft", issueDate: todayStr(), dueDate: addDays(todayStr(), settings.paymentTermsDays), notes: "", clientNotes: "", number: nextInvoiceNumber(invoices, settings.invoicePrefix), recipients: getClientEmails(clients[0]) });
  const [items, setItems] = useState(existingItems.length > 0 ? existingItems : [{ id: generateId(), description: "", quantity: 1, rate: 0, amount: 0 }]);
  const upd = (k, v) => setForm({ ...form, [k]: v });
  const clientProjects = projects.filter((p) => p.clientId === form.clientId);

  function updateItem(idx, field, value) {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === "quantity" || field === "rate") {
      updated[idx].amount = (parseFloat(updated[idx].quantity) || 0) * (parseFloat(updated[idx].rate) || 0);
    }
    setItems(updated);
  }
  function addItem() { setItems([...items, { id: generateId(), description: "", quantity: 1, rate: 0, amount: 0 }]); }
  function removeItem(idx) { if (items.length > 1) setItems(items.filter((_, i) => i !== idx)); }
  const subtotal = items.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

  return (
    <div style={{ maxWidth: 720 }}>
      <Field label="Invoice Number"><input style={{ ...inputStyle, background: "#0A0A0C", color: "#5E5E6E" }} value={form.number} readOnly /></Field>
      <Field label="Client"><Select value={form.clientId} onChange={(v) => { const sel = clients.find((c) => c.id === v); setForm({ ...form, clientId: v, projectId: "", recipients: getClientEmails(sel) }); }} options={clients.map((c) => ({ value: c.id, label: c.name }))} /></Field>
      {clientProjects.length > 0 && (
        <Field label="Project"><Select value={form.projectId} onChange={(v) => upd("projectId", v)} options={[{ value: "", label: "None" }, ...clientProjects.map((p) => ({ value: p.id, label: p.name }))]} /></Field>
      )}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
        <Field label="Issue Date"><DatePicker value={form.issueDate} onChange={(v) => upd("issueDate", v)} /></Field>
        <Field label="Due Date"><DueDatePicker issueDate={form.issueDate} value={form.dueDate} onChange={(v) => upd("dueDate", v)} /></Field>
      </div>

      {/* Line Items */}
      <div style={{ marginTop: 16, marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "#7B7B88", marginBottom: 8, letterSpacing: "0.3px" }}>LINE ITEMS</div>
        {items.map((item, idx) => (
          <div key={item.id} style={{ marginBottom: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 32px" : "1fr 70px 100px 100px 32px", gap: 8, alignItems: isMobile ? "start" : "end" }}>
              <input style={{ ...inputStyle, fontSize: 13 }} placeholder="Description" value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} />
              <input style={{ ...inputStyle, fontSize: 13, textAlign: "center" }} type="text" inputMode="decimal" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} />
              <input style={{ ...inputStyle, fontSize: 13, textAlign: "right" }} type="text" inputMode="decimal" placeholder="Rate" value={item.rate} onChange={(e) => updateItem(idx, "rate", e.target.value)} />
              <div style={{ padding: "10px 12px", fontSize: 13, color: "#7B7B88", textAlign: "right", background: "#0A0A0C", borderRadius: 6, border: "1px solid #1C1C20" }}>{formatCurrency(item.amount || 0)}</div>
              <button onClick={() => removeItem(idx)} style={{ background: "none", border: "none", color: "#5E5E6E", cursor: "pointer", fontSize: 16, padding: 0 }}>×</button>
            </div>
            <div style={{ paddingLeft: 0, marginTop: 4 }}>
              <input style={{ ...inputStyle, fontSize: 11, padding: "4px 12px", background: "#0A0A0C", border: "1px solid #1C1C20", color: "#5E5E6E" }} placeholder="Optional note (shown on invoice)" value={item.subtext || ""} onChange={(e) => updateItem(idx, "subtext", e.target.value)} />
            </div>
          </div>
        ))}
        <button onClick={addItem} style={{ ...btnSecondary, fontSize: 12, padding: "6px 12px" }}>+ Add Line Item</button>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, paddingTop: 16, borderTop: "1px solid #1C1C20" }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#5E5E6E" }}>Total</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: "#EDEDF0", fontFamily: mono }}>{formatCurrency(subtotal)}</div>
        </div>
      </div>

      <Field label="Internal Notes"><textarea style={{ ...inputStyle, height: 48, resize: "vertical" }} value={form.notes || ""} onChange={(e) => upd("notes", e.target.value)} /></Field>
      <Field label="Client-Facing Notes (shown on public invoice)"><textarea style={{ ...inputStyle, height: 48, resize: "vertical" }} value={form.clientNotes || ""} onChange={(e) => upd("clientNotes", e.target.value)} /></Field>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button style={btnPrimary} onClick={() => onSave({ ...form, subtotal, tax: 0, total: subtotal }, items)}>Save Invoice</button>
        <button style={btnSecondary} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function InvoiceNewPage({ invoices, clients, projects, onSave, navigate, settings, isMobile }: { invoices: any[]; clients: any[]; projects: any[]; onSave: any; navigate: any; settings: Settings; isMobile?: boolean }) {
  return (
    <div>
      <PageHeader title="New Invoice" backLabel="Invoices" onBack={() => navigate({ page: "invoices" })} isMobile={isMobile} />
      <InvoiceEditView invoice={null} invoices={invoices} clients={clients} projects={projects} lineItems={[]} onSave={async (inv, items) => { const newId = await onSave(inv, items); navigate({ page: "invoices", sub: "detail", id: newId }); }} onCancel={() => navigate({ page: "invoices" })} settings={settings} />
    </div>
  );
}

// ============================================================
// PAGE: EXPENSES
// ============================================================
function ExpensesListPage({ expenses, clients, navigate, timePeriod, onTimePeriodChange, onSave, onDelete, onDuplicate, isMobile }) {
  const [catFilter, setCatFilter] = useState<string[]>([]);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const catDropdownRef = useRef<HTMLDivElement>(null);
  const getClientName = (id) => clients.find((c) => c.id === id)?.name || "";

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) { if (catDropdownRef.current && !catDropdownRef.current.contains(e.target)) setCatDropdownOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const timeFiltered = filterByTimePeriod(expenses, "date", timePeriod);
  const filtered = timeFiltered
    .filter((e) => catFilter.length === 0 || catFilter.includes(e.category))
    .sort((a, b) => (b.date > a.date ? 1 : -1));

  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);

  // Category breakdown
  const catBreakdown = {};
  filtered.forEach((e) => { catBreakdown[e.category] = (catBreakdown[e.category] || 0) + e.amount; });

  // Categories with items in the time-filtered set
  const availableCategories = ALL_EXPENSE_ITEMS.filter((c) => timeFiltered.some((e) => e.category === c.value));

  const toggleCategory = (value: string) => {
    setCatFilter((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]);
  };

  const catLabel = catFilter.length === 0 ? "All Categories" : catFilter.length === 1 ? getCategoryLabel(catFilter[0]) : `${catFilter.length} categories`;

  return (
    <div>
      <PageHeader title="Expenses" actions={<button style={btnPrimary} onClick={() => navigate({ page: "expenses", sub: "new" })}><Plus size={14} />{isMobile ? "Expense" : "New Expense"}</button>} isMobile={isMobile} />

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto", gap: isMobile ? 12 : 16, marginBottom: 24, padding: isMobile ? "12px 16px" : "16px 20px", background: "#141416", borderRadius: 8, border: "1px solid #1C1C20" }}>
        <div><div style={{ fontSize: 10, color: "#5E5E6E", letterSpacing: "0.5px" }}>TOTAL ({getTimePeriodLabel(timePeriod)})</div><div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 600, color: "#EDEDF0", fontFamily: mono }}>{formatCurrency(totalFiltered)}</div></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {Object.entries(catBreakdown).map(([cat, amt]) => (
            <span key={cat} style={{ padding: "3px 8px", borderRadius: 4, fontSize: 10, background: "#1A1A1E", color: "#7B7B88", border: "1px solid #1C1C20" }}>
              {getCategoryLabel(cat)} <span style={{ fontFamily: mono, color: "#7B7B88" }}>{formatCurrency(amt)}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Category Dropdown + Time Period */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: isMobile ? 8 : 16, flexWrap: isMobile ? "wrap" : "nowrap" }}>
        <div ref={catDropdownRef} style={{ position: "relative" }}>
          <button onClick={() => setCatDropdownOpen(!catDropdownOpen)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 6, border: "1px solid #1C1C20", background: catFilter.length > 0 ? "#1A1A1E" : "transparent", color: catFilter.length > 0 ? "#EDEDF0" : "#5E5E6E", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            {catLabel} <ChevronDown size={12} />
          </button>
          {catDropdownOpen && (
            <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#141416", border: "1px solid #1C1C20", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.6)", zIndex: 100, minWidth: 220, maxHeight: 320, overflowY: "auto", padding: 4 }}>
              <button onClick={() => { setCatFilter([]); setCatDropdownOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "transparent", border: "none", borderRadius: 4, color: catFilter.length === 0 ? "#EDEDF0" : "#5E5E6E", fontSize: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#1A1A1E")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <span style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${catFilter.length === 0 ? "#EDEDF0" : "#2A2A30"}`, background: catFilter.length === 0 ? "#EDEDF0" : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{catFilter.length === 0 && <Check size={10} style={{ color: "#0A0A0C" }} />}</span>
                All ({timeFiltered.length})
              </button>
              <div style={{ height: 1, background: "#1C1C20", margin: "4px 0" }} />
              {availableCategories.map((c) => {
                const count = timeFiltered.filter((e) => e.category === c.value).length;
                const selected = catFilter.includes(c.value);
                return (
                  <button key={c.value} onClick={() => toggleCategory(c.value)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "transparent", border: "none", borderRadius: 4, color: selected ? "#EDEDF0" : "#5E5E6E", fontSize: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#1A1A1E")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <span style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${selected ? "#EDEDF0" : "#2A2A30"}`, background: selected ? "#EDEDF0" : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{selected && <Check size={10} style={{ color: "#0A0A0C" }} />}</span>
                    {c.label} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <TimePeriodFilter value={timePeriod} onChange={onTimePeriodChange} />
      </div>

      {/* Table */}
      <div style={{ borderRadius: 8, border: "1px solid #1C1C20" }}>
        {!isMobile && (
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 160px 120px 100px 36px", gap: 12, padding: "10px 20px", background: "#0A0A0C", borderBottom: "1px solid #1C1C20", borderRadius: "8px 8px 0 0" }}>
            {["DATE", "VENDOR", "DESCRIPTION", "CATEGORY", "AMOUNT", ""].map((h, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#3E3E4A", ...(h === "AMOUNT" ? { textAlign: "right" } : {}) }}>{h}</span>
            ))}
          </div>
        )}
        {filtered.map((exp, idx) => (
          <div key={exp.id} onClick={() => navigate({ page: "expenses", sub: "edit", id: exp.id })}
            style={isMobile ? { padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #1C1C20" } : { display: "grid", gridTemplateColumns: "100px 1fr 160px 120px 100px 36px", gap: 12, alignItems: "center", padding: "12px 20px", background: "transparent", borderBottom: "1px solid #1C1C20", cursor: "pointer" }}
            onMouseEnter={(e) => { if (!isMobile) e.currentTarget.style.background = "#141416"; }}
            onMouseLeave={(e) => { if (!isMobile) e.currentTarget.style.background = "transparent"; }}>
            {isMobile ? (<>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ color: "#EDEDF0", fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>{exp.vendor}{(exp.recurring === 1 || exp.recurringSourceId) && <Repeat size={11} style={{ color: "#4A8DB8", flexShrink: 0 }} />}</span>
                <span style={{ fontFamily: mono, fontSize: 13, color: "#EDEDF0", fontWeight: 500 }}>{formatCurrency(exp.amount)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#5E5E6E" }}>{formatDate(exp.date)} · {getCategoryLabel(exp.category)}</span>
              </div>
            </>) : (<>
              <span style={{ fontSize: 12, color: "#5E5E6E" }}>{formatDate(exp.date)}</span>
              <span style={{ color: "#EDEDF0", fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>{exp.vendor}{(exp.recurring === 1 || exp.recurringSourceId) && <Repeat size={11} style={{ color: "#4A8DB8", flexShrink: 0 }} />}</span>
              <span style={{ fontSize: 12, color: "#5E5E6E" }}>{exp.description}</span>
              <span style={{ fontSize: 11, color: "#5E5E6E" }}>{getCategoryLabel(exp.category)}</span>
              <span style={{ fontFamily: mono, fontSize: 13, color: "#EDEDF0", textAlign: "right" }}>{formatCurrency(exp.amount)}</span>
              <ActionMenu items={[
                { icon: <Pencil size={13} />, label: "Edit", onClick: () => navigate({ page: "expenses", sub: "edit", id: exp.id }) },
                ...(exp.recurring === 1
                  ? [{ icon: <Repeat size={13} />, label: "Stop Recurring", onClick: () => onSave({ ...exp, recurring: 0, recurringDay: null }) }]
                  : [{ icon: <Repeat size={13} />, label: "Make Recurring", onClick: () => onSave({ ...exp, recurring: 1, recurringDay: Math.min(parseInt(exp.date?.split("-")[2]) || 1, 28) }) }]),
                { icon: <CopyPlus size={13} />, label: "Duplicate", onClick: () => onDuplicate(exp) },
                { divider: true, icon: null, label: "", onClick: () => {} },
                { icon: <Trash2 size={13} />, label: "Delete", onClick: async () => { if (await _confirmFn({ title: "Delete this expense?", confirmLabel: "Delete", danger: true })) onDelete(exp.id); }, danger: true },
              ]} />
            </>)}
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpenseEditPage({ expenseId, expenses, clients, projects, onSave, onDelete, navigate, settings, isMobile }: { expenseId: string; expenses: any[]; clients: any[]; projects: any[]; onSave: any; onDelete: any; navigate: any; settings: Settings; isMobile?: boolean }) {
  const expense = expenses.find((e) => e.id === expenseId);
  const [form, setForm] = useState(expense || { date: todayStr(), vendor: "", description: "", category: "software", amount: "", clientId: "", projectId: "", notes: "", taxDeductible: settings.defaultTaxDeductible, recurring: 0, recurringDay: null });
  const upd = (k, v) => setForm({ ...form, [k]: v });
  const clientProjects = projects.filter((p) => p.clientId === form.clientId);

  return (
    <div>
      <PageHeader title={expense ? `Edit Expense` : "New Expense"} backLabel="Expenses" onBack={() => navigate({ page: "expenses" })} isMobile={isMobile} />
      <div style={{ maxWidth: 600 }}>
        {expense?.recurringSourceId && (
          <div style={{ marginBottom: 16, padding: "10px 12px", background: "rgba(52,110,150,0.08)", borderRadius: 6, border: "1px solid rgba(52,110,150,0.15)", fontSize: 12, color: "#4A8DB8", display: "flex", alignItems: "center", gap: 6 }}>
            <Repeat size={12} /> This expense was auto-generated from a recurring template. Edits apply only to this instance.
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
          <Field label="Date"><DatePicker value={form.date} onChange={(v) => upd("date", v)} /></Field>
          <Field label="Amount"><input style={inputStyle} type="text" inputMode="decimal" step="0.01" value={form.amount} onChange={(e) => upd("amount", e.target.value)} /></Field>
        </div>
        <Field label="Vendor"><input style={inputStyle} value={form.vendor} onChange={(e) => upd("vendor", e.target.value)} placeholder="Who was paid" /></Field>
        <Field label="Description"><input style={inputStyle} value={form.description} onChange={(e) => upd("description", e.target.value)} placeholder="What was it for" /></Field>
        <Field label="Category">
          <Select value={form.category} onChange={(v) => upd("category", v)} groups={EXPENSE_CATEGORIES} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
          <Field label="Client (optional)">
            <Select value={form.clientId} onChange={(v) => setForm({ ...form, clientId: v, projectId: "" })} options={[{ value: "", label: "— None —" }, ...clients.map((c) => ({ value: c.id, label: c.name }))]} placeholder="— None —" />
          </Field>
          <Field label="Project (optional)">
            <Select value={form.projectId} onChange={(v) => upd("projectId", v)} options={[{ value: "", label: "— None —" }, ...clientProjects.map((p) => ({ value: p.id, label: p.name }))]} placeholder="— None —" />
          </Field>
        </div>
        <Field label="Notes"><textarea style={{ ...inputStyle, height: 60, resize: "vertical" }} value={form.notes || ""} onChange={(e) => upd("notes", e.target.value)} /></Field>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, cursor: "pointer" }}>
          <input type="checkbox" checked={form.taxDeductible === 1} onChange={(e) => upd("taxDeductible", e.target.checked ? 1 : 0)} />
          <span style={{ fontSize: 13, color: "#7B7B88" }}>Tax deductible</span>
        </label>
        {!expense?.recurringSourceId && (
          <>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={form.recurring === 1}
                onChange={(e) => {
                  const isRecurring = e.target.checked ? 1 : 0;
                  const day = isRecurring && form.date ? Math.min(parseInt(form.date.split("-")[2]) || 1, 28) : null;
                  setForm({ ...form, recurring: isRecurring, recurringDay: day });
                }} />
              <span style={{ fontSize: 13, color: "#7B7B88", display: "flex", alignItems: "center", gap: 4 }}><Repeat size={13} /> Recurring (monthly)</span>
            </label>
            {form.recurring === 1 && (
              <div style={{ marginBottom: 16, padding: "10px 12px", background: "#0A0A0C", borderRadius: 6, fontSize: 12, color: "#5E5E6E" }}>
                This expense will auto-generate on day {form.recurringDay || "—"} of each month.
              </div>
            )}
          </>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnPrimary} onClick={async () => { await onSave({ ...form, amount: parseFloat(form.amount) || 0 }); navigate({ page: "expenses" }); }}>Save Expense</button>
          {expense && <button style={btnDanger} onClick={() => { void (async () => { if (await _confirmFn({ title: "Delete this expense?", confirmLabel: "Delete", danger: true })) { onDelete(expenseId); navigate({ page: "expenses" }); } })() }}>Delete</button>}
          <button style={btnSecondary} onClick={() => navigate({ page: "expenses" })}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAGE: REVENUE
// ============================================================
function RevenuePage({ invoices, expenses, clients, isMobile }) {
  const thisYear = new Date().getFullYear();
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const totalRevenue = paidInvoices.reduce((s, i) => s + i.total, 0);
  const ytdRevenue = paidInvoices.filter((i) => i.paidDate?.startsWith(String(thisYear))).reduce((s, i) => s + i.total, 0);
  const ytdExpenses = expenses.filter((e) => e.date?.startsWith(String(thisYear))).reduce((s, e) => s + e.amount, 0);

  const monthlyRevenue = {};
  const monthlyExpenses = {};
  paidInvoices.forEach((inv) => { if (inv.paidDate) { const key = inv.paidDate.substring(0, 7); monthlyRevenue[key] = (monthlyRevenue[key] || 0) + inv.total; } });
  expenses.forEach((exp) => { if (exp.date) { const key = exp.date.substring(0, 7); monthlyExpenses[key] = (monthlyExpenses[key] || 0) + exp.amount; } });
  const allMonths = [...new Set([...Object.keys(monthlyRevenue), ...Object.keys(monthlyExpenses)])].sort().reverse();
  const maxRevenue = Math.max(...Object.values(monthlyRevenue), 1);

  const ytdMonths = Object.keys(monthlyRevenue).filter((k) => k.startsWith(String(thisYear))).length || 1;

  return (
    <div>
      <PageHeader title="Revenue" isMobile={isMobile} />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(5, 1fr)", gap: isMobile ? 8 : 16, marginBottom: 32 }}>
        <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} sub="All time" isMobile={isMobile} />
        <StatCard label={`${thisYear} Revenue`} value={formatCurrency(ytdRevenue)} sub="Year to date" isMobile={isMobile} />
        <StatCard label="Monthly Average" value={formatCurrency(ytdRevenue / ytdMonths)} sub={String(thisYear)} isMobile={isMobile} />
        <StatCard label="YTD Expenses" value={formatCurrency(ytdExpenses)} sub={String(thisYear)} isMobile={isMobile} />
        <StatCard label="YTD Profit" value={formatCurrency(ytdRevenue - ytdExpenses)} sub={String(thisYear)} isMobile={isMobile} />
      </div>

      {/* Monthly Breakdown */}
      <h2 style={{ fontSize: 15, fontWeight: 500, color: "#7B7B88", marginBottom: 16 }}>Monthly Breakdown</h2>
      <div style={{ borderRadius: 8, border: "1px solid #1C1C20", overflow: "hidden", marginBottom: 32 }}>
        {allMonths.map((month, idx) => {
          const rev = monthlyRevenue[month] || 0;
          const exp = monthlyExpenses[month] || 0;
          const pct = (rev / maxRevenue) * 100;
          const [y, m] = month.split("-");
          const label = new Date(parseInt(y), parseInt(m) - 1).toLocaleString("en", { month: "long", year: "numeric" });
          return (
            <div key={month} style={isMobile ? { padding: "12px 16px", borderBottom: "1px solid #1C1C20" } : { display: "grid", gridTemplateColumns: "160px 1fr 120px 100px 100px", gap: 16, alignItems: "center", padding: "12px 20px", background: "transparent", borderBottom: "1px solid #1C1C20" }}>
              {isMobile ? (<>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: "#7B7B88" }}>{label}</span>
                  <span style={{ fontFamily: mono, fontSize: 14, color: "#EDEDF0", fontWeight: 500 }}>{formatCurrency(rev)}</span>
                </div>
                <div style={{ position: "relative", height: 16, background: "#0A0A0C", borderRadius: 4, overflow: "hidden", marginBottom: 4 }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: "linear-gradient(90deg, #1a3a1a, #2a5a2a)", borderRadius: 4 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: mono, fontSize: 11, color: "#F87171" }}>{exp > 0 ? `-${formatCurrency(exp)}` : ""}</span>
                  <span style={{ fontFamily: mono, fontSize: 12, color: (rev - exp) >= 0 ? "#4ADE80" : "#F87171" }}>{formatCurrency(rev - exp)}</span>
                </div>
              </>) : (<>
                <span style={{ fontSize: 13, color: "#7B7B88" }}>{label}</span>
                <div style={{ position: "relative", height: 20, background: "#0A0A0C", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: "linear-gradient(90deg, #1a3a1a, #2a5a2a)", borderRadius: 4 }} />
                </div>
                <span style={{ fontFamily: mono, fontSize: 14, color: "#EDEDF0", fontWeight: 500, textAlign: "right" }}>{formatCurrency(rev)}</span>
                <span style={{ fontFamily: mono, fontSize: 12, color: "#F87171", textAlign: "right" }}>{exp > 0 ? `-${formatCurrency(exp)}` : ""}</span>
                <span style={{ fontFamily: mono, fontSize: 12, color: (rev - exp) >= 0 ? "#4ADE80" : "#F87171", textAlign: "right" }}>{formatCurrency(rev - exp)}</span>
              </>)}
            </div>
          );
        })}
      </div>

      {/* Revenue by Client */}
      <h2 style={{ fontSize: 15, fontWeight: 500, color: "#7B7B88", marginBottom: 16 }}>Revenue by Client</h2>
      <div style={{ display: "grid", gap: 12 }}>
        {clients.map((client) => {
          const rev = paidInvoices.filter((i) => i.clientId === client.id).reduce((s, i) => s + i.total, 0);
          const paidCount = paidInvoices.filter((i) => i.clientId === client.id).length;
          if (rev === 0) return null;
          const pct = totalRevenue > 0 ? Math.round((rev / totalRevenue) * 100) : 0;
          return (
            <div key={client.id} style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", padding: isMobile ? "12px 16px" : "16px 20px", background: "#141416", borderRadius: 8, border: "1px solid #1C1C20", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 4 : 0 }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 500, color: "#EDEDF0" }}>{client.name}</span>
                <span style={{ fontSize: 12, color: "#3E3E4A", marginLeft: isMobile ? 0 : 12, display: isMobile ? "block" : "inline" }}>{paidCount} invoices · {pct}% of total</span>
              </div>
              <span style={{ fontFamily: mono, fontSize: 16, fontWeight: 600, color: "#4ADE80" }}>{formatCurrency(rev)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS PAGE
// ============================================================

const settingsTabs = [
  { key: "profile", label: "Profile" },
  { key: "business", label: "Business Info" },
  { key: "payment", label: "Payment Details" },
  { key: "invoice", label: "Invoice Defaults" },
  { key: "expenses", label: "Expense Defaults" },
];

function SettingsPage({ settings, onSave, session, isMobile }: { settings: Settings; onSave: (data: Partial<Settings>) => Promise<void>; session?: any; isMobile?: boolean }) {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div>
      <PageHeader title="Settings" isMobile={isMobile} />
      {/* Tab navigation */}
      <div style={{ display: "flex", gap: 4, background: "#0A0A0C", borderRadius: 6, padding: 2, border: "1px solid #1C1C20", marginBottom: isMobile ? 20 : 32, width: isMobile ? "100%" : "fit-content", overflowX: isMobile ? "auto" : "visible", WebkitOverflowScrolling: "touch" }}>
        {settingsTabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={activeTab !== tab.key ? "act" : ""}
            style={{ padding: isMobile ? "6px 10px" : "6px 14px", borderRadius: 4, border: "none", background: activeTab === tab.key ? "#1A1A1E" : "transparent", color: activeTab === tab.key ? "#EDEDF0" : "#3E3E4A", fontSize: isMobile ? 11 : 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", whiteSpace: "nowrap", flexShrink: 0 }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 560 }}>
        {activeTab === "profile" && <SettingsProfile settings={settings} onSave={onSave} session={session} />}
        {activeTab === "business" && <SettingsBusiness settings={settings} onSave={onSave} />}
        {activeTab === "payment" && <SettingsPayment settings={settings} onSave={onSave} />}
        {activeTab === "invoice" && <SettingsInvoice settings={settings} onSave={onSave} />}
        {activeTab === "expenses" && <SettingsExpenses settings={settings} onSave={onSave} />}
      </div>

      {/* Sign out — only on Profile tab */}
      {activeTab === "profile" && (
        <div style={{ maxWidth: 560, marginTop: 48, paddingTop: 24, borderTop: "1px solid #1C1C20" }}>
          <form action={async () => {
            sessionStorage.removeItem("hfs-route");
            const { signOut } = await import("next-auth/react");
            await signOut({ callbackUrl: "/login" });
          }}>
            <button type="submit" style={{ background: "none", border: "none", color: "#5E5E6E", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: "4px 0" }}>
              Sign Out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function SettingsSaveButton({ saving, saved }: { saving: boolean; saved: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 24 }}>
      <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
        {saving ? "Saving..." : "Save"}
      </button>
      {saved && <span style={{ fontSize: 12, color: "#4ADE80" }}>Saved</span>}
    </div>
  );
}

function SettingsProfile({ settings, onSave, session }: { settings: Settings; onSave: (data: Partial<Settings>) => Promise<void>; session?: any }) {
  const [ownerName, setOwnerName] = useState(settings.ownerName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave({ ownerName });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit}>
      {session?.user?.image && (
        <div style={{ marginBottom: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={session.user.image} alt="" style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid #1C1C20" }} />
        </div>
      )}
      <Field label="Name">
        <input style={inputStyle} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
      </Field>
      <Field label="Email">
        <input style={{ ...inputStyle, background: "#0A0A0C", color: "#5E5E6E" }} value={session?.user?.email || ""} readOnly />
      </Field>
      <SettingsSaveButton saving={saving} saved={saved} />
    </form>
  );
}

function SettingsBusiness({ settings, onSave }: { settings: Settings; onSave: (data: Partial<Settings>) => Promise<void> }) {
  const [form, setForm] = useState({
    companyName: settings.companyName,
    location: settings.location,
    businessEmail: settings.businessEmail,
    logoUrl: settings.logoUrl,
    ein: settings.ein,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const upd = (k: string, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit}>
      <Field label="Company Name">
        <input style={inputStyle} value={form.companyName} onChange={(e) => upd("companyName", e.target.value)} />
      </Field>
      <Field label="Location">
        <input style={inputStyle} value={form.location} onChange={(e) => upd("location", e.target.value)} />
      </Field>
      <Field label="Business Email">
        <input style={inputStyle} type="email" value={form.businessEmail} onChange={(e) => upd("businessEmail", e.target.value)} />
      </Field>
      <Field label="Logo URL">
        <input style={inputStyle} value={form.logoUrl} onChange={(e) => upd("logoUrl", e.target.value)} placeholder="https://..." />
      </Field>
      <Field label="EIN / Tax ID">
        <input style={inputStyle} value={form.ein} onChange={(e) => upd("ein", e.target.value)} placeholder="XX-XXXXXXX" />
      </Field>
      <SettingsSaveButton saving={saving} saved={saved} />
    </form>
  );
}

function SettingsPayment({ settings, onSave }: { settings: Settings; onSave: (data: Partial<Settings>) => Promise<void> }) {
  const [form, setForm] = useState({
    paymentMethodLabel: settings.paymentMethodLabel,
    bankName: settings.bankName,
    accountNumber: settings.accountNumber,
    routingNumber: settings.routingNumber,
    lateFeeRate: String(settings.lateFeeRate),
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const upd = (k: string, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave({ ...form, lateFeeRate: parseFloat(form.lateFeeRate) || 0 });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit}>
      <Field label="Payment Method">
        <input style={inputStyle} value={form.paymentMethodLabel} onChange={(e) => upd("paymentMethodLabel", e.target.value)} />
      </Field>
      <Field label="Bank Name">
        <input style={inputStyle} value={form.bankName} onChange={(e) => upd("bankName", e.target.value)} />
      </Field>
      <Field label="Account Number">
        <input style={inputStyle} value={form.accountNumber} onChange={(e) => upd("accountNumber", e.target.value)} />
      </Field>
      <Field label="Routing Number">
        <input style={inputStyle} value={form.routingNumber} onChange={(e) => upd("routingNumber", e.target.value)} />
      </Field>
      <Field label="Late Fee Rate">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input style={{ ...inputStyle, width: 100 }} type="number" step="0.1" min="0" value={form.lateFeeRate} onChange={(e) => upd("lateFeeRate", e.target.value)} />
          <span style={{ fontSize: 13, color: "#5E5E6E" }}>% monthly</span>
        </div>
      </Field>
      <SettingsSaveButton saving={saving} saved={saved} />
    </form>
  );
}

function SettingsInvoice({ settings, onSave }: { settings: Settings; onSave: (data: Partial<Settings>) => Promise<void> }) {
  const [form, setForm] = useState({
    paymentTermsDays: String(settings.paymentTermsDays),
    invoicePrefix: settings.invoicePrefix,
    defaultTaxRate: String(settings.defaultTaxRate),
    currency: settings.currency,
    invoiceEmailSubject: settings.invoiceEmailSubject,
    reminderEmailSubject: settings.reminderEmailSubject,
    emailSignature: settings.emailSignature,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const upd = (k: string, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  const year = new Date().getFullYear();
  const previewNumber = `${form.invoicePrefix}-${year}-001`;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave({
      ...form,
      paymentTermsDays: parseInt(form.paymentTermsDays) || 15,
      defaultTaxRate: parseFloat(form.defaultTaxRate) || 0,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit}>
      <Field label="Default Payment Terms">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input style={{ ...inputStyle, width: 80 }} type="number" min="0" value={form.paymentTermsDays} onChange={(e) => upd("paymentTermsDays", e.target.value)} />
          <span style={{ fontSize: 13, color: "#5E5E6E" }}>days</span>
        </div>
      </Field>
      <Field label="Invoice Number Prefix">
        <input style={inputStyle} value={form.invoicePrefix} onChange={(e) => upd("invoicePrefix", e.target.value)} />
        <div style={{ fontSize: 11, color: "#3E3E4A", marginTop: 4 }}>Preview: {previewNumber}</div>
      </Field>
      <Field label="Default Tax Rate">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input style={{ ...inputStyle, width: 80 }} type="number" step="0.1" min="0" value={form.defaultTaxRate} onChange={(e) => upd("defaultTaxRate", e.target.value)} />
          <span style={{ fontSize: 13, color: "#5E5E6E" }}>%</span>
        </div>
      </Field>
      <Field label="Currency">
        <Select value={form.currency} onChange={(v) => upd("currency", v)} options={[
          { value: "USD", label: "USD — US Dollar" },
          { value: "EUR", label: "EUR — Euro" },
          { value: "GBP", label: "GBP — British Pound" },
          { value: "CAD", label: "CAD — Canadian Dollar" },
          { value: "AUD", label: "AUD — Australian Dollar" },
        ]} />
      </Field>
      <Field label="Invoice Email Subject">
        <input style={inputStyle} value={form.invoiceEmailSubject} onChange={(e) => upd("invoiceEmailSubject", e.target.value)} />
        <div style={{ fontSize: 11, color: "#3E3E4A", marginTop: 4 }}>Use {"{number}"} and {"{company}"} as placeholders</div>
      </Field>
      <Field label="Reminder Email Subject">
        <input style={inputStyle} value={form.reminderEmailSubject} onChange={(e) => upd("reminderEmailSubject", e.target.value)} />
        <div style={{ fontSize: 11, color: "#3E3E4A", marginTop: 4 }}>Use {"{number}"} and {"{company}"} as placeholders</div>
      </Field>
      <Field label="Email Signature">
        <textarea style={{ ...inputStyle, height: 60, resize: "vertical" }} value={form.emailSignature} onChange={(e) => upd("emailSignature", e.target.value)} />
      </Field>
      <SettingsSaveButton saving={saving} saved={saved} />
    </form>
  );
}

function SettingsExpenses({ settings, onSave }: { settings: Settings; onSave: (data: Partial<Settings>) => Promise<void> }) {
  const [defaultTaxDeductible, setDefaultTaxDeductible] = useState(settings.defaultTaxDeductible === 1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave({ defaultTaxDeductible: defaultTaxDeductible ? 1 : 0 });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button type="button" onClick={() => setDefaultTaxDeductible(!defaultTaxDeductible)}
          style={{ width: 36, height: 20, borderRadius: 10, border: "none", background: defaultTaxDeductible ? "#EDEDF0" : "#2A2A30", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: defaultTaxDeductible ? "#0A0A0C" : "#5E5E6E", position: "absolute", top: 2, left: defaultTaxDeductible ? 18 : 2, transition: "left 0.2s, background 0.2s" }} />
        </button>
        <span style={{ fontSize: 13, color: "#EDEDF0" }}>Default new expenses as tax deductible</span>
      </div>
      <SettingsSaveButton saving={saving} saved={saved} />
    </form>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function HoldFastApp({ session: realSession }: { session?: any }) {
  const [isDemo] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo"));
  const session = isDemo ? { user: { name: "Alex Morgan", email: "alex@basecampstudio.co", image: "https://api.dicebear.com/9.x/notionists/svg?seed=alex-morgan&backgroundColor=0a0a0c" } } : realSession;
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [lineItems, setLineItems] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [settings, setSettings] = useState<Settings>({ ...SETTINGS_DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const [route, setRoute] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("hfs-route");
        if (saved) return JSON.parse(saved);
      } catch { /* ignore */ }
    }
    return { page: "dashboard" };
  });
  const [modal, setModal] = useState(null);
  const [timePeriod, setTimePeriod] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("hfs-time-period") || "year";
    return "year";
  });
  useEffect(() => { localStorage.setItem("hfs-time-period", timePeriod); }, [timePeriod]);

  // Load data from database on mount (or demo data if ?demo)
  useEffect(() => {
    if (isDemo) {
      const data = getDemoData();
      setClients(data.clients);
      setProjects(data.projects);
      setInvoices(data.invoices);
      setLineItems(data.lineItems);
      setExpenses(data.expenses);
      setProspects(data.prospects);
      setSettings(getDemoSettings() as Settings);
      setLoading(false);
      return;
    }
    Promise.all([getAllData(), getSettings()]).then(async ([data, settingsData]) => {
      setClients(data.clients);
      setProjects(data.projects);
      setLineItems(data.lineItems);
      setExpenses(data.expenses);
      setProspects(data.prospects);
      setSettings(settingsData as Settings);

      // Check for overdue invoices + backfill missing viewTokens at load time
      const today = todayStr();
      const overdueUpdates: { id: string; status: string }[] = [];
      const processedInvoices = data.invoices.map((inv) => {
        let updated = inv;
        // Migrate old "sent" status to "outstanding"
        if (inv.status === "sent") {
          updated = { ...updated, status: "outstanding" };
        }
        if (updated.status === "outstanding" && updated.dueDate < today) {
          updated = { ...updated, status: "overdue" };
          overdueUpdates.push({ id: updated.id, status: "overdue" });
        }
        if (!inv.viewToken) {
          updated = { ...updated, viewToken: (inv.id + Math.random().toString(36)).replace(/[^a-z0-9]/g, "").substring(0, 12) };
        }
        return updated;
      });
      setInvoices(processedInvoices);
      setLoading(false);

      // Persist overdue status changes to database
      for (const upd of overdueUpdates) {
        try {
          await dbUpdateInvoiceStatus(upd.id, upd.status);
        } catch (err) {
          console.error("Failed to persist overdue status for", upd.id, err);
        }
      }

      // Process recurring expenses after initial load
      try {
        const newExpenses = await dbProcessRecurring();
        if (newExpenses.length > 0) {
          setExpenses((prev) => [...prev, ...newExpenses]);
          _toastFn(`${newExpenses.length} recurring expense${newExpenses.length > 1 ? "s" : ""} processed`, "info");
        }
      } catch (err) {
        console.error("Failed to process recurring expenses:", err);
      }
    }).catch((err) => {
      console.error("Failed to load data:", err);
      setLoading(false);
    });
  }, []);

  const navigate = (r) => {
    setRoute(r);
    sessionStorage.setItem("hfs-route", JSON.stringify(r));
    setSidebarOpen(false);
  };

  // --- CRUD (async, backed by server actions — demo mode skips db calls) ---
  const _demoId = () => `demo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

  async function saveClient(data, { skipNavigate, silent } = {} as any) {
    if (data.id && clients.find((c) => c.id === data.id)) {
      const updated = isDemo ? data : await dbUpdateClient(data.id, data);
      setClients((prev) => prev.map((c) => (c.id === data.id ? { ...c, ...data, ...updated } : c)));
    } else {
      const id = _demoId();
      const newClient = isDemo ? { ...data, id, createdAt: todayStr(), updatedAt: todayStr() } : await dbCreateClient(data);
      setClients((prev) => [...prev, newClient]);
      if (!silent) _toastFn("Client created");
      if (!skipNavigate) navigate({ page: "clients", sub: "detail", id: newClient.id });
      return newClient;
    }
  }
  async function deleteClient(id) {
    if (!isDemo) await dbDeleteClient(id);
    const deleted = clients.find((c) => c.id === id);
    const deletedProjects = projects.filter((p) => p.clientId === id);
    const deletedInvoices = invoices.filter((i) => i.clientId === id);
    const deletedLineItems = lineItems.filter((li) => deletedInvoices.some((i) => i.id === li.invoiceId));
    const deletedExpenses = expenses.filter((e) => e.clientId === id);
    setClients((prev) => prev.filter((c) => c.id !== id));
    setProjects((prev) => prev.filter((p) => p.clientId !== id));
    setInvoices((prev) => prev.filter((i) => i.clientId !== id));
    setLineItems((prev) => prev.filter((li) => !deletedInvoices.some((i) => i.id === li.invoiceId)));
    setExpenses((prev) => prev.filter((e) => e.clientId !== id));
    _toastFn("Client deleted", "info", deleted ? async () => {
      if (!isDemo) { await dbCreateClient(deleted); for (const p of deletedProjects) { await dbCreateProject(p); } for (const i of deletedInvoices) { await dbCreateInvoice(i, deletedLineItems.filter((li) => li.invoiceId === i.id)); } for (const e of deletedExpenses) { await dbCreateExpense(e); } }
      setClients((prev) => [...prev, deleted]);
      setProjects((prev) => [...prev, ...deletedProjects]);
      setInvoices((prev) => [...prev, ...deletedInvoices]);
      setLineItems((prev) => [...prev, ...deletedLineItems]);
      setExpenses((prev) => [...prev, ...deletedExpenses]);
    } : undefined);
  }
  async function saveProject(data) {
    if (data.id && projects.find((p) => p.id === data.id)) {
      const updated = isDemo ? data : await dbUpdateProject(data.id, data);
      setProjects((prev) => prev.map((p) => (p.id === data.id ? { ...p, ...data, ...updated } : p)));
    } else {
      const id = _demoId();
      const newProject = isDemo ? { ...data, id, createdAt: todayStr(), updatedAt: todayStr() } : await dbCreateProject(data);
      setProjects((prev) => [...prev, newProject]);
      _toastFn("Project created");
      return newProject.id;
    }
  }
  async function deleteProject(id) {
    if (!isDemo) await dbDeleteProject(id);
    const deleted = projects.find((p) => p.id === id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    _toastFn("Project deleted", "info", deleted ? async () => {
      if (!isDemo) await dbCreateProject(deleted);
      setProjects((prev) => [...prev, deleted]);
    } : undefined);
  }
  async function saveInvoice(data, items) {
    if (data.id && invoices.find((i) => i.id === data.id)) {
      const updated = isDemo ? data : await dbUpdateInvoice(data.id, data, items);
      setInvoices((prev) => prev.map((i) => (i.id === data.id ? { ...i, ...data, ...updated } : i)));
      setLineItems((prev) => [...prev.filter((li) => li.invoiceId !== data.id), ...items.map((item) => ({ ...item, invoiceId: data.id }))]);
      return data.id;
    } else {
      const id = _demoId();
      const result = isDemo ? { ...data, id, createdAt: todayStr(), updatedAt: todayStr() } : await dbCreateInvoice(data, items);
      setInvoices((prev) => [...prev, result]);
      setLineItems((prev) => [...prev, ...items.map((item, idx) => ({ ...item, id: `${result.id}-li${idx}`, invoiceId: result.id }))]);
      _toastFn("Invoice created");
      return result.id;
    }
  }
  async function deleteInvoice(id) {
    if (!isDemo) await dbDeleteInvoice(id);
    const deleted = invoices.find((i) => i.id === id);
    const deletedItems = lineItems.filter((li) => li.invoiceId === id);
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    setLineItems((prev) => prev.filter((li) => li.invoiceId !== id));
    _toastFn("Invoice deleted", "info", deleted ? async () => {
      if (!isDemo) await dbCreateInvoice(deleted, deletedItems);
      setInvoices((prev) => [...prev, deleted]);
      setLineItems((prev) => [...prev, ...deletedItems]);
    } : undefined);
  }
  async function markPaid(id, paidDate?) {
    if (!isDemo) {
      const result = await dbMarkPaid(id, paidDate === undefined ? todayStr() : paidDate);
      if (paidDate === null) {
        setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, ...result } : i)));
        _toastFn("Invoice marked as unpaid", "info");
        return;
      }
    }
    if (paidDate === null) {
      setInvoices((prev) => prev.map((i) => {
        if (i.id !== id) return i;
        const revertStatus = i.sentDate ? (i.dueDate < todayStr() ? "overdue" : "outstanding") : "draft";
        return { ...i, status: revertStatus, paidDate: null };
      }));
      _toastFn("Invoice marked as unpaid", "info");
    } else {
      setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, status: "paid", paidDate: paidDate || todayStr() } : i)));
      _toastFn("Invoice marked as paid");
    }
  }
  async function markSent(id) {
    if (!isDemo) await dbMarkSent(id);
    setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, status: "outstanding", sentDate: todayStr() } : i)));
    _toastFn("Invoice marked as sent");
  }

  async function saveExpense(data) {
    if (data.id && expenses.find((e) => e.id === data.id)) {
      const updated = isDemo ? data : await dbUpdateExpense(data.id, data);
      setExpenses((prev) => prev.map((e) => (e.id === data.id ? { ...e, ...data, ...updated } : e)));
    } else {
      const id = _demoId();
      const newExpense = isDemo ? { ...data, id, createdAt: todayStr(), updatedAt: todayStr() } : await dbCreateExpense(data);
      setExpenses((prev) => [...prev, newExpense]);
      _toastFn("Expense created");
    }
  }
  async function deleteExpense(id) {
    if (!isDemo) await dbDeleteExpense(id);
    const deleted = expenses.find((e) => e.id === id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    _toastFn("Expense deleted", "info", deleted ? async () => {
      if (!isDemo) await dbCreateExpense(deleted);
      setExpenses((prev) => [...prev, deleted]);
    } : undefined);
  }

  async function saveProspect(data) {
    if (data.id && prospects.find((p) => p.id === data.id)) {
      const updated = isDemo ? data : await dbUpdateProspect(data.id, data);
      setProspects((prev) => prev.map((p) => (p.id === data.id ? { ...p, ...data, ...updated } : p)));
    } else {
      const id = _demoId();
      const newProspect = isDemo ? { ...data, id, createdAt: todayStr(), updatedAt: todayStr() } : await dbCreateProspect(data);
      setProspects((prev) => [...prev, newProspect]);
      _toastFn("Prospect created");
    }
  }
  async function deleteProspect(id) {
    if (!isDemo) await dbDeleteProspect(id);
    const deleted = prospects.find((p) => p.id === id);
    setProspects((prev) => prev.filter((p) => p.id !== id));
    _toastFn("Prospect deleted", "info", deleted ? async () => {
      if (!isDemo) await dbCreateProspect(deleted);
      setProspects((prev) => [...prev, deleted]);
    } : undefined);
  }
  async function convertProspectToClient(prospect) {
    const clientData = { name: prospect.company, contact: prospect.contact, email: prospect.email, status: "active" };
    const newClient = await saveClient(clientData, { skipNavigate: true, silent: true });
    const clientId = newClient?.id || clientData.id;
    await saveProspect({ ...prospect, status: "won", convertedClientId: clientId });
    _toastFn("Prospect converted to client");
    navigate({ page: "clients", sub: "detail", id: clientId });
  }

  async function saveSettings(data: Partial<Settings>) {
    const updated = isDemo ? { ...settings, ...data } : await dbUpdateSettings(data);
    setSettings(updated as Settings);
    _toastFn("Settings saved");
  }

  // --- Navigation ---
  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={15} /> },
    { key: "prospects", label: "Prospects", icon: <UserPlus size={15} /> },
    { key: "clients", label: "Clients", icon: <Users size={15} /> },
    { key: "projects", label: "Projects", icon: <FolderKanban size={15} /> },
    { key: "invoices", label: "Invoices", icon: <FileText size={15} /> },
    { key: "expenses", label: "Expenses", icon: <Receipt size={15} /> },
    { key: "revenue", label: "Revenue", icon: <TrendingUp size={15} /> },
  ];

  // --- Render Page ---
  function renderPage() {
    const { page, sub, id } = route;

    if (page === "dashboard") return <DashboardPage invoices={invoices} clients={clients} expenses={expenses} navigate={navigate} timePeriod={timePeriod} onTimePeriodChange={setTimePeriod} isMobile={isMobile} />;

    if (page === "prospects") {
      if (sub === "new") return <ProspectEditPage prospectId="new" prospects={prospects} onSave={saveProspect} onDelete={deleteProspect} onConvert={convertProspectToClient} navigate={navigate} isMobile={isMobile} />;
      if (sub === "edit" && id) return <ProspectEditPage prospectId={id} prospects={prospects} onSave={saveProspect} onDelete={deleteProspect} onConvert={convertProspectToClient} navigate={navigate} isMobile={isMobile} />;
      return <ProspectsListPage prospects={prospects} onSave={saveProspect} onDelete={deleteProspect} onConvert={convertProspectToClient} navigate={navigate} isMobile={isMobile} />;
    }

    if (page === "clients") {
      if (sub === "new") return <ClientDetailPage clientId="new" clients={clients} projects={projects} invoices={invoices} onSave={saveClient} onDelete={deleteClient} onSaveProject={saveProject} onDeleteProject={deleteProject} navigate={navigate} isMobile={isMobile} />;
      if (sub === "detail" && id) return <ClientDetailPage clientId={id} clients={clients} projects={projects} invoices={invoices} onSave={saveClient} onDelete={deleteClient} onSaveProject={saveProject} onDeleteProject={deleteProject} navigate={navigate} isMobile={isMobile} />;
      return <ClientsListPage clients={clients} projects={projects} invoices={invoices} navigate={navigate} onSave={saveClient} onDelete={deleteClient} timePeriod={timePeriod} onTimePeriodChange={setTimePeriod} isMobile={isMobile} />;
    }

    if (page === "projects") {
      if (sub === "new") return <ProjectEditPage projectId="new" defaultClientId={route.clientId} clients={clients} projects={projects} onSave={saveProject} onDelete={deleteProject} navigate={navigate} isMobile={isMobile} />;
      if (sub === "edit" && id) return <ProjectEditPage projectId={id} clients={clients} projects={projects} onSave={saveProject} onDelete={deleteProject} navigate={navigate} isMobile={isMobile} />;
      return <ProjectsListPage projects={projects} clients={clients} invoices={invoices} navigate={navigate} onSave={saveProject} onDelete={deleteProject} timePeriod={timePeriod} onTimePeriodChange={setTimePeriod} isMobile={isMobile} />;
    }

    if (page === "invoices") {
      if (sub === "new") return <InvoiceNewPage invoices={invoices} clients={clients} projects={projects} onSave={saveInvoice} navigate={navigate} settings={settings} isMobile={isMobile} />;
      const duplicateInvoice = async (inv) => { const newId = await saveInvoice({ ...inv, id: undefined, viewToken: undefined, number: nextInvoiceNumber(invoices, settings.invoicePrefix), status: "draft", sentDate: null, paidDate: null, viewedDate: null, recipients: inv.recipients || [] }, lineItems.filter((li) => li.invoiceId === inv.id).map((li) => ({ ...li, id: undefined }))); if (newId) navigate({ page: "invoices", sub: "detail", id: newId }); _toastFn("Invoice duplicated"); };
      if (sub === "detail" && id) return <InvoiceDetailPage invoiceId={id} invoices={invoices} clients={clients} projects={projects} lineItems={lineItems} onSave={saveInvoice} onDelete={deleteInvoice} onMarkPaid={markPaid} onMarkSent={markSent} onAddClient={saveClient} onDuplicate={duplicateInvoice} navigate={navigate} settings={settings} isMobile={isMobile} />;
      return <InvoicesListPage invoices={invoices} clients={clients} projects={projects} lineItems={lineItems} onDelete={deleteInvoice} onMarkPaid={markPaid} onDuplicate={duplicateInvoice} navigate={navigate} timePeriod={timePeriod} onTimePeriodChange={setTimePeriod} isMobile={isMobile} />;
    }

    if (page === "expenses") {
      if (sub === "new") return <ExpenseEditPage expenseId="new" expenses={expenses} clients={clients} projects={projects} onSave={saveExpense} onDelete={deleteExpense} navigate={navigate} settings={settings} isMobile={isMobile} />;
      if (sub === "edit" && id) return <ExpenseEditPage expenseId={id} expenses={expenses} clients={clients} projects={projects} onSave={saveExpense} onDelete={deleteExpense} navigate={navigate} settings={settings} isMobile={isMobile} />;
      return <ExpensesListPage expenses={expenses} clients={clients} navigate={navigate} timePeriod={timePeriod} onTimePeriodChange={setTimePeriod} onSave={saveExpense} onDelete={deleteExpense} onDuplicate={async (exp) => { await saveExpense({ ...exp, id: undefined, date: todayStr(), recurringSourceId: null }); }} isMobile={isMobile} />;
    }

    if (page === "revenue") return <RevenuePage invoices={invoices} expenses={expenses} clients={clients} isMobile={isMobile} />;

    if (page === "settings") return <SettingsPage settings={settings} onSave={saveSettings} session={session} isMobile={isMobile} />;

    return <DashboardPage invoices={invoices} clients={clients} expenses={expenses} navigate={navigate} timePeriod={timePeriod} onTimePeriodChange={setTimePeriod} isMobile={isMobile} />;
  }

  if (loading || isMobile === null) {
    return (
      <>
      <AnimationStyles />
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#0A0A0C", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <svg width="24" height="24" viewBox="0 0 210 210" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animation: "loaderPulse 2s ease-in-out infinite" }}>
          <rect width="210" height="210" rx="105" fill="white"/>
          <path d="M59 113.144C59 111.777 59.5924 110.387 60.7773 108.974L120.387 34.736C121.891 32.8675 123.508 31.9561 125.24 32.0016C126.972 32.0472 128.316 32.7764 129.273 34.1891C130.276 35.5563 130.322 37.402 129.41 39.7262L109.928 92.4313H146.979C148.391 92.4313 149.531 92.8643 150.396 93.7301C151.308 94.596 151.764 95.667 151.764 96.943C151.764 98.3102 151.194 99.723 150.055 101.181L90.4453 175.351C88.9414 177.22 87.3008 178.131 85.5234 178.086C83.7917 178.086 82.4473 177.379 81.4902 175.966C80.5332 174.554 80.4876 172.685 81.3535 170.361L100.904 117.656H63.8535C62.4408 117.656 61.2786 117.223 60.3672 116.357C59.4557 115.491 59 114.42 59 113.144Z" fill="black"/>
        </svg>
        <div style={{ fontSize: 10, fontWeight: 500, color: "#5E5E6E", letterSpacing: "1.5px", fontFamily: "var(--font-jetbrains-mono), monospace", textTransform: "uppercase" }}>Hold Fast OS</div>
        <div style={{ width: 120, height: 2, background: "#1C1C20", borderRadius: 1, overflow: "hidden", marginTop: 2 }}>
          <div style={{ width: "100%", height: "100%", background: "#3E3E4A", borderRadius: 1, animation: "loaderShimmer 1.2s ease-in-out infinite" }} />
        </div>
      </div>
      </>
    );
  }

  return (
    <ToastProvider>
    <ConfirmProvider>
    <AnimationStyles />
    <div style={{ display: "flex", height: "100dvh", background: "#0A0A0C", color: "#EDEDF0", fontFamily: "var(--font-inter), 'Inter', -apple-system, sans-serif", fontSize: 13 }}>
      {/* Mobile Sidebar Backdrop */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 998, animation: "fadeIn 150ms ease" }} />
      )}

      {/* Sidebar */}
      <div style={{
        width: 200, background: "#141416", borderRight: "1px solid #1C1C20", display: "flex", flexDirection: "column", flexShrink: 0,
        ...(isMobile ? { position: "fixed", top: 52, left: 0, bottom: 0, zIndex: 999, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 200ms ease" } : {})
      }}>
        {!isMobile && (
          <div onClick={() => navigate({ page: "dashboard" })} style={{ padding: "16px 20px", borderBottom: "1px solid #1C1C20", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <svg width="15" height="15" viewBox="0 0 210 210" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="210" height="210" rx="105" fill="white"/>
              <path d="M59 113.144C59 111.777 59.5924 110.387 60.7773 108.974L120.387 34.736C121.891 32.8675 123.508 31.9561 125.24 32.0016C126.972 32.0472 128.316 32.7764 129.273 34.1891C130.276 35.5563 130.322 37.402 129.41 39.7262L109.928 92.4313H146.979C148.391 92.4313 149.531 92.8643 150.396 93.7301C151.308 94.596 151.764 95.667 151.764 96.943C151.764 98.3102 151.194 99.723 150.055 101.181L90.4453 175.351C88.9414 177.22 87.3008 178.131 85.5234 178.086C83.7917 178.086 82.4473 177.379 81.4902 175.966C80.5332 174.554 80.4876 172.685 81.3535 170.361L100.904 117.656H63.8535C62.4408 117.656 61.2786 117.223 60.3672 116.357C59.4557 115.491 59 114.42 59 113.144Z" fill="black"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#EDEDF0", letterSpacing: "0.3px" }}>HOLD FAST OS</span>
          </div>
        )}
        <nav style={{ padding: "12px 8px", flex: 1 }}>
          {navItems.map((item) => {
            const isActive = route.page === item.key;
            return (
              <button key={item.key} onClick={() => navigate({ page: item.key })}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 12px", background: isActive ? "#1A1A1E" : "transparent", border: "none", borderRadius: "6px", color: isActive ? "#EDEDF0" : "#5E5E6E", fontSize: 13, fontWeight: isActive ? 500 : 400, cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all 0.15s", marginBottom: 2 }}
                onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "#1A1A1E"; e.currentTarget.style.color = "#9B9BA6"; } }}
                onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#5E5E6E"; } }}>
                <span style={{ opacity: 0.7, display: "flex" }}>{item.icon}</span>{item.label}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: "12px", borderTop: "1px solid #1C1C20" }}>
          <button onClick={() => navigate({ page: "settings" })}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 12px", background: route.page === "settings" ? "#1A1A1E" : "transparent", border: "none", borderRadius: "6px", color: route.page === "settings" ? "#EDEDF0" : "#5E5E6E", fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
            onMouseEnter={(e) => { if (route.page !== "settings") { e.currentTarget.style.background = "#1A1A1E"; e.currentTarget.style.color = "#9B9BA6"; } }}
            onMouseLeave={(e) => { if (route.page !== "settings") { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#5E5E6E"; } }}>
            {session?.user?.image ? (
              <img src={session.user.image} alt="" style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0 }} referrerPolicy="no-referrer" />
            ) : (
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#2A2A30", flexShrink: 0 }} />
            )}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session?.user?.name || "Settings"}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "16px" : "32px 40px", ...(isMobile ? { paddingTop: 60, paddingBottom: 40 } : {}) }}>
        {/* Mobile Top Bar */}
        {isMobile && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 52, background: "#0A0A0C", borderBottom: "1px solid #1C1C20", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", zIndex: 1000 }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", color: "#EDEDF0", cursor: "pointer", padding: 4, display: "flex", transition: "transform 200ms ease", transform: sidebarOpen ? "rotate(90deg)" : "rotate(0deg)" }}>
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div onClick={() => { navigate({ page: "dashboard" }); setSidebarOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <svg width="15" height="15" viewBox="0 0 210 210" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="210" height="210" rx="105" fill="white"/>
                <path d="M59 113.144C59 111.777 59.5924 110.387 60.7773 108.974L120.387 34.736C121.891 32.8675 123.508 31.9561 125.24 32.0016C126.972 32.0472 128.316 32.7764 129.273 34.1891C130.276 35.5563 130.322 37.402 129.41 39.7262L109.928 92.4313H146.979C148.391 92.4313 149.531 92.8643 150.396 93.7301C151.308 94.596 151.764 95.667 151.764 96.943C151.764 98.3102 151.194 99.723 150.055 101.181L90.4453 175.351C88.9414 177.22 87.3008 178.131 85.5234 178.086C83.7917 178.086 82.4473 177.379 81.4902 175.966C80.5332 174.554 80.4876 172.685 81.3535 170.361L100.904 117.656H63.8535C62.4408 117.656 61.2786 117.223 60.3672 116.357C59.4557 115.491 59 114.42 59 113.144Z" fill="black"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#EDEDF0", letterSpacing: "0.3px" }}>HOLD FAST OS</span>
            </div>
            <div style={{ width: 28 }} />
          </div>
        )}
        {renderPage()}
      </div>

      {/* CSV Import Modal */}
      {modal === "csvImport" && <CSVImportModal onClose={() => setModal(null)} clients={clients} invoices={invoices} onImportInvoices={(rows, mapping) => { setModal(null); }} />}
    </div>
    </ConfirmProvider>
    </ToastProvider>
  );
}

// --- CSV Import (kept as modal - it's a transient action) ---
function CSVImportModal({ onClose, clients, invoices, onImportInvoices }) {
  const [csvText, setCsvText] = useState("");
  const fileRef = useRef();
  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target.result);
    reader.readAsText(file);
  }
  return (
    <Modal title="Import CSV" onClose={onClose} width={600}>
      <p style={{ color: "#7B7B88", fontSize: 13, marginTop: 0 }}>Paste CSV data or upload a file exported from Bonsai.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button style={btnSecondary} onClick={() => fileRef.current?.click()}>Upload CSV File</button>
        <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleFile} />
      </div>
      <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder="Paste CSV content here..." style={{ ...inputStyle, height: 200, resize: "vertical", fontFamily: mono, fontSize: 12 }} />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        <button style={btnSecondary} onClick={onClose}>Cancel</button>
        <button style={btnPrimary} onClick={() => { /* TODO: parse + import */ onClose(); }}>Import</button>
      </div>
    </Modal>
  );
}
