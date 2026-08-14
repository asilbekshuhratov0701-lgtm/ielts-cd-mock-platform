"use client";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          color: "#0f1a30",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          padding: "24px"
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <p
            style={{
              fontSize: "72px",
              fontWeight: 800,
              margin: 0,
              letterSpacing: "-0.02em",
              color: "#2563eb"
            }}
          >
            500
          </p>
          <h1 style={{ fontSize: "22px", margin: "8px 0 0" }}>The application could not start</h1>
          <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#5a6478", margin: "12px 0 24px" }}>
            {error.digest
              ? `Please reload the page. Quote reference ${error.digest} if you report this.`
              : "Please reload the page. If it keeps happening, contact your centre administrator."}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#2563eb",
              color: "#fff",
              border: 0,
              borderRadius: "10px",
              padding: "10px 18px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
