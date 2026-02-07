import { useEffect, useState } from 'react';
import { hr } from '../api/client';
import './Dashboard.css';

export default function HRPerformance() {
  const [list, setList] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeId: '', periodFrom: '', periodTo: '', rating: '0', comments: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    hr.appraisals().then((v) => { setList((v || []) as any[]); setIsDemo(false); }).catch(() => setIsDemo(true)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { hr.employees().then((v) => setEmployees((v || []) as any[])).catch(() => {}); }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId || !form.periodFrom || !form.periodTo) return;
    setSubmitting(true);
    hr.createAppraisal({ employeeId: form.employeeId, periodFrom: form.periodFrom, periodTo: form.periodTo, rating: parseFloat(form.rating) || 0, comments: form.comments || undefined }).then(() => { setShowForm(false); setForm({ employeeId: '', periodFrom: '', periodTo: '', rating: '0', comments: '' }); load(); }).catch(() => {}).finally(() => setSubmitting(false));
  };

  if (loading) return <div className="loading">Loading...</div>;
  return (
    <div className="dashboard">
      <h1>Performance Appraisal</h1>
      {isDemo && <div className="demo-banner">Backend not connected.</div>}
      <button type="button" className="btn-logout" style={{ marginBottom: '1rem' }} onClick={() => setShowForm(true)}>Add Appraisal</button>
      {showForm && (
        <div className="section" style={{ maxWidth: 400, marginBottom: '1rem' }}>
          <form onSubmit={handleAdd}>
            <select className="form-input" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} required><option value="">Select Employee</option>{employees.map((e: any) => <option key={e.id} value={e.id}>{e.user?.name}</option>)}</select>
            <input type="date" className="form-input" placeholder="Period From" value={form.periodFrom} onChange={(e) => setForm({ ...form, periodFrom: e.target.value })} style={{ marginTop: '0.5rem' }} required />
            <input type="date" className="form-input" placeholder="Period To" value={form.periodTo} onChange={(e) => setForm({ ...form, periodTo: e.target.value })} style={{ marginTop: '0.5rem' }} required />
            <input type="number" min="0" max="100" className="form-input" placeholder="Rating" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} style={{ marginTop: '0.5rem' }} />
            <textarea className="form-input" placeholder="Comments" value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} style={{ marginTop: '0.5rem' }} />
            <div style={{ marginTop: '0.5rem' }}><button type="submit" className="btn-logout" disabled={submitting}>Save</button> <button type="button" className="btn-logout" onClick={() => setShowForm(false)}>Cancel</button></div>
          </form>
        </div>
      )}
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Employee</th><th>Period</th><th>Rating</th></tr></thead>
          <tbody>{list.map((a: any) => <tr key={a.id}><td>{a.employee?.user?.name}</td><td>{a.periodFrom && a.periodTo ? new Date(a.periodFrom).toLocaleDateString() + ' - ' + new Date(a.periodTo).toLocaleDateString() : '-'}</td><td>{a.rating}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
