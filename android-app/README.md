# AvtoFix Android App

Bu AvtoFix.uz saytining Android WebView ilovasi.

## Loyiha haqida
- **Maqsad**: AvtoFix.uz saytini Android ilovasi sifatida taqdim etish
- **Texnologiya**: Android WebView
- **URL**: https://avtofix.uz

## Qanday ishlatish

### 1. Android Studio'da ochish
1. Android Studio'ni oching
2. "Open an Existing Project" tugmasini bosing
3. `android-app` papkasini tanlang

### 2. Ilova sozlamalari
- **Minimum SDK**: 21 (Android 5.0)
- **Target SDK**: 34 (Android 14)
- **Language**: Java

### 3. Ishga tushirish
1. Android Studio'da "Run" tugmasini bosing
2. Emulator yoki real qurilmani tanlang
3. Ilova avtomatik o'rnatiladi va ishga tushadi

## Xususiyatlar
✅ Saytni to'liq yuklash
✅ JavaScript qo'llab-quvvatlash
✅ Back button ishlashi
✅ Internet orqali real vaqt yangilanishlar
✅ Offline xabar ko'rsatish
✅ Pull-to-refresh funksiyasi

## Play Market'ga yuklash
AAB fayl yaratish uchun:
```bash
./gradlew bundleRelease
```

Tayyor AAB fayl: `app/build/outputs/bundle/release/app-release.aab`
