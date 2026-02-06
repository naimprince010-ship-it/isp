import { useEffect, useState } from 'react';
import { admin } from '../api/client';
import { DEMO_RESELLERS } from '../data/demoData';
import './Dashboard.css';

type ResellerRow = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  isActive: boolean;
  resellerProfile?: {
    id: string;
    balanceLimit: number;
    currentBalance: number;
    commissionRate: number;
    area?: string | null;
    companyName?: string | null;
  } | null;
};

export default function Resellers() {
  const [list, setList] = useState<ResellerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [rechargeFor, setRechargeFor] = useState<ResellerRow | null>(null);
  const [addForm, setAddForm] = useState({ name: '', phone: '', password: '', balanceLimit: '', commissionRate: '', area: '', companyName: '' });
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeNotes, setRechargeNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    admin.resellers().then((v) => { setList((v || []) as ResellerRow[]); setIsDemo(false); }).catch(() => { setList(DEMO_RESELLERS as ResellerRow[]); setIsDemo(true); }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!addForm.name.trim() || !addForm.phone.trim() || !addForm.password.trim()) { setError('Name, Phone, Password required'); return; }
    setSubmitting(true);
    admin.createReseller({
      name: addForm.name.trim(),
      phone: addForm.phone.trim(),
      password: addForm.password,
      balanceLimit: addForm.balanceLimit ? parseFloat(addForm.balanceLimit) : 0,
      commissionRate: addForm.commissionRate ? parseFloat(addForm.commissionRate) : 0,
      area: addForm.area.trim() || undefined,
      companyName: addForm.companyName.trim() || undefined,
    }).then(() => { setShowAdd(false); setAddForm({ name: '', phone: '', password: '', balanceLimit: '', commissionRate: '', area: '', companyName: '' }); load(); }).catch((err) => setError(err?.message || 'Failed')).finally(() => setSubmitting(false));
  };

  const handleRecharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rechargeFor || !rechargeAmount || parseFloat(rechargeAmount) <= 0) return;
    setSubmitting(true);
    admin.rechargeReseller(rechargeFor.id, parseFloat(rechargeAmount), rechargeNotes.trim() || undefined).then(() => { setRechargeFor(null); setRechargeAmount(''); setRechargeNotes(''); load(); }).catch((err) => setError(err?.message || 'Failed')).finally(() => setSubmitting(false));
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      <h1>Resellers (Admin)</h1>
      {isDemo && <div className="demo-banner">Backend সংযুক্ত নেই। লাইভ ডেটা দেখতে backend চালু করুন।</div>}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button type="button" className="btn-logout" onClick={() => { setShowAdd(true); setError(''); }}>Add Reseller</button>
      </div>
      {list.length === 0 && !isDemo && <p className="muted">কোনো রিসেলার নেই। উপরে Add Reseller ক্লিক করুন।</p>}
      {list.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Area</th>
                <th>Balance</th>
                <th>Limit</th>
                <th>Commission %</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.phone}</td>
                  <td>{r.resellerProfile?.area ?? '—'}</td>
                  <td>BDT {Number(r.resellerProfile?.currentBalance ?? 0).toLocaleString()}</td>
                  <td>BDT {Number(r.resellerProfile?.balanceLimit ?? 0).toLocaleString()}</td>
                  <td>{Number(r.resellerProfile?.commissionRate ?? 0)}%</td>
                  <td>{r.isActive ? 'Active' : 'Inactive'}</td>
                  <td>
                    <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => { setRechargeFor(r); setRechargeAmount(''); setRechargeNotes(''); setError(''); }}>Recharge</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Add Reseller</h2>
            <form onSubmit={handleAdd}>
              <input className="form-input" placeholder="Name *" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} required />
              <input className="form-input" placeholder="Phone *" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} required />
              <input type="password" className="form-input" placeholder="Password *" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} required minLength={6} />
              <input type="number" className="form-input" placeholder="Balance Limit (BDT)" value={addForm.balanceLimit} onChange={(e) => setAddForm({ ...addForm, balanceLimit: e.target.value })} />
              <input type="number" className="form-input" placeholder="Commission %" value={addForm.commissionRate} onChange={(e) => setAddForm({ ...addForm, commissionRate: e.target.value })} />
              <input className="form-input" placeholder="Area" value={addForm.area} onChange={(e) => setAddForm({ ...addForm, area: e.target.value })} />
              <input className="form-input" placeholder="Company Name" value={addForm.companyName} onChange={(e) => setAddForm({ ...addForm, companyName: e.target.value })} />
              {error && <div className="error-msg" style={{ marginTop: '0.5rem' }}>{error}</div>}
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-logout" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
                <button type="button" className="btn-logout" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rechargeFor && (
        <div className="modal-overlay" onClick={() => setRechargeFor(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Recharge: {rechargeFor.name}</h2>
            <form onSubmit={handleRecharge}>
              <input type="number" step="0.01" min="0.01" className="form-input" placeholder="Amount (BDT) *" value={rechargeAmount} onChange={(e) => setRechargeAmount(e.target.value)} required />
              <input className="form-input" placeholder="Notes (optional)" value={rechargeNotes} onChange={(e) => setRechargeNotes(e.target.value)} />
              {error && <div className="error-msg" style={{ marginTop: '0.5rem' }}>{error}</div>}
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-logout" disabled={submitting}>{submitting ? 'Recharging...' : 'Recharge'}</button>
                <button type="button" className="btn-logout" onClick={() => setRechargeFor(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
