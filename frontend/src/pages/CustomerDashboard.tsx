import { useEffect, useState } from 'react';
import { customer } from '../api/client';
import { DEMO_CUSTOMER_DASHBOARD } from '../data/demoData';
import './Dashboard.css';

export default function CustomerDashboard() {
  const [data, setData] = useState<{ profile: any; pendingBills: unknown[]; lastPayment: unknown } | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    customer.dashboard().then((v) => { setData(v as any); setIsDemo(false); }).catch(() => { setData(DEMO_CUSTOMER_DASHBOARD as any); setIsDemo(true); });
  }, []);

  if (!data) return <div className="loading">Loading...</div>;

  const p = data.profile;
  const bills = (data.pendingBills || []) as { id: string; amount: number; dueDate: string; package?: { name: string } }[];
  const lastPay = data.lastPayment as { amount: number; createdAt: string } | null;

  return (
    <div className="dashboard">
      <h1>My Connection</h1>
      {isDemo && <div className="demo-banner">Backend সংযুক্ত নেই। লাইভ ডেটা দেখতে backend চালু করুন।</div>}
      <div className="cards">
        <div className="card">
          <h3>Status</h3>
          <p className={p?.status === 'ACTIVE' ? 'value green' : 'value'}>{p?.status || 'N/A'}</p>
        </div>
        <div className="card">
          <h3>Package</h3>
          <p className="value">{p?.package?.name || 'N/A'}</p>
          <p className="muted">BDT {Number(p?.package?.price ?? 0).toLocaleString()} / month</p>
        </div>
        <div className="card">
          <h3>Reseller</h3>
          <p className="value">{p?.reseller || 'N/A'}</p>
        </div>
        <div className="card">
          <h3>Pending Bills</h3>
          <p className="value">{bills.length}</p>
          <p className="muted">Total: BDT {bills.reduce((s, b) => s + Number(b.amount), 0).toLocaleString()}</p>
        </div>
      </div>
      {lastPay && (
        <section className="section">
          <h2>Last Payment</h2>
          <p>BDT {Number(lastPay.amount).toLocaleString()} on {new Date(lastPay.createdAt).toLocaleDateString()}</p>
        </section>
      )}
      {bills.length > 0 && (
        <section className="section">
          <h2>Due Bills</h2>
          <ul>
            {bills.map((b) => (
              <li key={b.id}>
                {b.package?.name} - BDT {Number(b.amount).toLocaleString()} (Due: {new Date(b.dueDate).toLocaleDateString()})
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
