import { useEffect, useState } from 'react';
import { mikrotik } from '../api/client';
import { DEMO_MIKROTIK_LOGS } from '../data/demoData';
import './Dashboard.css';

export default function MikroTik() {
  const [logs, setLogs] = useState<{ id: string; action: string; username?: string; success: boolean; error?: string; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; failed: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; identity?: string; error?: string } | null>(null);

  const loadLogs = () => {
    mikrotik.logs().then((v) => { setLogs((v || []) as any); setIsDemo(false); }).catch(() => { setLogs(DEMO_MIKROTIK_LOGS as any); setIsDemo(true); }).finally(() => setLoading(false));
  };
  useEffect(() => { loadLogs(); }, []);

  const handleSync = () => {
    setSyncing(true); setSyncResult(null);
    mikrotik.sync().then((r) => { setSyncResult(r); loadLogs(); }).catch((err) => setSyncResult({ synced: 0, failed: 0, errors: [err?.message || 'Sync failed'] })).finally(() => setSyncing(false));
  };

  const handleImport = () => {
    setImporting(true); setImportResult(null);
    mikrotik.import().then((r) => { setImportResult(r); loadLogs(); }).catch((err) => setImportResult({ imported: 0, skipped: 0, errors: [err?.message || 'Import failed'] })).finally(() => setImporting(false));
  };

  const handleTest = () => {
    setTesting(true); setTestResult(null);
    mikrotik.test().then((r) => setTestResult(r)).catch((err) => setTestResult({ ok: false, error: err?.message || 'Connection failed' })).finally(() => setTesting(false));
  };

  if (loading) return <div className="loading">Loading...</div>;
  return (
    <div className="dashboard">
      <h1>MikroTik Sync</h1>
      {isDemo && <div className="demo-banner">Backend সংযুক্ত নেই।</div>}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="btn-logout" onClick={handleTest} disabled={testing}>{testing ? 'Testing...' : 'Test Connection'}</button>
        <button type="button" className="btn-logout" onClick={handleSync} disabled={syncing}>{syncing ? 'Syncing...' : 'Sync All'}</button>
        <button type="button" className="btn-logout" onClick={handleImport} disabled={importing}>{importing ? 'Importing...' : 'Import from MikroTik'}</button>
        {testResult && (
          <span className={testResult.ok ? 'muted' : ''} style={testResult.ok ? {} : { color: '#f87171' }}>
            {testResult.ok ? `✓ Connected${testResult.identity ? ` (${testResult.identity})` : ''}` : `✗ ${testResult.error}`}
          </span>
        )}
        {syncResult && <span className="muted">Synced: {syncResult.synced}, Failed: {syncResult.failed}</span>}
        {importResult && <span className="muted">Imported: {importResult.imported}, Skipped: {importResult.skipped}</span>}
      </div>
      {importResult && importResult.errors.length > 0 && (
        <div className="error-msg" style={{ marginBottom: '1rem' }}>
          {importResult.errors.map((e, i) => <div key={i}>{e}</div>)}
        </div>
      )}
      {syncResult && syncResult.errors.length > 0 && (
        <div className="error-msg" style={{ marginBottom: '1rem' }}>
          {syncResult.errors.map((e, i) => <div key={i}>{e}</div>)}
        </div>
      )}
      <h2 className="section-title">Sync Logs</h2>
      {logs.length === 0 && <p className="muted">কোনো লগ নেই।</p>}
      {logs.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Action</th><th>Username</th><th>Success</th><th>Error</th><th>Time</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}><td>{l.action}</td><td>{l.username ?? '—'}</td><td>{l.success ? 'Yes' : 'No'}</td><td>{l.error ?? '—'}</td><td>{new Date(l.createdAt).toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
