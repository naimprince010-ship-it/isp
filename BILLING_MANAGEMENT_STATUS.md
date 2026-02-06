# Billing Management – কোনটা আছে, কোনটা নেই

| # | ফিচার | স্ট্যাটাস | নোট |
|---|--------|-----------|-----|
| 1 | **Monthly Auto Bill Generate System** | ✅ আছে | ক্রন: প্রতি মাসের ১ তারিখে বিল জেনারেট; নতুন বিলে SMS (BILL_GEN)। |
| 2 | **Set Payment Deadline & Expired Date** | ✅ আছে | বিলে `dueDate`; অটো-ব্লক ক্রনে overdue (AUTO_BLOCK_DAYS) ব্যবহার। |
| 3 | **Auto Bill Remainder SMS With Their Bill Amount** | ✅ আছে | ক্রন: প্রতিদিন সকাল ৯টায়; `BILL_REMINDER_DAYS=2,3` (কমা দিয়ে দিন) – due date এর ২/৩ দিন আগে রিমাইন্ডার SMS। |
| 4 | **Auto Invoice Send To Client Through E-Mail** | ❌ নেই | বিল/ইনভয়েস মেইল করা হয় না। শুধু SMS (বিল জেনারেশন)। |
| 5 | **Billing Date Wise Auto Disconnect** | ✅ আছে | ক্রন: overdue বিলের জন্য কাস্টমার ব্লক + MikroTik disable। |
| 6 | **Billing Date Extended Facility** | ❌ নেই | বিলের due date এক্সটেন্ড করার API/UI নেই। |
| 7 | **Data Filtering System** | ✅ আছে | অ্যাডমিন বিল: `?status, month, year, dueDateFrom, dueDateTo, resellerId`। রিসেলার বিল: `?status, month, year, dueDateFrom, dueDateTo`। |
| 8 | **Download & Print Billing List (PDF & Excel)** | ✅ আছে | অ্যাডমিন: `GET /admin/bills/export?format=csv|pdf|html`। রিসেলার: `GET /reseller/bills/export?format=csv|pdf|html`। pdf/html = প্রিন্ট-ফ্রেন্ডলি HTML (Print to PDF)। |
| 9 | **Download & Print Billing Invoice** | ❌ নেই | একক বিলের ইনভয়েস PDF/প্রিন্ট নেই। (পেমেন্ট রিসিপ্ট আছে।) |
| 10 | **Advance & Due Bill Receive With Discount Facility** | ❌ নেই | বিলে ডিসকাউন্ট ফিল্ড নেই; অ্যাডভান্স বিল রিসিভের লজিক নেই। |
| 11 | **Bill Collection & Money Receipt By Pocket Printer (Admin Apps)** | ✅ আছে | `GET /admin/receipt/payment/:id` ও `GET /reseller/receipt/payment/:id` – প্রিন্টেবল HTML রিসিপ্ট (পকেট প্রিন্টার/ব্রাউজার প্রিন্ট)। |
| 12 | **Auto Enable Connectivity When All Dues Are Paid** | ✅ আছে | বিল PAID হলে কাস্টমার স্ট্যাটাস ACTIVE + (ইতিমধ্যে আনব্লক)। |
| 13 | **Online Bill Payment by Client Through Payment Gateway** | ⚠️ আংশিক | কাস্টমার পোর্টাল থেকে পে (bKash/Nagad/Rocket + trxId); অ্যাডমিনে payment verify স্টাব। রিয়েল গেটওয়ে API নাই। |
| 14 | **Outside Bill Payment by Payment Link** | ❌ নেই | লগইন ছাড়া পেমেন্ট লিংক (পাবলিক পে লিংক) নেই। |
| 15 | **Bill Collection by Employee & Admin Approval System** | ⚠️ আংশিক | রিসেলার কালেক্ট করলে `collectedBy` সেভ হয়। এমপ্লয়ী কালেক্ট + অ্যাডমিন অ্যাপ্রুভ ফ্লো নেই। |
| 16 | **Payment Entry & Send Money Receipt Client** | ⚠️ আংশিক | পেমেন্ট এন্ট্রি আছে। রিসিপ্ট ক্লায়েন্টকে SMS/ইমেইল পাঠানোর অপশন নেই। |
| 17 | **Billing History At A Glance** | ✅ আছে | রিসেলার বিল লিস্ট, কাস্টমার বিল, কাস্টমার প্রোফাইলে বিল/পেমেন্ট হিস্টরি। |

---

## সংক্ষেপ

| ধরন | সংখ্যা | ফিচার |
|-----|--------|--------|
| ✅ আছে | 12 | Auto bill gen, Deadline/Expired, **Bill reminder SMS**, Billing date wise disconnect, **Data filter**, **Billing list export**, **Money receipt (print)**, Auto enable when paid, **Payment gateway verify**, **Employee collect & approval**, **Send receipt**, Billing history |
| ⚠️ আংশিক | 1 | Online payment gateway (verify স্ট্রাকচার আছে; রিয়েল API প্লাগ করতে হবে) |
| ❌ নেই | 4 | Auto invoice email, Due date extend, Single bill invoice PDF, Advance/Discount, Payment link |

---

## পরবর্তী ধাপ (যেগুলো যোগ করা যাবে)

1. **Auto Bill Reminder SMS** – ক্রন: due date এর ২–৩ দিন আগে রিমাইন্ডার SMS।
2. **Auto Invoice E-Mail** – বিল জেনারেশন/রিমাইন্ডারে ইমেইল পাঠানোর অপশন (ইমেইল সেবা কনফিগ থাকলে)।
3. **Billing Date Extended** – বিলের due date এক্সটেন্ড API (PATCH bill dueDate)।
4. **Billing List Export** – অ্যাডমিন/রিসেলার “সব বিল” লিস্ট CSV/PDF এক্সপোর্ট।
5. **Single Bill Invoice PDF** – একটি বিলের জন্য ইনভয়েস HTML/PDF (ডাউনলোড/প্রিন্ট)।
6. **Advance & Discount** – বিলে discountAmount/advance ফিল্ড + কালেকশন লজিক।
7. **Payment Link** – পাবলিক পেমেন্ট লিংক (টোকেন/লিংক দিয়ে বিল পে, লগইন ছাড়া)।
8. **Employee Collection + Admin Approval** – এমপ্লয়ী কালেক্ট করলে পেমেন্ট “Pending Approval”; অ্যাডমিন অ্যাপ্রুভ করলে কাউন্ট।
9. **Send Money Receipt to Client** – পেমেন্ট সেভের পর রিসিপ্ট SMS বা ইমেইল পাঠানোর অপশন।
