import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { professionalsAPI } from "@/services/api";
import { Phone, Home, Wrench, ArrowUpRight, MapPin, X, Clock, Navigation, Crosshair, Loader2, Search, Star, Award, MessageCircle, Filter } from "lucide-react";
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-black">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Wrench className="w-8 h-8 text-emerald-500 animate-pulse" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Ustalar yuklanmoqda...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Iltimos, biroz kuting
          </p>
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

        {/* Enhanced Search and GPS Section */}
        <div className="mb-8">
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search input */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setAddressInput(newValue);
                    if (!newValue.trim()) {
                      setIsFiltering(false);
                      clearLocation();
                      setDetectedAddress("");
                    }
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                  placeholder="Manzilni kiriting yoki GPS orqali aniqlang..."
                  className="w-full pl-12 pr-20 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-base"
                />
                
                {/* Action buttons */}
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
                  {addressInput && (
                    <button
                      onClick={handleClearAddress}
                      className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="Tozalash"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={handleGpsDetect}
                    disabled={gpsLoading}
                    className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-500/30"
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
              
              {/* Search button */}
              <button
                onClick={handleManualSearch}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold flex items-center justify-center gap-3 transition-all duration-300 hover:-translate-y-0.5 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40"
              >
                <Search className="w-5 h-5" />
                <span>Qidirish</span>
              </button>
            </div>
            
            {/* Status indicators */}
            {detectedAddress && (
              <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30">
                <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span className="text-sm text-emerald-700 dark:text-emerald-300 flex-1 truncate">
                  {detectedAddress}
                </span>
                <button
                  onClick={handleClearAddress}
                  className="p-1.5 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 transition-colors"
                  title="Tozalash"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {(regionParam || districtParam) && (
              <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
                <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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
                  className="ml-auto p-1.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-500/30 text-blue-600 dark:text-blue-400 transition-colors"
                  title="Filterni o'chirish"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Header Section */}
        <main>
          <div className="mb-8">
            <div className="text-center mb-6">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent mb-4">
                Barcha ustalar
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Eng yaxshi mutaxassislarni toping va ularning xizmatlaridan foydalaning
              </p>
            </div>
            
            {/* Enhanced Statistics */}
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <div className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-200 dark:border-emerald-500/30 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                    <Wrench className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {sortedProfessionals.length}
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">ta usta</p>
                  </div>
                </div>
              </div>
              
              {displayedProfessionals.length < sortedProfessionals.length && (
                <div className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {displayedProfessionals.length} ko'rsatilmoqda
                  </span>
                </div>
              )}
              
              {isSearchActive && matchedCount > 0 && (
                <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-200 dark:border-teal-500/30">
                  <span className="text-sm font-medium text-teal-600 dark:text-teal-400 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {matchedCount} ta usta topildi
                  </span>
                </div>
              )}
              
              {isSearchActive && matchedCount === 0 && (
                <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-200 dark:border-orange-500/30">
                  <span className="text-sm font-medium text-orange-600 dark:text-orange-400 flex items-center gap-2">
                    <X className="w-4 h-4" />
                    Bu manzilda usta topilmadi
                  </span>
                </div>
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
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
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
                      className="group relative overflow-hidden rounded-3xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:border-emerald-500/50"
                    >
                      {/* Enhanced background pattern */}
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      {/* Professional Image */}
                      <div className="relative overflow-hidden">
                        <div className="aspect-[4/3] sm:aspect-square">
                          <img
                            src={professional.image || professional.images?.[0] || "/placeholder.jpg"}
                            alt={professional.name}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          
                          {/* Gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </div>
                        
                        {/* Top badges */}
                        <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                          {/* Experience badge */}
                          <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30 backdrop-blur-sm">
                            <span className="text-xs font-bold text-white flex items-center gap-1">
                              <Award className="w-3 h-3" />
                              {professional.experience || "5+"} yil
                            </span>
                          </div>

                          {/* Rating badge */}
                          {professional.rating && (
                            <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg shadow-yellow-500/30 backdrop-blur-sm">
                              <span className="text-xs font-bold text-white flex items-center gap-1">
                                <Star className="w-3 h-3 fill-current" />
                                {professional.rating}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Online status indicator */}
                        <div className="absolute top-3 right-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
                        </div>
                      </div>

                      {/* Professional Info */}
                      <div className="relative p-4 sm:p-5 flex-1 flex flex-col">
                        {/* Name and specialty */}
                        <div className="mb-4">
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1 line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {professional.name}
                          </h3>
                          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold line-clamp-1">
                            {professional.specialty}
                          </p>
                        </div>

                        {/* Info list with enhanced styling */}
                        <div className="space-y-3 flex-1 mb-4">
                          {/* Phone */}
                          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                              <Phone className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                              {professional.phone}
                            </span>
                          </div>

                          {/* Working hours */}
                          {professional.workingHours && (
                            <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                                <Clock className="w-4 h-4 text-white" />
                              </div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {professional.workingHours}
                              </span>
                            </div>
                          )}

                          {/* Distance */}
                          {userCoordinates?.latitude && professional.latitude && professional.longitude && (
                            <button
                              onClick={() => handleGetDirections(professional)}
                              className="flex items-center gap-3 w-full text-left p-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors duration-200 group/distance"
                            >
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover/distance:shadow-orange-500/40 transition-shadow">
                                <Navigation className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 group-hover/distance:text-emerald-700 dark:group-hover/distance:text-emerald-300 transition-colors flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {calculateDistance(
                                    userCoordinates.latitude,
                                    userCoordinates.longitude,
                                    professional.latitude,
                                    professional.longitude
                                  ).toFixed(1)} km uzoqlikda
                                </span>
                                <div className="text-xs text-blue-600 dark:text-blue-400 opacity-0 group-hover/distance:opacity-100 transition-opacity">
                                  🧭 Yo'l ko'rsatish
                                </div>
                              </div>
                            </button>
                          )}

                          {/* Location */}
                          {(professional.region || professional.district || professional.address) && (
                            <button
                              onClick={() => handleGetDirections(professional)}
                              className="flex items-center gap-3 w-full text-left p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200 group/location"
                              disabled={!professional.latitude || !professional.longitude}
                            >
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover/location:shadow-emerald-500/40 transition-shadow">
                                <MapPin className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover/location:text-gray-900 dark:group-hover/location:text-white transition-colors line-clamp-2">
                                  {professional.address || professional.district || professional.region}
                                </span>
                                {professional.latitude && professional.longitude && (
                                  <div className="text-xs text-emerald-600 dark:text-emerald-400 opacity-0 group-hover/location:opacity-100 transition-opacity flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    Xaritada ko'rish
                                  </div>
                                )}
                              </div>
                            </button>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <Link
                            to="/contact"
                            state={{ professional }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 transition-all duration-300 hover:-translate-y-0.5"
                          >
                            <Phone className="w-4 h-4" />
                            <span className="text-sm">Bog'lanish</span>
                          </Link>
                          <Link
                            to={`/professionals/${professional._id}`}
                            className="flex items-center justify-center px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold transition-all duration-300 hover:-translate-y-0.5"
                          >
                            <ArrowUpRight className="w-4 h-4" />
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
