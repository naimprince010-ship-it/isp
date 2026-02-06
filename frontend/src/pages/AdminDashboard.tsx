import { useEffect, useState } from 'react';
import { admin } from '../api/client';
import { DEMO_ADMIN_DASHBOARD } from '../data/demoData';
import './Dashboard.css';

type DashboardData = {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  monthlyCollection: number;
  pendingBillsAmount: number;
  resellerCount: number;
};

type SetupStatus = { db: boolean; mikrotikConfigured: boolean; smsConfigured: boolean } | null;

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [setupStatus, setSetupStatus] = useState<SetupStatus>(null);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    admin
      .dashboard()
      .then((v) => {
        setData(v as DashboardData);
        setIsDemo(false);
      })
      .catch(() => {
        setData(DEMO_ADMIN_DASHBOARD as DashboardData);
        setIsDemo(true);
      });
  }, []);

  useEffect(() => {
    if (isDemo) { setSetupStatus(null); return; }
    admin.setupStatus().then(setSetupStatus).catch(() => setSetupStatus(null));
  }, [isDemo]);

  if (!data) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      <h1>Admin Dashboard</h1>
      {isDemo && (
        <div className="demo-banner">
          Backend/Database সংযুক্ত নেই। লাইভ ডেটা দেখতে backend চালু করুন ও DB সেটআপ করুন।
        </div>
      )}
      {setupStatus && (
        <div className="cards" style={{ marginBottom: '1rem' }}>
          <div className="card"><h3>DB</h3><p className="value" style={{ color: setupStatus.db ? 'var(--green, green)' : '#f87171' }}>{setupStatus.db ? '✓' : '✗'}</p></div>
          <div className="card"><h3>MikroTik</h3><p className="value" style={{ color: setupStatus.mikrotikConfigured ? 'var(--green, green)' : '#888' }}>{setupStatus.mikrotikConfigured ? '✓ Configured' : 'Not set'}</p></div>
          <div className="card"><h3>SMS</h3><p className="value" style={{ color: setupStatus.smsConfigured ? 'var(--green, green)' : '#888' }}>{setupStatus.smsConfigured ? '✓ Configured' : 'Not set'}</p></div>
        </div>
      )}
      <div className="cards">
        <div className="card"><h3>Total Customers</h3><p className="value">{data.totalCustomers}</p></div>
        <div className="card"><h3>Active</h3><p className="value green">{data.activeCustomers}</p></div>
        <div className="card"><h3>Inactive</h3><p className="value">{data.inactiveCustomers}</p></div>
        <div className="card"><h3>Monthly Collection</h3><p className="value">BDT {data.monthlyCollection.toLocaleString()}</p></div>
        <div className="card"><h3>Pending Bills</h3><p className="value">BDT {data.pendingBillsAmount.toLocaleString()}</p></div>
        <div className="card"><h3>Resellers</h3><p className="value">{data.resellerCount}</p></div>
      </div>
    </div>
  );
}
