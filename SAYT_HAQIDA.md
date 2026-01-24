# AvtoFix Marketplace - Sayt Haqida

## Umumiy Ma'lumot
AvtoFix - bu avtomobil ehtiyot qismlari va professional ustalar xizmatlarini taqdim etuvchi onlayn marketplace platformasi. Sayt O'zbekiston bozori uchun maxsus ishlab chiqilgan va foydalanuvchilarga qulay interfeys bilan ta'minlangan.

---

## Asosiy Sahifalar va Ularning Vazifalari

### 1. **Bosh Sahifa (Homepage)**
**Maqsad:** Foydalanuvchilarni saytga xush kelibsiz deyish va asosiy xizmatlarni ko'rsatish

**Qismlar:**
- **Hero Banner:** Saytning asosiy xabari va aksiyalar haqida ma'lumot. Gradient dizayn bilan bezatilgan, "Katalogni ko'rish" va "Ustalar" tugmalari mavjud
- **Mashhur Tovarlar:** Eng ko'p sotilgan yoki yangi qo'shilgan mahsulotlar ro'yxati (24 ta mahsulot)
- **Ustalar Bo'limi:** Professional ustalar ro'yxati (8 ta usta)
- **Xususiyatlar:** Sifat kafolati, yetkazib berish, 24/7 xizmat haqida qisqacha ma'lumot

**Texnik xususiyatlar:**
- Mahsulotlar 3 kun ichida qo'shilgan bo'lsa "Yangi" belgisi ko'rsatiladi
- Qidiruv funksiyasi - mahsulot nomi, SKU, kod, katalog raqami bo'yicha
- Sevimlilar ro'yxatiga qo'shish imkoniyati
- Lazy loading - rasmlar asta-sekin yuklanadi (tezlik uchun)

---

### 2. **Mahsulotlar Katalogi**
**Maqsad:** Barcha mahsulotlarni kategoriyalar bo'yicha ko'rsatish

**Qismlar:**
- **Sidebar (Yon panel):** Kategoriyalar daraxtini ko'rsatadi, sub-kategoriyalarga o'tish imkoniyati
- **Mahsulotlar Grid:** Tanlangan kategoriyaga tegishli mahsulotlar
- **Filtrlash:** Narx, holat (yangi/ishlatilgan), stok mavjudligi bo'yicha
- **Saralash:** Narx, yangilik, ism bo'yicha

**Texnik xususiyatlar:**
- Kategoriyalar ierarxik tuzilmada (ota-bola munosabati)
- Pagination - sahifalash (24 ta mahsulot har bir sahifada)
- Responsive dizayn - mobil va desktop uchun moslashtirilgan

---

### 3. **Mahsulot Batafsil Sahifasi**
**Maqsad:** Bitta mahsulot haqida to'liq ma'lumot berish

**Qismlar:**
- **Rasm Galereyasi:** Mahsulotning barcha rasmlari (zoom imkoniyati bilan)
- **Mahsulot Ma'lumotlari:** Nom, narx, tavsif, SKU, katalog raqami
- **Variantlar:** Agar mahsulotning turli xillari bo'lsa (masalan, turli ranglar)
- **Savatga Qo'shish:** Miqdorni tanlash va savatga qo'shish tugmasi
- **Sevimlilar:** Yulduzcha tugmasi orqali sevimlilar ro'yxatiga qo'shish
- **Magazin Ma'lumotlari:** Qaysi do'kondan sotilayotgani

**Texnik xususiyatlar:**
- Variant tanlash - URL parametr orqali (?variant=0)
- Stok nazorati - agar mahsulot tugagan bo'lsa, xabar ko'rsatiladi
- Narx konvertatsiyasi - dollar, rubl, yuan dan so'mga

---

### 4. **Savatcha (Cart)**
**Maqsad:** Tanlangan mahsulotlarni ko'rish va buyurtma berish

**Qismlar:**
- **Mahsulotlar Ro'yxati:** Savatdagi barcha mahsulotlar
- **Miqdor O'zgartirish:** Har bir mahsulot uchun miqdorni oshirish/kamaytirish
- **Jami Summa:** Barcha mahsulotlarning umumiy narxi
- **Yetkazib Berish Ma'lumotlari:** Manzil, telefon raqami
- **Buyurtma Berish:** Tasdiqlash tugmasi

**Texnik xususiyatlar:**
- Agar foydalanuvchi manzil kiritmagan bo'lsa, ro'yxatdan o'tish paytida tanlagan viloyati ishlatiladi
- Mahsulot narxi va miqdori avtomatik hisoblanadi
- Buyurtma MongoDB ga saqlanadi

---

### 5. **Ustalar (Professionals)**
**Maqsad:** Professional ustalarni topish va bog'lanish

**Qismlar:**
- **Ustalar Ro'yxati:** Barcha ustalar kartochkalari
- **Filtrlash:** Mutaxassislik bo'yicha (masalan, elektrik, mexanik)
- **Qidiruv:** Ism, telefon, manzil bo'yicha
- **Batafsil Ma'lumot:** Ustaning tajribasi, xizmatlari, ish vaqti
- **Bog'lanish:** Telefon raqami va manzil (Google Maps link)

**Texnik xususiyatlar:**
- Geolokatsiya - foydalanuvchiga yaqin ustalarni ko'rsatish
- Mutaxassisliklar - bir usta bir nechta mutaxassislikka ega bo'lishi mumkin
- Reyting tizimi (kelajakda qo'shilishi mumkin)

---

### 6. **Profil (Profile)**
**Maqsad:** Foydalanuvchi shaxsiy ma'lumotlarini boshqarish

**Qismlar:**
- **Shaxsiy Ma'lumotlar:** Ism, telefon, manzil, viloyat
- **Mashinalar:** Foydalanuvchining mashinalari ro'yxati
- **Buyurtmalar Tarixi:** Barcha buyurtmalar va ularning holati
- **Sevimlilar:** Sevimli mahsulotlar ro'yxati
- **Parolni O'zgartirish:** Xavfsizlik sozlamalari

**Texnik xususiyatlar:**
- JWT token autentifikatsiyasi
- Parol shifrlangan holda saqlanadi (bcrypt)
- Buyurtmalar holati real vaqtda yangilanadi

---

### 7. **Qidiruv (Search)**
**Maqsad:** Mahsulotlarni tez topish

**Qismlar:**
- **Qidiruv Maydoni:** Header'da joylashgan
- **Natijalar:** Qidiruv so'ziga mos mahsulotlar
- **Highlight:** Topilgan so'z sariq rangda ajratiladi

**Texnik xususiyatlar:**
- Real-time qidiruv - yozish paytida natijalar yangilanadi
- Lotin va kirill alifbolarini avtomatik konvertatsiya qiladi
- SKU, kod, katalog raqami bo'yicha ham qidiradi
- Variantlar ichida ham qidiradi

---

## Admin Panel - Boshqaruv Tizimi

Admin panel - bu sayt ma'muriyati uchun maxsus bo'lim. Faqat admin, owner, manager, helper va xodim rollari kirishi mumkin.

### **Sidebar (Yon Menyu) - Admin Panel**

Admin panelning chap tomonida joylashgan menyu. Har bir bo'lim alohida vazifani bajaradi:

---

#### 1. **Boshqaruv Paneli (Dashboard)**
**Vazifa:** Saytning umumiy statistikasini ko'rsatish

**Ko'rsatiladigan ma'lumotlar:**
- Jami mahsulotlar soni (variantlar bilan birga)
- Faol ustalar soni
- Jami foydalanuvchilar soni
- Oxirgi buyurtmalar

**Kim ko'radi:**
- Admin, Owner, Manager, Helper, Xodim - barchasi

---

#### 2. **Magazin (Store)**
**Vazifa:** Do'konlarni boshqarish va mahsulotlarni qo'shish

**Qismlar:**
- **Do'konlar Ro'yxati:** Barcha magazinlar kartochkalari
- **Do'kon Qo'shish:** Yangi magazin yaratish (nom, manzil, rasm)
- **Do'kon Tahrirlash:** Mavjud magazin ma'lumotlarini o'zgartirish
- **Do'kon O'chirish:** Magazinni o'chirish (tasdiqlash kerak)

**Magazin Ichida (Mahsulotlar):**
- **Mahsulotlar Ro'yxati:** Tanlangan magazindagi barcha mahsulotlar
- **Mahsulot Qo'shish:** Yangi mahsulot yaratish
  - Nom, narx, asl narxi, ustama foizi
  - Pul birligi (USD, RUB, CNY)
  - Holati (yangi, ishlatilgan, ta'mirlangan)
  - SKU, kod, katalog raqami
  - Kategoriya
  - Stok miqdori
  - Rasmlar (bir nechta)
  - Tavsif
- **Variantlar:** Mahsulotning turli xillari (masalan, turli ranglar)
  - Har bir variant alohida narx, SKU, stok miqdoriga ega
- **Mahsulot Tahrirlash:** Mavjud mahsulot ma'lumotlarini o'zgartirish
- **Mahsulot O'chirish:** Mahsulotni o'chirish

**Texnik xususiyatlar:**
- Mahsulotlar kod bo'yicha saralanadi (#1, #2, #3...)
- Narx avtomatik hisoblanadi: asl narxi + ustama foizi = sotiladigan narxi
- Valyuta kurslari O'zbekiston Markaziy Bankidan olinadi
- Rasmlar server'ga yuklanadi va URL saqlanadi

**Kim ko'radi:**
- Admin, Owner, Manager, Helper, Xodim - barchasi

---

#### 3. **Usta Qo'shish (Masters / Add Professional)**
**Vazifa:** Yangi ustalarni tizimga qo'shish

**Qismlar:**
- **Usta Ma'lumotlari:**
  - Ism
  - Telefon raqami (+998 formatida)
  - Mutaxassisliklar (bir nechta tanlash mumkin)
  - Manzil
  - Ish vaqti
  - Tajriba (yillar)
  - Xizmatlar ro'yxati
  - Rasmlar
  - Google Maps havolasi (geolokatsiya)

**Texnik xususiyatlar:**
- Telefon raqami avtomatik formatlanadi: +998 (XX) XXX-XX-XX
- Google Maps link'dan koordinatalar avtomatik ajratiladi
- Mutaxassisliklar ro'yxati dinamik - yangi mutaxassislik qo'shish mumkin
- Xodim faqat o'zi qo'shgan ustalarni ko'radi va tahrirlaydi

**Kim ko'radi:**
- Admin, Owner, Manager, Helper, Xodim - barchasi

---

#### 4. **Ustalar (Professionals)**
**Vazifa:** Barcha ustalarni ko'rish va boshqarish

**Qismlar:**
- **Ustalar Ro'yxati:** Barcha ustalar kartochkalari
- **Filtrlash:** Mutaxassislik bo'yicha
- **Qidiruv:** Ism, telefon, manzil bo'yicha
- **Tahrirlash:** Usta ma'lumotlarini o'zgartirish
- **O'chirish:** Ustani o'chirish

**Texnik xususiyatlar:**
- Xodim faqat o'zi qo'shgan ustalarni ko'radi
- Admin faqat o'zi qo'shgan ustalarni tahrirlaydi va o'chiradi
- Owner va Manager barcha ustalarni boshqaradi

**Kim ko'radi:**
- Admin, Owner, Manager, Helper, Xodim - barchasi

---

#### 5. **Foydalanuvchilar (Users)**
**Vazifa:** Sayt foydalanuvchilarini boshqarish

**Qismlar:**
- **Foydalanuvchilar Ro'yxati:** Barcha ro'yxatdan o'tgan foydalanuvchilar
- **Filtrlash:** Mashina bo'yicha (masalan, faqat Nexia egalarini ko'rsatish)
- **Qidiruv:** Ism, telefon, viloyat bo'yicha
- **Rol O'zgartirish:** Foydalanuvchiga admin, manager, helper, xodim roli berish
- **O'chirish:** Foydalanuvchini o'chirish
- **Magazin Biriktirish:** Foydalanuvchiga magazin biriktirish (manager uchun)

**Texnik xususiyatlar:**
- Foydalanuvchilar mashinalari ro'yxati ko'rsatiladi
- Viloyat va manzil ma'lumotlari
- Buyurtmalar tarixi
- Rol o'zgartirish faqat admin va owner uchun

**Kim ko'radi:**
- Admin, Owner, Manager, Helper - faqat ular
- Xodim bu bo'limni ko'rmaydi

---

#### 6. **Buyurtmalar (Orders)**
**Vazifa:** Barcha buyurtmalarni boshqarish

**Qismlar:**
- **Buyurtmalar Ro'yxati:** Barcha buyurtmalar jadvali
- **Holat O'zgartirish:** Buyurtma holatini yangilash
  - Kutilmoqda (pending)
  - Tasdiqlandi (confirmed)
  - Yetkazilmoqda (shipping)
  - Yetkazildi (delivered)
  - Bekor qilindi (cancelled)
- **Batafsil Ma'lumot:** Buyurtma tarkibi, mijoz ma'lumotlari, jami summa
- **Filtrlash:** Holat bo'yicha

**Texnik xususiyatlar:**
- Buyurtma holati real vaqtda yangilanadi
- Mijoz telefon raqami va manzili ko'rsatiladi
- Mahsulotlar ro'yxati va miqdori
- Jami summa avtomatik hisoblanadi

**Kim ko'radi:**
- Admin, Owner, Manager, Helper, Xodim - barchasi

---

## Rollar va Huquqlar

### 1. **Owner (Ega)**
- Barcha bo'limlarga to'liq kirish
- Barcha ma'lumotlarni tahrirlash va o'chirish
- Yangi adminlar va managerlar qo'shish

### 2. **Admin**
- Barcha bo'limlarga kirish
- Faqat o'zi qo'shgan ustalarni tahrirlash va o'chirish
- Foydalanuvchilar rolini o'zgartirish

### 3. **Manager**
- Magazin, ustalar, buyurtmalar bo'limlariga kirish
- Mahsulotlarni qo'shish va tahrirlash
- Buyurtmalarni boshqarish

### 4. **Helper**
- Magazin, ustalar, buyurtmalar bo'limlariga kirish
- Mahsulotlarni ko'rish (tahrirlash cheklangan)
- Buyurtmalarni ko'rish

### 5. **Xodim (Employee)**
- Dashboard, magazin, ustalar, buyurtmalar bo'limlariga kirish
- Faqat o'zi qo'shgan ustalarni ko'rish va tahrirlash
- Foydalanuvchilar bo'limini ko'rmaydi

### 6. **Foydalanuvchi (User)**
- Faqat sayt old qismiga kirish
- Mahsulotlarni ko'rish va sotib olish
- Profil va buyurtmalar tarixini ko'rish

---

## Texnik Arxitektura

### **Frontend (Mijoz tomoni)**
- **React.js** - asosiy framework
- **Vite** - tez build tool
- **Tailwind CSS** - dizayn uchun
- **React Router** - sahifalar o'rtasida navigatsiya
- **Context API** - global state boshqaruvi (savatcha, sevimlilar, autentifikatsiya)

### **Backend (Server tomoni)**
- **Node.js** - server muhiti
- **Express.js** - API framework
- **MongoDB** - ma'lumotlar bazasi
- **JWT** - autentifikatsiya tokenlari
- **Bcrypt** - parol shifrlash
- **Multer** - fayl yuklash

### **Deployment (Joylashtirish)**
- **VPS Server** - 164.68.109.208
- **Nginx** - web server va reverse proxy
- **SSL Certificate** - Let's Encrypt (HTTPS)
- **PM2** - Node.js jarayonlarini boshqarish
- **Domain** - avtofix.uz

---

## Xususiyatlar

### **Foydalanuvchilar Uchun:**
- Mahsulotlarni qidirish va filtrlash
- Savatga qo'shish va buyurtma berish
- Sevimlilar ro'yxati
- Ustalarni topish va bog'lanish
- Buyurtmalar tarixini ko'rish
- Profil sozlamalari

### **Admin Uchun:**
- Mahsulotlarni boshqarish (CRUD)
- Ustalarni boshqarish (CRUD)
- Foydalanuvchilarni boshqarish
- Buyurtmalarni kuzatish
- Statistika va hisobotlar

### **Texnik:**
- Responsive dizayn - mobil va desktop
- Dark mode - qorong'u rejim
- Lazy loading - rasmlar asta-sekin yuklanadi
- Caching - tezlik uchun kesh
- SEO optimizatsiya
- Xavfsizlik - JWT, HTTPS, CORS

---

## Kelajak Rejalari

1. **Reyting Tizimi:** Ustalar va mahsulotlar uchun
2. **Chat:** Mijoz va usta o'rtasida
3. **To'lov Tizimi:** Click, Payme integratsiyasi
4. **Push Bildirishnomalar:** Buyurtma holati haqida
5. **Mobil Ilova:** Android va iOS uchun
6. **Statistika Dashboard:** Grafik va diagrammalar
7. **Eksport:** Buyurtmalar va hisobotlarni Excel'ga
8. **Multi-language:** Rus va ingliz tillari

---

## Xulosa

AvtoFix Marketplace - bu zamonaviy, foydalanuvchilarga qulay va xavfsiz platforma. Sayt avtomobil ehtiyot qismlari va professional ustalar xizmatlarini bir joyda taqdim etadi. Admin panel orqali barcha jarayonlar oson boshqariladi va real vaqtda kuzatiladi.

**Sayt manzili:** https://avtofix.uz
**Texnik qo'llab-quvvatlash:** 24/7
