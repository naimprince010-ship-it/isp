import { prisma } from '../lib/prisma.js';

const SMS_API_URL = process.env.SMS_API_URL || '';
const SMS_API_KEY = process.env.SMS_API_KEY || '';
const SMS_SENDER_ID = process.env.SMS_SENDER_ID || '';

export async function sendSms(phone: string, message: string, purpose: string): Promise<{ success: boolean; logId?: string }> {
  const normalizedPhone = phone.replace(/\D/g, '').replace(/^0/, '880');
  if (!SMS_API_URL || !SMS_API_KEY) {
    await prisma.smsLog.create({
      data: { phone: normalizedPhone, message, purpose, status: 'SKIPPED', response: 'SMS gateway not configured' },
    });
    return { success: false };
  }
  try {
    const res = await fetch(SMS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SMS_API_KEY}` },
      body: JSON.stringify({ to: normalizedPhone, message, sender: SMS_SENDER_ID }),
    });
    const text = await res.text();
    const success = res.ok;
    const log = await prisma.smsLog.create({
      data: { phone: normalizedPhone, message, purpose, status: success ? 'SENT' : 'FAILED', response: text },
    });
    return { success, logId: log.id };
  } catch (e: any) {
    await prisma.smsLog.create({
      data: { phone: normalizedPhone, message, purpose, status: 'FAILED', response: e?.message || String(e) },
    });
    return { success: false };
  }
}
