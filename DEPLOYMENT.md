# ডিপ্লয়মেন্ট গাইড (Deployment Guide)

## স্থানীয় চালানো (Local)

### Backend
```bash
cd backend
cp .env.example .env
# .env এ DATABASE_URL, JWT_SECRET ইত্যাদি সেট করুন
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```
Backend চালু হবে: `http://localhost:4000`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend চালু হবে: `http://localhost:5173`

---

## Docker দিয়ে চালানো

### শুধু Backend + PostgreSQL
```bash
# রুট ফোল্ডার থেকে
docker compose up -d

# প্রথমবার মাইগ্রেশন ও সিড চালাতে:
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed
```
- Backend: `http://localhost:4000`
- PostgreSQL: `localhost:5432` (user: isp, pass: isp_secret, db: isp_db)

### Backend প্রোডাকশনে (PM2)
```bash
cd backend
npm run build
pm2 start ecosystem.config.cjs
# pm2 save && pm2 startup  (রিবুটে অটো স্টার্ট)
```

### Frontend প্রোডাকশন বিল্ড
```bash
cd frontend
# API যেখানে চালাচ্ছো সেটা দিয়ে বিল্ড (ডিফল্ট /api same origin)
npm run build
# dist ফোল্ডার যেকোনো স্ট্যাটিক হোস্টে (Nginx, Netlify, Vercel) আপলোড করুন
# Nginx স্যাম্পল: deploy/nginx.conf.example
# অথবা: npx serve -s dist -l 3000
```

---

## পরিবেশ ভেরিয়েবল (.env)

### Backend (backend/.env)
| ভেরিয়েবল | বর্ণনা |
|-----------|--------|
| DATABASE_URL | PostgreSQL বা SQLite URL |
| JWT_SECRET | JWT সাইনিং সিক্রেট |
| JWT_EXPIRES_IN | উদাহরণ: 7d |
| PORT | সার্ভার পোর্ট (ডিফল্ট 4000) |
| FRONTEND_URL | CORS এর জন্য ফ্রন্টএন্ড URL |
| MIKROTIK_HOST, MIKROTIK_USER, MIKROTIK_PASSWORD | MikroTik রাউটার |
| MIKROTIK_PPPOE_PROFILE, MIKROTIK_PPPOE_POOL | PPPoE প্রোফাইল ও পুল |
| SMS_API_URL, SMS_API_KEY, SMS_SENDER_ID | SMS গেটওয়ে |
| BKASH_APP_KEY, BKASH_APP_SECRET | bKash (পেমেন্ট ভেরিফাই) |
| NAGAD_MERCHANT_ID, ROCKET_API_KEY | Nagad/Rocket (প্রয়োজন হলে) |

---

## প্রোডাকশন টিপস

1. **JWT_SECRET** শক্ত ও র্যান্ডম রাখুন।
2. **DATABASE_URL** প্রোডাকশন DB ব্যবহার করুন।
3. **FRONTEND_URL** আসল ডোমেইন সেট করুন (CORS).
4. HTTPS রিভার্স প্রক্সি (Nginx/Caddy) দিয়ে API ও ফ্রন্টএন্ড সার্ভ করুন।
5. ক্রন জব (অটো-ব্লক, বিল জেনারেশন): `npm run cron` একবার চালান; নিয়মিত চালাতে **CRON_SETUP.md** দেখুন (Windows Task Scheduler / Linux crontab)।
