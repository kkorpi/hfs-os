// @ts-nocheck
import { getInvoiceByToken, recordInvoiceView, getSettingsPublic } from "@/lib/actions";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount || 0);
}
function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const mono = "var(--font-jetbrains-mono), 'JetBrains Mono', monospace";

export default async function PublicInvoicePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string>> }) {
  const { token } = await params;
  const search = await searchParams;
  const isPreview = "preview" in search;

  const [data, settings] = await Promise.all([
    getInvoiceByToken(token),
    getSettingsPublic(),
  ]);
  if (!data) notFound();

  const { invoice, client, lineItems } = data;

  // Track view (skip if preview mode)
  if (!isPreview) {
    await recordInvoiceView(token);
  }

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .inv-wrapper { padding: 16px 8px !important; }
          .inv-card { padding: 24px 20px !important; }
          .inv-header { margin-bottom: 40px !important; }
          .inv-header-title { font-size: 22px !important; }
          .inv-meta-row { flex-direction: column !important; gap: 24px !important; }
          .inv-dates { margin-left: 0 !important; }
          .inv-total-amount { font-size: 28px !important; }
          .inv-col-qty, .inv-col-rate { display: none !important; }
          .inv-col-desc-sub { display: block !important; }
          .inv-paid-stamp { width: 160px !important; top: -20px !important; right: -20px !important; }
          .inv-logo { height: 40px !important; }
        }
      `}</style>
      <div className="inv-wrapper" style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: "'Inter', var(--font-inter), sans-serif", padding: "40px 20px" }}>
        <div className="inv-card" style={{ maxWidth: 800, margin: "0 auto", background: "#fff", borderRadius: 12, padding: "48px 56px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", position: "relative", overflow: "hidden" }}>
          {/* Paid stamp overlay */}
          {invoice.status === "paid" && (
            <svg className="inv-paid-stamp" width="416" height="307" viewBox="0 0 416 307" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", top: -30, right: -30, width: 240, height: "auto", pointerEvents: "none", opacity: 0.7 }}>
              <mask id="mask0_152_2054" style={{ maskType: "luminance" }} maskUnits="userSpaceOnUse" x="0" y="0" width="416" height="307"><path d="M415.168 206.5L57.5 0L0 99.5929L357.668 306.093L415.168 206.5Z" fill="white"/></mask>
              <g mask="url(#mask0_152_2054)"><g opacity="0.204291">
                <path d="M403.162 201.299L68.0101 7.79883C62.5097 4.62319 55.4764 6.50776 52.3008 12.0081L7.80078 89.0844C4.62514 94.5847 6.50971 101.618 12.0101 104.794L347.162 298.294C352.662 301.469 359.696 299.585 362.871 294.084L407.371 217.008C410.547 211.508 408.662 204.474 403.162 201.299Z" stroke="#22AD01" strokeWidth="3"/>
                <path d="M114.947 105.679L104.697 123.433C103.93 124.761 104.016 126.08 104.952 127.391C105.923 128.644 107.578 130.177 109.918 131.99C110.544 132.505 110.607 133.196 110.107 134.062C109.874 134.466 109.533 134.924 109.084 135.434C107.476 134.352 105.638 133.137 103.568 131.788C101.466 130.497 99.1724 129.135 96.6898 127.701C95.1886 126.835 93.4688 125.88 91.5302 124.838C89.5583 123.853 87.7018 122.935 85.9609 122.084C86.1787 121.44 86.3876 120.945 86.5876 120.599C87.0543 119.79 87.6097 119.495 88.2537 119.713C90.8297 120.584 92.6097 121.035 93.5936 121.064C94.6686 121.069 95.5394 120.494 96.206 119.339L121.656 75.2584C122.323 74.1037 122.345 72.9999 121.721 71.947C121.155 70.9273 119.8 69.6065 117.658 67.9845C117.147 67.5357 117.158 66.8494 117.692 65.9257C117.925 65.5215 118.233 65.1219 118.615 64.7266C120.165 65.7754 121.801 66.8742 123.524 68.0231C125.339 69.1475 127.054 70.1763 128.671 71.1097L140.882 78.1597C147.117 81.7597 150.943 85.9319 152.361 90.6764C153.779 95.4209 153.138 100.131 150.438 104.808C149.371 106.655 147.855 108.282 145.889 109.687C143.98 111.126 141.768 112.158 139.251 112.783C136.826 113.384 134.146 113.492 131.212 113.107C128.336 112.755 125.426 111.729 122.482 110.029L114.947 105.679ZM121.587 104.779C125.628 107.112 129.263 108.017 132.49 107.494C135.717 106.971 138.564 104.573 141.031 100.301C142.064 98.511 142.829 96.72 143.325 94.9278C143.821 93.1356 143.911 91.3788 143.596 89.6575C143.315 87.8784 142.566 86.1757 141.349 84.5496C140.133 82.9234 138.312 81.4104 135.887 80.0104L131.297 77.3604L116.997 102.129L121.587 104.779Z" fill="#22AD01"/>
                <path d="M183.415 150.292L164.103 139.142L150.51 149.885C149.822 150.411 149.344 150.905 149.077 151.367C148.377 152.58 149.638 154.462 152.86 157.015C153.231 157.306 153.391 157.63 153.34 157.985C153.38 158.316 153.299 158.655 153.099 159.001C152.899 159.347 152.575 159.776 152.126 160.287C150.634 159.271 149.055 158.206 147.39 157.09C145.691 156.032 144.005 155.02 142.33 154.054C141.176 153.387 139.975 152.732 138.73 152.09C137.484 151.448 136.147 150.83 134.719 150.237C134.87 149.708 135.079 149.213 135.346 148.751C135.579 148.347 135.837 148.034 136.119 147.812C136.459 147.623 136.877 147.633 137.372 147.842C139.328 148.587 140.856 149.007 141.956 149.103C143.146 149.174 144.21 148.865 145.147 148.174L195.019 109.995C195.989 109.247 196.821 109.073 197.514 109.473C197.745 109.606 198.058 109.864 198.453 110.246L189.511 174.134C189.391 175.143 189.804 176.228 190.749 177.389C191.695 178.551 192.695 179.552 193.75 180.392C194.03 180.708 194.19 181.031 194.229 181.362C194.36 181.668 194.276 182.081 193.976 182.601C193.776 182.947 193.451 183.376 193.003 183.887C191.222 182.704 189.47 181.539 187.747 180.39C185.99 179.299 184.333 178.304 182.774 177.404C181.157 176.47 179.293 175.432 177.181 174.29C175.036 173.206 173.093 172.238 171.352 171.387C171.57 170.743 171.779 170.247 171.979 169.901C172.279 169.381 172.565 169.085 172.839 169.012C173.203 168.914 173.472 168.915 173.645 169.015C175.313 169.593 176.708 169.976 177.832 170.163C178.989 170.292 179.784 169.981 180.218 169.231C180.418 168.884 180.552 168.385 180.621 167.732L183.415 150.292ZM184.08 145.941L188.276 120.074L167.625 136.441L184.08 145.941Z" fill="#22AD01"/>
                <path d="M229.014 196.016C228.347 197.17 228.285 198.212 228.827 199.14C229.402 200.011 230.653 201.311 232.58 203.039C233.091 203.488 233.113 204.117 232.646 204.925C232.446 205.272 232.122 205.7 231.673 206.211C229.95 205.062 228.226 203.913 226.503 202.764C224.747 201.673 223.06 200.661 221.444 199.728C219.885 198.828 218.136 197.857 216.198 196.814C214.283 195.863 212.456 194.962 210.715 194.111C210.933 193.467 211.142 192.972 211.342 192.625C211.808 191.817 212.364 191.522 213.008 191.74C215.435 192.602 217.186 193.036 218.261 193.04C219.336 193.045 220.207 192.47 220.873 191.316L246.324 147.235C246.99 146.08 247.053 145.039 246.511 144.11C246.003 143.124 244.752 141.824 242.758 140.211C242.445 139.953 242.314 139.647 242.365 139.291C242.416 138.936 242.542 138.585 242.742 138.239C242.942 137.892 243.266 137.464 243.715 136.953C245.38 138.069 247.103 139.217 248.884 140.4C250.756 141.557 252.443 142.569 253.944 143.436C255.387 144.269 257.049 145.191 258.93 146.2C260.902 147.184 262.816 148.135 264.673 149.053C264.455 149.697 264.246 150.192 264.046 150.539C263.546 151.405 262.974 151.729 262.33 151.511C259.936 150.591 258.185 150.157 257.077 150.21C256.002 150.205 255.131 150.78 254.464 151.935L229.014 196.016Z" fill="#22AD01"/>
                <path d="M317.012 219.571C322.145 210.68 323.722 202.814 321.743 195.975C319.856 189.112 314.668 183.23 306.181 178.33L298.647 173.98L272.047 220.053C271.713 220.63 271.574 221.204 271.63 221.775C271.685 222.346 271.992 222.947 272.552 223.578C273.111 224.209 273.964 224.932 275.11 225.747C276.256 226.563 277.752 227.504 279.6 228.57C284.045 231.137 288.098 232.784 291.758 233.512C295.451 234.181 298.817 234.085 301.856 233.222C304.928 232.301 307.713 230.676 310.213 228.347C312.712 226.018 314.979 223.093 317.012 219.571ZM327.055 223.175C325.088 226.582 322.532 229.609 319.386 232.258C316.298 234.94 312.759 236.938 308.767 238.251C304.867 239.54 300.586 239.955 295.924 239.496C291.353 239.013 286.614 237.354 281.707 234.521L263.953 224.271C262.452 223.404 260.732 222.45 258.794 221.408C256.822 220.423 254.908 219.472 253.051 218.554C253.269 217.91 253.478 217.415 253.678 217.069C254.145 216.26 254.729 215.982 255.43 216.233C257.867 216.947 259.68 217.339 260.87 217.411C262.061 217.482 262.956 216.998 263.556 215.959L289.006 171.878C289.673 170.724 289.706 169.665 289.107 168.703C288.508 167.742 287.199 166.408 285.18 164.704C284.867 164.447 284.708 164.123 284.701 163.735C284.752 163.379 284.878 163.029 285.078 162.682C285.278 162.336 285.602 161.907 286.051 161.396C287.197 162.212 288.186 162.899 289.019 163.456C289.943 163.99 290.792 164.518 291.567 165.043C292.342 165.567 293.105 166.046 293.855 166.479C294.663 166.946 295.501 167.429 296.367 167.929L314.12 178.179C318.97 180.979 322.78 184.18 325.551 187.781C328.379 191.416 330.272 195.203 331.231 199.143C332.189 203.084 332.291 207.107 331.537 211.213C330.782 215.32 329.288 219.307 327.055 223.175Z" fill="#22AD01"/>
              </g></g>
            </svg>
          )}

          {/* Header: Logo left, Invoice # right */}
          <div className="inv-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 96 }}>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="inv-logo" src="/logo.svg" alt={settings.companyName} style={{ height: 56 }} />
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="inv-header-title" style={{ fontSize: 28, fontWeight: 700, color: "#111", marginBottom: 4 }}>INVOICE</div>
              <div style={{ fontSize: 14, color: "#666", fontFamily: mono }}>{invoice.number}</div>
            </div>
          </div>

          {/* FROM / BILL TO / DATES — 3-column Bonsai layout */}
          <div className="inv-meta-row" style={{ display: "flex", gap: 24, marginBottom: 40 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#999", marginBottom: 8 }}>FROM</div>
              <div style={{ color: "#111", fontSize: 14, fontWeight: 500 }}>{settings.companyName}</div>
              <div style={{ color: "#666", fontSize: 13, lineHeight: 1.7 }}>{settings.ownerName}<br />{settings.location}<br />{settings.businessEmail}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#999", marginBottom: 8 }}>BILL TO</div>
              <div style={{ color: "#111", fontSize: 14, fontWeight: 500 }}>{client?.name}</div>
              {client?.contact && <div style={{ color: "#666", fontSize: 13 }}>{client.contact}</div>}
              {client?.email && <div style={{ color: "#666", fontSize: 13 }}>{client.email}</div>}
              {client?.address && <div style={{ color: "#999", fontSize: 13, marginTop: 4 }}>{client.address}</div>}
            </div>
            <div className="inv-dates" style={{ marginLeft: "auto" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#999", marginBottom: 4 }}>ISSUED ON</div>
                <div style={{ fontSize: 13, color: "#444" }}>{formatDate(invoice.issueDate)}</div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#999", marginBottom: 4 }}>DUE DATE</div>
                <div style={{ fontSize: 13, color: "#222", fontWeight: 600 }}>{invoice.dueDate === invoice.issueDate ? "Upon Receipt" : formatDate(invoice.dueDate)}</div>
              </div>
              {invoice.paidDate && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#999", marginBottom: 4 }}>PAID</div>
                  <div style={{ fontSize: 13, color: "#2a8a2a" }}>{formatDate(invoice.paidDate)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Line Items */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 32 }}>
            <thead><tr style={{ borderBottom: "2px solid #ddd" }}>
              <th style={{ textAlign: "left", padding: "10px 0", fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#999" }}>DESCRIPTION</th>
              <th className="inv-col-qty" style={{ textAlign: "center", padding: "10px 0", fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#999", width: 60 }}>QTY</th>
              <th className="inv-col-rate" style={{ textAlign: "right", padding: "10px 0", fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#999", width: 100 }}>RATE</th>
              <th style={{ textAlign: "right", padding: "10px 0", fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#999", width: 120 }}>AMOUNT</th>
            </tr></thead>
            <tbody>{lineItems.map((item) => (
              <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "14px 0" }}>
                  <div style={{ color: "#333", fontSize: 14 }}>{item.description}</div>
                  <div className="inv-col-desc-sub" style={{ display: "none", color: "#999", fontSize: 12, marginTop: 2 }}>{item.quantity} x {formatCurrency(item.rate)}</div>
                </td>
                <td className="inv-col-qty" style={{ padding: "14px 0", color: "#666", fontSize: 14, textAlign: "center" }}>{item.quantity}</td>
                <td className="inv-col-rate" style={{ padding: "14px 0", color: "#666", fontSize: 14, textAlign: "right", fontFamily: mono }}>{formatCurrency(item.rate)}</td>
                <td style={{ padding: "14px 0", color: "#111", fontSize: 14, textAlign: "right", fontWeight: 500, fontFamily: mono }}>{formatCurrency(item.amount)}</td>
              </tr>
            ))}</tbody>
          </table>

          {/* Total */}
          <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 20, borderTop: "2px solid #ddd", marginBottom: 32 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#999", letterSpacing: "1px", fontWeight: 600, marginBottom: 4 }}>TOTAL DUE</div>
              <div className="inv-total-amount" style={{ fontSize: 36, fontWeight: 700, color: "#111", fontFamily: mono }}>{formatCurrency(invoice.total)}</div>
            </div>
          </div>

          {invoice.clientNotes && (
            <div style={{ marginBottom: 24, padding: 16, background: "#f5f5f5", borderRadius: 8 }}>
              <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>{invoice.clientNotes}</div>
            </div>
          )}

          {/* Payment Terms */}
          <div style={{ padding: "20px 0", borderTop: "1px solid #e0e0e0", marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#999", marginBottom: 8 }}>PAYMENT</div>
            <div style={{ fontSize: 13, color: "#666", lineHeight: 1.8 }}>
              {settings.paymentMethodLabel}<br />
              Bank: {settings.bankName}<br />
              Checking Account Number: {settings.accountNumber}<br />
              ABA Routing Number: {settings.routingNumber}<br />
              <br />
              Late payments subject to {settings.lateFeeRate}% monthly interest.
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: "center", paddingTop: 20, borderTop: "1px solid #e0e0e0" }}>
            <a href="https://holdfast.studio" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#bbb", letterSpacing: "0.5px", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, textDecoration: "none" }}>{settings.companyName}<img src="/bolt-icon@2x.png" alt="" width={10} height={10} style={{ opacity: 0.5 }} />{settings.location}</a>
          </div>
        </div>
      </div>
    </>
  );
}
