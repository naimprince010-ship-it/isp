# টেকনিক্যালি কী কী লাগবে (Technical Checklist)

## ১. হার্ডওয়্যার / নেটওয়ার্ক

| জিনিস | বর্ণনা |
|--------|--------|
| সার্ভার / পিসি | Backend + DB চালানোর জন্য (Windows/Linux/Mac)। লোকাল বা VPS। |
| Summit লাইন | আপস্ট্রিম কেবল (ফাইবার) Summit থেকে আপনার রাউটার/সার্ভার পর্যন্ত কানেক্ট। |
| MikroTik রাউটার | PPPoE সাপোর্ট; কাস্টমারদের স্পিড লিমিট ও ব্লক/আনব্লক এর জন্য। Summit লাইন এখানে কানেক্ট। |
| নেটওয়ার্ক | Backend যেই মেশিনে চলবে সেটা MikroTik এর নেটওয়ার্কে থাকতে হবে (রাউটার API একসেসের জন্য)। |

---

## ২. সফটওয়্যার (যা ইতিমধ্যে অ্যাপে আছে)

| জিনিস | ভার্সন / নোট |
|--------|----------------|
| Node.js | 18+ (Backend + Frontend বিল্ড)। |
| npm | Backend ও Frontend এর জন্য। |
| Database | **SQLite** (ডিফল্ট – `file:./dev.db`) অথবা **PostgreSQL** (প্রোডাকশনে ভালো)। |
| Prisma | DB মাইগ্রেশন ও সিড – অ্যাপের সাথে আছে। |

---

## ৩. কনফিগ (.env – Backend)

| ভেরিয়েবল | বাধ্যতামূলক? | বর্ণনা |
|------------|--------------|--------|
| DATABASE_URL | হ্যাঁ | SQLite: `file:./dev.db` বা PostgreSQL URL। |
| JWT_SECRET | হ্যাঁ | শক্ত ও র্যান্ডম স্ট্রিং (প্রোডাকশনে অবশ্যই বদলাবেন)। |
| JWT_EXPIRES_IN | না | ডিফল্ট `7d`। |
| PORT | না | ডিফল্ট `4000`। |
| FRONTEND_URL | প্রোডে হ্যাঁ | CORS – ফ্রন্টএন্ডের আসল URL (যেমন `https://app.yourapp.com`)। |
| MIKROTIK_HOST | MikroTik চালাতে | রাউটার IP (যেমন `192.168.88.1`)। |
| MIKROTIK_USER | MikroTik চালাতে | রাউটার অ্যাডমিন ইউজার। |
| MIKROTIK_PASSWORD | MikroTik চালাতে | রাউটার পাসওয়ার্ড। |
| MIKROTIK_PPPOE_PROFILE | MikroTik চালাতে | রাউটারে যে PPPoE প্রোফাইল ব্যবহার করবেন। |
| MIKROTIK_PPPOE_POOL | MikroTik চালাতে | রাউটারে IP পুল (যেমন `pppoe-pool`)। |
| SMS_API_URL | SMS চালাতে | গেটওয়ে API URL। |
| SMS_API_KEY | SMS চালাতে | গেটওয়ে API কী। |
| SMS_SENDER_ID | না | সেন্ডার আইডি। |
| BKASH_APP_KEY, BKASH_APP_SECRET | পেমেন্ট ভেরিফাই | bKash স্যান্ডবক্স/লাইভ। |
| NAGAD_MERCHANT_ID, ROCKET_API_KEY | পেমেন্ট ভেরিফাই | Nagad/Rocket (প্রয়োজন হলে)। |

কপি: `backend/.env.example` → `backend/.env` তারপর মানগুলো পূরণ করুন।

---

## ৪. রানটাইম (চালানোর জন্য)

| ধাপ | কমান্ড / কাজ |
|-----|----------------|
| Backend | `cd backend` → `npm install` → `npx prisma generate` → `npx prisma migrate dev` → `npx prisma db seed` → `npm run dev` |
| Frontend | নতুন টার্মিনাল: `cd frontend` → `npm install` → `npm run dev` |
| ক্রন (অটো-ব্লক / বিল জেনারেশন) | `npm run cron` একবার চালালে শুধু একবার রান হয়। নিয়মিত চালাতে: **Windows Task Scheduler** বা **Linux cron** দিয়ে `cd backend && npm run cron` সিডিউল করুন। অথবা node-cron দিয়ে Backend এর ভেতরেই চালাতে পারেন (এখন আলাদা স্ক্রিপ্ট)। |

---

## ৫. প্রোডাকশনে টেকনিক্যালি কী লাগবে

| জিনিস | বর্ণনা |
|--------|--------|
| ডোমেইন | যেমন `app.yourapp.com` – ফ্রন্টএন্ড ও (প্রয়োজন হলে) API এর জন্য। |
| SSL (HTTPS) | Let's Encrypt বা অন্য সার্টিফিকেট। |
| রিভার্স প্রক্সি | Nginx বা Caddy – এক পোর্টে HTTPS, তারপর Backend (যেমন 4000) ও Frontend (স্ট্যাটিক) ফরওয়ার্ড। **স্যাম্পল:** `deploy/nginx.conf.example`। |
| প্রোডাকশন DB | SQLite ছেড়ে PostgreSQL ব্যবহার করলে ভালো (বেকআপ, কনকারেন্সি)। |
| প্রসেস ম্যানেজার | PM2 বা systemd – Backend ক্র্যাশ হলে অটো রিস্টার্ট। **কনফিগ:** `backend/ecosystem.config.cjs`। |
| বেকআপ | DB এর নিয়মিত বেকআপ (PostgreSQL dump বা SQLite ফাইল কপি)। |
| ফায়ারওয়াল | শুধু 80/443 ওপেন; Backend পোর্ট বাইরের দিকে বন্ধ রাখা। |
| ক্রন | অটো-ব্লক ও বিল জেনারেশন – **CRON_SETUP.md** দেখুন (Windows Task Scheduler / Linux crontab)। |

---

## ৬. অ্যাপের ভেতরে যা ইতিমধ্যে আছে

- JWT লগইন, Role (Admin / Reseller / Customer)
- MikroTik সিঙ্ক, ব্লক/আনব্লক (PPPoE)
- বিল, কালেকশন, রিপোর্ট, BTRC এক্সপোর্ট (CSV)
- আপস্ট্রিম (Summit) ক্যাপাসিটি রেকর্ড
- SMS লগ + সেন্ড (যদি .env এ গেটওয়ে দেওয়া থাকে)
- পেমেন্ট ভেরিফাই স্টাব (bKash/Nagad/Rocket – আসল API লাগলে যোগ করতে হবে)
- ক্রন স্ক্রিপ্ট: অটো-ব্লক, মাসিক বিল জেনারেশন (`backend`: `npm run cron`)

---

## সংক্ষেপ

**লোকাল/টেস্ট:** Node.js + Backend (.env + migrate + seed) + Frontend + (ঐচ্ছিক) MikroTik .env।  
**প্রোডাকশন:** উপরের সব + ডোমেইন, HTTPS, রিভার্স প্রক্সি, প্রোড DB, PM2/systemd, বেকআপ, ক্রন সিডিউল।

বিস্তারিত: `RUN_NOW.md`, `DEPLOYMENT.md`, `APP_CHECKLIST.md`।
