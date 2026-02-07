import { useEffect, useState } from 'react';
import { hr } from '../api/client';
import './Dashboard.css';

export default function HRAttendance() {
  const [list, setList] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeId: '', date: new Date().toISOString().slice(0, 10), status: 'PRESENT' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    hr.attendance().then((v) => { setList((v || []) as any[]); setIsDemo(false); }).catch(() => setIsDemo(true)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { hr.employees().then((v) => setEmployees((v || []) as any[])).catch(() => {}); }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId) return;
    setSubmitting(true);
    hr.addAttendance({ employeeId: form.employeeId, date: form.date, status: form.status }).then(() => { setShowForm(false); setForm({ employeeId: '', date: new Date().toISOString().slice(0, 10), status: 'PRESENT' }); load(); }).catch(() => {}).finally(() => setSubmitting(false));
  };

  if (loading) return <div className="loading">Loading...</div>;
  return (
    <div className="dashboard">
      <h1>Attendance</h1>
      {isDemo && <div className="demo-banner">Backend not connected.</div>}
      <button type="button" className="btn-logout" style={{ marginBottom: '1rem' }} onClick={() => setShowForm(true)}>Add Attendance</button>
      {showForm && (
        <div className="section" style={{ maxWidth: 400, marginBottom: '1rem' }}>
          <form onSubmit={handleAdd}>
            <select className="form-input" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} required><option value="">Select Employee</option>{employees.map((e: any) => <option key={e.id} value={e.id}>{e.user?.name}</option>)}</select>
            <input type="date" className="form-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ marginTop: '0.5rem' }} />
            <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={{ marginTop: '0.5rem' }}><option value="PRESENT">PRESENT</option><option value="ABSENT">ABSENT</option><option value="LEAVE">LEAVE</option></select>
            <div style={{ marginTop: '0.5rem' }}><button type="submit" className="btn-logout" disabled={submitting}>Save</button> <button type="button" className="btn-logout" onClick={() => setShowForm(false)}>Cancel</button></div>
          </form>
        </div>
      )}
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Employee</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>{list.map((a: any) => <tr key={a.id}><td>{a.employee?.user?.name}</td><td>{a.date ? new Date(a.date).toLocaleDateString() : '-'}</td><td>{a.status}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
