import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { professionalsAPI } from "@/services/api";
import { Phone, Home, Wrench, ArrowUpRight, MapPin, X, Clock, Navigation, Crosshair, Loader2, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useRegionLocation, { sortByRegionProximity, sortByDistance, calculateDistance } from "@/hooks/useRegionLocation";

const INITIAL_ITEMS = 50;
const LOAD_MORE_COUNT = 30;

const Professionals = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const regionParam = searchParams.get("region");
  const districtParam = searchParams.get("district");

  const [filteredProfessionals, setFilteredProfessionals] = useState([]);
  const [displayedProfessionals, setDisplayedProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [addressInput, setAddressInput] = useState(""); // Qo'lda kiritilgan manzil
  const [gpsLoading, setGpsLoading] = useState(false);
  const [detectedAddress, setDetectedAddress] = useState(""); // GPS orqali aniqlangan manzil
  const [isFiltering, setIsFiltering] = useState(false); // Filterlash faolmi
  
  // Геолокация по региону va GPS koordinatalari
  const { 
    location: userRegion, 
    coordinates: userCoordinates,
    detectRegion, 
    setManualLocation, 
    clearLocation
  } = useRegionLocation();

  // GPS orqali manzilni aniqlash
  const handleGpsDetect = useCallback(async () => {
    setGpsLoading(true);
    try {
      if (!navigator.geolocation) {
        alert("Brauzeringiz GPS ni qo'llab-quvvatlamaydi");
        return;
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;

      // Nominatim orqali manzilni aniqlash
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=uz,ru,en`,
        { headers: { 'User-Agent': 'AvtoFix/1.0' } }
      );

      if (response.ok) {
        const data = await response.json();
        const address = data.address || {};
        
        // Manzil qismlarini yig'ish
        const parts = [];
        if (address.country) parts.push(address.country);
        if (address.state) parts.push(address.state);
        if (address.county) parts.push(address.county);
        if (address.city || address.town) parts.push(address.city || address.town);
        if (address.village || address.hamlet) parts.push(address.village || address.hamlet);
        if (address.suburb || address.neighbourhood) parts.push(address.suburb || address.neighbourhood);
        if (address.road) parts.push(address.road);
        if (address.house_number) parts.push(address.house_number);
        
        const fullAddress = parts.join(", ");
        setAddressInput(fullAddress);
        setDetectedAddress(fullAddress);
        setIsFiltering(true); // Filterlashni yoqish
        
        // useRegionLocation hook orqali ham aniqlash (filterlash uchun)
        await detectRegion();
      }
    } catch (error) {
      console.error("GPS xatosi:", error);
      alert("Joylashuvni aniqlab bo'lmadi. Iltimos, qo'lda kiriting.");
    } finally {
      setGpsLoading(false);
    }
  }, [detectRegion]);

  // Qo'lda kiritilgan manzil bo'yicha qidirish
  const handleManualSearch = useCallback(() => {
    if (!addressInput.trim()) {
      clearLocation();
      setDetectedAddress("");
      return;
    }
    
    // Manzilni parse qilish va location o'rnatish
    const parts = addressInput.toLowerCase();
    
    // Viloyatni topish
    const viloyatlar = [
      "toshkent", "samarqand", "buxoro", "farg'ona", "andijon", 
      "namangan", "qashqadaryo", "surxondaryo", "jizzax", "sirdaryo",
      "navoiy", "xorazm", "qoraqalpog'iston"
    ];
    
    let foundViloyat = null;
    for (const v of viloyatlar) {
      if (parts.includes(v)) {
        foundViloyat = v.charAt(0).toUpperCase() + v.slice(1);
        if (v === "toshkent") foundViloyat = "Toshkent shahri";
        else foundViloyat = foundViloyat + " viloyati";
        break;
      }
    }
    
    if (foundViloyat) {
      setManualLocation(foundViloyat, null);
    }
    setDetectedAddress(addressInput);
    setIsFiltering(true); // Filterlashni yoqish
  }, [addressInput, setManualLocation, clearLocation]);

  // Manzilni tozalash
  const handleClearAddress = useCallback(() => {
    setAddressInput("");
    setDetectedAddress("");
    setIsFiltering(false); // Filterlashni o'chirish
    clearLocation();
  }, [clearLocation]);

  // Yo'l ko'rsatish funksiyasi
  const handleGetDirections = useCallback((professional) => {
    if (!professional?.latitude || !professional?.longitude) {
      alert("Ustaning joylashuvi noma'lum");
      return;
    }

    if (userCoordinates?.latitude && userCoordinates?.longitude) {
      // Foydalanuvchi joylashuvi ma'lum - yo'l ko'rsatish
      const url = `https://www.google.com/maps/dir/${userCoordinates.latitude},${userCoordinates.longitude}/${professional.latitude},${professional.longitude}`;
      window.open(url, '_blank');
    } else {
      // Foydalanuvchi joylashuvi noma'lum - faqat manzilni ko'rsatish
      const url = `https://www.google.com/maps?q=${professional.latitude},${professional.longitude}`;
      window.open(url, '_blank');
    }
  }, [userCoordinates]);

  // Загрузка мастеров
  useEffect(() => {
    const fetchProfessionals = async () => {
      setLoading(true);
      try {
        const professionalsRes = await professionalsAPI.getAll({ limit: 100 });
        const allProfessionals = professionalsRes.professionals || professionalsRes;

        let filtered = allProfessionals;

        // Функция для нормализации названия (убираем "viloyati", "shahri", "tumani")
        const normalizeLocation = (str) => {
          if (!str) return '';
          return str.toLowerCase()
            .replace(/\s+viloyati$/i, '')
            .replace(/\s+shahri$/i, '')
            .replace(/\s+tumani$/i, '')
            .trim();
        };

        // Функция для сравнения локаций
        const matchesLocation = (profValue, filterValue) => {
          if (!filterValue) return true;
          if (!profValue) return false;
          const profNorm = normalizeLocation(profValue);
          const filterNorm = normalizeLocation(filterValue);
          return profNorm === filterNorm || 
                 profNorm.includes(filterNorm) || 
                 filterNorm.includes(profNorm);
        };

        // Фильтрация по региону
        if (regionParam) {
          filtered = filtered.filter((p) => matchesLocation(p.region, regionParam));
        }

        // Фильтрация по району
        if (districtParam) {
          filtered = filtered.filter((p) => matchesLocation(p.district, districtParam));
        }

        setFilteredProfessionals(filtered);
        setDisplayedProfessionals(filtered.slice(0, INITIAL_ITEMS));
      } catch (error) {
        console.error("Error fetching professionals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfessionals();
  }, [regionParam, districtParam]);

  // Manzil bo'yicha filterlash funksiyasi - barcha belgilarni normallashtirish
  const normalizeForMatch = useCallback((str) => {
    if (!str) return '';
    return str.toLowerCase()
      // Viloyat, shahri, tumani so'zlarini olib tashlash
      .replace(/viloyati/gi, '')
      .replace(/shahri/gi, '')
      .replace(/tumani/gi, '')
      // Turli apostrof belgilarini birlashtirish
      .replace(/['`'ʻʼ'']/g, "'")
      // G' va g' ni g' ga o'zgartirish
      .replace(/g['`'ʻʼ'']/gi, "g'")
      // O' va o' ni o' ga o'zgartirish  
      .replace(/o['`'ʻʼ'']/gi, "o'")
      // Tinish belgilarini bo'shliqqa almashtirish
      .replace(/[,.\-:;]/g, ' ')
      // Ko'p bo'shliqlarni bitta qilish
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  // Manzil bo'yicha filterlangan ustalar
  const locationFilteredProfessionals = useMemo(() => {
    // Agar filteredProfessionals bo'sh bo'lsa, bo'sh array qaytarish
    if (!filteredProfessionals || filteredProfessionals.length === 0) {
      return [];
    }
    
    // Qidiruv matnini olish
    const rawSearchText = addressInput.trim();
    
    // Agar qidiruv matni bo'sh bo'lsa va GPS yo'q yoki filterlash o'chirilgan - barcha ustalar
    if ((!rawSearchText && !userCoordinates?.latitude) || !isFiltering) {
      return filteredProfessionals;
    }

    const searchText = normalizeForMatch(rawSearchText);

    // Ustalarni filterlash
    const filtered = filteredProfessionals.filter((pro) => {
      const proAddress = normalizeForMatch(pro.address || '');
      const proRegion = normalizeForMatch(pro.region || '');
      const proDistrict = normalizeForMatch(pro.district || '');
      
      // Ustaning barcha manzil ma'lumotlarini birlashtirish
      const fullProLocation = `${proAddress} ${proRegion} ${proDistrict}`.trim();
      
      // Agar usta manzili bo'sh bo'lsa - ko'rsatmaslik
      if (!fullProLocation) {
        return false;
      }
      
      // 1. Faqat GPS koordinatalari bo'yicha qidirish (manzil matni yo'q)
      if (!searchText && userCoordinates?.latitude && userCoordinates?.longitude) {
        // Agar ustaning GPS koordinatalari bor bo'lsa
        if (pro.latitude && pro.longitude) {
          const distance = calculateDistance(
            userCoordinates.latitude,
            userCoordinates.longitude,
            pro.latitude,
            pro.longitude
          );
          return distance <= 20; // 20km radius
        }
        return false; // GPS yo'q - ko'rsatmaslik
      }
      
      // 2. Manzil matni bo'yicha qidirish
      if (searchText) {
        // Qidiruv matnini so'zlarga ajratish (2 ta belgidan katta)
        const searchWords = searchText.split(/\s+/).filter(w => w.length >= 2);
        
        if (searchWords.length === 0) {
          return false;
        }
        
        // Umumiy so'zlarni olib tashlash (bular hammada bor)
        const skipWords = [
          "o'zbekiston", "uzbekiston", "viloyati", "tumani", "shahri", 
          "respublikasi", "shahar", "qishloq", "mahalla", "ko'cha",
          "viloyat", "tuman", "shaharcha"
        ];
        
        // Muhim so'zlar - umumiy so'zlardan tashqari
        const importantSearchWords = searchWords.filter(w => !skipWords.includes(w));
        
        // Agar muhim so'zlar yo'q bo'lsa - hech kimni ko'rsatmaslik
        if (importantSearchWords.length === 0) {
          return false;
        }
        
        // BARCHA muhim so'zlar mos kelishi kerak
        for (const sw of importantSearchWords) {
          if (!fullProLocation.includes(sw)) {
            return false;
          }
        }
        
        return true;
      }
      
      return false;
    });

    return filtered;
  }, [filteredProfessionals, addressInput, userCoordinates, isFiltering, normalizeForMatch]);

  // Topilgan ustalar soni
  const matchedCount = useMemo(() => {
    return locationFilteredProfessionals.length;
  }, [locationFilteredProfessionals]);
  
  // Qidiruv faolmi
  const isSearchActive = isFiltering;

  // Сортировка по близости (GPS koordinatalari yoki region/manzil bo'yicha)
  const sortedProfessionals = useMemo(() => {
    // Agar locationFilteredProfessionals bo'sh bo'lsa, filteredProfessionals dan foydalanish
    const professionalsToSort = (locationFilteredProfessionals && locationFilteredProfessionals.length > 0)
      ? locationFilteredProfessionals 
      : filteredProfessionals || [];
    
    if (!professionalsToSort || professionalsToSort.length === 0) {
      return [];
    }
    
    // Agar GPS koordinatalari mavjud bo'lsa, masofa va manzil bo'yicha saralash
    if (userCoordinates?.latitude && userCoordinates?.longitude) {
      return sortByDistance(professionalsToSort, userCoordinates, userRegion);
    }
    // Aks holda region/manzil bo'yicha
    if (userRegion?.viloyat) {
      return sortByRegionProximity(professionalsToSort, userRegion, userCoordinates);
    }
    // Hech narsa yo'q - reyting bo'yicha
    return [...professionalsToSort].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }, [locationFilteredProfessionals, filteredProfessionals, userRegion, userCoordinates]);

  // Обновление отображаемых при изменении сортировки
  useEffect(() => {
    setDisplayedProfessionals(sortedProfessionals.slice(0, INITIAL_ITEMS));
  }, [sortedProfessionals]);

  const loadMore = useCallback(() => {
    setLoadingMore(true);
    setTimeout(() => {
      const currentCount = displayedProfessionals.length;
      const nextItems = sortedProfessionals.slice(0, currentCount + LOAD_MORE_COUNT);
      setDisplayedProfessionals(nextItems);
      setLoadingMore(false);
    }, 100);
  }, [displayedProfessionals.length, sortedProfessionals]);

  const hasMore = displayedProfessionals.length < sortedProfessionals.length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Wrench className="w-6 h-6 text-emerald-500 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-gray-900 dark:text-white pb-20 sm:pb-0 transition-colors duration-300">
      {/* Background decorations */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-24">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-6 flex-wrap px-4 py-3 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-gray-200/50 dark:border-white/10">
          <Link
            to="/"
            className="text-gray-500 dark:text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 flex items-center gap-1.5 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Bosh sahifa</span>
          </Link>
          <span className="text-gray-400 dark:text-gray-600">›</span>
          <span className="font-medium text-gray-900 dark:text-white">Ustalar</span>
        </nav>

        {/* Manzil kiritish va GPS */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Manzil input */}
            <div className="relative flex-1">
              <input
                type="text"
                value={addressInput}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setAddressInput(newValue);
                  // Agar input tozalansa, filterlashni o'chirish
                  if (!newValue.trim()) {
                    setIsFiltering(false);
                    clearLocation();
                    setDetectedAddress("");
                  }
                }}
                onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                placeholder="Manzilni kiriting yoki GPS orqali aniqlang..."
                className="w-full px-4 py-3 pr-24 rounded-xl border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
              />
              
              {/* Tugmalar */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {/* Tozalash tugmasi */}
                {addressInput && (
                  <button
                    onClick={handleClearAddress}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    title="Tozalash"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                
                {/* GPS tugmasi */}
                <button
                  onClick={handleGpsDetect}
                  disabled={gpsLoading}
                  className="p-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="GPS orqali aniqlash"
                >
                  {gpsLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Crosshair className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Qidirish tugmasi */}
            <button
              onClick={handleManualSearch}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Qidirish</span>
            </button>
          </div>
          
          {/* Aniqlangan manzil */}
          {detectedAddress && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30">
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="text-sm text-emerald-700 dark:text-emerald-300 truncate">
                {detectedAddress}
              </span>
              <button
                onClick={handleClearAddress}
                className="ml-auto p-1 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                title="Tozalash"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* URL parametrlari bo'yicha filter */}
          {(regionParam || districtParam) && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
              <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {regionParam}
                {districtParam && ` → ${districtParam}`}
              </span>
              <button
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete("region");
                  newParams.delete("district");
                  setSearchParams(newParams);
                }}
                className="ml-auto p-1 rounded-full hover:bg-blue-200 dark:hover:bg-blue-500/30 text-blue-600 dark:text-blue-400"
                title="Filterni o'chirish"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Main content */}
        <main>
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Barcha ustalar
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                {sortedProfessionals.length} ta usta
              </span>
              {displayedProfessionals.length < sortedProfessionals.length && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({displayedProfessionals.length} ko'rsatilmoqda)
                </span>
              )}
              {isSearchActive && matchedCount > 0 && (
                <span className="px-3 py-1 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-sm font-medium">
                  📍 {matchedCount} ta usta topildi
                </span>
              )}
              {isSearchActive && matchedCount === 0 && (
                <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-sm font-medium">
                  ⚠️ Bu manzilda usta topilmadi
                </span>
              )}
            </div>

          </div>

          {/* Professionals grid */}
          {sortedProfessionals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-white/20 bg-white/50 dark:bg-white/5 backdrop-blur-sm p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                <Wrench className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                Ustalar topilmadi
              </p>
            </div>
          ) : (
            <>
              <motion.div 
                layout
                className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
              >
                <AnimatePresence mode="popLayout">
                  {displayedProfessionals.map((professional, index) => (
                    <motion.div
                      key={professional._id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ 
                        duration: 0.3, 
                        delay: index < 12 ? index * 0.05 : 0,
                        layout: { duration: 0.4 }
                      }}
                      className="group relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800 via-gray-900 to-black border border-gray-700/50 shadow-2xl shadow-black/40 transition-all duration-300 hover:-translate-y-2 hover:shadow-3xl hover:shadow-emerald-500/20 hover:border-emerald-500/30"
                    >
                      {/* Background pattern */}
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5" />
                      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-full blur-xl" />
                      
                      {/* Rasm */}
                      <div className="relative overflow-hidden aspect-square">
                        <img
                          src={professional.image || professional.images?.[0] || "/placeholder.jpg"}
                          alt={professional.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        
                        {/* Tajriba badge */}
                        <div className="absolute top-2 left-2">
                          <div className="px-2 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30">
                            <span className="text-xs font-bold text-white">
                              {professional.experience || "5+"} yil
                            </span>
                          </div>
                        </div>

                        {/* Rating badge */}
                        {professional.rating && (
                          <div className="absolute top-2 right-2">
                            <div className="px-2 py-1 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg shadow-yellow-500/30">
                              <span className="text-xs font-bold text-white">
                                ⭐ {professional.rating}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Ma'lumotlar */}
                      <div className="relative p-3 sm:p-4 flex-1 flex flex-col">
                        {/* Ism va mutaxassislik */}
                        <div className="mb-3">
                          <h3 className="text-sm sm:text-base font-bold text-white mb-1 line-clamp-1">
                            {professional.name}
                          </h3>
                          <p className="text-xs text-emerald-400 font-medium line-clamp-1">
                            {professional.specialty}
                          </p>
                        </div>

                        {/* Ma'lumotlar ro'yxati */}
                        <div className="space-y-2.5 flex-1">
                          {/* Telefon */}
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                              <Phone className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="text-sm text-gray-300 font-medium">
                              {professional.phone}
                            </span>
                          </div>

                          {/* Ish vaqti */}
                          {professional.workingHours && (
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                                <Clock className="w-3.5 h-3.5 text-white" />
                              </div>
                              <span className="text-sm text-gray-300">
                                {professional.workingHours}
                              </span>
                            </div>
                          )}

                          {/* Masofa */}
                          {userCoordinates?.latitude && professional.latitude && professional.longitude && (
                            <button
                              onClick={() => handleGetDirections(professional)}
                              className="flex items-center gap-3 w-full text-left hover:bg-white/5 rounded-lg p-1 -m-1 transition-colors duration-200 group/distance"
                            >
                              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover/distance:shadow-orange-500/40 transition-shadow">
                                <Navigation className="w-3.5 h-3.5 text-white" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm font-medium text-emerald-400 group-hover/distance:text-emerald-300 transition-colors">
                                  📍 {calculateDistance(
                                    userCoordinates.latitude,
                                    userCoordinates.longitude,
                                    professional.latitude,
                                    professional.longitude
                                  ).toFixed(1)} km uzoqlikda
                                </span>
                                <div className="text-xs text-blue-400 opacity-0 group-hover/distance:opacity-100 transition-opacity">
                                  🧭 Yo'l ko'rsatish
                                </div>
                              </div>
                            </button>
                          )}

                          {/* Joylashuv */}
                          {(professional.region || professional.district) && (
                            <button
                              onClick={() => handleGetDirections(professional)}
                              className="flex items-center gap-3 w-full text-left hover:bg-white/5 rounded-lg p-1 -m-1 transition-colors duration-200 group/location"
                              disabled={!professional.latitude || !professional.longitude}
                            >
                              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover/location:shadow-emerald-500/40 transition-shadow">
                                <MapPin className="w-3.5 h-3.5 text-white" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm text-gray-400 group-hover/location:text-gray-300 transition-colors">
                                  {professional.district || professional.region}
                                </span>
                                {professional.latitude && professional.longitude && (
                                  <div className="text-xs text-emerald-400 opacity-0 group-hover/location:opacity-100 transition-opacity">
                                    🧭 Yo'l ko'rsatish
                                  </div>
                                )}
                              </div>
                            </button>
                          )}

                          {/* Manzil */}
                          {professional.address && (
                            <button
                              onClick={() => handleGetDirections(professional)}
                              className="flex items-start gap-3 w-full text-left hover:bg-white/5 rounded-lg p-1 -m-1 transition-colors duration-200 group/address"
                              disabled={!professional.latitude || !professional.longitude}
                            >
                              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center shadow-lg shadow-gray-500/25 flex-shrink-0 mt-0.5 group-hover/address:shadow-gray-500/40 transition-shadow">
                                <MapPin className="w-3.5 h-3.5 text-white" />
                              </div>
                              <div className="flex-1">
                                <span className="text-xs text-gray-500 line-clamp-2 leading-relaxed group-hover/address:text-gray-400 transition-colors">
                                  {professional.address}
                                </span>
                                {professional.latitude && professional.longitude && (
                                  <div className="text-xs text-emerald-400 opacity-0 group-hover/address:opacity-100 transition-opacity mt-1">
                                    🧭 Yo'l ko'rsatish
                                  </div>
                                )}
                              </div>
                            </button>
                          )}
                        </div>

                        {/* Bog'lanish tugmasi */}
                        <div className="mt-4">
                          <Link
                            to="/contact"
                            state={{ professional }}
                            className="group/btn w-full py-2.5 text-center text-sm font-bold rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-500 hover:from-emerald-600 hover:via-emerald-500 hover:to-teal-400 text-white transition-all duration-300 shadow-xl shadow-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/40 flex items-center justify-center gap-2 transform hover:scale-[1.02]"
                          >
                            <Phone className="w-4 h-4" />
                            Bog'lanish
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>

              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center pt-8 sm:pt-10">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="group relative px-8 sm:px-10 py-3 sm:py-4 rounded-2xl font-semibold text-sm sm:text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-500 transition-all duration-300 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute inset-0 rounded-2xl shadow-lg shadow-emerald-500/30 group-hover:shadow-xl group-hover:shadow-emerald-500/40 transition-shadow duration-300" />
                    <span className="relative text-white flex items-center gap-2">
                      {loadingMore ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Yuklanmoqda...
                        </>
                      ) : (
                        <>
                          Ko'proq ko'rsatish ({sortedProfessionals.length - displayedProfessionals.length} ta qoldi)
                          <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </>
                      )}
                    </span>
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Professionals;
