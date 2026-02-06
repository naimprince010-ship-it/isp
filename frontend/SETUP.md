# Frontend সেটআপ (ISP)

## ১. লোকাল ডেভেলপমেন্ট

### ধাপ ১: ডিপেন্ডেন্সি ইন্সটল

```bash
cd frontend
npm install
```

### ধাপ ২: Backend API URL (ঐচ্ছিক)

লোকালে Backend আলাদা পোর্টে চালু থাকলে (যেমন `http://localhost:3000`) ফ্রন্টে সেই URL দিতে হবে।

- `frontend` ফোল্ডারে `.env` ফাইল তৈরি করুন (অথবা `.env.example` কপি করে `.env` বানান)।
- নিচের লাইন যোগ/আপডেট করুন:

```env
VITE_API_URL=http://localhost:3000
```

Backend যদি `3000` এ চলে, তাহলে `http://localhost:3000` দিন। অন্য পোর্ট হলে সেই পোর্ট ব্যবহার করুন।  
`.env` না দিলে ফ্রন্ট নিজের অরিজিনে API কল করবে (Vite proxy ব্যবহার করলে সেটা কাজে লাগে)।

### ধাপ ৩: ডেভ সার্ভার চালু

```bash
npm run dev
```

ব্রাউজারে খুলুন: **http://localhost:5173** (অথবা টার্মিনালে যে ঠিকানা দেখাবে)।

### ধাপ ৪: বিল্ড চেক (ঐচ্ছিক)

```bash
npm run build
npm run preview
```

`dist` ফোল্ডার প্রডাকশন বিল্ড; `preview` দিয়ে সেই বিল্ড লোকালে টেস্ট করা যাবে।

---

## ২. Render এ সেটআপ (Production)

Render এ ফ্রন্টএন্ড **Static Site** হিসেবে ডিপ্লয় করতে হয়।

1. [Render Dashboard](https://dashboard.render.com) → **New +** → **Static Site**
2. এই রিপো কানেক্ট করুন
3. সেটিংস:
   - **Name:** `isp-frontend` (যেকোনো নাম)
   - **Branch:** `main`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. **Environment** এ একটা ভেরিয়েবল দিন:
   - **Key:** `VITE_API_URL`
   - **Value:** Backend এর URL **বিনা** `/api` (যেমন `https://isp-backend-xxxx.onrender.com`)
5. **Create Static Site** ক্লিক করুন।

ডিপ্লয় শেষে Frontend URL নোট করুন এবং Backend এর **Environment** এ **FRONTEND_URL** = এই Frontend URL সেট করুন (CORS এর জন্য)।

বিস্তারিত: প্রজেক্ট রুটের **RENDER_DEPLOY.md** দেখুন।

---

## সংক্ষেপ

| কোথায়       | কাজ |
|-------------|-----|
| **লোকাল**   | `cd frontend` → `npm install` → (`.env` এ `VITE_API_URL` দিলে ভালো) → `npm run dev` |
| **Render**  | Static Site, Root: `frontend`, Build: `npm install && npm run build`, Publish: `dist`, Env: `VITE_API_URL` = Backend URL |
