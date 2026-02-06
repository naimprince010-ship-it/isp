# Client Management – অ্যাপে কী কী আছে

আপনার চাহিদার সাথে অ্যাপের ফিচার তুলনা।

---

| # | ফিচার | অ্যাপে আছে? | নোট |
|---|--------|-------------|-----|
| 1 | **Import PPPoE/Static ID, Password & Profile from Mikrotik** | ❌ নেই | এখন শুধু অ্যাপ → MikroTik সিঙ্ক আছে। রাউটার থেকে ইমপোর্ট নেই। |
| 2 | **Export PPPoE, Password, & Profile from Excel** | ❌ নেই | BTRC রিপোর্ট CSV এক্সপোর্ট আছে। ক্লায়েন্ট লিস্ট Excel/PPPoE এক্সপোর্ট নেই। |
| 3 | **Add New Client Request** | ⚠️ আংশিক | রিসেলার “Add Customer” দিয়ে ক্লায়েন্ট যোগ করা যায়। আলাদা “Request → Approve” ফ্লো নেই। |
| 4 | **Active, Inactive, Personal, Free, and Left Client List** | ⚠️ আংশিক | Active, Inactive, Blocked, Pending লিস্ট আছে। Personal/Free/Left টাইপ বা লিস্ট নেই। |
| 5 | **View Client Profile with All History and Log** | ⚠️ আংশিক | কাস্টমার লিস্টে দেখানো হয়। আলাদা প্রোফাইল পেজ (বিল/পেমেন্ট/লগ হিস্টরি) নেই। |
| 6 | **Mikrotik Client Credentials Can Be Change From Software** | ⚠️ আংশিক | এডিট করলে রাউটারে পুরনো ইউজার আপডেট হয় (rate-limit)। পাসওয়ার্ড চেঞ্জ UI/ফ্লো নেই। |
| 7 | **Internet Connectivity Enable/Disable Anytime** | ✅ আছে | Block / Unblock – MikroTik এ disable/enable + স্ট্যাটাস আপডেট। |
| 8 | **Caller ID / MAC Address Bind & Unbind** | ⚠️ আংশিক | DB এ `macAddress` ফিল্ড আছে। বাইন্ড/আনবাইন্ড UI বা MikroTik বাইন্ডিং নেই। |
| 9 | **Client Status and Package Scheduler System** | ❌ নেই | ভবিষ্যৎ তারিখে স্ট্যাটাস/প্যাকেজ চেঞ্জের সিডিউলার নেই। |
| 10 | **Client Status and Package Change Request from Client Portal and App** | ❌ নেই | কাস্টমার পোর্টালে প্যাকেজ/স্ট্যাটাস চেঞ্জ রিকোয়েস্ট নেই। অ্যান্ড্রয়েড অ্যাপ নেই। |
| 11 | **Bulk Status Change** | ❌ নেই | একজনের ব্লক/আনব্লক আছে। একসাথে অনেক ক্লায়েন্ট সিলেক্ট করে স্ট্যাটাস চেঞ্জ নেই। |
| 12 | **Client Assigning System for Employees** | ❌ নেই | ক্লায়েন্ট “এমপ্লয়ী”তে অ্যাসাইন করার সিস্টেম নেই। শুধু রিসেলার–কাস্টমার রিলেশন আছে। |
| 13 | **All Client Auto Sync from Mikrotik** | ⚠️ আংশিক | অ্যাপ → MikroTik সিঙ্ক আছে। MikroTik → অ্যাপ (ইমপোর্ট/অটো সিঙ্ক) নেই। |
| 14 | **Send Client Information to Mikrotik** | ✅ আছে | Sync All / এক কাস্টমার সিঙ্ক – PPPoE ইউজার ও স্পিড MikroTik এ যায়। |
| 15 | **Client Portal (Android/Web) Management System** | ⚠️ আংশিক | ওয়েব কাস্টমার পোর্টাল আছে (বিল, পে, ইউজেজ, সাপোর্ট)। অ্যান্ড্রয়েড অ্যাপ নেই। |
| 16 | **Data Filtering System** | ⚠️ আংশিক | রিপোর্টে মাস/বছর ফিল্টার, বিলে স্ট্যাটাস ফিল্টার আছে। এডভান্স ক্লায়েন্ট ফিল্টার (প্যাকেজ/তারিখ/জোন) নেই। |
| 17 | **Total Client List Download (PDF or Excel)** | ⚠️ আংশিক | BTRC রিপোর্ট CSV আছে। “সব ক্লায়েন্ট” PDF/Excel ডাউনলোড নেই। |
| 18 | **Keep a Record of Left Client List** | ❌ নেই | “Left” স্ট্যাটাস বা লেফট ক্লায়েন্ট আর্কাইভ লিস্ট নেই। |

---

## সংক্ষেপ

| ধরন | সংখ্যা | ফিচার |
|-----|--------|--------|
| ✅ আছে | 2 | Enable/Disable (Block/Unblock), Send Client to MikroTik |
| ⚠️ আংশিক | 8 | Add Client, Status list, Profile, Credentials change, MAC field, Sync direction, Web portal, Filtering, BTRC export |
| ❌ নেই | 8 | Import from MikroTik, Excel export (client list), Scheduler, Change request from portal/app, Bulk status, Employee assign, Auto sync from MikroTik, Left client list |

---

## পরবর্তী ধাপ (যেগুলো যোগ করতে হবে)

প্রয়োজন অনুযায়ী নিচের দিকে কাজ করা যায়:

1. **Import from MikroTik** – রাউটার থেকে PPPoE ইউজার পড়ে DB তে ইমপোর্ট।
2. **Client list Excel/PDF export** – অ্যাডমিন/রিসেলার ক্লায়েন্ট লিস্ট ডাউনলোড।
3. **Client Profile পেজ** – এক ক্লায়েন্টের বিস্তারিত + বিল/পেমেন্ট/লগ হিস্টরি।
4. **Left client** – স্ট্যাটাস “LEFT” + লেফট লিস্ট/আর্কাইভ।
5. **Bulk status change** – মাল্টি সিলেক্ট করে একসাথে ব্লক/আনব্লক।
6. **Package/Status change request** – কাস্টমার পোর্টাল থেকে রিকোয়েস্ট, অ্যাডমিন/রিসেলার অ্যাপ্রুভ।
7. **Client list filtering** – প্যাকেজ, স্ট্যাটাস, তারিখ, জোন দিয়ে ফিল্টার।
8. **Password change from app** – ক্লায়েন্ট পাসওয়ার্ড বদলিয়ে MikroTik এ পুশ।

অ্যান্ড্রয়েড অ্যাপ ও সcheduler আলাদা বড় ফিচার; চাইলে পরে প্ল্যান করা যাবে।
