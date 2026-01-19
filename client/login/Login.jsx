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
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import BackButton from "@/components/BackButton";

const Login = () => {
  const [phone, setPhone] = useState("");
  const [displayPhone, setDisplayPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Telefon raqamni formatlash funksiyasi
  const formatPhoneNumber = (value) => {
    // Faqat raqamlarni qabul qilish
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
    // Faqat raqamlarni qabul qilish
    const numericValue = value.replace(/\D/g, "");
    // Maksimal 9 ta raqam
    if (numericValue.length <= 9) {
      setPhone(numericValue);
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
      setPhone(cleanedValue);
      setDisplayPhone(formatPhoneNumber(cleanedValue));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Internet ulanishini tekshirish
    if (!navigator.onLine) {
      toast.error("Internet aloqasi yo'q. Iltimos, internetga ulanib qayta urinib ko'ring.");
      setLoading(false);
      return;
    }

    // Oddiy foydalanuvchi uchun telefon raqam validatsiyasi (9 ta raqam)
    if (phone.length !== 9) {
      toast.error("Telefon raqam 9 ta raqamdan iborat bo'lishi kerak!");
      setLoading(false);
      return;
    }

    try {
      await login({ phone, password });
      toast.success("Muvaffaqiyatli kirish!");
      navigate("/");
    } catch (error) {
      console.error("Login error:", error);
      
      // Xato xabarini aniq ko'rsatish
      const errorMessage = error?.message || error?.toString() || "";
      
      if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError")) {
        toast.error("Server bilan bog'lanishda xatolik. Internet aloqangizni tekshiring.");
      } else if (errorMessage.includes("Noto'g'ri telefon raqam yoki parol")) {
        toast.error("Telefon raqam yoki parol noto'g'ri.");
      } else if (errorMessage) {
        toast.error(errorMessage);
      } else {
        toast.error("Kirishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8 pb-28 md:pb-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-rose-600/30 blur-3xl" />
        <div className="absolute bottom-10 left-10 h-80 w-80 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute top-24 right-0 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl" />
      </div>

      {/* Back button */}
      <div className="relative mx-auto max-w-6xl mb-6">
        <BackButton className="bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10" />
      </div>

      <div className="relative mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center">
        <Card className="relative w-full max-w-md rounded-3xl border-white/10 bg-white/10 p-6 shadow-[0_25px_60px_-40px_rgba(15,23,42,0.9)] backdrop-blur-xl">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-3xl font-semibold text-white">
              Kirish
            </CardTitle>
            <CardDescription className="text-sm text-white/65">
              AvtoFix hisobingiz uchun telefon raqam va parolni kiriting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm text-white/70">
                  Telefon raqam
                </Label>
                <div className="relative overflow-hidden rounded-xl border border-white/15 bg-white/5">
                  <div className="flex">
                    <span className="inline-flex items-center px-3 text-sm font-semibold text-gray-700 dark:text-white/80">
                      +998
                    </span>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(90) 123 45 67"
                      value={displayPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      onPaste={handlePhonePaste}
                      className="border-0 bg-transparent pl-0 text-base text-white placeholder:text-white/40 focus-visible:ring-0 flex-1"
                      required
                      maxLength={15}
                    />
                  </div>
                </div>
              </div>

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
                    type={showPassword ? "text" : "password"}
                    placeholder="Parolingizni kiriting"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl border border-white/15 bg-white/5 pl-9 text-base text-white placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-red-500/60"
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
                {loading ? "Kirish..." : "Kirish"}
              </Button>
            </form>

            <div className="text-center text-sm text-white/60">
              Hisobingiz yo'qmi?{" "}
              <Link
                to="/register"
                className="font-semibold text-rose-300 underline-offset-4 transition hover:text-rose-200 hover:underline"
              >
                Ro'yxatdan o'tish
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
