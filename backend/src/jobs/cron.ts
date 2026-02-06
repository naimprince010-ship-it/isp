import 'dotenv/config';
import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { blockOnMikrotik, importFromMikrotik } from '../services/mikrotik.js';
import { sendSms } from '../services/sms.js';

const AUTO_BLOCK_DAYS = parseInt(process.env.AUTO_BLOCK_DAYS || '7', 10);
const BILL_REMINDER_DAYS = (process.env.BILL_REMINDER_DAYS || '2,3')
  .split(',')
  .map((s) => parseInt(s.trim(), 10))
  .filter((n) => !isNaN(n) && n >= 1 && n <= 30);

// Run daily at 2 AM: auto-block overdue customers
cron.schedule('0 2 * * *', async () => {
  console.log('[Cron] Auto-block overdue customers...');
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - AUTO_BLOCK_DAYS);
  const overdueBills = await prisma.bill.findMany({
    where: { status: 'PENDING', dueDate: { lt: cutoff } },
    include: { customer: { include: { user: { select: { phone: true, name: true } } } } },
  });
  for (const bill of overdueBills) {
    const customer = bill.customer;
    if (customer.status === 'ACTIVE' && customer.username) {
      try {
        await blockOnMikrotik(customer.username);
        await prisma.customerProfile.update({
          where: { id: customer.id },
          data: { status: 'BLOCKED' },
        });
        await sendSms(customer.user.phone, `Your internet has been suspended due to overdue bill. Please pay to reconnect.`, 'AUTO_BLOCK');
      } catch (e) {
        console.error('Auto-block failed for', customer.username, e);
      }
    }
  }
  console.log('[Cron] Auto-block done. Processed', overdueBills.length, 'overdue bills.');
});

// Auto bill reminder SMS – X days before due date (e.g. BILL_REMINDER_DAYS=2,3)
if (BILL_REMINDER_DAYS.length > 0) {
  cron.schedule('0 9 * * *', async () => {
    console.log('[Cron] Bill reminder SMS...');
    let sent = 0;
    for (const daysBefore of BILL_REMINDER_DAYS) {
      const target = new Date();
      target.setDate(target.getDate() + daysBefore);
      target.setHours(0, 0, 0, 0);
      const targetEnd = new Date(target);
      targetEnd.setHours(23, 59, 59, 999);
      const bills = await prisma.bill.findMany({
        where: {
          status: 'PENDING',
          dueDate: { gte: target, lte: targetEnd },
        },
        include: { customer: { include: { user: { select: { phone: true, name: true, email: true } }, package: true } }, package: true },
      });
      const sendBillEmail = process.env.SEND_BILL_EMAIL === 'true';
      for (const bill of bills) {
        try {
          const msg = `Reminder: Your bill of BDT ${bill.amount} (${bill.customer.package?.name ?? 'bill'}) is due in ${daysBefore} day(s). Due: ${new Date(bill.dueDate).toLocaleDateString()}. Please pay to avoid disconnection.`;
          await sendSms(bill.customer.user.phone, msg, 'BILL_REMINDER');
          sent++;
          const userEmail = (bill.customer as any).user?.email;
          if (sendBillEmail && userEmail) {
            try {
              const { sendEmail } = await import('../services/email.js');
              const html = `Reminder: Your bill of BDT ${bill.amount} (${bill.package?.name ?? 'bill'}) is due in ${daysBefore} day(s). Due: ${new Date(bill.dueDate).toLocaleDateString()}. Please pay to avoid disconnection.`;
              await sendEmail(userEmail, `Bill reminder: Due in ${daysBefore} day(s)`, html);
            } catch (_) {}
          }
        } catch (e) {
          console.error('[Cron] Bill reminder SMS failed', bill.id, e);
        }
      }
    }
    if (sent > 0) console.log('[Cron] Bill reminder SMS sent:', sent);
  });
}

// Optional: monthly bill generation (run 1st of each month)
cron.schedule('0 0 1 * *', async () => {
  console.log('[Cron] Monthly bill generation...');
  const now = new Date();
  const customers = await prisma.customerProfile.findMany({
    where: { status: { in: ['ACTIVE', 'PENDING'] } },
    include: { package: true, user: { select: { phone: true, email: true, name: true } } },
  });
  const sendBillEmail = process.env.SEND_BILL_EMAIL === 'true';
  let created = 0;
  for (const c of customers) {
    const exists = await prisma.bill.findFirst({
      where: { customerId: c.id, month: now.getMonth() + 1, year: now.getFullYear() },
    });
    if (!exists) {
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + (c.package.validityDays || 30));
      await prisma.bill.create({
        data: {
          customerId: c.id,
          packageId: c.packageId,
          amount: c.package.price,
          dueDate,
          status: 'PENDING',
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
      });
      created++;
      const phone = c.user?.phone || '';
      if (phone) await sendSms(phone, `New bill generated: ${c.package.name} - BDT ${c.package.price}. Due: ${dueDate.toLocaleDateString()}`, 'BILL_GEN');
      if (sendBillEmail && c.user?.email) {
        try {
          const { sendEmail } = await import('../services/email.js');
          const html = `Dear ${c.user.name || 'Customer'},<br><br>Your new bill has been generated.<br>Package: ${c.package.name}<br>Amount: BDT ${c.package.price}<br>Due: ${dueDate.toLocaleDateString()}.<br><br>Please pay before due date to avoid disconnection.`;
          await sendEmail(c.user.email, `Invoice: ${c.package.name} - BDT ${c.package.price}`, html);
        } catch (_) {}
      }
    }
  }
  console.log('[Cron] Bill generation done. Created', created, 'bills.');
});

// Apply scheduled status/package changes (every 5 minutes)
cron.schedule('*/5 * * * *', async () => {
  const now = new Date();
  const due = await prisma.scheduleRule.findMany({
    where: { appliedAt: null, scheduledAt: { lte: now } },
    include: { customer: true },
  });
  for (const rule of due) {
    try {
      const data: { status?: string; packageId?: string } = {};
      if (rule.newStatus) data.status = rule.newStatus;
      if (rule.newPackageId) data.packageId = rule.newPackageId;
      if (Object.keys(data).length) {
        await prisma.customerProfile.update({
          where: { id: rule.customerId },
          data: data as any,
        });
      }
      await prisma.scheduleRule.update({
        where: { id: rule.id },
        data: { appliedAt: now },
      });
    } catch (e) {
      console.error('[Cron] Schedule rule failed', rule.id, e);
    }
  }
  if (due.length) console.log('[Cron] Applied', due.length, 'schedule rules.');
});

// Auto sync/import from MikroTik (daily at 3 AM) – import new PPPoE users from router
const AUTO_IMPORT_MIKROTIK = process.env.AUTO_IMPORT_MIKROTIK !== 'false';
if (AUTO_IMPORT_MIKROTIK) {
  cron.schedule('0 3 * * *', async () => {
    console.log('[Cron] Auto import from MikroTik...');
    try {
      const result = await importFromMikrotik();
      console.log('[Cron] MikroTik import done. Imported:', result.imported, 'Skipped:', result.skipped);
      if (result.errors.length) console.warn('[Cron] Import errors:', result.errors.slice(0, 5));
    } catch (e) {
      console.error('[Cron] MikroTik import failed', e);
    }
  });
}

console.log('Cron jobs scheduled: auto-block (daily 2 AM), bill generation (1st of month), schedule rules (every 5 min)' + (AUTO_IMPORT_MIKROTIK ? ', MikroTik auto-import (daily 3 AM)' : '') + '.');
