# অ্যাপে আর কী কী করতে হবে (Checklist)

## একবার সেটআপ (প্রথমবার)

| # | কী করবে | কোথায় / কীভাবে |
|---|---------|-------------------|
| 1 | Backend চালু | `cd backend` → `npm install` → `npx prisma generate` → `npx prisma migrate dev` → `npx prisma db seed` → `npm run dev` |
| 2 | Frontend চালু | নতুন টার্মিনাল: `cd frontend` → `npm install` → `npm run dev` |
| 3 | Admin লগইন | ব্রাউজার: http://localhost:5173 → Phone `01700000000`, Password `admin123` |
| 4 | Upstream সেট | **Upstream (Summit)** পেজ → Edit Upstream → Provider: Summit Communications, Capacity (Mbps) লিখে সেভ |
| 5 | Packages যোগ | **Packages** → Add Package → Name, Speed, Price, Validity Days |
| 6 | MikroTik কনফিগ (যদি রাউটার থাকে) | Backend `.env` এ: MIKROTIK_HOST, MIKROTIK_USER, MIKROTIK_PASSWORD, MIKROTIK_PPPOE_PROFILE, MIKROTIK_PPPOE_POOL |

---

## নিয়মিত / যখন দরকার

| # | কী করবে | কোথায় |
|---|---------|---------|
| 7 | রিসেলার যোগ | **Resellers** → Add Reseller |
| 8 | রিসেলার রিচার্জ | **Resellers** → প্রতিটি রিসেলারের পাশে Recharge |
| 9 | কাস্টমার যোগ | রিসেলার হিসেবে লগইন → **Customers** → Add Customer |
| 10 | বিল কালেক্ট | **Bills** → পেন্ডিং বিলে Collect |
| 11 | কাস্টমার ব্লক/আনব্লক | **Customers** → Block / Unblock বাটন |
| 12 | MikroTik সিঙ্ক | **MikroTik** → Test Connection → Sync All (রাউটার চালু থাকলে) |
| 13 | খরচ লিখা (Summit বিল ইত্যাদি) | **Reports** → Add Expense → Category: UPSTREAM, Amount, Date |
| 14 | BTRC রিপোর্ট এক্সপোর্ট | **BTRC Report** → Month/Year সিলেক্ট → Export CSV |
| 15 | SMS (যদি গেটওয়ে কনফিগ থাকে) | **SMS** → Send SMS / SMS Logs |
| 16 | ইনভেন্টরি | **Inventory** → Add Item / Edit / Delete |

---

## প্রোডাকশনে যাওয়ার আগে (যদি চালু করেন)

| # | কী করবে |
|---|---------|
| 17 | `.env` ঠিক করা: JWT_SECRET শক্ত রাখা, DATABASE_URL প্রোডাকশন DB, FRONTEND_URL আসল ডোমেইন |
| 18 | HTTPS (Nginx/Caddy দিয়ে API + ফ্রন্টএন্ড সার্ভ করা) |
| 19 | ক্রন জব: অটো-ব্লক ও মাসিক বিল জেনারেশন (`npm run cron` বা সিস্টেম ক্রন) |
| 20 | পেমেন্ট গেটওয়ে (bKash/Nagad/Rocket) – এখন স্টাব আছে, আসল API লাগলে যোগ করতে হবে |
| 21 | SMS গেটওয়ে – `.env` এ SMS_API_URL, SMS_API_KEY, SMS_SENDER_ID |

---

## সংক্ষেপ

- **প্রথমবার:** Backend + Frontend চালু → লগইন → Upstream + Packages সেট → (যদি থাকে) MikroTik কনফিগ।
- **নিয়মিত:** রিসেলার/কাস্টমার যোগ, বিল কালেক্ট, ব্লক/আনব্লক, Reports এ খরচ, BTRC এক্সপোর্ট, MikroTik সিঙ্ক।
- **প্রোডাকশন:** .env, HTTPS, ক্রন, পেমেন্ট/SMS গেটওয়ে (প্রয়োজন হলে)।

বিস্তারিত: `RUN_NOW.md`, `DEPLOYMENT.md`, `UPSTREAM.md`।
