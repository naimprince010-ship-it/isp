# Railway এ ISP প্রজেক্ট ডিপ্লয়

Railway এ তিনটা জিনিস ডিপ্লয় করবেন: **PostgreSQL**, **Backend**, **Frontend**।

---

## ১. Railway অ্যাকাউন্ট ও প্রজেক্ট

1. [railway.app](https://railway.app) এ গিয়ে GitHub দিয়ে লগইন করুন।
2. **New Project** ক্লিক করুন।
3. **Deploy from GitHub repo** বেছে নিন এবং এই `isp` রিপো কানেক্ট করুন।

---

## ২. PostgreSQL যোগ করা

1. প্রজেক্টে **+ New** ক্লিক করুন → **Database** → **PostgreSQL**।
2. একবার তৈরি হলে PostgreSQL সার্ভিসে ক্লিক করুন → **Variables** ট্যাবে যান।
3. সেখানে **`DATABASE_URL`** দেখতে পাবেন (অথবা **Connect** থেকে কপি করুন)। এই মান পরে Backend এ লাগবে।

---

## ৩. Backend ডিপ্লয়

1. **+ New** → **GitHub Repo** থেকে আবার সেই রিপো সিলেক্ট করুন (অথবা একই রিপো থেকে নতুন সার্ভিস যোগ করুন)।
2. যে সার্ভিসটা Backend হবে সেটাতে ক্লিক করুন।
3. **Settings** এ যান:
   - **Root Directory:** `backend` লিখুন।
   - **Build Command:** খালি রাখলেই হবে (ডিফল্ট `npm install`); Prisma generate বিল্ডের মধ্যে থাকে।
   - **Start Command:** `npm run start:prod` লিখুন।
   - **Watch Paths:** `backend/**` (ঐচ্ছিক, শুধু backend ফাইল পরিবর্তনেই রি-ডিপ্লয়)।
4. **Variables** এ যান → **Add Variable** / **RAW Editor** দিয়ে নিচের ভেরিয়েবলগুলো দিন:

   | Name | Value |
   |------|--------|
   | `DATABASE_URL` | PostgreSQL সার্ভিসের **Variables** থেকে `DATABASE_URL` কপি করে এখানে পেস্ট করুন (Reference দিলেও হয়) |
   | `JWT_SECRET` | যেকোনো শক্ত র্যান্ডম স্ট্রিং (উদাহরণ: `my-super-secret-key-change-this`) |
   | `JWT_EXPIRES_IN` | `7d` |
   | `PORT` | `4000` |
   | `FRONTEND_URL` | পরের ধাপে Frontend এর URL (যেমন `https://your-frontend.up.railway.app`) |

5. **Deploy** ট্যাবে গিয়ে ডিপ্লয় শেষ হওয়া পর্যন্ত অপেক্ষা করুন।
6. **Settings** → **Networking** → **Generate Domain** ক্লিক করে Backend এর পাবলিক URL নিন (যেমন `https://isp-backend-production-xxxx.up.railway.app`)। এই URL টা Frontend এর জন্য লাগবে।

---

## ৪. Frontend ডিপ্লয়

1. আবার **+ New** → **GitHub Repo** থেকে একই রিপো সিলেক্ট করুন।
2. নতুন সার্ভিসটা Frontend এর জন্য। এটাতে ক্লিক করুন।
3. **Settings** এ:
   - **Root Directory:** `frontend` লিখুন।
   - **Build Command:** `npm install && npm run build`
   - **Output Directory:** `dist` (Static Site হলে এইটা দিলে Railway dist ফোল্ডার সার্ভ করবে)।
   - **Start Command:** খালি রাখুন যদি Static Website হিসেবে সেট করেন; অথবা Static Site টাইপ বেছে নিলে Start লাগে না।
4. **Variables** এ দিন:

   | Name | Value |
   |------|--------|
   | `VITE_API_URL` | Backend এর URL **বিনা `/api`** (যেমন `https://isp-backend-production-xxxx.up.railway.app`) |

5. ডিপ্লয় করুন।
6. **Settings** → **Networking** → **Generate Domain** করে Frontend এর URL নিন।

---

## ৫. শেষ সেটিংস

1. **Backend** এ ফিরে যান → **Variables** → `FRONTEND_URL` আপডেট করুন: Frontend এর আসল URL (যেমন `https://isp-frontend-production-xxxx.up.railway.app`)। সেভ করলে CORS ঠিক থাকবে।
2. প্রয়োজনে **Redeploy** করুন (Backend/Frontend যেটাতে পরিবর্তন দিয়েছেন)।

---

## ৬. চেকলিস্ট

- [ ] PostgreSQL চালু আছে এবং Backend এর `DATABASE_URL` সঠিক।
- [ ] Backend এ `JWT_SECRET`, `PORT`, `FRONTEND_URL` সেট।
- [ ] Frontend এ `VITE_API_URL` = Backend URL (বিনা `/api`)।
- [ ] দুটো সার্ভিসেরই পাবলিক ডোমেইন জেনারেট করা হয়েছে।
- [ ] ব্রাউজারে Frontend URL খুলে লগইন/API টেস্ট করুন।

---

## লোকাল ডেভ (PostgreSQL)

Schema এখন PostgreSQL ব্যবহার করে। লোকালে চালাতে:

**Docker দিয়ে Postgres:**
```bash
docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine
```

**Backend `.env`:**
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public"
```

তারপর `npx prisma db push` এবং `npm run dev`।

---

## সমস্যা হলে

- **Backend ডিপ্লয় ফেইল:** লগে দেখুন `prisma db push` বা `node dist/index.js` কোনটা ফেইল করছে। `DATABASE_URL` ঠিক আছে কিনা চেক করুন。
- **Frontend API কলে এরর:** `VITE_API_URL` ঠিক আছে কিনা দেখুন (Backend URL, বিনা `/api`)। Backend এর `FRONTEND_URL` যেন Frontend ডোমেইনের সাথে মিলে।
- **CORS এরর:** Backend এর `FRONTEND_URL` এ Frontend এর আসল URL (হোস্ট সহ) দিন।
