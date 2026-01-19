import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'user_region_location';
const COORDS_STORAGE_KEY = 'user_gps_coordinates';

// Справочник viloyat -> tuman для Узбекистана
export const UZBEKISTAN_REGIONS = {
  "Toshkent shahri": [
    "Bektemir", "Chilonzor", "Mirobod", "Mirzo Ulug'bek",
    "Olmazor", "Sergeli", "Shayxontohur", "Uchtepa",
    "Yakkasaroy", "Yunusobod", "Yashnobod"
  ],
  "Toshkent viloyati": [
    "Angren", "Bekobod", "Chirchiq", "Olmaliq", "Ohangaron",
    "Bo'ka", "Bo'stonliq", "Chinoz", "Qibray", "Oqqo'rg'on",
    "Parkent", "Piskent", "Yangiyo'l", "Zangiota"
  ],
  "Andijon viloyati": [
    "Andijon", "Xonobod", "Asaka", "Baliqchi", "Bo'z",
    "Buloqboshi", "Izboskan", "Jalaquduq", "Marhamat",
    "Oltinko'l", "Paxtaobod", "Qo'rg'ontepa", "Shahrixon", "Ulug'nor"
  ],
  "Buxoro viloyati": [
    "Buxoro", "Kogon", "Olot", "G'ijduvon", "Jondor",
    "Qorako'l", "Qorovulbozor", "Peshku", "Romitan", "Shofirkon", "Vobkent"
  ],
  "Farg'ona viloyati": [
    "Farg'ona", "Marg'ilon", "Quvasoy", "Qo'qon", "Oltiariq",
    "Bag'dod", "Beshariq", "Buvayda", "Dang'ara", "Furqat",
    "Qo'shtepa", "Quva", "Rishton", "So'x", "Toshloq", "Uchko'prik"
  ],
  "Jizzax viloyati": [
    "Jizzax", "Arnasoy", "Baxmal", "Do'stlik", "Forish",
    "G'allaorol", "Mirzacho'l", "Paxtakor", "Yangiobod", "Zafarobod", "Zomin"
  ],
  "Xorazm viloyati": [
    "Urganch", "Xiva", "Bog'ot", "Gurlan", "Xonqa",
    "Hazorasp", "Qo'shko'pir", "Shovot", "Yangiariq", "Yangibozor"
  ],
  "Namangan viloyati": [
    "Namangan", "Chortoq", "Chust", "Kosonsoy", "Mingbuloq",
    "Norin", "Pop", "To'raqo'rg'on", "Uchqo'rg'on", "Uychi", "Yangiqo'rg'on"
  ],
  "Navoiy viloyati": [
    "Navoiy", "Zarafshon", "Karmana", "Konimex", "Navbahor",
    "Nurota", "Qiziltepa", "Tomdi", "Uchquduq", "Xatirchi"
  ],
  "Qashqadaryo viloyati": [
    "Qarshi", "Shahrisabz", "Chiroqchi", "Dehqonobod", "G'uzor",
    "Kasbi", "Kitob", "Koson", "Mirishkor", "Muborak", "Nishon", "Qamashi", "Yakkabog'"
  ],
  "Qoraqalpog'iston": [
    "Nukus", "Amudaryo", "Beruniy", "Chimboy", "Ellikqal'a",
    "Kegeyli", "Mo'ynoq", "Qanliko'l", "Qo'ng'irot", "Qorao'zak",
    "Shumanay", "Taxtako'pir", "To'rtko'l", "Xo'jayli"
  ],
  "Samarqand viloyati": [
    "Samarqand", "Kattaqo'rg'on", "Bulung'ur", "Ishtixon", "Jomboy",
    "Narpay", "Nurobod", "Oqdaryo", "Payariq", "Qo'shrabot", "Toyloq", "Urgut"
  ],
  "Sirdaryo viloyati": [
    "Guliston", "Yangiyer", "Shirin", "Boyovut", "Mirzaobod",
    "Oqoltin", "Sardoba", "Sayxunobod", "Sirdaryo", "Xovos"
  ],
  "Surxondaryo viloyati": [
    "Termiz", "Angor", "Bandixon", "Boysun", "Denov",
    "Jarqo'rg'on", "Muzrabot", "Oltinsoy", "Qiziriq", "Qumqo'rg'on",
    "Sariosiyo", "Sherobod", "Sho'rchi", "Uzun"
  ]
};

export const VILOYAT_LIST = Object.keys(UZBEKISTAN_REGIONS);

// Нормализация названия для сравнения
const normalizeLocationName = (str) => {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/\s+viloyati$/i, '')
    .replace(/\s+shahri$/i, '')
    .replace(/\s+tumani$/i, '')
    .replace(/\s+respublikasi$/i, '')
    .trim();
};

// Альтернативные названия для поиска (английский, русский, узбекский варианты)
const LOCATION_ALIASES = {
  // Buxoro viloyati
  "gijduvan": "G'ijduvon",
  "g'ijduvon": "G'ijduvon",
  "ghijduvon": "G'ijduvon",
  "gʻijduvon": "G'ijduvon",
  "гиждуван": "G'ijduvon",
  "bukhara": "Buxoro",
  "buxoro": "Buxoro",
  "бухара": "Buxoro",
  "kogon": "Kogon",
  "kagan": "Kogon",
  "каган": "Kogon",
  "vobkent": "Vobkent",
  "вабкент": "Vobkent",
  "shofirkon": "Shofirkon",
  "шафиркан": "Shofirkon",
  "romitan": "Romitan",
  "ромитан": "Romitan",
  "jondor": "Jondor",
  "жондор": "Jondor",
  "olot": "Olot",
  "алат": "Olot",
  "peshku": "Peshku",
  "пешку": "Peshku",
  "qorako'l": "Qorako'l",
  "каракуль": "Qorako'l",
  "qorovulbozor": "Qorovulbozor",
  
  // Samarqand viloyati
  "samarkand": "Samarqand",
  "samarqand": "Samarqand",
  "самарканд": "Samarqand",
  "urgut": "Urgut",
  "ургут": "Urgut",
  "kattaqo'rg'on": "Kattaqo'rg'on",
  "kattakurgan": "Kattaqo'rg'on",
  "каттакурган": "Kattaqo'rg'on",
  "ishtixon": "Ishtixon",
  "иштихан": "Ishtixon",
  "jomboy": "Jomboy",
  "джамбай": "Jomboy",
  "nurobod": "Nurobod",
  "нуробод": "Nurobod",
  "payariq": "Payariq",
  "пайарык": "Payariq",
  "bulung'ur": "Bulung'ur",
  "булунгур": "Bulung'ur",
  
  // Toshkent
  "tashkent": "Toshkent shahri",
  "toshkent": "Toshkent shahri",
  "toshkent shahri": "Toshkent shahri",
  "tashkent city": "Toshkent shahri",
  "ташкент": "Toshkent shahri",
  "город ташкент": "Toshkent shahri",
  "chilanzar": "Chilonzor",
  "chilonzor": "Chilonzor",
  "чиланзар": "Chilonzor",
  "yunusabad": "Yunusobod",
  "yunusobod": "Yunusobod",
  "юнусабад": "Yunusobod",
  "sergeli": "Sergeli",
  "сергели": "Sergeli",
  "mirabad": "Mirobod",
  "mirobod": "Mirobod",
  "мирабад": "Mirobod",
  
  // Viloyatlar
  "bukhara region": "Buxoro viloyati",
  "bukhara province": "Buxoro viloyati",
  "buxoro viloyati": "Buxoro viloyati",
  "buxoro": "Buxoro viloyati",
  "bukhara": "Buxoro viloyati",
  "бухарская область": "Buxoro viloyati",
  "samarkand region": "Samarqand viloyati",
  "samarkand province": "Samarqand viloyati",
  "samarqand viloyati": "Samarqand viloyati",
  "samarqand": "Samarqand viloyati",
  "samarkand": "Samarqand viloyati",
  "самаркандская область": "Samarqand viloyati",
  "tashkent region": "Toshkent viloyati",
  "tashkent province": "Toshkent viloyati",
  "toshkent viloyati": "Toshkent viloyati",
  "ташкентская область": "Toshkent viloyati",
  // Boshqa viloyatlar
  "andijon viloyati": "Andijon viloyati",
  "andijan region": "Andijon viloyati",
  "farg'ona viloyati": "Farg'ona viloyati",
  "fergana region": "Farg'ona viloyati",
  "namangan viloyati": "Namangan viloyati",
  "namangan region": "Namangan viloyati",
  "jizzax viloyati": "Jizzax viloyati",
  "jizzakh region": "Jizzax viloyati",
  "sirdaryo viloyati": "Sirdaryo viloyati",
  "syrdarya region": "Sirdaryo viloyati",
  "qashqadaryo viloyati": "Qashqadaryo viloyati",
  "kashkadarya region": "Qashqadaryo viloyati",
  "surxondaryo viloyati": "Surxondaryo viloyati",
  "surkhandarya region": "Surxondaryo viloyati",
  "navoiy viloyati": "Navoiy viloyati",
  "navoi region": "Navoiy viloyati",
  "xorazm viloyati": "Xorazm viloyati",
  "khorezm region": "Xorazm viloyati",
  "qoraqalpog'iston": "Qoraqalpog'iston",
  "karakalpakstan": "Qoraqalpog'iston",
};

// Поиск viloyat и tuman по названию города/региона
const findViloyatByCity = (cityName, regionName) => {
  if (!cityName && !regionName) return null;
  
  const searchTerms = [cityName, regionName].filter(Boolean);
  const normalizedTerms = searchTerms.map(normalizeLocationName);
  
  // Сначала проверяем алиасы
  for (const term of searchTerms) {
    const termLower = (term || '').toLowerCase().trim();
    const alias = LOCATION_ALIASES[termLower];
    if (alias) {
      // Проверяем, это viloyat или tuman
      for (const [viloyat, tumans] of Object.entries(UZBEKISTAN_REGIONS)) {
        if (alias === viloyat || normalizeLocationName(alias) === normalizeLocationName(viloyat)) {
          return { viloyat, tuman: null };
        }
        for (const tuman of tumans) {
          if (alias === tuman || normalizeLocationName(alias) === normalizeLocationName(tuman)) {
            return { viloyat, tuman };
          }
        }
      }
    }
  }
  
  // Сначала ищем точное совпадение с tuman (более точный результат)
  for (const [viloyat, tumans] of Object.entries(UZBEKISTAN_REGIONS)) {
    for (const tuman of tumans) {
      const tumanNorm = normalizeLocationName(tuman);
      for (const term of normalizedTerms) {
        // Точное совпадение с городом
        if (tumanNorm === term || term === tumanNorm) {
          return { viloyat, tuman };
        }
      }
    }
  }

  // Потом ищем частичное совпадение с tuman
  for (const [viloyat, tumans] of Object.entries(UZBEKISTAN_REGIONS)) {
    for (const tuman of tumans) {
      const tumanNorm = normalizeLocationName(tuman);
      for (const term of normalizedTerms) {
        if (tumanNorm.includes(term) || term.includes(tumanNorm)) {
          return { viloyat, tuman };
        }
      }
    }
  }
  
  // Если tuman не найден — ищем по viloyat
  for (const [viloyat] of Object.entries(UZBEKISTAN_REGIONS)) {
    const viloyatNorm = normalizeLocationName(viloyat);
    for (const term of normalizedTerms) {
      if (viloyatNorm.includes(term) || term.includes(viloyatNorm.replace(' viloyati', ''))) {
        return { viloyat, tuman: null };
      }
    }
  }
  
  return null;
};

const useRegionLocation = () => {
  const [location, setLocation] = useState(null);
  const [coordinates, setCoordinates] = useState(null); // GPS koordinatalari
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Загрузка сохранённой локации
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.viloyat) {
          setLocation(parsed);
        }
      }
      // GPS koordinatalarini yuklash
      const savedCoords = localStorage.getItem(COORDS_STORAGE_KEY);
      if (savedCoords) {
        const parsedCoords = JSON.parse(savedCoords);
        if (parsedCoords.latitude && parsedCoords.longitude) {
          setCoordinates(parsedCoords);
        }
      }
    } catch (e) {
      console.warn('Failed to load saved region:', e);
    }
  }, []);

  // Сохранение локации
  const saveLocation = useCallback((loc) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    } catch (e) {
      console.warn('Failed to save region:', e);
    }
  }, []);

  // GPS koordinatalarini saqlash
  const saveCoordinates = useCallback((coords) => {
    try {
      localStorage.setItem(COORDS_STORAGE_KEY, JSON.stringify(coords));
    } catch (e) {
      console.warn('Failed to save coordinates:', e);
    }
  }, []);

  // Определение региона через GPS + reverse geocoding (точное)
  const detectRegion = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Сначала пробуем GPS
    if (navigator.geolocation) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 0,
          });
        });

        const { latitude, longitude, accuracy } = position.coords;
        console.log('GPS coordinates:', latitude, longitude, 'accuracy:', accuracy, 'm');
        
        // GPS aniqligini tekshirish - 10km dan kam bo'lsa aniq hisoblanadi
        const isAccurateGPS = accuracy < 10000; // 10km
        
        // GPS koordinatalarini saqlash (faqat aniq bo'lsa)
        if (isAccurateGPS) {
          const newCoords = { latitude, longitude, accuracy, source: 'gps', timestamp: Date.now() };
          setCoordinates(newCoords);
          saveCoordinates(newCoords);
        } else {
          console.log('GPS accuracy too low:', accuracy, 'm - not saving coordinates');
        }

        // Reverse geocoding через Nominatim (бесплатный)
        try {
          // zoom=18 - eng aniq natija uchun (qishloq darajasida)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=uz,ru,en`,
            {
              headers: {
                'User-Agent': 'AvtoFix/1.0',
              },
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            console.log('Nominatim result:', data);
            
            const address = data.address || {};
            
            // Tuman/shahar uchun barcha mumkin bo'lgan maydonlar
            const possibleDistricts = [
              address.county,        // Tuman (eng ko'p ishlatiladi)
              address.city_district, // Shahar tumani
              address.district,      // Tuman
              address.municipality,  // Shahar/tuman
              address.city,          // Shahar
              address.town,          // Shaharcha
            ].filter(Boolean);
            
            // Qishloq/mahalla uchun
            const possibleVillages = [
              address.village,       // Qishloq
              address.hamlet,        // Kichik qishloq
              address.suburb,        // Shahar atrofi
              address.neighbourhood, // Mahalla
              address.residential,   // Turar joy
            ].filter(Boolean);
            
            // Viloyat uchun
            const possibleRegions = [
              address.state,         // Viloyat
              address.region,        // Region
              address.province,      // Province
            ].filter(Boolean);
            
            console.log('Parsed location:', { 
              districts: possibleDistricts, 
              villages: possibleVillages,
              regions: possibleRegions,
              fullAddress: address
            });
            
            // Birinchi navbatda tuman bo'yicha qidiramiz
            for (const district of possibleDistricts) {
              for (const region of [...possibleRegions, '']) {
                const found = findViloyatByCity(district, region);
                if (found) {
                  // Qishloq nomini ham qo'shamiz agar mavjud bo'lsa
                  const villageName = possibleVillages[0] || null;
                  const newLocation = {
                    viloyat: found.viloyat,
                    tuman: found.tuman,
                    qishloq: villageName,
                    source: 'gps',
                  };
                  setLocation(newLocation);
                  saveLocation(newLocation);
                  setLoading(false);
                  return newLocation;
                }
              }
            }
            
            // Agar tuman topilmasa, qishloq bo'yicha qidiramiz
            for (const village of possibleVillages) {
              for (const region of [...possibleRegions, '']) {
                const found = findViloyatByCity(village, region);
                if (found) {
                  const newLocation = {
                    viloyat: found.viloyat,
                    tuman: found.tuman,
                    qishloq: village,
                    source: 'gps',
                  };
                  setLocation(newLocation);
                  saveLocation(newLocation);
                  setLoading(false);
                  return newLocation;
                }
              }
            }
            
            // Agar hech narsa topilmasa, faqat viloyat bo'yicha
            for (const region of possibleRegions) {
              const found = findViloyatByCity('', region);
              if (found) {
                const newLocation = {
                  viloyat: found.viloyat,
                  tuman: found.tuman,
                  source: 'gps',
                };
                setLocation(newLocation);
                saveLocation(newLocation);
                setLoading(false);
                return newLocation;
              }
            }
          }
        } catch (geoError) {
          console.warn('Reverse geocoding failed:', geoError);
        }
      } catch (gpsError) {
        console.warn('GPS failed:', gpsError.message);
      }
    }

    // Fallback на IP API если GPS не сработал
    const apis = [
      {
        url: 'https://ipapi.co/json/',
        parse: (data) => ({ city: data.city, region: data.region, country: data.country_name }),
      },
      {
        url: 'https://ip-api.com/json/?fields=city,regionName,country',
        parse: (data) => ({ city: data.city, region: data.regionName, country: data.country }),
      },
      {
        url: 'https://ipwho.is/',
        parse: (data) => ({ city: data.city, region: data.region, country: data.country }),
      },
      {
        url: 'https://freeipapi.com/api/json',
        parse: (data) => ({ city: data.cityName, region: data.regionName, country: data.countryName }),
      },
    ];

    for (const api of apis) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(api.url, { 
          signal: controller.signal,
          mode: 'cors',
          headers: {
            'Accept': 'application/json',
          }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn(`API ${api.url} returned status ${response.status}`);
          continue;
        }

        const data = await response.json();
        const parsed = api.parse(data);
        
        console.log(`IP API ${api.url} result:`, parsed);

        // Проверяем что это Узбекистан
        const isUzbekistan = parsed.country && (
          parsed.country.toLowerCase().includes('uzbekistan') ||
          parsed.country.toLowerCase().includes('o\'zbekiston') ||
          parsed.country.toLowerCase() === 'uz'
        );

        if (parsed.city || parsed.region) {
          const found = findViloyatByCity(parsed.city, parsed.region);
          if (found) {
            const newLocation = {
              viloyat: found.viloyat,
              tuman: found.tuman,
              source: 'ip',
            };
            setLocation(newLocation);
            saveLocation(newLocation);
            setLoading(false);
            return newLocation;
          } else if (isUzbekistan) {
            // Если страна Узбекистан, но город не найден - ставим Ташкент по умолчанию
            console.log("Country is Uzbekistan but city not found, defaulting to Tashkent");
            const defaultLocation = {
              viloyat: "Toshkent shahri",
              tuman: null,
              source: 'ip-default',
            };
            setLocation(defaultLocation);
            saveLocation(defaultLocation);
            setLoading(false);
            return defaultLocation;
          }
        }
      } catch (e) {
        console.warn(`IP API ${api.url} failed:`, e.message);
        continue;
      }
    }

    // Если все API не сработали - ставим Ташкент по умолчанию
    console.log("All APIs failed, defaulting to Tashkent");
    const defaultLocation = {
      viloyat: "Toshkent shahri",
      tuman: null,
      source: 'default',
    };
    setLocation(defaultLocation);
    saveLocation(defaultLocation);
    setLoading(false);
    return defaultLocation;
  }, [saveLocation, saveCoordinates]);

  // Ручная установка региона
  const setManualLocation = useCallback((viloyat, tuman = null) => {
    const newLocation = {
      viloyat,
      tuman,
      source: 'manual',
    };
    setLocation(newLocation);
    saveLocation(newLocation);
    setError(null);
    return newLocation;
  }, [saveLocation]);

  // Очистка
  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear region:', e);
    }
  }, []);

  // Автоопределение при первой загрузке
  // forceGPS = true - всегда пробовать GPS даже если есть сохранённый регион
  const autoDetect = useCallback(async (forceGPS = false) => {
    // Если есть сохранённый регион и он был определён через GPS - используем его
    if (location && !forceGPS) {
      // Если регион был определён через IP или default - пробуем GPS
      if (location.source === 'gps' || location.source === 'manual') {
        return location;
      }
      // Для IP/default источников - пробуем GPS в фоне
      detectRegion();
      return location;
    }
    return await detectRegion();
  }, [location, detectRegion]);

  return {
    location,
    coordinates,
    loading,
    error,
    detectRegion,
    setManualLocation,
    clearLocation,
    autoDetect,
  };
};

// Haversine formulasi - ikki nuqta orasidagi masofani hisoblash (km)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  
  const R = 6371; // Yer radiusi km da
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// GPS koordinatalari bo'yicha ustalarni saralash (yaqindan uzoqqa)
export const sortByDistance = (professionals, userCoordinates, userLocation = null) => {
  if (!userCoordinates?.latitude || !userCoordinates?.longitude) {
    // GPS yo'q - manzil bo'yicha saralash
    if (userLocation?.viloyat) {
      return sortByAddressMatch(professionals, userLocation);
    }
    return professionals;
  }

  const userViloyat = userLocation?.viloyat ? normalizeLocationName(userLocation.viloyat) : null;
  const userTuman = userLocation?.tuman ? normalizeLocationName(userLocation.tuman) : null;
  const userQishloq = userLocation?.qishloq ? normalizeLocationName(userLocation.qishloq) : null;

  // Har bir ustaning masofasini va manzil mosligini hisoblash
  const withDistance = professionals.map(p => {
    const dist = calculateDistance(
      userCoordinates.latitude,
      userCoordinates.longitude,
      p.latitude,
      p.longitude
    );
    
    // Manzil mosligini tekshirish
    const pAddress = normalizeLocationName(p.address || '');
    let addressScore = 0;
    
    if (userQishloq && pAddress.includes(userQishloq)) {
      addressScore = 3; // Qishloq mos - eng yuqori
    } else if (userTuman && pAddress.includes(userTuman)) {
      addressScore = 2; // Tuman mos
    } else if (userViloyat && pAddress.includes(userViloyat)) {
      addressScore = 1; // Viloyat mos
    }
    
    return { ...p, _distance: dist, _addressScore: addressScore };
  });

  // Saralash: avval manzil bo'yicha, keyin masofa bo'yicha
  return withDistance.sort((a, b) => {
    // Agar ikkalasida ham koordinata yo'q bo'lsa - manzil bo'yicha
    if (a._distance === Infinity && b._distance === Infinity) {
      // Manzil skori bo'yicha (yuqori = yaxshi)
      if (a._addressScore !== b._addressScore) {
        return b._addressScore - a._addressScore;
      }
      return (b.rating || 0) - (a.rating || 0);
    }
    
    // Koordinatasi bor ustalar birinchi, lekin manzil mos kelsa ham yuqori
    if (a._distance === Infinity) {
      // a ning koordinatasi yo'q, lekin manzili mos kelsa
      if (a._addressScore >= 2) return -1; // Tuman yoki qishloq mos
      return 1;
    }
    if (b._distance === Infinity) {
      if (b._addressScore >= 2) return 1;
      return -1;
    }
    
    // Ikkalasida ham koordinata bor - masofa bo'yicha
    return a._distance - b._distance;
  });
};

// Manzil matni bo'yicha ustalarni saralash (viloyat/tuman mos kelsa birinchi)
export const sortByAddressMatch = (professionals, userLocation) => {
  if (!userLocation?.viloyat) return professionals;
  
  const userViloyat = normalizeLocationName(userLocation.viloyat);
  const userTuman = userLocation.tuman ? normalizeLocationName(userLocation.tuman) : null;
  const userQishloq = userLocation.qishloq ? normalizeLocationName(userLocation.qishloq) : null;
  
  return [...professionals].sort((a, b) => {
    // Ustaning manzilini tekshirish
    const aAddress = normalizeLocationName(a.address || '');
    const bAddress = normalizeLocationName(b.address || '');
    
    // Qishloq mos kelsa - eng yuqori prioritet
    if (userQishloq) {
      const aHasQishloq = aAddress.includes(userQishloq);
      const bHasQishloq = bAddress.includes(userQishloq);
      if (aHasQishloq && !bHasQishloq) return -1;
      if (!aHasQishloq && bHasQishloq) return 1;
    }
    
    // Tuman mos kelsa
    if (userTuman) {
      const aHasTuman = aAddress.includes(userTuman);
      const bHasTuman = bAddress.includes(userTuman);
      if (aHasTuman && !bHasTuman) return -1;
      if (!aHasTuman && bHasTuman) return 1;
    }
    
    // Viloyat mos kelsa
    const aHasViloyat = aAddress.includes(userViloyat);
    const bHasViloyat = bAddress.includes(userViloyat);
    if (aHasViloyat && !bHasViloyat) return -1;
    if (!aHasViloyat && bHasViloyat) return 1;
    
    // Aks holda reyting bo'yicha
    return (b.rating || 0) - (a.rating || 0);
  });
};

// Функция сортировки работников по близости региона (eski usul - fallback)
export const sortByRegionProximity = (professionals, userLocation, userCoordinates = null) => {
  // Agar GPS koordinatalari mavjud bo'lsa, ulardan foydalanamiz
  if (userCoordinates?.latitude && userCoordinates?.longitude) {
    return sortByDistance(professionals, userCoordinates);
  }
  
  if (!userLocation?.viloyat) return professionals;

  const userViloyat = normalizeLocationName(userLocation.viloyat);
  const userTuman = userLocation.tuman ? normalizeLocationName(userLocation.tuman) : null;

  return [...professionals].sort((a, b) => {
    const aViloyat = normalizeLocationName(a.region);
    const aTuman = normalizeLocationName(a.district);
    const bViloyat = normalizeLocationName(b.region);
    const bTuman = normalizeLocationName(b.district);

    // Приоритет 1: тот же tuman
    const aSameTuman = userTuman && aTuman && (aTuman.includes(userTuman) || userTuman.includes(aTuman));
    const bSameTuman = userTuman && bTuman && (bTuman.includes(userTuman) || userTuman.includes(bTuman));
    
    if (aSameTuman && !bSameTuman) return -1;
    if (!aSameTuman && bSameTuman) return 1;

    // Приоритет 2: та же viloyat
    const aSameViloyat = aViloyat && (aViloyat.includes(userViloyat) || userViloyat.includes(aViloyat));
    const bSameViloyat = bViloyat && (bViloyat.includes(userViloyat) || userViloyat.includes(bViloyat));
    
    if (aSameViloyat && !bSameViloyat) return -1;
    if (!aSameViloyat && bSameViloyat) return 1;

    // Приоритет 3: по рейтингу
    return (b.rating || 0) - (a.rating || 0);
  });
};

export default useRegionLocation;
