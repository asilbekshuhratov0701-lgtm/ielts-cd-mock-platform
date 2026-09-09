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

export type DeliveryMode = "resend" | "console" | "unconfigured";

/**
 * Without a Resend key there is nothing to send with. In development that is
 * fine — the caller prints the code to the server log instead — but in
 * production it is a misconfiguration the user has to be told about, because
 * silently "succeeding" strands anyone who has forgotten their password.
 */
export function deliveryMode(): DeliveryMode {
  if (process.env.RESEND_API_KEY) return "resend";
  return process.env.NODE_ENV === "production" ? "unconfigured" : "console";
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "ZiyoMock <onboarding@resend.dev>";

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

export function passwordCodeEmail(
  code: string,
  ttlMinutes: number
): { subject: string; html: string; text: string } {
  const subject = `${code} is your ZiyoMock password reset code`;
  const text = `Your ZiyoMock password reset code is ${code}.

Enter it on the forgot-password page to choose a new password. The code expires in ${ttlMinutes} minutes and can be used once.

If you didn't request this, you can safely ignore this email — your password stays as it is.`;
  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f1f5f9;padding:24px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px">
      <tr><td>
        <h1 style="margin:0 0 12px;font-size:20px;color:#4f46e5">Your password reset code</h1>
        <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#475569">
          Enter this code on the forgot-password page to choose a new password.
        </p>
        <div style="font-size:34px;font-weight:700;letter-spacing:.32em;text-align:center;color:#0f172a;background:#eef0fa;border-radius:12px;padding:18px 12px">
          ${code}
        </div>
        <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#475569">
          The code expires in ${ttlMinutes} minutes and can be used once.
        </p>
        <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#94a3b8">
          If you didn't request this, you can safely ignore this email — your password stays as it is.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;
  return { subject, html, text };
}
