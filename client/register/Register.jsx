import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  User as UserIcon,
  MapPin,
  Crosshair,
  Loader2,
  Car,
  Plus,
  X,
  Check,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import BackButton from "@/components/BackButton";
import { carBrandsAPI } from "@/services/api";

// O'zbekiston viloyatlari
const UZBEKISTAN_REGIONS = [
  "Toshkent shahri",
  "Toshkent viloyati",
  "Andijon",
  "Buxoro",
  "Farg'ona",
  "Jizzax",
  "Xorazm",
  "Namangan",
  "Navoiy",
  "Qashqadaryo",
  "Qoraqalpog'iston Respublikasi",
  "Samarqand",
  "Sirdaryo",
  "Surxondaryo",
];

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    region: "", // Viloyat
    address: "",
    password: "",
    latitude: null,
    longitude: null,
    cars: [],
  });
  const [displayPhone, setDisplayPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  // Mashina brendlari
  const [carBrands, setCarBrands] = useState([]);
  const [newCarName, setNewCarName] = useState("");
  const [addingCar, setAddingCar] = useState(false);

  // Mashina brendlarini yuklash
  useEffect(() => {
    const loadCarBrands = async () => {
      try {
        const brands = await carBrandsAPI.getAll();
        setCarBrands(brands);
      } catch (error) {
        console.error("Error loading car brands:", error);
      }
    };
    loadCarBrands();
  }, []);

  // Telefon raqamni formatlash funksiyasi
  const formatPhoneNumber = (value) => {
    const numericValue = value.replace(/\D/g, "");
    if (numericValue.length === 0) return "";
    if (numericValue.length <= 2) return `(${numericValue}`;
    if (numericValue.length <= 5)
      return `(${numericValue.slice(0, 2)}) ${numericValue.slice(2)}`;
    if (numericValue.length <= 7)
      return `(${numericValue.slice(0, 2)}) ${numericValue.slice(2, 5)} ${numericValue.slice(5)}`;
    return `(${numericValue.slice(0, 2)}) ${numericValue.slice(2, 5)} ${numericValue.slice(5, 7)} ${numericValue.slice(7, 9)}`;
  };

  const handlePhoneChange = (value) => {
    const numericValue = value.replace(/\D/g, "");
    if (numericValue.length <= 9) {
      setFormData((prev) => ({ ...prev, phone: numericValue }));
      setDisplayPhone(formatPhoneNumber(numericValue));
    }
  };

  // Paste event handler - copy-paste qilganda ham ishlaydi
  const handlePhonePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const numericValue = pastedText.replace(/\D/g, "");
    // +998 bilan boshlansa, uni olib tashlash
    const cleanedValue = numericValue.startsWith('998') 
      ? numericValue.slice(3) 
      : numericValue;
    
    if (cleanedValue.length <= 9) {
      setFormData((prev) => ({ ...prev, phone: cleanedValue }));
      setDisplayPhone(formatPhoneNumber(cleanedValue));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // GPS orqali koordinatalarni olish
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Brauzeringiz geolokatsiyani qo'llab-quvvatlamaydi");
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setFormData((prev) => ({
          ...prev,
          latitude,
          longitude,
        }));
        toast.success(
          `Koordinatalar aniqlandi (${Math.round(accuracy)}m aniqlik)`
        );
        setGeoLoading(false);
      },
      (error) => {
        setGeoLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Joylashuvga ruxsat berilmadi");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Joylashuv ma'lumotlari mavjud emas");
            break;
          case error.TIMEOUT:
            toast.error("Joylashuvni aniqlash vaqti tugadi");
            break;
          default:
            toast.error("Joylashuvni aniqlashda xatolik");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      }
    );
  };

  // Mashina tanlash/bekor qilish
  const toggleCarSelection = (carName) => {
    setFormData((prev) => {
      const cars = prev.cars.includes(carName)
        ? prev.cars.filter((c) => c !== carName)
        : [...prev.cars, carName];
      return { ...prev, cars };
    });
  };

  // Yangi mashina qo'shish
  const handleAddCar = async () => {
    const trimmedName = newCarName.trim();
    if (!trimmedName) {
      toast.error("Mashina nomini kiriting");
      return;
    }

    // Mavjudligini tekshirish
    const exists = carBrands.some(
      (b) => b.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (exists) {
      toast.error("Bu mashina allaqachon ro'yxatda bor");
      setNewCarName("");
      return;
    }

    try {
      setAddingCar(true);
      const newBrand = await carBrandsAPI.add(trimmedName);
      setCarBrands((prev) => [newBrand, ...prev]);
      setFormData((prev) => ({
        ...prev,
        cars: [...prev.cars, newBrand.name],
      }));
      setNewCarName("");
      toast.success(`"${newBrand.name}" qo'shildi`);
    } catch (error) {
      toast.error(error.message || "Mashina qo'shishda xatolik");
    } finally {
      setAddingCar(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!navigator.onLine) {
      toast.error("Internet aloqasi yo'q");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Parol kamida 6 ta belgidan iborat bo'lishi kerak!");
      setLoading(false);
      return;
    }

    if (formData.phone.length !== 9) {
      toast.error("Telefon raqam 9 ta raqamdan iborat bo'lishi kerak!");
      setLoading(false);
      return;
    }

    if (!formData.region) {
      toast.error("Viloyatni tanlang!");
      setLoading(false);
      return;
    }

    // Mashina tanlash majburiy
    if (formData.cars.length === 0) {
      toast.error("Kamida bitta mashina tanlang yoki kiriting!");
      setLoading(false);
      return;
    }

    try {
      await registerUser({
        name: formData.name,
        phone: formData.phone,
        region: formData.region,
        address: formData.address || "",
        password: formData.password,
        latitude: formData.latitude,
        longitude: formData.longitude,
        cars: formData.cars,
      });
      toast.success("Muvaffaqiyatli ro'yxatdan o'tildi!");
      navigate("/");
    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage = error?.message || "";
      if (
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError")
      ) {
        toast.error("Server bilan bog'lanishda xatolik");
      } else if (
        errorMessage.includes("Bu telefon raqam bilan ro'yxatdan o'tilgan")
      ) {
        toast.error("Bu telefon raqam bilan allaqachon ro'yxatdan o'tilgan");
      } else if (errorMessage) {
        toast.error(errorMessage);
      } else {
        toast.error("Ro'yxatdan o'tishda xatolik yuz berdi");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8 pb-28 md:pb-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-1/3 h-72 w-72 rounded-full bg-rose-600/25 blur-3xl" />
        <div className="absolute bottom-10 right-12 h-80 w-80 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute top-1/3 left-0 h-64 w-64 rounded-full bg-sky-400/15 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl mb-6">
        <BackButton className="bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10" />
      </div>

      <div className="relative mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center">
        <Card className="relative w-full max-w-md rounded-3xl border-white/10 bg-white/10 p-6 shadow-[0_25px_60px_-40px_rgba(15,23,42,0.9)] backdrop-blur-xl">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-3xl font-semibold text-white">
              Ro'yxatdan o'tish
            </CardTitle>
            <CardDescription className="text-sm text-white/65">
              AvtoFix xizmatlaridan foydalanish uchun ma'lumotlarni to'ldiring
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Ism */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm text-white/70">
                  Ism
                </Label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/70">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Ismingizni kiriting"
                    value={formData.name}
                    onChange={handleChange}
                    className="h-11 rounded-xl border border-white/15 bg-white/5 pl-9 text-base text-white placeholder:text-white/40 focus-visible:ring-1 focus-visible:ring-rose-500/60"
                    required
                  />
                </div>
              </div>

              {/* Telefon */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm text-white/70">
                  Telefon raqam
                </Label>
                <div className="relative overflow-hidden rounded-xl border border-white/15 bg-white/5">
                  <div className="flex">
                    <span className="inline-flex items-center px-3 text-sm font-semibold text-white/80">
                      +998
                    </span>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="(90) 123 45 67"
                      value={displayPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      onPaste={handlePhonePaste}
                      className="border-0 bg-transparent pl-0 text-base text-white placeholder:text-white/35 focus-visible:ring-0 flex-1"
                      required
                      maxLength={15}
                    />
                  </div>
                </div>
              </div>

              {/* Viloyat tanlash */}
              <div className="space-y-2">
                <Label htmlFor="region" className="text-sm text-white/70">
                  Viloyat <span className="text-rose-400 text-xs">*</span>
                </Label>
                <Select
                  value={formData.region}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, region: value }))
                  }
                  required
                >
                  <SelectTrigger className="h-11 rounded-xl border border-white/15 bg-white/5 text-white placeholder:text-white/40 focus:ring-1 focus:ring-rose-500/60">
                    <SelectValue placeholder="Viloyatni tanlang" />
                  </SelectTrigger>
                  <SelectContent 
                    className="bg-gray-900 border-white/10 text-white max-h-[300px] overflow-y-auto"
                    side="bottom"
                    align="start"
                    sideOffset={5}
                  >
                    {UZBEKISTAN_REGIONS.map((region) => (
                      <SelectItem
                        key={region}
                        value={region}
                        className="hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                      >
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Manzil (ixtiyoriy) */}
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm text-white/70">
                  Aniq manzil{" "}
                  <span className="text-white/40 text-xs">(ixtiyoriy)</span>
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/70">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <Input
                      id="address"
                      name="address"
                      type="text"
                      placeholder="Masalan: Chilonzor tumani, 12-kvartal"
                      value={formData.address}
                      onChange={handleChange}
                      className="h-11 rounded-xl border border-white/15 bg-white/5 pl-9 text-base text-white placeholder:text-white/40 focus-visible:ring-1 focus-visible:ring-rose-500/60"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGetLocation}
                    disabled={geoLoading}
                    className="h-11 px-3 rounded-xl border-white/15 bg-white/5 text-white/70 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:text-emerald-400"
                    title="GPS orqali joylashuvni aniqlash"
                  >
                    {geoLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Crosshair className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {formData.latitude && formData.longitude && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <Check className="h-3 w-3" />
                    <span>Koordinatalar saqlandi</span>
                    <a
                      href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      Xaritada ko'rish
                    </a>
                  </div>
                )}
              </div>

              {/* Mashina tanlash */}
              <div className="space-y-2">
                <Label className="text-sm text-white/70">
                  Mashinangiz nomini kiriting yoki tanlang{" "}
                  <span className="text-rose-400 text-xs">*</span>
                </Label>

                {/* Tanlangan mashinalar soni */}
                {formData.cars.length > 0 ? (
                  <p className="text-xs text-emerald-400">
                    ✓ {formData.cars.length} ta mashina tanlandi: {formData.cars.join(", ")}
                  </p>
                ) : (
                  <p className="text-xs text-rose-400">
                    ⚠ Kamida 1 ta mashina tanlash majburiy
                  </p>
                )}

                {/* Mavjud brendlar */}
                {carBrands.length > 0 && (
                  <div className={`flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 rounded-xl border ${formData.cars.length === 0 ? 'border-rose-500/50' : 'border-white/10'} bg-white/5`}>
                    {carBrands.map((brand) => (
                      <button
                        key={brand._id || brand.name}
                        type="button"
                        onClick={() => toggleCarSelection(brand.name)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          formData.cars.includes(brand.name)
                            ? "bg-emerald-500/30 border-emerald-500/50 text-emerald-300 border"
                            : "bg-white/5 border-white/10 text-white/70 border hover:bg-white/10"
                        }`}
                      >
                        {formData.cars.includes(brand.name) && (
                          <Check className="h-3 w-3" />
                        )}
                        {brand.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Yangi mashina qo'shish */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/70">
                      <Car className="h-4 w-4" />
                    </div>
                    <Input
                      type="text"
                      placeholder="Yangi mashina nomini kiriting"
                      value={newCarName}
                      onChange={(e) => setNewCarName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCar();
                        }
                      }}
                      className="h-10 rounded-xl border border-white/15 bg-white/5 pl-9 text-sm text-white placeholder:text-white/40 focus-visible:ring-1 focus-visible:ring-rose-500/60"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddCar}
                    disabled={addingCar || !newCarName.trim()}
                    className="h-10 px-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500/30"
                  >
                    {addingCar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Tanlangan mashinalar */}
                {formData.cars.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {formData.cars.map((car) => (
                      <span
                        key={car}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300 text-xs"
                      >
                        {car}
                        <button
                          type="button"
                          onClick={() => toggleCarSelection(car)}
                          className="hover:text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Parol */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-white/70">
                  Parol
                </Label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/70">
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Parol kiriting"
                    value={formData.password}
                    onChange={handleChange}
                    className="h-11 rounded-xl border border-white/15 bg-white/5 pl-9 text-base text-white placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-rose-500/60"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/70 transition hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="h-11 w-full rounded-xl bg-gradient-to-r from-red-500 via-rose-600 to-orange-500 text-sm font-semibold tracking-wide text-white shadow-[0_18px_35px_-18px_rgba(244,63,94,0.65)] transition-all duration-300 hover:-translate-y-1 hover:shadow-red-900/60"
                disabled={loading}
              >
                {loading ? "Ro'yxatdan o'tish..." : "Ro'yxatdan o'tish"}
              </Button>
            </form>

            <div className="text-center text-sm text-white/60">
              Hisobingiz bormi?{" "}
              <Link
                to="/login"
                className="font-semibold text-rose-300 underline-offset-4 transition hover:text-rose-200 hover:underline"
              >
                Kirish
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
