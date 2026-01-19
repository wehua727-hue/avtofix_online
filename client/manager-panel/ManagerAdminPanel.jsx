import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { storesAPI, productsAPI, ordersAPI, managerAPI, uploadsAPI, authAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Package, Store, Users, ArrowLeft, Home, ChevronDown, Trash2, Loader2, Pencil, X, Search, Menu } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import CategoryPicker from "@/components/CategoryPicker";
import { formatPrice } from "@/utils/currency";

export default function ManagerAdminPanel() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState("store");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [userCandidates, setUserCandidates] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [perm, setPerm] = useState({ products: false, orders: false, helpers: false });
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productSearch, setProductSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [productForm, setProductForm] = useState({
    name: "",
    price: "",
    category: "",
    categoryId: "",
    description: "",
    stockCount: "",
    images: [],
    imagePreview: "",
    variants: [],
  });
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [variantEditingIndex, setVariantEditingIndex] = useState(null);
  const [variantForm, setVariantForm] = useState({
    name: "",
    price: "",
    imagePreview: "",
    images: [],
    description: "",
    categoryId: "",
    category: "",
    stockCount: "",
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const managerStoreId = currentUser?.managerOfShop || null;

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        let targetStoreId = managerStoreId;
        if (!targetStoreId) {
          // Fallback: find store where this user is set as manager
          const allStores = await storesAPI.getAll();
          const myStore = allStores.find((st) => {
            const m = st?.manager;
            const mid = typeof m === 'object' ? (m?._id || m?.id) : m;
            return mid && currentUser?.id && String(mid) === String(currentUser.id);
          });
          if (myStore?._id) {
            targetStoreId = myStore._id;
          }
        }

        if (!targetStoreId) {
          toast.error("Menedjerga magazin biriktirilmagan");
          return;
        }

        // Параллельная загрузка данных для ускорения
        const [s, prods, hs] = await Promise.all([
          storesAPI.getById(targetStoreId),
          productsAPI.getAll({ storeId: targetStoreId, includeInactive: true, adminPanel: true }),
          managerAPI.getHelpers()
        ]);
        
        setStore(s);
        setProducts(prods);
        setHelpers(hs);
      } catch (e) {
        console.error(e);
        toast.error(e.message || "Yuklashda xatolik");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [managerStoreId, currentUser?.id]);

  useEffect(() => {
    const loadUsers = async () => {
      if (!assignOpen) return;
      try {
        setUsersLoading(true);
        const all = await authAPI.getAll();
        const onlyUsers = (all || []).filter((u) => u.role === 'user');
        setUserCandidates(onlyUsers);
      } catch (e) {
        console.error(e);
        toast.error(e.message || "Foydalanuvchilarni olishda xatolik");
      } finally {
        setUsersLoading(false);
      }
    };
    loadUsers();
  }, [assignOpen]);

  const tabs = useMemo(() => ([
    { key: "store", label: "Magazin", icon: <Store className="h-4 w-4" /> },
    { key: "orders", label: "Buyurtmalar", icon: <Package className="h-4 w-4" /> },
    { key: "helpers", label: "Yordamchilar", icon: <Users className="h-4 w-4" /> },
  ]), []);

  if (!currentUser || currentUser.role !== "manager") {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-center text-gray-900 dark:text-white py-20">Ruxsat yo'q</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-[#06080f] text-gray-900 dark:text-white">
      <div className="flex min-h-screen">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white dark:bg-[#0a0c12] border-r border-gray-200 dark:border-white/10 transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex h-full flex-col p-4">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Menedjer paneli</h2>
              <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10" onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5 text-gray-500 dark:text-white/70" />
              </button>
            </div>
            <nav className="flex-1 space-y-2">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => { setActive(t.key); setSidebarOpen(false); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                    active === t.key 
                      ? "bg-gradient-to-r from-red-500 via-rose-600 to-orange-500 text-white shadow-lg shadow-red-500/30" 
                      : "text-gray-700 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/10"
                  }`}
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${active === t.key ? "bg-white/20" : "bg-gray-100 dark:bg-white/10"}`}>
                    {t.icon}
                  </span>
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Top navbar */}
          <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-[#0a0c12]/80 backdrop-blur-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                className="flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 p-2.5 text-gray-700 dark:text-white/80 transition hover:bg-gray-100 dark:hover:bg-white/10 lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <Link
                to="/"
                className="flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 p-2.5 sm:px-4 sm:py-2.5 text-gray-700 dark:text-white/80 transition hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <Home className="h-5 w-5" />
                <span className="hidden sm:inline ml-2 text-sm font-medium">Bosh sahifa</span>
              </Link>
              <button
                onClick={() => navigate(-1)}
                className="flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 p-2.5 sm:px-4 sm:py-2.5 text-gray-700 dark:text-white/80 transition hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden sm:inline ml-2 text-sm font-medium">Orqaga</span>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-white/60 hidden sm:inline truncate max-w-[150px]">{currentUser?.name || "Menedjer"}</span>
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-rose-500/30">
                {(currentUser?.name || "M").charAt(0).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Content area */}
          <section className="flex-1 p-4 sm:p-6 overflow-y-auto">
            {loading ? (
              <div className="text-gray-600 dark:text-white/70 py-12 text-center">Yuklanmoqda...</div>
            ) : active === "store" ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-dashed border-gray-300 dark:border-white/15 bg-gray-50 dark:bg-white/5 p-12 text-center">
                  <Store className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-white/40" />
                  <p className="text-gray-600 dark:text-white/80">Magazin boshqaruvi</p>
                </div>
              </div>
            ) : active === "orders" ? (
              <div>
                <div className="mb-4">
                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Buyurtmalar</CardTitle>
                </div>
                <OrdersList />
              </div>
            ) : active === "helpers" ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Yordamchilar</CardTitle>
                  <CreateHelperButton onOpen={() => setAssignOpen(true)} onCreated={(h) => setHelpers((x) => [h, ...x])} />
                </div>
                <HelpersList helpers={helpers} onUpdated={(u) => {
                  if (u.removed) {
                    setHelpers((arr) => arr.filter(h => h.id !== u.id));
                  } else {
                    setHelpers((arr) => arr.map(h => h.id === u.id ? u : h));
                  }
                }} />
              </div>
            ) : null}
          </section>
        </div>
      </div>

      {/* Create/Edit Product Modal */}
      <Dialog open={productModalOpen} onOpenChange={(open) => {
        setProductModalOpen(open);
        if (!open) {
          setEditingProduct(null);
          setProductForm({ name:"", price:"", category:"", categoryId:"", description:"", stockCount:"", images:[], imagePreview:"", variants:[] });
        }
      }}>
        <DialogContent className="bg-white dark:bg-[#0f1722] text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">{editingProduct ? "Mahsulotni tahrirlash" : "Mahsulot qo'shish"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-700 dark:text-white/80">Mahsulot nomi</Label>
              <Input value={productForm.name} onChange={(e)=>setProductForm({...productForm,name:e.target.value})} placeholder="Masalan, Sport disklar" className="bg-white dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white" />
            </div>
            <div>
              <Label className="text-gray-700 dark:text-white/80">Narxi</Label>
              <Input value={productForm.price} onChange={(e)=>setProductForm({...productForm,price:e.target.value})} placeholder="Masalan, 1 200 000 so'm" className="bg-white dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-white/80">Kategoriya (ixtiyoriy)</Label>
              {productForm.category ? (
                <div className="text-xs text-gray-600 dark:text-gray-300">Tanlangan: {productForm.category}</div>
              ) : null}
              <CategoryPicker
                value={productForm.categoryId || null}
                onChange={(id, meta) => {
                  setProductForm((prev) => ({
                    ...prev,
                    categoryId: id || "",
                    category: meta?.pathLabel || "",
                  }));
                }}
              />
            </div>
            <div>
              <Label className="text-gray-700 dark:text-white/80">Tavsif</Label>
              <Textarea value={productForm.description} onChange={(e)=>setProductForm({...productForm,description:e.target.value})} placeholder="Qisqa tavsif" className="bg-white dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white" />
            </div>
            <div>
              <Label className="text-gray-700 dark:text-white/80">Ombordagi soni</Label>
              <Input value={productForm.stockCount} onChange={(e)=>setProductForm({...productForm,stockCount:e.target.value})} placeholder="Masalan, 10" className="bg-white dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-white/80">Mahsulot rasmlari</Label>
              <div className="flex flex-wrap gap-2">
                {productForm.images.map((url, idx)=>(
                  <div key={idx} className="relative group">
                    <img src={url} alt="preview" className="h-16 w-16 rounded-lg object-cover border border-gray-200 dark:border-white/10" />
                    <button
                      type="button"
                      onClick={() => {
                        setProductForm((prev) => ({
                          ...prev,
                          images: prev.images.filter((_, i) => i !== idx)
                        }));
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input 
                  key={`product-image-input-${productForm.images.length}`}
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={async (e)=>{
                    const files = e.target.files;
                    if(!files || files.length === 0) return;
                    try {
                      for (let i = 0; i < files.length; i++) {
                        const { url } = await uploadsAPI.upload(files[i], "products");
                        setProductForm((prev)=>({ ...prev, images:[...(prev.images||[]), url] }));
                        toast.success(`Rasm ${i + 1} yuklandi`);
                      }
                    } catch(err){
                      toast.error(err.message || "Rasm yuklashda xatolik");
                    }
                  }} 
                  className="bg-white dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white" 
                />
              </div>
            </div>

            {/* Variants (Xil) section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-700 dark:text-white/80">Xil (rang/variant)</Label>
                <Button 
                  type="button" 
                  size="sm" 
                  className="border border-gray-300 dark:border-white/20 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/15"
                  onClick={() => {
                    setVariantForm({ name: "", price: "", imagePreview: "", images: [], description: "", categoryId: "", category: "", stockCount: "" });
                    setVariantEditingIndex(null);
                    setVariantDialogOpen(true);
                  }}
                >
                  Xil qo'shish
                </Button>
              </div>
              {Array.isArray(productForm.variants) && productForm.variants.length > 0 ? (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {productForm.variants.map((v, idx) => {
                    const variantName = typeof v === 'string' ? v : (v.name || 'Nomsiz variant');
                    const variantPrice = typeof v === 'object' && v.price ? v.price : '';
                    const variantImage = typeof v === 'object' && v.imageUrl ? v.imageUrl : (typeof v === 'object' && Array.isArray(v.images) && v.images.length > 0 ? v.images[0] : '');
                    return (
                      <div key={`variant-${idx}`} className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3">
                        <div className="flex items-start gap-3">
                          {variantImage && (
                            <img
                              src={variantImage}
                              alt={variantName}
                              className="h-16 w-16 object-cover rounded-lg border border-gray-200 dark:border-white/10"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{variantName}</div>
                            {variantPrice && (
                              <div className="text-xs text-gray-600 dark:text-white/70 mt-1">{variantPrice}</div>
                            )}
                            {typeof v === 'object' && v.stockCount !== undefined && (
                              <div className="text-xs text-gray-500 dark:text-white/60 mt-1">Soni: {v.stockCount}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10"
                              onClick={() => {
                                if (typeof v === 'string') {
                                  setVariantForm({
                                    name: v,
                                    price: "",
                                    imagePreview: "",
                                    images: [],
                                    description: "",
                                    categoryId: "",
                                    category: "",
                                    stockCount: "",
                                  });
                                } else {
                                  const gallery = Array.isArray(v.images) ? v.images.filter(Boolean) : v.imageUrl ? [v.imageUrl] : [];
                                  setVariantForm({
                                    name: v.name || "",
                                    price: v.price || "",
                                    imagePreview: gallery[0] || "",
                                    images: gallery,
                                    description: v.description || "",
                                    categoryId: v.categoryId || "",
                                    category: v.category || "",
                                    stockCount: v.stockCount?.toString() || "",
                                  });
                                }
                                setVariantEditingIndex(idx);
                                setVariantDialogOpen(true);
                              }}
                              aria-label="Tahrirlash"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10"
                              onClick={() => {
                                setProductForm((prev) => {
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
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" className="rounded-xl" onClick={()=>setProductModalOpen(false)}>Bekor qilish</Button>
            <Button disabled={creating} className="rounded-xl bg-gradient-to-r from-red-500 via-rose-600 to-orange-500" onClick={async ()=>{
              if(!store?._id){ toast.error("Magazin topilmadi"); return; }
              const nameStr = String(productForm.name || "").trim();
              const priceStr = String(productForm.price || "").trim();
              if(!nameStr || !priceStr){ toast.error("Nom va narx majburiy"); return; }
              const images = productForm.images;
              if(images.length===0){ toast.error("Kamida bitta rasm talab qilinadi"); return; }
              const parsedStock = Number(productForm.stockCount);
              if(!(Number.isFinite(parsedStock) && parsedStock>=0 && Number.isInteger(parsedStock))){ toast.error("Soni butun musbat son bo'lsin"); return; }
              try{
                setCreating(true);
                const form = new FormData();
                form.append("name", nameStr);
                form.append("price", priceStr);
                form.append("stockCount", String(parsedStock));
                form.append("store", store._id);
                const descStr = String(productForm.description || "").trim();
                if(descStr) form.append("description", descStr);
                if(productForm.categoryId) form.append("categoryId", productForm.categoryId);
                const catStr = String(productForm.category || "").trim();
                if(catStr) form.append("category", catStr);
                form.append("images", JSON.stringify(images));
                form.append("imageUrl", images[0]);
                if(Array.isArray(productForm.variants) && productForm.variants.length > 0) {
                  form.append("variants", JSON.stringify(productForm.variants));
                }
                
                if (editingProduct) {
                  // Update existing product
                  const updated = await productsAPI.update(editingProduct._id, form);
                  setProducts((prev) => prev.map(pr => pr._id === editingProduct._id ? updated : pr));
                  toast.success("Mahsulot yangilandi");
                } else {
                  // Create new product
                  const created = await productsAPI.create(form);
                  setProducts((prev)=>[created, ...prev]);
                  toast.success("Mahsulot qo'shildi");
                }
                setProductModalOpen(false);
                setEditingProduct(null);
                setProductForm({ name:"", price:"", category:"", categoryId:"", description:"", stockCount:"", images:[], imagePreview:"", variants:[] });
              }catch(err){
                toast.error(err.message || "Mahsulotni saqlashda xatolik");
              }finally{
                setCreating(false);
              }
            }}>{editingProduct ? "Saqlash" : "Mahsulot qo'shish"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variant Dialog */}
      <Dialog open={variantDialogOpen} onOpenChange={(open) => {
        setVariantDialogOpen(open);
        if (!open) {
          setVariantForm({ name: "", price: "", imagePreview: "", images: [], description: "", categoryId: "", category: "", stockCount: "" });
          setVariantEditingIndex(null);
        }
      }}>
        <DialogContent className="bg-white dark:bg-[#0f1722] text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              {variantEditingIndex != null ? "Variantni tahrirlash" : "Yangi variant qo'shish"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-700 dark:text-white/80">Variant nomi</Label>
              <Input
                value={variantForm.name}
                onChange={(e) => setVariantForm({...variantForm, name: e.target.value})}
                placeholder="Masalan, Qizil yoki 17"
                className="bg-white dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <Label className="text-gray-700 dark:text-white/80">Narxi</Label>
              <Input
                value={variantForm.price}
                onChange={(e) => setVariantForm({...variantForm, price: e.target.value})}
                placeholder="Masalan, 1 200 000 so'm"
                className="bg-white dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-white/80">Kategoriya (ixtiyoriy)</Label>
              {variantForm.category ? (
                <div className="text-xs text-gray-600 dark:text-gray-300">Tanlangan: {variantForm.category}</div>
              ) : null}
              <CategoryPicker
                value={variantForm.categoryId || null}
                onChange={(id, meta) => {
                  setVariantForm((prev) => ({
                    ...prev,
                    categoryId: id || "",
                    category: meta?.pathLabel || "",
                  }));
                }}
              />
            </div>
            <div>
              <Label className="text-gray-700 dark:text-white/80">Tavsif</Label>
              <Textarea
                value={variantForm.description}
                onChange={(e) => setVariantForm({...variantForm, description: e.target.value})}
                placeholder="Qisqa tavsif"
                className="bg-white dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <Label className="text-gray-700 dark:text-white/80">Ombordagi soni</Label>
              <Input
                value={variantForm.stockCount}
                onChange={(e) => setVariantForm({...variantForm, stockCount: e.target.value})}
                placeholder="Masalan, 10"
                className="bg-white dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-white/80">Variant rasmlari</Label>
              <div className="flex flex-wrap gap-2">
                {variantForm.images.map((url, idx)=>(
                  <div key={idx} className="relative group">
                    <img src={url} alt="preview" className="h-16 w-16 rounded-lg object-cover border border-gray-200 dark:border-white/10" />
                    <button
                      type="button"
                      onClick={() => {
                        setVariantForm((prev) => ({
                          ...prev,
                          images: prev.images.filter((_, i) => i !== idx)
                        }));
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  key={`variant-image-input-${variantForm.images.length}`}
                  type="file"
                  accept="image/*"
                  multiple
                  className="bg-white dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white"
                  onChange={async (e) => {
                    const files = e.target.files;
                    if(!files || files.length === 0) return;
                    try {
                      for (let i = 0; i < files.length; i++) {
                        const { url } = await uploadsAPI.upload(files[i], "products");
                        setVariantForm((prev)=>({ ...prev, images:[...(prev.images||[]), url] }));
                        toast.success(`Rasm ${i + 1} yuklandi`);
                      }
                    } catch(err){
                      toast.error(err.message || "Rasm yuklashda xatolik");
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              className="rounded-xl"
              onClick={() => setVariantDialogOpen(false)}
            >
              Bekor qilish
            </Button>
            <Button
              className="rounded-xl bg-gradient-to-r from-red-500 via-rose-600 to-orange-500"
              onClick={() => {
                if (!variantForm.name.trim() || !variantForm.price.trim()) {
                  toast.error("Variant nomi va narxi majburiy");
                  return;
                }

                const gallery = (variantForm.images || []).filter(Boolean);
                if (gallery.length === 0) {
                  toast.error("Variant rasmi talab etiladi");
                  return;
                }

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

                const variantData = {
                  name: variantForm.name.trim(),
                  price: variantForm.price.trim(),
                  description: variantForm.description.trim() || "",
                  categoryId: variantForm.categoryId || "",
                  category: variantForm.category.trim() || "",
                  stockCount: parsedStockCount !== null ? parsedStockCount : null,
                  images: gallery,
                  imageUrl: gallery[0],
                };

                setProductForm((prev) => {
                  const list = Array.isArray(prev.variants) ? [...prev.variants] : [];
                  if (variantEditingIndex != null) {
                    list[variantEditingIndex] = variantData;
                  } else {
                    list.push(variantData);
                  }
                  return { ...prev, variants: list };
                });

                setVariantDialogOpen(false);
                toast.success(variantEditingIndex != null ? "Variant yangilandi" : "Variant qo'shildi");
              }}
            >
              {variantEditingIndex != null ? "Yangilash" : "Variant qo'shish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Existing Helper Modal */}
      <Dialog open={assignOpen} onOpenChange={(v)=>{ setAssignOpen(v); if(!v){ setSelectedUser(null); setUserSearch(""); setPerm({products:false,orders:false,helpers:false}); } }}>
        <DialogContent className="bg-white dark:bg-[#0f1722] text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Yordamchini tanlash</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-gray-700 dark:text-white/80">Foydalanuvchini tanlang</Label>
              <div className="relative mt-1">
                <select
                  value={selectedUser?.id || ""}
                  onChange={(e)=>{
                    const val = e.target.value;
                    const sorted = (userCandidates||[])
                      .filter(u=>u.role==='user')
                      .sort((a,b)=> (a.name||'').localeCompare(b.name||'') || String(a.phone||'').localeCompare(String(b.phone||'')));
                    const found = sorted.find(u=>u.id===val) || null;
                    setSelectedUser(found);
                  }}
                  className="w-full appearance-none bg-white dark:bg-white/5 border border-gray-300 dark:border-white/15 text-gray-900 dark:text-white rounded-lg px-3 pr-10 h-10 focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500/40 placeholder-gray-400 dark:placeholder-white/50"
                >
                  <option value="" disabled className="text-gray-500 dark:text-white/60">Tanlang...</option>
                  {usersLoading ? (
                    <option>Yuklanmoqda...</option>
                  ) : (
                    (userCandidates||[])
                      .filter(u=>u.role==='user')
                      .sort((a,b)=> (a.name||'').localeCompare(b.name||'') || String(a.phone||'').localeCompare(String(b.phone||'')))
                      .map(u=> (
                        <option key={u.id} value={u.id}>{u.name || "Noma'lum"} — +998{u.phone}</option>
                      ))
                  )}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-white/60" />
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3 space-y-2 bg-gray-50 dark:bg-white/5">
              <div className="font-semibold text-gray-900 dark:text-white">Huquqlar</div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-white"><input type="checkbox" checked={perm.products} onChange={(e)=> setPerm(p=>({...p,products:e.target.checked}))} /> Mahsulotlar</label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-white"><input type="checkbox" checked={perm.orders} onChange={(e)=> setPerm(p=>({...p,orders:e.target.checked}))} /> Buyurtmalar</label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-white"><input type="checkbox" checked={perm.helpers} onChange={(e)=> setPerm(p=>({...p,helpers:e.target.checked}))} /> Yordamchilar</label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={()=> setAssignOpen(false)}>Bekor qilish</Button>
            <Button disabled={!selectedUser || assigning} onClick={async ()=>{
              if(!selectedUser) return;
              try{
                setAssigning(true);
                const h = await managerAPI.assignExistingHelper({ userId: selectedUser.id, permissions: perm });
                setHelpers((prev)=> [h, ...prev]);
                toast.success("Yordamchi tayinlandi");
                setAssignOpen(false);
              }catch(err){
                toast.error(err.message || "Yordamchini tayinlashda xatolik");
              }finally{ setAssigning(false); }
            }}>Tayinlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={(open) => {
        setDeleteModalOpen(open);
        if (!open) setProductToDelete(null);
      }}>
        <DialogContent className="bg-white dark:bg-[#0f1722] text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Mahsulotni o'chirish</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600 dark:text-white/80">
              <span className="font-semibold text-gray-900 dark:text-white">"{productToDelete?.name}"</span> mahsulotini o'chirishni tasdiqlaysizmi?
            </p>
            <p className="text-sm text-gray-500 dark:text-white/60 mt-2">Bu amalni qaytarib bo'lmaydi.</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)} disabled={deleting}>
              Bekor qilish
            </Button>
            <Button 
              variant="destructive" 
              disabled={deleting}
              onClick={async () => {
                if (!productToDelete) return;
                try {
                  setDeleting(true);
                  await productsAPI.delete(productToDelete._id);
                  setProducts(prev => prev.filter(pr => pr._id !== productToDelete._id));
                  toast.success("Mahsulot o'chirildi");
                  setDeleteModalOpen(false);
                  setProductToDelete(null);
                } catch (e) {
                  toast.error(e.message || "O'chirishda xatolik");
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              O'chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function OrdersList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [statusMenuFor, setStatusMenuFor] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await ordersAPI.getAll();
      setOrders(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const fmt = (n, currency) => formatPrice(n, currency);

  const statusPill = (s) => {
    const map = {
      pending: { label: "Kutilmoqda", cls: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40" },
      confirmed: { label: "Tasdiqlandi", cls: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
      preparing: { label: "Tayyorlanmoqda", cls: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" },
      shipping: { label: "Yetkazilmoqda", cls: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
      delivered: { label: "Yakunlandi", cls: "bg-green-500/20 text-green-300 border-green-500/40" },
      cancelled: { label: "Bekor qilindi", cls: "bg-red-500/20 text-red-300 border-red-500/40" },
    };
    const it = map[s] || map.pending;
    return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs border ${it.cls}`}>{it.label}</span>;
  };

  const openView = (o) => {
    setSelected(o);
    setViewOpen(true);
  };

  const changeStatus = async (orderId, next) => {
    if (!orderId || !next) return;
    try {
      setSaving(true);
      const updated = await ordersAPI.updateStatus(orderId, next);
      setOrders((prev) => prev.map((x) => (x._id === updated._id ? updated : x)));
      toast.success("Status yangilandi");
    } catch (e) {
      toast.error(e.message || "Statusni yangilab bo'lmadi");
    } finally {
      setSaving(false);
      setStatusMenuFor(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-white/80">Barcha buyurtmalarni boshqaring</div>
        <Button size="sm" variant="secondary" className="rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-900 dark:text-white" onClick={load}>Yangilash</Button>
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-visible shadow-sm dark:shadow-none">
        <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-gray-900 dark:text-white bg-gray-100 dark:bg-white/15 border-b border-gray-200 dark:border-white/10">
          <div className="col-span-3">Buyurtma</div>
          <div className="col-span-2">Mijoz</div>
          <div className="col-span-2">Manzil</div>
          <div className="col-span-2">Telefon</div>
          <div className="col-span-2">Summa</div>
          <div className="col-span-1 text-right">Amallar</div>
        </div>
        {loading ? (
          <div className="p-4 text-gray-600 dark:text-white/70">Yuklanmoqda...</div>
        ) : orders.length === 0 ? (
          <div className="p-4 text-gray-600 dark:text-white/80">Buyurtmalar yo'q</div>
        ) : (
          orders.map((o) => (
            <div key={o._id} className="grid grid-cols-12 gap-2 px-3 py-3 border-t border-gray-200 dark:border-white/10 text-sm items-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <div className="col-span-3">
                <div className="font-medium text-gray-900 dark:text-white">#{o.orderNumber}</div>
                <div className="text-xs text-gray-500 dark:text-white/60">{new Date(o.createdAt).toLocaleDateString("uz-UZ")}</div>
              </div>
              <div className="col-span-2 text-gray-700 dark:text-white/80">{o.userId?.name || "Noma'lum"}</div>
              <div className="col-span-2">
                <div className="text-gray-700 dark:text-white/80">{o.deliveryAddress?.address || "-"}</div>
                <div className="text-xs text-gray-500 dark:text-white/70">{o.deliveryAddress?.city || ""}</div>
              </div>
              <div className="col-span-2 text-gray-700 dark:text-white/80">{o.deliveryAddress?.phone || o.userId?.phone || "-"}</div>
              <div className="col-span-2 flex items-center gap-2 relative">
                <span className="font-semibold text-gray-900 dark:text-white">{fmt(o.total)}</span>
                <button type="button" className="focus:outline-none" onClick={()=> setStatusMenuFor(statusMenuFor === o._id ? null : o._id)}>
                  {statusPill(o.status)}
                </button>
                {statusMenuFor === o._id && (
                  <div className="absolute z-50 top-full mt-2 right-0 min-w-[220px] rounded-lg border border-purple-500/30 dark:border-purple-500/30 bg-white dark:bg-[#0f1420] p-1 shadow-xl">
                    {o.status !== 'pending' && (
                      <button className="w-full text-left px-3 py-2 rounded-md hover:bg-yellow-50 dark:hover:bg-yellow-500/10 text-sm text-yellow-700 dark:text-yellow-200" onClick={()=> changeStatus(o._id, 'pending')}>kutilmoqda</button>
                    )}
                    {o.status !== 'shipping' && (
                      <button className="w-full text-left px-3 py-2 rounded-md hover:bg-purple-50 dark:hover:bg-purple-500/15 text-sm text-purple-700 dark:text-purple-200" onClick={()=> changeStatus(o._id, 'shipping')}>yetkazilmoqda</button>
                    )}
                    {o.status !== 'cancelled' && (
                      <button className="w-full text-left px-3 py-2 rounded-md hover:bg-red-50 dark:hover:bg-red-500/15 text-sm text-red-700 dark:text-red-300" onClick={()=> changeStatus(o._id, 'cancelled')}>bekor qilish</button>
                    )}
                  </div>
                )}
              </div>
              <div className="col-span-1 flex justify-end">
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-white" onClick={() => openView(o)}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M12 5c-7.633 0-11 7-11 7s3.367 7 11 7 11-7 11-7-3.367-7-11-7zm0 12a5 5 0 110-10 5 5 0 010 10z"/></svg>
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="bg-white dark:bg-[#0f1722] text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Buyurtma #{selected?.orderNumber}</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3">
                  <div className="font-semibold mb-2 text-gray-900 dark:text-white">Mijoz ma'lumotlari</div>
                  <div className="text-sm text-gray-700 dark:text-white">Ism: {selected.userId?.name || "-"}</div>
                  <div className="text-sm text-gray-700 dark:text-white">Telefon: {selected.userId?.phone || selected.deliveryAddress?.phone || "-"}</div>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3">
                  <div className="font-semibold mb-2 text-gray-900 dark:text-white">Yetkazib berish manzili</div>
                  <div className="text-sm text-gray-700 dark:text-white">Manzil: {selected.deliveryAddress?.address || "-"}</div>
                  <div className="text-sm text-gray-700 dark:text-white">Telefon: {selected.deliveryAddress?.phone || "-"}</div>
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">Buyurtma ma'lumotlari</div>
                    <div className="text-xs text-gray-500 dark:text-white/60">{new Date(selected.createdAt).toLocaleString("uz-UZ")}</div>
                  </div>
                  <div className="flex items-center gap-2">{statusPill(selected.status)}</div>
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
                {selected.items?.map((it) => (
                  <div key={it.productId} className="flex items-center justify-between gap-3 p-3 border-t border-gray-200 dark:border-white/10 first:border-t-0">
                    <div className="flex items-center gap-3">
                      {it.image ? <img src={it.image} className="h-12 w-12 rounded-md object-cover border border-gray-200 dark:border-white/10" /> : <div className="h-12 w-12 rounded-md bg-gray-100 dark:bg-white/10" />}
                      <div>
                        <div className="font-medium text-sm text-gray-900 dark:text-white">{it.name}</div>
                        <div className="text-xs text-gray-500 dark:text-white/60">{it.quantity} x {fmt(it.price, it.currency)}</div>
                      </div>
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white">{fmt(it.price * it.quantity, it.currency)}</div>
                  </div>
                ))}
                <div className="flex items-center justify-end gap-3 p-3 text-lg font-bold text-red-600 dark:text-red-400">
                  Jami summa: {fmt(selected.total)}
                </div>
              </div>
          </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" className="text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10" onClick={()=>setViewOpen(false)}>Yopish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateHelperButton({ onCreated, onOpen }) {
  const [loading, setLoading] = useState(false);
  const create = async () => {
    try {
      setLoading(true);
      // Demo helper with no permissions by default
      const name = prompt("Yordamchi ismi:");
      if (!name) return;
      const phone = prompt("Telefon (9 raqam):");
      const address = prompt("Manzil:");
      const password = prompt("Parol (min 6):");
      const helper = await managerAPI.createHelper({ name, phone, address, password, permissions: { products: false, orders: false, helpers: false } });
      toast.success("Yordamchi yaratildi");
      onCreated?.(helper);
    } catch (e) {
      toast.error(e.message || "Xatolik");
    } finally { setLoading(false); }
  };
  const handleClick = () => {
    if (onOpen) { onOpen(); return; }
    create();
  };
  return (
    <Button size="sm" disabled={loading} onClick={handleClick} className="rounded-lg inline-flex items-center gap-2">
      <Plus className="h-4 w-4" /> Yordamchi qo'shish
    </Button>
  );
}

function HelpersList({ helpers, onUpdated }) {
  const [removingId, setRemovingId] = useState(null);
  
  const toggle = async (id, key, value) => {
    if (!id) {
      toast.error("Yordamchi ID topilmadi");
      return;
    }
    
    try {
      // Находим текущего помощника в списке
      const helper = helpers.find(h => h.id === id || h._id === id);
      if (!helper) {
        toast.error("Yordamchi topilmadi");
        return;
      }
      
      // Используем правильный id
      const helperId = helper.id || helper._id;
      if (!helperId) {
        toast.error("Yordamchi ID noto'g'ri");
        return;
      }
      
      // Получаем текущие разрешения и обновляем нужное поле
      const currentPermissions = helper.helperPermissions || { products: false, orders: false, helpers: false };
      const updatedPermissions = {
        ...currentPermissions,
        [key]: value
      };
      
      const updated = await managerAPI.updateHelperPermissions(helperId, updatedPermissions);
      onUpdated?.(updated);
    } catch (e) { toast.error(e.message || "Xatolik"); }
  };

  const handleRemove = async (id) => {
    if (!id) {
      toast.error("Yordamchi ID topilmadi");
      return;
    }
    
    if (!confirm("Yordamchini ro'yxatdan olib tashlashni tasdiqlaysizmi? (Akkaunt o'chirilmaydi)")) {
      return;
    }
    
    try {
      // Находим помощника для получения правильного id
      const helper = helpers.find(h => h.id === id || h._id === id);
      if (!helper) {
        toast.error("Yordamchi topilmadi");
        return;
      }
      
      const helperId = helper.id || helper._id;
      if (!helperId) {
        toast.error("Yordamchi ID noto'g'ri");
        return;
      }
      
      setRemovingId(helperId);
      await managerAPI.removeHelper(helperId);
      toast.success("Yordamchi ro'yxatdan olib tashlandi");
      // Удаляем из списка локально
      onUpdated?.({ id: helperId, removed: true });
    } catch (e) {
      toast.error(e.message || "Xatolik");
    } finally {
      setRemovingId(null);
    }
  };

  if (!helpers?.length) return <div className="text-gray-600 dark:text-white/80">Hozircha yordamchilar yo'q</div>;
  
  const permissionLabels = {
    products: "Mahsulotlar",
    orders: "Buyurtmalar",
    helpers: "Yordamchilar"
  };

  const permissionIcons = {
    products: Store,
    orders: Package,
    helpers: Users
  };

  return (
    <div className="space-y-2">
      {helpers.map((h) => {
        const helperId = h.id || h._id || `helper-${h.phone || Math.random()}`;
        return (
        <div key={helperId} className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 flex items-center justify-between shadow-sm dark:shadow-none hover:shadow-md transition-shadow">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-gray-900 dark:text-white">{h.name} <span className="text-xs text-gray-500 dark:text-white/70">+998{h.phone}</span></div>
            {h.address && (
              <div className="text-xs text-gray-500 dark:text-white/70 truncate">{h.address}</div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {(["products","orders","helpers"]).map((k) => {
                const Icon = permissionIcons[k];
                return (
                  <label key={k} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={!!h.helperPermissions?.[k]} 
                      onChange={(e)=> toggle(helperId, k, e.target.checked)} 
                      className="w-4 h-4 rounded border-gray-300 dark:border-white/30 text-red-600 focus:ring-red-500 focus:ring-2" 
                    />
                    {Icon && <Icon className="h-3.5 w-3.5 text-gray-600 dark:text-white/70" />}
                    <span className="text-xs text-gray-700 dark:text-white capitalize">{permissionLabels[k]}</span>
                  </label>
                );
              })}
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300"
              onClick={() => handleRemove(helperId)}
              disabled={removingId === helperId}
              title="Ro'yxatdan olib tashlash"
            >
              {removingId === helperId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        );
      })}
    </div>
  );
}
