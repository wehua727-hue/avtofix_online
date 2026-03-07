import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Star, CheckCircle2, ChevronRight, ShoppingCart, CreditCard, Truck, Minus, Plus, Heart, Store, X } from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useFavorites } from "@/context/FavoritesContext";
import { productsAPI, categoriesAPI } from "../services/api";
import {
  playStarButtonAnimation,
  playNavbarFavoriteAddAnimation,
  playNavbarFavoriteRemoveAnimation,
} from "@/utils/favoriteAnimations";
import { getNavbarFavoriteElements } from "@/utils/favoriteAnimationRegistry";
import { useCart } from "@/context/CartContext";
import QuantityCounterCompact from "@/components/QuantityCounterCompact";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ProductComments from "@/components/ProductComments";

const ProductDetail = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const variantFromUrl = searchParams.get('variant');
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toggleFavorite, isFavorite } = useFavorites();
  const { incrementItem, getItemQuantity, decrementItem } = useCart();
  const navigate = useNavigate();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [categoryPath, setCategoryPath] = useState("");
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        // Har doim serverdan yangi ma'lumotlarni olib kelamiz (cache'ni bypass qilamiz)
        const productData = await productsAPI.getById(id);
        setProduct(productData);
        
        // Bosh sahifadagi cache'ni tozalash (agar bu mahsulot o'zgargan bo'lsa)
        sessionStorage.removeItem('home_products');
        sessionStorage.removeItem('home_professionals');
        sessionStorage.removeItem('home_cache_time');
        
        // Kategoriya ma'lumotlarini yuklash
        if (productData?.categoryId) {
          setCategoryLoading(true);
          try {
            const categoryData = await categoriesAPI.getById(productData.categoryId);
            if (categoryData?.path) {
              setCategoryPath(categoryData.path);
            } else {
              setCategoryPath(productData.category || "Barcha kategoriyalar");
            }
          } catch (catErr) {
            // Kategoriya xatosi bo'lsa, faqat product kategoriyasini ko'rsatish
            // 404 xatosi normal - kategoriya topilmasa, product kategoriyasini ishlatamiz
            console.warn("Category not found, using product category:", catErr);
            setCategoryPath(productData.category || "Barcha kategoriyalar");
          } finally {
            setCategoryLoading(false);
          }
        } else {
          setCategoryPath(productData?.category || "Barcha kategoriyalar");
        }

        // Похожие товары загружаем
        if (productData?.categoryId) {
          setSimilarLoading(true);
          try {
            const productsRes = await productsAPI.getAll({ limit: 50 });
            const allProducts = productsRes.products || productsRes;
            const similar = allProducts
              .filter((p) => {
                const pId = p._id || p.id;
                const currentId = productData._id || productData.id;
                return pId !== currentId && 
                       (p.categoryId?.toString() === productData.categoryId?.toString() || 
                        p.category === productData.category);
              })
              .slice(0, 6);
            setSimilarProducts(similar);
          } catch (err) {
            console.warn("Failed to load similar products:", err);
          } finally {
            setSimilarLoading(false);
          }
        }
      } catch (err) {
        console.error("Error fetching product:", err);
        setError("Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
      
      // Har 15 sekundda mahsulot ma'lumotlarini yangilash (stok o'zgarishini kuzatish uchun)
      const pollInterval = setInterval(() => {
        fetchProduct();
      }, 15 * 1000); // 15 sekund
      
      return () => clearInterval(pollInterval);
    }
  }, [id]);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    
    // Если выбран вариант, используем его изображения
    if (selectedVariant && typeof selectedVariant === "object") {
      const variantImages = selectedVariant.images && Array.isArray(selectedVariant.images) && selectedVariant.images.length > 0
        ? selectedVariant.images
        : selectedVariant.imageUrl
          ? [selectedVariant.imageUrl]
          : [];
      
      if (variantImages.length > 0) {
        return variantImages.filter(Boolean);
      }
    }
    
    // Иначе используем изображения основного продукта
    const list = Array.isArray(product.images)
      ? product.images
      : product.imageUrl
      ? [product.imageUrl]
      : product.image
      ? [product.image]
      : [];
    return list.filter(Boolean);
  }, [product, selectedVariant]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [galleryImages.join(","), selectedVariant]);

  // Все хуки должны быть до ранних возвратов
  const productId = product?._id ?? product?.id;
  const favorite = productId ? isFavorite(productId) : false;
  
  // Для вариантов используем уникальный ID в корзине
  const cartItemId = useMemo(() => {
    if (!productId) return null;
    if (selectedVariant && typeof selectedVariant === 'object') {
      return `${productId}_variant_${selectedVariant.name}`;
    }
    return productId;
  }, [productId, selectedVariant]);
  
  const cartQuantity = cartItemId ? getItemQuantity(cartItemId) : 0;

  const priceNum = useMemo(() => {
    const rawPrice = String(product?.price || "0");
    return parseFloat(rawPrice.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
  }, [product?.price]);

  // Форматирование breadcrumbs
  const breadcrumbs = useMemo(() => {
    if (!categoryPath) return ["Bosh sahifa", "barcha kategoriyalar"];
    const parts = categoryPath.split(" > ");
    return ["Bosh sahifa", "barcha kategoriyalar", ...parts];
  }, [categoryPath]);

  // Получаем варианты продукта (виды) - ДО ранних возвратов
  const variants = useMemo(() => {
    if (!product) return [];
    let variantsList = [];
    
    // Сначала проверяем variantSummaries (более детальные данные)
    if (Array.isArray(product.variantSummaries) && product.variantSummaries.length > 0) {
      variantsList = product.variantSummaries;
    }
    // Затем проверяем variants
    else if (Array.isArray(product.variants)) {
      variantsList = product.variants;
    } else if (typeof product.variants === "string") {
      try {
        const parsed = JSON.parse(product.variants);
        if (Array.isArray(parsed)) {
          variantsList = parsed;
        }
      } catch {
        // Если не JSON, пробуем как простую строку
        if (product.variants.trim() !== "") {
          variantsList = [product.variants];
        }
      }
    }
    
    // Нормализуем варианты - поддерживаем и строки, и объекты
    const normalizedVariants = variantsList
      .filter((v) => {
        if (!v) return false;
        if (typeof v === "string") return v.trim() !== "";
        if (typeof v === "object") return v.name && v.name.trim() !== "";
        return false;
      })
      .map((v) => {
        if (typeof v === "string") {
          return {
            name: v.trim(),
            imageUrl: null,
            images: [],
          };
        }
        // Объект с полями name, imageUrl, images, imagePaths и т.д.
        const variantImages = Array.isArray(v.imagePaths) && v.imagePaths.length > 0
          ? v.imagePaths.filter(Boolean)
          : Array.isArray(v.images) && v.images.length > 0
            ? v.images.filter(Boolean) 
            : v.imageUrl 
              ? [v.imageUrl] 
              : [];
        
        // Получаем stock из разных полей
        const stockValue = v.stock !== undefined ? v.stock : v.stockCount;
        const stockNum = typeof stockValue === 'number' ? stockValue : (stockValue !== undefined ? Number(stockValue) : null);
        
        return {
          name: v.name?.trim() || "",
          sku: v.sku || null,
          price: v.price || null,
          basePrice: v.basePrice || null,
          currency: v.currency || null,
          originalPrice: v.originalPrice || v.originalBasePrice || null,
          imageUrl: variantImages[0] || null,
          images: variantImages,
          stockCount: stockNum,
          // inStock: v.inStock bo'lsa ishlatamiz, aks holda stockNum > 0 yoki true
          inStock: v.inStock !== undefined ? v.inStock : (v.status === "available" || (stockNum !== null ? stockNum > 0 : true)),
          views: v.views || null,
          code: v.code || null,
          catalogNumber: v.catalogNumber || null,
        };
      });
    
    // Если есть хотя бы один вариант, добавляем сам продукт в начало списка
    if (normalizedVariants.length > 0) {
      const productImages = Array.isArray(product.images) 
        ? product.images.filter(Boolean) 
        : product.imageUrl 
          ? [product.imageUrl] 
          : [];
      
      const mainProductVariant = {
        name: product.name || "Основной",
        price: product.price || null,
        currency: product.currency || null,
        originalPrice: product.originalPrice || null,
        imageUrl: product.imageUrl || productImages[0] || null,
        images: productImages,
        stockCount: typeof product.stockCount === 'number' ? product.stockCount : (product.stockCount !== undefined ? Number(product.stockCount) : null),
        inStock: product.inStock !== undefined ? product.inStock : (product.stockCount !== undefined && product.stockCount !== null ? Number(product.stockCount) > 0 : true),
        views: product.views || null,
        code: product.code || null,
        catalogNumber: product.catalogNumber || null,
        isMainProduct: true, // Флаг для идентификации основного продукта
      };
      
      return [mainProductVariant, ...normalizedVariants];
    }
    
    // Если вариантов нет, возвращаем пустой массив
    return [];
  }, [product]);
  
  // Определяем тип варианта (например, "Цвет", "Размер")
  const variantType = useMemo(() => {
    if (variants.length === 0) return null;
    // Можно определить по первому варианту или использовать общий тип
    // Для простоты используем "Variant" или можем анализировать название
    return "Variant";
  }, [variants]);

  // Автоматически выбираем вариант из URL
  useEffect(() => {
    if (variantFromUrl !== null && variants.length > 0) {
      const variantIndex = parseInt(variantFromUrl, 10);
      // +1 потому что первый элемент в variants - это основной продукт
      if (!isNaN(variantIndex) && variants[variantIndex + 1]) {
        setSelectedVariant(variants[variantIndex + 1]);
      }
    }
  }, [variantFromUrl, variants]);

  // Текущий отображаемый продукт (выбранный вариант или основной продукт)
  const currentProduct = useMemo(() => {
    if (!product) return null;
    
    // Если выбран вариант, используем его данные
    if (selectedVariant) {
      const variant = typeof selectedVariant === "object" ? selectedVariant : null;
      if (variant) {
        // Сначала берем все поля основного продукта, потом перезаписываем полями варианта
        return {
          ...product,
          name: variant.name ? String(variant.name).trim() || product.name : product.name,
          price: variant.price != null ? variant.price : product.price,
          originalPrice: variant.originalPrice != null ? variant.originalPrice : product.originalPrice,
          currency: variant.currency ? String(variant.currency).trim() || product.currency : product.currency,
          stockCount: variant.stockCount !== null && variant.stockCount !== undefined ? Number(variant.stockCount) : product.stockCount,
          // inStock: variant'da bo'lsa ishlatamiz, aks holda variant.stockCount yoki product.inStock'dan olamiz
          // Agar inStock undefined bo'lsa, true deb qabul qilamiz (default)
          inStock: variant.inStock !== undefined ? variant.inStock : (variant.stockCount !== null && variant.stockCount !== undefined ? Number(variant.stockCount) > 0 : (product.inStock !== undefined ? product.inStock : true)),
          views: variant.views ? String(variant.views).trim() || product.views : product.views,
          imageUrl: variant.imageUrl ? String(variant.imageUrl).trim() || product.imageUrl : product.imageUrl,
          images: variant.images && Array.isArray(variant.images) && variant.images.length > 0 ? variant.images : product.images,
          // Variant'ning o'z code va catalogNumber'ini ko'rsatish
          code: variant.code ? String(variant.code).trim() : null,
          catalogNumber: variant.catalogNumber ? String(variant.catalogNumber).trim() : null,
        };
      }
    }
    
    // Иначе используем основной продукт
    return product;
  }, [product, selectedVariant]);

  // Получаем количество на складе из текущего продукта (варианта или основного)
  const stockQuantity = useMemo(() => {
    if (!currentProduct) return null;

    // 1) Если выбран вариант и у него есть stockCount — используем напрямую
    if (selectedVariant && typeof selectedVariant === "object" && selectedVariant.stockCount !== undefined && selectedVariant.stockCount !== null) {
      const value = Number(selectedVariant.stockCount);
      if (Number.isFinite(value) && value >= 0) return value;
    }
    
    // Agar variant tanlangan bo'lsa, lekin stockCount bo'lmasa, parent mahsulotning stockCount'ini olish
    if (selectedVariant && currentProduct.stockCount !== undefined && currentProduct.stockCount !== null) {
      const value = Number(currentProduct.stockCount);
      if (Number.isFinite(value) && value >= 0) return value;
    }

    // 2) Попробовать найти stockCount по variantSummaries/variants по имени/sku
    const normalize = (v) => (v ?? "").toString().trim().toLowerCase();
    const selName = selectedVariant?.name ? normalize(selectedVariant.name) : null;
    const selSku = selectedVariant?.sku ? normalize(selectedVariant.sku) : null;

    const tryFindStock = (list) => {
      if (!Array.isArray(list)) return null;
      const exact = list.find((v) => {
        const vName = v?.name ? normalize(v.name) : null;
        const vSku = v?.sku ? normalize(v.sku) : null;
        return (selName && vName === selName) || (selSku && vSku === selSku);
      });
      const fallback = !exact && selName ? list.find((v) => (v?.name ? normalize(v.name).includes(selName) : false)) : null;
      const target = exact || fallback;
      if (target && target.stockCount !== undefined && target.stockCount !== null) {
        const val = Number(target.stockCount);
        if (Number.isFinite(val)) return val;
      }
      return null;
    };

    if (selectedVariant) {
      const foundFromSummaries = tryFindStock(product?.variantSummaries);
      if (foundFromSummaries !== null) return foundFromSummaries;
      const foundFromVariants = tryFindStock(product?.variants);
      if (foundFromVariants !== null) return foundFromVariants;
    }

    // 3) Сначала проверяем stockCount напрямую у currentProduct
    if (currentProduct.stockCount !== null && currentProduct.stockCount !== undefined) {
      const value = Number(currentProduct.stockCount);
      if (!Number.isNaN(value) && Number.isFinite(value)) {
        return value;
      }
    }
    
    // 4) Если stockCount нет, ищем в других полях
    const stockKeys = [
      "stock",
      "stock_quantity",
      "stockQuantity",
      "availableQuantity",
      "availableUnits",
      "available",
      "quantity",
      "qty",
      "count",
      "remaining",
      "leftInStock",
    ];

    for (const key of stockKeys) {
      if (key in currentProduct && currentProduct[key] !== null && currentProduct[key] !== undefined) {
        const rawValue = currentProduct[key];
        let numericValue = null;

        if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
          numericValue = rawValue;
        } else if (typeof rawValue === "string") {
          const parsed = Number.parseInt(rawValue.replace(/[^\d-]/g, ""), 10);
          if (!Number.isNaN(parsed)) {
            numericValue = parsed;
          }
        }

        if (numericValue !== null && Number.isFinite(numericValue)) {
          return numericValue;
        }
      }
    }
    
    return null;
  }, [currentProduct]);

  const availabilityText = useMemo(() => {
    if (!currentProduct) return "Mahsulot omborda mavjud";
    
    // Debug log
    console.log('🔍 Availability Debug:', {
      currentProduct: currentProduct.name,
      stockQuantity,
      inStock: currentProduct.inStock,
      stockCount: currentProduct.stockCount,
      selectedVariant: selectedVariant?.name,
    });
    
    // Agar stockQuantity aniqlangan bo'lsa
    if (stockQuantity !== null && stockQuantity !== undefined) {
      if (stockQuantity <= 0) {
        return "Omborda qolmagan";
      }
      return `Omborda ${stockQuantity} ta mavjud`;
    }
    
    // Agar inStock flag mavjud bo'lsa
    if (currentProduct.inStock === false) {
      return "Omborda qolmagan";
    }

    // Default: Agar hech qanday ma'lumot bo'lmasa, lekin product.inStock true bo'lsa (default)
    return "Mahsulot omborda mavjud";
  }, [currentProduct, stockQuantity]);

  const handleSimilarProductFavoriteToggle = useCallback(
    async (event, similarProduct) => {
      event.preventDefault();
      event.stopPropagation();

      const button = event?.currentTarget ?? null;
      const startRect = button?.getBoundingClientRect();

      const result = await toggleFavorite(similarProduct);

      if (result?.requiresAuth) {
        navigate("/login");
        return;
      }

      if (result?.error) {
        console.error(result.error);
        return;
      }

      const action = result?.isFavorite ? "add" : "remove";
      if (button) {
        playStarButtonAnimation(button, action);
      }

      const { iconElement, counterElement } = getNavbarFavoriteElements();

      if (result?.isFavorite) {
        const targetRect = iconElement?.getBoundingClientRect();
        playNavbarFavoriteAddAnimation({
          startRect,
          targetRect,
          iconElement,
          counterElement,
        });
      } else {
        playNavbarFavoriteRemoveAnimation({ counterElement });
      }
    },
    [navigate, toggleFavorite],
  );

  const prevImage = () => {
    setActiveImageIndex((i) => (galleryImages.length ? (i - 1 + galleryImages.length) % galleryImages.length : 0));
  };

  const nextImage = () => {
    setActiveImageIndex((i) => (galleryImages.length ? (i + 1) % galleryImages.length : 0));
  };

  // Swipe handlers для мобильных
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe && galleryImages.length > 1) {
      nextImage();
    }
    if (isRightSwipe && galleryImages.length > 1) {
      prevImage();
    }
  };

  const openImageModal = (index) => {
    setModalImageIndex(index);
    setImageModalOpen(true);
  };

  const prevModalImage = () => {
    setModalImageIndex((prev) => (galleryImages.length ? (prev - 1 + galleryImages.length) % galleryImages.length : 0));
  };

  const nextModalImage = () => {
    setModalImageIndex((prev) => (galleryImages.length ? (prev + 1) % galleryImages.length : 0));
  };

  // Ранние возвраты ПОСЛЕ всех хуков
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-900 dark:text-white text-xl">Yuklanmoqda...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-red-500 dark:text-red-400 text-xl">
          Xatolik: {error || "Mahsulot topilmadi"}
        </div>
      </div>
    );
  }

  const specificationEntries = product.specifications
    ? Object.entries(product.specifications).filter(
        ([_, value]) =>
          value !== undefined && value !== null && `${value}`.trim() !== "",
      )
    : [];

  const generalDetails = [
    { label: "Kategoriya", value: product.category },
    { label: "Holati", value: availabilityText },
  ].filter((item) => item.value && `${item.value}`.trim() !== "");

  if (product.createdAt) {
    generalDetails.push({
      label: "Qo'shilgan sana",
      value: new Date(product.createdAt).toLocaleDateString("uz-UZ"),
    });
  }

  const handleToggleFavorite = async (event) => {
    if (!product) return;
    const button = event?.currentTarget ?? null;
    const startRect = button?.getBoundingClientRect();

    const result = await toggleFavorite(product);

    if (result?.requiresAuth) {
      navigate("/login");
      return;
    }

    if (result?.error) {
      console.error(result.error);
      return;
    }

    const action = result?.isFavorite ? "add" : "remove";
    if (button) {
      playStarButtonAnimation(button, action);
    }

    const { iconElement, counterElement } = getNavbarFavoriteElements();

    if (result?.isFavorite) {
      const targetRect = iconElement?.getBoundingClientRect();
      playNavbarFavoriteAddAnimation({
        startRect,
        targetRect,
        iconElement,
        counterElement,
      });
    } else {
      playNavbarFavoriteRemoveAnimation({ counterElement });
    }
  };

  const handleAddToCart = async () => {
    if (!product || !currentProduct) return;
    
    // Omborda yo'q bo'lsa qo'shish mumkin emas
    if (stockQuantity !== null && stockQuantity <= 0) {
      return;
    }
    
    // Передаём информацию о выбранном варианте
    const productToAdd = {
      ...currentProduct,
      selectedVariant: selectedVariant,
    };
    const result = await incrementItem(productToAdd);
    if (result?.requiresAuth) {
      navigate("/login");
    }
  };

  const handleIncrement = async () => {
    if (!product || !currentProduct) return;
    
    // Ombordagi miqdordan ko'p bo'lmasin
    if (stockQuantity !== null && cartQuantity >= stockQuantity) {
      return;
    }
    
    const productToAdd = {
      ...currentProduct,
      selectedVariant: selectedVariant,
    };
    const result = await incrementItem(productToAdd);
    if (result?.requiresAuth) {
      navigate("/login");
    }
  };

  const handleDecrement = async () => {
    if (!cartItemId) return;
    await decrementItem(cartItemId);
  };

  const handleGoToCart = () => {
    navigate("/cart");
  };

  const handleBuyNow = async () => {
    if (!product || !currentProduct) return;
    
    // Передаём информацию о выбранном варианте
    const productToAdd = {
      ...currentProduct,
      selectedVariant: selectedVariant,
    };
    const result = await incrementItem(productToAdd);
    if (result?.requiresAuth) {
      navigate("/login");
      return;
    }
    if (result?.success) {
      navigate("/cart");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Breadcrumbs - скрыты на мобильных */}
      <div className="hidden md:block bg-white/80 dark:bg-black/40 border-b border-gray-200 dark:border-white/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            {breadcrumbs.map((crumb, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {idx > 0 && <span className="text-gray-400 dark:text-gray-500">/</span>}
                {idx === breadcrumbs.length - 1 ? (
                  <span className="text-gray-900 dark:text-white font-medium">{crumb}</span>
                ) : (
                  <Link
                    to={idx === 0 ? "/" : "/categories"}
                    className="hover:text-red-500 dark:hover:text-red-400 transition-colors text-gray-600 dark:text-gray-300"
                  >
                    {crumb}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-0 md:px-4 sm:px-6 lg:px-8 py-0 md:py-6">
        {/* Product Title, Rating - Above images - скрыты на мобильных */}
        <div className="mb-4 hidden md:block">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white leading-tight mb-2">
                {currentProduct?.name || product.name}
              </h1>
              <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                <span>{galleryImages.length} ta rasm</span>
                <span>•</span>
                <span>{currentProduct?.views || product.views || "5000+ buyurtma"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_360px] gap-0 md:gap-5">
          {/* Left column: Images Gallery */}
          <div className="flex gap-0 md:gap-3">
            {/* Thumbnails on left - всегда показываем минимум 2 места */}
            <div className="hidden lg:flex flex-col gap-2 flex-shrink-0">
              {/* Показываем существующие изображения */}
              {galleryImages.map((src, idx) => (
                <button
                  type="button"
                  key={src + idx}
                  onClick={() => setActiveImageIndex(idx)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      idx === activeImageIndex
                        ? "border-red-500 ring-2 ring-red-500/30"
                        : "border-white/20 hover:border-white/40 bg-gray-800/30"
                    }`}
                  aria-label={`Rasm ${idx + 1}`}
                >
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}

            </div>

            {/* Main images - два изображения рядом если больше 1 фото */}
            <div className={`flex-1 grid grid-cols-1 ${galleryImages.length >= 2 ? 'md:grid-cols-2' : ''} gap-3`}>
              {/* Первое изображение */}
              <div className="relative aspect-[3/4] overflow-hidden">
                <div 
                  className="bg-gray-100 dark:bg-gray-800/50 rounded-none md:rounded-xl border-0 md:border border-gray-200 dark:border-white/10 overflow-hidden relative group backdrop-blur-sm w-full h-full cursor-pointer" 
                  onClick={() => openImageModal(activeImageIndex)}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  {/* Mobile Navigation Buttons - всегда показываем на мобильных */}
                  <div className="lg:hidden absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-20">
                    {/* Back button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(-1);
                      }}
                      className="w-10 h-10 bg-black/70 hover:bg-black/90 border border-white/20 rounded-full flex items-center justify-center transition-opacity shadow-lg backdrop-blur-sm"
                      aria-label="Orqaga"
                    >
                      <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    {/* Favorite button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite();
                      }}
                      aria-pressed={favorite}
                      className={`w-10 h-10 rounded-full flex items-center justify-center border backdrop-blur-sm transition-all duration-300 shadow-lg ${
                        favorite
                          ? "border-yellow-300/60 bg-yellow-400/10 text-yellow-300"
                          : "border-white/20 bg-black/70 hover:bg-black/90 text-white"
                      }`}
                    >
                      <Star
                        className="w-5 h-5"
                        fill={favorite ? "currentColor" : "none"}
                      />
                    </button>
                  </div>

                  {galleryImages.length > 0 ? (
                    <>
                      <div className="relative w-full h-full">
                        {galleryImages.map((src, idx) => (
                          <img
                            key={src + idx}
                            src={src}
                            alt={currentProduct?.name || product.name}
                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                              idx === activeImageIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                            }`}
                            loading={idx === activeImageIndex ? "eager" : "lazy"}
                          />
                        ))}
                      </div>
                      {/* Left arrow - только на десктопе */}
                      {galleryImages.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            prevImage();
                          }}
                          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/70 hover:bg-black/90 border border-white/20 rounded-full items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg backdrop-blur-sm z-10"
                          aria-label="Oldingi rasm"
                        >
                          <ArrowLeft className="w-5 h-5 text-white" />
                        </button>
                      )}
                      {/* Mobile thumbnails - индикаторы изображений */}
                      {galleryImages.length > 1 && (
                        <div className="lg:hidden flex gap-2 absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                          {galleryImages.map((src, idx) => (
                            <div
                              key={src + idx}
                              className={`rounded-full transition-all duration-300 ${
                                idx === activeImageIndex
                                  ? "w-8 h-1.5 bg-white shadow-lg"
                                  : "w-1.5 h-1.5 bg-white/40"
                              }`}
                              aria-label={`Rasm ${idx + 1}`}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-800/30">
                      Rasm mavjud emas
                    </div>
                  )}
                </div>
              </div>

              {/* Второе изображение - только если есть 2+ фото */}
              {galleryImages.length >= 2 && (
                <div className="relative aspect-[3/4] hidden md:block">
                  <div className="bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden relative group backdrop-blur-sm w-full h-full cursor-pointer" onClick={() => openImageModal((activeImageIndex + 1) % galleryImages.length)}>
                    <img
                      src={galleryImages[(activeImageIndex + 1) % galleryImages.length]}
                      alt={currentProduct?.name || product.name}
                      className="w-full h-full object-cover"
                      loading="eager"
                    />
                    {/* Right arrow */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        nextImage();
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/70 hover:bg-black/90 border border-white/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg backdrop-blur-sm z-10"
                      aria-label="Keyingi rasm"
                    >
                      <ArrowRight className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Product Info - показываем на мобильных после изображения */}
          <div className="lg:hidden px-4 pt-4 pb-20 space-y-4">
            {/* Product Title */}
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight mb-2">
                {currentProduct?.name || product.name}
              </h1>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{galleryImages.length} ta rasm</span>
                <span>•</span>
                <span>{currentProduct?.views || product.views || "5000+ buyurtma"}</span>
              </div>
            </div>

            {/* Variants - только если есть */}
            {variants.length > 0 && (
              <div>
                <div className="mb-3">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                    {selectedVariant 
                      ? `${variantType || "Variant"}: ${typeof selectedVariant === "object" ? selectedVariant.name : selectedVariant}`
                      : `${variantType || "Variant"}: Tanlang`}
                  </h3>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {variants.map((variant, idx) => {
                    const variantName = variant.name;
                    const variantImage = variant.imageUrl || (variant.images && variant.images[0]) || galleryImages[0] || null;
                    const isSelected = selectedVariant && 
                      (typeof selectedVariant === "object" 
                        ? selectedVariant.name === variant.name 
                        : selectedVariant === variant.name);
                    const variantStockCount = variant.stockCount !== null && variant.stockCount !== undefined 
                      ? Number(variant.stockCount) 
                      : null;
                    const isInStock = variant.inStock !== undefined 
                      ? variant.inStock 
                      : (variantStockCount !== null ? variantStockCount > 0 : true);
                    const hasStock = variantStockCount !== null ? variantStockCount > 0 : isInStock;
                    const isOutOfStock = !hasStock;
                    
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedVariant(isSelected ? null : variant)}
                        className={`relative cursor-pointer flex items-center justify-center overflow-hidden rounded-lg border transition-all flex-shrink-0 ${
                          isOutOfStock 
                            ? 'border-gray-300 dark:border-white/20 opacity-50 bg-gray-100 dark:bg-gray-800/30' 
                            : isSelected 
                              ? 'border-red-500 border-2 ring-2 ring-red-500/30' 
                              : 'border-gray-300 dark:border-white/20 hover:border-gray-400 dark:hover:border-white/40 bg-gray-100 dark:bg-gray-800/30'
                        }`}
                        style={{
                          width: '63px',
                          height: '84px',
                          minWidth: '63px',
                        }}
                      >
                        {variantImage ? (
                          <div className="relative w-full h-full rounded-lg overflow-hidden">
                            <img
                              src={variantImage}
                              alt={variantName}
                              className="w-full h-full object-cover rounded-lg"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gray-200 dark:bg-gray-800/50 rounded-lg flex items-center justify-center">
                            <div className="text-gray-500 dark:text-gray-400 text-xs">No img</div>
                          </div>
                        )}
                        {isOutOfStock && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                            <div className="w-full h-0.5 bg-gray-400 dark:bg-gray-600 transform rotate-45 origin-center shadow-sm" style={{ width: '120%' }} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stock Status - улучшенный дизайн для мобильных */}
            {stockQuantity !== null && stockQuantity > 0 && (
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 dark:from-green-500/20 dark:via-emerald-500/15 dark:to-green-500/20 border border-green-300 dark:border-green-500/40 rounded-xl backdrop-blur-sm shadow-sm dark:shadow-[0_0_15px_-5px_rgba(16,185,129,0.3)]">
                <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                </div>
                <div className="flex-1">
                  <div className="text-green-700 dark:text-green-300 font-semibold text-sm mb-0.5">
                    {availabilityText}
                  </div>
                  <div className="text-green-600/70 dark:text-green-400/70 text-xs">
                    Tezkor yetkazib berish
                  </div>
                </div>
              </div>
            )}

            {/* Stock Status - показываем если товар закончился */}
            {stockQuantity !== null && stockQuantity === 0 && (
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-500/10 dark:to-orange-500/10 border border-red-200 dark:border-red-500/30 rounded-xl">
                <div className="text-red-600 dark:text-red-400 font-semibold text-sm">
                  ⚠️ Mahsulot vaqtincha mavjud emas
                </div>
              </div>
            )}

            {/* Price - улучшенный дизайн */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-2 flex-wrap">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-red-500">
                    {currentProduct?.price || product.price}
                  </span>
                  <span className="text-base sm:text-lg font-semibold text-gray-600 dark:text-gray-300">{currentProduct?.currency || product.currency}</span>
                </div>
                {currentProduct?.originalPrice && (
                  <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                    <span className="text-sm sm:text-lg text-gray-500 line-through">
                      {currentProduct.originalPrice}
                    </span>
                    {currentProduct?.price && currentProduct?.originalPrice && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-bold rounded">
                        -{Math.round((1 - currentProduct.price / currentProduct.originalPrice) * 100)}%
                      </span>
                    )}
                  </div>
                )}
              </div>
              {currentProduct?.originalPrice && (
                <div className="text-xs text-gray-500">
                  Eski narx: {currentProduct.originalPrice} {currentProduct?.currency || product.currency}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Variants + Product Info Card - скрыта на мобильных */}
          <div className="hidden lg:flex flex-col gap-6">
            {/* Variants Section - Outside Card - показываем на мобильных, но в другом месте */}
            {variants.length > 0 && (
              <div className="hidden lg:block">
                {/* Variant Type Label */}
                <div className="mb-3 sm:mb-4">
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    {selectedVariant 
                      ? `${variantType || "Variant"}: ${typeof selectedVariant === "object" ? selectedVariant.name : selectedVariant}`
                      : `${variantType || "Variant"}: Tanlang`}
                  </h3>
                </div>
                
                {/* Variant Cards */}
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 md:flex-wrap md:overflow-x-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {variants.map((variant, idx) => {
                    // После нормализации все варианты - объекты с полем name
                    const variantName = variant.name;
                    const variantImage = variant.imageUrl || (variant.images && variant.images[0]) || galleryImages[0] || null;
                    
                    // Упрощенное сравнение: после нормализации все варианты - объекты
                    const isSelected = selectedVariant && 
                      (typeof selectedVariant === "object" 
                        ? selectedVariant.name === variant.name 
                        : selectedVariant === variant.name);
                    
                    // Определяем наличие на складе
                    const variantStockCount = variant.stockCount !== null && variant.stockCount !== undefined 
                      ? Number(variant.stockCount) 
                      : null;
                    const isInStock = variant.inStock !== undefined 
                      ? variant.inStock 
                      : (variantStockCount !== null ? variantStockCount > 0 : true);
                    const hasStock = variantStockCount !== null ? variantStockCount > 0 : isInStock;
                    
                    // Определяем состояние карточки
                    const isOutOfStock = !hasStock;
                    
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          // Нормализуем selectedVariant при сохранении
                          setSelectedVariant(isSelected ? null : variant);
                        }}
                        className={`relative cursor-pointer flex items-center justify-center overflow-hidden rounded-lg border transition-all ${
                          isOutOfStock 
                            ? 'border-white/20 opacity-50 bg-gray-800/30' 
                            : isSelected 
                              ? 'border-red-500 border-2 ring-2 ring-red-500/30' 
                              : 'border-white/20 hover:border-white/40 bg-gray-800/30'
                        }`}
                        style={{
                          width: '63px',
                          height: '84px',
                          minWidth: '63px',
                        }}
                      >
                        {/* Variant Image */}
                        {variantImage ? (
                          <div className="relative w-full h-full rounded-lg overflow-hidden">
                            <img
                              src={variantImage}
                              alt={variantName}
                              className="w-full h-full object-cover rounded-lg"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gray-200 dark:bg-gray-800/50 rounded-lg flex items-center justify-center">
                            <div className="text-gray-500 dark:text-gray-400 text-xs">No img</div>
                          </div>
                        )}
                        
                        {/* Diagonal line for out of stock variants */}
                        {isOutOfStock && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                            <div className="w-full h-0.5 bg-gray-400 dark:bg-gray-600 transform rotate-45 origin-center shadow-sm" style={{ width: '120%' }} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Product Info Section - Uzum Style */}
            <div className="flex flex-col border border-gray-200 dark:border-white/10 rounded-[20px] p-4 sm:p-6 h-max bg-white dark:bg-gradient-to-br dark:from-gray-900/80 dark:to-black/60 backdrop-blur-md shadow-xl">
            {/* Price Section - улучшенный дизайн */}
            <div className="mb-4 sm:mb-6">
              <div className="space-y-2">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-extrabold text-red-500">
                      {currentProduct?.price || product.price}
                    </span>
                    <span className="text-lg sm:text-xl font-semibold text-gray-600 dark:text-gray-300">{currentProduct?.currency || product.currency}</span>
                  </div>
                  {currentProduct?.originalPrice && (
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-lg text-gray-500 line-through">
                        {currentProduct.originalPrice}
                      </span>
                      {currentProduct?.price && currentProduct?.originalPrice && (
                        <span className="px-2.5 py-1 bg-red-500/20 text-red-500 dark:text-red-400 text-xs font-bold rounded-lg border border-red-500/30">
                          -{Math.round((1 - currentProduct.price / currentProduct.originalPrice) * 100)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {currentProduct?.originalPrice && (
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <span>Eski narx:</span>
                    <span className="line-through">{currentProduct.originalPrice} {currentProduct?.currency || product.currency}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 mb-4 sm:mb-6">
              <div className="flex gap-2 sm:gap-3">
                {cartQuantity > 0 ? (
                  <>
                    {/* Quantity Counter */}
                    <div className="flex-1 flex items-center gap-3 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-white/10 rounded-xl px-2 py-2 backdrop-blur-sm">
                      <button
                        type="button"
                        onClick={handleDecrement}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <span className="flex-1 text-center text-gray-900 dark:text-white font-semibold text-lg">
                        {cartQuantity}
                      </span>
                      <button
                        type="button"
                        onClick={handleIncrement}
                        disabled={stockQuantity !== null && cartQuantity >= stockQuantity}
                        className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                          stockQuantity !== null && cartQuantity >= stockQuantity
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10"
                        }`}
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-2.5 sm:py-4 px-3 sm:px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-red-900/30 hover:shadow-red-900/50 hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base"
                  >
                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                    Savatga
                  </button>
                )}
                {/* Star icon in same row as button */}
                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  aria-pressed={favorite}
                  className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border backdrop-blur-sm transition-all duration-300 ${
                    favorite
                      ? "border-yellow-300/60 bg-yellow-400/10 text-yellow-500 dark:text-yellow-300 shadow-[0_18px_30px_-18px_rgba(250,204,21,0.75)] hover:scale-110"
                      : "border-gray-200 dark:border-white/10 hover:border-red-400/60 bg-gray-100 dark:bg-gray-800/50 hover:bg-red-500/20 text-gray-400 hover:text-red-500 hover:scale-110"
                  }`}
                >
                  <Star
                    className={`w-6 h-6 transition-all ${
                      favorite
                        ? "fill-yellow-500 dark:fill-yellow-300 text-yellow-500 dark:text-yellow-300"
                        : "text-gray-400"
                    }`}
                    fill={favorite ? "currentColor" : "none"}
                  />
                </button>
              </div>
            </div>

            {/* Stock Status */}
            <div className="mb-6">
              {stockQuantity !== null && stockQuantity === 1 ? (
                <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/40 rounded-lg px-4 py-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <div className="text-red-900 font-semibold text-sm">
                      Oxirgisi qoldi!
                    </div>
                  </div>
                </div>
              ) : stockQuantity !== null && stockQuantity === 0 ? (
                <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800/60 dark:to-gray-900/60 border border-gray-300 dark:border-gray-600/30 rounded-lg px-4 py-3 backdrop-blur-sm">
                  <div className="text-gray-600 dark:text-gray-400 font-medium text-sm">
                    Mahsulot vaqtincha mavjud emas
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-500/20 dark:to-emerald-500/20 border border-green-300 dark:border-green-500/40 rounded-lg px-4 py-3 backdrop-blur-sm">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="text-green-700 dark:text-green-300 text-sm font-medium">
                    {availabilityText}
                  </div>
                </div>
              )}
            </div>

          </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar - только на мобильных */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 backdrop-blur-xl border-t border-gray-200 dark:border-white/20 z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.7)]">
        <div className="px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            {/* Price - скрывается когда товар в корзине */}
            {cartQuantity === 0 && (
              <div className="flex flex-col flex-1 min-w-0 pr-2">
                <div className="flex items-baseline gap-1 flex-wrap">
                  <span className="text-xl font-extrabold text-red-500 whitespace-nowrap">
                    {currentProduct?.price || product.price}
                  </span>
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{currentProduct?.currency || product.currency}</span>
                  {currentProduct?.originalPrice && (
                    <span className="text-xs text-gray-500 line-through ml-auto whitespace-nowrap">
                      {currentProduct.originalPrice}
                    </span>
                  )}
                </div>
                {currentProduct?.originalPrice && currentProduct?.price && currentProduct?.originalPrice && (
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded border border-red-500/30 whitespace-nowrap">
                      -{Math.round((1 - currentProduct.price / currentProduct.originalPrice) * 100)}%
                    </span>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap">Ertaga</span>
                  </div>
                )}
              </div>
            )}
            {/* Button */}
            {cartQuantity > 0 ? (
              <div className="flex items-center gap-2 w-full">
                {/* Quantity Counter */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-1 flex-1">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    className="w-4 h-4 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-gray-900 dark:text-white font-semibold text-base min-w-[24px] text-center flex-1">
                    {cartQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={stockQuantity !== null && cartQuantity >= stockQuantity}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                      stockQuantity !== null && cartQuantity >= stockQuantity
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10"
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {/* Go to Cart Button */}
                <button
                  type="button"
                  onClick={handleGoToCart}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-red-900/30 flex-1"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span className="text-sm whitespace-nowrap">O'tish</span>
                </button>
              </div>
            ) : stockQuantity !== null && stockQuantity === 0 ? (
              <button
                type="button"
                disabled
                className="w-[40%] bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-semibold py-3 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed flex-shrink-0"
              >
                <span className="text-xs whitespace-nowrap">Mavjud emas</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-[40%] bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-3 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all duration-300 shadow-lg shadow-red-900/30 flex-shrink-0"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span className="text-xs whitespace-nowrap">Savatga</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product Description and Specifications */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 lg:pb-16">
        <div className="bg-white dark:bg-gradient-to-br dark:from-gray-900/80 dark:to-black/60 border border-gray-200 dark:border-white/10 rounded-xl p-8 space-y-6 backdrop-blur-md shadow-xl">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Mahsulot tavsifi
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {product.description && product.description.trim() !== ""
                ? product.description
                : "Bu mahsulot haqida batafsil ma'lumot tez orada qo'shiladi. Hozircha asosiy xususiyatlar bilan tanishishingiz mumkin."}
            </p>
          </div>

          {/* Product Code and Catalog Number */}
          {(currentProduct.code || currentProduct.catalogNumber) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-white/10">
              {currentProduct.code && (
                <div className="flex flex-col bg-gray-50 dark:bg-gradient-to-br dark:from-gray-800/60 dark:to-gray-900/60 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-3 backdrop-blur-sm">
                  <dt className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Mahsulot kodi
                  </dt>
                  <dd className="text-base text-gray-900 dark:text-white font-medium font-mono">
                    {currentProduct.code}
                  </dd>
                </div>
              )}
              {currentProduct.catalogNumber && (
                <div className="flex flex-col bg-gray-50 dark:bg-gradient-to-br dark:from-gray-800/60 dark:to-gray-900/60 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-3 backdrop-blur-sm">
                  <dt className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Katalog raqami
                  </dt>
                  <dd className="text-base text-gray-900 dark:text-white font-medium font-mono">
                    {currentProduct.catalogNumber}
                  </dd>
                </div>
              )}
            </div>
          )}

          {specificationEntries.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Texnik xususiyatlar
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {specificationEntries.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex flex-col bg-gray-50 dark:bg-gradient-to-br dark:from-gray-800/60 dark:to-gray-900/60 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-3 backdrop-blur-sm hover:border-gray-300 dark:hover:border-white/20 transition-all duration-300 hover:shadow-lg"
                  >
                    <dt className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      {label}
                    </dt>
                    <dd className="text-base text-gray-900 dark:text-white font-medium">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* Similar Products Section */}
      {similarProducts.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            O'xshash mahsulotlar
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {similarProducts.map((similarProduct) => {
              const similarProductId = similarProduct._id || similarProduct.id;
              const similarImage = similarProduct.imageUrl || 
                (Array.isArray(similarProduct.images) && similarProduct.images.length > 0 
                  ? similarProduct.images[0] 
                  : similarProduct.image) || 
                "/placeholder.jpg";

              return (
                <Link
                  key={similarProductId}
                  to={`/product/${similarProductId}`}
                  className="group relative flex flex-col overflow-hidden rounded-[20px] transition-all duration-400 hover:-translate-y-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 shadow-lg hover:shadow-xl"
                >
                  <div className="relative overflow-hidden rounded-[20px] aspect-[4/3]">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-black/0 opacity-60 transition-opacity duration-500 group-hover:opacity-80" />
                    <button
                      type="button"
                      onClick={(event) =>
                        handleSimilarProductFavoriteToggle(event, similarProduct)
                      }
                      aria-pressed={isFavorite(similarProductId)}
                      className={`absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl border backdrop-blur transition-all duration-300 ${
                        isFavorite(similarProductId)
                          ? "border-yellow-500 bg-yellow-400/20 text-yellow-500 dark:border-yellow-300/60 dark:bg-yellow-400/10 dark:text-yellow-300 shadow-[0_18px_30px_-18px_rgba(250,204,21,0.75)]"
                          : "border-gray-300 bg-white/80 text-gray-600 hover:border-red-400 hover:bg-red-50 hover:text-red-500 dark:border-white/20 dark:bg-black/30 dark:text-white/80 dark:hover:border-red-400/60 dark:hover:bg-red-500/20 dark:hover:text-white"
                      }`}
                    >
                      <Star
                        className="h-4 w-4"
                        fill={
                          isFavorite(similarProductId)
                            ? "currentColor"
                            : "none"
                        }
                      />
                    </button>
                    <img
                      src={similarImage}
                      alt={similarProduct.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-2 px-3 py-3">
                    <div className="space-y-1.5">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-2">
                        {similarProduct.name}
                      </h3>
                      <p className="text-lg font-semibold text-rose-500 dark:text-rose-400">
                        {similarProduct.price} {similarProduct.currency || "so'm"}
                      </p>
                      {/* Magazin ma'lumoti */}
                      {similarProduct.store && typeof similarProduct.store === 'object' && (
                        <div className="flex items-center gap-1 text-xs pt-0.5">
                          <Store className="h-3 w-3 text-blue-500 dark:text-blue-400/80 flex-shrink-0" />
                          <span className="text-blue-500 dark:text-blue-400/90 font-medium truncate">
                            <span className="text-blue-600 dark:text-blue-300">{similarProduct.store.name}</span>
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-auto">
                      <QuantityCounterCompact product={similarProduct} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Image Modal */}
      {imageModalOpen && galleryImages && galleryImages.length > 0 && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => setImageModalOpen(false)}
        >
          <div 
            className="relative w-[95vw] h-[95vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={galleryImages[modalImageIndex]}
              alt={currentProduct?.name || product?.name || "Mahsulot"}
              className="max-w-full max-h-full object-contain"
            />
            {/* Close button */}
            <button
              type="button"
              onClick={() => setImageModalOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-black/70 hover:bg-black/90 border border-white/20 rounded-full flex items-center justify-center transition-opacity shadow-lg backdrop-blur-sm z-20"
              aria-label="Yopish"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            {/* Navigation arrows - по краям всего модального окна */}
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    prevModalImage();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/70 hover:bg-black/90 border border-white/20 rounded-full flex items-center justify-center transition-opacity shadow-lg backdrop-blur-sm z-20"
                  aria-label="Oldingi rasm"
                >
                  <ArrowLeft className="w-6 h-6 text-white" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextModalImage();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/70 hover:bg-black/90 border border-white/20 rounded-full flex items-center justify-center transition-opacity shadow-lg backdrop-blur-sm z-20"
                  aria-label="Keyingi rasm"
                >
                  <ArrowRight className="w-6 h-6 text-white" />
                </button>
              </>
            )}
            {/* Image counter */}
            {galleryImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 px-4 py-2 rounded-full border border-white/20 backdrop-blur-sm text-white text-sm z-20">
                {modalImageIndex + 1} / {galleryImages.length}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Comments Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <ProductComments productId={productId} productName={currentProduct?.name || product.name} />
      </div>
    </div>
  );
};

export default ProductDetail;
