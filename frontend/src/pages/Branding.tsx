import { useEffect, useState } from 'react';
import { reseller } from '../api/client';
import { DEMO_BRANDING } from '../data/demoData';
import './Dashboard.css';

export default function Branding() {
  const [, setData] = useState<{ logoUrl?: string; receiptHeader?: string; receiptFooter?: string; companyName?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ companyName: '', receiptHeader: '', receiptFooter: '', logoUrl: '' });

  useEffect(() => {
    reseller.branding().then((v) => { setData(v); setForm({ companyName: v.companyName ?? '', receiptHeader: v.receiptHeader ?? '', receiptFooter: v.receiptFooter ?? '', logoUrl: v.logoUrl ?? '' }); setIsDemo(false); }).catch(() => { setData(DEMO_BRANDING); setForm({ companyName: DEMO_BRANDING.companyName, receiptHeader: DEMO_BRANDING.receiptHeader, receiptFooter: DEMO_BRANDING.receiptFooter, logoUrl: DEMO_BRANDING.logoUrl }); setIsDemo(true); }).finally(() => setLoading(false));
  }, []);

  const handleSave = () => {
    setSaving(true);
    reseller.updateBranding(form).then(() => setSaving(false)).catch(() => setSaving(false));
  };

  if (loading) return <div className="loading">Loading...</div>;
  return (
    <div className="dashboard">
      <h1>Branding (Reseller)</h1>
      {isDemo && <div className="demo-banner">Backend সংযুক্ত নেই।</div>}
      <div className="section" style={{ maxWidth: 480 }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Company Name</label>
        <input type="text" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="form-input" placeholder="Company name" />
        <label style={{ display: 'block', marginBottom: '0.5rem', marginTop: '1rem', color: '#94a3b8' }}>Logo URL</label>
        <input type="text" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} className="form-input" placeholder="https://..." />
        <label style={{ display: 'block', marginBottom: '0.5rem', marginTop: '1rem', color: '#94a3b8' }}>Receipt Header</label>
        <textarea value={form.receiptHeader} onChange={(e) => setForm({ ...form, receiptHeader: e.target.value })} className="form-input" rows={3} placeholder="Receipt header text" />
        <label style={{ display: 'block', marginBottom: '0.5rem', marginTop: '1rem', color: '#94a3b8' }}>Receipt Footer</label>
        <textarea value={form.receiptFooter} onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })} className="form-input" rows={3} placeholder="Receipt footer text" />
        <button type="button" className="btn-logout" onClick={handleSave} disabled={saving} style={{ marginTop: '1rem' }}>{saving ? 'Saving...' : 'Save'}</button>
      </div>
    </div>
  );
}
