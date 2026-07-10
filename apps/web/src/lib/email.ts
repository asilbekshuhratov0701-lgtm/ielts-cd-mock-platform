export interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "IELTS Platform <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY not set — skipped "${args.subject}" to ${args.to}`);
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: args.to,
        subject: args.subject,
        html: args.html,
        text: args.text
      })
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] send failed (${res.status}): ${body}`);
      return { ok: false, error: body };
    }
    return { ok: true };
  } catch (error) {
    console.error("[email] send threw", error);
    return { ok: false, error: error instanceof Error ? error.message : "unknown" };
  }
}

export function passwordResetEmail(link: string): { subject: string; html: string; text: string } {
  const subject = "Reset your IELTS Platform password";
  const text = `We received a request to reset your password.

Open this link to choose a new one (valid for 1 hour):
${link}

If you didn't request this, you can safely ignore this email.`;
  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f1f5f9;padding:24px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px">
      <tr><td>
        <h1 style="margin:0 0 12px;font-size:20px;color:#1d4ed8">Reset your password</h1>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569">
          We received a request to reset your IELTS Platform password. Click the button below to choose a new one. This link is valid for 1 hour.
        </p>
        <a href="${link}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:10px">
          Choose a new password
        </a>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#94a3b8">
          If you didn't request this, you can safely ignore this email. For your security, the link expires after 1 hour and can be used only once.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;
  return { subject, html, text };
}
