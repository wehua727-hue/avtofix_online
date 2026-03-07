# AvtoFix Android App - O'rnatish va Ishga Tushirish Qo'llanmasi

## 📱 Loyiha haqida
Bu AvtoFix.uz saytining Android WebView ilovasi. Ilova saytni to'liq funksional holda Android qurilmalarda ishlashini ta'minlaydi.

## 🚀 Tezkor Boshlash

### 1. Talablar
- **Android Studio**: Flamingo yoki undan yuqori versiya
- **JDK**: 8 yoki undan yuqori
- **Minimum Android SDK**: 21 (Android 5.0)
- **Target Android SDK**: 34 (Android 14)

### 2. Loyihani Ochish

#### Usul 1: Android Studio orqali
1. Android Studio'ni oching
2. "Open" tugmasini bosing
3. `android-app` papkasini tanlang
4. "OK" tugmasini bosing
5. Gradle sync avtomatik boshlanadi (bir necha daqiqa davom etishi mumkin)

#### Usul 2: Terminal orqali
```bash
cd android-app
# Android Studio'ni ochish
studio .
```

### 3. Gradle Sync
Loyiha ochilgandan keyin:
- Android Studio avtomatik ravishda Gradle sync'ni boshlaydi
- Agar boshlanmasa: `File > Sync Project with Gradle Files`
- Birinchi marta 5-10 daqiqa davom etishi mumkin (internet tezligiga bog'liq)

### 4. Emulator Sozlash (Agar real qurilma bo'lmasa)

1. Android Studio'da: `Tools > Device Manager`
2. "Create Device" tugmasini bosing
3. Qurilma turini tanlang (masalan: Pixel 6)
4. System Image tanlang (masalan: Android 13 - API 33)
5. "Finish" tugmasini bosing

### 5. Ilovani Ishga Tushirish

#### Real qurilmada:
1. Telefoningizda Developer Options'ni yoqing:
   - `Settings > About Phone > Build Number` (7 marta bosing)
2. USB Debugging'ni yoqing:
   - `Settings > Developer Options > USB Debugging`
3. Telefonni USB orqali kompyuterga ulang
4. Android Studio'da qurilmangizni tanlang
5. "Run" tugmasini bosing (yashil uchburchak) yoki `Shift + F10`

#### Emulatorда:
1. Android Studio'da emulatorni tanlang
2. "Run" tugmasini bosing (yashil uchburchak) yoki `Shift + F10`
3. Emulator avtomatik ishga tushadi

## ✅ Test Qilish

### Asosiy Funksiyalar
- [ ] Ilova ochiladi
- [ ] Sayt to'liq yuklanadi (https://avtofix.uz)
- [ ] JavaScript ishlaydi
- [ ] Linklar app ichida ochiladi
- [ ] Back tugmasi ishlaydi
- [ ] Pull-to-refresh ishlaydi
- [ ] Internet yo'q xabari ko'rsatiladi (offline rejimda)

### Test Senariylari
1. **Asosiy yuklash**: Ilovani oching, sayt yuklanishini kuting
2. **Navigatsiya**: Sayt ichida turli sahifalarga o'ting
3. **Back tugmasi**: Orqaga qaytish ishlashini tekshiring
4. **Refresh**: Yuqoridan pastga tortib sahifani yangilang
5. **Offline**: Internet o'chiring, xabar ko'rsatilishini tekshiring

## 📦 APK/AAB Yaratish

### Debug APK (Test uchun)
```bash
cd android-app
./gradlew assembleDebug
```
Fayl joylashuvi: `app/build/outputs/apk/debug/app-debug.apk`

### Release AAB (Play Market uchun)
```bash
cd android-app
./gradlew bundleRelease
```
Fayl joylashuvi: `app/build/outputs/bundle/release/app-release.aab`

**Eslatma**: Release build uchun keystore kerak bo'ladi (imzolash uchun)

## 🔑 Keystore Yaratish (Release uchun)

```bash
keytool -genkey -v -keystore avtofix-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias avtofix
```

Keyin `app/build.gradle` fayliga qo'shing:
```gradle
android {
    signingConfigs {
        release {
            storeFile file("../avtofix-release-key.jks")
            storePassword "your_password"
            keyAlias "avtofix"
            keyPassword "your_password"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

## 🎨 Ikonka O'zgartirish

1. `app/src/main/res/mipmap-*` papkalarida `ic_launcher.png` fayllarini almashtiring
2. Yoki Android Studio'da: `File > New > Image Asset`
3. Foreground va Background rasmlarni tanlang
4. "Next" > "Finish"

## 🌐 URL O'zgartirish

Agar boshqa URL kerak bo'lsa, `MainActivity.java` faylida:
```java
private static final String WEBSITE_URL = "https://your-website.com";
```

## 🐛 Muammolarni Hal Qilish

### Gradle Sync xatosi
```bash
# Gradle cache'ni tozalash
./gradlew clean
# Qayta sync qilish
./gradlew build
```

### Emulator sekin ishlaydi
- Device Manager'da emulator sozlamalarini oching
- RAM'ni oshiring (4GB yoki ko'proq)
- Graphics: Hardware - GLES 2.0

### Internet ishlamaydi
- `AndroidManifest.xml` faylida `INTERNET` permission borligini tekshiring
- `usesCleartextTraffic="true"` qo'shilganligini tekshiring

### WebView bo'sh ko'rsatadi
- JavaScript yoqilganligini tekshiring: `webSettings.setJavaScriptEnabled(true)`
- Internet ulanishini tekshiring
- URL to'g'riligini tekshiring

## 📱 Play Market'ga Yuklash

### 1. AAB Fayl Tayyorlash
```bash
./gradlew bundleRelease
```

### 2. Play Console'ga Kirish
1. https://play.google.com/console ga kiring
2. "Create app" tugmasini bosing
3. Ilova ma'lumotlarini to'ldiring

### 3. AAB Yuklash
1. "Release" > "Production" > "Create new release"
2. AAB faylni yuklang
3. Release notes yozing
4. "Review release" > "Start rollout to Production"

### 4. Talab Qilinadigan Ma'lumotlar
- Ilova nomi: AvtoFix
- Qisqa tavsif (80 belgi)
- To'liq tavsif (4000 belgi)
- Ikonka (512x512 PNG)
- Feature graphic (1024x500 PNG)
- Screenshots (kamida 2 ta)
- Privacy Policy URL

## 🔄 Yangilanishlar

Yangi versiya chiqarish uchun:
1. `app/build.gradle` da `versionCode` va `versionName` ni oshiring
2. Yangi AAB yarating
3. Play Console'da yangi release yarating

## 📞 Yordam

Muammo yuzaga kelsa:
- Android Studio'da: `Help > Submit Feedback`
- Loyiha README.md faylini o'qing
- Stack Overflow'da qidiring

## ✨ Qo'shimcha Xususiyatlar (Keyingi Versiyalar)

- [ ] Push notifications
- [ ] Offline mode (cache)
- [ ] File download
- [ ] Camera access
- [ ] Location access
- [ ] Dark mode
- [ ] Splash screen

---

**Muvaffaqiyatlar!** 🚀
