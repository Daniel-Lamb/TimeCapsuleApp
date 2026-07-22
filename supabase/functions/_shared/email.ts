const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends via Resend. When RESEND_API_KEY is unset the message is logged and
 * skipped rather than throwing, so the delivery loop can be exercised end to
 * end before an email provider is funded.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    console.warn(`RESEND_API_KEY unset — skipping email "${message.subject}" to ${message.to}`);
    return;
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: Deno.env.get('CAPSULE_FROM_EMAIL') ?? 'Time Capsule <onboarding@resend.dev>',
      to: [message.to],
      subject: message.subject,
      html: message.html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend responded ${response.status}: ${await response.text()}`);
  }
}

export function layout(heading: string, bodyHtml: string): string {
  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1f2937">
      <h1 style="font-size:22px;margin:0 0 16px">${heading}</h1>
      ${bodyHtml}
      <p style="margin-top:32px;font-size:12px;color:#9ca3af">Sent by Digital Time Capsule.</p>
    </div>
  `;
}
