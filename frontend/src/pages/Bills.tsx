import { useEffect, useState } from 'react';
import { reseller } from '../api/client';
import { DEMO_BILLS } from '../data/demoData';
import './Dashboard.css';

type Bill = { id: string; amount: number; discountAmount?: number; dueDate: string; status: string; customer?: { user?: { name: string; phone: string }; advanceBalance?: number }; package?: { name: string } };

export default function Bills() {
  const [list, setList] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [collectFor, setCollectFor] = useState<Bill | null>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState('CASH');
  const [collectTrxId, setCollectTrxId] = useState('');
  const [collectDiscount, setCollectDiscount] = useState('');
  const [collectUseAdvance, setCollectUseAdvance] = useState('');
  const [collectSendReceipt, setCollectSendReceipt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [extendFor, setExtendFor] = useState<Bill | null>(null);
  const [extendDays, setExtendDays] = useState('7');
  const [extendSubmitting, setExtendSubmitting] = useState(false);
  const [paymentLinkFor, setPaymentLinkFor] = useState<Bill | null>(null);
  const [paymentLink, setPaymentLink] = useState('');
  const [linkSubmitting, setLinkSubmitting] = useState(false);

  const load = () => {
    reseller.bills(status ? { status } : undefined).then((v) => { setList((v || []) as Bill[]); setIsDemo(false); }).catch(() => { setList(DEMO_BILLS as Bill[]); setIsDemo(true); }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [status]);

  const handleCollect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectFor || !collectAmount || parseFloat(collectAmount) <= 0) return;
    setError('');
    setSubmitting(true);
    const payload: { amount: number; method?: string; trxId?: string; sendReceipt?: boolean; discountAmount?: number; useAdvance?: number } = {
      amount: parseFloat(collectAmount),
      method: collectMethod as any,
      sendReceipt: collectSendReceipt,
    };
    if (collectTrxId.trim()) payload.trxId = collectTrxId.trim();
    const d = collectDiscount.trim() ? parseFloat(collectDiscount) : undefined;
    if (d != null && !isNaN(d) && d >= 0) payload.discountAmount = d;
    const u = collectUseAdvance.trim() ? parseFloat(collectUseAdvance) : undefined;
    if (u != null && !isNaN(u) && u >= 0) payload.useAdvance = u;
    reseller.collectBill(collectFor.id, payload).then(() => {
      setCollectFor(null); setCollectAmount(''); setCollectMethod('CASH'); setCollectTrxId('');
      setCollectDiscount(''); setCollectUseAdvance(''); setCollectSendReceipt(false);
      load();
    }).catch((err) => setError(err?.message || 'Failed')).finally(() => setSubmitting(false));
  };

  const openCollect = (b: Bill) => {
    setCollectFor(b);
    setCollectAmount(String(b.amount));
    setCollectMethod('CASH');
    setCollectTrxId('');
    setCollectDiscount((b as any).discountAmount ? String((b as any).discountAmount) : '');
    setCollectUseAdvance('');
    setCollectSendReceipt(false);
    setError('');
  };

  const openInvoice = (billId: string) => {
    reseller.getBillInvoice(billId).then((html) => {
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
    }).catch(() => setError('Invoice load failed'));
  };

  const handleExtend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendFor || !extendDays || parseInt(extendDays, 10) < 1) return;
    setExtendSubmitting(true);
    reseller.extendBill(extendFor.id, { extendDays: parseInt(extendDays, 10) }).then(() => { setExtendFor(null); setExtendDays('7'); load(); }).catch((err) => setError(err?.message || 'Failed')).finally(() => setExtendSubmitting(false));
  };

  const handlePaymentLink = (b: Bill) => {
    setPaymentLinkFor(b);
    setPaymentLink('');
    setLinkSubmitting(true);
    reseller.createPaymentLink(b.id, 7).then((r) => { setPaymentLink(r.link); }).catch((err) => setError(err?.message || 'Failed')).finally(() => setLinkSubmitting(false));
  };

  const copyLink = () => {
    if (paymentLink) navigator.clipboard.writeText(paymentLink).then(() => setError('')).catch(() => setError('Copy failed'));
  };

  if (loading) return <div className="loading">Loading...</div>;
  return (
    <div className="dashboard">
      <h1>Bills (Reseller)</h1>
      {isDemo && <div className="demo-banner">Backend সংযুক্ত নেই।</div>}
      <div style={{ marginBottom: '1rem' }}>
        <label>Status: <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option><option value="PENDING">Pending</option><option value="PAID">Paid</option></select></label>
      </div>
      {error && !collectFor && !extendFor && !paymentLinkFor && <div className="error-msg" style={{ marginBottom: '0.5rem' }}>{error}</div>}
      {list.length === 0 && !isDemo && <p className="muted">কোনো বিল নেই।</p>}
      {list.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Customer</th><th>Phone</th><th>Package</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {list.map((b) => (
                <tr key={b.id}>
                  <td>{b.customer?.user?.name ?? '-'}</td>
                  <td>{b.customer?.user?.phone ?? '-'}</td>
                  <td>{b.package?.name ?? '-'}</td>
                  <td>BDT {Number(b.amount).toLocaleString()}</td>
                  <td>{new Date(b.dueDate).toLocaleDateString()}</td>
                  <td>{b.status}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', marginRight: '4px' }} onClick={() => openInvoice(b.id)}>Invoice</button>
                    <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', marginRight: '4px' }} onClick={() => { setExtendFor(b); setExtendDays('7'); setError(''); }}>Extend</button>
                    <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', marginRight: '4px' }} onClick={() => { setError(''); handlePaymentLink(b); }}>Payment Link</button>
                    {b.status !== 'PAID' && (
                      <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => openCollect(b)}>Collect</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {collectFor && (
        <div className="modal-overlay" onClick={() => setCollectFor(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Collect Bill: {collectFor.customer?.user?.name} - BDT {Number(collectFor.amount).toLocaleString()}</h2>
            {collectFor.customer && (collectFor.customer as any).advanceBalance != null && Number((collectFor.customer as any).advanceBalance) > 0 && (
              <p className="muted" style={{ marginBottom: '0.5rem' }}>Customer advance: BDT {Number((collectFor.customer as any).advanceBalance).toLocaleString()}</p>
            )}
            <form onSubmit={handleCollect}>
              <input type="number" step="0.01" min="0.01" className="form-input" placeholder="Amount (BDT) *" value={collectAmount} onChange={(e) => setCollectAmount(e.target.value)} required />
              <input type="number" step="0.01" min="0" className="form-input" placeholder="Discount (BDT) optional" value={collectDiscount} onChange={(e) => setCollectDiscount(e.target.value)} />
              <input type="number" step="0.01" min="0" className="form-input" placeholder="Use advance (BDT) optional" value={collectUseAdvance} onChange={(e) => setCollectUseAdvance(e.target.value)} />
              <select className="form-input" value={collectMethod} onChange={(e) => setCollectMethod(e.target.value)}>
                <option value="CASH">Cash</option>
                <option value="BKASH">bKash</option>
                <option value="NAGAD">Nagad</option>
                <option value="ROCKET">Rocket</option>
              </select>
              {(collectMethod === 'BKASH' || collectMethod === 'NAGAD' || collectMethod === 'ROCKET') && (
                <input className="form-input" placeholder="Transaction ID" value={collectTrxId} onChange={(e) => setCollectTrxId(e.target.value)} />
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input type="checkbox" checked={collectSendReceipt} onChange={(e) => setCollectSendReceipt(e.target.checked)} />
                Send receipt (SMS)
              </label>
              {error && <div className="error-msg" style={{ marginTop: '0.5rem' }}>{error}</div>}
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-logout" disabled={submitting}>{submitting ? 'Submitting...' : 'Collect'}</button>
                <button type="button" className="btn-logout" onClick={() => setCollectFor(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {extendFor && (
        <div className="modal-overlay" onClick={() => setExtendFor(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Extend Due Date: {extendFor.customer?.user?.name}</h2>
            <form onSubmit={handleExtend}>
              <label>Extend by (days)</label>
              <input type="number" min="1" max="365" className="form-input" value={extendDays} onChange={(e) => setExtendDays(e.target.value)} />
              {error && <div className="error-msg" style={{ marginTop: '0.5rem' }}>{error}</div>}
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-logout" disabled={extendSubmitting}>{extendSubmitting ? 'Saving...' : 'Extend'}</button>
                <button type="button" className="btn-logout" onClick={() => setExtendFor(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {paymentLinkFor && (
        <div className="modal-overlay" onClick={() => setPaymentLinkFor(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Payment Link: {paymentLinkFor.customer?.user?.name}</h2>
            {linkSubmitting && <p className="muted">Generating...</p>}
            {paymentLink && (
              <>
                <input readOnly className="form-input" value={paymentLink} style={{ fontSize: '0.85rem' }} />
                <button type="button" className="btn-logout" onClick={copyLink} style={{ marginTop: '0.5rem' }}>Copy Link</button>
              </>
            )}
            <button type="button" className="btn-logout" onClick={() => setPaymentLinkFor(null)} style={{ marginTop: '1rem' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
