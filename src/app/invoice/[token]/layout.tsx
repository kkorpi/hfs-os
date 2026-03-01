export default function InvoiceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#f5f5f5",
        color: "#111",
        overflow: "auto",
      }}
    >
      {children}
    </div>
  );
}
