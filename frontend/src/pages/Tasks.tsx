import { useEffect, useState } from 'react';
import { tasks } from '../api/client';
import './Dashboard.css';

export default function Tasks() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [view, setView] = useState<'today' | 'history'>('today');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', dueDate: new Date().toISOString().slice(0, 10), priority: 'MEDIUM' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    if (view === 'history') {
      tasks.list({ history: true }).then((v) => { setList((v || []) as any[]); setIsDemo(false); }).catch(() => { setList([]); setIsDemo(true); }).finally(() => setLoading(false));
    } else {
      tasks.list({ date }).then((v) => { setList((v || []) as any[]); setIsDemo(false); }).catch(() => { setList([]); setIsDemo(true); }).finally(() => setLoading(false));
    }
  };

  useEffect(() => { load(); }, [view, date]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    setError('');
    tasks.create({ title: form.title.trim(), description: form.description || undefined, dueDate: form.dueDate, priority: form.priority })
      .then(() => { setShowForm(false); setForm({ title: '', description: '', dueDate: new Date().toISOString().slice(0, 10), priority: 'MEDIUM' }); load(); })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  const handleStatus = (id: string, status: string) => {
    tasks.update(id, { status }).then(() => load()).catch((err) => setError(err?.message || 'Failed'));
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this task?')) return;
    tasks.delete(id).then(() => load()).catch((err) => setError(err?.message || 'Failed'));
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      <h1>Task Management</h1>
      {isDemo && <div className="demo-banner">Backend not connected.</div>}
      <p className="muted">Create task planning, maintain scheduling, start every day with new tasks, check task history.</p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
        <button type="button" className="btn-logout" onClick={() => setView('today')} style={{ fontWeight: view === 'today' ? 'bold' : 'normal' }}>Today&apos;s Tasks</button>
        <button type="button" className="btn-logout" onClick={() => setView('history')} style={{ fontWeight: view === 'history' ? 'bold' : 'normal' }}>Task History</button>
        {view === 'today' && <label>Date: <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="form-input" style={{ width: 'auto' }} /></label>}
        {!isDemo && <button type="button" className="btn-logout" onClick={() => { setShowForm(true); setError(''); }}>Add Task</button>}
      </div>
      {error && <div className="error-msg" style={{ marginBottom: '0.5rem' }}>{error}</div>}
      {showForm && (
        <div className="section" style={{ maxWidth: 480, marginBottom: '1rem' }}>
          <h2 className="section-title">Create Task</h2>
          <form onSubmit={handleCreate}>
            <input className="form-input" placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <textarea className="form-input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} style={{ marginTop: '0.5rem' }} />
            <label style={{ display: 'block', marginTop: '0.5rem' }}>Due Date: <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="form-input" style={{ width: 'auto' }} /></label>
            <label style={{ display: 'block', marginTop: '0.5rem' }}>Priority: <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="form-input" style={{ width: 'auto' }}><option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option></select></label>
            <div style={{ marginTop: '0.5rem' }}><button type="submit" className="btn-logout" disabled={submitting}>{submitting ? 'Saving...' : 'Create'}</button> <button type="button" className="btn-logout" onClick={() => setShowForm(false)}>Cancel</button></div>
          </form>
        </div>
      )}
      {list.length === 0 && !isDemo && <p className="muted">{view === 'today' ? 'No tasks for this date. Add a task to get started.' : 'No task history.'}</p>}
      {list.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Title</th><th>Description</th><th>Due Date</th><th>Priority</th><th>Status</th><th>Assigned To</th><th>Actions</th></tr></thead>
            <tbody>
              {list.map((t: any) => (
                <tr key={t.id}>
                  <td>{t.title}</td>
                  <td>{(t.description || '').slice(0, 50)}{(t.description || '').length > 50 ? '...' : ''}</td>
                  <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-'}</td>
                  <td>{t.priority || '-'}</td>
                  <td>{t.status}</td>
                  <td>{t.assignedTo?.name ?? t.createdBy?.name ?? '-'}</td>
                  <td>
                    {!isDemo && (
                      <>
                        {t.status === 'PENDING' && <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', marginRight: '0.25rem' }} onClick={() => handleStatus(t.id, 'IN_PROGRESS')}>Start</button>}
                        {t.status === 'IN_PROGRESS' && <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', marginRight: '0.25rem' }} onClick={() => handleStatus(t.id, 'COMPLETED')}>Complete</button>}
                        <button type="button" className="btn-logout" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }} onClick={() => handleDelete(t.id)}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
