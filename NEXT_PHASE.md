# পরবর্তী ধাপ (Next Phase) – কী কী করতে হবে

## Phase 2A: অ্যাপ চালু ও ব্যবহারযোগ্য করা (প্রথমে)

1. **Backend চালু ও DB**
   - `cd backend` → `npm install`
   - `.env` তে `DATABASE_URL="file:./dev.db"` (SQLite) বা PostgreSQL URL
   - `npx prisma generate` → `npx prisma migrate dev` → `npx prisma db seed`
   - `npm run dev` (port 4000)

2. **Admin – রিসেলার যোগ ফর্ম**
   - Resellers পেজে "Add Reseller" বাটন
   - ফর্ম: Name, Phone, Password, Balance Limit, Commission %, Area, Company Name
   - সাবমিটে `POST /api/admin/resellers`

3. **Admin – রিসেলার রিচার্জ**
   - Resellers টেবিলে প্রতি row এ "Recharge" বাটন
   - মডাল/পপআপ: Amount, Notes → `POST /api/admin/resellers/:id/recharge`

4. **Reseller – কাস্টমার যোগ ফর্ম**
   - Customers পেজে "Add Customer"
   - ফর্ম: Phone, Password, Name, Package (dropdown), Connection Type (PPPoE/Static), Username/Static IP, Address
   - সাবমিটে `POST /api/reseller/customers`

5. **Reseller – বিল কালেক্ট**
   - Bills পেজে পেন্ডিং বিলে "Collect" বাটন
   - মডাল: Amount, Method (Cash/bKash/Nagad/Rocket), Trx ID (optional)
   - সাবমিটে `POST /api/reseller/bills/:billId/collect`

---

## Phase 2B: নিরাপত্তা ও আরও ফর্ম

6. **Role-based route guard**
   - Customer শুধু customer রাউট দেখবে (bills, pay, usage, support)
   - Admin শুধু admin রাউট; Reseller শুধু reseller রাউট
   - ভুল URL এ redirect বা 403

7. **Admin – Package Add/Edit**
   - Packages পেজে Add Package + টেবিলে Edit
   - ফর্ম: Name, Speed (Mbps), Price, Validity Days

8. **Admin – Inventory Add/Edit**
   - Inventory পেজে Add Item + Edit/Delete

9. **Reports – Add Expense**
   - Reports পেজে "Add Expense" (Category, Amount, Description, Date)

10. **Reseller – কাস্টমার Block/Unblock**
    - Customers টেবিলে স্ট্যাটাস বদলের বাটন (ACTIVE/BLOCKED)

---

## Phase 2C: এক্সটার্নাল ও প্রোডাকশন

11. Payment gateway (bKash/Nagad/Rocket) – পেমেন্ট ভেরিফাই API
12. SMS gateway – বিল/পেমেন্ট/অটো-ব্লক এ SMS
13. MikroTik রিয়েল রাউটারে টেস্ট ও ঠিক করা
14. BTRC Report CSV/Excel এক্সপোর্ট
15. OLT/ONU Monitoring (প্রয়োজন হলে)
16. Docker / ডিপ্লয়মেন্ট গাইড

---

**পরবর্তী ধাপে প্রথমে করো:** 2A (Backend চালু + রিসেলার যোগ + রিচার্জ + কাস্টমার যোগ + বিল কালেক্ট)। এরপর 2B, তারপর 2C।
