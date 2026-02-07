import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { hr } from '../api/client';
import './Dashboard.css';

export default function HREmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    hr.employeeProfile(id).then((v) => { setData(v); setIsDemo(false); }).catch(() => { setData(null); setIsDemo(true); }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">Loading...</div>;
  if (!data && !isDemo) return <div className="dashboard"><p className="muted">Employee not found.</p><Link to="/hr/employees">Back</Link></div>;

  const emp = data;
  const salaries = emp?.salaries || [];
  const appraisals = emp?.appraisals || [];

  return (
    <div className="dashboard">
      <div style={{ marginBottom: '1rem' }}><Link to="/hr/employees" className="nav-link">Back to Employees</Link></div>
      <h1>Employee Profile</h1>
      {isDemo && <div className="demo-banner">Backend not connected.</div>}
      {emp && (
        <>
          <div className="section" style={{ maxWidth: 560 }}>
            <h2 className="section-title">Profile</h2>
            <p><strong>Name:</strong> {emp.user?.name ?? '-'}</p>
            <p><strong>Phone:</strong> {emp.user?.phone ?? '-'}</p>
            <p><strong>Department:</strong> {emp.department?.name ?? '-'}</p>
            <p><strong>Designation:</strong> {emp.designation?.name ?? '-'}</p>
            <p><strong>Employee Code:</strong> {emp.employeeCode ?? '-'}</p>
            <p><strong>Join Date:</strong> {emp.joinDate ? new Date(emp.joinDate).toLocaleDateString() : '-'}</p>
            <p><strong>Basic Salary:</strong> {emp.basicSalary ?? '-'}</p>
            <p><strong>Bank Account:</strong> {emp.bankAccount ?? '-'}</p>
            <p><strong>NID:</strong> {emp.nid ?? '-'}</p>
            <p><strong>Address:</strong> {emp.address ?? '-'}</p>
          </div>
          <div className="section">
            <h2 className="section-title">Salary History ({salaries.length})</h2>
            {salaries.length === 0 && <p className="muted">No salary records.</p>}
            {salaries.length > 0 && (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Month/Year</th><th>Base</th><th>Bonus</th><th>Overtime</th><th>Incentive</th><th>Deductions</th><th>Net</th><th>Status</th></tr></thead>
                  <tbody>
                    {salaries.map((s: any) => (
                      <tr key={s.id}><td>{s.month}/{s.year}</td><td>{s.baseAmount}</td><td>{s.bonus}</td><td>{s.overtime}</td><td>{s.incentive}</td><td>{s.deductions}</td><td>{s.netAmount}</td><td>{s.status}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="section">
            <h2 className="section-title">Performance Appraisals ({appraisals.length})</h2>
            {appraisals.length === 0 && <p className="muted">No appraisals.</p>}
            {appraisals.length > 0 && (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Period</th><th>Rating</th><th>Comments</th></tr></thead>
                  <tbody>
                    {appraisals.map((a: any) => (
                      <tr key={a.id}><td>{a.periodFrom ? new Date(a.periodFrom).toLocaleDateString() : '-'} - {a.periodTo ? new Date(a.periodTo).toLocaleDateString() : '-'}</td><td>{a.rating}</td><td>{a.comments ?? '-'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
