import React from "react";
import { Document, Page, View, Text, Image, Font, StyleSheet } from "@react-pdf/renderer";
import { formatCurrency, formatDate } from "./format";
import path from "path";

Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fMZhrib2Bg-4.ttf", fontWeight: 500 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZhrib2Bg-4.ttf", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf", fontWeight: 700 },
  ],
});

Font.register({
  family: "JetBrains Mono",
  fonts: [
    { src: "https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPQ.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8-qxjPQ.ttf", fontWeight: 500 },
    { src: "https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8L6tjPQ.ttf", fontWeight: 700 },
  ],
});

const mono = "JetBrains Mono";

const s = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 10,
    color: "#111",
    padding: "40 48",
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 36,
  },
  logo: {
    height: 30,
  },
  invoiceTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#111",
    textAlign: "right",
    marginBottom: 3,
  },
  invoiceNumber: {
    fontSize: 10,
    color: "#666",
    fontFamily: mono,
    textAlign: "right",
  },
  metaRow: {
    flexDirection: "row",
    gap: 18,
    marginBottom: 28,
  },
  metaCol: {
    flex: 1,
  },
  label: {
    fontSize: 7,
    fontWeight: 600,
    letterSpacing: 0.8,
    color: "#999",
    marginBottom: 5,
  },
  labelSmall: {
    fontSize: 7,
    fontWeight: 600,
    letterSpacing: 0.8,
    color: "#999",
    marginBottom: 3,
  },
  metaName: {
    color: "#111",
    fontSize: 10,
    fontWeight: 500,
  },
  metaDetail: {
    color: "#666",
    fontSize: 9,
    lineHeight: 1.6,
  },
  dateValue: {
    fontSize: 9,
    color: "#444",
  },
  dateValueBold: {
    fontSize: 9,
    color: "#222",
    fontWeight: 600,
  },
  dateValuePaid: {
    fontSize: 9,
    color: "#2a8a2a",
  },
  // Table
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: "#ddd",
    paddingBottom: 6,
    paddingTop: 6,
  },
  tableHeaderText: {
    fontSize: 7,
    fontWeight: 600,
    letterSpacing: 0.8,
    color: "#999",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
    paddingVertical: 8,
  },
  colDesc: { flex: 1 },
  colQty: { width: 40, textAlign: "center" },
  colRate: { width: 70, textAlign: "right" },
  colAmount: { width: 80, textAlign: "right" },
  cellText: { fontSize: 10, color: "#333" },
  cellMuted: { fontSize: 10, color: "#666" },
  cellMono: { fontSize: 10, color: "#666", fontFamily: mono },
  cellBold: { fontSize: 10, color: "#111", fontWeight: 500, fontFamily: mono },
  // Total
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 12,
    borderTopWidth: 1.5,
    borderTopColor: "#ddd",
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 8,
    color: "#999",
    letterSpacing: 0.8,
    fontWeight: 600,
    marginBottom: 3,
    textAlign: "right",
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: 700,
    color: "#111",
    fontFamily: mono,
    textAlign: "right",
  },
  // Notes
  notesBox: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 6,
  },
  notesText: {
    fontSize: 9,
    color: "#555",
    lineHeight: 1.5,
  },
  // Payment
  paymentSection: {
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 0.5,
    borderTopColor: "#e0e0e0",
    marginBottom: 12,
  },
  paymentText: {
    fontSize: 9,
    color: "#666",
    lineHeight: 1.7,
  },
  // Footer
  footer: {
    textAlign: "center",
    paddingTop: 14,
    borderTopWidth: 0.5,
    borderTopColor: "#e0e0e0",
  },
  footerText: {
    fontSize: 8,
    color: "#bbb",
    letterSpacing: 0.4,
  },
  // Paid stamp
  paidStamp: {
    position: "absolute",
    top: 45,
    right: 30,
    transform: "rotate(-15deg)",
    borderWidth: 3,
    borderColor: "#22AD01",
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    opacity: 0.2,
  },
  paidStampText: {
    fontSize: 36,
    fontWeight: 700,
    color: "#22AD01",
    letterSpacing: 4,
  },
});

interface InvoicePDFProps {
  invoice: {
    number: string | null;
    status: string | null;
    total: number | null;
    issueDate: string | null;
    dueDate: string | null;
    paidDate: string | null;
    clientNotes: string | null;
  };
  client: {
    name: string | null;
    contact: string | null;
    email: string | null;
    address: string | null;
  } | null;
  lineItems: {
    id: string;
    description: string | null;
    quantity: number | null;
    rate: number | null;
    amount: number | null;
  }[];
  settings: {
    companyName: string;
    ownerName: string;
    location: string;
    businessEmail: string;
    paymentMethodLabel: string;
    bankName: string;
    accountNumber: string;
    routingNumber: string;
    lateFeeRate: number;
  };
}

export function InvoicePDF({ invoice, client, lineItems, settings }: InvoicePDFProps) {
  const logoPath = path.join(process.cwd(), "public", "logo-email@2x.png");

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* Paid stamp */}
        {invoice.status === "paid" && (
          <View style={s.paidStamp}>
            <Text style={s.paidStampText}>PAID</Text>
          </View>
        )}

        {/* Header */}
        <View style={s.header}>
          <Image src={logoPath} style={s.logo} />
          <View>
            <Text style={s.invoiceTitle}>INVOICE</Text>
            <Text style={s.invoiceNumber}>{invoice.number}</Text>
          </View>
        </View>

        {/* FROM / BILL TO / DATES */}
        <View style={s.metaRow}>
          <View style={s.metaCol}>
            <Text style={s.label}>FROM</Text>
            <Text style={s.metaName}>{settings.companyName}</Text>
            <Text style={s.metaDetail}>{settings.ownerName}</Text>
            <Text style={s.metaDetail}>{settings.location}</Text>
            <Text style={s.metaDetail}>{settings.businessEmail}</Text>
          </View>
          <View style={s.metaCol}>
            <Text style={s.label}>BILL TO</Text>
            <Text style={s.metaName}>{client?.name}</Text>
            {client?.contact ? <Text style={s.metaDetail}>{client.contact}</Text> : null}
            {client?.email ? <Text style={s.metaDetail}>{client.email}</Text> : null}
            {client?.address ? <Text style={{ ...s.metaDetail, color: "#999", marginTop: 4 }}>{client.address}</Text> : null}
          </View>
          <View>
            <View style={{ marginBottom: 10 }}>
              <Text style={s.labelSmall}>ISSUED ON</Text>
              <Text style={s.dateValue}>{formatDate(invoice.issueDate)}</Text>
            </View>
            <View style={{ marginBottom: 10 }}>
              <Text style={s.labelSmall}>DUE DATE</Text>
              <Text style={s.dateValueBold}>
                {invoice.dueDate === invoice.issueDate ? "Upon Receipt" : formatDate(invoice.dueDate)}
              </Text>
            </View>
            {invoice.paidDate ? (
              <View>
                <Text style={s.labelSmall}>PAID</Text>
                <Text style={s.dateValuePaid}>{formatDate(invoice.paidDate)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Line Items Table */}
        <View style={s.tableHeader}>
          <Text style={{ ...s.tableHeaderText, ...s.colDesc }}>DESCRIPTION</Text>
          <Text style={{ ...s.tableHeaderText, ...s.colQty }}>QTY</Text>
          <Text style={{ ...s.tableHeaderText, ...s.colRate, textAlign: "right" }}>RATE</Text>
          <Text style={{ ...s.tableHeaderText, ...s.colAmount, textAlign: "right" }}>AMOUNT</Text>
        </View>
        {lineItems.map((item) => (
          <View key={item.id} style={s.tableRow}>
            <Text style={{ ...s.cellText, ...s.colDesc }}>{item.description}</Text>
            <Text style={{ ...s.cellMuted, ...s.colQty, textAlign: "center" }}>{item.quantity}</Text>
            <Text style={{ ...s.cellMono, ...s.colRate, textAlign: "right" }}>{formatCurrency(item.rate)}</Text>
            <Text style={{ ...s.cellBold, ...s.colAmount, textAlign: "right" }}>{formatCurrency(item.amount)}</Text>
          </View>
        ))}

        {/* Total */}
        <View style={s.totalRow}>
          <View>
            <Text style={s.totalLabel}>TOTAL DUE</Text>
            <Text style={s.totalAmount}>{formatCurrency(invoice.total)}</Text>
          </View>
        </View>

        {/* Client Notes */}
        {invoice.clientNotes ? (
          <View style={s.notesBox}>
            <Text style={s.notesText}>{invoice.clientNotes}</Text>
          </View>
        ) : null}

        {/* Payment Terms */}
        <View style={s.paymentSection}>
          <Text style={s.label}>PAYMENT</Text>
          <Text style={s.paymentText}>{settings.paymentMethodLabel}</Text>
          <Text style={s.paymentText}>Bank: {settings.bankName}</Text>
          <Text style={s.paymentText}>Checking Account Number: {settings.accountNumber}</Text>
          <Text style={s.paymentText}>ABA Routing Number: {settings.routingNumber}</Text>
          <Text style={{ ...s.paymentText, marginTop: 8 }}>
            Late payments subject to {settings.lateFeeRate}% monthly interest.
          </Text>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            {settings.companyName}  /  {settings.location}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
