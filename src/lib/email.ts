// Transactional email via Resend (https://resend.com). Needs RESEND_API_KEY + EMAIL_FROM (a verified sender).
export function emailConfigured(): boolean { return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM); }

export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!emailConfigured()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text }),
    });
    return res.ok;
  } catch { return false; }
}
