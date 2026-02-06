import { useEffect, useState } from 'react';
import { packages as pkgApi } from '../api/client';
import { DEMO_PACKAGES } from '../data/demoData';
import './Dashboard.css';

type Pkg = { id: string; name: string; speedMbps: number; price: number; validityDays: number };

export default function Packages() {
  const [list, setList] = useState<Pkg[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editPkg, setEditPkg] = useState<Pkg | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [addForm, setAddForm] = useState({ name: '', speedMbps: '', price: '', validityDays: '30' });
  const [editForm, setEditForm] = useState({ name: '', speedMbps: '', price: '', validityDays: '' });

  const load = () => {
    pkgApi.list().then((v) => { setList(v || []); setIsDemo(false); }).catch(() => { setList(DEMO_PACKAGES as Pkg[]); setIsDemo(true); }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!addForm.name.trim() || !addForm.speedMbps || !addForm.price) { setError('Name, Speed, Price required'); return; }
    setSubmitting(true);
    pkgApi.create({
      name: addForm.name.trim(),
      speedMbps: parseInt(addForm.speedMbps, 10),
      price: parseFloat(addForm.price),
      validityDays: addForm.validityDays ? parseInt(addForm.validityDays, 10) : 30,
    }).then(() => { setShowAdd(false); setAddForm({ name: '', speedMbps: '', price: '', validityDays: '30' }); load(); }).catch((err) => setError(err?.message || 'Failed')).finally(() => setSubmitting(false));
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPkg) return;
    setError('');
    setSubmitting(true);
    pkgApi.update(editPkg.id, {
      name: editForm.name.trim(),
      speedMbps: parseInt(editForm.speedMbps, 10),
      price: parseFloat(editForm.price),
      validityDays: parseInt(editForm.validityDays, 10),
    }).then(() => { setEditPkg(null); load(); }).catch((err) => setError(err?.message || 'Failed')).finally(() => setSubmitting(false));
  };

  if (loading) return <div className="loading">Loading...</div>;
  return (
    <div className="dashboard">
      <h1>Packages</h1>
      {isDemo && <div className="demo-banner">Backend সংযুক্ত নেই।</div>}
      <div style={{ marginBottom: '1rem' }}>
        <button type="button" className="btn-logout" onClick={() => { setShowAdd(true); setError(''); }}>Add Package</button>
      </div>
      {list.length === 0 && !isDemo && <p className="muted">কোনো প্যাকেজ নেই। Add Package ক্লিক করুন।</p>}
      {list.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Speed (Mbps)</th><th>Price (BDT)</th><th>Validity (Days)</th><th>Actions</th></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.speedMbps}</td>
                  <td>{Number(p.price).toLocaleString()}</td>
                  <td>{p.validityDays}</td>
                  <td>
                    <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => { setEditPkg(p); setEditForm({ name: p.name, speedMbps: String(p.speedMbps), price: String(p.price), validityDays: String(p.validityDays) }); setError(''); }}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Add Package</h2>
            <form onSubmit={handleAdd}>
              <input className="form-input" placeholder="Name *" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} required />
              <input type="number" min={1} className="form-input" placeholder="Speed (Mbps) *" value={addForm.speedMbps} onChange={(e) => setAddForm({ ...addForm, speedMbps: e.target.value })} required />
              <input type="number" step="0.01" min={0} className="form-input" placeholder="Price (BDT) *" value={addForm.price} onChange={(e) => setAddForm({ ...addForm, price: e.target.value })} required />
              <input type="number" min={1} className="form-input" placeholder="Validity (Days)" value={addForm.validityDays} onChange={(e) => setAddForm({ ...addForm, validityDays: e.target.value })} />
              {error && <div className="error-msg" style={{ marginTop: '0.5rem' }}>{error}</div>}
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-logout" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
                <button type="button" className="btn-logout" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editPkg && (
        <div className="modal-overlay" onClick={() => setEditPkg(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Package</h2>
            <form onSubmit={handleEdit}>
              <input className="form-input" placeholder="Name *" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
              <input type="number" min={1} className="form-input" placeholder="Speed (Mbps) *" value={editForm.speedMbps} onChange={(e) => setEditForm({ ...editForm, speedMbps: e.target.value })} required />
              <input type="number" step="0.01" min={0} className="form-input" placeholder="Price (BDT) *" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} required />
              <input type="number" min={1} className="form-input" placeholder="Validity (Days)" value={editForm.validityDays} onChange={(e) => setEditForm({ ...editForm, validityDays: e.target.value })} required />
              {error && <div className="error-msg" style={{ marginTop: '0.5rem' }}>{error}</div>}
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-logout" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
                <button type="button" className="btn-logout" onClick={() => setEditPkg(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
