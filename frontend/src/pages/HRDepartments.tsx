import { useEffect, useState } from 'react';
import { hr } from '../api/client';
import './Dashboard.css';

export default function HRDepartments() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    hr.departments().then((v) => { setList((v || []) as any[]); setIsDemo(false); }).catch(() => { setList([]); setIsDemo(true); }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Name required'); return; }
    setSubmitting(true);
    if (editId) {
      hr.updateDepartment(editId, { name: form.name.trim(), description: form.description || undefined })
        .then(() => { setShowForm(false); setEditId(null); setForm({ name: '', description: '' }); load(); })
        .catch((err) => setError(err?.message || 'Failed'))
        .finally(() => setSubmitting(false));
    } else {
      hr.createDepartment({ name: form.name.trim(), description: form.description || undefined })
        .then(() => { setShowForm(false); setForm({ name: '', description: '' }); load(); })
        .catch((err) => setError(err?.message || 'Failed'))
        .finally(() => setSubmitting(false));
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  return (
    <div className="dashboard">
      <h1>Departments</h1>
      {isDemo && <div className="demo-banner">Backend not connected.</div>}
      <p className="muted">Configure departments for HR.</p>
      <button type="button" className="btn-logout" style={{ marginBottom: '1rem' }} onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', description: '' }); setError(''); }}>Add Department</button>
      {error && <div className="error-msg" style={{ marginBottom: '0.5rem' }}>{error}</div>}
      {showForm && (
        <div className="section" style={{ maxWidth: 400, marginBottom: '1rem' }}>
          <h2 className="section-title">{editId ? 'Edit' : 'Add'} Department</h2>
          <form onSubmit={handleSubmit}>
            <input className="form-input" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className="form-input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ marginTop: '0.5rem' }} />
            <div style={{ marginTop: '0.5rem' }}><button type="submit" className="btn-logout" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button> <button type="button" className="btn-logout" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button></div>
          </form>
        </div>
      )}
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Description</th><th>Actions</th></tr></thead>
          <tbody>
            {list.map((d: any) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td>{d.description ?? '-'}</td>
                <td>{!isDemo && <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }} onClick={() => { setEditId(d.id); setForm({ name: d.name, description: d.description || '' }); setShowForm(true); }}>Edit</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
