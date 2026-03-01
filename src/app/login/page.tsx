import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0A0A0C",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#0E0E11", border: "1px solid #1C1C20", borderRadius: 12, padding: "48px 56px" }}>
        <img
          src="/logo.svg"
          alt="Hold Fast Studio"
          style={{ height: 56, marginBottom: 12 }}
        />
        <div style={{ fontSize: 11, fontWeight: 500, color: "#5E5E6E", letterSpacing: "1.5px", marginBottom: 36, fontFamily: "var(--font-jetbrains-mono), monospace", textTransform: "uppercase" }}>
          Hold Fast Operating System<span style={{ fontSize: 7, verticalAlign: "super", marginLeft: 2 }}>TM</span>
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 20px 10px 12px",
              background: "#fff",
              color: "#3c4043",
              border: "1px solid #dadce0",
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "'Roboto', 'Inter', -apple-system, sans-serif",
              letterSpacing: "0.25px",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Sign in with Google
          </button>
        </form>
      </div>
    </div>
  );
}
