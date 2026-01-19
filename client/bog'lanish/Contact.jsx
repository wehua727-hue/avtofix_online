import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  Phone,
  MapPin,
  Clock,
  Briefcase,
  Tag,
  Wrench,
  Users,
  Navigation,
  Crosshair,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { professionalsAPI } from "@/services/api";

const FALLBACK_PROFESSIONAL = {
  name: "Bobur Karimov",
  specialty: "Motor ustasi",
  phone: "+998 91 877 77 11",
  category: "Elektrik 12V/24V",
  workingHours: "8 dan 18 gacha",
  image:
    "https://images.unsplash.com/photo-1581092795442-8d2c4c5b7e8b?w=600&h=400&fit=crop",
  experience: "5+ yil",
  services: ["Motor ta'miri", "Elektrik tizimi", "Diagnostika"],
};

const Contact = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const routeProfessional = location.state?.professional;
  const professionalId = routeProfessional?._id || searchParams.get("id");
  const [professional, setProfessional] = useState(() => {
    if (routeProfessional) {
      return {
        ...FALLBACK_PROFESSIONAL,
        ...routeProfessional,
        services: Array.isArray(routeProfessional.services)
          ? routeProfessional.services
          : (routeProfessional.services || "")
              .split(",")
              .map((service) => service.trim())
              .filter(Boolean),
      };
    }
    return FALLBACK_PROFESSIONAL;
  });
  const [loading, setLoading] = useState(Boolean(professionalId));
  const [error, setError] = useState(null);
  const [similarProfessionals, setSimilarProfessionals] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  
  // GPS va navigation uchun state'lar
  const [userLocation, setUserLocation] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [distance, setDistance] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchProfessional = async () => {
      if (!professionalId) {
        return;
      }

      try {
        setLoading(true);
        const fetched = await professionalsAPI.getById(professionalId);
        if (!isMounted) return;

        const professionalData = {
          ...FALLBACK_PROFESSIONAL,
          ...fetched,
          services: Array.isArray(fetched?.services)
            ? fetched.services
            : (fetched?.services || "")
                .split(",")
                .map((service) => service.trim())
                .filter(Boolean),
        };
        setProfessional(professionalData);
        setError(null);

        // Загружаем похожих мастеров из того же района
        if (fetched?.district || fetched?.region) {
          setSimilarLoading(true);
          try {
            const allProfessionals = await professionalsAPI.getAll({ limit: 100 });
            const professionals = allProfessionals.professionals || allProfessionals;
            const currentId = fetched._id || fetched.id;
            
            // Фильтруем по району или региону
            const similar = professionals
              .filter((p) => {
                const pId = p._id || p.id;
                if (pId === currentId) return false;
                
                // Сначала пробуем по району
                if (fetched.district && p.district) {
                  return p.district.toLowerCase() === fetched.district.toLowerCase();
                }
                // Если района нет, по региону
                if (fetched.region && p.region) {
                  return p.region.toLowerCase() === fetched.region.toLowerCase();
                }
                return false;
              })
              .slice(0, 6);
            
            setSimilarProfessionals(similar);
          } catch (err) {
            console.warn("Failed to load similar professionals:", err);
          } finally {
            setSimilarLoading(false);
          }
        }
      } catch (fetchError) {
        if (!isMounted) return;
        console.error("Fetch professional error:", fetchError);
        setError(fetchError.message || "Ustani yuklab bo'lmadi");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProfessional();

    return () => {
      isMounted = false;
    };
  }, [professionalId]);

  const services = useMemo(() => {
    if (!professional?.services) {
      return [];
    }
    return Array.isArray(professional.services)
      ? professional.services
      : professional.services
          .split(",")
          .map((service) => service.trim())
          .filter(Boolean);
  }, [professional?.services]);

  const galleryImages = useMemo(() => {
    const list = Array.isArray(professional?.images)
      ? professional.images
      : professional?.image
      ? [professional.image]
      : [];
    return list.filter(Boolean);
  }, [professional?.images, professional?.image]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [galleryImages.join(",")]);

  const prevImage = () => {
    setActiveIndex((i) =>
      galleryImages.length
        ? (i - 1 + galleryImages.length) % galleryImages.length
        : 0
    );
  };

  const nextImage = () => {
    setActiveIndex((i) =>
      galleryImages.length ? (i + 1) % galleryImages.length : 0
    );
  };

  const handlePhoneCall = () => {
    if (!professional?.phone) return;
    window.open(`tel:${professional.phone}`);
  };

  // Masofa hisoblash funksiyasi
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Yer radiusi km da
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Masofa km da
  };

  // GPS orqali foydalanuvchi joylashuvini aniqlash
  const handleGetUserLocation = async () => {
    if (!navigator.geolocation) {
      setGpsError("Brauzeringiz GPS ni qo'llab-quvvatlamaydi");
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;
      setUserLocation({ latitude, longitude });

      // Agar ustaning koordinatalari mavjud bo'lsa, masofani hisoblash
      if (professional?.latitude && professional?.longitude) {
        const dist = calculateDistance(
          latitude, 
          longitude, 
          professional.latitude, 
          professional.longitude
        );
        setDistance(dist);
      }
    } catch (error) {
      console.error("GPS xatosi:", error);
      setGpsError("Joylashuvni aniqlab bo'lmadi. GPS yoqilganligini tekshiring.");
    } finally {
      setGpsLoading(false);
    }
  };

  // Yo'l ko'rsatish funksiyasi
  const handleGetDirections = () => {
    if (!professional?.latitude || !professional?.longitude) {
      alert("Ustaning joylashuvi noma'lum");
      return;
    }

    if (userLocation) {
      // Foydalanuvchi joylashuvi ma'lum - yo'l ko'rsatish
      const url = `https://www.google.com/maps/dir/${userLocation.latitude},${userLocation.longitude}/${professional.latitude},${professional.longitude}`;
      window.open(url, '_blank');
    } else {
      // Foydalanuvchi joylashuvi noma'lum - faqat manzilni ko'rsatish
      const url = `https://www.google.com/maps?q=${professional.latitude},${professional.longitude}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-zinc-950 transition-colors duration-200 pb-24 sm:pb-8">
      {/* Back button section - только на десктопе */}
      <div className="hidden sm:block bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b border-gray-200/60 dark:border-zinc-800/60">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 shadow-sm hover:shadow dark:shadow-zinc-900/50 transition-all duration-200 active:scale-[0.98]"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Orqaga</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-0 sm:px-6 py-0 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Image Section */}
          <div className="space-y-0 sm:space-y-4">
            <div
              className="relative bg-white dark:bg-zinc-900 rounded-none sm:rounded-2xl shadow-none sm:shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:sm:shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden border-0 sm:border border-gray-100 dark:border-zinc-800"
            >
              <div className="aspect-[3/4] sm:aspect-auto sm:min-h-[420px]">
                {galleryImages.length > 0 ? (
                  <img
                    src={galleryImages[activeIndex]}
                    alt={professional?.name || "Professional"}
                    className="w-full h-full object-cover transition-opacity duration-300"
                  />
                ) : (
                  <div className="w-full h-full min-h-[280px] sm:min-h-[420px] flex items-center justify-center text-gray-400 dark:text-zinc-500">
                    <div className="text-center">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-3 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                        <Wrench className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300 dark:text-zinc-600" />
                      </div>
                      <span className="text-sm sm:text-base">Rasm mavjud emas</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile back button - поверх изображения как в ko'rish */}
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="sm:hidden absolute top-4 left-4 w-10 h-10 bg-black/70 hover:bg-black/90 border border-white/20 rounded-full flex items-center justify-center transition-opacity shadow-lg backdrop-blur-sm z-20"
                aria-label="Orqaga"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>

              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prevImage}
                    className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-11 sm:w-11 rounded-full bg-white/90 dark:bg-zinc-800/90 hover:bg-white dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 grid place-items-center shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 active:scale-95"
                    aria-label="Oldingi"
                  >
                    <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={nextImage}
                    className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-11 sm:w-11 rounded-full bg-white/90 dark:bg-zinc-800/90 hover:bg-white dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 grid place-items-center shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 active:scale-95"
                    aria-label="Keyingi"
                  >
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </>
              )}

              {/* Image counter badge */}
              {galleryImages.length > 1 && (
                <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm text-xs sm:text-sm font-medium text-gray-700 dark:text-zinc-200 shadow-sm">
                  {activeIndex + 1} / {galleryImages.length}
                </div>
              )}
            </div>

            {/* Thumbnail gallery */}
            {galleryImages.length > 1 && (
              <div className="flex gap-2 sm:gap-3 flex-wrap">
                {galleryImages.map((src, idx) => (
                  <button
                    type="button"
                    key={src + idx}
                    onClick={() => setActiveIndex(idx)}
                    className={`h-12 w-12 sm:h-16 sm:w-16 rounded-lg sm:rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-105 ${
                      idx === activeIndex
                        ? "border-red-500 shadow-md ring-2 ring-red-500/20"
                        : "border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600"
                    }`}
                    aria-label={`Rasm ${idx + 1}`}
                  >
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Contact Info Section */}
          <div className="bg-transparent sm:bg-white dark:sm:bg-zinc-900 rounded-none sm:rounded-2xl shadow-none sm:shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:sm:shadow-[0_4px_20px_rgba(0,0,0,0.4)] p-4 sm:p-6 lg:p-8 flex flex-col border-0 sm:border border-gray-100 dark:border-zinc-800">
            <div className="flex-1 space-y-6">
              {/* Status / errors */}
              {loading && (
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                  <div className="w-5 h-5 border-2 border-blue-300 dark:border-blue-600 border-t-blue-600 dark:border-t-blue-300 rounded-full animate-spin"></div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                    Ma'lumotlar yuklanmoqda...
                  </p>
                </div>
              )}
              {error && (
                <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-100 dark:border-red-800/30 rounded-xl">
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                    {error}
                  </p>
                </div>
              )}

              {/* Worker name and specialty */}
              <div className="text-center sm:text-left pb-6 border-b border-gray-100 dark:border-zinc-800">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent mb-2">
                  {professional?.name || "Usta topilmadi"}
                </h1>
                {professional?.specialty && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full border border-blue-100 dark:border-blue-800/30">
                    <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {professional.specialty}
                    </span>
                  </div>
                )}
              </div>

              {/* Contact details - Grid Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {professional?.phone && (
                  <div className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-50 via-blue-50 to-indigo-50 dark:from-blue-900/20 dark:via-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/30 p-3 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                          <Phone className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Telefon</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{professional.phone}</p>
                        </div>
                      </div>
                      <a
                        href={`tel:${professional.phone}`}
                        className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors duration-200 shadow-lg shadow-blue-500/25"
                      >
                        Qo'ng'iroq
                      </a>
                    </div>
                  </div>
                )}

                {professional?.category && (
                  <div className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-50 via-purple-50 to-pink-50 dark:from-purple-900/20 dark:via-purple-900/20 dark:to-pink-900/20 border border-purple-100 dark:border-purple-800/30 p-3 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                        <Tag className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">Kategoriya</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{professional.category}</p>
                      </div>
                    </div>
                  </div>
                )}

                {professional?.workingHours && (
                  <div className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-green-50 via-green-50 to-emerald-50 dark:from-green-900/20 dark:via-green-900/20 dark:to-emerald-900/20 border border-green-100 dark:border-green-800/30 p-3 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/25">
                        <Clock className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">Ish vaqti</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{professional.workingHours}</p>
                      </div>
                    </div>
                  </div>
                )}

                {professional?.experience && (
                  <div className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-50 via-amber-50 to-orange-50 dark:from-amber-900/20 dark:via-amber-900/20 dark:to-orange-900/20 border border-amber-100 dark:border-amber-800/30 p-3 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                        <Briefcase className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Tajriba</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{professional.experience}</p>
                      </div>
                    </div>
                  </div>
                )}

                {professional?.address && (
                  <div className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-teal-50 via-teal-50 to-cyan-50 dark:from-teal-900/20 dark:via-teal-900/20 dark:to-cyan-900/20 border border-teal-100 dark:border-teal-800/30 p-3 hover:shadow-lg hover:shadow-teal-500/10 transition-all duration-300">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center shadow-lg shadow-teal-500/25">
                        <MapPin className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wide">Manzil</p>
                        <p className="text-xs font-semibold text-gray-900 dark:text-white leading-relaxed">{professional.address}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Location (Google Maps) */}
                {professional?.latitude && professional?.longitude && (
                  <div className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 border border-blue-100 dark:border-blue-800/30 p-4 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                          <MapPin className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Joylashuv</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                            📍 {professional.latitude.toFixed(6)}, {professional.longitude.toFixed(6)}
                          </p>
                        </div>
                      </div>
                      
                      {/* GPS va masofa */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={handleGetUserLocation}
                          disabled={gpsLoading}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-lg shadow-emerald-500/25 disabled:shadow-none"
                        >
                          {gpsLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Crosshair className="w-4 h-4" />
                          )}
                          {gpsLoading ? "Aniqlanmoqda..." : "Masofani aniqlash"}
                        </button>
                        
                        {distance && (
                          <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-500/25">
                            📏 {distance.toFixed(1)} km
                          </div>
                        )}
                      </div>
                      
                      {/* GPS xatosi */}
                      {gpsError && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg">
                          <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                            {gpsError}
                          </p>
                        </div>
                      )}
                      
                      {/* Yo'l ko'rsatish tugmasi */}
                      <button
                        onClick={handleGetDirections}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 text-white rounded-xl text-sm font-bold transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transform hover:-translate-y-0.5"
                      >
                        <Navigation className="w-5 h-5" />
                        {userLocation ? "🧭 Yo'l ko'rsatish" : "🗺️ Xaritada ko'rish"}
                      </button>
                      
                      {/* Xarita havolalari */}
                      <div className="grid grid-cols-3 gap-2">
                        <a
                          href={`https://www.google.com/maps?q=${professional.latitude},${professional.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors duration-200 shadow-md"
                        >
                          <MapPin className="w-3 h-3" />
                          Google
                        </a>
                        <a
                          href={`https://yandex.com/maps/?pt=${professional.longitude},${professional.latitude}&z=16&l=map`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors duration-200 shadow-md"
                        >
                          <MapPin className="w-3 h-3" />
                          Yandex
                        </a>
                        <a
                          href={`https://maps.apple.com/?q=${professional.latitude},${professional.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-xs font-medium transition-colors duration-200 shadow-md"
                        >
                          <MapPin className="w-3 h-3" />
                          Apple
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Services */}
                {services.length > 0 && (
                  <div className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-rose-50 via-pink-50 to-red-50 dark:from-rose-900/20 dark:via-pink-900/20 dark:to-red-900/20 border border-rose-100 dark:border-rose-800/30 p-4 hover:shadow-lg hover:shadow-rose-500/10 transition-all duration-300">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/25">
                          <Wrench className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wide">Xizmatlar</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{services.length} ta xizmat</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {services.map((service, index) => (
                          <span
                            key={index}
                            className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-rose-200 dark:border-rose-800/30 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded-lg text-sm font-medium transition-colors duration-200 shadow-sm"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main Contact button */}
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-zinc-800">
              <button
                onClick={handlePhoneCall}
                disabled={!professional?.phone}
                className="w-full bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 hover:from-red-600 hover:via-rose-600 hover:to-pink-600 disabled:from-gray-200 disabled:to-gray-300 dark:disabled:from-zinc-700 dark:disabled:to-zinc-800 disabled:text-gray-400 dark:disabled:text-zinc-500 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 shadow-xl shadow-red-500/25 hover:shadow-2xl hover:shadow-red-500/30 disabled:shadow-none transform hover:-translate-y-1 active:scale-[0.98] text-lg"
              >
                <Phone className="w-6 h-6" />
                📞 Qo'ng'iroq qilish
              </button>
            </div>
          </div>
        </div>

        {/* Similar Professionals Section */}
        {similarProfessionals.length > 0 && (
          <div className="mt-6 sm:mt-8 px-3 sm:px-0">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {professional?.district || professional?.region} dan boshqa ustalar
              </h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
              {similarProfessionals.map((prof) => {
                const profId = prof._id || prof.id;
                const profImage = prof.images?.[0] || prof.image || null;
                
                return (
                  <Link
                    key={profId}
                    to={`/contact?id=${profId}`}
                    state={{ professional: prof }}
                    className="group bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    {/* Image */}
                    <div className="aspect-[3/4] relative overflow-hidden bg-gray-100 dark:bg-zinc-800">
                      {profImage ? (
                        <img
                          src={profImage}
                          alt={prof.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Wrench className="w-8 h-8 text-gray-300 dark:text-zinc-600" />
                        </div>
                      )}
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      {/* Name overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                        <h3 className="text-xs sm:text-sm font-semibold text-white truncate">
                          {prof.name}
                        </h3>
                        <p className="text-[10px] sm:text-xs text-white/70 truncate">
                          {prof.specialty || prof.category}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Similar Loading */}
        {similarLoading && (
          <div className="mt-6 sm:mt-8 px-3 sm:px-0">
            <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400">
              <div className="w-4 h-4 border-2 border-gray-300 dark:border-zinc-600 border-t-gray-600 dark:border-t-zinc-300 rounded-full animate-spin"></div>
              <span className="text-sm">Boshqa ustalar yuklanmoqda...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Contact;
