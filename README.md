# ISP Management Software (Shariatpur Reseller Model)

Full-featured ISP management with **Admin**, **Reseller**, and **Customer** panels.

## ডকুমেন্টেশন (Documentation)

| ফাইল | বিষয় |
|------|--------|
| **START_HERE.md** | এখান থেকে শুরু – সব গাইডের লিংক। |
| **RUN_NOW.md** | Backend + Frontend চালানো ও লগইন। |
| **APP_CHECKLIST.md** | অ্যাপে কী কী করতে হবে। |
| **TECHNICAL_CHECKLIST.md** | টেকনিক্যালি কী কী লাগবে। |
| **DEPLOYMENT.md** | ডিপ্লয় ও প্রোডাকশন। |
| **UPSTREAM.md** | Summit/আপস্ট্রিম অ্যাপের সাথে যুক্ত করা। |
| **CRON_SETUP.md** | অটো-ব্লক ও বিল জেনারেশন – Task Scheduler / crontab। |
| **TESTING.md** | টেস্ট চালানো। |

---

## Features

### ১. অ্যাডমিন প্যানেল
- **Dashboard**: Total active/inactive users, monthly collection, network overview
- **Reseller Management**: Balance limit, commission, recharge, dashboard control
- **MikroTik Sync**: Auto-sync user data (PPPoE/Static) with router
- **Package Management**: Create packages (e.g. 5Mbps, 10Mbps) and pricing
- **BTRC Reporting**: Monthly user list and payment log for BTRC

### ২. রিসেলার প্যানেল
- **User Provisioning**: Create, block/unblock customers in your area
- **Recharge System**: Buy credit from Admin to activate lines
- **Bill Collection**: Collect bills from customers, record payments
- **Personalized Billing**: Logo, receipt header/footer (branding)

### ৩. কাস্টমার পোর্টাল
- **Self-Care Dashboard**: Connection status, package, bill due
- **Online Payment**: bKash, Nagad, Rocket (record trxId, auto line-on when paid)
- **Support Ticket**: Create and track tickets
- **Usage Logs**: Data usage (graph/chart ready API)

### ৪. অটোমেশন ও নেটওয়ার্ক
- **Auto-Block**: Cron job blocks overdue customers on router after N days
- **SMS Gateway**: Bill generation, payment confirmation, auto-block SMS (configurable)
- **Inventory**: Router, ONU, MC, fiber cable stock

### ৫. অ্যাকাউন্টিং ও রিপোর্ট
- **Profit/Loss**: Monthly income vs expense
- **Expense Tracker**: Salary, rent, upstream (BTCL) bill
- **Collection Report**: Area-wise / reseller-wise collection

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, Prisma, PostgreSQL
- **Frontend**: React, Vite, React Router
- **Auth**: JWT
- **Cron**: node-cron (auto-block, monthly bill generation)

## Setup

### 1. Database
Create PostgreSQL DB and set:

```env
# backend/.env (copy from .env.example)
DATABASE_URL="postgresql://user:password@localhost:5432/isp_db"
JWT_SECRET="your-secret"
PORT=4000
FRONTEND_URL=http://localhost:5173
```

### 2. Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Default admin: **01700000000** / **admin123** (after seed).

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Login with admin and use nav for Admin/Reseller/Customer flows.

### 4. Cron (optional)
```bash
cd backend
npm run cron
```
Runs auto-block (daily) and monthly bill generation.

### 5. MikroTik
Set in `.env`:
- MIKROTIK_HOST, MIKROTIK_USER, MIKROTIK_PASSWORD
- MIKROTIK_PPPOE_PROFILE, MIKROTIK_PPPOE_POOL

### 6. SMS
Set SMS_API_URL, SMS_API_KEY, SMS_SENDER_ID for your BD gateway (e.g. SSL Wireless).

## API Overview

| Area        | Base Path     | Auth        |
|------------|---------------|-------------|
| Auth       | /api/auth     | Public/Token |
| Packages   | /api/packages | GET public  |
| Admin      | /api/admin    | Admin       |
| Reseller   | /api/reseller | Reseller   |
| Customer   | /api/customer | Customer   |
| MikroTik   | /api/mikrotik | Admin       |
| Reports    | /api/reports  | Admin/Reseller |
| Inventory  | /api/inventory| Admin       |
| Tickets    | /api/tickets  | Customer/Admin |
| SMS        | /api/sms      | Admin       |

## License

Private / internal use.
