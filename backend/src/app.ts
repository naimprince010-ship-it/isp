import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { resellerRouter } from './routes/reseller.js';
import { customerRouter } from './routes/customer.js';
import { packagesRouter } from './routes/packages.js';
import { mikrotikRouter } from './routes/mikrotik.js';
import { reportsRouter } from './routes/reports.js';
import { inventoryRouter } from './routes/inventory.js';
import { ticketsRouter } from './routes/tickets.js';
import { smsRouter } from './routes/sms.js';
import { newClientRequestRouter } from './routes/newClientRequest.js';
import { publicPayRouter } from './routes/publicPay.js';
import { hrRouter } from './routes/hr.js';
import { tasksRouter } from './routes/tasks.js';
import { salesRouter } from './routes/sales.js';
import { purchaseRouter } from './routes/purchase.js';
import { networkRouter } from './routes/network.js';
import { accountsRouter } from './routes/accounts.js';
import { assetsRouter } from './routes/assets.js';
import { bandwidthRouter } from './routes/bandwidth.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/packages', packagesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/reseller', resellerRouter);
app.use('/api/customer', customerRouter);
app.use('/api/mikrotik', mikrotikRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/sms', smsRouter);
app.use('/api/new-client-request', newClientRequestRouter);
app.use('/api/public', publicPayRouter);
app.use('/api/hr', hrRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/sales', salesRouter);
app.use('/api/purchase', purchaseRouter);
app.use('/api/network', networkRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/bandwidth', bandwidthRouter);

app.get('/', (_, res) => res.json({ name: 'ISP Management API', health: '/api/health', docs: 'Use /api/* routes for auth, admin, reseller, customer, etc.' }));
app.get('/api/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.use(errorHandler);

export { app };
