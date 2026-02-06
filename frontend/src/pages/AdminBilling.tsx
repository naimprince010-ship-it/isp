import { useEffect, useState } from 'react';
import { admin } from '../api/client';
import './Dashboard.css';

type Bill = { id: string; amount: number; dueDate: string; status: string; customer?: { user?: { name: string; phone: string }; reseller?: { companyName?: string } }; package?: { name: string } };

export default function AdminBilling() {
  const [list, setList] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const [extendFor, setExtendFor] = useState<Bill | null>(null);
  const [extendDays, setExtendDays] = useState('7');
  const [extendSubmitting, setExtendSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    const params: { status?: string; month?: number; year?: number } = {};
    if (status) params.status = status;
    if (month) params.month = parseInt(month, 10);
    if (year) params.year = parseInt(year, 10);
    admin.bills(Object.keys(params).length ? params : undefined)
      .then((v) => { setList((v || []) as Bill[]); setIsDemo(false); })
      .catch(() => { setList([]); setIsDemo(true); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [status, month, year]);

  const handleExport = (format: 'csv' | 'html') => {
    setExporting(true);
    const params: { format: 'csv' | 'html'; status?: string; month?: number; year?: number } = { format };
    if (status) params.status = status;
    if (month) params.month = parseInt(month, 10);
    if (year) params.year = parseInt(year, 10);
    admin.billsExport(params)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = format === 'csv' ? 'billing-list.csv' : 'billing-list.html';
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => setError('Export failed'))
      .finally(() => setExporting(false));
  };

  const openInvoice = (billId: string) => {
    admin.getBillInvoice(billId).then((html) => {
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
    }).catch(() => setError('Invoice failed'));
  };

  const handleExtend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendFor || !extendDays || parseInt(extendDays, 10) < 1) return;
    setExtendSubmitting(true);
    setError('');
    admin.extendBill(extendFor.id, { extendDays: parseInt(extendDays, 10) })
      .then(() => { setExtendFor(null); setExtendDays('7'); load(); })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setExtendSubmitting(false));
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      <h1>Billing Management</h1>
      {isDemo && <div className="demo-banner">Backend not connected.</div>}
      <p className="muted">Monthly bills, payment deadline, extend, invoice, export PDF/Excel, payment link, employee collection.</p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
        <label>Status: <select value={status} onChange={(e) => setStatus(e.target.value)} className="form-input" style={{ width: 'auto' }}><option value="">All</option><option value="PENDING">PENDING</option><option value="PAID">PAID</option><option value="OVERDUE">OVERDUE</option></select></label>
        <label>Month: <input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(e.target.value)} className="form-input" style={{ width: 60 }} /></label>
        <label>Year: <input type="number" min="2020" max="2030" value={year} onChange={(e) => setYear(e.target.value)} className="form-input" style={{ width: 70 }} /></label>
        {!isDemo && (
          <>
            <button type="button" className="btn-logout" onClick={() => handleExport('csv')} disabled={exporting}>Export CSV</button>
            <button type="button" className="btn-logout" onClick={() => handleExport('html')} disabled={exporting}>Export HTML/PDF</button>
          </>
        )}
      </div>
      {error && <div className="error-msg" style={{ marginBottom: '0.5rem' }}>{error}</div>}
      {list.length === 0 && !isDemo && <p className="muted">No bills.</p>}
      {list.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Package</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Reseller</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((b) => (
                <tr key={b.id}>
                  <td>{(b.customer as any)?.user?.name ?? '-'}</td>
                  <td>{(b.customer as any)?.user?.phone ?? '-'}</td>
                  <td>{b.package?.name ?? '-'}</td>
                  <td>{b.amount}</td>
                  <td>{b.dueDate ? new Date(b.dueDate).toLocaleDateString() : '-'}</td>
                  <td>{b.status}</td>
                  <td>{(b.customer as any)?.reseller?.companyName ?? '-'}</td>
                  <td>
                    {!isDemo && (
                      <>
                        <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', marginRight: '0.25rem' }} onClick={() => openInvoice(b.id)}>Invoice</button>
                        {b.status !== 'PAID' && (
                          <>
                            <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', marginRight: '0.25rem' }} onClick={() => setExtendFor(b)}>Extend</button>
                            <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }} onClick={() => { admin.createPaymentLink(b.id, 7).then((r) => window.open(r.link, '_blank')).catch(() => setError('Link failed')); }}>Payment Link</button>
                          </>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {extendFor && (
        <div className="modal-overlay" onClick={() => setExtendFor(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Extend Due Date</h2>
            <form onSubmit={handleExtend}>
              <label>Extend by (days): <input type="number" min="1" value={extendDays} onChange={(e) => setExtendDays(e.target.value)} className="form-input" style={{ width: 60 }} /></label>
              <div style={{ marginTop: '0.5rem' }}><button type="submit" className="btn-logout" disabled={extendSubmitting}>Extend</button> <button type="button" className="btn-logout" onClick={() => setExtendFor(null)}>Cancel</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
