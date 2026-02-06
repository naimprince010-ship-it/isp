import { useEffect, useState } from 'react';
import { reseller } from '../api/client';
import { DEMO_RECHARGES } from '../data/demoData';
import './Dashboard.css';

type Recharge = { id: string; amount: number; previousBalance: number; newBalance: number; createdAt: string; notes?: string };

export default function Recharges() {
  const [list, setList] = useState<Recharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    reseller.recharges().then((v) => { setList((v || []) as Recharge[]); setIsDemo(false); }).catch(() => { setList(DEMO_RECHARGES as Recharge[]); setIsDemo(true); }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading...</div>;
  return (
    <div className="dashboard">
      <h1>Recharges (Reseller)</h1>
      {isDemo && <div className="demo-banner">Backend সংযুক্ত নেই।</div>}
      {list.length === 0 && !isDemo && <p className="muted">কোনো রিচার্জ হিস্ট্রি নেই।</p>}
      {list.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Amount (BDT)</th><th>Previous</th><th>New Balance</th><th>Date</th><th>Notes</th></tr></thead>
            <tbody>
              {list.map((r) => <tr key={r.id}><td>{Number(r.amount).toLocaleString()}</td><td>{Number(r.previousBalance).toLocaleString()}</td><td>{Number(r.newBalance).toLocaleString()}</td><td>{new Date(r.createdAt).toLocaleString()}</td><td>{r.notes ?? '-'}</td></tr>)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
