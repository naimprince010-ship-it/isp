import { useEffect, useState } from 'react';
import { hr } from '../api/client';
import './Dashboard.css';

export default function HRDesignations() {
  const [list, setList] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', departmentId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    Promise.all([hr.designations(), hr.departments()]).then(([a, b]) => { setList((a || []) as any[]); setDepartments((b || []) as any[]); setIsDemo(false); }).catch(() => { setIsDemo(true); }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    (editId ? hr.updateDesignation(editId, { name: form.name.trim(), departmentId: form.departmentId || undefined }) : hr.createDesignation({ name: form.name.trim(), departmentId: form.departmentId || undefined }))
      .then(() => { setShowForm(false); setEditId(null); setForm({ name: '', departmentId: '' }); load(); })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  if (loading) return <div className="loading">Loading...</div>;
  return (
    <div className="dashboard">
      <h1>Designations</h1>
      {isDemo && <div className="demo-banner">Backend not connected.</div>}
      <button type="button" className="btn-logout" style={{ marginBottom: '1rem' }} onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', departmentId: '' }); }}>Add Designation</button>
      {error && <div className="error-msg" style={{ marginBottom: '0.5rem' }}>{error}</div>}
      {showForm && (
        <div className="section" style={{ maxWidth: 400, marginBottom: '1rem' }}>
          <form onSubmit={handleSubmit}>
            <input className="form-input" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <select className="form-input" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} style={{ marginTop: '0.5rem' }}><option value="">Department</option>{departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
            <div style={{ marginTop: '0.5rem' }}><button type="submit" className="btn-logout" disabled={submitting}>Save</button> <button type="button" className="btn-logout" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button></div>
          </form>
        </div>
      )}
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Department</th><th>Actions</th></tr></thead>
          <tbody>{list.map((d: any) => <tr key={d.id}><td>{d.name}</td><td>{d.department?.name ?? '-'}</td><td>{!isDemo && <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }} onClick={() => { setEditId(d.id); setForm({ name: d.name, departmentId: d.departmentId || '' }); setShowForm(true); }}>Edit</button>}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
