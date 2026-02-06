# পরের স্টেপে কি করা লাগবে (Phase 2B)

Phase 2A (Backend চালু + Add Reseller + Recharge + Add Customer + Collect Bill) হয়ে গেলে **পরের স্টেপ** হলো **Phase 2B**।

---

## Phase 2B – করণীয় (অগ্রাধিকার অনুযায়ী)

### ১. Role-based route guard
- Customer যেন Admin/Reseller রাউটে ঢুকতে না পারে (যেমন `/resellers`, `/packages`, `/customers`)।
- Admin যেন শুধু Admin রাউট দেখে; Reseller শুধু Reseller রাউট।
- ভুল URL এ redirect (যেমন `/`) অথবা 403 পেজ।

### ২. Admin – Package Add/Edit
- Packages পেজে **Add Package** বাটন + ফর্ম (Name, Speed Mbps, Price, Validity Days)।
- টেবিলে প্রতি প্যাকেজের পাশে **Edit** বাটন (একই ফর্ম দিয়ে আপডেট)।
- Backend API আছে: `POST /api/packages`, `PATCH /api/packages/:id`।

### ৩. Admin – Inventory Add/Edit
- Inventory পেজে **Add Item** বাটন + ফর্ম (Type, Name, Quantity, Unit, Min Stock, Location)।
- টেবিলে **Edit** / **Delete** বাটন।
- Backend API আছে: `POST /api/inventory`, `PATCH /api/inventory/:id`, `DELETE /api/inventory/:id`।

### ৪. Reports – Add Expense
- Reports পেজে **Add Expense** বাটন + ফর্ম (Category, Amount, Description, Date)।
- Backend API আছে: `POST /api/reports/expenses`।

### ৫. Reseller – কাস্টমার Block/Unblock
- Customers টেবিলে প্রতি কাস্টমারের পাশে **Block** / **Unblock** বাটন (স্ট্যাটাস ACTIVE ↔ BLOCKED)।
- Backend API আছে: `PATCH /api/reseller/customers/:id/status` (body: `{ status: "ACTIVE" }` বা `"BLOCKED"`)。

---

## সংক্ষেপ

**পরের স্টেপ = Phase 2B:**  
১) Role guard  
২) Package Add/Edit  
৩) Inventory Add/Edit  
৪) Add Expense  
৫) Customer Block/Unblock  

এরপর Phase 2C (Payment/SMS gateway, MikroTik টেস্ট, BTRC এক্সপোর্ট, ডিপ্লয় ইত্যাদি)।
