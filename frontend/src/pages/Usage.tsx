import { useEffect, useState } from 'react';
import { customer } from '../api/client';
import { DEMO_USAGE } from '../data/demoData';
import './Dashboard.css';

export default function Usage() {
  const [list, setList] = useState<{ date: string; totalBytes: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [days, setDays] = useState(30);

  useEffect(() => {
    customer.usage(days).then((v) => { setList(v || []); setIsDemo(false); }).catch(() => { setList(DEMO_USAGE); setIsDemo(true); }).finally(() => setLoading(false));
  }, [days]);

  const formatBytes = (b: number) => (b < 1024 ? b + ' B' : b < 1024 * 1024 ? (b / 1024).toFixed(1) + ' KB' : (b / (1024 * 1024)).toFixed(2) + ' MB');

  if (loading) return <div className="loading">Loading...</div>;
  return (
    <div className="dashboard">
      <h1>Usage</h1>
      {isDemo && <div className="demo-banner">Backend সংযুক্ত নেই।</div>}
      <div style={{ marginBottom: '1rem' }}><label>Days: </label><select value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={7}>7</option><option value={30}>30</option><option value={90}>90</option></select></div>
      {list.length === 0 && !isDemo && <p className="muted">কোনো ইউজেজ ডেটা নেই।</p>}
      {list.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Date</th><th>Total Usage</th></tr></thead>
            <tbody>
              {list.map((u, i) => <tr key={i}><td>{new Date(u.date).toLocaleDateString()}</td><td>{formatBytes(u.totalBytes)}</td></tr>)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
