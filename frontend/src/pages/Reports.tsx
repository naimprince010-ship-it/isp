import { useEffect, useState } from 'react';
import { reports } from '../api/client';
import { DEMO_COLLECTION_SUMMARY, DEMO_EXPENSES, DEMO_PROFIT_LOSS } from '../data/demoData';
import './Dashboard.css';

const EXPENSE_CATEGORIES = ['SALARY', 'RENT', 'UPSTREAM', 'OFFICE', 'OTHER'] as const;

const now = new Date();
const currentMonth = now.getMonth() + 1;
const currentYear = now.getFullYear();

function formatDateForInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function Reports() {
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [profitLoss, setProfitLoss] = useState<{ totalIncome: number; totalExpense: number; profit: number } | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [collection, setCollection] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [addExpenseForm, setAddExpenseForm] = useState({ category: 'OTHER', amount: '', description: '', date: formatDateForInput(new Date()) });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      reports.profitLoss(month, year).then(setProfitLoss).catch(() => setProfitLoss(DEMO_PROFIT_LOSS)),
      reports.expenses(month, year).then(setExpenses).catch(() => setExpenses(DEMO_EXPENSES as any)),
      reports.collection(month, year).then((r) => setCollection(r.summary || [])).catch(() => setCollection(DEMO_COLLECTION_SUMMARY as any)),
    ]).then(() => setIsDemo(false)).catch(() => { setProfitLoss(DEMO_PROFIT_LOSS); setExpenses(DEMO_EXPENSES as any); setCollection(DEMO_COLLECTION_SUMMARY as any); setIsDemo(true); }).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [month, year]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amount = parseFloat(addExpenseForm.amount);
    if (!addExpenseForm.category.trim() || isNaN(amount) || amount < 0) {
      setError('Category and valid amount required');
      return;
    }
    setSubmitting(true);
    reports
      .addExpense({
        category: addExpenseForm.category.trim(),
        amount,
        description: addExpenseForm.description.trim() || undefined,
        date: addExpenseForm.date || undefined,
      })
      .then(() => {
        setShowAddExpense(false);
        setAddExpenseForm({ category: 'OTHER', amount: '', description: '', date: formatDateForInput(new Date()) });
        loadData();
      })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  if (loading) return <div className="loading">Loading...</div>;
  return (
    <div className="dashboard">
      <h1>Reports</h1>
      {isDemo && <div className="demo-banner">Backend সংযুক্ত নেই।</div>}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <label>Month: <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>{[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
        <label>Year: <select value={year} onChange={(e) => setYear(Number(e.target.value))}>{[currentYear, currentYear-1].map((y) => <option key={y} value={y}>{y}</option>)}</select></label>
        {!isDemo && (
          <button type="button" className="btn-logout" onClick={() => { setShowAddExpense(true); setError(''); }}>Add Expense</button>
        )}
      </div>
      {profitLoss && (
        <div className="cards" style={{ marginBottom: '1.5rem' }}>
          <div className="card"><h3>Total Income</h3><p className="value">BDT {profitLoss.totalIncome.toLocaleString()}</p></div>
          <div className="card"><h3>Total Expense</h3><p className="value">BDT {profitLoss.totalExpense.toLocaleString()}</p></div>
          <div className="card"><h3>Profit/Loss</h3><p className={profitLoss.profit >= 0 ? 'value green' : 'value'} style={{ color: profitLoss.profit < 0 ? '#f87171' : undefined }}>BDT {profitLoss.profit.toLocaleString()}</p></div>
        </div>
      )}
      <h2 className="section-title">Collection (Reseller-wise)</h2>
      {collection.length === 0 && <p className="muted">কোনো ডেটা নেই।</p>}
      {collection.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Reseller</th><th>Area</th><th>Collection (BDT)</th></tr></thead>
            <tbody>
              {collection.map((s: any, i) => <tr key={i}><td>{s.resellerName}</td><td>{s.area ?? '—'}</td><td>{Number(s.totalCollection).toLocaleString()}</td></tr>)}
            </tbody>
          </table>
        </div>
      )}
      <h2 className="section-title" style={{ marginTop: '1.5rem' }}>Expenses</h2>
      {expenses.length === 0 && <p className="muted">কোনো খরচ নেই।</p>}
      {expenses.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Category</th><th>Amount</th><th>Description</th><th>Date</th></tr></thead>
            <tbody>
              {expenses.map((e: any) => <tr key={e.id}><td>{e.category}</td><td>BDT {Number(e.amount).toLocaleString()}</td><td>{e.description ?? '—'}</td><td>{new Date(e.date).toLocaleDateString()}</td></tr>)}
            </tbody>
          </table>
        </div>
      )}

      {showAddExpense && (
        <div className="modal-overlay" onClick={() => setShowAddExpense(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Add Expense</h2>
            <form onSubmit={handleAddExpense}>
              <label className="muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Category</label>
              <select
                className="form-input"
                value={addExpenseForm.category}
                onChange={(e) => setAddExpenseForm({ ...addExpenseForm, category: e.target.value })}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min={0}
                className="form-input"
                placeholder="Amount (BDT) *"
                value={addExpenseForm.amount}
                onChange={(e) => setAddExpenseForm({ ...addExpenseForm, amount: e.target.value })}
                required
              />
              <input
                className="form-input"
                placeholder="Description (optional)"
                value={addExpenseForm.description}
                onChange={(e) => setAddExpenseForm({ ...addExpenseForm, description: e.target.value })}
              />
              <label className="muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Date</label>
              <input
                type="date"
                className="form-input"
                value={addExpenseForm.date}
                onChange={(e) => setAddExpenseForm({ ...addExpenseForm, date: e.target.value })}
              />
              {error && <div className="error-msg" style={{ marginTop: '0.5rem' }}>{error}</div>}
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-logout" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
                <button type="button" className="btn-logout" onClick={() => setShowAddExpense(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
