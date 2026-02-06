# টেস্ট চালানো (Testing)

## Backend

```bash
cd backend
npm install
npm run test
```

**টেস্টগুলো:**
- `GET /api/health` – 200 ও `ok`, `ts` রিটার্ন
- `POST /api/auth/login` – খালি/ভুল বডিতে 400/401
- `GET /api/admin/dashboard` – টোকেন ছাড়া 401
- `GET /api/packages` – পাবলিক, 200 ও অ্যারে

**নোট:** `node-routeros` npm-এ শুধু 1.6.9 আছে। `package.json` এ 1.6.9 সেট করা; আগে 3.2.0 থাকলে কোনো ফork/রেজিস্ট্রি চেক করুন।

---

## Frontend

```bash
cd frontend
npm install
npm run test
```

**টেস্টগুলো:**
- `App` – রেন্ডার ক্র্যাশ না হওয়া
- `api/client` – `api` ফাংশন এক্সপোর্ট

**Watch মোড:** `npm run test:watch`
