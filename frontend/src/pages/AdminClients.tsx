import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { admin } from '../api/client';
import './Dashboard.css';

const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'PENDING', 'PERSONAL', 'FREE', 'LEFT'];

export default function AdminClients() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  const load = () => {
    setLoading(true);
    admin.customers(status ? { status } : undefined)
      .then((v) => { setList((v || []) as any[]); setIsDemo(false); })
      .catch(() => { setList([]); setIsDemo(true); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [status]);

  const handleExport = (format: 'csv' | 'html') => {
    setExporting(true);
    admin.customersExport(status ? { status, format } : { format })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = format === 'csv' ? 'clients-export.csv' : 'clients-export.html';
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => {})
      .finally(() => setExporting(false));
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      <h1>Client Management</h1>
      {isDemo && <div className="demo-banner">Backend not connected.</div>}
      <p className="muted">Active, Inactive, Personal, Free, Left client list. Export PPPoE/Password/Profile.</p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <label>
          Status:
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="form-input" style={{ width: 'auto', marginLeft: '0.5rem' }}>
            <option value="">All</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        {!isDemo && (
          <>
            <button type="button" className="btn-logout" onClick={() => handleExport('csv')} disabled={exporting}>Export CSV</button>
            <button type="button" className="btn-logout" onClick={() => handleExport('html')} disabled={exporting}>Export HTML/PDF</button>
          </>
        )}
      </div>
      {list.length === 0 && !isDemo && <p className="muted">No clients. Use MikroTik Import or New Client Request.</p>}
      {list.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Username</th>
                <th>Package</th>
                <th>Status</th>
                <th>Reseller</th>
                <th>Assigned</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c: any) => (
                <tr key={c.id}>
                  <td>{c.user?.name ?? '-'}</td>
                  <td>{c.user?.phone ?? '-'}</td>
                  <td>{c.username ?? c.staticIp ?? '-'}</td>
                  <td>{c.package?.name ?? '-'}</td>
                  <td>{c.status}</td>
                  <td>{c.reseller?.companyName ?? '-'}</td>
                  <td>{c.assignedToUser?.name ?? '-'}</td>
                  <td>{!isDemo && <Link to={`/clients/${c.id}`} className="nav-link" style={{ fontSize: '0.85rem' }}>Profile</Link>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
