import { useEffect, useState } from 'react';
import { reseller } from '../api/client';
import { DEMO_RESELLER_DASHBOARD } from '../data/demoData';
import './Dashboard.css';

export default function ResellerDashboard() {
  const [data, setData] = useState<typeof DEMO_RESELLER_DASHBOARD | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    reseller.dashboard().then((v) => { setData(v as any); setIsDemo(false); }).catch(() => { setData(DEMO_RESELLER_DASHBOARD as any); setIsDemo(true); });
  }, []);

  if (!data) return <div className="loading">Loading...</div>;

  const d = data;
  return (
    <div className="dashboard">
      <h1>Reseller Dashboard</h1>
      {isDemo && <div className="demo-banner">Backend সংযুক্ত নেই। লাইভ ডেটা দেখতে backend চালু করুন।</div>}
      <div className="cards">
        <div className="card"><h3>Balance</h3><p className="value">BDT {Number(d.profile?.currentBalance ?? 0).toLocaleString()}</p><p className="muted">Limit: BDT {Number(d.profile?.balanceLimit ?? 0).toLocaleString()}</p></div>
        <div className="card"><h3>Customers</h3><p className="value">{d.customerCount}</p></div>
        <div className="card"><h3>Active</h3><p className="value green">{d.activeCount}</p></div>
        <div className="card"><h3>Monthly Collection</h3><p className="value">BDT {d.monthlyCollection.toLocaleString()}</p></div>
        <div className="card"><h3>Pending Bills</h3><p className="value">BDT {d.pendingBillsAmount.toLocaleString()}</p></div>
      </div>
    </div>
  );
}
