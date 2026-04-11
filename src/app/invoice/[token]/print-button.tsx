"use client";

import { usePathname } from "next/navigation";

export function PrintButton() {
  const pathname = usePathname();
  const token = pathname.split("/").pop();

  return (
    <a
      href={`/api/invoice/${token}/pdf`}
      download
      className="no-print"
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        background: "#111",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "'Inter', sans-serif",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        zIndex: 1000,
        textDecoration: "none",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Download PDF
    </a>
  );
}
