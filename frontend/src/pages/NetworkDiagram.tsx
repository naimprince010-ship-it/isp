import { useEffect, useState } from 'react';
import { network } from '../api/client';
import './Dashboard.css';
import './NetworkDiagram.css';

type Pop = { id: string; name: string; area?: string; customerCount: number };
type Client = { id: string; name?: string; phone?: string; status: string; zoneArea?: string; packageName?: string; resellerId: string; resellerName?: string };
type Connection = { clientId: string; popId: string };
type InvLoc = { location: string; items: { id: string; type: string; name: string; quantity: number; unit: string; minStock: number }[] };

export default function NetworkDiagram() {
  const [view, setView] = useState<'diagram' | 'map' | 'inventory'>('diagram');
  const [data, setData] = useState<{ pops: Pop[]; clients: Client[]; connections: Connection[]; inventoryByLocation: InvLoc[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedPop, setSelectedPop] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    network.diagram()
      .then((r) => { setData(r as any); setIsDemo(false); })
      .catch(() => { setData(null); setIsDemo(true); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading network...</div>;

  const pops = data?.pops || [];
  const clients = (data?.clients || []).filter((c) => !statusFilter || c.status === statusFilter);
  const filteredByPop = selectedPop ? clients.filter((c) => c.resellerId === selectedPop) : clients;
  const invByLoc = data?.inventoryByLocation || [];

  const statusColor = (s: string) => {
    if (s === 'ACTIVE') return '#22c55e';
    if (s === 'BLOCKED' || s === 'INACTIVE') return '#ef4444';
    if (s === 'PENDING') return '#f59e0b';
    return '#94a3b8';
  };

  const tab = (v: typeof view, label: string, icon: string) => (
    <button key={v} type="button" className={`net-tab ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
      <span className="net-tab-icon">{icon}</span> {label}
    </button>
  );

  return (
    <div className="network-page">
      <header className="network-header">
        <div>
          <h1>Network Diagram</h1>
          <p className="network-subtitle">View POPs, monitor clients, network connections & distributed inventory</p>
        </div>
        <div className="network-tabs">
          {tab('diagram', 'Diagram', '◉')}
          {tab('map', 'Map View', '🗺')}
          {tab('inventory', 'Inventory', '📦')}
        </div>
      </header>

      {isDemo && <div className="demo-banner">Backend not connected.</div>}

      {view === 'diagram' && (
        <section className="network-diagram-section">
          <div className="diagram-controls">
            <label>
              Filter clients: <select className="form-input net-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All status</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="BLOCKED">BLOCKED</option>
                <option value="PENDING">PENDING</option>
              </select>
            </label>
            <label>
              POP: <select className="form-input net-select" value={selectedPop || ''} onChange={(e) => setSelectedPop(e.target.value || null)}>
                <option value="">All POPs</option>
                {pops.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.customerCount})</option>)}
              </select>
            </label>
          </div>
          <div className="diagram-canvas">
            <svg viewBox="0 0 900 500" className="net-svg">
              <defs>
                <linearGradient id="popGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
                <linearGradient id="clientGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>
                <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L9,3 z" fill="#64748b" />
                </marker>
              </defs>
              {pops.map((pop, i) => {
                const px = 120 + (i % 4) * 220;
                const py = 80;
                const popClients = filteredByPop.filter((c) => c.resellerId === pop.id);
                return (
                  <g key={pop.id}>
                    {popClients.slice(0, 12).map((c, j) => {
                      const cx = px - 60 + (j % 4) * 45;
                      const cy = py + 90 + Math.floor(j / 4) * 50;
                      return (
                        <line key={c.id} x1={px} y1={py + 25} x2={cx} y2={cy - 15} stroke="#475569" strokeWidth="1" strokeDasharray="4 2" opacity="0.7" markerEnd="url(#arrow)" />
                      );
                    })}
                    <rect x={px - 70} y={py - 25} width={140} height={50} rx="10" fill="url(#popGrad)" stroke="#60a5fa" strokeWidth="2" />
                    <text x={px} y={py + 5} textAnchor="middle" fill="white" fontSize="12" fontWeight="600">{pop.name}</text>
                    <text x={px} y={py + 20} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="10">{pop.customerCount} clients</text>
                    {popClients.slice(0, 12).map((c, j) => {
                      const cx = px - 60 + (j % 4) * 45;
                      const cy = py + 90 + Math.floor(j / 4) * 50;
                      return (
                        <g key={c.id}>
                          <circle cx={cx} cy={cy} r="14" fill="url(#clientGrad)" stroke={statusColor(c.status)} strokeWidth="2" />
                          <text x={cx} y={cy + 4} textAnchor="middle" fill="white" fontSize="8">{(c.name || c.phone || '?').slice(0, 4)}</text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}
              {pops.length === 0 && !isDemo && <text x="450" y="250" textAnchor="middle" fill="#64748b">No POPs. Add resellers to see network.</text>}
            </svg>
          </div>
          <div className="client-legend">
            <span><span className="dot" style={{ background: '#22c55e' }} /> ACTIVE</span>
            <span><span className="dot" style={{ background: '#ef4444' }} /> BLOCKED/INACTIVE</span>
            <span><span className="dot" style={{ background: '#f59e0b' }} /> PENDING</span>
          </div>
        </section>
      )}

      {view === 'map' && (
        <section className="network-map-section">
          <div className="map-grid">
            {pops.map((pop) => {
              const popClients = clients.filter((c) => c.resellerId === pop.id);
              return (
                <div key={pop.id} className="map-zone">
                  <div className="map-zone-header">
                    <h3>{pop.name}</h3>
                    <span className="map-zone-count">{popClients.length} clients</span>
                  </div>
                  <div className="map-zone-clients">
                    {popClients.slice(0, 20).map((c) => (
                      <div key={c.id} className="map-client-node" style={{ borderColor: statusColor(c.status) }} title={`${c.name} - ${c.status}`}>
                        {c.name || c.phone || '?'}
                      </div>
                    ))}
                    {popClients.length > 20 && <div className="map-more">+{popClients.length - 20} more</div>}
                  </div>
                </div>
              );
            })}
            {pops.length === 0 && !isDemo && <div className="map-empty">No network zones. Add resellers.</div>}
          </div>
        </section>
      )}

      {view === 'inventory' && (
        <section className="network-inventory-section">
          <h2>Distributed Inventory by Location</h2>
          <div className="inv-grid">
            {invByLoc.map((loc) => (
              <div key={loc.location} className="inv-location-card">
                <div className="inv-location-header">
                  <span className="inv-location-name">{loc.location}</span>
                  <span className="inv-location-count">{loc.items.length} item(s)</span>
                </div>
                <ul className="inv-item-list">
                  {loc.items.map((item) => (
                    <li key={item.id} className={item.quantity <= item.minStock ? 'low-stock' : ''}>
                      <span className="inv-item-name">{item.name}</span>
                      <span className="inv-item-type">{item.type}</span>
                      <span className="inv-item-qty">{item.quantity} {item.unit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {invByLoc.length === 0 && !isDemo && <p className="muted">No inventory with location. Add items in Inventory.</p>}
          </div>
        </section>
      )}

      <section className="network-client-table">
        <h2>All Clients (Monitoring)</h2>
        <div className="diagram-controls" style={{ marginBottom: '0.5rem' }}>
          <select className="form-input net-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All status</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="BLOCKED">BLOCKED</option>
            <option value="PENDING">PENDING</option>
          </select>
          <select className="form-input net-select" value={selectedPop || ''} onChange={(e) => setSelectedPop(e.target.value || null)}>
            <option value="">All POPs</option>
            {pops.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {filteredByPop.length === 0 ? <p className="muted">No clients to display.</p> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Phone</th><th>Status</th><th>Zone</th><th>Package</th><th>POP</th></tr></thead>
              <tbody>
                {filteredByPop.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name ?? '-'}</td>
                    <td>{c.phone ?? '-'}</td>
                    <td><span className="status-badge" style={{ background: statusColor(c.status) }}>{c.status}</span></td>
                    <td>{c.zoneArea ?? '-'}</td>
                    <td>{c.packageName ?? '-'}</td>
                    <td>{c.resellerName ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
