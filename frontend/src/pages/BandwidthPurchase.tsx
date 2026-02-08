import { useEffect, useState } from 'react';
import { bandwidth } from '../api/client';
import './Dashboard.css';
import './NetworkDiagram.css';

type Tab = 'items' | 'providers' | 'ledger' | 'bills' | 'payment' | 'history';
type Item = { id: string; name: string; capacityMbps?: number; unit?: string; description?: string };
type Provider = { id: string; name: string; contactPerson?: string; phone?: string; email?: string; address?: string };
type ProviderLedger = Provider & { totalBills: number; totalPaid: number; ledgerAmount: number };
type Bill = { id: string; billNumber: string; providerId: string; provider?: Provider; date: string; amount: number; status: string; payments?: { id: string; amount: number; paymentDate: string; method: string }[] };
type Payment = { id: string; billId: string; amount: number; paymentDate: string; method: string; bill?: { provider?: Provider } };

export default function BandwidthPurchase() {
  const [tab, setTab] = useState<Tab>('items');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [items, setItems] = useState<Item[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [ledger, setLedger] = useState<ProviderLedger[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [history, setHistory] = useState<{ bills: Bill[]; payments: Payment[]; totalBills: number; totalPayments: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState({ name: '', capacityMbps: '', unit: 'Mbps', description: '' });

  const [showProviderForm, setShowProviderForm] = useState(false);
  const [providerForm, setProviderForm] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '', notes: '' });

  const [billForm, setBillForm] = useState({ providerId: '', date: new Date().toISOString().slice(0, 10), amount: '', periodStart: '', periodEnd: '', dueDate: '', notes: '' });

  const [paymentBillId, setPaymentBillId] = useState('');
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentDate: new Date().toISOString().slice(0, 10), method: 'BANK', trxId: '', notes: '' });

  const load = () => {
    setLoading(true);
    Promise.all([
      bandwidth.items(true).then((v) => setItems((v || []) as Item[])).catch(() => setItems([])),
      bandwidth.providers(true).then((v) => setProviders((v || []) as Provider[])).catch(() => setProviders([])),
      bandwidth.providersLedger().then((v) => setLedger((v || []) as ProviderLedger[])).catch(() => setLedger([])),
      bandwidth.bills({ month, year }).then((v) => setBills((v || []) as Bill[])).catch(() => setBills([])),
      bandwidth.history(month, year).then((v) => setHistory(v as any)).catch(() => setHistory(null)),
    ])
      .then(() => setIsDemo(false))
      .catch(() => setIsDemo(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [month, year]);

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!itemForm.name.trim()) { setError('Name required'); return; }
    setSubmitting(true);
    bandwidth.createItem({
      name: itemForm.name.trim(),
      capacityMbps: itemForm.capacityMbps ? parseInt(itemForm.capacityMbps, 10) : undefined,
      unit: itemForm.unit || 'Mbps',
      description: itemForm.description.trim() || undefined,
    })
      .then(() => { setShowItemForm(false); setItemForm({ name: '', capacityMbps: '', unit: 'Mbps', description: '' }); load(); })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  const handleSaveProvider = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!providerForm.name.trim()) { setError('Name required'); return; }
    setSubmitting(true);
    bandwidth.createProvider({
      name: providerForm.name.trim(),
      contactPerson: providerForm.contactPerson.trim() || undefined,
      phone: providerForm.phone.trim() || undefined,
      email: providerForm.email.trim() || undefined,
      address: providerForm.address.trim() || undefined,
      notes: providerForm.notes.trim() || undefined,
    })
      .then(() => { setShowProviderForm(false); setProviderForm({ name: '', contactPerson: '', phone: '', email: '', address: '', notes: '' }); load(); })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  const handleCreateBill = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(billForm.amount);
    if (!billForm.providerId || !amt || amt <= 0) { setError('Provider and amount required'); return; }
    setSubmitting(true);
    bandwidth.createBill({
      providerId: billForm.providerId,
      date: billForm.date,
      amount: amt,
      periodStart: billForm.periodStart || undefined,
      periodEnd: billForm.periodEnd || undefined,
      dueDate: billForm.dueDate || undefined,
      notes: billForm.notes.trim() || undefined,
    })
      .then(() => { setBillForm({ ...billForm, amount: '', notes: '' }); load(); })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(paymentForm.amount);
    if (!paymentBillId || !amt || amt <= 0) { setError('Select bill and enter amount'); return; }
    setSubmitting(true);
    bandwidth.payBill(paymentBillId, {
      amount: amt,
      paymentDate: paymentForm.paymentDate,
      method: paymentForm.method,
      trxId: paymentForm.trxId.trim() || undefined,
      notes: paymentForm.notes.trim() || undefined,
    })
      .then(() => { setPaymentBillId(''); setPaymentForm({ ...paymentForm, amount: '', trxId: '', notes: '' }); load(); })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  if (loading && tab === 'items') return <div className="loading">Loading...</div>;

  const tabBtn = (t: Tab, label: string) => (
    <button key={t} type="button" className={`net-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{label}</button>
  );

  return (
    <div className="network-page">
      <header className="network-header">
        <div>
          <h1>Bandwidth Purchase</h1>
          <p className="network-subtitle">Items, providers, bills, payments, month-wise history</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label>Month: <input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10) || 1)} className="form-input net-select" style={{ width: 50 }} /></label>
          <label>Year: <input type="number" min="2020" max="2030" value={year} onChange={(e) => setYear(parseInt(e.target.value, 10) || 2024)} className="form-input net-select" style={{ width: 70 }} /></label>
        </div>
      </header>

      {isDemo && <div className="demo-banner">Backend not connected.</div>}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {tabBtn('items', 'Items')}
        {tabBtn('providers', 'Providers')}
        {tabBtn('ledger', 'Provider Ledger')}
        {tabBtn('bills', 'Create Bill')}
        {tabBtn('payment', 'Bill Payment')}
        {tabBtn('history', 'Month History')}
      </div>

      {error && <div className="error-msg" style={{ marginBottom: '0.5rem' }}>{error}</div>}

      {tab === 'items' && (
        <section className="network-diagram-section">
          {!isDemo && <div style={{ marginBottom: '1rem' }}><button type="button" className="btn-logout" onClick={() => { setShowItemForm(true); setError(''); }}>+ Create Bandwidth Item</button></div>}
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Capacity</th><th>Unit</th><th>Description</th></tr></thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}><td>{i.name}</td><td>{i.capacityMbps ?? '-'}</td><td>{i.unit ?? 'Mbps'}</td><td>{i.description ?? '-'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length === 0 && <p className="muted">No bandwidth items. Create one.</p>}
        </section>
      )}

      {tab === 'providers' && (
        <section className="network-diagram-section">
          {!isDemo && <div style={{ marginBottom: '1rem' }}><button type="button" className="btn-logout" onClick={() => { setShowProviderForm(true); setError(''); }}>+ Create Bandwidth Provider</button></div>}
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Contact</th><th>Phone</th><th>Email</th><th>Address</th></tr></thead>
              <tbody>
                {providers.map((p) => (
                  <tr key={p.id}><td>{p.name}</td><td>{(p as any).contactPerson ?? '-'}</td><td>{p.phone ?? '-'}</td><td>{p.email ?? '-'}</td><td>{p.address ?? '-'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          {providers.length === 0 && <p className="muted">No providers. Create one.</p>}
        </section>
      )}

      {tab === 'ledger' && (
        <section className="network-diagram-section">
          <h3>Provider List with Ledger Amount</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Provider</th><th>Total Bills</th><th>Total Paid</th><th>Ledger (Due)</th></tr></thead>
              <tbody>
                {ledger.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>৳ {p.totalBills?.toFixed(2) ?? '0.00'}</td>
                    <td>৳ {p.totalPaid?.toFixed(2) ?? '0.00'}</td>
                    <td style={{ color: (p.ledgerAmount ?? 0) > 0 ? '#f87171' : '#22c55e' }}>৳ {(p.ledgerAmount ?? 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ledger.length === 0 && <p className="muted">No providers.</p>}
        </section>
      )}

      {tab === 'bills' && (
        <section className="network-diagram-section">
          <h3>Create Bandwidth Purchase Bill</h3>
          {!isDemo && (
            <div className="card" style={{ marginBottom: '1rem', maxWidth: 420 }}>
              <form onSubmit={handleCreateBill}>
                <label>Provider *</label>
                <select className="form-input" value={billForm.providerId} onChange={(e) => setBillForm({ ...billForm, providerId: e.target.value })} required>
                  <option value="">Select provider</option>
                  {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <label>Date *</label>
                <input type="date" className="form-input" value={billForm.date} onChange={(e) => setBillForm({ ...billForm, date: e.target.value })} required />
                <label>Amount *</label>
                <input type="number" step="0.01" min="0.01" className="form-input" placeholder="Amount" value={billForm.amount} onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })} required />
                <label>Period (optional)</label>
                <input type="date" className="form-input" placeholder="From" value={billForm.periodStart} onChange={(e) => setBillForm({ ...billForm, periodStart: e.target.value })} />
                <input type="date" className="form-input" placeholder="To" value={billForm.periodEnd} onChange={(e) => setBillForm({ ...billForm, periodEnd: e.target.value })} />
                <label>Due Date</label>
                <input type="date" className="form-input" value={billForm.dueDate} onChange={(e) => setBillForm({ ...billForm, dueDate: e.target.value })} />
                <input className="form-input" placeholder="Notes" value={billForm.notes} onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })} />
                <button type="submit" className="btn-logout" style={{ marginTop: '0.5rem' }} disabled={submitting}>Create Bill</button>
              </form>
            </div>
          )}
          <h4>Bills ({month}/{year})</h4>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Bill #</th><th>Provider</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.id}><td>{b.billNumber}</td><td>{(b.provider as Provider)?.name ?? '-'}</td><td>{new Date(b.date).toLocaleDateString()}</td><td>৳ {Number(b.amount).toFixed(2)}</td><td>{b.status}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'payment' && (
        <section className="network-diagram-section">
          <h3>Bandwidth Bill Payment</h3>
          {!isDemo && (
            <div className="card" style={{ marginBottom: '1rem', maxWidth: 420 }}>
              <form onSubmit={handlePayment}>
                <label>Select Bill *</label>
                <select className="form-input" value={paymentBillId} onChange={(e) => setPaymentBillId(e.target.value)} required>
                  <option value="">Select bill</option>
                  {bills.filter((b) => b.status !== 'PAID').map((b) => (
                    <option key={b.id} value={b.id}>{b.billNumber} - {(b.provider as Provider)?.name} - ৳{Number(b.amount).toFixed(2)} ({b.status})</option>
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

      {tab === 'history' && (
        <section className="network-diagram-section">
          <h3>Month-wise Bill & Payment History ({month}/{year})</h3>
          {history && (
            <div className="cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="card"><h3>Total Bills</h3><p className="value">৳ {history.totalBills?.toFixed(2) ?? '0.00'}</p></div>
              <div className="card"><h3>Total Payments</h3><p className="value green">৳ {history.totalPayments?.toFixed(2) ?? '0.00'}</p></div>
            </div>
          )}
          <h4>Bills</h4>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Bill #</th><th>Provider</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {(history?.bills || []).map((b: Bill) => (
                  <tr key={b.id}><td>{b.billNumber}</td><td>{(b.provider as Provider)?.name ?? '-'}</td><td>{new Date(b.date).toLocaleDateString()}</td><td>৳ {Number(b.amount).toFixed(2)}</td><td>{b.status}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <h4>Payments</h4>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Bill</th><th>Provider</th><th>Amount</th><th>Method</th></tr></thead>
              <tbody>
                {(history?.payments || []).map((p: Payment) => (
                  <tr key={p.id}><td>{new Date(p.paymentDate).toLocaleDateString()}</td><td>{p.billId?.slice(0, 8)}...</td><td>{(p.bill as any)?.provider?.name ?? '-'}</td><td>৳ {Number(p.amount).toFixed(2)}</td><td>{p.method}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showItemForm && (
        <div className="modal-overlay" onClick={() => setShowItemForm(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Create Bandwidth Item</h2>
            <form onSubmit={handleSaveItem}>
              <input className="form-input" placeholder="Name *" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} required />
              <input type="number" min="0" className="form-input" placeholder="Capacity (Mbps)" value={itemForm.capacityMbps} onChange={(e) => setItemForm({ ...itemForm, capacityMbps: e.target.value })} />
              <input className="form-input" placeholder="Unit" value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} />
              <input className="form-input" placeholder="Description" value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} />
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-logout" disabled={submitting}>Save</button>
                <button type="button" className="btn-logout" onClick={() => setShowItemForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showProviderForm && (
        <div className="modal-overlay" onClick={() => setShowProviderForm(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h2>Create Bandwidth Provider</h2>
            <form onSubmit={handleSaveProvider}>
              <input className="form-input" placeholder="Provider name *" value={providerForm.name} onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })} required />
              <input className="form-input" placeholder="Contact person" value={providerForm.contactPerson} onChange={(e) => setProviderForm({ ...providerForm, contactPerson: e.target.value })} />
              <input className="form-input" placeholder="Phone" value={providerForm.phone} onChange={(e) => setProviderForm({ ...providerForm, phone: e.target.value })} />
              <input className="form-input" placeholder="Email" value={providerForm.email} onChange={(e) => setProviderForm({ ...providerForm, email: e.target.value })} />
              <input className="form-input" placeholder="Address" value={providerForm.address} onChange={(e) => setProviderForm({ ...providerForm, address: e.target.value })} />
              <input className="form-input" placeholder="Notes" value={providerForm.notes} onChange={(e) => setProviderForm({ ...providerForm, notes: e.target.value })} />
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-logout" disabled={submitting}>Save</button>
                <button type="button" className="btn-logout" onClick={() => setShowProviderForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
