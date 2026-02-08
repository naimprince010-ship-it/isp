import { useEffect, useState } from 'react';
import { bandwidthSales, admin } from '../api/client';
import './Dashboard.css';
import './NetworkDiagram.css';

type Tab = 'resellers' | 'ledger' | 'invoices' | 'payment';
type Reseller = { id: string; name: string; email?: string; phone?: string; address?: string; resellerProfileId?: string };
type ResellerLedger = Reseller & { totalInvoices: number; totalPaid: number; ledgerAmount: number };
type Invoice = { id: string; invoiceNumber: string; bandwidthResellerId: string; bandwidthReseller?: Reseller; date: string; amount: number; status: string; sentEmailAt?: string; sentSmsAt?: string; payments?: { id: string; amount: number }[] };

export default function BandwidthSales() {
  const [tab, setTab] = useState<Tab>('resellers');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [ledger, setLedger] = useState<ResellerLedger[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [existingResellers, setExistingResellers] = useState<{ id: string; companyName?: string; user?: { name: string; phone: string; email?: string } }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showResellerForm, setShowResellerForm] = useState(false);
  const [resellerForm, setResellerForm] = useState({ name: '', email: '', phone: '', address: '', resellerProfileId: '', notes: '' });

  const [invoiceForm, setInvoiceForm] = useState({ bandwidthResellerId: '', date: new Date().toISOString().slice(0, 10), amount: '', periodStart: '', periodEnd: '', dueDate: '', description: '' });

  const [paymentInvoiceId, setPaymentInvoiceId] = useState('');
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentDate: new Date().toISOString().slice(0, 10), method: 'BANK', trxId: '', notes: '' });

  const load = () => {
    setLoading(true);
    Promise.all([
      bandwidthSales.resellers(true).then((v) => setResellers((v || []) as Reseller[])).catch(() => setResellers([])),
      bandwidthSales.resellersLedger().then((v) => setLedger((v || []) as ResellerLedger[])).catch(() => setLedger([])),
      bandwidthSales.invoices({ month, year }).then((v) => setInvoices((v || []) as Invoice[])).catch(() => setInvoices([])),
      admin.resellers().then((v) => setExistingResellers((v || []) as any[])).catch(() => setExistingResellers([])),
    ])
      .then(() => setIsDemo(false))
      .catch(() => setIsDemo(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [month, year]);

  const handleSaveReseller = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!resellerForm.name.trim()) { setError('Name required'); return; }
    setSubmitting(true);
    bandwidthSales.createReseller({
      name: resellerForm.name.trim(),
      email: resellerForm.email.trim() || undefined,
      phone: resellerForm.phone.trim() || undefined,
      address: resellerForm.address.trim() || undefined,
      resellerProfileId: resellerForm.resellerProfileId || undefined,
      notes: resellerForm.notes.trim() || undefined,
    })
      .then(() => { setShowResellerForm(false); setResellerForm({ name: '', email: '', phone: '', address: '', resellerProfileId: '', notes: '' }); load(); })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(invoiceForm.amount);
    if (!invoiceForm.bandwidthResellerId || !amt || amt <= 0) { setError('Reseller and amount required'); return; }
    setSubmitting(true);
    bandwidthSales.createInvoice({
      bandwidthResellerId: invoiceForm.bandwidthResellerId,
      date: invoiceForm.date,
      amount: amt,
      periodStart: invoiceForm.periodStart || undefined,
      periodEnd: invoiceForm.periodEnd || undefined,
      dueDate: invoiceForm.dueDate || undefined,
      description: invoiceForm.description.trim() || undefined,
    })
      .then(() => { setInvoiceForm({ ...invoiceForm, amount: '', description: '' }); load(); })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(paymentForm.amount);
    if (!paymentInvoiceId || !amt || amt <= 0) { setError('Select invoice and enter amount'); return; }
    setSubmitting(true);
    bandwidthSales.receivePayment(paymentInvoiceId, {
      amount: amt,
      paymentDate: paymentForm.paymentDate,
      method: paymentForm.method,
      trxId: paymentForm.trxId.trim() || undefined,
      notes: paymentForm.notes.trim() || undefined,
    })
      .then(() => { setPaymentInvoiceId(''); setPaymentForm({ ...paymentForm, amount: '', trxId: '', notes: '' }); load(); })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  const handleSendEmail = (id: string) => {
    setSubmitting(true);
    setError('');
    bandwidthSales.sendInvoiceEmail(id)
      .then(() => load())
      .catch((err) => setError(err?.message || 'Email failed'))
      .finally(() => setSubmitting(false));
  };

  const handleSendSms = (id: string) => {
    setSubmitting(true);
    setError('');
    bandwidthSales.sendInvoiceSms(id)
      .then(() => load())
      .catch((err) => setError(err?.message || 'SMS failed'))
      .finally(() => setSubmitting(false));
  };

  if (loading) return <div className="loading">Loading...</div>;

  const tabBtn = (t: Tab, label: string) => (
    <button key={t} type="button" className={`net-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{label}</button>
  );
  const pendingInvoices = invoices.filter((i) => i.status !== 'PAID');

  return (
    <div className="network-page">
      <header className="network-header">
        <div>
          <h1>Bandwidth Sales</h1>
          <p className="network-subtitle">Resellers, ledger, sell invoices, email/SMS, receive payment</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label>Month: <input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10) || 1)} className="form-input net-select" style={{ width: 50 }} /></label>
          <label>Year: <input type="number" min="2020" max="2030" value={year} onChange={(e) => setYear(parseInt(e.target.value, 10) || 2024)} className="form-input net-select" style={{ width: 70 }} /></label>
        </div>
      </header>

      {isDemo && <div className="demo-banner">Backend not connected.</div>}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {tabBtn('resellers', 'Resellers')}
        {tabBtn('ledger', 'Ledger')}
        {tabBtn('invoices', 'Invoices')}
        {tabBtn('payment', 'Receive Payment')}
      </div>

      {error && <div className="error-msg" style={{ marginBottom: '0.5rem' }}>{error}</div>}

      {tab === 'resellers' && (
        <section className="network-diagram-section">
          {!isDemo && <div style={{ marginBottom: '1rem' }}><button type="button" className="btn-logout" onClick={() => { setShowResellerForm(true); setError(''); }}>+ Create Bandwidth Reseller</button></div>}
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Address</th></tr></thead>
              <tbody>
                {resellers.map((r) => (
                  <tr key={r.id}><td>{r.name}</td><td>{r.email ?? '-'}</td><td>{r.phone ?? '-'}</td><td>{r.address ?? '-'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          {resellers.length === 0 && <p className="muted">No bandwidth resellers. Create one.</p>}
        </section>
      )}

      {tab === 'ledger' && (
        <section className="network-diagram-section">
          <h3>Reseller List with Ledger Amount</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Reseller</th><th>Total Invoices</th><th>Total Paid</th><th>Ledger (Due)</th></tr></thead>
              <tbody>
                {ledger.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>৳ {r.totalInvoices?.toFixed(2) ?? '0.00'}</td>
                    <td>৳ {r.totalPaid?.toFixed(2) ?? '0.00'}</td>
                    <td style={{ color: (r.ledgerAmount ?? 0) > 0 ? '#f87171' : '#22c55e' }}>৳ {(r.ledgerAmount ?? 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'invoices' && (
        <section className="network-diagram-section">
          <h3>Create Bandwidth Sell Invoice</h3>
          {!isDemo && (
            <div className="card" style={{ marginBottom: '1rem', maxWidth: 420 }}>
              <form onSubmit={handleCreateInvoice}>
                <label>Reseller *</label>
                <select className="form-input" value={invoiceForm.bandwidthResellerId} onChange={(e) => setInvoiceForm({ ...invoiceForm, bandwidthResellerId: e.target.value })} required>
                  <option value="">Select reseller</option>
                  {resellers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <label>Date *</label>
                <input type="date" className="form-input" value={invoiceForm.date} onChange={(e) => setInvoiceForm({ ...invoiceForm, date: e.target.value })} required />
                <label>Amount *</label>
                <input type="number" step="0.01" min="0.01" className="form-input" placeholder="Amount" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} required />
                <label>Period (optional)</label>
                <input type="date" className="form-input" value={invoiceForm.periodStart} onChange={(e) => setInvoiceForm({ ...invoiceForm, periodStart: e.target.value })} />
                <input type="date" className="form-input" value={invoiceForm.periodEnd} onChange={(e) => setInvoiceForm({ ...invoiceForm, periodEnd: e.target.value })} />
                <label>Due Date</label>
                <input type="date" className="form-input" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} />
                <input className="form-input" placeholder="Description" value={invoiceForm.description} onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })} />
                <button type="submit" className="btn-logout" style={{ marginTop: '0.5rem' }} disabled={submitting}>Create Invoice</button>
              </form>
            </div>
          )}
          <h4>Invoices ({month}/{year})</h4>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Invoice #</th><th>Reseller</th><th>Date</th><th>Amount</th><th>Status</th><th>Email</th><th>SMS</th></tr></thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.invoiceNumber}</td>
                    <td>{(inv.bandwidthReseller as Reseller)?.name ?? '-'}</td>
                    <td>{new Date(inv.date).toLocaleDateString()}</td>
                    <td>৳ {Number(inv.amount).toFixed(2)}</td>
                    <td>{inv.status}</td>
                    <td>{inv.sentEmailAt ? '✓ Sent' : <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }} onClick={() => handleSendEmail(inv.id)} disabled={submitting}>Send Email</button>}</td>
                    <td>{inv.sentSmsAt ? '✓ Sent' : <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }} onClick={() => handleSendSms(inv.id)} disabled={submitting}>Send SMS</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'payment' && (
        <section className="network-diagram-section">
          <h3>Receive Reseller Payment</h3>
          {!isDemo && (
            <div className="card" style={{ marginBottom: '1rem', maxWidth: 420 }}>
              <form onSubmit={handlePayment}>
                <label>Select Invoice *</label>
                <select className="form-input" value={paymentInvoiceId} onChange={(e) => setPaymentInvoiceId(e.target.value)} required>
                  <option value="">Select invoice</option>
                  {pendingInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>{inv.invoiceNumber} - {(inv.bandwidthReseller as Reseller)?.name} - ৳{Number(inv.amount).toFixed(2)} ({inv.status})</option>
                  ))}
                </select>
                <label>Amount *</label>
                <input type="number" step="0.01" min="0.01" className="form-input" placeholder="Amount" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} required />
                <label>Payment Date *</label>
                <input type="date" className="form-input" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} required />
                <label>Method</label>
                <select className="form-input" value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}>
                  <option value="CASH">CASH</option>
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                  <option value="ROCKET">Rocket</option>
                  <option value="BANK">Bank</option>
                </select>
                <input className="form-input" placeholder="Transaction ID" value={paymentForm.trxId} onChange={(e) => setPaymentForm({ ...paymentForm, trxId: e.target.value })} />
                <input className="form-input" placeholder="Notes" value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
                <button type="submit" className="btn-logout" style={{ marginTop: '0.5rem' }} disabled={submitting}>Record Payment</button>
              </form>
            </div>
          )}
        </section>
      )}

      {showResellerForm && (
        <div className="modal-overlay" onClick={() => setShowResellerForm(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h2>Create Bandwidth Reseller</h2>
            <form onSubmit={handleSaveReseller}>
              <label>Link to existing reseller (optional)</label>
              <select className="form-input" value={resellerForm.resellerProfileId} onChange={(e) => setResellerForm({ ...resellerForm, resellerProfileId: e.target.value })}>
                <option value="">— New / standalone —</option>
                {existingResellers.filter((r: any) => !resellers.some((br: Reseller) => (br as any).resellerProfileId === r.id)).map((r: any) => (
                  <option key={r.id} value={r.id}>{r.companyName || r.user?.name} — {r.user?.phone}</option>
                ))}
              </select>
              <input className="form-input" placeholder="Name *" value={resellerForm.name} onChange={(e) => setResellerForm({ ...resellerForm, name: e.target.value })} required />
              <input type="email" className="form-input" placeholder="Email" value={resellerForm.email} onChange={(e) => setResellerForm({ ...resellerForm, email: e.target.value })} />
              <input className="form-input" placeholder="Phone" value={resellerForm.phone} onChange={(e) => setResellerForm({ ...resellerForm, phone: e.target.value })} />
              <input className="form-input" placeholder="Address" value={resellerForm.address} onChange={(e) => setResellerForm({ ...resellerForm, address: e.target.value })} />
              <input className="form-input" placeholder="Notes" value={resellerForm.notes} onChange={(e) => setResellerForm({ ...resellerForm, notes: e.target.value })} />
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-logout" disabled={submitting}>Save</button>
                <button type="button" className="btn-logout" onClick={() => setShowResellerForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
