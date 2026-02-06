import { useEffect, useState } from 'react';
import { admin } from '../api/client';
import './Dashboard.css';

export default function NewClientRequests() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [status, setStatus] = useState<string>('PENDING');
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    admin.newClientRequests(status || undefined).then((v) => { setList((v || []) as any[]); setIsDemo(false); }).catch(() => { setList([]); setIsDemo(true); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [status]);

  const handleReview = (id: string, approve: boolean) => {
    setError('');
    setSubmitting(id);
    admin.reviewNewClientRequest(id, approve ? 'APPROVED' : 'REJECTED').then(() => load()).catch((err) => setError(err?.message || 'Failed')).finally(() => setSubmitting(null));
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      <h1>New Client Requests</h1>
      {isDemo && <div className="demo-banner">Backend সংযুক্ত নেই।</div>}
      <p className="muted">Add New Client Request from portal/app. Approve/Reject here to create User and CustomerProfile.</p>
      <div style={{ marginBottom: '1rem' }}>
        <label>
          Status:
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="form-input" style={{ width: 'auto', marginLeft: '0.5rem' }}>
            <option value="">All</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </label>
      </div>
      {error && <div className="error-msg" style={{ marginBottom: '0.5rem' }}>{error}</div>}
      {list.length === 0 && !isDemo && <p className="muted">কোনো রিকোয়েস্ট নেই।</p>}
      {list.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Connection</th>
                <th>Username / IP</th>
                <th>Address</th>
                <th>Status</th>
                <th>Created</th>
                {status === 'PENDING' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {list.map((r: any) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.phone}</td>
                  <td>{r.connectionType || 'PPPoE'}</td>
                  <td>{r.requestedUsername || r.requestedStaticIp || '-'}</td>
                  <td>{r.address ?? '-'}</td>
                  <td>{r.status}</td>
                  <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</td>
                  {status === 'PENDING' && (
                    <td>
                      {!isDemo && (
                        <>
                          <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', marginRight: '0.25rem' }} onClick={() => handleReview(r.id, true)} disabled={!!submitting}>Approve</button>
                          <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => handleReview(r.id, false)} disabled={!!submitting}>Reject</button>
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
  );
}
