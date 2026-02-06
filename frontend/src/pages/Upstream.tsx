import { useEffect, useState } from 'react';
import { admin } from '../api/client';
import './Dashboard.css';

export default function Upstream() {
  const [data, setData] = useState<{ provider: string; capacityMbps: number; notes: string; soldMbps: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ provider: 'BTCL', capacityMbps: '', notes: '' });

  const load = () => {
    admin
      .upstream()
      .then((v) => { setData(v); setIsDemo(false); })
      .catch(() => { setData({ provider: 'Summit Communications', capacityMbps: 0, notes: '', soldMbps: 0 }); setIsDemo(true); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const capacity = form.capacityMbps ? parseInt(form.capacityMbps, 10) : 0;
    if (capacity < 0) { setError('Capacity must be ≥ 0'); return; }
    setSubmitting(true);
    admin
      .updateUpstream({
        provider: form.provider.trim() || 'Summit Communications',
        capacityMbps: capacity,
        notes: form.notes.trim(),
      })
      .then(() => { setShowForm(false); load(); })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      <h1>Upstream (Summit / আপস্ট্রিম)</h1>
      <p className="muted" style={{ marginBottom: '1rem' }}>
        Summit Communications বা অন্য প্রোভাইডার থেকে যে লাইন নিচ্ছেন তার ক্যাপাসিটি এখানে রেকর্ড রাখুন। অ্যাপ প্রোভাইডারের নেটওয়ার্কে সরাসরি কানেক্ট হয় না – শুধু রেকর্ড ও সোল্ড Mbps দেখায়। বিস্তারিত: <code>UPSTREAM.md</code>
      </p>
      {isDemo && <div className="demo-banner">Backend সংযুক্ত নেই।</div>}

      {data && (
        <div className="cards" style={{ marginBottom: '1.5rem' }}>
          <div className="card"><h3>Provider</h3><p className="value">{data.provider || '—'}</p></div>
          <div className="card"><h3>Capacity (Mbps)</h3><p className="value">{data.capacityMbps}</p></div>
          <div className="card"><h3>Sold (Mbps)</h3><p className="value green">{data.soldMbps}</p></div>
          <div className="card"><h3>Remaining</h3><p className="value">{Math.max(0, data.capacityMbps - data.soldMbps)}</p></div>
        </div>
      )}
      {data?.notes && <p className="muted">Notes: {data.notes}</p>}

      {!isDemo && (
        <div style={{ marginTop: '1rem' }}>
          <button type="button" className="btn-logout" onClick={() => { setShowForm(true); setForm({ provider: data?.provider || 'Summit Communications', capacityMbps: data?.capacityMbps ? String(data.capacityMbps) : '', notes: data?.notes || '' }); setError(''); }}>Edit Upstream</button>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Upstream / BTCL</h2>
            <form onSubmit={handleSave}>
              <input className="form-input" placeholder="Provider (e.g. BTCL)" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
              <input type="number" min={0} className="form-input" placeholder="Capacity (Mbps)" value={form.capacityMbps} onChange={(e) => setForm({ ...form, capacityMbps: e.target.value })} />
              <input className="form-input" placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              {error && <div className="error-msg" style={{ marginTop: '0.5rem' }}>{error}</div>}
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-logout" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
                <button type="button" className="btn-logout" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
