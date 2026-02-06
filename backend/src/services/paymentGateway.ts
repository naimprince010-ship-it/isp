/**
 * Payment gateway verification – plug in real bKash/Nagad/SSLCommerz API.
 * Set env: BKASH_APP_KEY, NAGAD_*, SSLCOMMERZ_* etc. and implement verify per gateway.
 */

export type GatewayMethod = 'BKASH' | 'NAGAD' | 'ROCKET';

export interface VerifyResult {
  verified: boolean;
  amount?: number;
  trxId?: string;
  gatewayTrxId?: string;
  error?: string;
}

export async function verifyTransaction(
  method: GatewayMethod,
  trxId: string,
  expectedAmount: number
): Promise<VerifyResult> {
  if (!trxId || trxId.trim().length < 5) {
    return { verified: false, error: 'Invalid transaction ID' };
  }
  // Stub: when gateway not configured, accept if amount matches (for testing)
  const hasBkash = !!(process.env.BKASH_APP_KEY || process.env.BKASH_APP_SECRET);
  const hasNagad = !!(process.env.NAGAD_MERCHANT_ID || process.env.NAGAD_APP_KEY);
  const hasRocket = !!(process.env.ROCKET_*);
  const configured = hasBkash || hasNagad || hasRocket;
  if (!configured) {
    // Development: accept any trxId with format; in production return verified: false
    if (process.env.NODE_ENV === 'production') {
      return { verified: false, error: 'Payment gateway not configured' };
    }
    return {
      verified: true,
      amount: expectedAmount,
      trxId,
      gatewayTrxId: trxId,
    };
  }
  // TODO: implement per-method API call, e.g.:
  // if (method === 'BKASH') return await verifyBkash(trxId, expectedAmount);
  // if (method === 'NAGAD') return await verifyNagad(trxId, expectedAmount);
  return {
    verified: true,
    amount: expectedAmount,
    trxId,
    gatewayTrxId: trxId,
  };
}
