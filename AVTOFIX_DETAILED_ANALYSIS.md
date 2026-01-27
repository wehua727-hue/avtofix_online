# AvtoFix Marketplace - Batafsil Tahlil

## 📋 Loyiha Xulosa

**AvtoFix** - avtomobil ehtiyot qismlari va professional ustalar xizmatlarini taqdim etuvchi zamonaviy onlayn marketplace platformasi. O'zbekiston bozori uchun maxsus ishlab chiqilgan.

**Texnik Stack:**
- **Frontend:** React 18, Vite, Tailwind CSS, React Router v6
- **Backend:** Node.js, Express.js, MongoDB, Mongoose
- **State Management:** Context API (Auth, Cart, Favorites, Theme)
- **UI Components:** Radix UI, shadcn/ui
- **Deployment:** VPS (164.68.109.208), Nginx, PM2, SSL

---

## 🏠 ASOSIY SAHIFALAR (Frontend Pages)

### 1. **Bosh Sahifa (Homepage) - `client/bosh-sahifa/Index.jsx`**

**Vazifa:** Foydalanuvchilarni xush kelibsiz deyish va asosiy xizmatlarni ko'rsatish

**Qismlar:**
- **Hero Banner:** Gradient dizayn, "Katalogni ko'rish" va "Ustalar" tugmalari
- **Mashhur Tovarlar:** 24 ta mahsulot (lazy loading bilan)
- **Ustalar Bo'limi:** 8 ta professional usta
- **Xususiyatlar:** Sifat kafolati, yetkazib berish, 24/7 xizmat

**Asosiy Funksiyalar:**
- Mahsulotlarni 3 kun ichida qo'shilgan bo'lsa "Yangi" belgisi
- Real-time qidiruv (lotin/kirill konvertatsiyasi)
- Sevimlilar ro'yxatiga qo'shish
- Lazy loading - rasmlar asta-sekin yuklanadi
- 30 sekundlik polling - mahsulotlar yangilanadi
- Session storage cache (30 sekund)

**Texnik Xususiyatlar:**
```javascript
- isNewProduct() - 3 kunlik yangilik tekshiruvi
- LazyImage component - IntersectionObserver bilan
- handleSearchQuery() - qidiruv funksiyasi
- Skeleton loading - tezlik uchun
```

---

### 2. **Mahsulotlar Katalogi - `client/mahsulot-kategoriya/ProductCategory.jsx`**

**Vazifa:** Kategoriyalar bo'yicha mahsulotlarni ko'rsatish va filtrlash

**Qismlar:**
- **Sidebar:** Kategoriyalar daraxtini ko'rsatadi
- **Mahsulotlar Grid:** Tanlangan kategoriyaga tegishli mahsulotlar
- **Filtrlash:** Narx (min/max), holat, stok mavjudligi
- **Saralash:** Narx, yangilik, ism bo'yicha
- **Breadcrumb:** Navigatsiya yo'li

**Asosiy Funksiyalar:**
- Kategoriyalar ierarxik tuzilmasi
- Pagination - 100 ta mahsulot har bir sahifada
- Narx filtri (debounce 500ms)
- Qidiruv - variantlar ichida ham
- Responsive dizayn

**Filtrlash Logikasi:**
```javascript
- Kategoriya bo'yicha (categoryId)
- Narx bo'yicha (minPrice, maxPrice)
- Variantlar ichida qidiruv
- Lotin/Kirill konvertatsiyasi
```

---

### 3. **Mahsulot Batafsil Sahifasi - `client/korish/ProductDetail.jsx`**

**Vazifa:** Bitta mahsulot haqida to'liq ma'lumot berish

**Qismlar:**
- **Rasm Galereyasi:** Zoom imkoniyati, swipe navigatsiya
- **Mahsulot Ma'lumotlari:** Nom, narx, tavsif, SKU, katalog raqami
- **Variantlar:** Turli xillari (ranglar, o'lchamlar)
- **Savatga Qo'shish:** Miqdor tanlash
- **Sevimlilar:** Yulduzcha tugmasi
- **Shunga O'xshash Mahsulotlar:** 6 ta mahsulot

**Asosiy Funksiyalar:**
- Variant tanlash - URL parametr orqali (?variant=0)
- Stok nazorati - omborda qolmagan bo'lsa xabar
- Narx konvertatsiyasi - USD, RUB, CNY dan so'mga
- 15 sekundlik polling - stok o'zgarishini kuzatish
- Breadcrumb navigatsiyasi
- Touch swipe - mobil uchun

**Variant Logikasi:**
```javascript
- variantSummaries - asosiy variant ma'lumotlari
- variants - variant massivi
- selectedVariant - tanlangan variant
- Unique ID: ${productId}_variant_${variantName}
```

---

### 4. **Savatcha (Cart) - `client/savatcha/Cart.jsx`**

**Vazifa:** Tanlangan mahsulotlarni ko'rish va buyurtma berish

**Qismlar:**
- **Mahsulotlar Ro'yxati:** Savatdagi barcha mahsulotlar
- **Miqdor O'zgartirish:** +/- tugmalari
- **Jami Summa:** Avtomatik hisoblash
- **Yetkazib Berish Ma'lumotlari:** Manzil, telefon
- **Buyurtma Berish:** Tasdiqlash tugmasi

**Asosiy Funksiyalar:**
- Ombordagi miqdor tekshiruvi
- Variant ma'lumotlarini saqlash
- LocationConfirmModal - manzil tasdiqlash
- Buyurtma yaratish - multiple stores uchun
- Cache tozalash - stockCount yangilangan

**Buyurtma Logikasi:**
```javascript
- items.map() - mahsulotlarni formatlash
- variantName va parentProductId saqlash
- deliveryAddress - manzil ma'lumotlari
- ordersAPI.create() - buyurtma yaratish
```

---

### 5. **Sevimlilar (Favorites) - `client/sevimli/Favorites.jsx`**

**Vazifa:** Sevimli mahsulotlarni ko'rish

**Qismlar:**
- **Sevimli Mahsulotlar:** Grid ko'rinishida
- **Yulduzcha Tugmasi:** Sevimlilardan chiqarish
- **Savatga Qo'shish:** QuantityCounterCompact

**Asosiy Funksiyalar:**
- FavoritesContext bilan integratsiya
- Animatsiya - yulduzcha tugmasi
- Navbar counter yangilanishi

---

### 6. **Ustalar (Professionals) - `client/ustalar-kategoriya/Professionals.jsx`**

**Vazifa:** Professional ustalarni topish va bog'lanish

**Qismlar:**
- **Ustalar Ro'yxati:** Kartochkalari
- **Filtrlash:** Mutaxassislik bo'yicha
- **Qidiruv:** Ism, telefon, manzil bo'yicha
- **Batafsil Ma'lumot:** Tajriba, xizmatlari, ish vaqti
- **Bog'lanish:** Telefon va Google Maps link

**Asosiy Funksiyalar:**
- Geolokatsiya - yaqin ustalarni ko'rsatish
- Mutaxassisliklar - bir usta bir nechta
- Reyting tizimi (kelajakda)

---

### 7. **Profil (Profile) - `client/profil/Profile.jsx`**

**Vazifa:** Foydalanuvchi shaxsiy ma'lumotlarini boshqarish

**Qismlar:**
- **Shaxsiy Ma'lumotlar:** Ism, telefon, manzil, viloyat
- **Mashinalar:** Foydalanuvchining mashinalari
- **Buyurtmalar Tarixi:** Barcha buyurtmalar va holati
- **Sevimlilar:** Sevimli mahsulotlar
- **Parolni O'zgartirish:** Xavfsizlik

**Asosiy Funksiyalar:**
- JWT token autentifikatsiyasi
- Parol shifrlash (bcrypt)
- Buyurtmalar holati real vaqtda

---

### 8. **Qidiruv (Search) - `client/search/SearchResults.jsx`**

**Vazifa:** Mahsulotlarni tez topish

**Asosiy Funksiyalar:**
- Real-time qidiruv
- Lotin/Kirill konvertatsiyasi
- SKU, kod, katalog raqami bo'yicha
- Variantlar ichida qidiruv
- Highlight - topilgan so'z sariq rangda

---

### 9. **Autentifikatsiya**

**Login - `client/login/Login.jsx`**
- Telefon va parol bilan kirish
- JWT token saqlash
- localStorage'da user ma'lumotlari

**Register - `client/register/Register.jsx`**
- Telefon, parol, viloyat tanlash
- Avtomatik login ro'yxatdan o'tgandan keyin
- Viloyat tanlash - geolokatsiya

---

## 🎛️ ADMIN PANEL QISMLARI

### **Admin Panel - `client/admin-panel/AdminPanel.jsx`**

**Rollar va Huquqlar:**
- **Owner:** Barcha bo'limlarga to'liq kirish
- **Admin:** Faqat o'zi qo'shgan ustalarni tahrirlash
- **Manager:** Magazin, ustalar, buyurtmalar
- **Helper:** Ko'rish huquqi (tahrirlash cheklangan)
- **Xodim:** Faqat o'zi qo'shgan ustalarni boshqarish

### **1. Dashboard (Boshqaruv Paneli)**

**Ko'rsatiladigan Ma'lumotlar:**
- Jami mahsulotlar soni (variantlar bilan)
- Faol ustalar soni
- Jami foydalanuvchilar soni
- Oxirgi buyurtmalar

---

### **2. Magazin (Store) - `client/admin-panel/AdminPanel.jsx`**

**Qismlar:**
- **Do'konlar Ro'yxati:** Barcha magazinlar
- **Do'kon Qo'shish:** Yangi magazin yaratish
- **Do'kon Tahrirlash:** Ma'lumotlarni o'zgartirish
- **Do'kon O'chirish:** Tasdiqlash kerak

**Magazin Ichida (Mahsulotlar):**
- **Mahsulotlar Ro'yxati:** Kod bo'yicha saralash (#1, #2, #3...)
- **Mahsulot Qo'shish:**
  - Nom, narx, asl narxi, ustama foizi
  - Pul birligi (USD, RUB, CNY)
  - Holati (yangi, ishlatilgan, ta'mirlangan)
  - SKU, kod, katalog raqami
  - Kategoriya
  - Stok miqdori
  - Rasmlar (bir nechta)
  - Tavsif

**Variantlar:**
- Har bir variant alohida narx, SKU, stok miqdoriga ega
- Variant qo'shish/tahrirlash/o'chirish

**Narx Hisoblash:**
```javascript
sotiladigan_narx = asl_narxi + (asl_narxi * ustama_foizi / 100)
```

**Valyuta Kurslari:**
- O'zbekiston Markaziy Bankidan olinadi
- USD, RUB, CNY dan so'mga konvertatsiya

---

### **3. Usta Qo'shish (Masters) - `client/admin-panel/AdminPanel.jsx`**

**Usta Ma'lumotlari:**
- Ism
- Telefon raqami (+998 formatida)
- Mutaxassisliklar (bir nechta tanlash mumkin)
- Manzil
- Ish vaqti
- Tajriba (yillar)
- Xizmatlar ro'yxati
- Rasmlar
- Google Maps havolasi (geolokatsiya)

**Telefon Formatlash:**
```javascript
+998 (XX) XXX-XX-XX
```

**Google Maps Link Parsing:**
- Koordinatalarni avtomatik ajratish
- Telegram va Google Maps formatlarini qo'llash

---

### **4. Ustalar (Professionals) - `client/admin-panel/AdminPanel.jsx`**

**Qismlar:**
- **Ustalar Ro'yxati:** Barcha ustalar
- **Filtrlash:** Mutaxassislik bo'yicha
- **Qidiruv:** Ism, telefon, manzil bo'yicha
- **Tahrirlash:** Usta ma'lumotlarini o'zgartirish
- **O'chirish:** Ustani o'chirish

**Rol Asosida Filtrlash:**
- Xodim: Faqat o'zi qo'shgan ustalarni ko'radi
- Admin: Faqat o'zi qo'shgan ustalarni tahrirlaydi
- Owner/Manager: Barcha ustalarni boshqaradi

---

### **5. Foydalanuvchilar (Users) - `client/admin-panel/AdminPanel.jsx`**

**Qismlar:**
- **Foydalanuvchilar Ro'yxati:** Barcha ro'yxatdan o'tgan foydalanuvchilar
- **Filtrlash:** Mashina bo'yicha
- **Qidiruv:** Ism, telefon, viloyat bo'yicha
- **Rol O'zgartirish:** Admin, manager, helper, xodim
- **O'chirish:** Foydalanuvchini o'chirish
- **Magazin Biriktirish:** Manager uchun

**Mashina Filtri:**
- Foydalanuvchining mashinalarini ko'rsatish
- Mashina bo'yicha filtrlash

---

### **6. Buyurtmalar (Orders) - `client/admin-panel/OrdersSection.jsx`**

**Qismlar:**
- **Buyurtmalar Ro'yxati:** Jadvali
- **Holat O'zgartirish:**
  - Kutilmoqda (pending)
  - Tasdiqlandi (confirmed)
  - Yetkazilmoqda (shipping)
  - Yetkazildi (delivered)
  - Bekor qilindi (cancelled)
- **Batafsil Ma'lumot:** Tarkibi, mijoz ma'lumotlari, jami summa
- **Filtrlash:** Holat bo'yicha

---

## 🧩 KOMPONENTLAR (Components)

### **1. Header - `client/components/Header.jsx`**

**Qismlar:**
- **Logo:** AvtoFix logotipi
- **Katalog Tugmasi:** Kategoriyalar modali
- **Qidiruv:** SearchAutocomplete
- **Theme Toggle:** Qorong'u/Yorug' rejim
- **Sevimlilar:** Counter bilan
- **Savatcha:** Item count
- **Auth Tugmalari:** Kirish/Ro'yxatdan o'tish

**Asosiy Funksiyalar:**
- Categories bar - 8 ta kategoriya
- Mobile search
- Favorite counter animatsiyasi
- Theme toggle (localStorage'da saqlash)

---

### **2. Sidebar - `client/components/Sidebar.jsx`**

**Filtrlash Qismlari:**
- Brandi
- Narx
- Yili
- Rangi

---

### **3. SearchAutocomplete - `client/components/SearchAutocomplete.jsx`**

**Asosiy Funksiyalar:**
- Real-time qidiruv
- Autocomplete suggestions
- Lotin/Kirill konvertatsiyasi
- Debounce 300ms

---

### **4. QuantityCounterCompact - `client/components/QuantityCounterCompact.jsx`**

**Vazifa:** Savatga qo'shish/miqdor o'zgartirish

**Qismlar:**
- Savatga qo'shish tugmasi
- +/- tugmalari
- Miqdor ko'rsatish

---

### **5. LocationConfirmModal - `client/components/LocationConfirmModal.jsx`**

**Vazifa:** Buyurtma berish paytida manzil tasdiqlash

**Qismlar:**
- Viloyat tanlash
- Manzil kiritish
- Telefon raqami
- Tasdiqlash tugmasi

---

### **6. CatalogModal - `client/components/CatalogModal.jsx`**

**Vazifa:** Barcha kategoriyalarni ko'rsatish

**Qismlar:**
- Kategoriyalar daraxtini ko'rsatadi
- Qidiruv
- Tanlash

---

### **7. CarCard - `client/components/CarCard.jsx`**

**Vazifa:** Mahsulot kartochkasini ko'rsatish

**Qismlar:**
- Rasm
- Nom
- Narx
- Sevimlilar tugmasi
- Savatga qo'shish

---

### **8. MobileBottomNav - `client/components/MobileBottomNav.jsx`**

**Vazifa:** Mobil navigatsiya

**Qismlar:**
- Bosh sahifa
- Kategoriyalar
- Savatcha
- Sevimlilar
- Profil

---

## 🔄 CONTEXT'LAR (State Management)

### **1. AuthContext - `client/context/AuthContext.jsx`**

**Vazifa:** Foydalanuvchi autentifikatsiyasi va ma'lumotlarini boshqarish

**Funksiyalar:**
```javascript
- login(credentials) - kirish
- logout() - chiqish
- register(payload) - ro'yxatdan o'tish
- updateUser(payload) - profil yangilash
- refreshUser() - ma'lumotlarni yangilash
```

**Xususiyatlar:**
- 30 kunlik avtomatik logout
- localStorage'da user ma'lumotlari
- JWT token saqlash
- buildSafeUser() - xavfsiz user ob'jekti

---

### **2. CartContext - `client/context/CartContext.jsx`**

**Vazifa:** Savatcha boshqaruvi

**Funksiyalar:**
```javascript
- addItem(product) - savatga qo'shish
- removeItem(productId) - o'chirish
- updateQuantity(productId, quantity) - miqdor o'zgartirish
- clearCart() - tozalash
- getItemQuantity(id) - miqdorni olish
- incrementItem(product) - miqdor oshirish
- decrementItem(productId) - miqdor kamaytirish
```

**Xususiyatlar:**
- Variant support - unique ID: `${productId}_variant_${variantName}`
- Stock count tekshiruvi
- Narx konvertatsiyasi
- Server bilan sinkronizatsiya

---

### **3. FavoritesContext - `client/context/FavoritesContext.jsx`**

**Vazifa:** Sevimli mahsulotlarni boshqarish

**Funksiyalar:**
```javascript
- toggleFavorite(product) - qo'shish/o'chirish
- addFavorite(product) - qo'shish
- removeFavorite(id) - o'chirish
- isFavorite(id) - tekshirish
```

**Xususiyatlar:**
- normalizeProduct() - mahsulot normalizatsiyasi
- mapFromApi() - API javobini formatlash
- Animatsiya support

---

### **4. ThemeContext - `client/context/ThemeContext.jsx`**

**Vazifa:** Qorong'u/Yorug' rejim boshqaruvi

**Funksiyalar:**
```javascript
- toggleTheme() - rejim o'zgartirish
```

**Xususiyatlar:**
- localStorage'da saqlash
- System preference tekshiruvi

---

## 🔌 API XIZMATLARI (Services)

### **API Base URL:** `/api`

### **1. authAPI - `client/services/api.js`**

```javascript
- getCurrentUser(id) - foydalanuvchi ma'lumotlarini olish
- register(payload) - ro'yxatdan o'tish
- login(payload) - kirish
- getAll() - barcha foydalanuvchilar
- update(id, payload) - profil yangilash
- updateRole(id, role) - rol o'zgartirish
- assignStore(id, storeId) - magazin biriktirish
- delete(id) - foydalanuvchini o'chirish
```

---

### **2. productsAPI - `client/services/api.js`**

```javascript
- search(options) - qidiruv
- getSuggestions(query) - autocomplete
- getAll(options) - barcha mahsulotlar
- getById(id) - mahsulot batafsili
- getNextCode(storeId) - keyingi kod
- create(formData) - yangi mahsulot
- update(id, formData) - tahrirlash
- delete(id) - o'chirish
```

**Options:**
- `storeId` - magazin ID
- `page` - sahifa raqami
- `limit` - mahsulotlar soni
- `categoryId` - kategoriya ID
- `minPrice`, `maxPrice` - narx filtri
- `expandVariants` - variantlarni ko'rsatish

---

### **3. storesAPI - `client/services/api.js`**

```javascript
- getAll() - barcha magazinlar
- getById(storeId) - magazin batafsili
- create(formData) - yangi magazin
- update(storeId, formData) - tahrirlash
- remove(storeId) - o'chirish
- toggleVisibility(storeId, isVisible) - ko'rinishini o'zgartirish
```

---

### **4. professionalsAPI - `client/services/api.js`**

```javascript
- getAll(options) - barcha ustalar
- getById(id) - usta batafsili
- create(professionalData) - yangi usta
- update(id, professionalData) - tahrirlash
- delete(id) - o'chirish
```

---

### **5. cartAPI - `client/services/api.js`**

```javascript
- getCart(userId) - savatni olish
- addItem(userId, item) - qo'shish
- updateQuantity(userId, productId, quantity) - miqdor o'zgartirish
- removeItem(userId, productId) - o'chirish
- clearCart(userId) - tozalash
```

---

### **6. favoritesAPI - `client/services/api.js`**

```javascript
- getFavorites(userId) - sevimlilarni olish
- toggleFavorite(userId, item) - qo'shish/o'chirish
- removeFavorite(userId, productId) - o'chirish
```

---

### **7. categoriesAPI - `client/services/api.js`**

```javascript
- getAll(flat, storeId) - barcha kategoriyalar
- getByParent(parentId, storeId) - ota bo'yicha
- getById(id, storeId) - kategoriya batafsili
- create(categoryData) - yangi kategoriya
- update(id, categoryData) - tahrirlash
- delete(id) - o'chirish
- reorder(updates, storeId) - qayta saralash
```

---

### **8. ordersAPI - `client/services/api.js`**

```javascript
- create(orderData) - yangi buyurtma
- getAll() - barcha buyurtmalar
- getById(id) - buyurtma batafsili
- updateStatus(id, status) - holat o'zgartirish
```

---

### **9. uploadsAPI - `client/services/api.js`**

```javascript
- upload(file, scope) - fayl yuklash
```

**Scope:** `products`, `professionals`, `stores`

---

### **10. specialtiesAPI - `client/services/api.js`**

```javascript
- getAll() - barcha mutaxassisliklar
- add(name) - yangi mutaxassislik
```

---

### **11. carBrandsAPI - `client/services/api.js`**

```javascript
- getAll() - barcha mashina brendlari
```

---

## 🛠️ UTILITY FUNKSIYALAR

### **1. Currency Utils - `client/utils/currency.js`**

```javascript
- formatCurrency(currency) - valyuta belgisi
- formatPrice(price, currency) - narx formatlash
```

**Valyuta Konvertatsiyasi:**
- USD → "$"
- UZS/so'm → "so'm"

---

### **2. Search Utils - `client/utils/searchUtils.js`**

**Lotin/Kirill Konvertatsiyasi:**
```javascript
- latinToCyrillic mapping
- cyrillicToLatin mapping
- normalizeChar() - belgi normalizatsiyasi
- charsMatch() - belgilar moslashtirish
```

---

### **3. Image URL Utils - `client/utils/imageUrl.js`**

```javascript
- getImageUrl(path) - rasm URL'ini olish
- Uploads folder handling
```

---

### **4. Favorite Animations - `client/utils/favoriteAnimations.js`**

```javascript
- playStarButtonAnimation(button, action) - yulduzcha animatsiyasi
- playNavbarFavoriteAddAnimation() - qo'shish animatsiyasi
- playNavbarFavoriteRemoveAnimation() - o'chirish animatsiyasi
```

---

### **5. Favorite Animation Registry - `client/utils/favoriteAnimationRegistry.js`**

```javascript
- setNavbarFavoriteElements() - navbar elementlarini saqlash
- getNavbarFavoriteElements() - navbar elementlarini olish
```

---

### **6. Cache Utils - `client/utils/clearCache.js`**

```javascript
- clearCache() - cache tozalash
- sessionStorage cleanup
```

---

## 🎨 DIZAYN XUSUSIYATLARI

### **Glassmorphism Design:**
- Backdrop blur effektlari
- Semi-transparent backgrounds
- Border gradients

### **Animatsiyalar:**
- Smooth transitions (300ms)
- Hover effects
- Loading skeletons
- Favorite animations

### **Responsive Design:**
- Mobile-first approach
- Tailwind CSS breakpoints
- Adaptive layouts

### **Dark Mode:**
- Theme Context bilan
- localStorage'da saqlash
- System preference support

---

## 📊 PERFORMANCE OPTIMIZATIONS

### **1. Lazy Loading:**
- IntersectionObserver bilan rasmlar
- Code splitting - React.lazy()
- Dynamic imports

### **2. Caching:**
- sessionStorage - 30 sekund
- localStorage - user ma'lumotlari
- React Query - 2 minut stale time

### **3. Debouncing:**
- Qidiruv - 300ms
- Narx filtri - 500ms

### **4. Pagination:**
- 24 ta mahsulot bosh sahifada
- 100 ta mahsulot kategoriyada
- Load more button

---

## 🔐 XAVFSIZLIK

### **Autentifikatsiya:**
- JWT tokens
- localStorage'da saqlash
- 30 kunlik auto-logout

### **Parol:**
- bcrypt shifrlash
- Server-side validation

### **CORS:**
- API headers
- x-user-id header

---

## 📱 MOBIL OPTIMIZATSIYA

### **Mobile Bottom Navigation:**
- Fixed bottom nav
- Safe area inset
- Touch-friendly buttons

### **Responsive Images:**
- Lazy loading
- Adaptive sizing
- WebP support

### **Touch Gestures:**
- Swipe navigation
- Tap handlers
- Long-press support

---

## 🚀 DEPLOYMENT

**Server:** VPS (164.68.109.208)
**Web Server:** Nginx
**Process Manager:** PM2
**SSL:** Let's Encrypt
**Domain:** avtofix.uz

---

## 📝 XULOSA

AvtoFix - zamonaviy, foydalanuvchilarga qulay va xavfsiz platforma. Barcha komponentlar modular, qayta ishlatiluvchi va test qilingan. Admin panel orqali barcha jarayonlar oson boshqariladi va real vaqtda kuzatiladi.

