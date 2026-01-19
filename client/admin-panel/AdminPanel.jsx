import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authAPI, productsAPI, storesAPI, professionalsAPI, uploadsAPI, ordersAPI, carBrandsAPI, specialtiesAPI } from "@/services/api";
import CategoryPicker from "@/components/CategoryPicker";
import OrdersSection from "./OrdersSection";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  ArrowLeft,
  ChevronsUpDown,
  Crosshair,
  Edit,
  Eye,
  Home,
  LayoutDashboard,
  ListOrdered,
  Loader2,
  Menu,
  Package,
  Phone,
  Pencil,
  Plus,
  Store,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";



const extractUzbekPhoneDigits = (value = "") => {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("998")) {
    digits = digits.slice(3);
  }
  return digits.slice(0, 9);
};

const formatUzbekPhone = (value = "") => {
  const digits = extractUzbekPhoneDigits(value);

  if (!value || digits.length === 0) {
    return "";
  }

  let formatted = "+998";

  if (digits.length > 0) {
    formatted += " (" + digits.slice(0, Math.min(2, digits.length));
  }

  if (digits.length >= 2) {
    formatted += ")";
  }

  if (digits.length > 2) {
    formatted += " " + digits.slice(2, Math.min(5, digits.length));
  }

  if (digits.length > 5) {
    formatted += "-" + digits.slice(5, Math.min(7, digits.length));
  }

  if (digits.length > 7) {
    formatted += "-" + digits.slice(7, Math.min(9, digits.length));
  }

  return formatted;
};

const getEmptyStoreForm = () => ({
  name: "",
  location: "",
  imageFile: null,
  imagePreview: "",
  managerUserId: "",
  postUserId: "", // POST tizimdagi kategoriyalar uchun user ID
});

const getEmptyStoreProductForm = () => ({
  name: "",
  price: "",
  originalPrice: "", // Asl narxi
  markupPercent: "", // Ustama foizi
  currency: "USD", // Default pul birligi - dollar
  condition: "new", // Mahsulot holati: new, used, refurbished
  sku: "",
  imageFile: null,
  imagePreview: "",
  images: [],
  description: "",
  categoryId: "",
  category: "",
  stockCount: "",
  variants: [],
});

const getEmptyVariantForm = () => ({
  name: "",
  sku: "", // Variant kodi
  originalPrice: "", // Asl narxi
  markupPercent: "", // Foiz
  price: "", // Sotiladigan narx
  currency: "USD", // Pul birligi
  condition: "new", // Mahsulot holati: new, used, refurbished
  imagePreview: "",
  images: [],
  description: "",
  categoryId: "",
  category: "",
  stockCount: "",
});

const getEmptyProfessionalForm = () => ({
  name: "",
  phone: "+998",
  image: "",
  images: [],
  specialties: [], // Tanlangan mutaxassisliklar (array)
  address: "",
  workingHours: "",
  experience: "",
  services: "",
  latitude: null,
  longitude: null,
  locationLink: "", // Google Maps havolasi
  locationError: "", // Location parsing xatosi
});

const CACHE_TTL_MS = 60 * 1000; // 1 minute cache lifetime

const AdminPanel = () => {
  const navigate = useNavigate();
  const { section, storeId } = useParams();
  const { currentUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [users, setUsers] = useState([]);
  const [adminAndOwners, setAdminAndOwners] = useState([]); // Admin va owner'lar ro'yxati
  const [loading, setLoading] = useState(false);
  const [totalProductsCount, setTotalProductsCount] = useState(0);
  const [updatingRoleId, setUpdatingRoleId] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [deleteUserConfirmOpen, setDeleteUserConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [storeDialogMode, setStoreDialogMode] = useState("create");
  const [editingStoreId, setEditingStoreId] = useState(null);
  const [storeForm, setStoreForm] = useState(() => getEmptyStoreForm());
  const [stores, setStores] = useState([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [storeSubmitting, setStoreSubmitting] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [storeDetailsLoading, setStoreDetailsLoading] = useState(false);
  const [storeDetailsError, setStoreDetailsError] = useState(null);
  const [storeProducts, setStoreProducts] = useState([]);
  const [storeProductsLoading, setStoreProductsLoading] = useState(false);
  const [storeProductSearch, setStoreProductSearch] = useState("");

  // Mahsulotlarni kod bo'yicha saralash (#1, #2, #3...)
  const sortedStoreProducts = useMemo(() => {
    if (storeProducts.length === 0) return [];

    // Client-side sorting
    return [...storeProducts].sort((a, b) => {
      const getNum = (p) => {
        // Asosiy ustuvorlik SKU ga beriladi (chunki user shuni #1 deb ko'radi)
        const val = p.sku || p.code || '999999';
        const str = String(val);
        const numStr = str.replace(/\D/g, '');
        const num = parseInt(numStr, 10);
        return isNaN(num) ? 999999 : num;
      };

      const numA = getNum(a);
      const numB = getNum(b);

      return numA - numB;
    });
  }, [storeProducts]);

  const [storeProductDialogMode, setStoreProductDialogMode] = useState("create");
  const [storeProductDialogOpen, setStoreProductDialogOpen] = useState(false);
  const [storeProductForm, setStoreProductForm] = useState(() => getEmptyStoreProductForm());
  const [storeProductSubmitting, setStoreProductSubmitting] = useState(false);
  const [variantInput, setVariantInput] = useState("");
  const [variantEditingIndex, setVariantEditingIndex] = useState(null);
  const [variantInputOpen, setVariantInputOpen] = useState(false);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [variantForm, setVariantForm] = useState(() => getEmptyVariantForm());
  const [variantSubmitting, setVariantSubmitting] = useState(false);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [editingStoreProductId, setEditingStoreProductId] = useState(null);
  const [storeProductDeletingId, setStoreProductDeletingId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [storeDeleting, setStoreDeleting] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState(null);
  const [professionals, setProfessionals] = useState([]);
  const [professionalsLoading, setProfessionalsLoading] = useState(false);
  const [professionalDeletingId, setProfessionalDeletingId] = useState(null);
  const [professionalDialogOpen, setProfessionalDialogOpen] = useState(false);
  const [professionalDialogMode, setProfessionalDialogMode] = useState("create");
  const [professionalForm, setProfessionalForm] = useState(() => getEmptyProfessionalForm());
  const [editingProfessionalId, setEditingProfessionalId] = useState(null);
  const [professionalSubmitting, setProfessionalSubmitting] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [carBrands, setCarBrands] = useState([]);
  const [selectedCarFilter, setSelectedCarFilter] = useState("all"); // "all" yoki mashina nomi
  const [userSearchQuery, setUserSearchQuery] = useState(""); // Foydalanuvchi qidirish
  const [professionalSearchQuery, setProfessionalSearchQuery] = useState(""); // Usta qidirish
  const [specialties, setSpecialties] = useState([]); // Barcha mutaxassisliklar
  const [newSpecialtyInput, setNewSpecialtyInput] = useState(""); // Yangi mutaxassislik input
  const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState("all"); // Mutaxassislik filteri
  const [exchangeRates, setExchangeRates] = useState({ USD: 0, RUB: 0, CNY: 0 }); // Valyuta kurslari
  const [storeAssignDialogOpen, setStoreAssignDialogOpen] = useState(false);
  const [assigningStoreUserId, setAssigningStoreUserId] = useState(null);
  const [selectedStoreForAssign, setSelectedStoreForAssign] = useState("none");
  const storeCacheRef = useRef({});
  const storeProductsCacheRef = useRef({});
  const professionalPhoneDigitsRef = useRef("");
  const categoryInputRef = useRef(null);

  const availableCategories = useMemo(() => {
    const categories = new Set();
    storeProducts.forEach((product) => {
      if (product?.category) {
        categories.add(product.category);
      }
    });
    return Array.from(categories).sort((a, b) => a.localeCompare(b, "uz"));
  }, [storeProducts]);

  const handleSelectCategory = (value) => {
    handleStoreProductFormChange("category", value);
    setCategoryPopoverOpen(false);
  };

  const handleAddCategoryShortcut = () => {
    setCategoryPopoverOpen(false);
    setTimeout(() => {
      categoryInputRef.current?.focus();
    }, 0);
  };

  // Calculate total products from all stores (including variants)
  const totalProducts = useMemo(() => {
    // If we have fetched the total count, use it
    if (totalProductsCount > 0) {
      return totalProductsCount;
    }
    // Otherwise, calculate from cache (including variants)
    return stores.reduce((total, store) => {
      const cachedProducts = storeProductsCacheRef.current[store._id]?.data;
      if (cachedProducts) {
        // Ota mahsulotlar + variantlar sonini hisoblash
        const productsWithVariants = cachedProducts.reduce((sum, product) => {
          let count = 1; // Ota mahsulot
          if (Array.isArray(product.variants) && product.variants.length > 0) {
            count += product.variants.length; // Variantlar
          }
          return sum + count;
        }, 0);
        return total + productsWithVariants;
      }
      if (store.productCount !== undefined) {
        return total + store.productCount;
      }
      if (Array.isArray(store.products)) {
        // Ota mahsulotlar + variantlar sonini hisoblash
        const productsWithVariants = store.products.reduce((sum, product) => {
          let count = 1; // Ota mahsulot
          if (Array.isArray(product.variants) && product.variants.length > 0) {
            count += product.variants.length; // Variantlar
          }
          return sum + count;
        }, 0);
        return total + productsWithVariants;
      }
      return total;
    }, 0);
  }, [stores, totalProductsCount]);

  // Mashina bo'yicha filterlangan foydalanuvchilar
  const filteredUsers = useMemo(() => {
    let result = users;

    // Mashina bo'yicha filter
    if (selectedCarFilter !== "all") {
      result = result.filter((user) => {
        const userCars = user.cars || [];
        return userCars.some(
          (car) => car.toLowerCase() === selectedCarFilter.toLowerCase()
        );
      });
    }

    // Qidiruv bo'yicha filter
    if (userSearchQuery.trim()) {
      const query = userSearchQuery.toLowerCase().trim();
      result = result.filter((user) => {
        const name = (user.name || "").toLowerCase();
        const phone = (user.phone || "").toLowerCase();
        const region = (user.region || user.address || "").toLowerCase();
        return name.includes(query) || phone.includes(query) || region.includes(query);
      });
    }

    return result;
  }, [users, selectedCarFilter, userSearchQuery]);

  // Mutaxassislik bo'yicha filterlangan ustalar
  const filteredProfessionalsBySpecialty = useMemo(() => {
    let result = professionals;

    // Xodim uchun faqat o'zi qo'shgan ustalarni ko'rsatish
    if (currentUser?.role === 'xodim') {
      result = result.filter((pro) => {
        const proCreatedBy = typeof pro.createdBy === 'object' ? pro.createdBy?._id || pro.createdBy?.id : pro.createdBy;
        return proCreatedBy === currentUser.id;
      });
    }

    // Mutaxassislik bo'yicha filter
    if (selectedSpecialtyFilter !== "all") {
      result = result.filter((pro) => {
        const proSpecialties = pro.specialties || [];
        const proSpecialty = pro.specialty || "";
        return (
          proSpecialties.some(
            (s) => s.toLowerCase() === selectedSpecialtyFilter.toLowerCase()
          ) ||
          proSpecialty.toLowerCase().includes(selectedSpecialtyFilter.toLowerCase())
        );
      });
    }

    // Qidiruv bo'yicha filter
    if (professionalSearchQuery.trim()) {
      const query = professionalSearchQuery.toLowerCase().trim();
      result = result.filter((pro) => {
        const name = (pro.name || "").toLowerCase();
        const phone = (pro.phone || "").toLowerCase();
        const address = (pro.address || "").toLowerCase();
        const specialty = (pro.specialty || "").toLowerCase();
        const specialties = (pro.specialties || []).join(" ").toLowerCase();
        return name.includes(query) || phone.includes(query) || address.includes(query) || specialty.includes(query) || specialties.includes(query);
      });
    }

    return result;
  }, [professionals, selectedSpecialtyFilter, professionalSearchQuery, currentUser]);

  const stats = useMemo(() => {
    // Sotilgan va qaytarilgan mahsulotlarni hisoblash
    const soldOrders = orders.filter(o => o.status === 'delivered').length;
    const returnedOrders = orders.filter(o => o.status === 'returned').length;

    // Xodim uchun: mahsulotlar, ustalar va buyurtmalar
    if (currentUser?.role === 'xodim') {
      const xodimProfessionals = professionals.filter((pro) => {
        const proCreatedBy = typeof pro.createdBy === 'object' ? pro.createdBy?._id || pro.createdBy?.id : pro.createdBy;
        return proCreatedBy === currentUser.id;
      });
      return [
        { title: "Jami mahsulotlar", value: (totalProducts || 0).toString() },
        { title: "Faol ustalar", value: (xodimProfessionals?.length || 0).toString() },
        { title: "Sotilgan", value: soldOrders.toString(), color: "text-green-600 dark:text-green-400" },
        { title: "Qaytarilgan", value: returnedOrders.toString(), color: "text-red-600 dark:text-red-400" },
      ];
    }

    // Ega va boshqalar uchun barcha stat'lar
    return [
      { title: "Jami mahsulotlar", value: (totalProducts || 0).toString() },
      { title: "Faol ustalar", value: (professionals?.length || 0).toString() },
      { title: "Sotilgan", value: soldOrders.toString(), color: "text-green-600 dark:text-green-400" },
      { title: "Qaytarilgan", value: returnedOrders.toString(), color: "text-red-600 dark:text-red-400" },
      { title: "Jami foydalanuvchilar", value: (users?.length || 0).toString() }
    ];
  }, [totalProducts, professionals, orders, users, currentUser]);

  // Menu items - barcha rollar uchun
  const menuItems = useMemo(() => {
    if (currentUser?.role === "xodim") {
      // Xodim uchun: dashboard, store, masters, professionals, orders
      return [
        { id: "dashboard", label: "Boshqaruv paneli", icon: LayoutDashboard },
        { id: "store", label: "Magazin", icon: Store },
        { id: "masters", label: "Usta qo'shish", icon: Users },
        { id: "professionals", label: "Ustalar", icon: Users },
        { id: "orders", label: "Buyurtmalar", icon: ListOrdered },
      ];
    }
    // Barcha rollar uchun kategoriyalarsiz
    return [
      { id: "dashboard", label: "Boshqaruv paneli", icon: LayoutDashboard },
      { id: "store", label: "Magazin", icon: Store },
      { id: "masters", label: "Usta qo'shish", icon: Users },
      { id: "professionals", label: "Ustalar", icon: Users },
      { id: "users", label: "Foydalanuvchilar", icon: Users },
      { id: "orders", label: "Buyurtmalar", icon: ListOrdered },
    ];
  }, [currentUser?.role]);

  useEffect(() => {
    if (!section) {
      navigate("/admin/dashboard", { replace: true });
      return;
    }

    // Xodim uchun faqat "users" va "categories" bo'limlarini yashirish
    if (currentUser?.role === 'xodim' && (section === 'users' || section === 'categories')) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [section, navigate, currentUser?.role]);

  const activeSection = useMemo(() => {
    const fallback = "dashboard";
    if (!section) {
      return fallback;
    }

    // Xodim uchun faqat "users" va "categories" bo'limlarini yashirish
    if (currentUser?.role === 'xodim' && (section === 'users' || section === 'categories')) {
      return fallback;
    }

    if (section === "store" && storeId) {
      return "store-products";
    }
    const exists = menuItems.some((item) => item.id === section);
    return exists ? section : fallback;
  }, [section, storeId, menuItems, currentUser?.role]);

  const currentSectionLabel = useMemo(() => {
    if (activeSection === "store-products") {
      return "Mahsulotlar";
    }
    return menuItems.find((item) => item.id === activeSection)?.label || "Admin Panel";
  }, [activeSection, menuItems]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const usersData = await authAPI.getAll();
      setUsers(usersData);

      // Admin va owner'larni ajratib olish
      const adminsAndOwners = usersData.filter(u => u.role === 'admin' || u.role === 'owner');
      setAdminAndOwners(adminsAndOwners);
    } catch (error) {
      console.error("Fetch users error details:", error);
      toast.error("Foydalanuvchilarni olishda xatolik: " + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteProfessional = async (professionalId) => {
    if (!professionalId) {
      return;
    }

    // Admin faqat o'zi yaratgan ustani o'chiradi
    const professional = professionals.find(p => p._id === professionalId);
    if (currentUser?.role === "admin" && professional?.createdBy !== currentUser.id) {
      toast.error("Siz faqat o'zingiz yaratgan ustani o'chirishingiz mumkin");
      return;
    }

    try {
      setProfessionalDeletingId(professionalId);
      await professionalsAPI.delete(professionalId);
      setProfessionals((prev) => prev.filter((pro) => pro._id !== professionalId));
      toast.success("Usta o'chirildi");
    } catch (error) {
      console.error("Delete professional error:", error);
      toast.error(error.message || "Ustani o'chirishda xatolik");
    } finally {
      setProfessionalDeletingId(null);
    }
  };

  const fetchProfessionals = useCallback(async () => {
    try {
      setProfessionalsLoading(true);
      const results = await professionalsAPI.getAll({ adminPanel: true });
      // API yangi formatda professionals array qaytaradi yoki to'g'ridan-to'g'ri array
      let professionalsData = results.professionals || results;
      professionalsData = Array.isArray(professionalsData) ? professionalsData : [];

      // Xodim uchun faqat o'zi qo'shgan ustalarni ko'rsatish
      if (currentUser?.role === 'xodim') {
        professionalsData = professionalsData.filter((pro) => {
          const proCreatedBy = typeof pro.createdBy === 'object' ? pro.createdBy?._id || pro.createdBy?.id : pro.createdBy;
          return proCreatedBy === currentUser.id;
        });
      }

      setProfessionals(professionalsData);
    } catch (error) {
      console.error("Fetch professionals error:", error);
      toast.error("Ustalarni olishda xatolik: " + (error.message || "Noma'lum xatolik"));
    } finally {
      setProfessionalsLoading(false);
    }
  }, [currentUser]);

  const fetchOrders = useCallback(async () => {
    try {
      const results = await ordersAPI.getAll();
      setOrders(results);
    } catch (error) {
      console.error("Fetch orders error:", error);
      // Не показываем ошибку, так как заказы могут быть недоступны для некоторых пользователей
    }
  }, []);

  const fetchCarBrands = useCallback(async () => {
    try {
      const brands = await carBrandsAPI.getAll();
      setCarBrands(brands);
    } catch (error) {
      console.error("Fetch car brands error:", error);
    }
  }, []);

  const fetchSpecialties = useCallback(async () => {
    try {
      const data = await specialtiesAPI.getAll();
      setSpecialties(data);
    } catch (error) {
      console.error("Fetch specialties error:", error);
    }
  }, []);

  // O'zbekiston Markaziy Banki valyuta kurslarini olish
  const fetchExchangeRates = useCallback(async () => {
    try {
      const response = await fetch('https://cbu.uz/uz/arkhiv-kursov-valyut/json/');
      if (response.ok) {
        const data = await response.json();
        const rates = { USD: 0, RUB: 0, CNY: 0 };
        data.forEach((item) => {
          if (item.Ccy === 'USD') rates.USD = parseFloat(item.Rate);
          if (item.Ccy === 'RUB') rates.RUB = parseFloat(item.Rate);
          if (item.Ccy === 'CNY') rates.CNY = parseFloat(item.Rate);
        });
        setExchangeRates(rates);
      }
    } catch (error) {
      console.error("Fetch exchange rates error:", error);
    }
  }, []);

  // Yangi mutaxassislik qo'shish
  const handleAddSpecialty = async () => {
    const name = newSpecialtyInput.trim();
    if (!name) return;

    try {
      const newSpecialty = await specialtiesAPI.add(name);
      setSpecialties((prev) => [...prev, newSpecialty].sort((a, b) => a.name.localeCompare(b.name)));
      setNewSpecialtyInput("");
      // Yangi qo'shilgan mutaxassislikni avtomatik tanlash
      setProfessionalForm((prev) => ({
        ...prev,
        specialties: [...(prev.specialties || []), newSpecialty.name],
      }));
      toast.success(`"${name}" mutaxassisligi qo'shildi`);
    } catch (error) {
      toast.error(error.message || "Mutaxassislik qo'shishda xatolik");
    }
  };

  // Mutaxassislik tanlash/bekor qilish
  const handleToggleSpecialty = (specialtyName) => {
    setProfessionalForm((prev) => {
      const current = prev.specialties || [];
      if (current.includes(specialtyName)) {
        return { ...prev, specialties: current.filter((s) => s !== specialtyName) };
      }
      return { ...prev, specialties: [...current, specialtyName] };
    });
  };

  const cacheStoreEntry = useCallback((store) => {
    if (!store?._id) {
      return;
    }
    storeCacheRef.current = {
      ...storeCacheRef.current,
      [store._id]: { data: store, fetchedAt: Date.now() },
    };
  }, []);

  const fetchStores = useCallback(async () => {
    try {
      setStoresLoading(true);
      const data = await storesAPI.getAll();
      setStores(data);
      data.forEach(cacheStoreEntry);
    } catch (error) {
      console.error("Fetch stores error:", error);
      toast.error(error.message || "Magazinlarni olishda xatolik");
    } finally {
      setStoresLoading(false);
    }
  }, [cacheStoreEntry]);

  const handleProfessionalDialogChange = (open) => {
    setProfessionalDialogOpen(open);
    if (!open) {
      setProfessionalDialogMode("create");
      setEditingProfessionalId(null);
      setProfessionalSubmitting(false);
      setProfessionalForm(getEmptyProfessionalForm());
      professionalPhoneDigitsRef.current = "";
    }
  };

  const handleProfessionalFormChange = (field, value, event) => {
    if (field === "phone") {
      const inputType = event?.nativeEvent?.inputType;
      let digits = extractUzbekPhoneDigits(value);

      if (
        inputType === "deleteContentBackward" &&
        digits === professionalPhoneDigitsRef.current &&
        digits.length > 0
      ) {
        digits = digits.slice(0, -1);
      }

      professionalPhoneDigitsRef.current = digits;

      const formatted = digits.length === 0 ? (value.trim() === "" ? "" : "+998") : formatUzbekPhone(digits);
      setProfessionalForm((prev) => ({ ...prev, phone: formatted }));
      return;
    }

    // Location link parsing
    if (field === "locationLink") {
      setProfessionalForm((prev) => {
        const newForm = { ...prev, locationLink: value, locationError: "" };

        if (value.trim()) {
          try {
            // Telegram va Google Maps link'dan koordinatalarni ajratish
            const parseLocationFromLink = (link) => {
              // 1. Google Maps link formatlar:
              // https://google.com/maps?q=40.109076,64.686012&z=16
              // https://www.google.com/maps?q=40.109076,64.686012
              // https://maps.google.com/maps?q=40.109076,64.686012

              // 2. Telegram location formatlar:
              // https://maps.google.com/?q=40.109076,64.686012
              // 40.109076,64.686012 (faqat koordinatalar)
              // Location: 40.109076, 64.686012

              // 3. Boshqa formatlar:
              // geo:40.109076,64.686012

              // Avval oddiy koordinatalar formatini tekshirish
              const simpleCoordMatch = link.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
              if (simpleCoordMatch) {
                const lat = parseFloat(simpleCoordMatch[1]);
                const lng = parseFloat(simpleCoordMatch[2]);

                // Koordinatalar to'g'ri oraliqda ekanligini tekshirish
                if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                  return { ...newForm, latitude: lat, longitude: lng };
                }
              }

              // URL'dan q= parametrini qidirish
              const qMatch = link.match(/[?&]q=([^&]+)/);
              if (qMatch) {
                const coords = decodeURIComponent(qMatch[1]);
                // Koordinatalar: lat,lng formatida
                const coordMatch = coords.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
                if (coordMatch) {
                  const lat = parseFloat(coordMatch[1]);
                  const lng = parseFloat(coordMatch[2]);

                  // Koordinatalar to'g'ri oraliqda ekanligini tekshirish
                  if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                    return { ...newForm, latitude: lat, longitude: lng };
                  }
                }
              }

              // geo: protokolini tekshirish
              const geoMatch = link.match(/^geo:(-?\d+\.?\d*),(-?\d+\.?\d*)/);
              if (geoMatch) {
                const lat = parseFloat(geoMatch[1]);
                const lng = parseFloat(geoMatch[2]);

                if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                  return { ...newForm, latitude: lat, longitude: lng };
                }
              }

              // Agar parsing muvaffaqiyatsiz bo'lsa
              throw new Error("Havola noto'g'ri formatda");
            };

            const result = parseLocationFromLink(value);
            return result;
          } catch (error) {
            return {
              ...newForm,
              locationError: "Location noto'g'ri formatda. Masalan: https://google.com/maps?q=40.109076,64.686012 yoki 40.109076,64.686012"
            };
          }
        } else {
          // Bo'sh qiymat - koordinatalarni tozalash
          return { ...newForm, latitude: null, longitude: null };
        }
      });
      return;
    }

    setProfessionalForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleOpenProfessionalDialog = () => {
    setProfessionalDialogMode("create");
    setEditingProfessionalId(null);
    setProfessionalForm(getEmptyProfessionalForm());
    professionalPhoneDigitsRef.current = "";
    setProfessionalDialogOpen(true);
  };

  const handleEditProfessional = (professional) => {
    if (!professional?._id) {
      toast.error("Usta topilmadi");
      return;
    }

    // Admin faqat o'zi yaratgan ustani tahrirlaydi
    if (currentUser?.role === "admin" && professional.createdBy !== currentUser.id) {
      toast.error("Siz faqat o'zingiz yaratgan ustani tahrirlashingiz mumkin");
      return;
    }

    setProfessionalDialogMode("edit");
    setEditingProfessionalId(professional._id);
    const professionalDigits = extractUzbekPhoneDigits(professional.phone ?? "");
    const gallery = Array.isArray(professional.images)
      ? professional.images.filter(Boolean)
      : professional.image
        ? [professional.image]
        : [];

    // specialty string yoki array bo'lishi mumkin
    const existingSpecialties = Array.isArray(professional.specialties)
      ? professional.specialties
      : professional.specialty
        ? [professional.specialty]
        : [];

    setProfessionalForm({
      name: professional.name ?? "",
      phone: professionalDigits.length === 0 ? "" : formatUzbekPhone(professional.phone ?? ""),
      image: gallery[0] ?? "",
      images: gallery,
      specialties: existingSpecialties,
      address: professional.address ?? "",
      workingHours: professional.workingHours ?? "",
      experience: professional.experience ?? "",
      services: Array.isArray(professional.services)
        ? professional.services.filter(Boolean).join(", ")
        : "",
      createdByUserId: professional.createdBy || currentUser?.id || "",
      latitude: professional.latitude ?? null,
      longitude: professional.longitude ?? null,
      locationLink: "", // Edit qilganda bo'sh qoldirish
      locationError: "",
    });
    professionalPhoneDigitsRef.current = professionalDigits;
    setProfessionalDialogOpen(true);
  };

  const handleProfessionalImageChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const valid = files.filter((f) => f.type?.startsWith("image/"));
    if (!valid.length) {
      toast.error("Faqat rasm fayllari tanlang");
      return;
    }
    try {
      const uploaded = [];
      for (const file of valid) {
        const { url } = await uploadsAPI.upload(file, "professionals");
        uploaded.push(url);
      }
      setProfessionalForm((prev) => {
        const nextImages = [...(prev.images || []), ...uploaded];
        const nextImage = prev.image || nextImages[0] || "";
        return { ...prev, images: nextImages, image: nextImage };
      });
      toast.success(`${uploaded.length} ta rasm yuklandi`);
      // reset input to allow re-selecting same files
      event.target.value = "";
    } catch (e) {
      toast.error(e.message || "Rasmni yuklab bo'lmadi");
    }
  };

  const handleRemoveProfessionalImage = (index) => {
    setProfessionalForm((prev) => {
      const nextImages = [...(prev.images || [])];
      nextImages.splice(index, 1);
      const nextImage = nextImages[0] || "";
      return { ...prev, images: nextImages, image: nextImage };
    });
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Brauzeringiz geolokatsiyani qo'llab-quvvatlamaydi");
      return;
    }

    setGeoLoading(true);
    toast.info("GPS orqali manzil aniqlanmoqda...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        // Koordinatalarni saqlash
        setProfessionalForm((prev) => ({
          ...prev,
          latitude: latitude,
          longitude: longitude,
        }));

        // Nominatim API orqali manzilni aniqlash
        try {
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
            const address = data.address || {};

            // Manzil qismlarini yig'ish
            const parts = [];

            // Davlat
            if (address.country) parts.push(address.country);

            // Viloyat
            if (address.state) parts.push(address.state);

            // Tuman
            const district = address.county || address.city_district || address.district;
            if (district) parts.push(district);

            // Shahar/qishloq
            const city = address.city || address.town || address.village || address.hamlet;
            if (city && city !== district) parts.push(city);

            // Mahalla
            if (address.suburb || address.neighbourhood) {
              parts.push(address.suburb || address.neighbourhood);
            }

            // Ko'cha
            if (address.road) parts.push(address.road);

            // Uy raqami
            if (address.house_number) parts.push(address.house_number + "-uy");

            const fullAddress = parts.join(", ");

            if (fullAddress) {
              setProfessionalForm((prev) => ({
                ...prev,
                address: fullAddress,
              }));
              toast.success(`Manzil aniqlandi (${Math.round(accuracy)}m aniqlik)`);
            } else {
              toast.success(`Koordinatalar aniqlandi (${Math.round(accuracy)}m). Manzilni qo'lda yozing.`);
            }
          } else {
            toast.success(`Koordinatalar aniqlandi (${Math.round(accuracy)}m). Manzilni qo'lda yozing.`);
          }
        } catch (geoError) {
          console.warn('Reverse geocoding failed:', geoError);
          toast.success(`Koordinatalar aniqlandi (${Math.round(accuracy)}m). Manzilni qo'lda yozing.`);
        }

        setGeoLoading(false);
      },
      (error) => {
        setGeoLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Joylashuvga ruxsat berilmadi. Iltimos, brauzer sozlamalaridan ruxsat bering.");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Joylashuv ma'lumotlari mavjud emas");
            break;
          case error.TIMEOUT:
            toast.error("Joylashuvni aniqlash vaqti tugadi. Qaytadan urinib ko'ring.");
            break;
          default:
            toast.error("Joylashuvni aniqlashda xatolik yuz berdi");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      }
    );
  };

  const handleProfessionalSubmit = async (event) => {
    event.preventDefault();

    const trimmedForm = {
      name: professionalForm.name.trim(),
      phone: professionalForm.phone.trim(),
      image: (professionalForm.image || "").trim() || (professionalForm.images?.[0] || ""),
      images: (professionalForm.images || []).map((u) => (u || "").trim()).filter(Boolean),
      specialties: professionalForm.specialties || [],
      specialty: (professionalForm.specialties || []).join(", "), // Eski format uchun
      address: professionalForm.address.trim(),
      workingHours: professionalForm.workingHours.trim(),
      experience: professionalForm.experience.trim(),
      services: professionalForm.services
        .split(",")
        .map((service) => service.trim())
        .filter(Boolean),
      latitude: professionalForm.latitude,
      longitude: professionalForm.longitude,
    };

    console.log('🔧 Professional form data:', {
      name: trimmedForm.name,
      latitude: trimmedForm.latitude,
      longitude: trimmedForm.longitude,
      address: trimmedForm.address
    });

    if (!trimmedForm.name || !trimmedForm.phone) {
      toast.error("Ism va telefon majburiy");
      return;
    }

    try {
      setProfessionalSubmitting(true);
      if (professionalDialogMode === "edit" && editingProfessionalId) {
        const updated = await professionalsAPI.update(editingProfessionalId, trimmedForm);
        setProfessionals((prev) =>
          prev.map((pro) => (pro._id === editingProfessionalId ? updated : pro)),
        );
        toast.success("Usta ma'lumotlari yangilandi");
      } else {
        const created = await professionalsAPI.create({
          ...trimmedForm,
          isActive: true,
        });
        setProfessionals((prev) => [created, ...prev]);
        toast.success("Yangi usta qo'shildi");
      }
      handleProfessionalDialogChange(false);
    } catch (error) {
      console.error("Save professional error:", error);
      toast.error(error.message || "Ustani saqlashda xatolik yuz berdi");
    } finally {
      setProfessionalSubmitting(false);
    }
  };

  // Fetch users on mount (kerak bo'ladi magazin/mahsulot qo'shishda)
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Valyuta kurslarini yuklash
  useEffect(() => {
    fetchExchangeRates();
  }, [fetchExchangeRates]);

  // Fetch all users
  useEffect(() => {
    if (activeSection === "users") {
      fetchUsers();
      fetchCarBrands();
    }
  }, [activeSection, fetchUsers, fetchCarBrands]);

  useEffect(() => {
    if (activeSection === "masters" || activeSection === "professionals") {
      fetchProfessionals();
      fetchSpecialties(); // Mutaxassisliklarni yuklash
    }
  }, [activeSection, fetchProfessionals, fetchSpecialties]);

  useEffect(() => {
    if (activeSection === "orders") {
      fetchOrders();
    }
  }, [activeSection, fetchOrders]);

  // Ensure stores are loaded when viewing users (to show manager's store name)
  useEffect(() => {
    if (activeSection === "users" && stores.length === 0) {
      fetchStores();
    }
  }, [activeSection, stores.length, fetchStores]);

  // Load dashboard data
  useEffect(() => {
    if (activeSection === "dashboard") {
      // Xodim uchun users yuklanmaydi
      if (currentUser?.role !== 'xodim') {
        fetchUsers();
      }
      fetchProfessionals();
      fetchOrders();
      fetchStores();

      // Fetch total products count (including variants)
      const fetchTotalProducts = async () => {
        try {
          const response = await productsAPI.getAll({ expandVariants: true, limit: 999999 });
          const allProducts = response.products || response;

          // Ota mahsulotlar + variantlar sonini hisoblash
          const totalWithVariants = allProducts.reduce((sum, product) => {
            let count = 1; // Ota mahsulot
            if (Array.isArray(product.variants) && product.variants.length > 0) {
              count += product.variants.length; // Variantlar
            }
            return sum + count;
          }, 0);

          console.log('📊 Total products (with variants):', totalWithVariants);
          console.log('📦 Total parent products:', allProducts.length);
          setTotalProductsCount(totalWithVariants);
        } catch (error) {
          console.error('Error fetching total products:', error);
        }
      };
      fetchTotalProducts();
    }
  }, [activeSection, fetchUsers, fetchProfessionals, fetchOrders, fetchStores, currentUser?.role]);

  const handleDeleteUser = (userId) => {
    if (!userId) {
      return;
    }

    if (currentUser?.id === userId) {
      toast.error("O'zingizni o'chira olmaysiz");
      return;
    }

    // Admin owner'ni o'chira olmaydi
    const targetUser = users.find(u => u.id === userId);
    if (currentUser?.role === "admin" && targetUser?.role === "owner") {
      toast.error("Siz adminsiz, owner'ni o'chira olmaysiz. Faqat owner boshqa owner'ni o'chira oladi.");
      return;
    }

    setUserToDelete(targetUser);
    setDeleteUserConfirmOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setDeletingUserId(userToDelete.id);
      await authAPI.delete(userToDelete.id);
      setUsers((prev) => prev.filter((user) => user.id !== userToDelete.id));
      toast.success("Foydalanuvchi o'chirildi");
      setDeleteUserConfirmOpen(false);
      setUserToDelete(null);
    } catch (error) {
      toast.error(error.message || "Foydalanuvchini o'chirishda xatolik");
      console.error("Delete user error:", error);
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleRoleChange = async (userId, nextRole) => {
    // O'z rolini pasaytirish mumkin emas
    if (currentUser?.id === userId && !["admin", "owner"].includes(nextRole)) {
      toast.error("O'zingizning admin/owner rolingizni olib tashlay olmaysiz");
      return;
    }

    // Admin owner yarata olmaydi
    if (currentUser?.role === "admin" && nextRole === "owner") {
      toast.error("Siz adminsiz, owner qo'sha olmaysiz. Faqat owner boshqa owner qo'sha oladi.");
      return;
    }

    // Admin owner'ning rolini o'zgartira olmaydi
    const targetUser = users.find(u => u.id === userId);
    if (currentUser?.role === "admin" && targetUser?.role === "owner") {
      toast.error("Siz owner'ning ma'lumotlarini o'zgartira olmaysiz. Faqat owner boshqa owner'ni o'zgartira oladi.");
      return;
    }

    try {
      setUpdatingRoleId(userId);
      const updatedUser = await authAPI.updateRole(userId, nextRole);
      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, ...updatedUser } : user)),
      );

      // Agar xodim roliga o'zgartirilgan bo'lsa, magazin biriktirish dialogini ochish
      if (nextRole === "xodim") {
        setAssigningStoreUserId(userId);
        setSelectedStoreForAssign(updatedUser.managerOfShop || "none");
        setStoreAssignDialogOpen(true);
      } else {
        toast.success("Rol yangilandi");
      }
    } catch (error) {
      toast.error(error.message || "Rolni yangilashda xatolik");
      console.error("Role update error:", error);
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleAssignStore = async () => {
    if (!assigningStoreUserId) return;

    try {
      setUpdatingRoleId(assigningStoreUserId);
      const storeIdToAssign = selectedStoreForAssign === "none" || !selectedStoreForAssign ? null : selectedStoreForAssign;
      const updatedUser = await authAPI.assignStore(assigningStoreUserId, storeIdToAssign);
      setUsers((prev) =>
        prev.map((user) => (user.id === assigningStoreUserId ? { ...user, ...updatedUser } : user)),
      );
      toast.success("Magazin biriktirildi");
      setStoreAssignDialogOpen(false);
      setAssigningStoreUserId(null);
      setSelectedStoreForAssign("none");
    } catch (error) {
      toast.error(error.message || "Magazin biriktirishda xatolik");
      console.error("Assign store error:", error);
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleStoreFormChange = (field, value) => {
    setStoreForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleStoreImageChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setStoreForm((prev) => ({ ...prev, imageFile: null, imagePreview: "" }));
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setStoreForm((prev) => ({ ...prev, imageFile: file, imagePreview: previewUrl }));
  };

  const handleOpenCreateStore = () => {
    setStoreDialogMode("create");
    setEditingStoreId(null);
    const emptyForm = getEmptyStoreForm();
    setStoreForm(emptyForm);
    setStoreDialogOpen(true);
  };

  const handleStoreDialogOpenChange = (open) => {
    setStoreDialogOpen(open);
    if (!open) {
      setStoreDialogMode("create");
      setEditingStoreId(null);
      setStoreSubmitting(false);
      setStoreForm(getEmptyStoreForm());
    }
  };
  const clearStoreProductsState = useCallback(() => {
    setSelectedStore(null);
    setStoreDetailsError(null);
    setStoreDetailsLoading(false);
    setStoreProducts([]);
    setStoreProductsLoading(false);
    setStoreProductDialogMode("create");
    setStoreProductDialogOpen(false);
    setStoreProductSubmitting(false);
    setStoreProductDeletingId(null);
    setStoreProductForm(getEmptyStoreProductForm());
    setEditingStoreProductId(null);
  }, []);

  const cacheStoreProductsEntry = useCallback((storeId, products) => {
    if (!storeId) {
      return;
    }
    storeProductsCacheRef.current = {
      ...storeProductsCacheRef.current,
      [storeId]: { data: products, fetchedAt: Date.now() },
    };
  }, []);

  const getIsFresh = (entry) => entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS;

  const fetchStoreDetailsFresh = useCallback(
    async (id) => {
      try {
        setStoreDetailsLoading(true);
        setStoreDetailsError(null);
        const store = await storesAPI.getById(id);
        setSelectedStore(store);
        cacheStoreEntry(store);
      } catch (error) {
        console.error("Fetch store details error:", error);
        const message = error?.message || "Magazin ma'lumotlarini olishda xatolik";
        setStoreDetailsError(message);
        toast.error(message);
      } finally {
        setStoreDetailsLoading(false);
      }
    },
    [cacheStoreEntry]
  );

  const fetchStoreProductsFresh = useCallback(
    async (id) => {
      try {
        setStoreProductsLoading(true);

        // Cache'ni tozalash
        delete storeProductsCacheRef.current[id];

        const products = await productsAPI.getAll({ storeId: id, includeInactive: true, adminPanel: true });

        console.log('📦 Products received from API:', products.length);
        console.log('✅ Backend tomonidan tartiblangan mahsulotlar (birinchi 10):');
        products.slice(0, 10).forEach((p, i) => {
          console.log(`${i + 1}. ${p.name} - Code: ${p.code}, SKU: ${p.sku}`);
        });

        // Backendda allaqachon tartiblangan mahsulotlarni to'g'ridan-to'g'ri o'rnatish
        setStoreProducts(products);
        cacheStoreProductsEntry(id, products);
      } catch (error) {
        console.error("Fetch store products error:", error);
        toast.error(error.message || "Mahsulotlarni olishda xatolik yuz berdi");
      } finally {
        setStoreProductsLoading(false);
      }
    },
    [cacheStoreProductsEntry]
  );

  useEffect(() => {
    if (activeSection !== "store-products") {
      clearStoreProductsState();
      return;
    }

    if (!storeId) {
      toast.error("Magazin aniqlanmadi");
      navigate("/admin/store", { replace: true });
      return;
    }

    const cachedStoreEntry = storeCacheRef.current[storeId];
    const cachedProductsEntry = storeProductsCacheRef.current[storeId];

    if (cachedStoreEntry?.data) {
      setSelectedStore(cachedStoreEntry.data);
      setStoreDetailsError(null);
      setStoreDetailsLoading(false);
    }

    if (cachedProductsEntry?.data) {
      // Cache'dan kelgan mahsulotlar allaqachon backendda tartiblangan
      console.log('📦 Cache\'dan olingan tartiblangan mahsulotlar (birinchi 5):', cachedProductsEntry.data.slice(0, 5).map(p => `${p.code || p.sku}`));
      setStoreProducts(cachedProductsEntry.data);
      setStoreProductsLoading(false);
    }

    const shouldFetchStore = !getIsFresh(cachedStoreEntry);
    const shouldFetchProducts = !getIsFresh(cachedProductsEntry);

    if (shouldFetchStore) {
      fetchStoreDetailsFresh(storeId);
    }

    if (shouldFetchProducts) {
      fetchStoreProductsFresh(storeId);
    }
  }, [activeSection, storeId, fetchStoreDetailsFresh, fetchStoreProductsFresh, clearStoreProductsState, navigate]);

  const handleViewStoreProducts = (store) => {
    navigate(`/admin/store/${store._id}`);
  };

  const handleStoreProductDialogChange = (open) => {
    setStoreProductDialogOpen(open);
    if (!open) {
      setStoreProductDialogMode("create");
      setEditingStoreProductId(null);
      setStoreProductSubmitting(false);
      setStoreProductForm(getEmptyStoreProductForm());
      setVariantInput("");
      setVariantEditingIndex(null);
      setVariantInputOpen(false);
      setVariantDialogOpen(false);
    }
  };

  // Generate next SKU based on existing products
  const handleOpenStoreProductDialog = async () => {
    if (!selectedStore?._id) {
      toast.error("Magazin topilmadi");
      return;
    }
    setStoreProductDialogMode("create");
    setEditingStoreProductId(null);

    // Serverdan keyingi kodni olish (magazin bo'yicha)
    const nextCode = await productsAPI.getNextCode(selectedStore._id);

    const emptyForm = getEmptyStoreProductForm();
    emptyForm.sku = nextCode || "1";
    setStoreProductForm(emptyForm);
    setStoreProductDialogOpen(true);
    setVariantInput("");
    setVariantEditingIndex(null);
    setVariantInputOpen(false);
  };

  const handleEditStoreProduct = (product) => {
    if (!product?._id) {
      toast.error("Mahsulot topilmadi");
      return;
    }

    // Admin o'zi yaratgan mahsulot YOKI o'z magazinidagi mahsulotni tahrirlaydi
    if (currentUser?.role === "admin") {
      const productCreatedById = typeof product.createdBy === 'object' ? product.createdBy?._id || product.createdBy?.id : product.createdBy;
      const storeCreatedById = typeof selectedStore?.createdBy === 'object' ? selectedStore.createdBy?._id || selectedStore.createdBy?.id : selectedStore?.createdBy;
      const isOwnProduct = productCreatedById === currentUser.id;
      const isOwnStoreProduct = storeCreatedById === currentUser.id;

      if (!isOwnProduct && !isOwnStoreProduct) {
        toast.error("Siz faqat o'zingiz yaratgan yoki o'z magaziningizdagi mahsulotni tahrirlashingiz mumkin");
        return;
      }
    }

    setStoreProductDialogMode("edit");
    setEditingStoreProductId(product._id);

    // POST tizim va marketplace maydon nomlari farq qilishi mumkin:
    // POST: stock, basePrice, priceMultiplier
    // Marketplace: stockCount, originalPrice, markupPercent
    const fallbackStockCount =
      product.stockCount !== undefined && product.stockCount !== null
        ? product.stockCount
        : product.stock !== undefined && product.stock !== null
          ? product.stock
          : product.inStock
            ? 1
            : 0;

    // Asl narxi - originalPrice yoki basePrice
    const fallbackOriginalPrice =
      product.originalPrice ??
      (product.basePrice !== null && product.basePrice !== undefined ? String(product.basePrice) : "") ??
      product.originalPriceString ??
      product.originalBasePriceString ??
      "";

    // Foiz - markupPercent yoki priceMultiplier (POST tizimda to'g'ridan-to'g'ri foiz sifatida saqlanadi)
    let fallbackMarkupPercent = product.markupPercent ?? "";
    if (!fallbackMarkupPercent && product.priceMultiplier !== null && product.priceMultiplier !== undefined) {
      // POST tizimda priceMultiplier = 20 degani 20% ustama
      fallbackMarkupPercent = product.priceMultiplier;
    }

    const gallery = Array.isArray(product.images)
      ? product.images.filter(Boolean)
      : product.imageUrl
        ? [product.imageUrl]
        : [];

    // Обработка variants - приоритет variantSummaries, потом variants
    let variants = [];
    // Сначала проверяем variantSummaries (детальная информация о вариантах)
    if (product.variantSummaries && Array.isArray(product.variantSummaries) && product.variantSummaries.length > 0) {
      variants = product.variantSummaries;
    } else if (product.variants) {
      if (typeof product.variants === 'string') {
        try {
          variants = JSON.parse(product.variants);
        } catch {
          variants = [];
        }
      } else if (Array.isArray(product.variants)) {
        variants = product.variants;
      }
    }

    // Eski mahsulotlar uchun: agar variant ma'lumotlari null bo'lsa, asosiy mahsulotdan olish
    variants = variants.map(v => {
      if (typeof v === 'object' && v !== null) {
        return {
          ...v,
          // Agar variant originalPrice null bo'lsa, asosiy mahsulotdan olish
          originalPrice: v.originalPrice ?? v.basePrice ?? (fallbackOriginalPrice || null),
          // Agar variant markupPercent null bo'lsa, asosiy mahsulotdan olish
          markupPercent: v.markupPercent ?? v.priceMultiplier ?? (fallbackMarkupPercent || null),
          // Agar variant stockCount null bo'lsa, asosiy mahsulotdan olish (yoki 0)
          stockCount: v.stockCount ?? v.stock ?? 0,
        };
      }
      return v;
    });

    setStoreProductForm({
      name: product.name ?? "",
      price: product.price ?? "",
      originalPrice: fallbackOriginalPrice,
      markupPercent: fallbackMarkupPercent,
      currency: product.currency ?? "USD",
      condition: product.condition ?? "new",
      sku: product.sku ?? "",
      imageFile: null,
      imagePreview: gallery[0] ?? "",
      images: gallery,
      description: product.description ?? "",
      categoryId: product.categoryId ?? "",
      category: product.category ?? "",
      stockCount: String(fallbackStockCount ?? ""),
      variants: variants,
    });
    setStoreProductDialogOpen(true);
  };

  const handleStoreProductFormChange = (field, value) => {
    setStoreProductForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleStoreProductImagesChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const valid = files.filter((f) => f.type?.startsWith("image/"));
    if (!valid.length) {
      toast.error("Faqat rasm fayllari tanlang");
      return;
    }
    try {
      const uploaded = [];
      for (const file of valid) {
        const { url } = await uploadsAPI.upload(file, "products");
        uploaded.push(url);
      }
      setStoreProductForm((prev) => {
        const nextImages = [...(prev.images || []), ...uploaded];
        const nextPreview = prev.imagePreview || nextImages[0] || "";
        return { ...prev, images: nextImages, imagePreview: nextPreview };
      });
      toast.success(`${uploaded.length} ta rasm yuklandi`);
      event.target.value = "";
    } catch (e) {
      toast.error(e.message || "Rasmni yuklab bo'lmadi");
    }
  };

  const handleRemoveStoreProductImage = (index) => {
    setStoreProductForm((prev) => {
      const nextImages = [...(prev.images || [])];
      nextImages.splice(index, 1);
      const nextPreview = nextImages[0] || "";
      return { ...prev, images: nextImages, imagePreview: nextPreview };
    });
  };

  // Variantlar uchun ko'p rasm yuklash funksiyasi
  const handleVariantImagesChangeByIndex = async (event, variantIndex) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const valid = files.filter((f) => f.type?.startsWith("image/"));
    if (!valid.length) {
      toast.error("Faqat rasm fayllari tanlang");
      return;
    }
    try {
      const uploaded = [];
      for (const file of valid) {
        const result = await uploadsAPI.upload(file, "products");
        const url = result?.url || result;
        if (url) {
          uploaded.push(url);
        }
      }
      if (uploaded.length > 0) {
        console.log(`=== VARIANT ${variantIndex} IMAGE UPLOAD ===`);
        console.log("Uploaded images:", uploaded);

        setStoreProductForm((prev) => {
          const newVariants = [...(prev.variants || [])];
          console.log("Current variant before update:", newVariants[variantIndex]);

          if (newVariants[variantIndex] && typeof newVariants[variantIndex] === 'object') {
            const currentImages = Array.isArray(newVariants[variantIndex].images)
              ? newVariants[variantIndex].images
              : (newVariants[variantIndex].imageUrl ? [newVariants[variantIndex].imageUrl] : []);
            const nextImages = [...currentImages, ...uploaded].filter(Boolean);
            newVariants[variantIndex] = {
              ...newVariants[variantIndex],
              images: nextImages,
              imageUrl: nextImages[0] || newVariants[variantIndex].imageUrl
            };
            console.log("Updated variant:", newVariants[variantIndex]);
          }
          return { ...prev, variants: newVariants };
        });
        toast.success(`${uploaded.length} ta rasm yuklandi`);
      } else {
        toast.error("Rasmlar yuklanmadi");
      }
      event.target.value = "";
    } catch (e) {
      console.error("Variant images upload error:", e);
      toast.error(e.message || "Rasmlarni yuklab bo'lmadi");
    }
  };

  // Variant rasmini o'chirish
  const handleRemoveVariantImageByIndex = (variantIndex, imageIndex) => {
    setStoreProductForm((prev) => {
      const newVariants = [...(prev.variants || [])];
      if (newVariants[variantIndex] && typeof newVariants[variantIndex] === 'object') {
        const currentImages = Array.isArray(newVariants[variantIndex].images)
          ? newVariants[variantIndex].images
          : [];
        const nextImages = [...currentImages];
        nextImages.splice(imageIndex, 1);
        newVariants[variantIndex] = {
          ...newVariants[variantIndex],
          images: nextImages,
          imageUrl: nextImages[0] || ""
        };
      }
      return { ...prev, variants: newVariants };
    });
  };

  const handleVariantDialogChange = (open) => {
    setVariantDialogOpen(open);
    if (!open) {
      setVariantForm(getEmptyVariantForm());
      setVariantEditingIndex(null);
      setVariantSubmitting(false);
    }
  };

  const handleOpenVariantDialog = async () => {
    // Keyingi kodni hisoblash
    let nextCode = "1";

    const productCode = parseInt(storeProductForm.sku, 10);
    const existingVariants = Array.isArray(storeProductForm.variants) ? storeProductForm.variants : [];

    // Agar asosiy mahsulot kodi bor bo'lsa
    if (!isNaN(productCode) && productCode > 0) {
      // Mavjud variantlarning kodlarini yig'ish
      const variantCodes = existingVariants
        .map(v => parseInt(v.sku, 10))
        .filter(n => !isNaN(n) && n > 0);

      // Serverdan keyingi kodni olish
      try {
        const serverNextCode = await productsAPI.getNextCode(selectedStore?._id);
        const serverCode = parseInt(serverNextCode, 10);

        // Eng katta kodni topish: server kodi, mahsulot kodi, variant kodlari
        const allCodes = [productCode, ...variantCodes];
        if (!isNaN(serverCode)) {
          // Server kodi - 1 (chunki server keyingi kodni qaytaradi)
          allCodes.push(serverCode - 1);
        }

        const maxCode = Math.max(...allCodes);
        nextCode = (maxCode + 1).toString();
      } catch (error) {
        console.error("Keyingi kodni olishda xatolik:", error);
        // Fallback: mahsulot kodi + variantlar soni + 1
        const maxVariantCode = variantCodes.length > 0 ? Math.max(...variantCodes) : productCode;
        nextCode = (Math.max(productCode, maxVariantCode) + 1).toString();
      }
    } else {
      // Agar mahsulot kodi yo'q bo'lsa, serverdan olish
      try {
        nextCode = await productsAPI.getNextCode(selectedStore?._id);
      } catch (error) {
        console.error("Keyingi kodni olishda xatolik:", error);
        nextCode = "1";
      }
    }

    setVariantForm({
      ...getEmptyVariantForm(),
      sku: nextCode || "1",
    });
    setVariantEditingIndex(null);
    setVariantDialogOpen(true);
  };

  const handleEditVariant = (variant, index) => {
    if (typeof variant === 'string') {
      // Старый формат - просто строка
      setVariantForm({
        name: variant,
        sku: "",
        originalPrice: "",
        markupPercent: "",
        price: "",
        currency: "USD",
        condition: "new",
        imagePreview: "",
        images: [],
        description: "",
        categoryId: "",
        category: "",
        stockCount: "",
      });
    } else {
      // Новый формат - объект
      const gallery = Array.isArray(variant.images)
        ? variant.images.filter(Boolean)
        : variant.imageUrl
          ? [variant.imageUrl]
          : [];

      // POST tizim va marketplace maydon nomlari farq qilishi mumkin:
      // POST: stock, basePrice, priceMultiplier
      // Marketplace: stockCount, originalPrice, markupPercent
      const fallbackOriginalPrice = variant.originalPrice ??
        (variant.basePrice !== null && variant.basePrice !== undefined ? String(variant.basePrice) : "") ?? "";

      const fallbackMarkupPercent = variant.markupPercent ?? variant.priceMultiplier ?? "";

      const fallbackStockCount = variant.stockCount !== null && variant.stockCount !== undefined
        ? String(variant.stockCount)
        : (variant.stock !== null && variant.stock !== undefined ? String(variant.stock) : "");

      setVariantForm({
        name: variant.name ?? "",
        sku: variant.sku ?? "",
        originalPrice: fallbackOriginalPrice,
        markupPercent: fallbackMarkupPercent,
        price: variant.price ?? "",
        currency: variant.currency ?? "USD",
        condition: variant.condition ?? "new",
        imagePreview: gallery[0] ?? "",
        images: gallery,
        description: variant.description ?? "",
        categoryId: variant.categoryId ?? "",
        category: variant.category ?? "",
        stockCount: fallbackStockCount,
      });
    }
    setVariantEditingIndex(index);
    setVariantDialogOpen(true);
  };

  const handleVariantFormChange = (field, value) => {
    setVariantForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleVariantImagesChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const valid = files.filter((f) => f.type?.startsWith("image/"));
    if (!valid.length) {
      toast.error("Faqat rasm fayllari tanlang");
      return;
    }
    try {
      const uploaded = [];
      for (const file of valid) {
        const result = await uploadsAPI.upload(file, "products");
        const url = result?.url || result;
        if (url) {
          uploaded.push(url);
        }
      }
      if (uploaded.length > 0) {
        setVariantForm((prev) => {
          const nextImages = [...(prev.images || []), ...uploaded].filter(Boolean);
          const nextPreview = prev.imagePreview || nextImages[0] || "";
          return { ...prev, images: nextImages, imagePreview: nextPreview };
        });
        toast.success(`${uploaded.length} ta rasm yuklandi`);
      } else {
        toast.error("Rasmlar yuklanmadi");
      }
      event.target.value = "";
    } catch (e) {
      console.error("Variant image upload error:", e);
      toast.error(e.message || "Rasmni yuklab bo'lmadi");
    }
  };

  const handleRemoveVariantImage = (index) => {
    setVariantForm((prev) => {
      const nextImages = [...(prev.images || [])];
      nextImages.splice(index, 1);
      const nextPreview = nextImages[0] || "";
      return { ...prev, images: nextImages, imagePreview: nextPreview };
    });
  };

  const handleVariantSubmit = () => {
    if (!variantForm.name.trim()) {
      toast.error("Variant nomi majburiy");
      return;
    }
    if (!variantForm.originalPrice && !variantForm.price) {
      toast.error("Asl narxi yoki sotiladigan narx majburiy");
      return;
    }

    const gallery = (variantForm.images || []).filter(Boolean);
    if (gallery.length === 0) {
      toast.error("Variant rasmi talab etiladi");
      return;
    }

    // stockCount может быть пустым, тогда используем null или 0
    let parsedStockCount = null;
    if (variantForm.stockCount && variantForm.stockCount.trim() !== "") {
      parsedStockCount = Number(variantForm.stockCount);
      if (
        !Number.isFinite(parsedStockCount) ||
        parsedStockCount < 0 ||
        !Number.isInteger(parsedStockCount)
      ) {
        toast.error("Variant sonini butun musbat son sifatida kiriting");
        return;
      }
    }

    // Variant uchun sku generatsiya qilish
    // Agar mahsulot sku'si bor bo'lsa, variant sku = mahsulot_sku + variant_index
    const existingVariants = Array.isArray(storeProductForm.variants) ? storeProductForm.variants : [];
    const variantIndex = variantEditingIndex != null ? variantEditingIndex : existingVariants.length;
    const productSku = storeProductForm.sku?.trim() || "";
    const variantSku = variantForm.sku?.trim() || (productSku ? `${productSku}-${variantIndex + 1}` : `V${variantIndex + 1}`);

    const variantData = {
      name: variantForm.name.trim(),
      sku: variantSku,
      originalPrice: variantForm.originalPrice || null,
      markupPercent: variantForm.markupPercent ? Number(variantForm.markupPercent) : null,
      price: variantForm.price?.toString().trim() || "0",
      currency: variantForm.currency || "USD",
      condition: variantForm.condition || "new",
      description: variantForm.description.trim() || "",
      categoryId: variantForm.categoryId || "",
      category: variantForm.category.trim() || "",
      stockCount: parsedStockCount !== null ? parsedStockCount : null,
      images: gallery,
      imageUrl: gallery[0],
    };

    setStoreProductForm((prev) => {
      const list = Array.isArray(prev.variants) ? [...prev.variants] : [];
      if (variantEditingIndex != null) {
        list[variantEditingIndex] = variantData;
      } else {
        list.push(variantData);
      }
      return { ...prev, variants: list };
    });

    handleVariantDialogChange(false);
    toast.success(variantEditingIndex != null ? "Variant yangilandi" : "Variant qo'shildi");
  };

  const handleStoreProductSubmit = async (event) => {
    event.preventDefault();

    if (!selectedStore?._id) {
      toast.error("Magazin tanlanmadi");
      return;
    }

    const priceStr = String(storeProductForm.price || '').trim();
    if (!storeProductForm.name.trim() || !priceStr) {
      toast.error("Mahsulot nomi va narxi majburiy");
      return;
    }

    // Gallery - images array'dan to'g'ri shakllantirish
    let gallery = [];

    // Avval storeProductForm.images dan rasmlarni olamiz (ko'p rasm yuklash orqali qo'shilgan)
    if (Array.isArray(storeProductForm.images) && storeProductForm.images.length > 0) {
      gallery = [...storeProductForm.images].filter(Boolean);
    }

    // Agar imageUrl base64 bo'lsa (yangi rasm tanlangan), uni gallery'ga qo'shish
    if (storeProductForm.imageUrl && typeof storeProductForm.imageUrl === 'string' && storeProductForm.imageUrl.startsWith('data:image')) {
      // Agar bu rasm gallery'da bo'lmasa, qo'shamiz
      if (!gallery.includes(storeProductForm.imageUrl)) {
        gallery = [storeProductForm.imageUrl, ...gallery];
      }
    }
    // Agar imageUrl URL bo'lsa (mavjud rasm), uni gallery'ga qo'shish
    else if (storeProductForm.imageUrl && typeof storeProductForm.imageUrl === 'string' && (storeProductForm.imageUrl.startsWith('http') || storeProductForm.imageUrl.startsWith('/api'))) {
      if (!gallery.includes(storeProductForm.imageUrl)) {
        gallery = [storeProductForm.imageUrl, ...gallery];
      }
    }

    if (storeProductDialogMode === "create" && gallery.length === 0) {
      toast.error("Mahsulot rasmi talab etiladi");
      return;
    }

    const parsedStockCount = Number(storeProductForm.stockCount);
    if (
      storeProductForm.stockCount === "" ||
      !Number.isFinite(parsedStockCount) ||
      parsedStockCount < 0 ||
      !Number.isInteger(parsedStockCount)
    ) {
      toast.error("Mahsulot sonini butun musbat son sifatida kiriting");
      return;
    }

    if (!storeProductForm.categoryId) {
      toast.error("Iltimos, mahsulot uchun kategoriya tanlang");
      return;
    }

    try {
      setStoreProductSubmitting(true);

      // Debug log
      console.log("=== PRODUCT SUBMIT ===");
      console.log("originalPrice:", storeProductForm.originalPrice);
      console.log("markupPercent:", storeProductForm.markupPercent);
      console.log("currency:", storeProductForm.currency);
      console.log("condition:", storeProductForm.condition);
      console.log("storeProductForm.images:", storeProductForm.images);
      console.log("storeProductForm.images type:", typeof storeProductForm.images);
      console.log("storeProductForm.images length:", storeProductForm.images?.length || 0);

      const formData = new FormData();
      formData.append("name", storeProductForm.name.trim());
      formData.append("price", storeProductForm.price?.toString().trim() || "0");
      if (storeProductForm.originalPrice) {
        formData.append("originalPrice", storeProductForm.originalPrice.toString().trim());
      }
      if (storeProductForm.markupPercent) {
        formData.append("markupPercent", storeProductForm.markupPercent.toString().trim());
      }
      formData.append("currency", storeProductForm.currency || "USD");
      formData.append("condition", storeProductForm.condition || "new");
      formData.append("stockCount", String(parsedStockCount));
      formData.append("store", selectedStore._id);
      if (storeProductForm.sku.trim()) {
        formData.append("sku", storeProductForm.sku.trim());
      }
      if (storeProductForm.description.trim()) {
        formData.append("description", storeProductForm.description.trim());
      }
      if (storeProductForm.categoryId) {
        formData.append("categoryId", storeProductForm.categoryId);
      }
      if (storeProductForm.category.trim()) {
        formData.append("category", storeProductForm.category.trim());
      }
      // Всегда отправляем variants (даже пустой массив)
      formData.append("variants", JSON.stringify(Array.isArray(storeProductForm.variants) ? storeProductForm.variants : []));

      // Rasm yuborish - gallery'dan yoki imageUrl'dan
      console.log("=== IMAGE SENDING ===");
      console.log("storeProductForm.images:", storeProductForm.images);
      console.log("storeProductForm.imageUrl:", storeProductForm.imageUrl ? "exists" : "null");
      console.log("final gallery:", gallery);
      console.log("gallery length:", gallery.length);

      if (gallery.length > 0) {
        console.log("Sending gallery images");
        formData.append("images", JSON.stringify(gallery));
        formData.append("imageUrl", gallery[0]);
      } else if (storeProductForm.imageUrl && typeof storeProductForm.imageUrl === 'string' && storeProductForm.imageUrl.startsWith('data:image')) {
        // Agar yangi base64 rasm tanlangan bo'lsa
        console.log("Sending base64 imageUrl");
        formData.append("imageUrl", storeProductForm.imageUrl);
      } else {
        console.log("No image to send");
      }

      // Debug: FormData'ni tekshirish
      console.log("=== FORMDATA CONTENTS ===");
      for (let [key, value] of formData.entries()) {
        if (key === 'imageUrl' && typeof value === 'string' && value.startsWith('data:image')) {
          console.log(`${key}: [base64 image, length: ${value.length}]`);
        } else if (key === 'variants') {
          console.log(`${key}: ${value}`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }

      if (storeProductDialogMode === "edit" && editingStoreProductId) {
        const updatedProduct = await productsAPI.update(editingStoreProductId, formData);
        setStoreProducts((prev) => {
          const updatedProducts = prev.map((product) =>
            product._id === editingStoreProductId ? updatedProduct : product
          );
          if (selectedStore?._id) {
            cacheStoreProductsEntry(selectedStore._id, updatedProducts);
          }
          return updatedProducts;
        });
        toast.success("Mahsulot yangilandi");
        // Bosh sahifa cache'ni tozalash
        sessionStorage.removeItem('home_products');
        sessionStorage.removeItem('home_cache_time');
      } else {
        const product = await productsAPI.create(formData);
        setStoreProducts((prev) => {
          const updatedProducts = [product, ...prev];
          if (selectedStore?._id) {
            cacheStoreProductsEntry(selectedStore._id, updatedProducts);
          }
          return updatedProducts;
        });
        toast.success("Mahsulot qo'shildi");
        // Bosh sahifa cache'ni tozalash
        sessionStorage.removeItem('home_products');
        sessionStorage.removeItem('home_cache_time');
      }
      handleStoreProductDialogChange(false);
    } catch (error) {
      console.error("Create store product error:", error);
      toast.error(error.message || "Mahsulot qo'shishda xatolik yuz berdi");
    } finally {
      setStoreProductSubmitting(false);
    }
  };

  const handleDeleteStoreProduct = async (productId) => {
    if (!productId) {
      return;
    }

    // Admin o'zi yaratgan mahsulot YOKI o'z magazinidagi mahsulotni o'chiradi
    const product = storeProducts.find(p => p._id === productId);
    if (currentUser?.role === "admin") {
      const productCreatedById = typeof product?.createdBy === 'object' ? product.createdBy?._id || product.createdBy?.id : product?.createdBy;
      const storeCreatedById = typeof selectedStore?.createdBy === 'object' ? selectedStore.createdBy?._id || selectedStore.createdBy?.id : selectedStore?.createdBy;
      const isOwnProduct = productCreatedById === currentUser.id;
      const isOwnStoreProduct = storeCreatedById === currentUser.id;

      if (!isOwnProduct && !isOwnStoreProduct) {
        toast.error("Siz faqat o'zingiz yaratgan yoki o'z magaziningizdagi mahsulotni o'chirishingiz mumkin");
        return;
      }
    }

    try {
      setStoreProductDeletingId(productId);
      await productsAPI.delete(productId);
      setStoreProducts((prev) => {
        const updatedProducts = prev.filter((product) => product._id !== productId);
        if (selectedStore?._id) {
          cacheStoreProductsEntry(selectedStore._id, updatedProducts);
        }
        return updatedProducts;
      });
      // Bosh sahifa cache'ni tozalash
      sessionStorage.removeItem('home_products');
      sessionStorage.removeItem('home_cache_time');
      toast.success("Mahsulot o'chirildi");
    } catch (error) {
      console.error("Delete store product error:", error);
      toast.error(error.message || "Mahsulotni o'chirishda xatolik yuz berdi");
    } finally {
      setStoreProductDeletingId(null);
    }
  };

  const handleEditStore = (store) => {
    // Admin faqat o'zi yaratgan magazinni tahrirlaydi
    const storeCreatedById = typeof store.createdBy === 'object' ? store.createdBy?._id || store.createdBy?.id : store.createdBy;
    if (currentUser?.role === "admin" && storeCreatedById !== currentUser.id) {
      toast.error("Siz faqat o'zingiz yaratgan magazinni tahrirlashingiz mumkin");
      return;
    }

    setStoreDialogMode("edit");
    setEditingStoreId(store._id);
    const managerId = typeof store.manager === 'object' ? store.manager?._id || store.manager?.id : store.manager;
    setStoreForm({
      name: store.name ?? "",
      location: store.location ?? "",
      imageFile: null,
      imagePreview: store.imageUrl ?? "",
      managerUserId: managerId || "",
      postUserId: store.postUserId || "",
    });
    setStoreDialogOpen(true);
  };

  const handleToggleStoreVisibility = async (store, isVisible) => {
    // Admin faqat o'zi yaratgan magazinni o'zgartiradi
    const storeCreatedById = typeof store.createdBy === 'object' ? store.createdBy?._id || store.createdBy?.id : store.createdBy;
    if (currentUser?.role === "admin" && storeCreatedById !== currentUser.id) {
      toast.error("Siz faqat o'zingiz yaratgan magazinni o'zgartirishingiz mumkin");
      return;
    }

    try {
      const updated = await storesAPI.toggleVisibility(store._id, isVisible);
      setStores((prev) =>
        prev.map((s) => (s._id === store._id ? { ...s, isVisible: updated.isVisible } : s))
      );
      toast.success(isVisible ? "Magazin ko'rinadigan qilindi" : "Magazin yashirildi");
    } catch (error) {
      console.error("Toggle visibility error:", error);
      toast.error(error.message || "Magazin ko'rinishini o'zgartirishda xatolik");
    }
  };

  const handleDeleteStore = (store) => {
    // Admin faqat o'zi yaratgan magazinni o'chiradi
    const storeCreatedById = typeof store.createdBy === 'object' ? store.createdBy?._id || store.createdBy?.id : store.createdBy;
    if (currentUser?.role === "admin" && storeCreatedById !== currentUser.id) {
      toast.error("Siz faqat o'zingiz yaratgan magazinni o'chirishingiz mumkin");
      return;
    }

    setStoreToDelete(store);
    setDeleteDialogOpen(true);
  };

  const handleDeleteDialogChange = (open) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setStoreToDelete(null);
      setStoreDeleting(false);
    }
  };

  const handleConfirmDeleteStore = async () => {
    if (!storeToDelete?._id) {
      return;
    }

    try {
      setStoreDeleting(true);
      const result = await storesAPI.remove(storeToDelete._id);
      delete storeCacheRef.current[storeToDelete._id];
      delete storeProductsCacheRef.current[storeToDelete._id];
      setStores((prev) => prev.filter((store) => store._id !== storeToDelete._id));

      // Agar selectedStore o'chirilgan magazin bo'lsa, storeProducts'ni tozalash
      if (selectedStore?._id === storeToDelete._id) {
        setStoreProducts([]);
        setSelectedStore(null);
      }

      // Bosh sahifa cache'ni tozalash - mahsulotlar yangilanishi uchun
      sessionStorage.removeItem('home_products');
      sessionStorage.removeItem('home_cache_time');

      // Backend'dan kelgan xabarni ko'rsatish
      if (result.message) {
        toast.success(result.message);
      } else {
        toast.success("Magazin va ichidagi mahsulotlar o'chirildi");
      }
      handleDeleteDialogChange(false);
    } catch (error) {
      console.error("Delete store error:", error);
      toast.error(error.message || "Magazinni o'chirishda xatolik yuz berdi");
      setStoreDeleting(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const handleStoreSubmit = async (event) => {
    event.preventDefault();

    if (!storeForm.name.trim() || !storeForm.location.trim()) {
      toast.error("Magazin nomi va joylashuvi to'ldirilishi shart");
      return;
    }

    // createdByUserId validatsiyasi
    // createdByUserId no longer required; manager selection is optional

    try {
      setStoreSubmitting(true);
      const formData = new FormData();
      formData.append("name", storeForm.name.trim());
      formData.append("location", storeForm.location.trim());
      if (storeForm.managerUserId) {
        formData.append("managerUserId", storeForm.managerUserId);
      }
      if (storeForm.postUserId) {
        formData.append("postUserId", storeForm.postUserId.trim());
      }

      if (storeDialogMode === "edit" && editingStoreId) {
        if (storeForm.imageFile) {
          formData.append("image", storeForm.imageFile);
        }
        const updatedStore = await storesAPI.update(editingStoreId, formData);
        cacheStoreEntry(updatedStore);
        setStores((prev) => prev.map((store) => (store._id === editingStoreId ? updatedStore : store)));
        toast.success("Magazin ma'lumotlari yangilandi");
      } else {
        if (!storeForm.imageFile) {
          toast.error("Magazin rasmi talab qilinadi");
          setStoreSubmitting(false);
          return;
        }
        formData.append("image", storeForm.imageFile);
        const createdStore = await storesAPI.create(formData);
        cacheStoreEntry(createdStore);
        setStores((prev) => [createdStore, ...prev]);
        toast.success("Magazin muvaffaqiyatli qo'shildi");
      }

      handleStoreDialogOpenChange(false);
    } catch (error) {
      console.error("Create store error:", error);
      toast.error(error.message || "Magazin saqlashda xatolik yuz berdi");
    } finally {
      setStoreSubmitting(false);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 mb-4 sm:mb-6">
              {stats.map((stat, index) => (
                <Card key={index} className="rounded-xl sm:rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-inner dark:shadow-black/20">
                  <CardContent className="p-3 sm:p-4 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{stat.title}</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[1.2fr,0.8fr]">
              <Card className="rounded-xl sm:rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-gray-900 dark:text-white text-base sm:text-lg">Tezkor amallar</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-white/60">
                    Eng ko'p ishlatiladigan funksiyalarni bir joydan boshqaring.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 p-4 pt-0 sm:p-6 sm:pt-0">
                  <Button
                    type="button"
                    className="h-10 sm:h-11 justify-start rounded-lg sm:rounded-xl border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-white/10 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white transition hover:border-gray-300 dark:hover:border-white/35 hover:bg-gray-100 dark:hover:bg-white/20"
                    onClick={handleOpenCreateStore}
                  >
                    <Store className="mr-2 h-4 w-4" />
                    Yangi magazin qo'shish
                  </Button>
                  <Button
                    type="button"
                    className="h-10 sm:h-11 justify-start rounded-lg sm:rounded-xl border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-white/10 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white transition hover:border-gray-300 dark:hover:border-white/35 hover:bg-gray-100 dark:hover:bg-white/20"
                    onClick={handleOpenProfessionalDialog}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Usta qo'shish
                  </Button>
                  {currentUser?.role !== 'xodim' && (
                    <Button
                      type="button"
                      className="h-10 sm:h-11 justify-start rounded-lg sm:rounded-xl border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-white/10 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white transition hover:border-gray-300 dark:hover:border-white/35 hover:bg-gray-100 dark:hover:bg-white/20"
                      onClick={() => navigate("/admin/users")}
                    >
                      <Badge className="mr-2 h-4 w-4" />
                      Foydalanuvchilar
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white text-base sm:text-lg">
                    Oxirgi faollik
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-white/60">
                    So'nggi yangilangan ma'lumotlar, buyurtmalar va foydalanuvchilar.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 text-xs sm:text-sm text-gray-700 dark:text-white/70 p-4 pt-0 sm:p-6 sm:pt-0">
                  <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3">
                    <p className="font-semibold text-gray-900 dark:text-white">Yangi buyurtma</p>
                    <p className="text-gray-600 dark:text-white/60">Buyurtma #AV-204 5 daqiqa oldin kelib tushdi.</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3">
                    <p className="font-semibold text-gray-900 dark:text-white">Magazin yangilandi</p>
                    <p className="text-gray-600 dark:text-white/60">"AvtoFix Sergeli" uchun yangi mahsulot qo'shildi.</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3">
                    <p className="font-semibold text-gray-900 dark:text-white">Yangi foydalanuvchi</p>
                    <p className="text-gray-600 dark:text-white/60">Dilshod Q. tizimda ro'yxatdan o'tdi.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        );
      case "orders":
        return <OrdersSection />;
      case "masters":
        return (
          <div className="space-y-4">
            {professionalsLoading ? (
              <p className="text-gray-600 dark:text-white/60">Ustalar yuklanmoqda...</p>
            ) : professionals.length === 0 ? (
              <Card className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-inner dark:shadow-black/20">
                <CardContent className="p-6 text-center text-gray-600 dark:text-white/65">
                  <p>Hozircha birorta usta mavjud emas.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:gap-5 sm:grid-cols-2 xl:grid-cols-3 items-stretch">
                {(currentUser?.role === 'xodim'
                  ? professionals.filter((pro) => {
                    const proCreatedBy = typeof pro.createdBy === 'object' ? pro.createdBy?._id || pro.createdBy?.id : pro.createdBy;
                    return proCreatedBy === currentUser.id;
                  })
                  : professionals
                ).map((pro) => (
                  <Card key={pro._id} className="flex flex-col rounded-xl sm:rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-1 shadow-sm dark:shadow-inner dark:shadow-black/20">
                    <CardHeader className="space-y-1 p-3 sm:p-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-gray-900 dark:text-white text-base sm:text-lg">{pro.name}</CardTitle>
                      </div>
                      <CardDescription className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                        {pro.specialty || pro.category}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-700 dark:text-white/70 p-3 pt-0 sm:p-4 sm:pt-0">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Telefon:</span>
                        <span className="text-gray-900 dark:text-gray-200">+998{pro.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Tajriba:</span>
                        <span className="text-gray-900 dark:text-gray-200">{pro.experience || "5+ yil"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Ish vaqti:</span>
                        <span className="text-gray-900 dark:text-gray-200">{pro.workingHours || "8:00 - 18:00"}</span>
                      </div>
                      {/* creator badge removed */}
                      {Array.isArray(pro.services) && pro.services.length > 0 ? (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400 block mb-1">Xizmatlar:</span>
                          <div className="flex flex-wrap gap-2">
                            {pro.services.map((service, index) => (
                              <Badge
                                key={index}
                                className="rounded-full border border-emerald-400/30 dark:border-emerald-400/30 bg-emerald-50 dark:bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-100"
                              >
                                {service}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {/* Manzil va xarita */}
                      {pro.address && (
                        <div className="pt-1">
                          <span className="text-gray-600 dark:text-gray-400 block mb-1">Manzil:</span>
                          <div className="flex items-start gap-2">
                            <p className="text-gray-900 dark:text-gray-200 text-xs flex-1">{pro.address}</p>
                            {pro.latitude && pro.longitude && (
                              <a
                                href={`https://www.google.com/maps?q=${pro.latitude},${pro.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                                title="Xaritada ko'rish"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                  <path fillRule="evenodd" d="m11.54 22.351.07.04.028.016a.76.76 0 0 0 .723 0l.028-.015.071-.041a16.975 16.975 0 0 0 1.144-.742 19.58 19.58 0 0 0 2.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 0 0-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 0 0 2.682 2.282 16.975 16.975 0 0 0 1.145.742ZM12 13.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
                                </svg>
                                Xarita
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Tugmalar - bir qatorda, pastda */}
                      <div className="flex items-center gap-2 pt-3 mt-auto border-t border-gray-100 dark:border-white/10">
                        <Link
                          to="/contact"
                          state={{ professional: pro }}
                          className="flex-1 flex h-9 items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 text-sm font-medium text-emerald-700 dark:text-emerald-400 transition hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                        >
                          <Phone className="h-4 w-4" />
                          Bog'lanish
                        </Link>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 transition hover:bg-amber-100 dark:hover:bg-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleEditProfessional(pro)}
                          disabled={currentUser?.role === "admin" && pro.createdBy !== currentUser.id}
                          title={
                            currentUser?.role === "admin" && pro.createdBy !== currentUser.id
                              ? "Faqat o'zingiz yaratgan ustani tahrirlashingiz mumkin"
                              : "Tahrirlash"
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-lg border border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 transition hover:bg-rose-100 dark:hover:bg-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={
                            professionalDeletingId === pro._id ||
                            (currentUser?.role === "admin" && pro.createdBy !== currentUser.id)
                          }
                          onClick={() => handleDeleteProfessional(pro._id)}
                          title={
                            currentUser?.role === "admin" && pro.createdBy !== currentUser.id
                              ? "Faqat o'zingiz yaratgan ustani o'chirishingiz mumkin"
                              : "O'chirish"
                          }
                        >
                          {professionalDeletingId === pro._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      case "professionals":
        return (
          <div className="space-y-4">
            {/* Qidirish */}
            <div className="relative">
              <input
                type="text"
                value={professionalSearchQuery}
                onChange={(e) => setProfessionalSearchQuery(e.target.value)}
                placeholder="Ism, telefon, manzil yoki mutaxassislik bo'yicha qidirish..."
                className="w-full px-4 py-3 pl-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {professionalSearchQuery && (
                <button
                  onClick={() => setProfessionalSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Mutaxassislik bo'yicha filter */}
            <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <button
                type="button"
                onClick={() => setSelectedSpecialtyFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedSpecialtyFilter === "all"
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
              >
                Barchasi ({professionals.length})
              </button>
              {specialties.map((spec) => {
                const count = professionals.filter((pro) => {
                  const proSpecialties = pro.specialties || [];
                  const proSpecialty = pro.specialty || "";
                  return (
                    proSpecialties.some((s) => s.toLowerCase() === spec.name.toLowerCase()) ||
                    proSpecialty.toLowerCase().includes(spec.name.toLowerCase())
                  );
                }).length;
                return (
                  <button
                    key={spec._id}
                    type="button"
                    onClick={() => setSelectedSpecialtyFilter(spec.name)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedSpecialtyFilter === spec.name
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                  >
                    {spec.name} ({count})
                  </button>
                );
              })}
            </div>

            <Card className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">
                  {selectedSpecialtyFilter === "all" ? "Barcha ustalar" : `${selectedSpecialtyFilter} ustalari`}
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  {selectedSpecialtyFilter === "all"
                    ? "Tizimda ro'yxatdan o'tgan barcha ustalar ro'yxati"
                    : `${selectedSpecialtyFilter} mutaxassisligi bo'yicha filterlangan ustalar`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {professionalsLoading ? (
                  <p className="text-gray-600 dark:text-white/60">Ustalar yuklanmoqda...</p>
                ) : filteredProfessionalsBySpecialty.length === 0 ? (
                  <p className="text-gray-600 dark:text-white/60 text-center py-8">
                    Hozircha birorta usta mavjud emas.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-white/10">
                          <th className="text-left py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Rasm</th>
                          <th className="text-left py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Ism</th>
                          <th className="text-left py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Telefon</th>
                          <th className="text-left py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Mutaxassislik</th>
                          <th className="text-left py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Manzil</th>
                          <th className="text-left py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Tajriba</th>
                          <th className="text-left py-3 px-2 text-gray-600 dark:text-gray-400 font-medium">Amallar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProfessionalsBySpecialty.map((pro) => (
                          <tr key={pro._id} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
                            <td className="py-3 px-2">
                              <img
                                src={pro.image || pro.images?.[0] || "/placeholder.jpg"}
                                alt={pro.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            </td>
                            <td className="py-3 px-2 text-gray-900 dark:text-white font-medium">{pro.name}</td>
                            <td className="py-3 px-2 text-gray-700 dark:text-gray-300">{pro.phone}</td>
                            <td className="py-3 px-2 text-gray-700 dark:text-gray-300">
                              {(pro.specialties && pro.specialties.length > 0)
                                ? pro.specialties.join(", ")
                                : (pro.specialty || pro.category)}
                            </td>
                            <td className="py-3 px-2 text-gray-700 dark:text-gray-300 max-w-[200px]">
                              <div className="truncate" title={pro.address}>
                                {pro.address || "-"}
                              </div>
                              {pro.latitude && pro.longitude && (
                                <a
                                  href={`https://www.google.com/maps?q=${pro.latitude},${pro.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  Xaritada ko'rish
                                </a>
                              )}
                            </td>
                            <td className="py-3 px-2 text-gray-700 dark:text-gray-300">{pro.experience || "5+ yil"}</td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg"
                                  onClick={() => handleEditProfessional(pro)}
                                  disabled={currentUser?.role === "admin" && pro.createdBy !== currentUser.id}
                                  title="Tahrirlash"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-600/20"
                                  disabled={
                                    professionalDeletingId === pro._id ||
                                    (currentUser?.role === "admin" && pro.createdBy !== currentUser.id)
                                  }
                                  onClick={() => handleDeleteProfessional(pro._id)}
                                  title="O'chirish"
                                >
                                  {professionalDeletingId === pro._id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      case "users":
        // Xodim uchun bu bo'lim yashirilgan
        if (currentUser?.role === 'xodim') {
          navigate("/admin/dashboard", { replace: true });
          return null;
        }
        return (
          <div className="space-y-4">
            {/* Qidirish */}
            <div className="relative">
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Ism, telefon yoki hudud bo'yicha qidirish..."
                className="w-full px-4 py-3 pl-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {userSearchQuery && (
                <button
                  onClick={() => setUserSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Mashina bo'yicha filter */}
            <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <button
                type="button"
                onClick={() => setSelectedCarFilter("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedCarFilter === "all"
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                  : "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/15"
                  }`}
              >
                Barchasi ({users.length})
              </button>
              {carBrands.map((brand) => {
                const count = users.filter((u) =>
                  (u.cars || []).some((c) => c.toLowerCase() === brand.name.toLowerCase())
                ).length;
                if (count === 0) return null;
                return (
                  <button
                    key={brand._id || brand.name}
                    type="button"
                    onClick={() => setSelectedCarFilter(brand.name)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedCarFilter === brand.name
                      ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                      : "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/15"
                      }`}
                  >
                    {brand.name} ({count})
                  </button>
                );
              })}
            </div>

            {loading ? (
              <p className="text-gray-600 dark:text-white/60">Yuklanmoqda...</p>
            ) : filteredUsers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 dark:border-white/15 bg-gray-50 dark:bg-white/5 px-6 py-10 text-center text-sm text-gray-600 dark:text-white/60">
                {selectedCarFilter === "all" ? "Hozircha foydalanuvchilar yo'q." : `"${selectedCarFilter}" mashinasiga ega foydalanuvchilar yo'q.`}
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-0 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-gray-200 dark:sm:border-white/10 sm:bg-white dark:sm:bg-white/5 sm:shadow-sm dark:sm:shadow-inner dark:sm:shadow-black/25">
                {/* Desktop header - hidden on mobile */}
                <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-3 text-xs uppercase tracking-wide text-gray-600 dark:text-white/55">
                  <span className="col-span-3">Foydalanuvchi</span>
                  <span className="col-span-2">Aloqa</span>
                  <span className="col-span-2">Hudud</span>
                  <span className="col-span-3">Mashinalar</span>
                  <span className="col-span-2 text-right">Rol</span>
                </div>
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-xl sm:rounded-none border border-gray-200 dark:border-white/10 sm:border-0 sm:border-t sm:border-gray-200 dark:sm:border-white/10 bg-white dark:bg-white/5 sm:bg-transparent dark:sm:bg-transparent p-4 sm:grid sm:grid-cols-12 sm:gap-4 sm:px-4 sm:py-4 text-sm text-gray-700 dark:text-white/80 transition hover:bg-gray-50 dark:hover:bg-white/10"
                  >
                    {/* Mobile layout */}
                    <div className="sm:hidden space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white text-base">{user.name}</span>
                          {(() => {
                            // Menedjer uchun magazin
                            const mgrStore = stores.find((s) => {
                              const mgrId = typeof s.manager === 'object' ? (s.manager?._id || s.manager?.id) : s.manager;
                              return mgrId && mgrId === user.id;
                            });
                            if (mgrStore) {
                              return (
                                <p className="text-xs text-amber-600 dark:text-amber-300/80 mt-0.5">Menedjer: {mgrStore.name}</p>
                              );
                            }
                            // Xodim uchun magazin
                            if (user.role === 'xodim' && user.managerOfShop) {
                              const xodimStore = stores.find((s) => {
                                const storeId = typeof s._id === 'object' ? s._id.toString() : s._id;
                                return storeId === user.managerOfShop;
                              });
                              if (xodimStore) {
                                return (
                                  <p className="text-xs text-blue-600 dark:text-blue-300/80 mt-0.5">Xodim: {xodimStore.name}</p>
                                );
                              }
                            }
                            return null;
                          })()}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg border border-rose-500/40 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-600/10 text-rose-700 dark:text-rose-400 transition hover:border-rose-400 dark:hover:border-rose-400 hover:bg-rose-100 dark:hover:bg-rose-600/20 hover:text-rose-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={
                            deletingUserId === user.id ||
                            updatingRoleId === user.id ||
                            (currentUser?.role === "admin" && user.role === "owner")
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500 dark:text-white/45">Telefon:</span>
                          <p className="text-gray-700 dark:text-white/75">+998{user.phone}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-white/45">Hudud:</span>
                          <p className="text-gray-700 dark:text-white/75">{user.region || user.address || "-"}</p>
                        </div>
                      </div>
                      {/* Mashinalar */}
                      {user.cars && user.cars.length > 0 && (
                        <div className="text-xs">
                          <span className="text-gray-500 dark:text-white/45">Mashinalar:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {user.cars.map((car, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
                              >
                                {car}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-white/10">
                        <span className="text-xs text-gray-500 dark:text-white/45">
                          {new Date(user.createdAt).toLocaleDateString("uz-UZ")}
                        </span>
                        <Select
                          value={user.role || "user"}
                          onValueChange={(value) => handleRoleChange(user.id, value)}
                          disabled={
                            updatingRoleId === user.id ||
                            deletingUserId === user.id ||
                            (currentUser?.role === "admin" && user.role === "owner")
                          }
                        >
                          <SelectTrigger className="w-[120px] h-8 rounded-lg border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white text-xs hover:border-gray-300 dark:hover:border-white/25 hover:bg-gray-100 dark:hover:bg-white/10">
                            <SelectValue placeholder="Rol" />
                          </SelectTrigger>
                          <SelectContent className="border border-gray-200 dark:border-white/10 bg-white dark:bg-[#101223] text-gray-900 dark:text-white">
                            <SelectItem value="user" disabled={currentUser?.id === user.id && (user.role === "admin" || user.role === "owner")}>Foydalanuvchi</SelectItem>
                            {currentUser?.role === "owner" ? (
                              <>
                                <SelectItem value="xodim">Xodim</SelectItem>
                                <SelectItem value="owner">Owner</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="manager">Menedjer</SelectItem>
                                <SelectItem value="xodim">Xodim</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {/* Desktop layout */}
                    <div className="hidden sm:flex col-span-3 flex-col gap-1">
                      <span className="font-medium text-gray-900 dark:text-white">{user.name}</span>
                      {(() => {
                        // Menedjer uchun magazin
                        const mgrStore = stores.find((s) => {
                          const mgrId = typeof s.manager === 'object' ? (s.manager?._id || s.manager?.id) : s.manager;
                          return mgrId && mgrId === user.id;
                        });
                        if (mgrStore) {
                          return (
                            <span className="text-xs text-amber-300/80">Menedjer: {mgrStore.name}</span>
                          );
                        }
                        // Xodim uchun magazin
                        if (user.role === 'xodim' && user.managerOfShop) {
                          const xodimStore = stores.find((s) => {
                            const storeId = typeof s._id === 'object' ? s._id.toString() : s._id;
                            return storeId === user.managerOfShop;
                          });
                          if (xodimStore) {
                            return (
                              <span className="text-xs text-blue-300/80">Xodim: {xodimStore.name}</span>
                            );
                          }
                        }
                        return null;
                      })()}
                      <span className="text-xs text-gray-500 dark:text-white/45">
                        {new Date(user.createdAt).toLocaleDateString("uz-UZ")}
                      </span>
                    </div>
                    <div className="hidden sm:block col-span-2 space-y-1 text-sm text-gray-700 dark:text-white/75">
                      <p>+998{user.phone}</p>
                    </div>
                    <div className="hidden sm:block col-span-2 text-sm text-gray-700 dark:text-white/75">
                      <p>{user.region || user.address || "-"}</p>
                    </div>
                    <div className="hidden sm:block col-span-3 text-sm">
                      {user.cars && user.cars.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.cars.map((car, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs"
                            >
                              {car}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-white/40">-</span>
                      )}
                    </div>
                    <div className="hidden sm:flex col-span-2 items-center justify-end gap-2">
                      <Select
                        value={user.role || "user"}
                        onValueChange={(value) => handleRoleChange(user.id, value)}
                        disabled={
                          updatingRoleId === user.id ||
                          deletingUserId === user.id ||
                          (currentUser?.role === "admin" && user.role === "owner") // Admin owner'ni o'zgartira olmaydi
                        }
                      >
                        <SelectTrigger className="w-[150px] rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white hover:border-gray-300 dark:hover:border-white/25 hover:bg-gray-100 dark:hover:bg-white/10">
                          <SelectValue placeholder="Rolni tanlang" />
                        </SelectTrigger>
                        <SelectContent className="border border-gray-200 dark:border-white/10 bg-white dark:bg-[#101223] text-gray-900 dark:text-white">
                          <SelectItem
                            value="user"
                            disabled={currentUser?.id === user.id && (user.role === "admin" || user.role === "owner")}
                          >
                            Foydalanuvchi
                          </SelectItem>
                          {currentUser?.role === "owner" ? (
                            <>
                              <SelectItem value="xodim">Xodim</SelectItem>
                              <SelectItem value="owner">Owner</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="manager">Menedjer</SelectItem>
                              <SelectItem value="xodim">Xodim</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-xl border border-rose-500/40 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-600/10 text-rose-700 dark:text-rose-400 transition hover:-translate-y-0.5 hover:border-rose-400 dark:hover:border-rose-400 hover:bg-rose-100 dark:hover:bg-rose-600/20 hover:text-rose-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={
                          deletingUserId === user.id ||
                          updatingRoleId === user.id ||
                          (currentUser?.role === "admin" && user.role === "owner")
                        }
                        title={
                          currentUser?.role === "admin" && user.role === "owner"
                            ? "Admin owner'ni o'chira olmaydi"
                            : "Foydalanuvchini o'chirish"
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case "store":
        // Xodim uchun faqat o'ziga biriktirilgan magazin
        const storesToShow = currentUser?.role === "xodim" && currentUser?.managerOfShop
          ? stores.filter(s => s._id === currentUser.managerOfShop)
          : stores;

        return (
          <div className="space-y-6">
            {storesLoading ? (
              <p className="text-sm text-gray-500">Magazinlar yuklanmoqda...</p>
            ) : storesToShow.length === 0 ? (
              <p className="text-sm text-gray-500">
                {currentUser?.role === "xodim"
                  ? "Sizga magazin biriktirilmagan. Iltimos, administrator bilan bog'laning."
                  : "Hozircha magazinlar qo'shilmagan."}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {storesToShow.map((store) => {
                  const locationLines = (store.location || "")
                    .split(/[\n,]/)
                    .map((part) => part.trim())
                    .filter(Boolean);

                  // createdBy ID'ni olish (object yoki string bo'lishi mumkin)
                  const storeCreatedById = typeof store.createdBy === 'object' ? store.createdBy?._id || store.createdBy?.id : store.createdBy;
                  const isMyStore = currentUser && storeCreatedById === currentUser.id;

                  return (
                    <div
                      key={store._id}
                      className="group relative overflow-hidden rounded-2xl border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/20"
                    >

                      {/* Image section */}
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/20">
                        {store.imageUrl ? (
                          <img
                            src={store.imageUrl}
                            alt={store.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Store className="h-12 w-12 text-white/20" />
                          </div>
                        )}
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                        {/* Visibility switch */}
                        <div
                          className="absolute top-2 right-2 flex items-center gap-1.5 rounded-lg bg-black/50 backdrop-blur-sm px-2 py-1"
                          title={store.isVisible !== false ? "Mahsulotlarni tahrirlash mumkin" : "Faqat ko'rish rejimi"}
                        >
                          <span className="text-[10px] text-white/80">
                            {store.isVisible !== false ? "Ko'rsin" : "Ko'rmasin"}
                          </span>
                          <Switch
                            checked={store.isVisible !== false}
                            onCheckedChange={(checked) => handleToggleStoreVisibility(store, checked)}
                            disabled={currentUser?.role === "admin" && !isMyStore}
                            className="h-4 w-7 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-500"
                          />
                        </div>
                      </div>

                      {/* Content section */}
                      <div className="p-4">
                        <h3 className="mb-1 truncate text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
                          {store.name}
                        </h3>
                        <div className="mb-3 line-clamp-2 min-h-[2.5rem] text-xs text-gray-600 dark:text-white/60 sm:text-sm">
                          {locationLines.length > 0 ? locationLines.join(", ") : store.location || "Manzil ko'rsatilmagan"}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="flex-1 rounded-lg border border-gray-300 dark:border-white/15 bg-gray-100 dark:bg-white/5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-white transition hover:border-gray-400 dark:hover:border-white/25 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white/80 sm:text-sm"
                            onClick={() => handleViewStoreProducts(store)}
                          >
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            Batafsil
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/10 p-0 text-amber-600 dark:text-amber-300 transition hover:border-amber-400/50 hover:bg-amber-400/20 hover:text-amber-700 dark:hover:text-amber-200 disabled:opacity-40 disabled:cursor-not-allowed sm:h-9 sm:w-9"
                            onClick={() => handleEditStore(store)}
                            disabled={currentUser?.role === "admin" && !isMyStore}
                            title={
                              currentUser?.role === "admin" && !isMyStore
                                ? "Faqat o'zingiz yaratgan magazinni tahrirlashingiz mumkin"
                                : "Tahrirlash"
                            }
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 p-0 text-rose-600 dark:text-rose-300 transition hover:border-rose-500/50 hover:bg-rose-500/20 hover:text-rose-700 dark:hover:text-rose-200 disabled:opacity-40 disabled:cursor-not-allowed sm:h-9 sm:w-9"
                            onClick={() => handleDeleteStore(store)}
                            disabled={currentUser?.role === "admin" && !isMyStore}
                            title={
                              currentUser?.role === "admin" && !isMyStore
                                ? "Faqat o'zingiz yaratgan magazinni o'chirishingiz mumkin"
                                : "O'chirish"
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Date */}
                        <div className="mt-3 border-t border-gray-200 dark:border-white/10 pt-2 text-center text-[10px] text-gray-500 dark:text-white/40 sm:text-xs">
                          Qo'shilgan: {new Date(store.createdAt).toLocaleDateString("uz-UZ")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      case "store-products":
        return (
          <div className="space-y-6">
            {storeDetailsLoading ? (
              <p className="text-sm text-white/60">Magazin ma'lumotlari yuklanmoqda...</p>
            ) : storeDetailsError ? (
              <Card className="rounded-2xl border border-rose-500/40 bg-rose-500/10">
                <CardContent className="p-6 text-center text-white">
                  {storeDetailsError}
                </CardContent>
              </Card>
            ) : !selectedStore ? (
              <p className="text-sm text-white/60">Magazin topilmadi.</p>
            ) : (
              <>
                <Card className="rounded-2xl border border-white/10 bg-white/5">
                  <CardHeader className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <CardTitle className="text-white text-lg mb-2">
                          Mahsulotlar ro'yxati
                        </CardTitle>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 w-fit">
                          <Package className="h-4 w-4 text-blue-400" />
                          <span className="text-sm font-semibold text-blue-300">
                            Jami: {(() => {
                              let total = 0;
                              let variantsCount = 0;
                              storeProducts.forEach(p => {
                                // Asosiy mahsulot
                                total += 1;
                                // Variantlar - variantSummaries yoki variants
                                const variants = p.variantSummaries || p.variants;
                                if (Array.isArray(variants) && variants.length > 0) {
                                  variantsCount += variants.length;
                                  total += variants.length;
                                }
                              });
                              console.log('� Mahsnulotlar:', storeProducts.length, 'Variantlar:', variantsCount, 'Jami:', total);
                              return total;
                            })()} ta mahsulot (asosiy: {storeProducts.length})
                          </span>
                        </div>
                      </div>
                    </div>
                    <Input
                      type="text"
                      placeholder="Qidirish (nom, kategoriya, kod)..."
                      value={storeProductSearch}
                      onChange={(e) => setStoreProductSearch(e.target.value)}
                      className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 placeholder:text-gray-500"
                    />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {storeProductsLoading ? (
                      <p className="text-sm text-white/60">Mahsulotlar yuklanmoqda...</p>
                    ) : sortedStoreProducts.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-6 py-10 text-center text-sm text-white/60">
                        Hozircha mahsulotlar qo‘shilmagan.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sortedStoreProducts
                          .filter((product) => {
                            if (!storeProductSearch.trim()) return true;
                            const search = storeProductSearch.toLowerCase().trim();
                            const name = (product.name || '').toLowerCase();
                            const category = (product.category || '').toLowerCase();
                            const sku = (product.sku || '').toLowerCase();
                            const code = (product.code || '').toLowerCase();
                            const catalogNumber = (product.catalogNumber || '').toLowerCase();

                            // Check parent product fields
                            if (name.includes(search) || category.includes(search) || sku.includes(search) || code.includes(search) || catalogNumber.includes(search)) {
                              return true;
                            }

                            // Check variants
                            if (Array.isArray(product.variants)) {
                              return product.variants.some(variant => {
                                const vName = (variant.name || '').toLowerCase();
                                const vSku = (variant.sku || '').toLowerCase();
                                const vCode = (variant.code || '').toLowerCase();
                                const vCatalogNumber = (variant.catalogNumber || '').toLowerCase();
                                return vName.includes(search) || vSku.includes(search) || vCode.includes(search) || vCatalogNumber.includes(search);
                              });
                            }

                            return false;
                          })
                          .map((product) => {
                            // createdBy ID'larini olish
                            const productCreatedById = typeof product.createdBy === 'object' ? product.createdBy?._id || product.createdBy?.id : product.createdBy;
                            const storeCreatedById = typeof selectedStore?.createdBy === 'object' ? selectedStore.createdBy?._id || selectedStore.createdBy?.id : selectedStore?.createdBy;
                            const isMyProduct = currentUser && productCreatedById === currentUser.id;
                            const isMyStoreProduct = currentUser && storeCreatedById === currentUser.id;
                            // Agar magazin "ko'rmasin" rejimida bo'lsa, tahrirlash/o'chirish imkoni yo'q
                            const storeIsVisible = selectedStore?.isVisible !== false;
                            // POST tizim mahsulotlarini aniqlash (userId maydoni bor)
                            const isPostSystemProduct = product.userId && product.userId !== null;
                            // POST tizim mahsulotlarini tahrirlash/o'chirish imkoni yo'q
                            const canEdit = !isPostSystemProduct && storeIsVisible && (currentUser?.role !== "admin" || isMyProduct || isMyStoreProduct);

                            return (
                              <div
                                key={product._id}
                                className="group rounded-2xl border p-4 backdrop-blur-sm bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                              >
                                <div className="flex gap-4">
                                  {/* Rasm */}
                                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                                    {(() => {
                                      // Avval product.images ni tekshiramiz (ko'p rasm yuklangan bo'lsa)
                                      if (Array.isArray(product.images) && product.images.length > 0) {
                                        return <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />;
                                      }
                                      // Keyin product.imageUrl ni tekshiramiz (bitta rasm yuklangan bo'lsa)
                                      else if (product.imageUrl) {
                                        return <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />;
                                      }
                                      // Aks holda rasm yo'q
                                      else {
                                        return (
                                          <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400 dark:text-gray-500">
                                            Rasm yo'q
                                          </div>
                                        );
                                      }
                                    })()}
                                  </div>

                                  {/* Ma'lumotlar */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4
                                        className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 cursor-pointer hover:line-clamp-none transition-all"
                                        title={product.name}
                                        onClick={(e) => {
                                          e.currentTarget.classList.toggle('line-clamp-2');
                                          e.currentTarget.classList.toggle('line-clamp-none');
                                        }}
                                      >
                                        {product.name}
                                      </h4>
                                      {product.sku && (
                                        <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full">
                                          #{product.sku}
                                        </span>
                                      )}
                                      {isPostSystemProduct && (
                                        <span className="px-2 py-0.5 text-[10px] font-medium bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full">
                                          POST
                                        </span>
                                      )}
                                    </div>

                                    {/* Kod va Katalog */}
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                      {product.code && (
                                        <span className="text-[11px] text-gray-600 dark:text-gray-400" title={`Kod: ${product.code}`}>
                                          Kod: <span className="text-gray-900 dark:text-white font-medium">{product.code}</span>
                                        </span>
                                      )}
                                      {product.catalogNumber && (
                                        <span className="text-[11px] text-gray-600 dark:text-gray-400" title={`Katalog: ${product.catalogNumber}`}>
                                          Katalog: <span className="text-gray-900 dark:text-white font-medium">{product.catalogNumber}</span>
                                        </span>
                                      )}
                                    </div>

                                    {/* Kategoriya */}
                                    {product.category && (
                                      <div className="mt-1">
                                        <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full">
                                          {product.category}
                                        </span>
                                      </div>
                                    )}

                                    {/* Info grid */}
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs">
                                      {/* Asl narxi (POST: basePrice, Marketplace: originalPrice) */}
                                      {(product.originalPrice || product.basePrice) && (
                                        <span className="text-gray-600 dark:text-gray-400">
                                          Asl: <span className="text-gray-900 dark:text-white font-medium">{product.originalPrice || product.basePrice}</span> {product.currency || 'USD'}
                                        </span>
                                      )}
                                      {/* Foiz (POST: priceMultiplier, Marketplace: markupPercent) */}
                                      {(product.markupPercent || product.priceMultiplier) && (
                                        <span className="text-blue-600 dark:text-blue-400">
                                          +{product.markupPercent || product.priceMultiplier}%
                                        </span>
                                      )}
                                      <span className="text-gray-600 dark:text-gray-400">
                                        <span className="text-gray-900 dark:text-white font-medium">{product.price}</span> {product.currency || 'USD'}
                                      </span>
                                      <span className="text-gray-600 dark:text-gray-400">
                                        Ombor: <span className="text-gray-900 dark:text-white font-medium">{product.stockCount ?? product.stock ?? 0}</span>
                                      </span>
                                      {((Array.isArray(product.variants) && product.variants.length > 0) ||
                                        (Array.isArray(product.variantSummaries) && product.variantSummaries.length > 0)) && (
                                          <span className="text-purple-600 dark:text-purple-400">
                                            {(product.variantSummaries?.length || product.variants?.length || 0)} ta xil
                                          </span>
                                        )}
                                    </div>
                                  </div>

                                  {/* Tugmalar - POST tizim mahsulotlari uchun faqat tahrirlash tugmasi */}
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEditStoreProduct(product)}
                                      disabled={isPostSystemProduct ? false : !canEdit}
                                      className="rounded-lg border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 disabled:opacity-50"
                                    >
                                      Tahrirlash
                                    </Button>
                                    {!isPostSystemProduct && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={storeProductDeletingId === product._id || !canEdit}
                                        onClick={() => handleDeleteStoreProduct(product._id)}
                                        className="rounded-lg border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 disabled:opacity-50"
                                      >
                                        {storeProductDeletingId === product._id ? "..." : "O'chirish"}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        );
      default:
        return (
          <Card className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-inner dark:shadow-black/20">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Boshqaruv paneli</CardTitle>
              <CardDescription className="text-gray-600 dark:text-white/60">Tizimni boshqarish va monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-white/60">Kerakli bo'limni tanlang yoki chapdagi menyudan kerakli bo'limga o'ting.</p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <>
      {/* Delete User Confirmation Modal */}
      <Dialog open={deleteUserConfirmOpen} onOpenChange={setDeleteUserConfirmOpen}>
        <DialogContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white">
          <DialogHeader>
            <DialogTitle>Foydalanuvchini o'chirish</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 dark:text-gray-300">
              {userToDelete?.name} foydalanuvchisini o'chirishni xohlaysizmi? Bu amalni ortga qaytarib bo'lmaydi.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteUserConfirmOpen(false);
                setUserToDelete(null);
              }}
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
            >
              Bekor qilish
            </Button>
            <Button
              onClick={confirmDeleteUser}
              disabled={deletingUserId !== null}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deletingUserId ? "O'chirilmoqda..." : "O'chirish"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="relative flex min-h-screen overflow-hidden bg-gray-50 dark:bg-[#05060d] text-gray-900 dark:text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-10 h-64 w-64 rounded-full bg-rose-600/10 dark:bg-rose-600/25 blur-3xl" />
          <div className="absolute top-1/3 right-24 h-80 w-80 rounded-full bg-purple-500/10 dark:bg-purple-500/20 blur-3xl" />
          <div className="absolute bottom-[-60px] left-1/4 h-72 w-72 rounded-full bg-emerald-400/10 dark:bg-emerald-400/15 blur-3xl" />
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 dark:bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white dark:bg-black/90 backdrop-blur-xl p-5 transition-transform duration-300 ease-in-out lg:static lg:w-64 lg:translate-x-0 lg:bg-white dark:lg:bg-black/75 border-r border-gray-200 dark:border-gray-800 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Admin Panel</h2>
            <button
              className="rounded-lg p-2 text-gray-600 dark:text-white/50 transition hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="mt-8 space-y-2">
            {menuItems
              .filter((item) => {
                // Xodim uchun faqat "users" va "categories" yashirilgan
                if (currentUser?.role === 'xodim') {
                  return !['users', 'categories'].includes(item.id);
                }
                return true;
              })
              .map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                const isDisabled = item.id === "masters" && !currentUser;

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      navigate(`/admin/${item.id}`);
                      setSidebarOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold transition ${isActive
                      ? "border border-rose-400/50 dark:border-rose-400/50 bg-rose-50 dark:bg-rose-500/25 text-rose-900 dark:text-white shadow-[0_12px_25px_-18px_rgba(244,63,94,0.65)]"
                      : "border border-transparent text-gray-700 dark:text-white/70 hover:border-gray-200 dark:hover:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                      } ${isDisabled ? "opacity-50" : ""}`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl border ${isActive
                        ? "border-rose-300 dark:border-white/50 bg-rose-100 dark:bg-white/20 text-rose-700 dark:text-white"
                        : "border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-white/70"
                        }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
          </nav>
        </aside>

        <main className="relative z-10 flex-1 overflow-y-auto p-4 pt-4 sm:p-6 lg:p-10">
          {/* Admin Navbar */}
          <div className="mb-4 sm:mb-6 flex items-center justify-between rounded-xl sm:rounded-2xl border border-gray-200 dark:border-white/10 bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-black/60 dark:via-black/50 dark:to-black/60 backdrop-blur-xl px-3 py-3 sm:px-5 sm:py-4 shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <button
                className="flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 p-2.5 text-gray-700 dark:text-white/80 transition hover:border-rose-400/50 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-white lg:hidden"
                onClick={() => setSidebarOpen((prev) => !prev)}
              >
                <Menu className="h-5 w-5" />
              </button>

              <Link
                to="/"
                className="group flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 p-2.5 sm:px-4 sm:py-2.5 text-gray-700 dark:text-white/80 transition-all hover:border-rose-400/50 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-white"
                title="Bosh sahifa"
              >
                <Home className="h-5 w-5" />
                <span className="hidden sm:inline ml-2 text-sm font-medium">Bosh sahifa</span>
              </Link>

              <button
                type="button"
                onClick={() => navigate(-1)}
                className="group flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 p-2.5 sm:px-4 sm:py-2.5 text-gray-700 dark:text-white/80 transition-all hover:border-blue-400/50 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-white"
                title="Orqaga"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden sm:inline ml-2 text-sm font-medium">Orqaga</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-white/60 hidden md:inline font-medium truncate max-w-[150px]">
                {currentUser?.name || "Admin"}
              </span>
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-rose-500 via-rose-600 to-orange-500 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-rose-500/30 ring-2 ring-gray-200 dark:ring-white/10">
                {currentUser?.name?.charAt(0).toUpperCase() || "A"}
              </div>
            </div>
          </div>

          <header className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">{currentSectionLabel}</h1>
              {activeSection !== "store-products" && (
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {activeSection === "dashboard"
                    ? "AvtoFix boshqaruv paneliga xush kelibsiz"
                    : "Tegishli ma'lumotlarni shu bo'limdan boshqaring"}
                </p>
              )}
            </div>
            {activeSection === "masters" && (
              <Button
                type="button"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/60 bg-gradient-to-r from-red-500 via-rose-600 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_20px_45px_-25px_rgba(244,63,94,0.7)] transition hover:-translate-y-0.5 hover:shadow-red-900/60"
                onClick={handleOpenProfessionalDialog}
              >
                <Plus className="h-4 w-4" />
                Usta qo'shish
              </Button>
            )}
          </header>

          {renderContent()}
        </main>
      </div>

      <Dialog open={professionalDialogOpen} onOpenChange={handleProfessionalDialogChange}>
        <DialogContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {professionalDialogMode === "edit" ? "Ustani tahrirlash" : "Yangi usta qo'shish"}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Usta haqida asosiy ma'lumotlarni kiriting. Xizmatlarni vergul bilan ajrating.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProfessionalSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="professional-name">Ism</Label>
                <Input
                  id="professional-name"
                  value={professionalForm.name}
                  onChange={(event) => handleProfessionalFormChange("name", event.target.value)}
                  placeholder="Usta ismi"
                  className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="professional-phone">Telefon</Label>
                <Input
                  id="professional-phone"
                  value={professionalForm.phone}
                  onChange={(event) => handleProfessionalFormChange("phone", event.target.value, event)}
                  placeholder="+998 (90) 123-45-67"
                  inputMode="tel"
                  maxLength={19}
                  className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="professional-image">Rasm</Label>
                <input
                  id="professional-image"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleProfessionalImageChange}
                  className="block w-full text-sm text-gray-700 dark:text-gray-200 file:mr-4 file:rounded-lg file:border-0 file:bg-gray-200 dark:file:bg-gray-700 file:px-4 file:py-2 file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-300 dark:hover:file:bg-gray-600"
                />
                {Array.isArray(professionalForm.images) && professionalForm.images.length > 0 ? (
                  <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {professionalForm.images.map((url, index) => (
                      <div key={url + index} className="relative group">
                        <img
                          src={url}
                          alt=""
                          className="h-24 w-full object-cover rounded-lg border border-gray-300 dark:border-gray-700"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveProfessionalImage(index)}
                          className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-white dark:bg-black/70 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                          aria-label="Rasmni o'chirish"
                          title="O'chirish"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Mutaxassislik</Label>
                {/* Yangi mutaxassislik qo'shish */}
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newSpecialtyInput}
                    onChange={(e) => setNewSpecialtyInput(e.target.value)}
                    placeholder="Yangi mutaxassislik kiriting..."
                    className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSpecialty();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddSpecialty}
                    disabled={!newSpecialtyInput.trim()}
                    className="shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {/* Mavjud mutaxassisliklar checkbox */}
                <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 max-h-32 overflow-y-auto">
                  {specialties.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Mutaxassislik yo'q. Yuqoridagi maydondan qo'shing.
                    </p>
                  ) : (
                    specialties.map((spec) => (
                      <label
                        key={spec._id}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${(professionalForm.specialties || []).includes(spec.name)
                          ? "bg-emerald-100 dark:bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                          : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                          } border`}
                      >
                        <input
                          type="checkbox"
                          checked={(professionalForm.specialties || []).includes(spec.name)}
                          onChange={() => handleToggleSpecialty(spec.name)}
                          className="sr-only"
                        />
                        <span className="text-sm font-medium">{spec.name}</span>
                        {(professionalForm.specialties || []).includes(spec.name) && (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </label>
                    ))
                  )}
                </div>
                {(professionalForm.specialties || []).length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Tanlangan: {(professionalForm.specialties || []).join(", ")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="professional-workingHours">Ish vaqti</Label>
                <Input
                  id="professional-workingHours"
                  value={professionalForm.workingHours}
                  onChange={(event) => handleProfessionalFormChange("workingHours", event.target.value)}
                  placeholder="8:00 - 18:00"
                  className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="professional-experience">Tajriba</Label>
                <Input
                  id="professional-experience"
                  value={professionalForm.experience}
                  onChange={(event) => handleProfessionalFormChange("experience", event.target.value)}
                  placeholder="5+ yil"
                  className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="professional-services">Xizmatlar (vergul bilan)</Label>
                <Input
                  id="professional-services"
                  value={professionalForm.services}
                  onChange={(event) => handleProfessionalFormChange("services", event.target.value)}
                  placeholder="Diagnoz, Ta'mirlash, Elektrik"
                  className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="professional-address">Manzil</Label>
                <div className="flex gap-2">
                  <Input
                    id="professional-address"
                    value={professionalForm.address}
                    onChange={(event) => handleProfessionalFormChange("address", event.target.value)}
                    placeholder="Masalan: Toshkent, Chilonzor, 7-mavze, 15-uy"
                    className="flex-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGetCurrentLocation}
                    disabled={geoLoading}
                    className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                    title="GPS orqali joylashuvni aniqlash (telefondan aniqroq ishlaydi)"
                  >
                    {geoLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Crosshair className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  💡 GPS tugmasi telefondan aniqroq ishlaydi. Kompyuterda taxminiy manzil ko'rsatishi mumkin.
                </p>
              </div>

              {/* Google Maps Location Link Input */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="professional-location-link">Google Maps havolasi yoki Telegram location (ixtiyoriy)</Label>
                <div className="space-y-2">
                  <div
                    className="relative"
                    onDrop={(e) => {
                      e.preventDefault();
                      const text = e.dataTransfer.getData('text/plain');
                      if (text) {
                        handleProfessionalFormChange("locationLink", text);
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-blue-500/10');
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-500/10');
                    }}
                  >
                    <Input
                      id="professional-location-link"
                      value={professionalForm.locationLink || ""}
                      onChange={(event) => handleProfessionalFormChange("locationLink", event.target.value)}
                      placeholder="https://google.com/maps?q=40.109076,64.686012 yoki Telegram'dan location tashlang"
                      className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white transition-colors"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    💡 Google Maps'dan "Share" → "Copy link" yoki Telegram'dan location'ni shu yerga tashlang
                  </p>
                  {professionalForm.locationError && (
                    <p className="text-xs text-red-500 dark:text-red-400">
                      {professionalForm.locationError}
                    </p>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                {/* Xaritada ko'rish havolasi */}
                {professionalForm.latitude && professionalForm.longitude && (
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0">
                      <path fillRule="evenodd" d="m11.54 22.351.07.04.028.016a.76.76 0 0 0 .723 0l.028-.015.071-.041a16.975 16.975 0 0 0 1.144-.742 19.58 19.58 0 0 0 2.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 0 0-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 0 0 2.682 2.282 16.975 16.975 0 0 0 1.145.742ZM12 13.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Koordinatalar: {professionalForm.latitude?.toFixed(6)}, {professionalForm.longitude?.toFixed(6)}
                      </p>
                      <a
                        href={`https://www.google.com/maps?q=${professionalForm.latitude},${professionalForm.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Xaritada tekshirish →
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProfessionalForm(prev => ({ ...prev, latitude: null, longitude: null, locationLink: "", locationError: "" }))}
                      className="p-1 rounded hover:bg-blue-200 dark:hover:bg-blue-500/30 text-blue-600 dark:text-blue-400"
                      title="Koordinatalarni o'chirish"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => handleProfessionalDialogChange(false)}
                disabled={professionalSubmitting}
              >
                Bekor qilish
              </Button>
              <Button
                type="submit"
                className="bg-red-600 hover:bg-red-700"
                disabled={professionalSubmitting}
              >
                {professionalDialogMode === "edit" ? "Yangilash" : "Qo'shish"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={storeDialogOpen} onOpenChange={handleStoreDialogOpenChange}>
        <DialogContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {storeDialogMode === "edit" ? "Magazini tahrirlash" : "Yangi magazin qo'shish"}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Iltimos, magazin haqida asosiy ma'lumotlarni kiriting. Rasm qo'shish ixtiyoriy.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleStoreSubmit}>
            <div className="space-y-2">
              <Label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="store-image">
                Magazin rasmi (ixtiyoriy)
              </Label>
              <Input
                id="store-image"
                type="file"
                accept="image/*"
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200"
                onChange={handleStoreImageChange}
              />
              {storeForm.imageName ? (
                <p className="text-xs text-gray-500 dark:text-gray-500">Tanlangan fayl: {storeForm.imageName}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="store-manager">
                Bosh menedjer
              </Label>
              <Select
                value={storeForm.managerUserId}
                onValueChange={(value) => handleStoreFormChange("managerUserId", value)}
              >
                <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200">
                  <SelectValue placeholder="Menedjerni tanlang (ixtiyoriy)" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  {users.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-gray-600 dark:text-gray-400">Yuklanmoqda...</div>
                  ) : (
                    users.map((user) => (
                      <SelectItem key={user.id} value={user.id} className="text-gray-900 dark:text-gray-200">
                        {user.name} {user.role === 'owner' ? '(Owner)' : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 dark:text-gray-500">Tanlansa, ushbu foydalanuvchi ushbu magazinning bosh menedjeri bo'ladi</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="store-name">
                Magazin nomi
              </Label>
              <Input
                id="store-name"
                value={storeForm.name}
                onChange={(event) => handleStoreFormChange("name", event.target.value)}
                placeholder="Masalan, AvtoFix Sergeli"
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="store-location">
                Joylashuvi
              </Label>
              <Input
                id="store-location"
                value={storeForm.location}
                onChange={(event) => handleStoreFormChange("location", event.target.value)}
                placeholder="Manzil yoki joylashuvni kiriting"
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                required
              />
            </div>

            {/* POST tizim kategoriyalari uchun User ID */}
            <div className="space-y-2">
              <Label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="store-postUserId">
                POST tizim User ID (kategoriyalar uchun)
              </Label>
              <Input
                id="store-postUserId"
                value={storeForm.postUserId}
                onChange={(event) => handleStoreFormChange("postUserId", event.target.value)}
                placeholder="POST tizimdagi user ID (masalan: 692886decbdcb5ce5fd124a4)"
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
              <p className="text-xs text-gray-500">Bu maydon POST tizimdagi kategoriyalarni bog'lash uchun ishlatiladi</p>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleStoreDialogOpenChange(false)}
                className="border-gray-600 bg-gray-850 text-gray-300 hover:bg-gray-700"
              >
                Bekor qilish
              </Button>
              <Button
                type="submit"
                disabled={storeSubmitting}
                className={`border border-red-700 bg-red-600 text-white hover:bg-red-700 ${storeSubmitting ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {storeSubmitting
                  ? "Saqlanmoqda..."
                  : storeDialogMode === "edit"
                    ? "Yangilash"
                    : "Saqlash"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={storeProductDialogOpen} onOpenChange={handleStoreProductDialogChange}>
        <DialogContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                {storeProductDialogMode === "edit" ? "Mahsulotni tahrirlash" : "Mahsulot qo'shish"}
              </DialogTitle>
              {/* Valyuta kursi - tanlangan valyutaga qarab */}
              {storeProductForm.currency && storeProductForm.currency !== "UZS" && exchangeRates[storeProductForm.currency] > 0 && (
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-medium">
                  <span className="text-green-300">{storeProductForm.currency === "USD" ? "$" : storeProductForm.currency === "RUB" ? "₽" : storeProductForm.currency === "CNY" ? "¥" : ""}</span>
                  <span>1 {storeProductForm.currency} = {exchangeRates[storeProductForm.currency].toLocaleString('uz-UZ')} UZS</span>
                </div>
              )}
            </div>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              {selectedStore?.name
                ? `${selectedStore.name} magazini uchun yangi mahsulot kiriting`
                : "Magazin tanlanmadi"}
            </DialogDescription>
          </DialogHeader>

          {/* POST tizim mahsulotlari uchun - faqat rasm va tasnif */}
          {storeProductDialogMode === "edit" && editingStoreProductId && (() => {
            const editingProduct = storeProducts.find(p => p._id === editingStoreProductId);
            const isPostSystemProduct = editingProduct?.userId && editingProduct.userId !== null;
            return isPostSystemProduct ? (
              <form className="space-y-4" onSubmit={handleStoreProductSubmit}>
                {/* Mahsulot nomi - faqat ko'rsatish */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-700 dark:text-gray-300">Mahsulot nomi</Label>
                  <div className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200">
                    {storeProductForm.name}
                  </div>
                </div>

                {/* Rasm */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-700 dark:text-gray-300">Rasmlar</Label>

                  {/* Mavjud rasmlar */}
                  {Array.isArray(storeProductForm.images) && storeProductForm.images.length > 0 && (
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {storeProductForm.images.map((img, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={img}
                            alt={`Rasm ${index + 1}`}
                            className="h-16 w-16 object-cover rounded-lg border border-gray-300 dark:border-gray-700"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveStoreProductImage(index)}
                            className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Rasmni o'chirish"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Rasm yuklash */}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleStoreProductImagesChange}
                      className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-500/20 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-500/30"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Bir nechta rasm tanlash mumkin (Ctrl/Cliq + tanlash)
                    </p>
                  </div>
                </div>

                {/* Tasnif */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-700 dark:text-gray-300">Tasnif</Label>
                  <Input
                    value={storeProductForm.category}
                    onChange={(event) => handleStoreProductFormChange("category", event.target.value)}
                    placeholder="Masalan, Ehtiyot qismlar"
                    className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 placeholder:text-gray-500"
                  />
                </div>

                {/* Xillar - rasm va tasnif tahrirlansin */}
                {Array.isArray(storeProductForm.variants) && storeProductForm.variants.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-700 dark:text-gray-300">Xillar</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {storeProductForm.variants.map((v, idx) => {
                        let variantName = 'Nomsiz variant';
                        let variantPrice = '';
                        let variantSku = '';
                        let variantStock = null;
                        let variantOriginalPrice = '';
                        let variantMarkupPercent = null;
                        let variantCurrency = 'USD';

                        if (typeof v === 'string') {
                          variantName = v;
                        } else if (typeof v === 'object' && v !== null) {
                          variantName = v.name || 'Nomsiz variant';
                          variantCurrency = v.currency || 'USD';
                          variantPrice = v.price ? (typeof v.price === 'number' ? `${v.price.toLocaleString()} ${variantCurrency}` : v.price) : '';
                          variantSku = v.sku || '';
                          variantStock = v.stock !== undefined ? v.stock : (v.stockCount !== undefined ? v.stockCount : null);
                          variantOriginalPrice = v.originalPrice || v.basePrice || '';
                          variantMarkupPercent = v.markupPercent !== undefined ? v.markupPercent : (v.priceMultiplier !== undefined ? v.priceMultiplier : null);
                        }
                        const variantImage = typeof v === 'object' && v.imageUrl ? v.imageUrl : (typeof v === 'object' && Array.isArray(v.images) && v.images.length > 0 ? v.images[0] : (typeof v === 'object' && Array.isArray(v.imagePaths) && v.imagePaths.length > 0 ? v.imagePaths[0] : ''));

                        return (
                          <div key={`variant-${idx}`} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-3 space-y-2">
                            <div className="flex items-start gap-2">
                              {variantImage && (
                                <img
                                  src={variantImage}
                                  alt={variantName}
                                  className="h-12 w-12 object-cover rounded-lg border border-gray-300 dark:border-gray-700"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div
                                  className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2 cursor-pointer hover:line-clamp-none transition-all"
                                  title={variantName}
                                  onClick={(e) => {
                                    e.currentTarget.classList.toggle('line-clamp-2');
                                    e.currentTarget.classList.toggle('line-clamp-none');
                                  }}
                                >
                                  {variantName}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                  {variantSku && (
                                    <div className="text-[10px] text-blue-600 dark:text-blue-400">#{variantSku}</div>
                                  )}
                                  {typeof v === 'object' && v.code && (
                                    <div className="text-[10px] text-gray-600 dark:text-gray-400" title={`Kod: ${v.code}`}>Kod: {v.code}</div>
                                  )}
                                  {typeof v === 'object' && v.catalogNumber && (
                                    <div className="text-[10px] text-gray-600 dark:text-gray-400" title={`Katalog: ${v.catalogNumber}`}>Katalog: {v.catalogNumber}</div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Xil rasmlari */}
                            <div className="space-y-1">
                              <label className="text-xs text-gray-600 dark:text-gray-400">Xil rasmlari</label>

                              {/* Mavjud variant rasmlari */}
                              {(() => {
                                const variantImages = typeof v === 'object' && Array.isArray(v.images)
                                  ? v.images
                                  : (typeof v === 'object' && v.imageUrl ? [v.imageUrl] : []);

                                return variantImages.length > 0 ? (
                                  <div className="grid grid-cols-3 gap-1">
                                    {variantImages.map((img, imgIdx) => (
                                      <div key={imgIdx} className="relative group">
                                        <img
                                          src={img}
                                          alt={`${variantName} rasmi ${imgIdx + 1}`}
                                          className="h-12 w-12 object-cover rounded border border-gray-300 dark:border-gray-600"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveVariantImageByIndex(idx, imgIdx)}
                                          className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                          title="Rasmni o'chirish"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : null;
                              })()}

                              {/* Rasm yuklash */}
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => handleVariantImagesChangeByIndex(e, idx)}
                                className="block w-full text-[10px] text-gray-500 dark:text-gray-400 file:mr-1 file:py-0.5 file:px-1 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 dark:file:bg-blue-500/20 file:text-blue-700 dark:file:text-blue-400"
                              />
                              <p className="text-[9px] text-gray-400 dark:text-gray-500">
                                Bir nechta rasm yuklash mumkin
                              </p>
                            </div>

                            {/* Xil tasnifi */}
                            <div className="space-y-1">
                              <label className="text-xs text-gray-600 dark:text-gray-400">Xil tasnifi</label>
                              <input
                                type="text"
                                value={typeof v === 'object' && v.category ? v.category : ''}
                                onChange={(e) => {
                                  const newVariants = [...storeProductForm.variants];
                                  if (typeof newVariants[idx] === 'object') {
                                    newVariants[idx].category = e.target.value;
                                  }
                                  handleStoreProductFormChange("variants", newVariants);
                                }}
                                placeholder="Tasnif"
                                className="w-full text-xs px-2 py-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-200"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStoreProductDialogOpen(false)}
                    className="rounded-lg border-gray-300 dark:border-gray-700"
                  >
                    Bekor qilish
                  </Button>
                  <Button
                    type="submit"
                    disabled={storeProductSubmitting}
                    className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {storeProductSubmitting ? "Saqlanmoqda..." : "Saqlash"}
                  </Button>
                </DialogFooter>
              </form>
            ) : null;
          })()}

          {/* Oddiy mahsulotlar uchun - barcha maydonlar */}
          {!(storeProductDialogMode === "edit" && editingStoreProductId && (() => {
            const editingProduct = storeProducts.find(p => p._id === editingStoreProductId);
            return editingProduct?.userId && editingProduct.userId !== null;
          })()) && (
              <form className="space-y-4" onSubmit={handleStoreProductSubmit}>

                <div className="space-y-2">
                  <Label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="store-product-sku">
                    Mahsulot kodi
                  </Label>
                  <Input
                    id="store-product-sku"
                    value={storeProductForm.sku}
                    onChange={(event) => handleStoreProductFormChange("sku", event.target.value)}
                    placeholder="Avtomatik: 1, 2, 3..."
                    className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="store-product-name">
                    Mahsulot nomi
                  </Label>
                  <Input
                    id="store-product-name"
                    value={storeProductForm.name}
                    onChange={(event) => handleStoreProductFormChange("name", event.target.value)}
                    placeholder="Masalan, Sport disklar"
                    className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 placeholder:text-gray-500"
                    required
                  />
                </div>

                {/* Narx qismi: Asl narxi, Foiz, Sotiladigan narx */}
                <div className="space-y-3">
                  {/* Valyuta tanlash */}
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-gray-700 dark:text-gray-300">Valyuta:</Label>
                    <Select
                      value={storeProductForm.currency || "USD"}
                      onValueChange={(value) => handleStoreProductFormChange("currency", value)}
                    >
                      <SelectTrigger className="w-24 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700">
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="UZS">UZS</SelectItem>
                        <SelectItem value="RUB">RUB</SelectItem>
                        <SelectItem value="CNY">CNY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Asl narxi, Foiz, Sotiladigan narx - bir qatorda */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="store-product-original-price">
                        Asl narxi
                      </Label>
                      <Input
                        id="store-product-original-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={storeProductForm.originalPrice}
                        onChange={(event) => {
                          const origPrice = event.target.value;
                          handleStoreProductFormChange("originalPrice", origPrice);
                          // Foiz bor bo'lsa, sotiladigan narxni hisoblash
                          if (origPrice && storeProductForm.markupPercent) {
                            const calculated = parseFloat(origPrice) * (1 + parseFloat(storeProductForm.markupPercent) / 100);
                            handleStoreProductFormChange("price", calculated.toFixed(2));
                          }
                        }}
                        onWheel={(e) => e.target.blur()}
                        placeholder="0"
                        className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 placeholder:text-gray-500"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="store-product-markup">
                        Foiz %
                      </Label>
                      <Input
                        id="store-product-markup"
                        type="number"
                        min="0"
                        step="1"
                        value={storeProductForm.markupPercent}
                        onChange={(event) => {
                          const percent = event.target.value;
                          handleStoreProductFormChange("markupPercent", percent);
                          // Asl narx bor bo'lsa, sotiladigan narxni hisoblash
                          if (storeProductForm.originalPrice && percent) {
                            const calculated = parseFloat(storeProductForm.originalPrice) * (1 + parseFloat(percent) / 100);
                            handleStoreProductFormChange("price", calculated.toFixed(2));
                          }
                        }}
                        onWheel={(e) => e.target.blur()}
                        placeholder="0"
                        className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 placeholder:text-gray-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="store-product-price">
                        Sotiladigan narx
                      </Label>
                      <Input
                        id="store-product-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={storeProductForm.price}
                        onChange={(event) => {
                          const sellPrice = event.target.value;
                          handleStoreProductFormChange("price", sellPrice);
                          // Asl narx bor bo'lsa, foizni avtomatik hisoblash
                          if (storeProductForm.originalPrice && sellPrice) {
                            const origPrice = parseFloat(storeProductForm.originalPrice);
                            const newPrice = parseFloat(sellPrice);
                            if (origPrice > 0) {
                              const calculatedPercent = ((newPrice - origPrice) / origPrice) * 100;
                              handleStoreProductFormChange("markupPercent", calculatedPercent.toFixed(1));
                            }
                          }
                        }}
                        onWheel={(e) => e.target.blur()}
                        placeholder="0"
                        className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 placeholder:text-gray-500"
                        required
                      />
                    </div>
                  </div>

                  {/* UZS ga o'girish - barcha narxlar uchun */}
                  {storeProductForm.currency && storeProductForm.currency !== "UZS" && exchangeRates[storeProductForm.currency] > 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 p-2 rounded-lg bg-gray-100 dark:bg-gray-800/50">
                      <p className="font-medium text-gray-600 dark:text-gray-300">UZS ga o'girilganda:</p>
                      {storeProductForm.originalPrice && (
                        <p>Asl narxi: {(parseFloat(storeProductForm.originalPrice) * exchangeRates[storeProductForm.currency]).toLocaleString('uz-UZ')} so'm</p>
                      )}
                      {storeProductForm.price && (
                        <p className="text-green-600 dark:text-green-400">Sotiladigan: {(parseFloat(storeProductForm.price) * exchangeRates[storeProductForm.currency]).toLocaleString('uz-UZ')} so'm</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Mahsulot holati */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-700 dark:text-gray-300">Mahsulot holati</Label>
                  <Select
                    value={storeProductForm.condition || "new"}
                    onValueChange={(value) => handleStoreProductFormChange("condition", value)}
                  >
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700">
                      <SelectItem value="new">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          Yangi
                        </div>
                      </SelectItem>
                      <SelectItem value="refurbished">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                          O'rtacha
                        </div>
                      </SelectItem>
                      <SelectItem value="used">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                          Eski
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="store-product-category">
                    Kategoriya (ixtiyoriy)
                  </Label>
                  <CategoryPicker
                    value={storeProductForm.categoryId || null}
                    onChange={(categoryId, meta) => {
                      handleStoreProductFormChange("categoryId", categoryId || "");
                      // Preserve readable category name for backward compatibility / listings
                      if (meta?.pathLabel) {
                        handleStoreProductFormChange("category", meta.pathLabel);
                      }
                    }}
                  />
                </div>

                {/* Variants (Xil) section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-gray-700 dark:text-gray-300">Xil (rang/variant)</Label>
                    <Button type="button" size="sm" className="border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100" onClick={handleOpenVariantDialog}>
                      Xil qo'shish
                    </Button>
                  </div>
                  {Array.isArray(storeProductForm.variants) && storeProductForm.variants.length > 0 ? (
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {storeProductForm.variants.map((v, idx) => {
                        // Поддержка форматов: строка, variantSummaries {name, price, sku, stock}, или {name, options}
                        let variantName = 'Nomsiz variant';
                        let variantPrice = '';
                        let variantSku = '';
                        let variantStock = null;
                        let variantOriginalPrice = '';
                        let variantMarkupPercent = null;
                        let variantCurrency = 'USD';

                        if (typeof v === 'string') {
                          variantName = v;
                        } else if (typeof v === 'object' && v !== null) {
                          variantName = v.name || 'Nomsiz variant';
                          variantCurrency = v.currency || 'USD';
                          // variantSummaries format: price может быть числом
                          variantPrice = v.price ? (typeof v.price === 'number' ? `${v.price.toLocaleString()} ${variantCurrency}` : v.price) : '';
                          variantSku = v.sku || '';
                          variantStock = v.stock !== undefined ? v.stock : (v.stockCount !== undefined ? v.stockCount : null);
                          // Asl narxi (POST: basePrice, Marketplace: originalPrice)
                          variantOriginalPrice = v.originalPrice || v.basePrice || '';
                          // Foiz (POST: priceMultiplier, Marketplace: markupPercent)
                          variantMarkupPercent = v.markupPercent !== undefined ? v.markupPercent : (v.priceMultiplier !== undefined ? v.priceMultiplier : null);
                        }
                        // Variant rasmini olish - har bir variant o'z rasmini ko'rsatishi kerak
                        let variantImage = '';
                        if (typeof v === 'object' && v !== null) {
                          // Avval v.images ni tekshiramiz (ko'p rasm yuklangan bo'lsa)
                          if (Array.isArray(v.images) && v.images.length > 0) {
                            variantImage = v.images[0];
                          }
                          // Keyin v.imageUrl ni tekshiramiz (bitta rasm yuklangan bo'lsa)
                          else if (v.imageUrl) {
                            variantImage = v.imageUrl;
                          }
                          // Keyin v.imagePaths ni tekshiramiz (eski format)
                          else if (Array.isArray(v.imagePaths) && v.imagePaths.length > 0) {
                            variantImage = v.imagePaths[0];
                          }
                        }

                        // Debug log - har bir variantning rasmini tekshirish
                        console.log(`=== VARIANT ${idx} ===`);
                        console.log("Variant name:", variantName);
                        console.log("Variant images:", v.images);
                        console.log("Variant imageUrl:", v.imageUrl);
                        console.log("Final variantImage:", variantImage);

                        // POST tizim mahsulotlarini aniqlash
                        const isPostSystemProduct = storeProductDialogMode === "edit" && editingStoreProductId && (() => {
                          const editingProduct = storeProducts.find(p => p._id === editingStoreProductId);
                          return editingProduct?.userId && editingProduct.userId !== null;
                        })();

                        return (
                          <div key={`variant-${idx}`} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-3">
                            <div className="flex items-start gap-3">
                              {variantImage && (
                                <img
                                  src={variantImage}
                                  alt={variantName}
                                  className="h-16 w-16 object-cover rounded-lg border border-gray-300 dark:border-gray-700"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div
                                  className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2 cursor-pointer hover:line-clamp-none transition-all"
                                  title={variantName}
                                  onClick={(e) => {
                                    e.currentTarget.classList.toggle('line-clamp-2');
                                    e.currentTarget.classList.toggle('line-clamp-none');
                                  }}
                                >
                                  {variantName}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                  {variantSku && (
                                    <div className="text-[10px] text-blue-600 dark:text-blue-400">#{variantSku}</div>
                                  )}
                                  {typeof v === 'object' && v.code && (
                                    <div className="text-[10px] text-gray-600 dark:text-gray-400" title={`Kod: ${v.code}`}>Kod: {v.code}</div>
                                  )}
                                  {typeof v === 'object' && v.catalogNumber && (
                                    <div className="text-[10px] text-gray-600 dark:text-gray-400" title={`Katalog: ${v.catalogNumber}`}>Katalog: {v.catalogNumber}</div>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs">
                                  {variantOriginalPrice && (
                                    <span className="text-gray-500">Asl: {variantOriginalPrice} {variantCurrency}</span>
                                  )}
                                  {variantMarkupPercent !== null && (
                                    <span className="text-blue-600 dark:text-blue-400">+{variantMarkupPercent}%</span>
                                  )}
                                  {variantPrice && (
                                    <span className="text-gray-600 dark:text-gray-400">{variantPrice}</span>
                                  )}
                                </div>
                                {variantStock !== null && (
                                  <div className="text-xs text-gray-500 mt-1">Ombor: {variantStock}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {/* Variant tahrirlash tugmasi - POST mahsulotlari uchun ko'rsatilmaydi */}
                                {!isPostSystemProduct && (
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                                    onClick={() => handleEditVariant(v, idx)}
                                    aria-label="Tahrirlash"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-red-500 dark:text-red-300 hover:text-white hover:bg-red-500 dark:hover:bg-red-700/30"
                                  onClick={() => {
                                    setStoreProductForm((prev) => {
                                      const list = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                      list.splice(idx, 1);
                                      return { ...prev, variants: list };
                                    });
                                  }}
                                  aria-label="O'chirish"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="store-product-description">
                    Tavsif
                  </Label>
                  <textarea
                    id="store-product-description"
                    value={storeProductForm.description}
                    onChange={(event) => handleStoreProductFormChange("description", event.target.value)}
                    placeholder="Mahsulot haqida qisqa tavsif"
                    className="min-h-[90px] w-full resize-none rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 text-sm text-gray-900 dark:text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-red-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="store-product-stock">
                    Ombordagi soni
                  </Label>
                  <Input
                    id="store-product-stock"
                    type="number"
                    min="0"
                    step="1"
                    value={storeProductForm.stockCount}
                    onChange={(event) => handleStoreProductFormChange("stockCount", event.target.value)}
                    onWheel={(e) => e.target.blur()}
                    placeholder="Masalan, 10"
                    className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="store-product-images">
                    Mahsulot rasmlari
                  </Label>
                  <Input
                    id="store-product-images"
                    type="file"
                    accept="image/*"
                    multiple
                    className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200"
                    onChange={handleStoreProductImagesChange}
                  />
                  {Array.isArray(storeProductForm.images) && storeProductForm.images.length > 0 ? (
                    <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {storeProductForm.images.map((url, idx) => (
                        <div key={`${url}-${idx}`} className="relative group">
                          <img
                            src={url}
                            alt={`preview-${idx}`}
                            className="h-20 w-full object-cover rounded-lg border border-gray-700"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveStoreProductImage(idx)}
                            className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow"
                            aria-label="Remove image"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleStoreProductDialogChange(false)}
                    className="border-gray-600 bg-gray-850 text-gray-300 hover:bg-gray-700"
                  >
                    Bekor qilish
                  </Button>
                  <Button
                    type="submit"
                    disabled={storeProductSubmitting}
                    className={`border border-red-700 bg-red-600 text-white hover:bg-red-700 ${storeProductSubmitting ? "opacity-70 cursor-not-allowed" : ""
                      }`}
                  >
                    {storeProductSubmitting
                      ? "Saqlanmoqda..."
                      : storeProductDialogMode === "edit"
                        ? "Yangilash"
                        : "Mahsulot qo'shish"}
                  </Button>
                </DialogFooter>
              </form>
            )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogChange}>
        <DialogContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
          <DialogHeader>
            <DialogTitle>Magazinni o'chirish</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Ushbu magazinni o'chirishni tasdiqlang. Bu amalni ortga qaytarib bo'lmaydi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <p>
              Magazin nomi: <span className="font-semibold text-gray-900 dark:text-white">{storeToDelete?.name}</span>
            </p>
            <p>Manzili: {storeToDelete?.location}</p>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDeleteDialogChange(false)}
              className="border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-850 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Bekor qilish
            </Button>
            <Button
              type="button"
              disabled={storeDeleting}
              onClick={handleConfirmDeleteStore}
              className={`border border-red-700 bg-red-600 text-white hover:bg-red-700 ${storeDeleting ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {storeDeleting ? "O'chirilmoqda..." : "O'chirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={variantDialogOpen} onOpenChange={handleVariantDialogChange}>
        <DialogContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                {variantEditingIndex != null ? "Variantni tahrirlash" : "Yangi variant qo'shish"}
              </DialogTitle>
              {/* Valyuta kursi - tanlangan valyutaga qarab */}
              {variantForm.currency && variantForm.currency !== "UZS" && exchangeRates[variantForm.currency] > 0 && (
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-medium">
                  <span className="text-green-300">{variantForm.currency === "USD" ? "$" : variantForm.currency === "RUB" ? "₽" : variantForm.currency === "CNY" ? "¥" : ""}</span>
                  <span>1 {variantForm.currency} = {exchangeRates[variantForm.currency].toLocaleString('uz-UZ')} UZS</span>
                </div>
              )}
            </div>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Mahsulot uchun yangi variant kiriting. Variant mahsulotning bir turi sifatida ko'rsatiladi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="variant-name">
                  Variant nomi
                </Label>
                <Input
                  id="variant-name"
                  value={variantForm.name}
                  onChange={(event) => handleVariantFormChange("name", event.target.value)}
                  placeholder="Masalan, Qizil yoki 17"
                  className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 placeholder:text-gray-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="variant-sku">
                  Kod
                </Label>
                <Input
                  id="variant-sku"
                  value={variantForm.sku}
                  onChange={(event) => handleVariantFormChange("sku", event.target.value)}
                  placeholder="Avtomatik"
                  className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 placeholder:text-gray-500"
                />
                <p className="text-xs text-gray-500">Bo'sh qolsa avtomatik</p>
              </div>
            </div>
            {/* Narx qismi: Valyuta, Asl narxi, Foiz, Sotiladigan narx */}
            <div className="space-y-3">
              {/* Valyuta tanlash */}
              <div className="flex items-center gap-2">
                <Label className="text-sm text-gray-700 dark:text-gray-300">Valyuta:</Label>
                <Select
                  value={variantForm.currency || "USD"}
                  onValueChange={(value) => handleVariantFormChange("currency", value)}
                >
                  <SelectTrigger className="w-24 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700">
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="UZS">UZS</SelectItem>
                    <SelectItem value="RUB">RUB</SelectItem>
                    <SelectItem value="CNY">CNY</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Asl narxi, Foiz, Sotiladigan narx - bir qatorda */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="variant-original-price">
                    Asl narxi
                  </Label>
                  <Input
                    id="variant-original-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={variantForm.originalPrice}
                    onChange={(event) => {
                      const origPrice = event.target.value;
                      handleVariantFormChange("originalPrice", origPrice);
                      if (origPrice && variantForm.markupPercent) {
                        const calculated = parseFloat(origPrice) * (1 + parseFloat(variantForm.markupPercent) / 100);
                        handleVariantFormChange("price", calculated.toFixed(2));
                      }
                    }}
                    onWheel={(e) => e.target.blur()}
                    placeholder="0"
                    className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 placeholder:text-gray-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="variant-markup">
                    Foiz %
                  </Label>
                  <Input
                    id="variant-markup"
                    type="number"
                    min="0"
                    step="1"
                    value={variantForm.markupPercent}
                    onChange={(event) => {
                      const percent = event.target.value;
                      handleVariantFormChange("markupPercent", percent);
                      if (variantForm.originalPrice && percent) {
                        const calculated = parseFloat(variantForm.originalPrice) * (1 + parseFloat(percent) / 100);
                        handleVariantFormChange("price", calculated.toFixed(2));
                      }
                    }}
                    onWheel={(e) => e.target.blur()}
                    placeholder="0"
                    className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 placeholder:text-gray-500"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="variant-price">
                    Sotiladigan narx
                  </Label>
                  <Input
                    id="variant-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={variantForm.price}
                    onChange={(event) => {
                      const sellPrice = event.target.value;
                      handleVariantFormChange("price", sellPrice);
                      if (variantForm.originalPrice && sellPrice) {
                        const origPrice = parseFloat(variantForm.originalPrice);
                        const newPrice = parseFloat(sellPrice);
                        if (origPrice > 0) {
                          const calculatedPercent = ((newPrice - origPrice) / origPrice) * 100;
                          handleVariantFormChange("markupPercent", calculatedPercent.toFixed(1));
                        }
                      }
                    }}
                    onWheel={(e) => e.target.blur()}
                    placeholder="0"
                    className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 placeholder:text-gray-500"
                    required
                  />
                </div>
              </div>

              {/* UZS ga o'girish */}
              {variantForm.currency && variantForm.currency !== "UZS" && exchangeRates[variantForm.currency] > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 p-2 rounded-lg bg-gray-100 dark:bg-gray-800/50">
                  <p className="font-medium text-gray-600 dark:text-gray-300">UZS ga o'girilganda:</p>
                  {variantForm.originalPrice && (
                    <p>Asl narxi: {(parseFloat(variantForm.originalPrice) * exchangeRates[variantForm.currency]).toLocaleString('uz-UZ')} so'm</p>
                  )}
                  {variantForm.price && (
                    <p className="text-green-600 dark:text-green-400">Sotiladigan: {(parseFloat(variantForm.price) * exchangeRates[variantForm.currency]).toLocaleString('uz-UZ')} so'm</p>
                  )}
                </div>
              )}
            </div>

            {/* Variant holati */}
            <div className="space-y-2">
              <Label className="text-sm text-gray-700 dark:text-gray-300">Variant holati</Label>
              <Select
                value={variantForm.condition || "new"}
                onValueChange={(value) => handleVariantFormChange("condition", value)}
              >
                <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700">
                  <SelectItem value="new">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      Yangi
                    </div>
                  </SelectItem>
                  <SelectItem value="refurbished">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                      O'rtacha
                    </div>
                  </SelectItem>
                  <SelectItem value="used">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      Eski
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="variant-category">
                Kategoriya (ixtiyoriy)
              </Label>
              <CategoryPicker
                value={variantForm.categoryId || null}
                onChange={(categoryId, meta) => {
                  handleVariantFormChange("categoryId", categoryId || "");
                  if (meta?.pathLabel) {
                    handleVariantFormChange("category", meta.pathLabel);
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="variant-description">
                Tavsif
              </Label>
              <textarea
                id="variant-description"
                value={variantForm.description}
                onChange={(event) => handleVariantFormChange("description", event.target.value)}
                placeholder="Variant haqida qisqa tavsif"
                className="min-h-[90px] w-full resize-none rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 text-sm text-gray-900 dark:text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-red-600"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="variant-stock">
                Ombordagi soni
              </Label>
              <Input
                id="variant-stock"
                type="number"
                min="0"
                step="1"
                value={variantForm.stockCount}
                onChange={(event) => handleVariantFormChange("stockCount", event.target.value)}
                onWheel={(e) => e.target.blur()}
                placeholder="Masalan, 10"
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="variant-images">
                Variant rasmlari
              </Label>
              <Input
                id="variant-images"
                type="file"
                accept="image/*"
                multiple
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200"
                onChange={handleVariantImagesChange}
              />
              {Array.isArray(variantForm.images) && variantForm.images.length > 0 ? (
                <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {variantForm.images.map((url, idx) => (
                    <div key={`${url}-${idx}`} className="relative group">
                      <img
                        src={url}
                        alt={`preview-${idx}`}
                        className="h-20 w-full object-cover rounded-lg border border-gray-300 dark:border-gray-700"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveVariantImage(idx)}
                        className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow"
                        aria-label="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleVariantDialogChange(false)}
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Bekor qilish
              </Button>
              <Button
                type="button"
                onClick={handleVariantSubmit}
                disabled={variantSubmitting}
                className={`border border-red-700 bg-red-600 text-white hover:bg-red-700 ${variantSubmitting ? "opacity-70 cursor-not-allowed" : ""
                  }`}
              >
                {variantSubmitting
                  ? "Saqlanmoqda..."
                  : variantEditingIndex != null
                    ? "Yangilash"
                    : "Variant qo'shish"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Magazin biriktirish dialogi */}
      <Dialog open={storeAssignDialogOpen} onOpenChange={setStoreAssignDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
          <DialogHeader>
            <DialogTitle>Magazin biriktirish</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Xodimga magazin biriktiring. Xodim faqat biriktirilgan magazinini ko'ra oladi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store-select">Magazin</Label>
              <Select value={selectedStoreForAssign === "none" ? undefined : selectedStoreForAssign} onValueChange={(value) => setSelectedStoreForAssign(value)}>
                <SelectTrigger id="store-select" className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                  <SelectValue placeholder="Magazin tanlang" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                  <SelectItem value="none">Magazin biriktirilmagan</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store._id} value={store._id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStoreAssignDialogOpen(false);
                setAssigningStoreUserId(null);
                setSelectedStoreForAssign("none");
              }}
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Bekor qilish
            </Button>
            <Button
              type="button"
              onClick={handleAssignStore}
              disabled={updatingRoleId === assigningStoreUserId}
              className={`border border-red-700 bg-red-600 text-white hover:bg-red-700 ${updatingRoleId === assigningStoreUserId ? "opacity-70 cursor-not-allowed" : ""
                }`}
            >
              {updatingRoleId === assigningStoreUserId ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminPanel;
