import { useEffect, useState } from 'react';
import { reseller, packages as pkgApi } from '../api/client';
import { DEMO_CUSTOMERS, DEMO_PACKAGES } from '../data/demoData';
import './Dashboard.css';

export default function Customers() {
  const [list, setList] = useState<any[]>([]);
  const [packages, setPackages] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', password: '', packageId: '', connectionType: 'PPPoE', username: '', staticIp: '', address: '', zoneArea: '' });

  const load = () => {
    reseller.customers().then((v) => { setList(v || []); setIsDemo(false); }).catch(() => { setList(DEMO_CUSTOMERS); setIsDemo(true); }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    pkgApi.list().then((v) => setPackages(v || [])).catch(() => setPackages(DEMO_PACKAGES as any));
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.phone.trim() || !form.password.trim() || !form.packageId) { setError('Name, Phone, Password, Package required'); return; }
    setSubmitting(true);
    reseller.createCustomer({
      name: form.name.trim(),
      phone: form.phone.trim(),
      password: form.password,
      packageId: form.packageId,
      connectionType: form.connectionType,
      username: form.username.trim() || form.phone.trim(),
      staticIp: form.staticIp.trim() || undefined,
      address: form.address.trim() || undefined,
      zoneArea: form.zoneArea.trim() || undefined,
    }).then(() => { setShowAdd(false); setForm({ name: '', phone: '', password: '', packageId: '', connectionType: 'PPPoE', username: '', staticIp: '', address: '', zoneArea: '' }); load(); }).catch((err) => setError(err?.message || 'Failed')).finally(() => setSubmitting(false));
  };

  if (loading) return <div className="loading">Loading...</div>;
  return (
    <div className="dashboard">
      <h1>Customers (Reseller)</h1>
      {isDemo && <div className="demo-banner">Backend সংযুক্ত নেই।</div>}
      <div style={{ marginBottom: '1rem' }}>
        <button type="button" className="btn-logout" onClick={() => { setShowAdd(true); setError(''); }}>Add Customer</button>
      </div>
      {error && !showAdd && <div className="error-msg" style={{ marginBottom: '0.5rem' }}>{error}</div>}
      {list.length === 0 && !isDemo && <p className="muted">কোনো কাস্টমার নেই। Add Customer ক্লিক করুন।</p>}
      {list.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Phone</th><th>Package</th><th>Status</th><th>Address</th>{!isDemo && <th>Actions</th>}</tr></thead>
            <tbody>
              {list.map((c: any) => (
                <tr key={c.id}>
                  <td>{c.user?.name ?? '-'}</td>
                  <td>{c.user?.phone ?? '-'}</td>
                  <td>{c.package?.name ?? '-'}</td>
                  <td>{c.status}</td>
                  <td>{c.address ?? '-'}</td>
                  {!isDemo && (
                    <td>
                      {c.status === 'ACTIVE' && (
                        <button
                          type="button"
                          className="btn-logout"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          onClick={() => {
                            setError('');
                            setSubmitting(true);
                            reseller.updateCustomerStatus(c.id, 'BLOCKED').then(() => load()).catch((err) => setError(err?.message || 'Failed')).finally(() => setSubmitting(false));
                          }}
                          disabled={submitting}
                        >
                          Block
                        </button>
                      )}
                      {(c.status === 'BLOCKED' || c.status === 'INACTIVE') && (
                        <button
                          type="button"
                          className="btn-logout"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          onClick={() => {
                            setError('');
                            setSubmitting(true);
                            reseller.updateCustomerStatus(c.id, 'ACTIVE').then(() => load()).catch((err) => setError(err?.message || 'Failed')).finally(() => setSubmitting(false));
                          }}
                          disabled={submitting}
                        >
                          Unblock
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h2>Add Customer</h2>
            <form onSubmit={handleAdd}>
              <input className="form-input" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <input className="form-input" placeholder="Phone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              <input type="password" className="form-input" placeholder="Password *" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
              <select className="form-input" value={form.packageId} onChange={(e) => setForm({ ...form, packageId: e.target.value })} required>
                <option value="">Select Package *</option>
                {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select className="form-input" value={form.connectionType} onChange={(e) => setForm({ ...form, connectionType: e.target.value })}>
                <option value="PPPoE">PPPoE</option>
                <option value="Static">Static</option>
              </select>
              {form.connectionType === 'PPPoE' && <input className="form-input" placeholder="PPPoE Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />}
              {form.connectionType === 'Static' && <input className="form-input" placeholder="Static IP" value={form.staticIp} onChange={(e) => setForm({ ...form, staticIp: e.target.value })} />}
              <input className="form-input" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <input className="form-input" placeholder="Zone/Area" value={form.zoneArea} onChange={(e) => setForm({ ...form, zoneArea: e.target.value })} />
              {error && <div className="error-msg" style={{ marginTop: '0.5rem' }}>{error}</div>}
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-logout" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
                <button type="button" className="btn-logout" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
