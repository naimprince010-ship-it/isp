import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { admin } from '../api/client';
import './Dashboard.css';

export default function AdminClientProfile() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ profile: any; bills: any[]; payments: any[]; usageLogs: any[]; tickets: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    admin.customerProfile(id)
      .then((v) => { setData(v as any); setIsDemo(false); })
      .catch(() => { setData(null); setIsDemo(true); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">Loading...</div>;
  if (!data && !isDemo) return <div className="dashboard"><p className="muted">Client not found.</p><Link to="/clients">Back to Clients</Link></div>;

  const p = data?.profile as any;
  const bills = data?.bills || [];
  const payments = data?.payments || [];
  const usageLogs = data?.usageLogs || [];
  const tickets = data?.tickets || [];

  return (
    <div className="dashboard">
      <div style={{ marginBottom: '1rem' }}><Link to="/clients" className="nav-link">Back to Clients</Link></div>
      <h1>Client Profile</h1>
      {isDemo && <div className="demo-banner">Backend not connected.</div>}
      {p && (
        <>
          <div className="section" style={{ maxWidth: 560 }}>
            <h2 className="section-title">Profile</h2>
            <p><strong>Name:</strong> {p.user?.name ?? '-'}</p>
            <p><strong>Phone:</strong> {p.user?.phone ?? '-'}</p>
            <p><strong>Package:</strong> {p.package?.name ?? '-'}</p>
            <p><strong>Status:</strong> {p.status}</p>
            <p><strong>Username / PPPoE:</strong> {p.username ?? p.staticIp ?? '-'}</p>
            <p><strong>Address:</strong> {p.address ?? '-'}</p>
            <p><strong>Reseller:</strong> {p.reseller?.companyName ?? '-'}</p>
            <p><strong>Assigned To:</strong> {p.assignedToUser?.name ?? '-'}</p>
            {p.leftAt && <p><strong>Left At:</strong> {new Date(p.leftAt).toLocaleString()} {p.leftReason && `(${p.leftReason})`}</p>}
          </div>
          <div className="section">
            <h2 className="section-title">Bills ({bills.length})</h2>
            {bills.length === 0 && <p className="muted">No bills.</p>}
            {bills.length > 0 && (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Due Date</th><th>Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    {bills.slice(0, 20).map((b: any) => (
                      <tr key={b.id}><td>{b.dueDate ? new Date(b.dueDate).toLocaleDateString() : '-'}</td><td>{b.amount}</td><td>{b.status}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="section">
            <h2 className="section-title">Payments ({payments.length})</h2>
            {payments.length === 0 && <p className="muted">No payments.</p>}
            {payments.length > 0 && (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Amount</th><th>Method</th></tr></thead>
                  <tbody>
                    {payments.slice(0, 20).map((pay: any) => (
                      <tr key={pay.id}><td>{pay.createdAt ? new Date(pay.createdAt).toLocaleString() : '-'}</td><td>{pay.amount}</td><td>{pay.method ?? '-'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="section">
            <h2 className="section-title">Usage Logs ({usageLogs.length})</h2>
            {usageLogs.length === 0 && <p className="muted">No usage logs.</p>}
            {usageLogs.length > 0 && (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Total Bytes</th></tr></thead>
                  <tbody>
                    {usageLogs.slice(0, 15).map((u: any, i) => (
                      <tr key={u.date || i}><td>{u.date}</td><td>{u.totalBytes != null ? `${(u.totalBytes / (1024 * 1024)).toFixed(2)} MB` : '-'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="section">
            <h2 className="section-title">Tickets ({tickets.length})</h2>
            {tickets.length === 0 && <p className="muted">No tickets.</p>}
            {tickets.length > 0 && (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Subject</th><th>Status</th><th>Created</th></tr></thead>
                  <tbody>
                    {tickets.slice(0, 10).map((t: any) => (
                      <tr key={t.id}><td>{t.subject}</td><td>{t.status}</td><td>{t.createdAt ? new Date(t.createdAt).toLocaleString() : '-'}</td></tr>
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
