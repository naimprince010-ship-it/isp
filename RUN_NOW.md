# এখন কি করা লাগবে (Run the app)

## ধাপ ১: Backend চালু করা

টার্মিনাল খুলে নিচের কমান্ডগুলো **একটার পর একটা** চালাও:

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

- শেষ কমান্ড (`npm run dev`) চালু থাকলে Backend **http://localhost:4000** এ চলবে।
- এই টার্মিনাল **বন্ধ করো না**; চালু রাখো।

**মনে রাখো:** `.env` এ `DATABASE_URL="file:./dev.db"` থাকলে SQLite ব্যবহার হবে (PostgreSQL লাগবে না)।

---

## ধাপ ২: Frontend চালু করা

**আরেকটা নতুন টার্মিনাল** খুলে নিচের কমান্ডগুলো চালাও:

```bash
cd frontend
npm install
npm run dev
```

- Frontend **http://localhost:5173** এ খুলবে।
- ব্রাউজারে গিয়ে `http://localhost:5173` ওপেন করো।

---

## ধাপ ৩: লগইন ও টেস্ট

1. **Login:** Phone `01700000000`, Password `admin123` (seed থেকে)
2. **Admin Dashboard** এ DB / MikroTik / SMS স্ট্যাটাস দেখবে – যা "Not set" থাকলে `.env` সেট করো
3. **প্রথমবার সেটআপ:** Upstream (Summit) → Edit Upstream → Capacity (Mbps) সেভ; Packages → Add Package
4. **Admin:** Resellers → Add Reseller / Recharge টেস্ট করো
5. **Reseller হিসেবে টেস্ট করতে:** Admin থেকে একটা Reseller যোগ করো, তারপর Logout করে সেই রিসেলারের ফোন/পাসওয়ার্ড দিয়ে লগইন করো
6. **Reseller:** Customers → Add Customer, Bills → Collect টেস্ট করো

---

## যদি কোনো ধাপে সমস্যা হয়

| সমস্যা | কী করবে |
|--------|----------|
| `prisma migrate` error | `.env` এ `DATABASE_URL` ঠিক আছে কি দেখো। SQLite এর জন্য `file:./dev.db` |
| `prisma db seed` error | `backend/prisma/seed.ts` আছে কি দেখো। না থাকলে আগের চ্যাটে দেওয়া seed আবার যোগ করতে হবে |
| Backend চালু হচ্ছে না | `backend` ফোল্ডারে `node_modules` আছে কি দেখো। নেইলে আবার `npm install` |
| Frontend এ API error | Backend (port 4000) চালু আছে কি দেখো। Vite proxy দিয়ে `/api` backend এ যাবে |

---

**সংক্ষেপ:**  
১) Backend: `cd backend` → `npm install` → `prisma generate` → `migrate` → `seed` → `npm run dev`  
২) Frontend: নতুন টার্মিনালে `cd frontend` → `npm install` → `npm run dev`  
৩) ব্রাউজারে `http://localhost:5173` → লগইন `01700000000` / `admin123` → Upstream + Packages সেট → অ্যাপ ব্যবহার করো।

**পুরো চেকলিস্ট:** `APP_CHECKLIST.md` দেখুন।
