# ক্রন সেটআপ (অটো-ব্লক ও মাসিক বিল জেনারেশন)

Backend এর `npm run cron` একবার চালালে শুধু একবার রান হয়। নিয়মিত চালাতে নিচের যেকোনো একটা সেটআপ করুন।

---

## Windows – Task Scheduler

1. **Task Scheduler** খুলুন (Win + R → `taskschd.msc`)।
2. **Create Basic Task** → Name: `ISP Cron` → Trigger: **Daily** (বা Weekly) → Time সেট করুন (যেমন রাত ২টা)।
3. Action: **Start a program** → Program: `cmd` → Arguments: `/c cd /d C:\path\to\isp\backend && npm run cron`  
   (আপনার প্রকল্প পাথ দিয়ে `C:\path\to\isp` বদল করুন।)
4. **Finish** → Properties থেকে "Run whether user is logged on or not" ও "Run with highest privileges" চেক করতে পারেন।

**নোট:** `npm run cron` চালানোর জন্য সেই ফোল্ডারে Node ও npm পাথ থাকতে হবে। পুরো পাথ দিলে ভালো:  
`C:\Program Files\nodejs\npm.cmd run cron` এবং Start in: `C:\path\to\isp\backend`।

---

## Linux – crontab

1. টার্মিনালে লিখুন: `crontab -e`
2. নিচের লাইন যোগ করুন (প্রতিদিন রাত ২টায় চালাবে):

```cron
0 2 * * * cd /home/user/isp/backend && /usr/bin/npm run cron >> /var/log/isp-cron.log 2>&1
```

- `0 2 * * *` = প্রতিদিন 02:00
- মাসিক বিল শুধু মাসের ১ তারিখে চালাতে: `0 0 1 * *` (প্রতি মাসের ১ তারিখ রাত ১২টা)
- অটো-ব্লক প্রতিদিন + বিল মাসে একবার আলাদা করতে চাইলে দুটো লাইন দিন।

3. সেভ করে বের হোন। পাথ (`/home/user/isp`, `/usr/bin/npm`) নিজের সিস্টেম অনুযায়ী বদল করুন।

---

## কী চালায়

- **অটো-ব্লক:** যেসব কাস্টমারের বিল পেন্ডিং ও ডিউ ডেট পার, তাদের MikroTik এ ব্লক + স্ট্যাটাস BLOCKED + (যদি SMS কনফিগ থাকে) SMS।
- **মাসিক বিল:** প্রতি মাসের ১ তারিখে অ্যাক্টিভ/পেন্ডিং কাস্টমারদের নতুন বিল তৈরি + (যদি SMS থাকে) নোটিফিকেশন।

`.env` এ `AUTO_BLOCK_DAYS=7` (ডিফল্ট) – বিল ডিউ এর কত দিন পর অটো-ব্লক হবে সেটা বদলানো যায়।
