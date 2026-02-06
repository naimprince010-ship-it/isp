import { useEffect, useState } from 'react';
import { sms } from '../api/client';
import './Dashboard.css';

export default function SMS() {
  const [logs, setLogs] = useState<{ id: string; phone: string; message: string; purpose: string; status: string; response?: string; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ phone: '', message: '', purpose: 'MANUAL' });

  const loadLogs = () => {
    sms.logs(100)
      .then((v) => { setLogs((v || []) as any); setIsDemo(false); })
      .catch(() => { setLogs([]); setIsDemo(true); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadLogs(); }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.phone.trim() || !form.message.trim()) {
      setError('Phone and message required');
      return;
    }
    setSubmitting(true);
    sms
      .send(form.phone.trim(), form.message.trim(), form.purpose)
      .then(() => { setShowForm(false); setForm({ phone: '', message: '', purpose: 'MANUAL' }); loadLogs(); })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      <h1>SMS</h1>
      {isDemo && <div className="demo-banner">Backend সংযুক্ত নেই।</div>}
      <div style={{ marginBottom: '1rem' }}>
        <button type="button" className="btn-logout" onClick={() => { setShowForm(true); setError(''); }}>Send SMS</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Send SMS</h2>
            <form onSubmit={handleSend}>
              <input className="form-input" placeholder="Phone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              <textarea className="form-input" placeholder="Message *" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
              <select className="form-input" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}>
                <option value="MANUAL">MANUAL</option>
                <option value="BILL_GEN">BILL_GEN</option>
                <option value="PAYMENT">PAYMENT</option>
                <option value="AUTO_BLOCK">AUTO_BLOCK</option>
              </select>
              {error && <div className="error-msg" style={{ marginTop: '0.5rem' }}>{error}</div>}
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-logout" disabled={submitting}>{submitting ? 'Sending...' : 'Send'}</button>
                <button type="button" className="btn-logout" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <h2 className="section-title">SMS Logs</h2>
      {logs.length === 0 && <p className="muted">কোনো লগ নেই।</p>}
      {logs.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Phone</th><th>Purpose</th><th>Status</th><th>Response</th><th>Time</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{l.phone}</td>
                  <td>{l.purpose}</td>
                  <td>{l.status}</td>
                  <td>{l.response ?? '—'}</td>
                  <td>{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
