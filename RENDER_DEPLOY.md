# Render এ ISP প্রজেক্ট ডিপ্লয়

Render এ তিনটা জিনিস লাগবে: **PostgreSQL**, **Backend (Web Service)**, **Frontend (Static Site)**।  
প্রজেক্ট **GitHub এ আপলোড** থাকতে হবে; তারপর Render রিপো কানেক্ট করে ডিপ্লয় করবে।

---

## পদ্ধতি ১: Blueprint দিয়ে (render.yaml)

প্রজেক্টে `render.yaml` আছে। একবার সেট দিয়ে সব সেবা তৈরি করতে পারবেন।

1. [dashboard.render.com](https://dashboard.render.com) এ লগইন করুন।
2. **New +** → **Blueprint** সিলেক্ট করুন।
3. এই রিপো কানেক্ট করুন (GitHub repo যেখানে isp প্রজেক্ট পুশ করা আছে)।
4. Render `render.yaml` পড়ে **isp-db**, **isp-backend**, **isp-frontend** তৈরি করবে।
5. **FRONTEND_URL** ও **VITE_API_URL** এর মান ড্যাশবোর্ডে লিখতে বলবে:
   - প্রথমে শুধু Backend ডিপ্লয় হতে দিন।
   - Backend এর **URL** কপি করুন (যেমন `https://isp-backend-xxxx.onrender.com`)।
   - **isp-frontend** সেবার **Environment** এ যান → **VITE_API_URL** = Backend URL (বিনা `/api`, যেমন `https://isp-backend-xxxx.onrender.com`) সেভ করুন।
   - **isp-backend** সেবার **Environment** এ যান → **FRONTEND_URL** = Frontend এর URL (যেমন `https://isp-frontend-xxxx.onrender.com`) সেভ করুন।
6. দুটো সেবাই **Manual Deploy** করুন (অথবা আবার পুশ করলে অটো ডিপ্লয় হবে)।

---

## পদ্ধতি ২: হাতে হাতে সেটআপ (Blueprint ছাড়া)

### ১. প্রজেক্ট ও ডাটাবেস

1. [dashboard.render.com](https://dashboard.render.com) → **New +** → **PostgreSQL**।
2. নাম দিন (যেমন `isp-db`), **Plan: Free** রাখুন, **Create Database**।
3. ডাটাবেস তৈরি হলে **Info** বা **Connect** থেকে **Internal Database URL** কপি করুন (এটাই `DATABASE_URL`)।

### ২. Backend (Web Service)

1. **New +** → **Web Service**।
2. এই রিপো কানেক্ট করুন।
3. সেটিংস:
   - **Name:** `isp-backend`
   - **Region:** যেকোনো (যেমন Oregon)
   - **Branch:** `main` (অথবা আপনার ডিফল্ট ব্রাঞ্চ)
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Start Command:** `npm run start:prod`
   - **Plan:** Free (চাইলে পরে বদলাতে পারবেন)

4. **Environment Variables** এ যোগ করুন:

   | Key | Value |
   |-----|--------|
   | `DATABASE_URL` | উপরের PostgreSQL এর Internal Database URL (পেস্ট করুন) |
   | `JWT_SECRET` | যেকোনো শক্ত র্যান্ডম স্ট্রিং |
   | `NODE_ENV` | `production` |
   | `FRONTEND_URL` | এখন খালি রাখুন; Frontend ডিপ্লয়ের পর ওই সাইটের URL দেবেন |

5. **Create Web Service** ক্লিক করুন। ডিপ্লয় শেষ হলে **Backend URL** নোট করুন (যেমন `https://isp-backend-xxxx.onrender.com`)।

### ৩. Frontend (Static Site)

1. **New +** → **Static Site**।
2. একই রিপো আবার কানেক্ট করুন।
3. সেটিংস:
   - **Name:** `isp-frontend`
   - **Branch:** `main`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`

4. **Environment** এ একটা ভেরিয়েবল দিন:
   - **Key:** `VITE_API_URL`
   - **Value:** Backend এর URL **বিনা** `/api` (যেমন `https://isp-backend-xxxx.onrender.com`)

5. **Create Static Site** ক্লিক করুন। ডিপ্লয় শেষ হলে **Frontend URL** নোট করুন।

### ৪. CORS ও রি-ডিপ্লয়

1. **Backend** সেবায় যান → **Environment** → **FRONTEND_URL** আপডেট করুন: Frontend এর পুরো URL (যেমন `https://isp-frontend-xxxx.onrender.com`)।
2. **Save** করুন; প্রয়োজন হলে **Manual Deploy** চালান।

এখন Frontend URL খুলে অ্যাপ ব্যবহার করা যাবে।

---

## চেকলিস্ট

- [ ] প্রজেক্ট GitHub এ পুশ করা আছে।
- [ ] PostgreSQL তৈরি এবং Backend এর `DATABASE_URL` সঠিক।
- [ ] Backend এ `JWT_SECRET`, `FRONTEND_URL` সেট।
- [ ] Frontend এ `VITE_API_URL` = Backend URL (বিনা `/api`)।
- [ ] Backend এর **Health Check Path** (যদি সেট করেন) = `/api/health`।

---

## Render Free Tier নোট

- **Web Service (Backend):** ফ্রি প্ল্যানে প্রায় ১৫ মিনিট কোনো ট্র্যাফিক না থাকলে স্লিপ মোডে চলে যায়; প্রথম রিকোয়েস্টে আবার জেগে উঠতে একটু সময় লাগতে পারে।
- **PostgreSQL:** ফ্রি প্ল্যানে সীমিত দিন/সাইজ; বিস্তারিত Render এর পৃষ্ঠা দেখুন।
- **Static Site:** ফ্রি টায়ারে ঠিকভাবে কাজ করে।

---

## সমস্যা হলে

- **Backend ডিপ্লয় ফেইল:** লগে দেখুন `prisma db push` বা `node dist/index.js` কোনটা ফেইল করছে। `DATABASE_URL` ঠিক আছে কিনা চেক করুন।
- **লগইনে "Internal server error":** Backend সেবার **Logs** খুলে দেখুন — ঠিক কোন এরর/স্ট্যাক ট্রেস আসছে। সাধারণ কারণ: (১) ডাটাবেসে অ্যাডমিন ইউজার নেই — ডিপ্লয়ের পর `prisma db push` ও `db:seed` চালু থাকলে অটো সিড হয়; (২) `DATABASE_URL` ভুল বা DB কানেক্ট হচ্ছে না।
- **Frontend থেকে API কল করলে এরর:** `VITE_API_URL` ঠিক আছে কিনা দেখুন (Backend URL, বিনা `/api`)। বিল্ডের সময় এই মান এমবেড হয় তাই পরিবর্তন করলে আবার ডিপ্লয় করতে হবে।
- **CORS এরর:** Backend এর `FRONTEND_URL` এ Frontend এর আসল URL (হোস্ট সহ) দিন।
