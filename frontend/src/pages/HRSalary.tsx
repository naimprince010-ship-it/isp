import { useEffect, useState } from 'react';
import { hr } from '../api/client';
import './Dashboard.css';

export default function HRSalary() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [genSubmitting, setGenSubmitting] = useState(false);
  const [editSal, setEditSal] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ bonus: '', overtime: '', incentive: '', deductions: '' });

  const load = () => {
    setLoading(true);
    hr.salaries(month, year).then((v) => { setList((v || []) as any[]); setIsDemo(false); }).catch(() => setIsDemo(true)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [month, year]);

  const handleGenerate = () => {
    setGenSubmitting(true);
    hr.generateSalaries(month, year).then(() => load()).catch(() => {}).finally(() => setGenSubmitting(false));
  };

  if (loading) return <div className="loading">Loading...</div>;
  return (
    <div className="dashboard">
      <h1>Salary and Payroll</h1>
      {isDemo && <div className="demo-banner">Backend not connected.</div>}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <label>Month: <input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10))} className="form-input" style={{ width: 50 }} /></label>
        <label>Year: <input type="number" min="2020" max="2030" value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} className="form-input" style={{ width: 70 }} /></label>
        {!isDemo && <button type="button" className="btn-logout" onClick={handleGenerate} disabled={genSubmitting}>{genSubmitting ? 'Generating...' : 'Generate Salaries'}</button>}
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Employee</th><th>Base</th><th>Bonus</th><th>Overtime</th><th>Incentive</th><th>Net</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {list.map((s: any) => (
              <tr key={s.id}>
                <td>{s.employee?.user?.name}</td>
                <td>{s.baseAmount}</td>
                <td>{s.bonus}</td>
                <td>{s.overtime}</td>
                <td>{s.incentive}</td>
                <td>{s.netAmount}</td>
                <td>{s.status}</td>
                <td>{!isDemo && s.status === 'PENDING' && <><button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', marginRight: '0.25rem' }} onClick={() => { setEditSal(s); setEditForm({ bonus: String(s.bonus || 0), overtime: String(s.overtime || 0), incentive: String(s.incentive || 0), deductions: String(s.deductions || 0) }); }}>Edit</button><button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }} onClick={() => hr.paySalary(s.id).then(() => load())}>Pay</button></>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editSal && (
        <div className="modal-overlay" onClick={() => setEditSal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Bonus, Overtime, Incentive</h2>
            <form onSubmit={handleEditSave}>
              <label>Bonus: <input type="number" step="0.01" value={editForm.bonus} onChange={(e) => setEditForm({ ...editForm, bonus: e.target.value })} className="form-input" style={{ width: 80 }} /></label>
              <label style={{ marginLeft: '0.5rem' }}>Overtime: <input type="number" step="0.01" value={editForm.overtime} onChange={(e) => setEditForm({ ...editForm, overtime: e.target.value })} className="form-input" style={{ width: 80 }} /></label>
              <label style={{ marginLeft: '0.5rem' }}>Incentive: <input type="number" step="0.01" value={editForm.incentive} onChange={(e) => setEditForm({ ...editForm, incentive: e.target.value })} className="form-input" style={{ width: 80 }} /></label>
              <label style={{ marginLeft: '0.5rem' }}>Deductions: <input type="number" step="0.01" value={editForm.deductions} onChange={(e) => setEditForm({ ...editForm, deductions: e.target.value })} className="form-input" style={{ width: 80 }} /></label>
              <div style={{ marginTop: '0.5rem' }}><button type="submit" className="btn-logout">Save</button> <button type="button" className="btn-logout" onClick={() => setEditSal(null)}>Cancel</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
