import { useEffect, useState } from 'react';
import { admin } from '../api/client';
import './Dashboard.css';

export default function PendingApprovals() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    admin.pendingPaymentApprovals('PENDING')
      .then((v) => { setList((v || []) as any[]); setIsDemo(false); })
      .catch(() => { setList([]); setIsDemo(true); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleApprove = (id: string) => {
    setError('');
    setSubmitting(id);
    admin.approvePendingPayment(id, 'APPROVED').then(() => load()).catch((err) => setError(err?.message || 'Failed')).finally(() => setSubmitting(null));
  };

  const handleReject = (id: string) => {
    setError('');
    setSubmitting(id);
    admin.approvePendingPayment(id, 'REJECTED').then(() => load()).catch((err) => setError(err?.message || 'Failed')).finally(() => setSubmitting(null));
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      <h1>Pending Payment Approvals</h1>
      {isDemo && <div className="demo-banner">Backend not connected.</div>}
      <p className="muted">Bill collection by employee requires admin approval. Approve or reject here.</p>
      {error && <div className="error-msg" style={{ marginBottom: '0.5rem' }}>{error}</div>}
      {list.length === 0 && !isDemo && <p className="muted">No pending approvals.</p>}
      {list.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Bill Amount</th>
                <th>Collected Amount</th>
                <th>Method</th>
                <th>Trx ID</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p: any) => (
                <tr key={p.id}>
                  <td>{p.bill?.customer?.user?.name ?? '-'}</td>
                  <td>{p.bill?.amount ?? '-'}</td>
                  <td>{p.amount}</td>
                  <td>{p.method ?? '-'}</td>
                  <td>{p.trxId ?? '-'}</td>
                  <td>{p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}</td>
                  <td>
                    {!isDemo && (
                      <>
                        <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', marginRight: '0.25rem' }} onClick={() => handleApprove(p.id)} disabled={!!submitting}>Approve</button>
                        <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => handleReject(p.id)} disabled={!!submitting}>Reject</button>
                      </>
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
