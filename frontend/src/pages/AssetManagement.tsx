import { useEffect, useState } from 'react';
import { assets } from '../api/client';
import './Dashboard.css';

type Asset = { id: string; name: string; category: string; purchaseDate?: string; value?: number; location?: string; status: string; destroyedDate?: string; destroyReason?: string; notes?: string };

export default function AssetManagement() {
  const [tab, setTab] = useState<'list' | 'destroyed'>('list');
  const [assetList, setAssetList] = useState<Asset[]>([]);
  const [destroyedList, setDestroyedList] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'EQUIPMENT', purchaseDate: '', value: '', location: '', notes: '' });
  const [destroyModal, setDestroyModal] = useState<Asset | null>(null);
  const [destroyReason, setDestroyReason] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      assets.list().then((v) => setAssetList((v || []) as Asset[])).catch(() => setAssetList([])),
      assets.destroyed().then((v) => setDestroyedList((v || []) as Asset[])).catch(() => setDestroyedList([])),
    ])
      .then(() => setIsDemo(false))
      .catch(() => setIsDemo(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Name required'); return; }
    setSubmitting(true);
    assets.create({
      name: form.name.trim(),
      category: form.category,
      purchaseDate: form.purchaseDate || undefined,
      value: form.value ? parseFloat(form.value) : undefined,
      location: form.location.trim() || undefined,
      notes: form.notes.trim() || undefined,
    })
      .then(() => { setShowForm(false); setForm({ name: '', category: 'EQUIPMENT', purchaseDate: '', value: '', location: '', notes: '' }); load(); })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  const handleDestroy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destroyModal) return;
    setSubmitting(true);
    assets.destroy(destroyModal.id, destroyReason.trim() || undefined)
      .then(() => { setDestroyModal(null); setDestroyReason(''); load(); })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  const activeAssets = assetList.filter((a) => a.status === 'ACTIVE');
  const destroyedAssets = tab === 'destroyed' ? destroyedList : assetList.filter((a) => a.status === 'DESTROYED');

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      <h1>Asset Management</h1>
      {isDemo && <div className="demo-banner">Backend not connected.</div>}
      <p className="muted">Maintain asset list. Save the list of destroyed items.</p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button type="button" className={tab === 'list' ? 'btn-logout' : ''} style={{ padding: '0.5rem 1rem', background: tab === 'list' ? undefined : '#334155', border: '1px solid #475569' }} onClick={() => setTab('list')}>Asset List</button>
        <button type="button" className={tab === 'destroyed' ? 'btn-logout' : ''} style={{ padding: '0.5rem 1rem', background: tab === 'destroyed' ? undefined : '#334155', border: '1px solid #475569' }} onClick={() => setTab('destroyed')}>Destroyed Items</button>
      </div>

      {error && <div className="error-msg" style={{ marginBottom: '0.5rem' }}>{error}</div>}

      {tab === 'list' && (
        <>
          {!isDemo && (
            <div style={{ marginBottom: '1rem' }}>
              <button type="button" className="btn-logout" onClick={() => { setShowForm(true); setError(''); }}>+ Add Asset</button>
            </div>
          )}
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Category</th><th>Purchase Date</th><th>Value</th><th>Location</th><th>Status</th>{!isDemo && <th>Actions</th>}</tr></thead>
              <tbody>
                {activeAssets.map((a) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td>{a.category}</td>
                    <td>{a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString() : '-'}</td>
                    <td>{a.value != null ? `৳ ${Number(a.value).toFixed(2)}` : '-'}</td>
                    <td>{a.location ?? '-'}</td>
                    <td><span style={{ color: a.status === 'ACTIVE' ? '#22c55e' : '#f87171' }}>{a.status}</span></td>
                    {!isDemo && (
                      <td>
                        <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }} onClick={() => setDestroyModal(a)}>Mark Destroyed</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {activeAssets.length === 0 && <p className="muted">No active assets. Add an asset to get started.</p>}
        </>
      )}

      {tab === 'destroyed' && (
        <>
          <div className="section">
            <h2>Destroyed Items List</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Name</th><th>Category</th><th>Value</th><th>Destroyed Date</th><th>Reason</th></tr></thead>
                <tbody>
                  {destroyedAssets.map((a) => (
                    <tr key={a.id}>
                      <td>{a.name}</td>
                      <td>{a.category}</td>
                      <td>{a.value != null ? `৳ ${Number(a.value).toFixed(2)}` : '-'}</td>
                      <td>{a.destroyedDate ? new Date(a.destroyedDate).toLocaleDateString() : '-'}</td>
                      <td>{a.destroyReason ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {destroyedAssets.length === 0 && <p className="muted">No destroyed items recorded.</p>}
          </div>
        </>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h2>Add Asset</h2>
            <form onSubmit={handleSave}>
              <input className="form-input" placeholder="Asset name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <select className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="EQUIPMENT">Equipment</option>
                <option value="FURNITURE">Furniture</option>
                <option value="VEHICLE">Vehicle</option>
                <option value="ELECTRONICS">Electronics</option>
                <option value="OTHER">Other</option>
              </select>
              <input type="date" className="form-input" placeholder="Purchase date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
              <input type="number" step="0.01" min="0" className="form-input" placeholder="Value (৳)" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              <input className="form-input" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <input className="form-input" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-logout" disabled={submitting}>Save</button>
                <button type="button" className="btn-logout" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {destroyModal && (
        <div className="modal-overlay" onClick={() => setDestroyModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Mark as Destroyed</h2>
            <p className="muted">Asset: {destroyModal.name}</p>
            <form onSubmit={handleDestroy}>
              <input className="form-input" placeholder="Reason (optional)" value={destroyReason} onChange={(e) => setDestroyReason(e.target.value)} />
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-logout" disabled={submitting}>Confirm Destroyed</button>
                <button type="button" className="btn-logout" onClick={() => { setDestroyModal(null); setDestroyReason(''); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
