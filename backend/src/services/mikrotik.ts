import { prisma } from '../lib/prisma.js';
import type { CustomerProfile, Package } from '@prisma/client';
import bcrypt from 'bcryptjs';

const MIKROTIK_HOST = process.env.MIKROTIK_HOST || '192.168.88.1';
const MIKROTIK_USER = process.env.MIKROTIK_USER || 'admin';
const MIKROTIK_PASS = process.env.MIKROTIK_PASSWORD || '';
const PPPOE_PROFILE = process.env.MIKROTIK_PPPOE_PROFILE || 'default';
const PPPOE_POOL = process.env.MIKROTIK_PPPOE_POOL || 'pppoe-pool';

async function getConnection(): Promise<any> {
  try {
    const RouterOS = (await import('node-routeros')).default;
    const conn = new RouterOS({
      host: MIKROTIK_HOST,
      user: MIKROTIK_USER,
      password: MIKROTIK_PASS,
    });
    if (typeof conn.connect === 'function') {
      await conn.connect();
    }
    return conn;
  } catch {
    return null;
  }
}

/** Get RouterOS internal .id for a PPP secret by username (required for set/disable/enable). */
async function getPppSecretId(conn: any, username: string): Promise<string> {
  const data = await conn.write('/ppp/secret/print', ['?name=' + username]);
  const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
  const id = row?.['.id'] ?? row?.id;
  if (!id) throw new Error(`PPP secret not found: ${username}`);
  return String(id);
}

/** Test MikroTik connection (for admin UI). Returns { ok: true } or throws. */
export async function testMikrotikConnection(): Promise<{ ok: boolean; identity?: string }> {
  const conn = await getConnection();
  if (!conn) throw new Error('MikroTik not configured (check MIKROTIK_HOST, USER, PASSWORD in .env)');
  try {
    const data = await conn.write('/system/identity/print');
    const name = Array.isArray(data) && data[0]?.name != null ? data[0].name : undefined;
    return { ok: true, identity: name };
  } finally {
    conn.close?.();
  }
}

async function logSync(action: string, username: string | null, customerId: string | null, success: boolean, error?: string) {
  await prisma.mikrotikSyncLog.create({
    data: { action, username, customerId, success, error: error || null },
  });
}

export async function syncToMikrotik(singleProfile?: CustomerProfile & { package: Package }): Promise<{ synced: number; failed: number; errors: string[] }> {
  const conn = await getConnection();
  const errors: string[] = [];
  let synced = 0;
  let failed = 0;

  if (!conn) {
    return { synced: 0, failed: 0, errors: ['MikroTik connection not configured or failed'] };
  }

  try {
    if (singleProfile) {
      if (singleProfile.connectionType === 'PPPoE' && singleProfile.username) {
        try {
          await addPppoeUser(conn, singleProfile.username, singleProfile.package?.speedMbps || 0);
          await logSync('ADD', singleProfile.username, singleProfile.id, true);
          synced++;
        } catch (e: any) {
          const msg = e?.message || String(e);
          errors.push(msg);
          await logSync('ADD', singleProfile.username, singleProfile.id, false, msg);
          failed++;
        }
      }
      return { synced, failed, errors };
    }

    const customers = await prisma.customerProfile.findMany({
      where: { status: 'ACTIVE', connectionType: 'PPPoE', username: { not: null } },
      include: { package: true },
    });

    for (const c of customers) {
      if (!c.username) continue;
      try {
        await addPppoeUser(conn, c.username, c.package?.speedMbps || 0);
        await prisma.customerProfile.update({
          where: { id: c.id },
          data: { mikrotikSynced: true, lastSyncAt: new Date() },
        });
        await logSync('ADD', c.username, c.id, true);
        synced++;
      } catch (e: any) {
        const msg = e?.message || String(e);
        errors.push(`${c.username}: ${msg}`);
        await logSync('ADD', c.username, c.id, false, msg);
        failed++;
      }
    }
    conn.close?.();
  } catch (e: any) {
    errors.push(e?.message || 'Connection error');
  }
  return { synced, failed, errors };
}

async function addPppoeUser(conn: any, username: string, rateLimitMbps: number) {
  const rateLimit = rateLimitMbps > 0 ? `${rateLimitMbps}M` : '0';
  try {
    await conn.write('/ppp/secret/add', [
      ['name', username],
      ['password', username],
      ['profile', PPPOE_PROFILE],
      ['local-address', '0.0.0.0'],
      ['remote-address', PPPOE_POOL],
      ...(rateLimit !== '0' ? [['rate-limit', rateLimit]] : []),
    ]);
  } catch (e: any) {
    if (e?.message?.includes('already exists')) {
      const rosId = await getPppSecretId(conn, username);
      await conn.write('/ppp/secret/set', [['.id', rosId], ['rate-limit', rateLimit]]);
    } else throw e;
  }
}

export async function blockOnMikrotik(username: string): Promise<void> {
  const conn = await getConnection();
  if (!conn) throw new Error('MikroTik not configured');
  try {
    const rosId = await getPppSecretId(conn, username);
    await conn.write('/ppp/secret/set', [['.id', rosId], ['disabled', 'yes']]);
  } finally {
    conn.close?.();
  }
}

export async function unblockOnMikrotik(username: string): Promise<void> {
  const conn = await getConnection();
  if (!conn) throw new Error('MikroTik not configured');
  try {
    const rosId = await getPppSecretId(conn, username);
    await conn.write('/ppp/secret/set', [['.id', rosId], ['disabled', 'no']]);
  } finally {
    conn.close?.();
  }
}

/** Set PPPoE password on MikroTik. */
export async function setPppoePasswordOnMikrotik(username: string, newPassword: string): Promise<void> {
  const conn = await getConnection();
  if (!conn) throw new Error('MikroTik not configured');
  try {
    const rosId = await getPppSecretId(conn, username);
    await conn.write('/ppp/secret/set', [['.id', rosId], ['password', newPassword]]);
  } finally {
    conn.close?.();
  }
}

/** Set caller-id (MAC) on PPPoE secret if supported. */
export async function setPppCallerIdOnMikrotik(username: string, callerId: string): Promise<void> {
  const conn = await getConnection();
  if (!conn) throw new Error('MikroTik not configured');
  try {
    const rosId = await getPppSecretId(conn, username);
    await conn.write('/ppp/secret/set', [['.id', rosId], ['caller-id', callerId]]);
  } finally {
    conn.close?.();
  }
}

/** Fetch PPPoE secrets from MikroTik. RouterOS returns array of objects with .id, name, password, profile, disabled, etc. */
async function fetchPppSecrets(conn: any): Promise<Array<{ name: string; password: string; profile: string; disabled: string }>> {
  const data = await conn.write('/ppp/secret/print');
  const list = Array.isArray(data) ? data : [];
  return list.map((row: any) => ({
    name: row.name ?? row['name'] ?? '',
    password: row.password ?? row['password'] ?? '',
    profile: row.profile ?? row['profile'] ?? PPPOE_PROFILE,
    disabled: row.disabled ?? row['disabled'] ?? 'false',
  })).filter((r: { name: string }) => r.name);
}

/** Get or create "Unassigned" reseller for imported clients. */
async function getOrCreateUnassignedReseller(): Promise<string> {
  const existing = await prisma.resellerProfile.findFirst({
    where: { companyName: 'Unassigned' },
    select: { id: true },
  });
  if (existing) return existing.id;
  const defaultPass = await bcrypt.hash('imported1', 10);
  const phoneBase = '0import_' + Date.now();
  const user = await prisma.user.create({
    data: {
      phone: phoneBase,
      passwordHash: defaultPass,
      name: 'Unassigned Reseller',
      role: 'RESELLER',
    },
  });
  const profile = await prisma.resellerProfile.create({
    data: {
      userId: user.id,
      companyName: 'Unassigned',
      balanceLimit: 0,
      currentBalance: 0,
      commissionRate: 0,
    },
  });
  return profile.id;
}

/** Import PPPoE users from MikroTik. Creates User + CustomerProfile for new usernames; assigns to Unassigned reseller and default package. */
export async function importFromMikrotik(): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const conn = await getConnection();
  if (!conn) {
    return { imported: 0, skipped: 0, errors: ['MikroTik connection not configured or failed'] };
  }
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;
  try {
    const secrets = await fetchPppSecrets(conn);
    const resellerId = await getOrCreateUnassignedReseller();
    const defaultPackage = await prisma.package.findFirst({ where: { isActive: true }, orderBy: { speedMbps: 'asc' } });
    if (!defaultPackage) {
      conn.close?.();
      return { imported: 0, skipped: 0, errors: ['No active package found. Create a package first.'] };
    }
    for (const s of secrets) {
      const username = String(s.name).trim();
      if (!username) continue;
      const existing = await prisma.customerProfile.findFirst({ where: { username } });
      if (existing) {
        skipped++;
        continue;
      }
      const phone = `0import_${username.replace(/\W/g, '').slice(0, 8)}_${Date.now().toString(36)}`;
      const passwordHash = await bcrypt.hash(s.password || username, 10);
      try {
        const user = await prisma.user.create({
          data: {
            phone,
            passwordHash,
            name: `Imported: ${username}`,
            role: 'CUSTOMER',
          },
        });
        await prisma.customerProfile.create({
          data: {
            userId: user.id,
            resellerId,
            packageId: defaultPackage.id,
            connectionType: 'PPPoE',
            username,
            pppoePassword: s.password || null,
            status: s.disabled === 'true' ? 'INACTIVE' : 'PENDING',
          },
        });
        await logSync('IMPORT', username, null, true);
        imported++;
      } catch (e: any) {
        const msg = e?.message || String(e);
        errors.push(`${username}: ${msg}`);
        await logSync('IMPORT', username, null, false, msg);
      }
    }
    conn.close?.();
  } catch (e: any) {
    errors.push(e?.message || 'Connection error');
  }
  return { imported, skipped, errors };
}
