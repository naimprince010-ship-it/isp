import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { admin, reseller, sales } from '../api/client';
import './Dashboard.css';

type Tab = 'fee' | 'product' | 'service';
type Customer = { id: string; user?: { name: string; phone: string }; package?: { name: string } };
type Fee = { id: string; amount: number; method: string; trxId?: string; notes?: string; createdAt: string; customer?: Customer };
type ProductInv = { id: string; invoiceNumber: string; totalAmount: number; date: string; customer?: Customer; items?: unknown[] };
type ServiceInv = { id: string; invoiceNumber: string; amount: number; description: string; date: string; customer?: Customer };

export default function SalesService() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('fee');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [productInvs, setProductInvs] = useState<ProductInv[]>([]);
  const [serviceInvs, setServiceInvs] = useState<ServiceInv[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const feeForm = { customerId: '', amount: '', method: 'CASH', trxId: '', notes: '' };
  const [feeState, setFeeState] = useState(feeForm);

  const [productItems, setProductItems] = useState([{ productName: '', quantity: '1', rate: '' }]);
  const [productCustomerId, setProductCustomerId] = useState('');

  const [serviceForm, setServiceForm] = useState({ customerId: '', description: '', amount: '' });

  const loadCustomers = () => {
    if (user?.role === 'ADMIN') admin.customers().then((v) => setCustomers((v || []) as Customer[])).catch(() => setCustomers([]));
    else if (user?.role === 'RESELLER') reseller.customers().then((v) => setCustomers((v || []) as Customer[])).catch(() => setCustomers([]));
    else setCustomers([]);
  };

  const load = () => {
    setLoading(true);
    Promise.all([
      sales.installationFees().then((v) => setFees((v || []) as Fee[])).catch(() => setFees([])),
      sales.productInvoices().then((v) => setProductInvs((v || []) as ProductInv[])).catch(() => setProductInvs([])),
      sales.serviceInvoices().then((v) => setServiceInvs((v || []) as ServiceInv[])).catch(() => setServiceInvs([])),
    ])
      .then(() => setIsDemo(false))
      .catch(() => setIsDemo(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    loadCustomers();
  }, [user?.role]);

  const handleCollectFee = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(feeState.amount);
    if (!feeState.customerId || !amt || amt <= 0) { setError('Select customer and enter amount'); return; }
    setSubmitting(true);
    sales.collectInstallationFee({
      customerId: feeState.customerId,
      amount: amt,
      method: feeState.method,
      trxId: feeState.trxId.trim() || undefined,
      notes: feeState.notes.trim() || undefined,
    })
      .then(() => { setFeeState(feeForm); load(); })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  const handleCreateProductInv = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const items = productItems
      .map((i) => ({ productName: i.productName.trim(), quantity: parseInt(i.quantity, 10) || 1, rate: parseFloat(i.rate) || 0 }))
      .filter((i) => i.productName && i.rate > 0);
    if (items.length === 0) { setError('Add at least one product'); return; }
    setSubmitting(true);
    sales.createProductInvoice({
      customerId: productCustomerId || undefined,
      items,
    })
      .then(() => { setProductItems([{ productName: '', quantity: '1', rate: '' }]); setProductCustomerId(''); load(); })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  const handleCreateServiceInv = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(serviceForm.amount);
    if (!serviceForm.description.trim() || !amt || amt <= 0) { setError('Description and amount required'); return; }
    setSubmitting(true);
    sales.createServiceInvoice({
      customerId: serviceForm.customerId || undefined,
      description: serviceForm.description.trim(),
      amount: amt,
    })
      .then(() => { setServiceForm({ customerId: '', description: '', amount: '' }); load(); })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  const printProductInv = (id: string) => {
    sales.productInvoice(id).then((inv: any) => {
      const items = (inv.items || []).map((i: any) => `<tr><td>${i.productName}</td><td>${i.quantity}</td><td>${i.rate}</td><td>${i.amount ?? i.quantity * i.rate}</td></tr>`).join('');
      const html = `
        <html><body style="font-family:sans-serif;padding:2rem">
        <h1>Product Invoice</h1>
        <p><strong>Invoice:</strong> ${inv.invoiceNumber} &nbsp; <strong>Date:</strong> ${new Date(inv.date).toLocaleDateString()}</p>
        <p>Customer: ${inv.customer?.user?.name ?? '-'} (${inv.customer?.user?.phone ?? '-'})</p>
        <table border="1" cellpadding="8" style="border-collapse:collapse;width:100%;max-width:500px">
        <thead><tr><th>Product</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>${items}</tbody><tfoot><tr><th colspan="3">Total</th><th>${inv.totalAmount}</th></tr></tfoot>
        </table>
        </body></html>`;
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
    }).catch(() => setError('Failed to load invoice'));
  };

  const printServiceInv = (id: string) => {
    sales.serviceInvoice(id).then((inv: any) => {
      const html = `
        <html><body style="font-family:sans-serif;padding:2rem">
        <h1>Service Invoice</h1>
        <p><strong>Invoice:</strong> ${inv.invoiceNumber} &nbsp; <strong>Date:</strong> ${new Date(inv.date).toLocaleDateString()}</p>
        <p>Customer: ${inv.customer?.user?.name ?? '-'} (${inv.customer?.user?.phone ?? '-'})</p>
        <p><strong>Description:</strong> ${inv.description}</p>
        <p><strong>Amount:</strong> ${inv.amount}</p>
        </body></html>`;
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
    }).catch(() => setError('Failed to load invoice'));
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      <h1>Sales &amp; Service</h1>
      {isDemo && <div className="demo-banner">Backend not connected.</div>}
      <p className="muted">Collect installation fee, create product invoices, generate service invoices.</p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button type="button" className={tab === 'fee' ? 'btn-logout' : ''} style={{ padding: '0.5rem 1rem', background: tab === 'fee' ? undefined : '#334155', border: '1px solid #475569' }} onClick={() => setTab('fee')}>Collect Installation Fee</button>
        <button type="button" className={tab === 'product' ? 'btn-logout' : ''} style={{ padding: '0.5rem 1rem', background: tab === 'product' ? undefined : '#334155', border: '1px solid #475569' }} onClick={() => setTab('product')}>Create Product Invoice</button>
        <button type="button" className={tab === 'service' ? 'btn-logout' : ''} style={{ padding: '0.5rem 1rem', background: tab === 'service' ? undefined : '#334155', border: '1px solid #475569' }} onClick={() => setTab('service')}>Generate Service Invoice</button>
      </div>

      {error && <div className="error-msg" style={{ marginBottom: '0.5rem' }}>{error}</div>}

      {tab === 'fee' && (
        <>
          {!isDemo && (
            <div className="card" style={{ marginBottom: '1.5rem', maxWidth: 420 }}>
              <h3>Collect Installation Fee</h3>
              <form onSubmit={handleCollectFee}>
                <label>Customer *</label>
                <select className="form-input" value={feeState.customerId} onChange={(e) => setFeeState({ ...feeState, customerId: e.target.value })} required>
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.user?.name} — {c.user?.phone}</option>
                  ))}
                </select>
                <label>Amount *</label>
                <input type="number" step="0.01" min="0.01" className="form-input" placeholder="Amount" value={feeState.amount} onChange={(e) => setFeeState({ ...feeState, amount: e.target.value })} required />
                <label>Payment Method</label>
                <select className="form-input" value={feeState.method} onChange={(e) => setFeeState({ ...feeState, method: e.target.value })}>
                  <option value="CASH">CASH</option>
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                  <option value="ROCKET">Rocket</option>
                  <option value="BANK">Bank</option>
                </select>
                <input className="form-input" placeholder="Transaction ID (optional)" value={feeState.trxId} onChange={(e) => setFeeState({ ...feeState, trxId: e.target.value })} />
                <input className="form-input" placeholder="Notes (optional)" value={feeState.notes} onChange={(e) => setFeeState({ ...feeState, notes: e.target.value })} />
                <button type="submit" className="btn-logout" style={{ marginTop: '0.5rem' }} disabled={submitting}>{submitting ? 'Saving...' : 'Collect'}</button>
              </form>
            </div>
          )}
          <div className="section">
            <h2>Installation Fees Collected</h2>
            {fees.length === 0 && <p className="muted">No fees collected yet.</p>}
            {fees.length > 0 && (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Customer</th><th>Phone</th><th>Amount</th><th>Method</th><th>Trx ID</th><th>Date</th></tr></thead>
                  <tbody>
                    {fees.map((f) => (
                      <tr key={f.id}>
                        <td>{(f.customer as any)?.user?.name ?? '-'}</td>
                        <td>{(f.customer as any)?.user?.phone ?? '-'}</td>
                        <td>{f.amount}</td>
                        <td>{f.method}</td>
                        <td>{f.trxId ?? '-'}</td>
                        <td>{new Date(f.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'product' && (
        <>
          {!isDemo && (
            <div className="card" style={{ marginBottom: '1.5rem', maxWidth: 560 }}>
              <h3>Create Product Invoice</h3>
              <form onSubmit={handleCreateProductInv}>
                <label>Customer (optional)</label>
                <select className="form-input" value={productCustomerId} onChange={(e) => setProductCustomerId(e.target.value)}>
                  <option value="">— Walk-in / No customer —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.user?.name} — {c.user?.phone}</option>
                  ))}
                </select>
                <label>Items</label>
                {productItems.map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                    <input className="form-input" style={{ flex: 2 }} placeholder="Product name" value={it.productName} onChange={(e) => {
                      const arr = [...productItems]; arr[idx].productName = e.target.value; setProductItems(arr);
                    }} />
                    <input type="number" min="1" className="form-input" style={{ width: 60 }} value={it.quantity} onChange={(e) => {
                      const arr = [...productItems]; arr[idx].quantity = e.target.value; setProductItems(arr);
                    }} />
                    <input type="number" step="0.01" min="0" className="form-input" style={{ width: 80 }} placeholder="Rate" value={it.rate} onChange={(e) => {
                      const arr = [...productItems]; arr[idx].rate = e.target.value; setProductItems(arr);
                    }} />
                    <button type="button" className="btn-logout" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setProductItems(productItems.filter((_, i) => i !== idx))}>Remove</button>
                  </div>
                ))}
                <button type="button" className="btn-logout" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }} onClick={() => setProductItems([...productItems, { productName: '', quantity: '1', rate: '' }])}>+ Add item</button>
                <button type="submit" className="btn-logout" style={{ marginTop: '0.5rem' }} disabled={submitting}>{submitting ? 'Creating...' : 'Create Invoice'}</button>
              </form>
            </div>
          )}
          <div className="section">
            <h2>Product Invoices</h2>
            {productInvs.length === 0 && <p className="muted">No product invoices yet.</p>}
            {productInvs.length > 0 && (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Invoice #</th><th>Customer</th><th>Total</th><th>Date</th><th>Actions</th></tr></thead>
                  <tbody>
                    {productInvs.map((p) => (
                      <tr key={p.id}>
                        <td>{p.invoiceNumber}</td>
                        <td>{(p.customer as any)?.user?.name ?? '-'}</td>
                        <td>{p.totalAmount}</td>
                        <td>{new Date(p.date).toLocaleDateString()}</td>
                        <td><button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }} onClick={() => printProductInv(p.id)}>Print</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'service' && (
        <>
          {!isDemo && (
            <div className="card" style={{ marginBottom: '1.5rem', maxWidth: 420 }}>
              <h3>Generate Service Invoice</h3>
              <form onSubmit={handleCreateServiceInv}>
                <label>Customer (optional)</label>
                <select className="form-input" value={serviceForm.customerId} onChange={(e) => setServiceForm({ ...serviceForm, customerId: e.target.value })}>
                  <option value="">— Walk-in / No customer —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.user?.name} — {c.user?.phone}</option>
                  ))}
                </select>
                <label>Description *</label>
                <input className="form-input" placeholder="Service description" value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} required />
                <label>Amount *</label>
                <input type="number" step="0.01" min="0.01" className="form-input" placeholder="Amount" value={serviceForm.amount} onChange={(e) => setServiceForm({ ...serviceForm, amount: e.target.value })} required />
                <button type="submit" className="btn-logout" style={{ marginTop: '0.5rem' }} disabled={submitting}>{submitting ? 'Creating...' : 'Generate Invoice'}</button>
              </form>
            </div>
          )}
          <div className="section">
            <h2>Service Invoices</h2>
            {serviceInvs.length === 0 && <p className="muted">No service invoices yet.</p>}
            {serviceInvs.length > 0 && (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Invoice #</th><th>Customer</th><th>Description</th><th>Amount</th><th>Date</th><th>Actions</th></tr></thead>
                  <tbody>
                    {serviceInvs.map((s) => (
                      <tr key={s.id}>
                        <td>{s.invoiceNumber}</td>
                        <td>{(s.customer as any)?.user?.name ?? '-'}</td>
                        <td>{s.description}</td>
                        <td>{s.amount}</td>
                        <td>{new Date(s.date).toLocaleDateString()}</td>
                        <td><button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }} onClick={() => printServiceInv(s.id)}>Print</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
