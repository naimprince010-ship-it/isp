// Production (Railway/Render): set VITE_API_URL to backend URL e.g. https://your-backend.onrender.com
export const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api';
const API = API_BASE;

function getToken(): string | null {
  return localStorage.getItem('token');
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json().catch(() => ({} as T));
}

export const auth = {
  login: (phone: string, password: string) =>
    api<{ user: unknown; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    }),
  me: () => api<{ id: string; role: string; name: string; phone: string; resellerProfile?: unknown; customerProfile?: unknown }>('/auth/me'),
  register: (data: { phone: string; password: string; name: string; role: string; email?: string }) =>
    api<{ user: unknown; token: string }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
};

export const packages = {
  list: () => api<Array<{ id: string; name: string; speedMbps: number; price: number; validityDays: number }>>('/packages'),
  create: (data: { name: string; speedMbps: number; price: number; validityDays?: number; description?: string }) =>
    api('/packages', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; speedMbps?: number; price?: number; validityDays?: number; description?: string; isActive?: boolean }) =>
    api(`/packages/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

export const admin = {
  dashboard: () => api<{ totalCustomers: number; activeCustomers: number; inactiveCustomers: number; monthlyCollection: number; pendingBillsAmount: number; resellerCount: number }>('/admin/dashboard'),
  resellers: () => api<unknown[]>('/admin/resellers'),
  createReseller: (data: Record<string, unknown>) => api('/admin/resellers', { method: 'POST', body: JSON.stringify(data) }),
  updateReseller: (id: string, data: Record<string, unknown>) => api(`/admin/resellers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  rechargeReseller: (id: string, amount: number, notes?: string) => api(`/admin/resellers/${id}/recharge`, { method: 'POST', body: JSON.stringify({ amount, notes }) }),
  btrcReport: (month?: number, year?: number) => api<{ userList: unknown[]; paymentLog: unknown[] }>(`/admin/reports/btrc?month=${month || ''}&year=${year || ''}`),
  upstream: () => api<{ provider: string; capacityMbps: number; notes: string; soldMbps: number }>('/admin/upstream'),
  updateUpstream: (data: { provider?: string; capacityMbps?: number; notes?: string }) =>
    api<{ ok: boolean }>('/admin/upstream', { method: 'PATCH', body: JSON.stringify(data) }),
  setupStatus: () => api<{ db: boolean; mikrotikConfigured: boolean; smsConfigured: boolean }>('/admin/setup-status'),
  customers: (params?: { status?: string; resellerId?: string; packageId?: string; zoneArea?: string; createdAtFrom?: string; createdAtTo?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return api<unknown[]>(`/admin/customers${q ? `?${q}` : ''}`);
  },
  customerProfile: (id: string) => api<{ profile: unknown; bills: unknown[]; payments: unknown[]; usageLogs: unknown[]; tickets: unknown[] }>(`/admin/customers/${id}/profile`),
  customersExport: (params?: { status?: string; resellerId?: string; format?: 'csv' | 'pdf' | 'html' }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return fetch(`${API}/admin/customers/export${q ? `?${q}` : ''}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }).then((r) => (r.ok ? r.blob() : Promise.reject(new Error('Export failed'))));
  },
  setPppoePassword: (customerId: string, password: string) =>
    api<{ ok: boolean }>(`/admin/customers/${customerId}/pppoe-password`, { method: 'PATCH', body: JSON.stringify({ password }) }),
  setMacAddress: (customerId: string, macAddress: string | null, pushToMikrotik?: boolean) =>
    api(`/admin/customers/${customerId}/mac`, { method: 'PATCH', body: JSON.stringify({ macAddress, pushToMikrotik }) }),
  newClientRequests: (status?: string) => api<unknown[]>(`/admin/new-client-requests${status ? `?status=${status}` : ''}`),
  reviewNewClientRequest: (id: string, status: 'APPROVED' | 'REJECTED', data?: { resellerId?: string; packageId?: string; password?: string; notes?: string }) =>
    api(`/admin/new-client-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status, ...data }) }),
  bulkStatus: (customerIds: string[], status: string) =>
    api<{ updated: number }>('/admin/customers/bulk-status', { method: 'PATCH', body: JSON.stringify({ customerIds, status }) }),
  assignCustomer: (customerId: string, assignedToUserId: string | null) =>
    api(`/admin/customers/${customerId}/assign`, { method: 'PATCH', body: JSON.stringify({ assignedToUserId }) }),
  markLeft: (customerId: string, leftReason?: string) =>
    api(`/admin/customers/${customerId}/left`, { method: 'PATCH', body: JSON.stringify({ leftReason }) }),
  employees: () => api<{ id: string; name: string; phone: string }[]>('/admin/employees'),
  createEmployee: (data: { phone: string; password: string; name: string; email?: string }) =>
    api('/admin/employees', { method: 'POST', body: JSON.stringify(data) }),
  scheduleRules: () => api<unknown[]>('/admin/schedule-rules'),
  createScheduleRule: (data: { customerId: string; scheduledAt: string; newStatus?: string; newPackageId?: string }) =>
    api('/admin/schedule-rules', { method: 'POST', body: JSON.stringify(data) }),
  deleteScheduleRule: (id: string) => api<{ ok: boolean }>(`/admin/schedule-rules/${id}`, { method: 'DELETE' }),
  customerRequests: (status?: string) => api<unknown[]>(`/admin/customer-requests${status ? `?status=${status}` : ''}`),
  reviewCustomerRequest: (id: string, status: 'APPROVED' | 'REJECTED', notes?: string) =>
    api(`/admin/customer-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status, notes }) }),
  bills: (params?: { status?: string; month?: number; year?: number; dueDateFrom?: string; dueDateTo?: string; resellerId?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return api<unknown[]>(`/admin/bills${q ? `?${q}` : ''}`);
  },
  billsExport: (params?: { status?: string; month?: number; year?: number; format?: 'csv' | 'pdf' | 'html' }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return fetch(`${API}/admin/bills/export${q ? `?${q}` : ''}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }).then((r) => (r.ok ? r.blob() : Promise.reject(new Error('Export failed'))));
  },
  extendBill: (billId: string, data: { dueDate?: string; extendDays?: number }) =>
    api(`/admin/bills/${billId}/extend`, { method: 'PATCH', body: JSON.stringify(data) }),
  getBillInvoice: (billId: string) =>
    fetch(`${API}/admin/bills/${billId}/invoice`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then((r) => (r.ok ? r.text() : Promise.reject(new Error('Failed')))),
  createPaymentLink: (billId: string, expiresInDays?: number) =>
    api<{ token: string; link: string; expiresAt: string }>(`/admin/bills/${billId}/payment-link`, { method: 'POST', body: JSON.stringify({ expiresInDays }) }),
  collectEmployee: (billId: string, data: { amount: number; method: string; trxId?: string; notes?: string }) =>
    api(`/admin/bills/${billId}/collect-employee`, { method: 'POST', body: JSON.stringify(data) }),
  pendingPaymentApprovals: (status?: string) =>
    api<unknown[]>(`/admin/pending-payment-approvals${status ? `?status=${status}` : ''}`),
  approvePendingPayment: (id: string, status: 'APPROVED' | 'REJECTED', notes?: string) =>
    api(`/admin/pending-payment-approvals/${id}`, { method: 'PATCH', body: JSON.stringify({ status, notes }) }),
  receiptPayment: (paymentId: string) =>
    fetch(`${API}/admin/receipt/payment/${paymentId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then((r) => (r.ok ? r.text() : Promise.reject(new Error('Failed')))),
  sendReceipt: (paymentId: string) =>
    api<{ ok: boolean }>(`/admin/payments/${paymentId}/send-receipt`, { method: 'POST' }),
  verifyPayment: (method: string, trxId: string, amount: number) =>
    api<{ verified: boolean; amount?: number }>('/admin/payment/verify', { method: 'POST', body: JSON.stringify({ method, trxId, amount }) }),
};

export const sms = {
  send: (phone: string, message: string, purpose?: string) =>
    api<{ success: boolean; logId?: string }>('/sms/send', { method: 'POST', body: JSON.stringify({ phone, message, purpose: purpose || 'MANUAL' }) }),
  logs: (limit?: number) => api<unknown[]>(`/sms/logs${limit != null ? `?limit=${limit}` : ''}`),
};

export const reseller = {
  dashboard: () => api<{ profile: unknown; customerCount: number; activeCount: number; monthlyCollection: number; pendingBillsAmount: number }>('/reseller/dashboard'),
  customers: (params?: { status?: string; packageId?: string; zoneArea?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return api<unknown[]>(`/reseller/customers${q ? `?${q}` : ''}`);
  },
  customerProfile: (id: string) => api<{ profile: unknown; bills: unknown[]; payments: unknown[]; usageLogs: unknown[]; tickets: unknown[] }>(`/reseller/customers/${id}/profile`),
  createCustomer: (data: Record<string, unknown>) => api('/reseller/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomerStatus: (id: string, status: string) => api(`/reseller/customers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  setPppoePassword: (customerId: string, password: string) =>
    api<{ ok: boolean }>(`/reseller/customers/${customerId}/pppoe-password`, { method: 'PATCH', body: JSON.stringify({ password }) }),
  setMacAddress: (customerId: string, macAddress: string | null, pushToMikrotik?: boolean) =>
    api(`/reseller/customers/${customerId}/mac`, { method: 'PATCH', body: JSON.stringify({ macAddress, pushToMikrotik }) }),
  bulkStatus: (customerIds: string[], status: string) =>
    api<{ updated: number }>('/reseller/customers/bulk-status', { method: 'PATCH', body: JSON.stringify({ customerIds, status }) }),
  bills: (params?: { status?: string; month?: number; year?: number; dueDateFrom?: string; dueDateTo?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return api<unknown[]>(`/reseller/bills${q ? `?${q}` : ''}`);
  },
  billsExport: (params?: { status?: string; month?: number; year?: number; format?: 'csv' | 'pdf' | 'html' }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return fetch(`${API}/reseller/bills/export${q ? `?${q}` : ''}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }).then((r) => (r.ok ? r.blob() : Promise.reject(new Error('Export failed'))));
  },
  collectBill: (billId: string, data: { amount: number; method?: string; trxId?: string; notes?: string; sendReceipt?: boolean; discountAmount?: number; useAdvance?: number }) =>
    api(`/reseller/bills/${billId}/collect`, { method: 'POST', body: JSON.stringify(data) }),
  extendBill: (billId: string, data: { dueDate?: string; extendDays?: number }) =>
    api(`/reseller/bills/${billId}/extend`, { method: 'PATCH', body: JSON.stringify(data) }),
  getBillInvoice: (billId: string) =>
    fetch(`${API}/reseller/bills/${billId}/invoice`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then((r) => (r.ok ? r.text() : Promise.reject(new Error('Failed')))),
  createPaymentLink: (billId: string, expiresInDays?: number) =>
    api<{ token: string; link: string; expiresAt: string }>(`/reseller/bills/${billId}/payment-link`, { method: 'POST', body: JSON.stringify({ expiresInDays }) }),
  receiptPayment: (paymentId: string) =>
    fetch(`${API}/reseller/receipt/payment/${paymentId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then((r) => (r.ok ? r.text() : Promise.reject(new Error('Failed')))),
  sendReceipt: (paymentId: string) =>
    api<{ ok: boolean }>(`/reseller/payments/${paymentId}/send-receipt`, { method: 'POST' }),
  recharges: () => api<unknown[]>('/reseller/recharges'),
  branding: () => api<{ logoUrl?: string; receiptHeader?: string; receiptFooter?: string; companyName?: string }>('/reseller/branding'),
  updateBranding: (data: Record<string, string>) => api('/reseller/branding', { method: 'PATCH', body: JSON.stringify(data) }),
};

export const customer = {
  dashboard: () => api<{ profile: unknown; pendingBills: unknown[]; lastPayment: unknown }>('/customer/dashboard'),
  bills: () => api<unknown[]>('/customer/bills'),
  payBill: (billId: string, amount: number, method: string, trxId: string) => api(`/customer/bills/${billId}/pay`, { method: 'POST', body: JSON.stringify({ amount, method, trxId }) }),
  getBillInvoice: (billId: string) =>
    fetch(`${API}/customer/bills/${billId}/invoice`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then((r) => (r.ok ? r.text() : Promise.reject(new Error('Failed')))),
  usage: (days?: number) => api<Array<{ date: string; totalBytes: number }>>(`/customer/usage?days=${days || 30}`),
  requests: () => api<unknown[]>('/customer/requests'),
  createRequest: (data: { type: 'PACKAGE_CHANGE' | 'STATUS_CHANGE'; requestedPackageId?: string; requestedStatus?: string }) =>
    api('/customer/requests', { method: 'POST', body: JSON.stringify(data) }),
};

export const tickets = {
  my: () => api<unknown[]>('/tickets/my'),
  create: (subject: string, description: string) => api('/tickets', { method: 'POST', body: JSON.stringify({ subject, description }) }),
};

export const reports = {
  profitLoss: (month?: number, year?: number) => api<{ totalIncome: number; totalExpense: number; profit: number }>(`/reports/profit-loss?month=${month || ''}&year=${year || ''}`),
  expenses: (month?: number, year?: number) => api<unknown[]>(`/reports/expenses?month=${month || ''}&year=${year || ''}`),
  collection: (month?: number, year?: number) => api<{ summary: unknown[] }>(`/reports/collection?month=${month || ''}&year=${year || ''}`),
  addExpense: (data: { category: string; amount: number; description?: string; date?: string }) => api('/reports/expenses', { method: 'POST', body: JSON.stringify(data) }),
};

export const mikrotik = {
  sync: () => api<{ synced: number; failed: number; errors: string[] }>('/mikrotik/sync', { method: 'POST' }),
  import: () => api<{ imported: number; skipped: number; errors: string[] }>('/mikrotik/import', { method: 'POST' }),
  logs: () => api<unknown[]>('/mikrotik/logs'),
  test: () => api<{ ok: boolean; identity?: string; error?: string }>('/mikrotik/test'),
};

// Public (no auth): payment by link – view bill & submit payment
export const publicPay = {
  get: (token: string) => api<{ billId: string; customerName: string; packageName: string; amount: number; discountAmount: number; totalDue: number; paidSoFar: number; dueNow: number; dueDate: string }>(`/public/pay/${token}`),
  submit: (token: string, data: { amount: number; method: string; trxId: string }) =>
    api<{ ok: boolean; message: string; status: string }>(`/public/pay/${token}`, { method: 'POST', body: JSON.stringify(data) }),
};

// Public (no auth): submit new client request
export const newClientRequest = {
  submit: (data: { name: string; phone: string; address?: string; packageId?: string; resellerId?: string; connectionType: 'PPPoE' | 'Static'; requestedUsername?: string; requestedStaticIp?: string; notes?: string }) =>
    api<{ id: string; message: string }>('/new-client-request', { method: 'POST', body: JSON.stringify(data) }),
};

export const inventory = {
  list: () => api<unknown[]>('/inventory'),
  create: (data: Record<string, unknown>) => api('/inventory', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) => api(`/inventory/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => api<{ ok: boolean }>(`/inventory/${id}`, { method: 'DELETE' }),
};
