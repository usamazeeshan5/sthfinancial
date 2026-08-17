// Minimal transactional-email helper built on Resend's REST API (no SDK needed).
//
// Configure two env vars:
//   RESEND_API_KEY — your Resend API key (Vercel → Settings → Env Variables)
//   RESEND_FROM    — verified sender, e.g. "LoveTap <noreply@lovetap.me>"
//                    (the domain must be verified in Resend's Domains tab)

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

const DEFAULT_FROM = "LoveTap <noreply@lovetap.me>";

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "email_not_configured" };
  const from = process.env.RESEND_FROM || DEFAULT_FROM;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        ...(opts.text ? { text: opts.text } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `resend_${res.status}: ${body.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send_failed" };
  }
}

// Branded password-reset email.
export function passwordResetEmail(resetUrl: string): { subject: string; html: string; text: string } {
  const subject = "Reset your LoveTap password";
  const text =
    `We received a request to reset your LoveTap password.\n\n` +
    `Reset it here (link expires in 15 minutes):\n${resetUrl}\n\n` +
    `If you didn't request this, you can safely ignore this email.`;
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111827">
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827">Reset your password</h2>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4B5563">
      We received a request to reset your LoveTap password. Tap the button below to choose a new one.
      This link expires in <b>15 minutes</b>.
    </p>
    <p style="margin:0 0 20px">
      <a href="${resetUrl}" style="display:inline-block;background:#E23744;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:12px">
        Reset password
      </a>
    </p>
    <p style="margin:0 0 6px;font-size:12px;color:#9CA3AF">Or paste this link into your browser:</p>
    <p style="margin:0 0 20px;font-size:12px;word-break:break-all;color:#6B7280">${resetUrl}</p>
    <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6">
      If you didn't request this, you can safely ignore this email — your password won't change.
    </p>
    <p style="margin:20px 0 0;font-size:12px;color:#C4C8CE">LoveTap.Me</p>
  </div>`;
  return { subject, html, text };
}
