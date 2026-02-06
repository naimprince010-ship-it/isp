/**
 * Outside bill payment by payment link – no login required.
 * Route: /pay/:token
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicPay } from '../api/client';
import './Dashboard.css';

export default function PublicPay() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState<{
    billId: string;
    customerName: string;
    packageName: string;
    amount: number;
    discountAmount: number;
    totalDue: number;
    paidSoFar: number;
    dueNow: number;
    dueDate: string;
  } | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('BKASH');
  const [trxId, setTrxId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid link');
      setLoading(false);
      return;
    }
    publicPay.get(token).then((data) => {
      setInfo(data);
      setAmount(String(data.dueNow));
      setError('');
    }).catch((err) => {
      setError(err?.message || 'Invalid or expired payment link');
      setInfo(null);
    }).finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !amount || parseFloat(amount) <= 0 || !trxId.trim()) return;
    setSubmitting(true);
    setError('');
    publicPay.submit(token, { amount: parseFloat(amount), method, trxId: trxId.trim() }).then(() => {
      setSuccess(true);
    }).catch((err) => setError(err?.message || 'Payment failed')).finally(() => setSubmitting(false));
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error && !info) return <div className="dashboard"><h1>Pay Bill</h1><div className="error-msg">{error}</div></div>;
  if (success) return <div className="dashboard"><h1>Payment successful</h1><p className="muted">Thank you. Your payment has been recorded.</p></div>;

  return (
    <div className="dashboard">
      <h1>Pay Bill</h1>
      {info && (
        <div className="card" style={{ maxWidth: 420, marginBottom: '1rem' }}>
          <p><strong>Customer:</strong> {info.customerName}</p>
          <p><strong>Package:</strong> {info.packageName}</p>
          <p><strong>Amount:</strong> BDT {info.amount.toLocaleString()}</p>
          {info.discountAmount > 0 && <p><strong>Discount:</strong> - BDT {info.discountAmount.toLocaleString()}</p>}
          <p><strong>Total due:</strong> BDT {info.totalDue.toLocaleString()}</p>
          <p><strong>Paid so far:</strong> BDT {info.paidSoFar.toLocaleString()}</p>
          <p><strong>Due now:</strong> BDT {info.dueNow.toLocaleString()}</p>
          <p><strong>Due date:</strong> {new Date(info.dueDate).toLocaleDateString()}</p>
        </div>
      )}
      <form onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
        <label className="form-input" style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Amount (BDT) *</label>
        <input type="number" step="0.01" min="0.01" className="form-input" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <label style={{ display: 'block', marginTop: '1rem', marginBottom: '0.5rem', color: '#94a3b8' }}>Method *</label>
        <select className="form-input" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="BKASH">bKash</option>
          <option value="NAGAD">Nagad</option>
          <option value="ROCKET">Rocket</option>
        </select>
        <label style={{ display: 'block', marginTop: '1rem', marginBottom: '0.5rem', color: '#94a3b8' }}>Transaction ID *</label>
        <input type="text" className="form-input" value={trxId} onChange={(e) => setTrxId(e.target.value)} placeholder="Trx ID" required />
        {error && <div className="error-msg" style={{ marginTop: '0.5rem' }}>{error}</div>}
        <button type="submit" className="btn-logout" disabled={submitting} style={{ marginTop: '1rem' }}>{submitting ? 'Submitting...' : 'Pay'}</button>
      </form>
    </div>
  );
}
