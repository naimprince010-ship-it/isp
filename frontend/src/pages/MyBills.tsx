import { useEffect, useState } from 'react';
import { customer } from '../api/client';
import { DEMO_MY_BILLS } from '../data/demoData';
import './Dashboard.css';

export default function MyBills() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState<string | null>(null);

  useEffect(() => {
    customer.bills().then((v) => { setList(v || []); setIsDemo(false); }).catch(() => { setList(DEMO_MY_BILLS as any); setIsDemo(true); }).finally(() => setLoading(false));
  }, []);

  const openInvoice = (billId: string) => {
    if (isDemo) return;
    setInvoiceLoading(billId);
    customer.getBillInvoice(billId).then((html) => {
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
    }).catch(() => {}).finally(() => setInvoiceLoading(null));
  };

  if (loading) return <div className="loading">Loading...</div>;
  return (
    <div className="dashboard">
      <h1>My Bills</h1>
      {isDemo && <div className="demo-banner">Backend সংযুক্ত নেই।</div>}
      {list.length === 0 && !isDemo && <p className="muted">কোনো বিল নেই।</p>}
      {list.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Package</th><th>Amount (BDT)</th><th>Due Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {list.map((b) => (
                <tr key={b.id}>
                  <td>{b.package?.name ?? '-'}</td>
                  <td>{Number(b.amount).toLocaleString()}</td>
                  <td>{new Date(b.dueDate).toLocaleDateString()}</td>
                  <td>{b.status}</td>
                  <td>
                    {!isDemo && (
                      <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => openInvoice(b.id)} disabled={invoiceLoading === b.id}>{invoiceLoading === b.id ? '...' : 'Invoice'}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
