/**
 * Email service – configure SMTP in .env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM).
 * Set SEND_BILL_EMAIL=true to send invoice/reminder emails.
 */

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@isp.local';

export async function sendEmail(to: string, subject: string, htmlBody: string, textBody?: string): Promise<{ success: boolean; error?: string }> {
  if (!to || !to.includes('@')) return { success: false, error: 'Invalid email' };
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return { success: false, error: 'Email not configured (SMTP_* in .env)' };
  }
  try {
    const nodemailer = await import('nodemailer');
    const transport = nodemailer.default.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transport.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      text: textBody || htmlBody.replace(/<[^>]+>/g, ''),
      html: htmlBody,
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) };
  }
}

export function isEmailConfigured(): boolean {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}
