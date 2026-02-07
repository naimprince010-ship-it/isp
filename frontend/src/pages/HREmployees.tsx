import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { hr } from '../api/client';
import './Dashboard.css';

export default function HREmployees() {
  const [list, setList] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', password: '', departmentId: '', designationId: '', employeeCode: '', joinDate: new Date().toISOString().slice(0, 10), basicSalary: '', bankAccount: '', nid: '', address: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    Promise.all([hr.employees(), hr.departments(), hr.designations()])
      .then(([emp, dep, des]) => { setList((emp || []) as any[]); setDepartments((dep || []) as any[]); setDesignations((des || []) as any[]); setIsDemo(false); })
      .catch(() => { setList([]); setIsDemo(true); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.phone.trim() || !form.password || form.password.length < 6) { setError('Name, Phone, Password (min 6) required'); return; }
    setSubmitting(true);
    hr.createEmployee({ ...form, basicSalary: form.basicSalary ? parseFloat(form.basicSalary) : 0, departmentId: form.departmentId || undefined, designationId: form.designationId || undefined, employeeCode: form.employeeCode || undefined, bankAccount: form.bankAccount || undefined, nid: form.nid || undefined, address: form.address || undefined })
      .then(() => { setShowForm(false); setForm({ name: '', phone: '', password: '', departmentId: '', designationId: '', employeeCode: '', joinDate: new Date().toISOString().slice(0, 10), basicSalary: '', bankAccount: '', nid: '', address: '' }); load(); })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  if (loading) return <div className="loading">Loading...</div>;
  return (
    <div className="dashboard">
      <h1>Employees</h1>
      {isDemo && <div className="demo-banner">Backend not connected.</div>}
      <p className="muted">Add employee with detail information. View profile with salary history.</p>
      <button type="button" className="btn-logout" style={{ marginBottom: '1rem' }} onClick={() => { setShowForm(true); setError(''); }}>Add Employee</button>
      {error && <div className="error-msg" style={{ marginBottom: '0.5rem' }}>{error}</div>}
      {showForm && (
        <div className="section" style={{ maxWidth: 480, marginBottom: '1rem' }}>
          <h2 className="section-title">Add Employee</h2>
          <form onSubmit={handleSubmit}>
            <input className="form-input" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className="form-input" placeholder="Phone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={{ marginTop: '0.5rem' }} required />
            <input type="password" className="form-input" placeholder="Password * (min 6)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={{ marginTop: '0.5rem' }} required minLength={6} />
            <select className="form-input" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} style={{ marginTop: '0.5rem' }}><option value="">Department</option>{departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
            <select className="form-input" value={form.designationId} onChange={(e) => setForm({ ...form, designationId: e.target.value })} style={{ marginTop: '0.5rem' }}><option value="">Designation</option>{designations.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
            <input className="form-input" placeholder="Employee Code" value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} style={{ marginTop: '0.5rem' }} />
            <input type="date" className="form-input" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} style={{ marginTop: '0.5rem' }} />
            <input type="number" className="form-input" placeholder="Basic Salary" value={form.basicSalary} onChange={(e) => setForm({ ...form, basicSalary: e.target.value })} style={{ marginTop: '0.5rem' }} />
            <input className="form-input" placeholder="Bank Account" value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} style={{ marginTop: '0.5rem' }} />
            <input className="form-input" placeholder="NID" value={form.nid} onChange={(e) => setForm({ ...form, nid: e.target.value })} style={{ marginTop: '0.5rem' }} />
            <input className="form-input" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} style={{ marginTop: '0.5rem' }} />
            <div style={{ marginTop: '0.5rem' }}><button type="submit" className="btn-logout" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button> <button type="button" className="btn-logout" onClick={() => setShowForm(false)}>Cancel</button></div>
          </form>
        </div>
      )}
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Phone</th><th>Department</th><th>Designation</th><th>Join Date</th><th>Salary</th><th>Actions</th></tr></thead>
          <tbody>
            {list.map((e: any) => (
              <tr key={e.id}>
                <td>{e.user?.name ?? '-'}</td>
                <td>{e.user?.phone ?? '-'}</td>
                <td>{e.department?.name ?? '-'}</td>
                <td>{e.designation?.name ?? '-'}</td>
                <td>{e.joinDate ? new Date(e.joinDate).toLocaleDateString() : '-'}</td>
                <td>{e.basicSalary ?? '-'}</td>
                <td>{!isDemo && <Link to={`/hr/employees/${e.id}`} className="nav-link" style={{ fontSize: '0.85rem' }}>View Profile</Link>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
