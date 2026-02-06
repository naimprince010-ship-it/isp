import { useEffect, useState } from 'react';
import { customer } from '../api/client';
import { DEMO_MY_BILLS } from '../data/demoData';
import './Dashboard.css';

export default function PayBill() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [selectedBill, setSelectedBill] = useState('');
  const [method, setMethod] = useState('BKASH');
  const [trxId, setTrxId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    customer.bills().then((v) => { const arr = ((v || []) as { id: string; status: string; amount?: number }[]).filter((b) => b.status === 'PENDING'); setBills(arr); setSelectedBill(arr[0]?.id ?? ''); setIsDemo(false); }).catch(() => { const pending = DEMO_MY_BILLS.filter((b: any) => b.status === 'PENDING'); setBills(pending); setSelectedBill(pending[0]?.id ?? ''); setIsDemo(true); }).finally(() => setLoading(false));
  }, []);

  const bill = bills.find((b) => b.id === selectedBill);
  const handlePay = () => {
    if (!bill || !trxId.trim()) return;
    setSubmitting(true);
    customer.payBill(bill.id, Number(bill.amount), method, trxId.trim()).then(() => { setBills((prev) => prev.filter((b) => b.id !== bill.id)); setTrxId(''); }).finally(() => setSubmitting(false));
  };

  if (loading) return <div className="loading">Loading...</div>;
  return (
    <div className="dashboard">
      <h1>Pay Bill</h1>
      {isDemo && <div className="demo-banner">Backend সংযুক্ত নেই।</div>}
      {bills.length === 0 && !isDemo && <p className="muted">কোনো পেন্ডিং বিল নেই।</p>}
      {bills.length > 0 && (
        <div className="section" style={{ maxWidth: 400 }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Select Bill</label>
          <select value={selectedBill} onChange={(e) => setSelectedBill(e.target.value)} className="form-input">
            {bills.map((b) => <option key={b.id} value={b.id}>{b.package?.name} - BDT {Number(b.amount).toLocaleString()}</option>)}
          </select>
          {bill && (
            <>
              <p style={{ marginTop: '1rem' }}>Amount: BDT {Number(bill.amount).toLocaleString()}</p>
              <label style={{ display: 'block', marginTop: '1rem', color: '#94a3b8' }}>Method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="form-input">
                <option value="BKASH">bKash</option><option value="NAGAD">Nagad</option><option value="ROCKET">Rocket</option>
              </select>
              <label style={{ display: 'block', marginTop: '1rem', color: '#94a3b8' }}>Transaction ID</label>
              <input type="text" value={trxId} onChange={(e) => setTrxId(e.target.value)} className="form-input" placeholder="Trx ID" />
              <button type="button" className="btn-logout" onClick={handlePay} disabled={submitting || !trxId.trim()} style={{ marginTop: '1rem' }}>{submitting ? 'Submitting...' : 'Pay'}</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
