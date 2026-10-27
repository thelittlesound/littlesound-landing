// Transactional email via Brevo, for server routes. No-ops (with a log line)
// when BREVO_API_KEY isn't set, e.g. local dev. Never throws — a failed
// notification shouldn't fail the action that triggered it.

const BREVO_API_KEY = process.env.BREVO_API_KEY;
export const TEAM_EMAIL = 'hello@thelittlesound.com';

export async function sendEmail(opts: {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  replyTo?: string;
}) {
  if (!BREVO_API_KEY) {
    console.log(`[notify] BREVO_API_KEY not set — skipped email "${opts.subject}" to ${opts.to}`);
    return;
  }
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Little Sound', email: TEAM_EMAIL },
        to: [{ email: opts.to, name: opts.toName ?? '' }],
        replyTo: { email: opts.replyTo ?? TEAM_EMAIL },
        subject: opts.subject,
        htmlContent: opts.html,
      }),
    });
    if (!res.ok) console.error('[notify] Brevo error', res.status, await res.text());
  } catch (e) {
    console.error('[notify] Brevo request failed', e);
  }
}

/** Escape user-supplied text before putting it in an email. */
export function esc(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Little Sound-styled email shell. `body` must already be escaped HTML. */
export function emailShell(heading: string, body: string, cta?: { label: string; href: string }) {
  return `
<div style="font-family:'DM Sans',Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1C3A4A;">
  <h2 style="font-family:Georgia,serif;font-weight:400;color:#0D5C6E;margin:0 0 16px;">${heading}</h2>
  <div style="font-size:15px;line-height:1.6;color:#3A5A6A;">${body}</div>
  ${cta ? `<p style="margin-top:24px;"><a href="${cta.href}" style="display:inline-block;background:#0D5C6E;color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:999px;">${cta.label}</a></p>` : ''}
  <p style="font-size:12px;color:#7A9AAA;margin-top:32px;">Little Sound · Seattle · hello@thelittlesound.com</p>
</div>`;
}
