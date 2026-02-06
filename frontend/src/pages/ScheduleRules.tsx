import { useEffect, useState } from 'react';
import { admin } from '../api/client';
import './Dashboard.css';

export default function ScheduleRules() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ customerId: '', scheduledAt: '', newStatus: '', newPackageId: '' });

  const load = () => {
    setLoading(true);
    admin.scheduleRules().then((v) => { setList((v || []) as any[]); setIsDemo(false); }).catch(() => { setList([]); setIsDemo(true); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId.trim() || !form.scheduledAt.trim()) return;
    setSubmitting(true);
    admin.createScheduleRule({
      customerId: form.customerId.trim(),
      scheduledAt: form.scheduledAt,
      newStatus: form.newStatus || undefined,
      newPackageId: form.newPackageId || undefined,
    }).then(() => { setForm({ customerId: '', scheduledAt: '', newStatus: '', newPackageId: '' }); load(); }).catch(() => {}).finally(() => setSubmitting(false));
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this schedule rule?')) return;
    admin.deleteScheduleRule(id).then(() => load()).catch(() => {});
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      <h1>Schedule Rules</h1>
      {isDemo && <div className="demo-banner">Backend সংযুক্ত নেই।</div>}
      <p className="muted">Client status and package change at a future time (cron runs every 5 min)</p>
      {!isDemo && (
        <div className="section" style={{ maxWidth: 480, marginBottom: '2rem' }}>
          <h2 className="section-title">Add Schedule Rule</h2>
          <form onSubmit={handleAdd}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Customer ID</label>
            <input type="text" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="form-input" placeholder="Customer profile ID" required />
            <label style={{ display: 'block', marginBottom: '0.5rem', marginTop: '0.5rem', color: '#94a3b8' }}>Scheduled At (date/time)</label>
            <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className="form-input" required />
            <label style={{ display: 'block', marginBottom: '0.5rem', marginTop: '0.5rem', color: '#94a3b8' }}>New Status (optional)</label>
            <select value={form.newStatus} onChange={(e) => setForm({ ...form, newStatus: e.target.value })} className="form-input">
              <option value="">—</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="BLOCKED">BLOCKED</option>
              <option value="LEFT">LEFT</option>
            </select>
            <button type="submit" className="btn-logout" style={{ marginTop: '0.5rem' }} disabled={submitting}>{submitting ? 'Adding...' : 'Add Rule'}</button>
          </form>
        </div>
      )}
      {list.length === 0 && !isDemo && <p className="muted">কোনো schedule rule নেই।</p>}
      {list.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Scheduled At</th>
                <th>New Status</th>
                <th>New Package</th>
                <th>Applied</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r: any) => (
                <tr key={r.id}>
                  <td>{r.customerId}</td>
                  <td>{r.scheduledAt ? new Date(r.scheduledAt).toLocaleString() : '-'}</td>
                  <td>{r.newStatus ?? '-'}</td>
                  <td>{r.newPackageId ?? '-'}</td>
                  <td>{r.appliedAt ? new Date(r.appliedAt).toLocaleString() : 'Pending'}</td>
                  <td>
                    {!r.appliedAt && !isDemo && (
                      <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => handleDelete(r.id)}>Delete</button>
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
