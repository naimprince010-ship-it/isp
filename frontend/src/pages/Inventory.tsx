import { useEffect, useState } from 'react';
import { inventory } from '../api/client';
import { DEMO_INVENTORY } from '../data/demoData';
import './Dashboard.css';

const INVENTORY_TYPES = ['ROUTER', 'ONU', 'MC', 'FIBER_CABLE', 'OTHER'] as const;

type Item = { id: string; type: string; name: string; quantity: number; unit: string; minStock: number; location?: string };

export default function Inventory() {
  const [list, setList] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [addForm, setAddForm] = useState({ type: 'ROUTER', name: '', quantity: '0', unit: 'pcs', minStock: '0', location: '' });
  const [editForm, setEditForm] = useState({ name: '', quantity: '', unit: 'pcs', minStock: '', location: '' });

  const load = () => {
    inventory
      .list()
      .then((v) => {
        setList((v || []) as Item[]);
        setIsDemo(false);
      })
      .catch(() => {
        setList(DEMO_INVENTORY as Item[]);
        setIsDemo(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!addForm.name.trim()) {
      setError('Name required');
      return;
    }
    setSubmitting(true);
    inventory
      .create({
        type: addForm.type,
        name: addForm.name.trim(),
        quantity: parseInt(addForm.quantity, 10) || 0,
        unit: addForm.unit.trim() || 'pcs',
        minStock: parseInt(addForm.minStock, 10) || 0,
        location: addForm.location.trim() || undefined,
      })
      .then(() => {
        setShowAdd(false);
        setAddForm({ type: 'ROUTER', name: '', quantity: '0', unit: 'pcs', minStock: '0', location: '' });
        load();
      })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setError('');
    setSubmitting(true);
    inventory
      .update(editItem.id, {
        name: editForm.name.trim(),
        quantity: parseInt(editForm.quantity, 10),
        unit: editForm.unit.trim() || 'pcs',
        minStock: parseInt(editForm.minStock, 10),
        location: editForm.location.trim() || null,
      })
      .then(() => {
        setEditItem(null);
        load();
      })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  const handleDelete = () => {
    if (!deleteItem) return;
    setSubmitting(true);
    inventory
      .delete(deleteItem.id)
      .then(() => {
        setDeleteItem(null);
        load();
      })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      <h1>Inventory</h1>
      {isDemo && <div className="demo-banner">Backend সংযুক্ত নেই।</div>}
      {!isDemo && (
        <div style={{ marginBottom: '1rem' }}>
          <button type="button" className="btn-logout" onClick={() => { setShowAdd(true); setError(''); }}>
            Add Item
          </button>
        </div>
      )}
      {list.length === 0 && !isDemo && <p className="muted">কোনো আইটেম নেই। Add Item ক্লিক করুন।</p>}
      {list.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Name</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Min Stock</th>
                <th>Location</th>
                {!isDemo && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {list.map((i) => (
                <tr key={i.id}>
                  <td>{i.type}</td>
                  <td>{i.name}</td>
                  <td>{i.quantity}</td>
                  <td>{i.unit}</td>
                  <td>{i.minStock}</td>
                  <td>{i.location ?? '—'}</td>
                  {!isDemo && (
                    <td>
                      <button
                        type="button"
                        className="btn-logout"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', marginRight: '0.25rem' }}
                        onClick={() => {
                          setEditItem(i);
                          setEditForm({
                            name: i.name,
                            quantity: String(i.quantity),
                            unit: i.unit,
                            minStock: String(i.minStock),
                            location: i.location ?? '',
                          });
                          setError('');
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-logout"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        onClick={() => { setDeleteItem(i); setError(''); }}
                      >
                        Delete
                      </button>
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
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Add Item</h2>
            <form onSubmit={handleAdd}>
              <label className="muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Type</label>
              <select
                className="form-input"
                value={addForm.type}
                onChange={(e) => setAddForm({ ...addForm, type: e.target.value })}
              >
                {INVENTORY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input
                className="form-input"
                placeholder="Name *"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                required
              />
              <input
                type="number"
                min={0}
                className="form-input"
                placeholder="Quantity"
                value={addForm.quantity}
                onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
              />
              <input
                className="form-input"
                placeholder="Unit (e.g. pcs, meter)"
                value={addForm.unit}
                onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
              />
              <input
                type="number"
                min={0}
                className="form-input"
                placeholder="Min Stock"
                value={addForm.minStock}
                onChange={(e) => setAddForm({ ...addForm, minStock: e.target.value })}
              />
              <input
                className="form-input"
                placeholder="Location (optional)"
                value={addForm.location}
                onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
              />
              {error && <div className="error-msg" style={{ marginTop: '0.5rem' }}>{error}</div>}
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-logout" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save'}
                </button>
                <button type="button" className="btn-logout" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editItem && (
        <div className="modal-overlay" onClick={() => setEditItem(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Item</h2>
            <form onSubmit={handleEdit}>
              <input
                className="form-input"
                placeholder="Name *"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
              <input
                type="number"
                min={0}
                className="form-input"
                placeholder="Quantity"
                value={editForm.quantity}
                onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
              />
              <input
                className="form-input"
                placeholder="Unit"
                value={editForm.unit}
                onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
              />
              <input
                type="number"
                min={0}
                className="form-input"
                placeholder="Min Stock"
                value={editForm.minStock}
                onChange={(e) => setEditForm({ ...editForm, minStock: e.target.value })}
              />
              <input
                className="form-input"
                placeholder="Location (optional)"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              />
              {error && <div className="error-msg" style={{ marginTop: '0.5rem' }}>{error}</div>}
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-logout" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save'}
                </button>
                <button type="button" className="btn-logout" onClick={() => setEditItem(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteItem && (
        <div className="modal-overlay" onClick={() => setDeleteItem(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Item</h2>
            <p>Delete &quot;{deleteItem.name}&quot;? This cannot be undone.</p>
            {error && <div className="error-msg" style={{ marginTop: '0.5rem' }}>{error}</div>}
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn-logout" disabled={submitting} onClick={handleDelete}>
                {submitting ? 'Deleting...' : 'Delete'}
              </button>
              <button type="button" className="btn-logout" onClick={() => { setDeleteItem(null); setError(''); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
