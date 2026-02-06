# Client Management – ৮টি ফিচার ইমপ্লিমেন্টেশন সামারি

## Schema (Prisma)

- **ConnectionStatus**: `PERSONAL`, `FREE`, `LEFT` যোগ করা হয়েছে।
- **Role**: `EMPLOYEE` যোগ করা হয়েছে।
- **CustomerProfile**: `pppoePassword`, `assignedToUserId`, `leftAt`, `leftReason` ফিল্ড; `assignedToUser`, `scheduleRules`, `changeRequests` রিলেশন।
- **ScheduleRule**: ভবিষ্যৎ তারিখে স্ট্যাটাস/প্যাকেজ চেঞ্জের জন্য মডেল।
- **CustomerRequest**: কাস্টমার পোর্টাল থেকে প্যাকেজ/স্ট্যাটাস চেঞ্জ রিকোয়েস্ট; `RequestStatus` (PENDING, APPROVED, REJECTED)।

**নোট:** Prisma 5.22 এ SQLite ব্যবহার করলে enum নিয়ে validation error আসতে পারে। সেই ক্ষেত্রে PostgreSQL ব্যবহার করুন অথবা `prisma db push` / মাইগ্রেশন চালানোর আগে schema validate চেক করুন।

---

## ১. Import PPPoE/Static from MikroTik

- **Backend:** `POST /api/mikrotik/import`
- MikroTik থেকে `/ppp/secret/print` দিয়ে ইউজার নেয়; যাদের ইতিমধ্যে DB-তে নেই তাদের জন্য User + CustomerProfile তৈরি করে।
- ডিফল্ট রিসেলার: "Unassigned" (auto-create); ডিফল্ট প্যাকেজ: প্রথম অ্যাক্টিভ প্যাকেজ।
- **Frontend:** MikroTik পেজে "Import from MikroTik" বাটন।

---

## ২. Export PPPoE/Password/Profile to Excel (CSV)

- **Backend:** `GET /api/admin/customers/export?status=&resellerId=`
- CSV কলাম: Name, Phone, Username, Password, Profile (Package), Speed, Status, Reseller, Address, Left At, Left Reason。
- **Frontend API:** `admin.customersExport(params)` – blob রিটার্ন করে; ডাউনলোড লিংক বানাতে ব্যবহার করুন।

---

## ৩. Personal, Free, Left client list

- স্ট্যাটাস enum এ `PERSONAL`, `FREE`, `LEFT` আছে।
- **Backend:** `GET /api/admin/customers?status=PERSONAL|FREE|LEFT` দিয়ে ফিল্টার।
- রিসেলার কাস্টমার লিস্টে same status ফিল্টার ব্যবহার করা যায় (reseller নিজের কাস্টমার দেখে)।

---

## ৪. Status/Package scheduler

- **Backend:**  
  - `GET /api/admin/schedule-rules` – পেন্ডিং রুল লিস্ট  
  - `POST /api/admin/schedule-rules` – body: `customerId`, `scheduledAt`, `newStatus?`, `newPackageId?`  
  - `DELETE /api/admin/schedule-rules/:id`
- **Cron:** প্রতি ৫ মিনিটে `appliedAt: null` এবং `scheduledAt <= now` রুলগুলো অ্যাপ্লাই হয়; কাস্টমার প্রোফাইল আপডেট ও `appliedAt` সেট।

---

## ৫. Package/Status change request from client portal

- **Backend:**  
  - কাস্টমার: `GET /api/customer/requests`, `POST /api/customer/requests` – body: `type` (PACKAGE_CHANGE | STATUS_CHANGE), `requestedPackageId?`, `requestedStatus?`  
  - অ্যাডমিন: `GET /api/admin/customer-requests`, `PATCH /api/admin/customer-requests/:id` – body: `status` (APPROVED | REJECTED), `notes?`
- অ্যাপ্রুভ করলে কাস্টমার প্রোফাইলে প্যাকেজ/স্ট্যাটাস আপডেট।

---

## ৬. Bulk status change

- **Admin:** `PATCH /api/admin/customers/bulk-status` – body: `customerIds[]`, `status`
- **Reseller:** `PATCH /api/reseller/customers/bulk-status` – body: `customerIds[]`, `status` (শুধু নিজের কাস্টমার)।
- স্ট্যাটাস: ACTIVE, INACTIVE, BLOCKED, PENDING, PERSONAL, FREE, LEFT।

---

## ৭. Client assigning to employees

- **Backend:**  
  - `GET /api/admin/employees` – অ্যাক্টিভ EMPLOYEE ইউজার লিস্ট  
  - `POST /api/admin/employees` – body: phone, password, name, email? (employee তৈরি)  
  - `PATCH /api/admin/customers/:id/assign` – body: `assignedToUserId` (null = unassign)
- কাস্টমার প্রোফাইলে `assignedToUserId` দিয়ে এমপ্লয়ীর সাথে লিংক।

---

## ৮. Left client record/archive

- **Schema:** `CustomerProfile.leftAt`, `CustomerProfile.leftReason`।
- **Backend:**  
  - `PATCH /api/admin/customers/:id/left` – body: `leftReason?`; স্ট্যাটাস `LEFT` ও `leftAt` সেট।  
  - Left লিস্ট: `GET /api/admin/customers?status=LEFT`।
- এক্সপোর্ট CSV-তে Left At, Left Reason কলাম আছে।

---

## Frontend API (client.ts)

- `mikrotik.import()`
- `admin.customers()`, `admin.customerProfile(id)`, `admin.customersExport()`, `admin.setPppoePassword()`, `admin.setMacAddress()`, `admin.bulkStatus()`, `admin.assignCustomer()`, `admin.markLeft()`, `admin.employees()`, `admin.createEmployee()`, `admin.scheduleRules()`, `admin.createScheduleRule()`, `admin.deleteScheduleRule()`, `admin.customerRequests()`, `admin.reviewCustomerRequest()`, `admin.newClientRequests()`, `admin.reviewNewClientRequest()`
- `reseller.bulkStatus()`, `reseller.customerProfile()`, `reseller.setPppoePassword()`, `reseller.setMacAddress()`
- `customer.requests()`, `customer.createRequest()`
- `newClientRequest.submit()` (পাবলিক)

Admin/Reseller/Customer পেজে টেবিল, ফিল্টার, বাটন ও মডাল যোগ করে UI সম্পূর্ণ করা যাবে।

---

## বাকি ফিচার (ispdigital.net অনুযায়ী) – যোগ করা হয়েছে

### Add New Client Request
- **Schema:** `NewClientRequest` মডেল।
- **Public:** `POST /api/new-client-request` (no auth)。
- **Admin:** `GET /api/admin/new-client-requests`, `PATCH /api/admin/new-client-requests/:id` (approve → User+CustomerProfile)।

### View Client Profile with All History and Log
- **Admin:** `GET /api/admin/customers/:id/profile` (profile + bills + payments + usageLogs + tickets)。
- **Reseller:** `GET /api/reseller/customers/:id/profile`।

### MikroTik Credentials Change From Software
- **Admin/Reseller:** `PATCH .../customers/:id/pppoe-password` (body: password); DB + MikroTik sync।

### MAC Address Bind & Unbind
- **Admin/Reseller:** `PATCH .../customers/:id/mac` (body: macAddress?, pushToMikrotik?)。

### All Client Auto Sync from MikroTik
- **Cron:** Daily 3 AM `importFromMikrotik()` (set `AUTO_IMPORT_MIKROTIK=false` to disable)。

### Data Filtering
- **Admin customers:** ?status, resellerId, packageId, zoneArea, createdAtFrom, createdAtTo。
- **Reseller customers:** ?status, packageId, zoneArea。

### Total Client List Download (PDF or Excel)
- **Export:** ?format=csv|pdf|html (pdf/html = print-friendly HTML for Print to PDF)。
