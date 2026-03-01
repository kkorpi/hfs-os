import { Resend } from "resend";
import { readFileSync } from "fs";
import { join } from "path";

const resend = new Resend(process.env.RESEND_API_KEY);

// ── logo base64 (loaded once at startup) ─────────────────────
let _logoBase64: string | null = null;
function getLogoBase64(): string | null {
  if (_logoBase64 !== null) return _logoBase64;
  try {
    const logoPath = join(process.cwd(), "public", "logo-email@2x.png");
    const buf = readFileSync(logoPath);
    _logoBase64 = `data:image/png;base64,${buf.toString("base64")}`;
    return _logoBase64;
  } catch {
    _logoBase64 = "";
    return null;
  }
}

// ── bolt icon base64 (loaded once at startup) ────────────────
let _boltBase64: string | null = null;
function getBoltBase64(): string | null {
  if (_boltBase64 !== null) return _boltBase64;
  try {
    const boltPath = join(process.cwd(), "public", "bolt-icon@2x.png");
    const buf = readFileSync(boltPath);
    _boltBase64 = `data:image/png;base64,${buf.toString("base64")}`;
    return _boltBase64;
  } catch {
    _boltBase64 = "";
    return null;
  }
}

// ── helpers ──────────────────────────────────────────────────
function fmtCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount || 0);
}

function fmtDate(dateStr: string) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function nl2br(text: string) {
  return escapeHtml(text).replace(/\n/g, "<br>");
}

// ── send email ───────────────────────────────────────────────
export async function sendEmail(options: {
  from: string;
  to: string[];
  subject: string;
  html: string;
}) {
  const { data, error } = await resend.emails.send({
    from: options.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

// ── HTML email template ──────────────────────────────────────
export function buildInvoiceEmailHtml(options: {
  logoUrl: string;
  companyName: string;
  location: string;
  bodyText: string;
  invoiceNumber: string;
  total: number;
  dueDate: string;
  invoiceUrl: string;
  signature: string;
  isReminder?: boolean;
  daysOverdue?: number;
}): string {
  const {
    logoUrl,
    companyName,
    location,
    bodyText,
    invoiceNumber,
    total,
    dueDate,
    invoiceUrl,
    signature,
    isReminder = false,
    daysOverdue,
  } = options;

  const accent = isReminder ? "#EF4444" : "#111111";
  const buttonBg = isReminder ? "#EF4444" : "#111111";

  // Embed logo as base64 data URI for universal email client support
  const logoDataUri = getLogoBase64();
  const logoHtml = logoDataUri
    ? `<img src="${logoDataUri}" alt="${escapeHtml(companyName)}" width="120" style="display:block;width:120px;height:auto;" />`
    : `<span style="font-size:20px;font-weight:700;color:#111111;letter-spacing:-0.5px;">${escapeHtml(companyName)}</span>`;

  const dueDateColor = isReminder ? "#EF4444" : "#111111";
  const overdueHtml = isReminder && daysOverdue
    ? `<div style="font-size:12px;color:#EF4444;margin-top:2px;">${daysOverdue} days overdue</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(invoiceNumber)}</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;">
<tr><td align="center" style="padding:40px 20px;">

<!-- Main card -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">

<!-- Logo -->
<tr><td style="padding:32px 40px 0;">
  ${logoHtml}
</td></tr>

<!-- Body text -->
<tr><td style="padding:24px 40px 20px;font-size:14px;color:#333333;line-height:1.7;">
  ${nl2br(bodyText)}
</td></tr>

<!-- Invoice summary box -->
<tr><td style="padding:0 40px 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
  <tr>
    <td style="padding:16px 20px;width:33%;">
      <div style="font-size:10px;color:#999999;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Invoice</div>
      <div style="font-size:15px;color:#111111;font-weight:600;">${escapeHtml(invoiceNumber)}</div>
    </td>
    <td style="padding:16px 20px;width:33%;text-align:center;">
      <div style="font-size:10px;color:#999999;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Amount Due</div>
      <div style="font-size:15px;color:#111111;font-weight:600;">${fmtCurrency(total)}</div>
    </td>
    <td style="padding:16px 20px;width:34%;text-align:right;">
      <div style="font-size:10px;color:#999999;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Due Date</div>
      <div style="font-size:15px;color:${dueDateColor};font-weight:600;">${fmtDate(dueDate)}</div>
      ${overdueHtml}
    </td>
  </tr>
  </table>
</td></tr>

<!-- CTA button -->
<tr><td align="center" style="padding:0 40px 28px;">
  <a href="${escapeHtml(invoiceUrl)}" target="_blank" style="display:inline-block;padding:14px 40px;background-color:${buttonBg};color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;letter-spacing:0.3px;">
    View Invoice
  </a>
</td></tr>

<!-- Signature -->
<tr><td style="padding:0 40px 32px;font-size:14px;color:#333333;line-height:1.7;">
  ${nl2br(signature)}
</td></tr>

</table>
<!-- End main card -->

<!-- Footer -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="padding:24px 40px;text-align:center;font-size:11px;color:#999999;line-height:1.6;">
  <div><a href="https://holdfast.studio" target="_blank" style="color:#999999;text-decoration:none;">${escapeHtml(companyName)}${(() => { const bolt = getBoltBase64(); return bolt ? `&nbsp;<img src="${bolt}" alt="⚡" width="10" height="10" style="display:inline;vertical-align:middle;margin:0 1px;" />&nbsp;` : ' &middot; '; })()}${escapeHtml(location)}</a></div>
  <div style="margin-top:8px;color:#bbbbbb;">
    This invoice was sent from ${escapeHtml(companyName)}.
    If you believe this was sent in error, please reply to this email.
  </div>
</td></tr>
</table>

</td></tr>
</table>

</body>
</html>`;
}
