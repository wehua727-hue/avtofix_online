import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { ordersAPI } from "@/services/api";
import {
  Edit,
  Eye,
  EyeOff,
  Home,
  Package,
  User,
  Settings,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Profile = () => {
  const { currentUser, updateUser, logout, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("orders");
  const [isEditing, setIsEditing] = useState({
    name: false,
    phone: false,
    address: false,
  });
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    currentPassword: "",
    newPassword: "",
  });
  const [tempData, setTempData] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [saving, setSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [userOrders, setUserOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrderForModal, setSelectedOrderForModal] = useState(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !currentUser) {
      navigate("/login", { replace: true });
      return;
    }

    if (currentUser) {
      setFormData({
        name: currentUser.name || "",
        phone: currentUser.phone || "",
        address: currentUser.address || "",
        currentPassword: "",
        newPassword: "",
      });
      setTempData({
        name: currentUser.name || "",
        phone: currentUser.phone || "",
        address: currentUser.address || "",
      });

      // Load user's orders once profile data is ready
      const loadOrders = async () => {
        try {
          setOrdersLoading(true);
          if (currentUser.role === 'owner') {
            // Owner uchun barcha buyurtmalarni yuklash
            const orders = await ordersAPI.getAll();
            const filteredOrders = orders.filter(order => order.status !== 'cancelled');
            setUserOrders(filteredOrders);
          } else {
            // Oddiy foydalanuvchi uchun o'z buyurtmalarini yuklash
            const orders = await ordersAPI.getMyOrders();
            const filteredOrders = orders.filter(order => order.status !== 'cancelled');
            setUserOrders(filteredOrders);
          }
        } catch (error) {
          console.error("Failed to load user orders:", error);
        } finally {
          setOrdersLoading(false);
        }
      };

      loadOrders();
    }
  }, [currentUser, loading, navigate]);

  const getOrderStatusInfo = (status) => {
    const map = {
      pending: {
        label: "Kutilmoqda",
        className:
          "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
      },
      confirmed: {
        label: "Tasdiqlandi",
        className: "bg-blue-500/10 text-blue-400 border border-blue-500/30",
      },
      preparing: {
        label: "Tayyorlanmoqda",
        className:
          "bg-orange-500/10 text-orange-400 border border-orange-500/30",
      },
      shipping: {
        label: "Yetkazilmoqda",
        className:
          "bg-purple-500/10 text-purple-400 border border-purple-500/30",
      },
      delivered: {
        label: "Yetkazildi",
        className:
          "bg-green-500/10 text-green-400 border border-green-500/30",
      },
      cancelled: {
        label: "Bekor qilindi",
        className: "bg-red-500/10 text-red-400 border border-red-500/30",
      },
    };

    return map[status] || map.pending;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleTempChange = (field, value) => {
    // Telefon raqam uchun max 9 ta raqam cheklovi
    if (field === "phone") {
      // Faqat raqamlarni qabul qilish
      const numericValue = value.replace(/\D/g, "");
      // Maksimal 9 ta raqam
      if (numericValue.length <= 9) {
        setTempData({
          ...tempData,
          [field]: numericValue,
        });
      }
      return;
    }

    setTempData({
      ...tempData,
      [field]: value,
    });
  };

  const startEditing = (field) => {
    setIsEditing({
      ...isEditing,
      [field]: true,
    });
  };

  const cancelEditing = (field) => {
    setIsEditing({
      ...isEditing,
      [field]: false,
    });
    setTempData({
      ...tempData,
      [field]: currentUser[field] || "",
    });
  };

  const saveEditing = async (field) => {
    try {
      // Telefon raqam validatsiyasi (9 ta raqam)
      if (field === "phone") {
        if (tempData.phone.length !== 9) {
          toast.error("Telefon raqam 9 ta raqamdan iborat bo'lishi kerak!");
          return;
        }
      }

      // Manzil validatsiyasi
      if (field === "address") {
        if (!tempData.address || tempData.address.trim().length < 5) {
          toast.error("Manzilni to'liq kiriting!");
          return;
        }
      }

      // Barcha majburiy maydonlarni yuborish
      const updateData = {
        name: field === "name" ? tempData.name : currentUser.name,
        phone: field === "phone" ? tempData.phone : currentUser.phone,
        address: field === "address" ? tempData.address : currentUser.address,
      };

      await updateUser(updateData);
      setIsEditing({
        ...isEditing,
        [field]: false,
      });
      setFormData({
        ...formData,
        [field]: tempData[field],
      });

      const fieldNames = {
        name: "Ism",
        phone: "Telefon",
        address: "Manzil"
      };

      toast.success(`${fieldNames[field]} muvaffaqiyatli yangilandi!`);
    } catch (error) {
      toast.error(
        "Ma'lumotlarni yangilashda xatolik yuz berdi: " +
          (error.message || "Noma'lum xatolik"),
      );
      console.error("Update error:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Parol maydonlari bo'sh bo'lsa, hech narsa qilmaymiz
    if (!formData.currentPassword && !formData.newPassword) {
      toast.error(
        "Parolni o'zgartirish uchun hozirgi va yangi parolni kiriting!",
      );
      setSaving(false);
      return;
    }

    try {
      // Parol validatsiyasi
      if (!formData.currentPassword) {
        toast.error("Hozirgi parolni kiriting!");
        setSaving(false);
        return;
      }
      if (!formData.newPassword) {
        toast.error("Yangi parolni kiriting!");
        setSaving(false);
        return;
      }
      if (formData.newPassword.length < 6) {
        toast.error("Parol kamida 6 ta belgidan iborat bo'lishi kerak!");
        setSaving(false);
        return;
      }

      // Yangilash uchun kerakli ma'lumotlarni yig'ish
      const updatePayload = {
        // Majburiy maydonlar (mavjud qiymatlarni saqlash uchun)
        name: currentUser.name,
        phone: currentUser.phone,
        address: currentUser.address,
        // Parol ma'lumotlari
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      };

      await updateUser(updatePayload);

      toast.success("Parol muvaffaqiyatli yangilandi!");

      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
      }));
    } catch (error) {
      toast.error(
        "Parolni yangilashda xatolik yuz berdi: " +
          (error.message || "Noma'lum xatolik"),
      );
      console.error("Profile update error:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Yuklanmoqda...</div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:py-8 pb-24 sm:pb-8 sm:px-6 transition-colors duration-300">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-16 h-56 w-56 rounded-full bg-rose-500/10 dark:bg-rose-600/20 blur-3xl" />
        <div className="absolute top-32 right-10 h-72 w-72 rounded-full bg-violet-500/10 dark:bg-violet-500/15 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-emerald-400/10 dark:bg-emerald-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-4xl">
        {/* Profile Header Card */}
        <div className="rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-white/5 shadow-xl dark:shadow-none backdrop-blur-xl overflow-hidden">
          {/* Header Section - User Info */}
          <div className="relative p-4 sm:p-6 border-b border-gray-100 dark:border-white/10">
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 via-transparent to-orange-500/5 dark:from-rose-500/10 dark:to-orange-500/10" />
            
            <div className="relative">
              {/* User name and status */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg shadow-rose-500/25">
                    {currentUser.name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                      {currentUser.name}
                    </h1>
                  </div>
                </div>
                
                {/* Bosh sahifaga tugmasi */}
                <Button
                  onClick={() => navigate("/")}
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl border border-gray-200 dark:border-white/20 bg-white dark:bg-transparent px-3 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 gap-1.5"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Bosh sahifa</span>
                </Button>
                
                {/* Chiqish tugmasi */}
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-3 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden sm:inline">Chiqish</span>
                </Button>
              </div>
              
              {/* Contact info */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  +998 {currentUser.phone}
                </span>
                {currentUser.address && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {currentUser.address}
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Content Section */}
          <div className="flex flex-col md:flex-row">
            {/* Sidebar */}
            <div className="flex flex-row md:flex-col gap-2 border-b md:border-b-0 md:border-r border-gray-100 dark:border-white/10 p-3 sm:p-4 md:w-56 md:p-5 overflow-x-auto md:overflow-visible">
              <Button
                onClick={() => setActiveTab("orders")}
                variant="ghost"
                className={`h-9 sm:h-10 flex-shrink-0 md:w-full justify-start gap-2.5 rounded-xl text-xs sm:text-sm font-medium transition ${
                  activeTab === "orders"
                    ? "bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Package className="w-4 h-4" />
                Buyurtmalarim
              </Button>
              <Button
                onClick={() => setActiveTab("information")}
                variant="ghost"
                className={`h-9 sm:h-10 flex-shrink-0 md:w-full justify-start gap-2.5 rounded-xl text-xs sm:text-sm font-medium transition ${
                  activeTab === "information"
                    ? "bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <User className="w-4 h-4" />
                Ma'lumotlarim
              </Button>

              {/* Spacer for desktop */}
              <div className="hidden md:block md:flex-1" />

              {/* Divider + Admin Panel Button - faqat admin, manager, helper, owner uchun */}
              {(isAdmin || currentUser?.role === 'manager' || currentUser?.role === 'helper' || currentUser?.role === 'owner') && (
                <>
                  <div className="hidden md:block w-full">
                    <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent my-3" />
                  </div>
                  <Button
                    onClick={() => navigate(
                      isAdmin ? "/admin/dashboard" : 
                      currentUser?.role === 'manager' ? "/manager/admin" : 
                      currentUser?.role === 'helper' ? "/helper/admin" : 
                      currentUser?.role === 'owner' ? "/admin/dashboard" : "/admin/dashboard"
                    )}
                    variant="ghost"
                    className="h-9 sm:h-10 flex-shrink-0 md:w-full justify-start gap-2.5 rounded-xl text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                  >
                    <Settings className="w-4 h-4" />
                    Admin Panel
                  </Button>
                </>
              )}
            </div>

            {/* Main Content */}
            <div className="flex-1 p-4 sm:p-5 md:p-6">
              {activeTab === "orders" ? (
                <div className="space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />
                    Buyurtmalarim
                  </h3>
                  
                  {ordersLoading ? (
                    <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                      <div className="animate-spin h-8 w-8 border-2 border-rose-500 border-t-transparent rounded-full mx-auto mb-3" />
                      Buyurtmalar yuklanmoqda...
                    </div>
                  ) : (
                    (() => {
                      const visibleOrders = userOrders.filter(
                        (order) => order.status !== "cancelled",
                      );

                      if (visibleOrders.length === 0) {
                        return (
                          <div className="py-12 text-center rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/5">
                              <Package className="h-7 w-7 text-gray-400 dark:text-gray-500" />
                            </div>
                            <p className="text-base font-medium text-gray-700 dark:text-gray-300">
                              Buyurtmalar yo'q
                            </p>
                            <p className="mt-1 mb-5 text-sm text-gray-500 dark:text-gray-500">
                              Xarid qilishni boshlash uchun mahsulotlarni savatchaga qo'shing
                            </p>
                            {currentUser?.role !== 'owner' && (
                              <Button
                                onClick={() => navigate("/")}
                                className="h-9 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-5 text-sm font-medium text-white shadow-lg shadow-rose-500/25 transition-all hover:-translate-y-0.5"
                              >
                                Xaridni boshlash
                              </Button>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          {visibleOrders.map((order) => {
                            const statusInfo = getOrderStatusInfo(order.status);
                            return (
                              <div
                                key={order._id}
                                className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 cursor-pointer hover:border-rose-300 dark:hover:border-rose-500/30 hover:shadow-md dark:hover:shadow-none transition-all"
                                onClick={() => {
                                  setSelectedOrderForModal(order);
                                  setOrderModalOpen(true);
                                }}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                  <div className="space-y-1">
                                    <p className="text-gray-900 dark:text-white font-medium text-sm">
                                      #{order.orderNumber || "-"}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500">
                                      {order.createdAt
                                        ? new Date(order.createdAt).toLocaleString("uz-UZ")
                                        : "-"}
                                    </p>
                                  </div>
                                  <div className="flex items-center sm:flex-col sm:items-end gap-3 sm:gap-2">
                                    <div className="text-base font-bold text-gray-900 dark:text-white">
                                      {order.total?.toLocaleString?.("uz-UZ") || order.total} so'm
                                    </div>
                                    <Badge className={statusInfo.className}>
                                      {statusInfo.label}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />
                    Ma'lumotlarim
                  </h3>
                  
                  <div className="space-y-3">
                    {/* Name Field */}
                    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 transition hover:border-gray-300 dark:hover:border-white/20">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Ism
                        </Label>
                        {!isEditing.name && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                            onClick={() => startEditing("name")}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Tahrirlash
                          </Button>
                        )}
                      </div>
                      {isEditing.name ? (
                        <div className="space-y-3">
                          <Input
                            value={tempData.name}
                            onChange={(e) => handleTempChange("name", e.target.value)}
                            className="h-10 rounded-lg border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-rose-500/60"
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 text-xs rounded-lg border-gray-200 dark:border-white/20 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                              onClick={() => cancelEditing("name")}
                            >
                              Bekor qilish
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 px-4 text-xs rounded-lg bg-rose-500 hover:bg-rose-600 text-white"
                              onClick={() => saveEditing("name")}
                            >
                              Saqlash
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-900 dark:text-white text-base font-medium">
                          {currentUser.name}
                        </p>
                      )}
                    </div>

                    {/* Phone Field */}
                    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 transition hover:border-gray-300 dark:hover:border-white/20">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Telefon raqam
                        </Label>
                        {!isEditing.phone && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                            onClick={() => startEditing("phone")}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Tahrirlash
                          </Button>
                        )}
                      </div>
                      {isEditing.phone ? (
                        <div className="space-y-3">
                          <div className="flex items-center">
                            <span className="flex h-10 items-center rounded-l-lg border border-gray-200 dark:border-white/15 border-r-0 bg-gray-100 dark:bg-white/5 px-3 text-sm text-gray-600 dark:text-gray-400">
                              +998
                            </span>
                            <Input
                              value={tempData.phone}
                              onChange={(e) => handleTempChange("phone", e.target.value)}
                              className="h-10 flex-1 rounded-l-none rounded-r-lg border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-rose-500/60"
                              placeholder="991234567"
                              maxLength="9"
                              autoFocus
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 text-xs rounded-lg border-gray-200 dark:border-white/20 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                              onClick={() => cancelEditing("phone")}
                            >
                              Bekor qilish
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 px-4 text-xs rounded-lg bg-rose-500 hover:bg-rose-600 text-white"
                              onClick={() => saveEditing("phone")}
                            >
                              Saqlash
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-900 dark:text-white text-base font-medium">
                          +998 {currentUser.phone}
                        </p>
                      )}
                    </div>

                    {/* Address Field */}
                    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 transition hover:border-gray-300 dark:hover:border-white/20">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Manzil
                        </Label>
                        {!isEditing.address && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                            onClick={() => startEditing("address")}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Tahrirlash
                          </Button>
                        )}
                      </div>
                      {isEditing.address ? (
                        <div className="space-y-3">
                          <Input
                            value={tempData.address}
                            onChange={(e) => handleTempChange("address", e.target.value)}
                            placeholder="Masalan: Toshkent shahri, Chilonzor tumani"
                            className="h-10 rounded-lg border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-1 focus:ring-rose-500/60"
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 text-xs rounded-lg border-gray-200 dark:border-white/20 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                              onClick={() => cancelEditing("address")}
                            >
                              Bekor qilish
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 px-4 text-xs rounded-lg bg-rose-500 hover:bg-rose-600 text-white"
                              onClick={() => saveEditing("address")}
                            >
                              Saqlash
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-900 dark:text-white text-base font-medium">
                          {currentUser.address || "Ko'rsatilmagan"}
                        </p>
                      )}
                    </div>

                    {/* Mashinalar */}
                    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 transition hover:border-gray-300 dark:hover:border-white/20">
                      <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-2">
                        Mashinalarim
                      </Label>
                      {currentUser.cars && currentUser.cars.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {currentUser.cars.map((car, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                              </svg>
                              {car}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          Mashinalar ko'rsatilmagan
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Password Change Section */}
                  <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 sm:p-5 mt-5">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                      Parolni o'zgartirish
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      Xavfsizlik uchun parolni muntazam yangilang
                    </p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="currentPassword" className="text-xs text-gray-600 dark:text-gray-400">
                            Hozirgi parol
                          </Label>
                          <div className="relative">
                            <Input
                              id="currentPassword"
                              name="currentPassword"
                              type={showCurrentPassword ? "text" : "password"}
                              value={formData.currentPassword}
                              onChange={handleChange}
                              className="h-10 rounded-lg border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 pr-10 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-rose-500/60"
                              placeholder="Hozirgi parol"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                              {showCurrentPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-white" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-white" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="newPassword" className="text-xs text-gray-600 dark:text-gray-400">
                            Yangi parol
                          </Label>
                          <div className="relative">
                            <Input
                              id="newPassword"
                              name="newPassword"
                              type={showNewPassword ? "text" : "password"}
                              value={formData.newPassword}
                              onChange={handleChange}
                              className="h-10 rounded-lg border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 pr-10 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-rose-500/60"
                              placeholder="Yangi parol (kamida 6 ta belgi)"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                              {showNewPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-white" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-white" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          className="h-9 rounded-lg bg-rose-500 hover:bg-rose-600 px-4 text-sm font-medium text-white transition-all"
                          disabled={saving}
                        >
                          {saving ? "Saqlanmoqda..." : "Parolni o'zgartirish"}
                        </Button>
                      </div>
                    </form>
                  </div>

                  {/* Logout Button */}
                  <div className="mt-6 pt-5 border-t border-gray-200 dark:border-white/10">
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      className="w-full h-10 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium transition-all hover:bg-rose-100 dark:hover:bg-rose-500/20 hover:border-rose-300 dark:hover:border-rose-500/50"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Hisobdan chiqish
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Order details modal */}
      <Dialog open={orderModalOpen && !!selectedOrderForModal} onOpenChange={setOrderModalOpen}>
        <DialogContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Buyurtma tafsilotlari
            </DialogTitle>
          </DialogHeader>

          {selectedOrderForModal && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-white/75">
                <span>Buyurtma raqami:</span>
                <span className="font-medium text-white">
                  {selectedOrderForModal.orderNumber || "-"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-white/75">
                <span>Sana:</span>
                <span>
                  {selectedOrderForModal.createdAt
                    ? new Date(selectedOrderForModal.createdAt).toLocaleString("uz-UZ")
                    : "-"}
                </span>
              </div>

              <div className="border-t border-white/10 pt-3 space-y-2 max-h-80 overflow-y-auto">
                {Array.isArray(selectedOrderForModal.items) &&
                  selectedOrderForModal.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-3 text-sm text-white/90"
                    >
                      <div className="flex items-center gap-3">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-8 w-8 rounded-md object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium text-white text-xs sm:text-sm">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-white/60 sm:text-xs">
                            {item.quantity} x {item.price?.toLocaleString?.("uz-UZ") || item.price} so'm
                          </p>
                        </div>
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-white">
                        {(item.price * item.quantity)?.toLocaleString?.("uz-UZ") || item.price * item.quantity} so'm
                      </div>
                    </div>
                  ))}
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-1 text-sm">
                <span className="text-white/75">Jami summa:</span>
                <span className="text-base font-bold text-white">
                  {selectedOrderForModal.total?.toLocaleString?.("uz-UZ") || selectedOrderForModal.total} so'm
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
