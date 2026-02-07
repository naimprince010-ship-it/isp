import { useEffect, useState } from 'react';
import { purchase } from '../api/client';
import './Dashboard.css';

type Tab = 'vendors' | 'requisition' | 'purchase';
type Vendor = { id: string; name: string; contactPerson?: string; phone?: string; email?: string; address?: string; isActive: boolean };
type ReqItem = { id?: string; productName: string; quantity: number; unit?: string; estimatedRate?: number };
type Requisition = { id: string; requisitionNumber: string; status: string; notes?: string; createdAt: string; items: ReqItem[] };
type BillItem = { productName: string; quantity: number; unit?: string; rate: number; amount?: number };
type PurchaseBill = { id: string; billNumber: string; vendorId: string; vendor?: Vendor; requisitionId?: string; date: string; totalAmount: number; status: string; items?: BillItem[] };

export default function PurchaseManagement() {
  const [tab, setTab] = useState<Tab>('vendors');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [bills, setBills] = useState<PurchaseBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showVendorForm, setShowVendorForm] = useState(false);
  const [vendorForm, setVendorForm] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '', notes: '' });
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const [reqItems, setReqItems] = useState<{ productName: string; quantity: string; unit: string; estimatedRate: string }[]>([{ productName: '', quantity: '', unit: 'pcs', estimatedRate: '' }]);
  const [reqNotes, setReqNotes] = useState('');

  const [billVendorId, setBillVendorId] = useState('');
  const [billRequisitionId, setBillRequisitionId] = useState('');
  const [billItems, setBillItems] = useState<{ productName: string; quantity: string; unit: string; rate: string }[]>([{ productName: '', quantity: '', unit: 'pcs', rate: '' }]);
  const [billNotes, setBillNotes] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      purchase.vendors(false).then((v) => setVendors((v || []) as Vendor[])).catch(() => setVendors([])),
      purchase.requisitions().then((v) => setRequisitions((v || []) as Requisition[])).catch(() => setRequisitions([])),
      purchase.purchaseBills().then((v) => setBills((v || []) as PurchaseBill[])).catch(() => setBills([])),
    ])
      .then(() => setIsDemo(false))
      .catch(() => setIsDemo(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSaveVendor = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!vendorForm.name.trim()) { setError('Vendor name required'); return; }
    setSubmitting(true);
    const data = { name: vendorForm.name.trim(), contactPerson: vendorForm.contactPerson.trim() || undefined, phone: vendorForm.phone.trim() || undefined, email: vendorForm.email.trim() || undefined, address: vendorForm.address.trim() || undefined, notes: vendorForm.notes.trim() || undefined };
    (editingVendor ? purchase.updateVendor(editingVendor.id, data) : purchase.createVendor(data))
      .then(() => { setShowVendorForm(false); setEditingVendor(null); setVendorForm({ name: '', contactPerson: '', phone: '', email: '', address: '', notes: '' }); load(); })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  const handleCreateRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const items = reqItems
      .map((i) => ({ productName: i.productName.trim(), quantity: parseFloat(i.quantity) || 0, unit: i.unit || 'pcs', estimatedRate: parseFloat(i.estimatedRate) || undefined }))
      .filter((i) => i.productName && i.quantity > 0);
    if (items.length === 0) { setError('Add at least one item'); return; }
    setSubmitting(true);
    purchase.createRequisition({ items, notes: reqNotes.trim() || undefined })
      .then(() => { setReqItems([{ productName: '', quantity: '', unit: 'pcs', estimatedRate: '' }]); setReqNotes(''); load(); })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  const handleCreatePurchaseBill = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!billVendorId) { setError('Select vendor'); return; }
    const items = billItems
      .map((i) => ({ productName: i.productName.trim(), quantity: parseFloat(i.quantity) || 0, unit: i.unit || 'pcs', rate: parseFloat(i.rate) || 0 }))
      .filter((i) => i.productName && i.quantity > 0 && i.rate >= 0);
    if (items.length === 0) { setError('Add at least one item'); return; }
    setSubmitting(true);
    purchase.createPurchaseBill({
      vendorId: billVendorId,
      requisitionId: billRequisitionId || undefined,
      items,
      notes: billNotes.trim() || undefined,
    })
      .then(() => { setBillVendorId(''); setBillRequisitionId(''); setBillItems([{ productName: '', quantity: '', unit: 'pcs', rate: '' }]); setBillNotes(''); load(); })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  const handleRequisitionStatus = (id: string, status: string) => {
    setSubmitting(true);
    purchase.updateRequisitionStatus(id, status)
      .then(() => load())
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  const handleBillStatus = (id: string, status: string) => {
    setSubmitting(true);
    purchase.updatePurchaseBillStatus(id, status)
      .then(() => load())
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  const printPurchaseBill = (id: string) => {
    purchase.purchaseBill(id).then((bill: any) => {
      const items = (bill.items || []).map((i: any) => `<tr><td>${i.productName}</td><td>${i.quantity}</td><td>${i.unit ?? 'pcs'}</td><td>${i.rate}</td><td>${i.amount ?? (i.quantity * i.rate)}</td></tr>`).join('');
      const html = `
        <html><body style="font-family:sans-serif;padding:2rem">
        <h1>Purchase Bill</h1>
        <p><strong>Bill #:</strong> ${bill.billNumber} &nbsp; <strong>Date:</strong> ${new Date(bill.date).toLocaleDateString()}</p>
        <p><strong>Vendor:</strong> ${bill.vendor?.name ?? '-'} | ${bill.vendor?.phone ?? '-'}</p>
        <table border="1" cellpadding="8" style="border-collapse:collapse;width:100%;max-width:600px">
        <thead><tr><th>Product</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>${items}</tbody><tfoot><tr><th colspan="4">Total</th><th>${bill.totalAmount}</th></tr></tfoot>
        </table>
        </body></html>`;
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
    }).catch(() => setError('Failed to load bill'));
  };

  if (loading) return <div className="loading">Loading...</div>;

  const tabBtn = (t: Tab, label: string) => (
    <button type="button" key={t} className={tab === t ? 'btn-logout' : ''} style={{ padding: '0.5rem 1rem', background: tab === t ? undefined : '#334155', border: '1px solid #475569' }} onClick={() => setTab(t)}>{label}</button>
  );

  return (
    <div className="dashboard">
      <h1>Purchase Management</h1>
      {isDemo && <div className="demo-banner">Backend not connected.</div>}
      <p className="muted">Vendors list, purchase requisitions, purchase bills.</p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {tabBtn('vendors', 'Vendors')}
        {tabBtn('requisition', 'Requisition')}
        {tabBtn('purchase', 'Purchase Bill')}
      </div>

      {error && <div className="error-msg" style={{ marginBottom: '0.5rem' }}>{error}</div>}

      {tab === 'vendors' && (
        <>
          {!isDemo && (
            <div style={{ marginBottom: '1rem' }}>
              <button type="button" className="btn-logout" onClick={() => { setShowVendorForm(true); setEditingVendor(null); setVendorForm({ name: '', contactPerson: '', phone: '', email: '', address: '', notes: '' }); setError(''); }}>Add Vendor</button>
            </div>
          )}
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Contact</th><th>Phone</th><th>Email</th><th>Address</th>{!isDemo && <th>Actions</th>}</tr></thead>
              <tbody>
                {vendors.filter((v) => v.isActive !== false).map((v) => (
                  <tr key={v.id}>
                    <td>{v.name}</td>
                    <td>{v.contactPerson ?? '-'}</td>
                    <td>{v.phone ?? '-'}</td>
                    <td>{v.email ?? '-'}</td>
                    <td>{v.address ?? '-'}</td>
                    {!isDemo && (
                      <td>
                        <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', marginRight: '0.25rem' }} onClick={() => { setEditingVendor(v); setVendorForm({ name: v.name, contactPerson: v.contactPerson || '', phone: v.phone || '', email: v.email || '', address: v.address || '', notes: '' }); setShowVendorForm(true); }}>Edit</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {vendors.length === 0 && <p className="muted">No vendors yet.</p>}
        </>
      )}

      {tab === 'requisition' && (
        <>
          {!isDemo && (
            <div className="card" style={{ marginBottom: '1.5rem', maxWidth: 560 }}>
              <h3>Create Requisition</h3>
              <form onSubmit={handleCreateRequisition}>
                <label>Items</label>
                {reqItems.map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input className="form-input" style={{ flex: '1 1 120px', minWidth: 100 }} placeholder="Product name" value={it.productName} onChange={(e) => { const arr = [...reqItems]; arr[idx].productName = e.target.value; setReqItems(arr); }} />
                    <input type="number" step="0.01" min="0" className="form-input" style={{ width: 70 }} placeholder="Qty" value={it.quantity} onChange={(e) => { const arr = [...reqItems]; arr[idx].quantity = e.target.value; setReqItems(arr); }} />
                    <input className="form-input" style={{ width: 60 }} placeholder="Unit" value={it.unit} onChange={(e) => { const arr = [...reqItems]; arr[idx].unit = e.target.value; setReqItems(arr); }} />
                    <input type="number" step="0.01" min="0" className="form-input" style={{ width: 80 }} placeholder="Est. rate" value={it.estimatedRate} onChange={(e) => { const arr = [...reqItems]; arr[idx].estimatedRate = e.target.value; setReqItems(arr); }} />
                    <button type="button" className="btn-logout" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setReqItems(reqItems.filter((_, i) => i !== idx))}>Remove</button>
                  </div>
                ))}
                <button type="button" className="btn-logout" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }} onClick={() => setReqItems([...reqItems, { productName: '', quantity: '', unit: 'pcs', estimatedRate: '' }])}>+ Add item</button>
                <input className="form-input" placeholder="Notes (optional)" value={reqNotes} onChange={(e) => setReqNotes(e.target.value)} />
                <button type="submit" className="btn-logout" style={{ marginTop: '0.5rem' }} disabled={submitting}>{submitting ? 'Creating...' : 'Create Requisition'}</button>
              </form>
            </div>
          )}
          <div className="section">
            <h2>Requisitions</h2>
            {requisitions.length === 0 && <p className="muted">No requisitions yet.</p>}
            {requisitions.length > 0 && (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Requisition #</th><th>Status</th><th>Items</th><th>Date</th>{!isDemo && <th>Actions</th>}</tr></thead>
                  <tbody>
                    {requisitions.map((r) => (
                      <tr key={r.id}>
                        <td>{r.requisitionNumber}</td>
                        <td>{r.status}</td>
                        <td>{r.items?.length ?? 0} item(s)</td>
                        <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                        {!isDemo && (
                          <td>
                            {r.status === 'PENDING' && (
                              <>
                                <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', marginRight: '0.25rem' }} onClick={() => handleRequisitionStatus(r.id, 'APPROVED')} disabled={submitting}>Approve</button>
                                <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }} onClick={() => handleRequisitionStatus(r.id, 'REJECTED')} disabled={submitting}>Reject</button>
                              </>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'purchase' && (
        <>
          {!isDemo && (
            <div className="card" style={{ marginBottom: '1.5rem', maxWidth: 600 }}>
              <h3>Create Purchase Bill</h3>
              <form onSubmit={handleCreatePurchaseBill}>
                <label>Vendor *</label>
                <select className="form-input" value={billVendorId} onChange={(e) => setBillVendorId(e.target.value)} required>
                  <option value="">Select vendor</option>
                  {vendors.filter((v) => v.isActive !== false).map((v) => (
                    <option key={v.id} value={v.id}>{v.name} — {v.phone ?? '-'}</option>
                  ))}
                </select>
                <label>Link to Requisition (optional)</label>
                <select className="form-input" value={billRequisitionId} onChange={(e) => setBillRequisitionId(e.target.value)}>
                  <option value="">— None —</option>
                  {requisitions.filter((r) => r.status === 'APPROVED').map((r) => (
                    <option key={r.id} value={r.id}>{r.requisitionNumber}</option>
                  ))}
                </select>
                <label>Items</label>
                {billItems.map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input className="form-input" style={{ flex: '1 1 120px', minWidth: 100 }} placeholder="Product name" value={it.productName} onChange={(e) => { const arr = [...billItems]; arr[idx].productName = e.target.value; setBillItems(arr); }} />
                    <input type="number" step="0.01" min="0" className="form-input" style={{ width: 70 }} placeholder="Qty" value={it.quantity} onChange={(e) => { const arr = [...billItems]; arr[idx].quantity = e.target.value; setBillItems(arr); }} />
                    <input className="form-input" style={{ width: 60 }} placeholder="Unit" value={it.unit} onChange={(e) => { const arr = [...billItems]; arr[idx].unit = e.target.value; setBillItems(arr); }} />
                    <input type="number" step="0.01" min="0" className="form-input" style={{ width: 80 }} placeholder="Rate" value={it.rate} onChange={(e) => { const arr = [...billItems]; arr[idx].rate = e.target.value; setBillItems(arr); }} />
                    <button type="button" className="btn-logout" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setBillItems(billItems.filter((_, i) => i !== idx))}>Remove</button>
                  </div>
                ))}
                <button type="button" className="btn-logout" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }} onClick={() => setBillItems([...billItems, { productName: '', quantity: '', unit: 'pcs', rate: '' }])}>+ Add item</button>
                <input className="form-input" placeholder="Notes (optional)" value={billNotes} onChange={(e) => setBillNotes(e.target.value)} />
                <button type="submit" className="btn-logout" style={{ marginTop: '0.5rem' }} disabled={submitting}>{submitting ? 'Creating...' : 'Create Purchase Bill'}</button>
              </form>
            </div>
          )}
          <div className="section">
            <h2>Purchase Bills</h2>
            {bills.length === 0 && <p className="muted">No purchase bills yet.</p>}
            {bills.length > 0 && (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Bill #</th><th>Vendor</th><th>Total</th><th>Status</th><th>Date</th>{!isDemo && <th>Actions</th>}</tr></thead>
                  <tbody>
                    {bills.map((b) => (
                      <tr key={b.id}>
                        <td>{b.billNumber}</td>
                        <td>{(b.vendor as Vendor)?.name ?? '-'}</td>
                        <td>{b.totalAmount}</td>
                        <td>{b.status}</td>
                        <td>{new Date(b.date).toLocaleDateString()}</td>
                        {!isDemo && (
                          <td>
                            <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', marginRight: '0.25rem' }} onClick={() => printPurchaseBill(b.id)}>Print</button>
                            {b.status === 'PENDING' && <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', marginRight: '0.25rem' }} onClick={() => handleBillStatus(b.id, 'RECEIVED')} disabled={submitting}>Received</button>}
                            {b.status === 'RECEIVED' && <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }} onClick={() => handleBillStatus(b.id, 'PAID')} disabled={submitting}>Paid</button>}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {showVendorForm && (
        <div className="modal-overlay" onClick={() => { setShowVendorForm(false); setEditingVendor(null); }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h2>{editingVendor ? 'Edit Vendor' : 'Add Vendor'}</h2>
            <form onSubmit={handleSaveVendor}>
              <input className="form-input" placeholder="Vendor name *" value={vendorForm.name} onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })} required />
              <input className="form-input" placeholder="Contact person" value={vendorForm.contactPerson} onChange={(e) => setVendorForm({ ...vendorForm, contactPerson: e.target.value })} />
              <input className="form-input" placeholder="Phone" value={vendorForm.phone} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} />
              <input className="form-input" placeholder="Email" value={vendorForm.email} onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })} />
              <input className="form-input" placeholder="Address" value={vendorForm.address} onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })} />
              <input className="form-input" placeholder="Notes" value={vendorForm.notes} onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })} />
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-logout" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
                <button type="button" className="btn-logout" onClick={() => { setShowVendorForm(false); setEditingVendor(null); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
