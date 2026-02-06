// Demo data when backend is not connected

export const DEMO_ADMIN_DASHBOARD = {
  totalCustomers: 156,
  activeCustomers: 128,
  inactiveCustomers: 28,
  monthlyCollection: 125000,
  pendingBillsAmount: 32000,
  resellerCount: 8,
};

export const DEMO_RESELLERS = [
  { id: 'r1', name: 'Rahim Telecom', phone: '01712345678', isActive: true, resellerProfile: { id: 'rp1', balanceLimit: 50000, currentBalance: 18500, commissionRate: 10, area: 'Shariatpur Sadar', companyName: 'Rahim Telecom' } },
  { id: 'r2', name: 'Karim Internet', phone: '01823456789', isActive: true, resellerProfile: { id: 'rp2', balanceLimit: 30000, currentBalance: 8200, commissionRate: 8, area: 'Naria', companyName: 'Karim Internet' } },
  { id: 'r3', name: 'Jalal Broadband', phone: '01934567890', isActive: true, resellerProfile: { id: 'rp3', balanceLimit: 40000, currentBalance: 22100, commissionRate: 12, area: 'Zajira', companyName: 'Jalal Broadband' } },
];

export const DEMO_PACKAGES = [
  { id: 'p1', name: '5 Mbps', speedMbps: 5, price: 500, validityDays: 30 },
  { id: 'p2', name: '10 Mbps', speedMbps: 10, price: 800, validityDays: 30 },
  { id: 'p3', name: '20 Mbps', speedMbps: 20, price: 1200, validityDays: 30 },
  { id: 'p4', name: '50 Mbps', speedMbps: 50, price: 2500, validityDays: 30 },
];

export const DEMO_MIKROTIK_LOGS = [
  { id: 'ml1', action: 'ADD', username: 'user001', success: true, error: null, createdAt: new Date().toISOString() },
  { id: 'ml2', action: 'ADD', username: 'user002', success: true, error: null, createdAt: new Date().toISOString() },
  { id: 'ml3', action: 'BLOCK', username: 'user003', success: true, error: null, createdAt: new Date().toISOString() },
];

export const DEMO_BTRC_USER_LIST = [
  { id: 'u1', name: 'Abdul Karim', phone: '01711111111', package: '10 Mbps', reseller: 'Rahim Telecom', status: 'ACTIVE' },
  { id: 'u2', name: 'Fatema Begum', phone: '01822222222', package: '5 Mbps', reseller: 'Karim Internet', status: 'ACTIVE' },
  { id: 'u3', name: 'Mahabub Alam', phone: '01933333333', package: '20 Mbps', reseller: 'Jalal Broadband', status: 'ACTIVE' },
];

export const DEMO_BTRC_PAYMENT_LOG = [
  { id: 'pl1', customerName: 'Abdul Karim', customerPhone: '01711111111', amount: 800, method: 'CASH', trxId: null, createdAt: new Date().toISOString() },
  { id: 'pl2', customerName: 'Fatema Begum', customerPhone: '01822222222', amount: 500, method: 'BKASH', trxId: 'BKASH123', createdAt: new Date().toISOString() },
];

export const DEMO_PROFIT_LOSS = { totalIncome: 125000, totalExpense: 45000, profit: 80000 };

export const DEMO_COLLECTION_SUMMARY = [
  { resellerId: 'r1', resellerName: 'Rahim Telecom', area: 'Shariatpur Sadar', totalCollection: 45000 },
  { resellerId: 'r2', resellerName: 'Karim Internet', area: 'Naria', totalCollection: 28000 },
  { resellerId: 'r3', resellerName: 'Jalal Broadband', area: 'Zajira', totalCollection: 52000 },
];

export const DEMO_EXPENSES = [
  { id: 'e1', category: 'SALARY', amount: 25000, description: 'Staff salary', date: new Date().toISOString() },
  { id: 'e2', category: 'UPSTREAM', amount: 15000, description: 'BTCL upstream', date: new Date().toISOString() },
  { id: 'e3', category: 'RENT', amount: 5000, description: 'Office rent', date: new Date().toISOString() },
];

export const DEMO_INVENTORY = [
  { id: 'i1', type: 'ROUTER', name: 'MikroTik hAP ac2', quantity: 25, unit: 'pcs', minStock: 5, location: 'Store A' },
  { id: 'i2', type: 'ONU', name: 'Huawei EG8145V5', quantity: 40, unit: 'pcs', minStock: 10, location: 'Store A' },
  { id: 'i3', type: 'FIBER_CABLE', name: 'Fiber 2 Core', quantity: 500, unit: 'meter', minStock: 100, location: 'Store B' },
  { id: 'i4', type: 'MC', name: 'Media Converter', quantity: 15, unit: 'pcs', minStock: 3, location: 'Store A' },
];

export const DEMO_RESELLER_DASHBOARD = {
  profile: { currentBalance: 18500, balanceLimit: 50000 },
  customerCount: 42,
  activeCount: 38,
  monthlyCollection: 28500,
  pendingBillsAmount: 8500,
};

export const DEMO_CUSTOMERS = [
  { id: 'c1', user: { name: 'Abdul Karim', phone: '01711111111' }, package: { name: '10 Mbps' }, status: 'ACTIVE', address: 'Shariatpur Sadar, House 12' },
  { id: 'c2', user: { name: 'Fatema Begum', phone: '01822222222' }, package: { name: '5 Mbps' }, status: 'ACTIVE', address: 'Naria, Road 5' },
  { id: 'c3', user: { name: 'Mahabub Alam', phone: '01933333333' }, package: { name: '20 Mbps' }, status: 'BLOCKED', address: 'Zajira' },
];

export const DEMO_BILLS = [
  { id: 'b1', amount: 800, dueDate: new Date().toISOString(), status: 'PENDING', customer: { user: { name: 'Abdul Karim', phone: '01711111111' } }, package: { name: '10 Mbps' } },
  { id: 'b2', amount: 500, dueDate: new Date().toISOString(), status: 'PAID', customer: { user: { name: 'Fatema Begum', phone: '01822222222' } }, package: { name: '5 Mbps' } },
];

export const DEMO_RECHARGES = [
  { id: 'rc1', amount: 10000, previousBalance: 8500, newBalance: 18500, createdAt: new Date().toISOString(), notes: 'Monthly recharge' },
  { id: 'rc2', amount: 5000, previousBalance: 3500, newBalance: 8500, createdAt: new Date().toISOString(), notes: null },
];

export const DEMO_CUSTOMER_DASHBOARD = {
  profile: { status: 'ACTIVE', package: { name: '10 Mbps', price: 800 }, reseller: 'Rahim Telecom' },
  pendingBills: [{ id: 'pb1', amount: 800, dueDate: new Date().toISOString(), package: { name: '10 Mbps' } }],
  lastPayment: { amount: 800, createdAt: new Date().toISOString() },
};

export const DEMO_MY_BILLS = [
  { id: 'mb1', amount: 800, dueDate: new Date().toISOString(), status: 'PENDING', package: { name: '10 Mbps' } },
  { id: 'mb2', amount: 800, dueDate: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(), status: 'PAID', package: { name: '10 Mbps' } },
];

export const DEMO_USAGE = [
  { date: new Date().toISOString().slice(0, 10), totalBytes: 2.5 * 1024 * 1024 * 1024 },
  { date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), totalBytes: 1.8 * 1024 * 1024 * 1024 },
  { date: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10), totalBytes: 2.1 * 1024 * 1024 * 1024 },
];

export const DEMO_TICKETS = [
  { id: 't1', subject: 'Connection slow', description: 'Speed is low in evening', status: 'RESOLVED', createdAt: new Date().toISOString() },
  { id: 't2', subject: 'Bill query', description: 'Need duplicate receipt', status: 'OPEN', createdAt: new Date().toISOString() },
];

export const DEMO_BRANDING = {
  companyName: 'Rahim Telecom',
  logoUrl: 'https://example.com/logo.png',
  receiptHeader: 'Rahim Telecom\nShariatpur Sadar\nThank you for your payment.',
  receiptFooter: 'Contact: 01712345678\nValid only with seal.',
};
