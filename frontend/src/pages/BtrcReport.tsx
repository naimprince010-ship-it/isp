import { useEffect, useState } from 'react';
import { admin, API_BASE } from '../api/client';
import { DEMO_BTRC_PAYMENT_LOG, DEMO_BTRC_USER_LIST } from '../data/demoData';
import './Dashboard.css';

const now = new Date();
const currentMonth = now.getMonth() + 1;
const currentYear = now.getFullYear();

export default function BtrcReport() {
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<{ userList: any[]; paymentLog: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    admin.btrcReport(month, year).then((v) => { setData(v); setIsDemo(false); }).catch(() => { setData({ userList: DEMO_BTRC_USER_LIST, paymentLog: DEMO_BTRC_PAYMENT_LOG }); setIsDemo(true); }).finally(() => setLoading(false));
  }, [month, year]);

  const handleExportCsv = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setExporting(true);
    fetch(`${API_BASE}/admin/reports/btrc/export?month=${month}&year=${year}&format=csv`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error('Export failed');
        return r.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `btrc-report-${year}-${month}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => {})
      .finally(() => setExporting(false));
  };

  return (
    <div className="dashboard">
      <h1>BTRC Report</h1>
      {isDemo && <div className="demo-banner">Backend সংযুক্ত নেই।</div>}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <label>Month: <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>{[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
        <label>Year: <select value={year} onChange={(e) => setYear(Number(e.target.value))}>{[currentYear, currentYear-1].map((y) => <option key={y} value={y}>{y}</option>)}</select></label>
        {!isDemo && (
          <button type="button" className="btn-logout" onClick={handleExportCsv} disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        )}
      </div>
      {loading && <div className="loading">Loading...</div>}
      {!loading && data && (
        <>
          <h2 className="section-title">User List</h2>
          {data.userList.length === 0 && <p className="muted">কোনো ইউজার নেই।</p>}
          {data.userList.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Name</th><th>Phone</th><th>Package</th><th>Reseller</th><th>Status</th></tr></thead>
                <tbody>
                  {data.userList.map((u: any, i) => <tr key={i}><td>{u.name}</td><td>{u.phone}</td><td>{u.package}</td><td>{u.reseller}</td><td>{u.status}</td></tr>)}
                </tbody>
              </table>
            </div>
          )}
          <h2 className="section-title" style={{ marginTop: '1.5rem' }}>Payment Log</h2>
          {data.paymentLog.length === 0 && <p className="muted">কোনো পেমেন্ট লগ নেই।</p>}
          {data.paymentLog.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Customer</th><th>Amount</th><th>Method</th><th>Trx ID</th><th>Date</th></tr></thead>
                <tbody>
                  {data.paymentLog.map((p: any, i) => <tr key={i}><td>{p.customerName} ({p.customerPhone})</td><td>{p.amount}</td><td>{p.method}</td><td>{p.trxId ?? '—'}</td><td>{new Date(p.createdAt).toLocaleString()}</td></tr>)}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
