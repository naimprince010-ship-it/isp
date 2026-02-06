# Phase 2A – কী কী লাগবে (Checklist)

## ১. Backend চালু ও DB

| কী লাগবে | কোথায় / কী করবে |
|----------|-------------------|
| Node.js | সিস্টেমে installed থাকতে হবে |
| `backend` ফোল্ডারে যাওয়া | `cd backend` |
| Dependencies | `npm install` |
| Database URL | `.env` ফাইলে `DATABASE_URL="file:./dev.db"` (SQLite) অথবা PostgreSQL URL |
| Prisma client | `npx prisma generate` |
| Tables তৈরি | `npx prisma migrate dev --name init` |
| Seed (admin + packages) | `npx prisma db seed` |
| Backend চালু | `npm run dev` (port 4000) |

**ফল:** API `http://localhost:4000` এ চালু, Admin login: 01700000000 / admin123

---

## ২. Admin – রিসেলার যোগ

| কী লাগবে | কোথায় |
|----------|--------|
| "Add Reseller" বাটন | Resellers পেজে (হেডার/টেবিলের ওপরে) |
| ফর্ম ফিল্ড | Name, Phone, Password, Balance Limit, Commission %, Area, Company Name (optional) |
| API | `POST /api/admin/resellers` (আগে থেকেই আছে) |
| সাবমিটের পর | লিস্ট রিফ্রেশ / নতুন row টেবিলে দেখাবে |

---

## ৩. Admin – রিসেলার রিচার্জ

| কী লাগবে | কোথায় |
|----------|--------|
| "Recharge" বাটন | Resellers টেবিলে প্রতি row এ (অথবা Actions কলামে) |
| মডাল/পপআপ | Amount (number), Notes (optional) |
| API | `POST /api/admin/resellers/:id/recharge` (আগে থেকেই আছে) |
| সাবমিটের পর | মডাল বন্ধ, লিস্ট রিফ্রেশ (balance আপডেট দেখাবে) |

---

## ৪. Reseller – কাস্টমার যোগ

| কী লাগবে | কোথায় |
|----------|--------|
| "Add Customer" বাটন | Customers পেজে |
| ফর্ম ফিল্ড | Phone, Password, Name, Package (dropdown – packages API থেকে), Connection Type (PPPoE/Static), Username (PPPoE) বা Static IP, Address, Zone/Area (optional) |
| API | `POST /api/reseller/customers` (আগে থেকেই আছে) |
| Package list | `GET /api/packages` (পাবলিক) দিয়ে dropdown ভরবে |

---

## ৫. Reseller – বিল কালেক্ট

| কী লাগবে | কোথায় |
|----------|--------|
| "Collect" বাটন | Bills টেবিলে শুধু যেসব বিলের status = PENDING |
| মডাল/পপআপ | Amount (default = বিলের amount), Method (Cash/bKash/Nagad/Rocket), Trx ID (optional, method = bKash/Nagad/Rocket হলে) |
| API | `POST /api/reseller/bills/:billId/collect` (আগে থেকেই আছে) |
| সাবমিটের পর | মডাল বন্ধ, বিল লিস্ট রিফ্রেশ (status PAID দেখাবে) |

---

## সংক্ষেপ

- **Backend + DB:** Node, npm install, .env, prisma generate, migrate, seed, npm run dev  
- **UI যা যোগ করতে হবে:**  
  - Resellers: Add Reseller ফর্ম + Recharge বাটন/মডাল  
  - Customers: Add Customer ফর্ম  
  - Bills: Collect বাটন + মডাল  

API সব আছে; শুধু উপরের UI গুলো ফ্রন্টএন্ডে যোগ করলেই 2A সম্পন্ন।
