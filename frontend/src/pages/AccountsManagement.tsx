import { useEffect, useState } from 'react';
import { accounts } from '../api/client';
import './Dashboard.css';
import './NetworkDiagram.css';

type Tab = 'overview' | 'expense' | 'income' | 'transactions' | 'accounts' | 'balance';
type Account = { id: string; name: string; type: string; openingBalance: number; balance?: number };
type Category = { id: string; name: string; type: string };
type Tx = { id: string; date: string; type: string; amount: number; description?: string; category?: Category; account?: Account; transferToAccount?: Account };

export default function AccountsManagement() {
  const [tab, setTab] = useState<Tab>('overview');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState<{ totalCash: number; totalBank: number; totalIncome: number; totalExpense: number; profitLoss: number; accounts: Account[] } | null>(null);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [accountList, setAccountList] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountForm, setAccountForm] = useState({ name: '', type: 'CASH', openingBalance: '0', notes: '' });

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', type: 'EXPENSE' });

  const [txForm, setTxForm] = useState({ date: new Date().toISOString().slice(0, 10), type: 'EXPENSE', accountId: '', amount: '', categoryId: '', transferToAccountId: '', description: '', voucherNo: '' });

  const load = () => {
    setLoading(true);
    Promise.all([
      accounts.summary(month, year).then((r) => setSummary(r as any)).catch(() => setSummary(null)),
      accounts.transactions({ month, year }).then((v) => setTransactions((v || []) as Tx[])).catch(() => setTransactions([])),
      accounts.accounts(true).then((v) => setAccountList((v || []) as Account[])).catch(() => setAccountList([])),
      accounts.categories().then((v) => setCategories((v || []) as Category[])).catch(() => setCategories([])),
    ])
      .then(() => setIsDemo(false))
      .catch(() => setIsDemo(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [month, year]);

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!accountForm.name.trim()) { setError('Name required'); return; }
    setSubmitting(true);
    accounts.createAccount({
      name: accountForm.name.trim(),
      type: accountForm.type,
      openingBalance: parseFloat(accountForm.openingBalance) || 0,
      notes: accountForm.notes.trim() || undefined,
    })
      .then(() => { setShowAccountForm(false); setAccountForm({ name: '', type: 'CASH', openingBalance: '0', notes: '' }); load(); })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!categoryForm.name.trim()) { setError('Name required'); return; }
    setSubmitting(true);
    accounts.createCategory({ name: categoryForm.name.trim(), type: categoryForm.type })
      .then(() => { setShowCategoryForm(false); setCategoryForm({ name: '', type: 'EXPENSE' }); load(); })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  const handleAddTransaction = (e: React.FormEvent, typeOverride?: string) => {
    e.preventDefault();
    setError('');
    const txType = typeOverride ?? txForm.type;
    const amt = parseFloat(txForm.amount);
    if (!txForm.accountId || !amt || amt <= 0) { setError('Account and amount required'); return; }
    if (txType === 'TRANSFER' && !txForm.transferToAccountId) { setError('Select transfer account'); return; }
    setSubmitting(true);
    accounts.createTransaction({
      date: txForm.date,
      type: txType,
      accountId: txForm.accountId,
      amount: amt,
      categoryId: txForm.categoryId || undefined,
      transferToAccountId: txForm.transferToAccountId || undefined,
      description: txForm.description.trim() || undefined,
      voucherNo: txForm.voucherNo.trim() || undefined,
    })
      .then(() => { setTxForm({ ...txForm, amount: '', categoryId: '', description: '', voucherNo: '' }); load(); })
      .catch((err) => setError(err?.message || 'Failed'))
      .finally(() => setSubmitting(false));
  };

  const printBalanceSheet = () => {
    accounts.balanceSheet(month, year).then((data: any) => {
      const cashRows = (data.cashAccounts || []).map((a: any) => `<tr><td>${a.name}</td><td style="text-align:right">${a.balance?.toFixed(2)}</td></tr>`).join('');
      const bankRows = (data.bankAccounts || []).map((a: any) => `<tr><td>${a.name}</td><td style="text-align:right">${a.balance?.toFixed(2)}</td></tr>`).join('');
      const html = `
        <html><body style="font-family:sans-serif;padding:2rem;max-width:500px">
        <h1>Balance Sheet</h1>
        <p>As of: ${new Date(data.asOf).toLocaleDateString()} (${month}/${year})</p>
        <h3>Assets</h3>
        <table border="1" cellpadding="8" style="width:100%;border-collapse:collapse">
        <thead><tr><th>Cash & Bank</th><th>Amount</th></tr></thead>
        <tbody>${cashRows}${bankRows}</tbody>
        <tfoot><tr><th>Total Assets</th><th style="text-align:right">${(data.totalAssets ?? 0).toFixed(2)}</th></tr></tfoot>
        </table>
        <p style="margin-top:2rem;font-size:0.85rem">Generated from ISP Accounts Management</p>
        </body></html>`;
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
    }).catch(() => setError('Failed to load balance sheet'));
  };

  if (loading && !summary) return <div className="loading">Loading accounts...</div>;

  const tabBtn = (t: Tab, label: string) => (
    <button key={t} type="button" className={`net-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{label}</button>
  );

  const incomeCats = categories.filter((c) => c.type === 'INCOME');
  const expenseCats = categories.filter((c) => c.type === 'EXPENSE');

  return (
    <div className="network-page">
      <header className="network-header">
        <div>
          <h1>Accounts Management</h1>
          <p className="network-subtitle">Total accounts, income, expense, profit/loss, cash & bank, balance sheet</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label>Month: <input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10) || 1)} className="form-input net-select" style={{ width: 50 }} /></label>
          <label>Year: <input type="number" min="2020" max="2030" value={year} onChange={(e) => setYear(parseInt(e.target.value, 10) || 2024)} className="form-input net-select" style={{ width: 70 }} /></label>
        </div>
      </header>

      {isDemo && <div className="demo-banner">Backend not connected.</div>}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {tabBtn('overview', 'Overview')}
        {tabBtn('expense', 'Expense')}
        {tabBtn('income', 'Income')}
        {tabBtn('transactions', 'Transactions')}
        {tabBtn('accounts', 'Accounts')}
        {tabBtn('balance', 'Balance Sheet')}
      </div>

      {error && <div className="error-msg" style={{ marginBottom: '0.5rem' }}>{error}</div>}

      {tab === 'overview' && summary && (
        <section className="network-diagram-section">
          <div className="cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
            <div className="card"><h3>Cash on Hand</h3><p className="value green">৳ {summary.totalCash?.toFixed(2) ?? '0.00'}</p></div>
            <div className="card"><h3>Bank Deposit</h3><p className="value green">৳ {summary.totalBank?.toFixed(2) ?? '0.00'}</p></div>
            <div className="card"><h3>Total Income</h3><p className="value green">৳ {summary.totalIncome?.toFixed(2) ?? '0.00'}</p></div>
            <div className="card"><h3>Total Expense</h3><p className="value" style={{ color: '#f87171' }}>৳ {summary.totalExpense?.toFixed(2) ?? '0.00'}</p></div>
            <div className="card"><h3>Profit / Loss</h3><p className={`value ${(summary.profitLoss ?? 0) >= 0 ? 'green' : ''}`} style={(summary.profitLoss ?? 0) < 0 ? { color: '#f87171' } : {}}>৳ {(summary.profitLoss ?? 0).toFixed(2)}</p></div>
          </div>
          <div className="section" style={{ marginTop: '1.5rem' }}>
            <h2>Account Balances</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Account</th><th>Type</th><th>Balance</th></tr></thead>
                <tbody>
                  {(summary.accounts || []).map((a: Account) => (
                    <tr key={a.id}><td>{a.name}</td><td>{a.type}</td><td>৳ {(a.balance ?? 0).toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {tab === 'expense' && (
        <section className="network-diagram-section">
          <h3>Category-wise Daily Expense</h3>
          {!isDemo && (
            <div className="card" style={{ marginBottom: '1rem', maxWidth: 400 }}>
              <form onSubmit={(e) => handleAddTransaction(e, 'EXPENSE')}>
                <input type="date" className="form-input" value={txForm.date} onChange={(e) => setTxForm({ ...txForm, date: e.target.value })} required />
                <select className="form-input" value={txForm.accountId} onChange={(e) => setTxForm({ ...txForm, accountId: e.target.value })} required>
                  <option value="">Select account (from)</option>
                  {accountList.filter((a: Account & { isActive?: boolean }) => a.isActive !== false).map((a) => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
                </select>
                <select className="form-input" value={txForm.categoryId} onChange={(e) => setTxForm({ ...txForm, categoryId: e.target.value })}>
                  <option value="">Expense category</option>
                  {expenseCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="number" step="0.01" min="0.01" className="form-input" placeholder="Amount" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} required />
                <input className="form-input" placeholder="Description" value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })} />
                <input className="form-input" placeholder="Voucher No" value={txForm.voucherNo} onChange={(e) => setTxForm({ ...txForm, voucherNo: e.target.value })} />
                <button type="submit" className="btn-logout" style={{ marginTop: '0.5rem' }} disabled={submitting}>Add Expense</button>
              </form>
            </div>
          )}
          <div><button type="button" className="btn-logout" style={{ fontSize: '0.875rem' }} onClick={() => setShowCategoryForm(true)}>+ Add Expense Category</button></div>
        </section>
      )}

      {tab === 'income' && (
        <section className="network-diagram-section">
          <h3>Service-Related Income</h3>
          {!isDemo && (
            <div className="card" style={{ marginBottom: '1rem', maxWidth: 400 }}>
              <form onSubmit={(e) => handleAddTransaction(e, 'INCOME')}>
                <input type="date" className="form-input" value={txForm.date} onChange={(e) => setTxForm({ ...txForm, date: e.target.value })} required />
                <select className="form-input" value={txForm.accountId} onChange={(e) => setTxForm({ ...txForm, accountId: e.target.value })} required>
                  <option value="">Select account (to)</option>
                  {accountList.filter((a: Account & { isActive?: boolean }) => a.isActive !== false).map((a) => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
                </select>
                <select className="form-input" value={txForm.categoryId} onChange={(e) => setTxForm({ ...txForm, categoryId: e.target.value })}>
                  <option value="">Income category</option>
                  {incomeCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="number" step="0.01" min="0.01" className="form-input" placeholder="Amount" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} required />
                <input className="form-input" placeholder="Description" value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })} />
                <input className="form-input" placeholder="Voucher No" value={txForm.voucherNo} onChange={(e) => setTxForm({ ...txForm, voucherNo: e.target.value })} />
                <button type="submit" className="btn-logout" style={{ marginTop: '0.5rem' }} disabled={submitting}>Add Income</button>
              </form>
            </div>
          )}
          <div><button type="button" className="btn-logout" style={{ fontSize: '0.875rem' }} onClick={() => { setCategoryForm({ name: '', type: 'INCOME' }); setShowCategoryForm(true); }}>+ Add Income Category</button></div>
        </section>
      )}

      {tab === 'transactions' && (
        <section className="network-client-table">
          <h2>All Financial Transactions</h2>
          {transactions.length === 0 ? <p className="muted">No transactions in this period.</p> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Date</th><th>Type</th><th>Account</th><th>Category</th><th>Amount</th><th>Description</th></tr></thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id}>
                      <td>{new Date(t.date).toLocaleDateString()}</td>
                      <td>{t.type}</td>
                      <td>{(t.account as Account)?.name ?? '-'}</td>
                      <td>{(t.category as Category)?.name ?? '-'}</td>
                      <td style={{ color: t.type === 'INCOME' ? '#22c55e' : t.type === 'EXPENSE' ? '#f87171' : '#94a3b8' }}>৳ {Number(t.amount).toFixed(2)}</td>
                      <td>{t.description ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'accounts' && (
        <section className="network-diagram-section">
          {!isDemo && (
            <div style={{ marginBottom: '1rem' }}>
              <button type="button" className="btn-logout" onClick={() => { setShowAccountForm(true); setError(''); }}>+ Add Account (Cash/Bank)</button>
            </div>
          )}
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Type</th><th>Opening Balance</th></tr></thead>
              <tbody>
                {accountList.map((a) => (
                  <tr key={a.id}><td>{a.name}</td><td>{a.type}</td><td>৳ {Number(a.openingBalance).toFixed(2)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'balance' && (
        <section className="network-diagram-section">
          <h3>Monthly Balance Sheet</h3>
          <p className="muted">Cash on hand & bank deposit as of end of {month}/{year}</p>
          {!isDemo && (
            <button type="button" className="btn-logout" onClick={printBalanceSheet}>Generate & Print Balance Sheet</button>
          )}
          {summary && (
            <div className="cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              <div className="card"><h3>Total Cash</h3><p className="value green">৳ {summary.totalCash?.toFixed(2)}</p></div>
              <div className="card"><h3>Total Bank</h3><p className="value green">৳ {summary.totalBank?.toFixed(2)}</p></div>
            </div>
          )}
        </section>
      )}

      {showAccountForm && (
        <div className="modal-overlay" onClick={() => setShowAccountForm(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Add Account</h2>
            <form onSubmit={handleSaveAccount}>
              <input className="form-input" placeholder="Account name *" value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} required />
              <select className="form-input" value={accountForm.type} onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value })}>
                <option value="CASH">Cash</option>
                <option value="BANK">Bank</option>
              </select>
              <input type="number" step="0.01" className="form-input" placeholder="Opening balance" value={accountForm.openingBalance} onChange={(e) => setAccountForm({ ...accountForm, openingBalance: e.target.value })} />
              <input className="form-input" placeholder="Notes" value={accountForm.notes} onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })} />
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-logout" disabled={submitting}>Save</button>
                <button type="button" className="btn-logout" onClick={() => setShowAccountForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCategoryForm && (
        <div className="modal-overlay" onClick={() => setShowCategoryForm(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Add Category</h2>
            <form onSubmit={handleSaveCategory}>
              <input className="form-input" placeholder="Category name *" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} required />
              <select className="form-input" value={categoryForm.type} onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value })}>
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expense</option>
              </select>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-logout" disabled={submitting}>Save</button>
                <button type="button" className="btn-logout" onClick={() => setShowCategoryForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
