import { useEffect, useState } from 'react';
import { tickets } from '../api/client';
import { DEMO_TICKETS } from '../data/demoData';
import './Dashboard.css';

type Ticket = { id: string; subject: string; description: string; status: string; createdAt: string };

export default function Support() {
  const [list, setList] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    tickets.my().then((v) => { setList((v || []) as Ticket[]); setIsDemo(false); }).catch(() => { setList(DEMO_TICKETS as Ticket[]); setIsDemo(true); }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleCreate = () => {
    if (!subject.trim() || !description.trim()) return;
    setSubmitting(true);
    tickets.create(subject.trim(), description.trim()).then(() => { setSubject(''); setDescription(''); load(); }).catch(() => {}).finally(() => setSubmitting(false));
  };

  if (loading) return <div className="loading">Loading...</div>;
  return (
    <div className="dashboard">
      <h1>Support Tickets</h1>
      {isDemo && <div className="demo-banner">Backend সংযুক্ত নেই।</div>}
      <div className="section" style={{ maxWidth: 480, marginBottom: '2rem' }}>
        <h2 className="section-title">New Ticket</h2>
        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="form-input" placeholder="Subject" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="form-input" rows={4} placeholder="Description" style={{ marginTop: '0.5rem' }} />
        <button type="button" className="btn-logout" onClick={handleCreate} disabled={submitting || !subject.trim() || !description.trim()} style={{ marginTop: '0.5rem' }}>{submitting ? 'Submitting...' : 'Create Ticket'}</button>
      </div>
      <h2 className="section-title">My Tickets</h2>
      {list.length === 0 && !isDemo && <p className="muted">কোনো টিকেট নেই।</p>}
      {list.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Subject</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>
              {list.map((t) => <tr key={t.id}><td>{t.subject}</td><td>{t.status}</td><td>{new Date(t.createdAt).toLocaleString()}</td></tr>)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
