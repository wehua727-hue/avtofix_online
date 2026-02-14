import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { categoriesAPI, productsAPI } from "@/services/api";
import { ChevronRight, ChevronLeft, Star, Store, Home, ArrowUpRight, ChevronDown, SlidersHorizontal, X, Sparkles, DollarSign, Gem } from "lucide-react"; 
import { useFavorites } from "@/context/FavoritesContext";
import { formatCurrency } from "@/utils/currency";
import { toast } from "sonner";
import {
  playStarButtonAnimation,
  playNavbarFavoriteAddAnimation,
  playNavbarFavoriteRemoveAnimation,
} from "@/utils/favoriteAnimations";
import { getNavbarFavoriteElements } from "@/utils/favoriteAnimationRegistry";
import QuantityCounterCompact from "@/components/QuantityCounterCompact";

const PRODUCTS_PER_PAGE = 100;
const NEW_PRODUCT_DAYS = 3; // Товар считается новым 3 дня

// Проверка является ли товар новым (добавлен за последние 3 дня)
const isNewProduct = (product) => {
  if (!product.createdAt) return false;
  const createdDate = new Date(product.createdAt);
  const now = new Date();
  const diffTime = now - createdDate;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays <= NEW_PRODUCT_DAYS;
};

// Skeleton компонент для карточки товара
const ProductSkeleton = () => (
  <div className="relative flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-gray-200/60 dark:border-white/10 bg-white/80 dark:bg-white/[0.03]">
    <div className="aspect-square bg-gray-200 dark:bg-white/10" />
    <div className="p-3 sm:p-4 space-y-2">
      <div className="h-4 bg-gray-200 dark:bg-white/10 rounded" />
      <div className="h-4 w-2/3 bg-gray-200 dark:bg-white/10 rounded" />
      <div className="h-5 w-1/2 bg-gray-200 dark:bg-white/10 rounded" />
      <div className="h-8 bg-gray-200 dark:bg-white/10 rounded mt-2" />
    </div>
  </div>
);

// Компонент изображения с постепенной загрузкой
const LazyImage = ({ src, alt, className, delay = 0 }) => {
  const [loaded, setLoaded] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!shouldLoad) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const img = new Image();
          img.onload = () => setLoaded(true);
          img.src = src;
          observer.disconnect();
        }
      },
      { rootMargin: '50px', threshold: 0.1 }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, [shouldLoad, src]);

  return (
    <div ref={imgRef} className="relative h-full w-full overflow-hidden">
      <div 
        className={`absolute inset-0 bg-gray-200 dark:bg-white/10 transition-opacity duration-500 ${loaded ? 'opacity-0' : 'opacity-100'}`} 
      />
      {shouldLoad && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`${className} transition-opacity duration-700 ease-out ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
};

const ProductCategory = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const categoryId = searchParams.get("category");

  const [categories, setCategories] = useState([]);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]); // Barcha mahsulotlar - qidiruv uchun
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const { toggleFavorite, isFavorite } = useFavorites();
  const [currentUser, setCurrentUser] = useState(null);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [appliedMinPrice, setAppliedMinPrice] = useState("");
  const [appliedMaxPrice, setAppliedMaxPrice] = useState("");
  const [priceRange] = useState({ min: 0, max: 999999000 });
  const [dragging, setDragging] = useState(null); // 'min' | 'max' | null
  const [sortBy, setSortBy] = useState("new"); // 'new' | 'cheap' | 'expensive'
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const sortDropdownRef = useRef(null);
  const sliderRef = useRef(null);
  const priceFilterTimeout = useRef(null);

  // Highlight funksiyasi - topilgan so'zni sariq rangda ko'rsatish
  const highlightText = (text, query) => {
    if (!query || !text) return text;
    
    // Normalizatsiya funksiyasi
    const normalizeChar = (char) => {
      const lowerChar = char.toLowerCase();
      
      // Lotin -> Kirill moslashtirish
      const latinToCyrillic = {
        'a': 'а', 'b': 'б', 'c': 'с', 'd': 'д', 'e': 'е',
        'f': 'ф', 'g': 'г', 'h': 'х', 'i': 'и', 'j': 'ж',
        'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о',
        'p': 'п', 'q': 'к', 'r': 'р', 's': 'с', 't': 'т',
        'u': 'у', 'v': 'в', 'w': 'в', 'y': 'у', 'z': 'з'
        // 'x' ni olib tashladik - u faqat lotin 'x' bo'lib qoladi
      };
      if (latinToCyrillic[lowerChar]) {
        return [lowerChar, latinToCyrillic[lowerChar]];
      }
      const cyrillicToLatin = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
        'е': 'e', 'ё': 'e', 'ж': 'j', 'з': 'z', 'и': 'i',
        'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
        'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
        'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch',
        'ш': 'sh', 'щ': 'sh', 'ъ': '', 'ы': 'y', 'ь': '',
        'э': 'e', 'ю': 'yu', 'я': 'ya'
      };
      if (cyrillicToLatin[lowerChar]) {
        return [lowerChar, cyrillicToLatin[lowerChar]];
      }
      return [lowerChar];
    };
    
    const charsMatch = (char1, char2) => {
      const normalized1 = normalizeChar(char1);
      const normalized2 = normalizeChar(char2);
      for (const n1 of normalized1) {
        for (const n2 of normalized2) {
          if (n1 === n2) return true;
        }
      }
      return false;
    };
    
    // Topilgan joyni aniqlash
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    let matchStart = -1;
    
    for (let i = 0; i <= lowerText.length - lowerQuery.length; i++) {
      let matches = true;
      for (let j = 0; j < lowerQuery.length; j++) {
        if (!charsMatch(lowerQuery[j], lowerText[i + j])) {
          matches = false;
          break;
        }
      }
      if (matches) {
        matchStart = i;
        break;
      }
    }
    
    if (matchStart === -1) return text;
    
    const before = text.substring(0, matchStart);
    const match = text.substring(matchStart, matchStart + query.length);
    const after = text.substring(matchStart + query.length);
    
    return (
      <>
        {before}
        <mark className="bg-yellow-300 dark:bg-yellow-600 text-gray-900 dark:text-white px-0.5 rounded">
          {match}
        </mark>
        {after}
      </>
    );
  };

  // QIDIRUV FUNKSIYASI - Faqat yozilgan alifboda qidirish
  const handleSearchQuery = useCallback(async (query) => {
    const searchText = query.trim();
    
    console.log('🔍 Search query:', searchText);
    
    // Bo'sh qidiruv - barcha mahsulotlarni ko'rsatish
    if (!searchText) {
      console.log('✅ Empty query, showing all products');
      setProducts(allProducts);
      return;
    }
    
    // Qidiruv paytida barcha mahsulotlarni API'dan olish
    try {
      const productsRes = await productsAPI.getAll({ expandVariants: true, limit: 10000 });
      const allProductsData = productsRes.products || productsRes;
      console.log('📦 Total products to search:', allProductsData.length);
    
      // Oddiy qidiruv - qanday yozilgan bo'lsa, shunday qidirish
      const lowerQuery = searchText.toLowerCase();
      const startsWithResults = [];
      const containsResults = [];
      const addedIds = new Set();
      
      for (const product of allProductsData) {
      let parentAdded = false;
      
      // VARIANTLARDA QIDIRISH
      if (product.variants && Array.isArray(product.variants)) {
        for (let i = 0; i < product.variants.length; i++) {
          const variant = product.variants[i];
          
          const vName = (variant.name || '').toLowerCase();
          const vSku = String(variant.sku || '').toLowerCase();
          const vCode = String(variant.code || '').toLowerCase();
          const vCatalog = String(variant.catalogNumber || '').toLowerCase();
          
          // Oddiy qidiruv - includes
          const nameMatch = vName.includes(lowerQuery);
          const skuMatch = vSku.includes(lowerQuery);
          const codeMatch = vCode.includes(lowerQuery);
          const catalogMatch = vCatalog.includes(lowerQuery);
          
          if (nameMatch || skuMatch || codeMatch || catalogMatch) {
            const nameStartsWith = vName.startsWith(lowerQuery);
            
            const variantId = `${product._id}-v${i}`;
            if (!addedIds.has(variantId)) {
              const variantProduct = {
                _id: product._id,
                parentProductId: product._id,
                variantIndex: i,
                name: variant.name || product.name,
                price: variant.price || product.price,
                imageUrl: variant.imageUrl || product.imageUrl,
                images: variant.images || product.images,
                imagePaths: variant.imagePaths || product.imagePaths,
                category: product.category,
                store: product.store,
                sku: variant.sku,
                code: variant.code,
                catalogNumber: variant.catalogNumber,
                stockCount: variant.stockCount,
                inStock: variant.inStock,
                isVariant: true,
                createdAt: product.createdAt,
                searchQuery: searchText
              };
              
              if (nameStartsWith) {
                startsWithResults.push(variantProduct);
              } else {
                containsResults.push(variantProduct);
              }
              addedIds.add(variantId);
              parentAdded = true;
            }
          }
        }
      }
      
      // OTA MAHSULOTDA QIDIRISH
      if (!parentAdded && !addedIds.has(product._id)) {
        const pName = (product.name || '').toLowerCase();
        const pSku = String(product.sku || '').toLowerCase();
        const pCode = String(product.code || '').toLowerCase();
        const pCatalog = String(product.catalogNumber || '').toLowerCase();
        
        const nameMatch = pName.includes(lowerQuery);
        const skuMatch = pSku.includes(lowerQuery);
        const codeMatch = pCode.includes(lowerQuery);
        const catalogMatch = pCatalog.includes(lowerQuery);
        
        if (nameMatch || skuMatch || codeMatch || catalogMatch) {
          const nameStartsWith = pName.startsWith(lowerQuery);
          
          const productWithSearch = {
            ...product,
            searchQuery: searchText
          };
          
          if (nameStartsWith) {
            startsWithResults.push(productWithSearch);
          } else {
            containsResults.push(productWithSearch);
          }
          addedIds.add(product._id);
        }
      }
    }
    
    const results = [...startsWithResults, ...containsResults];
    
    console.log('✅ Results - starts with:', startsWithResults.length, 'contains:', containsResults.length);
    console.log('✅ Total results found:', results.length);
    setProducts(results);
    } catch (error) {
      console.error('❌ Search error:', error);
      // Xatolik bo'lsa, mavjud mahsulotlar orasidan qidirish
      const lowerQuery = searchText.toLowerCase();
      const results = allProducts.filter(product => {
        const pName = (product.name || '').toLowerCase();
        const pSku = String(product.sku || '').toLowerCase();
        const pCode = String(product.code || '').toLowerCase();
        const pCatalog = String(product.catalogNumber || '').toLowerCase();
        return pName.includes(lowerQuery) || pSku.includes(lowerQuery) || pCode.includes(lowerQuery) || pCatalog.includes(lowerQuery);
      });
      setProducts(results);
    }
  }, [allProducts]);

  // Get current user from localStorage
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Error loading user:", error);
    }
  }, []);

  // Qidiruv event listener
  useEffect(() => {
    const handleSearch = (event) => {
      const query = event.detail.query || '';
      handleSearchQuery(query);
    };
    
    window.addEventListener('searchQuery', handleSearch);
    
    return () => {
      window.removeEventListener('searchQuery', handleSearch);
    };
  }, [handleSearchQuery]);

  // Закрытие dropdown при клике вне
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
        setSortDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Kategoriyalarni yuklash
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoriesAPI.getAll();
        setCategories(data);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);


  // Kategoriya va mahsulotlarni yuklash
  useEffect(() => {
    const findCategoryById = (cats, id) => {
      for (const cat of cats) {
        if (cat._id === id) return cat;
        if (cat.children?.length) {
          const found = findCategoryById(cat.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const buildBreadcrumb = (cats, id, path = []) => {
      for (const cat of cats) {
        if (cat._id === id) {
          return [...path, cat];
        }
        if (cat.children?.length) {
          const found = buildBreadcrumb(cat.children, id, [...path, cat]);
          if (found) return found;
        }
      }
      return null;
    };

    // Функция для получения всех ID дочерних категорий (рекурсивно)
    const getAllChildCategoryIds = (cat) => {
      const ids = [cat._id];
      if (cat.children && cat.children.length > 0) {
        cat.children.forEach(child => {
          ids.push(...getAllChildCategoryIds(child));
        });
      }
      return ids;
    };

    if (categoryId && categories.length > 0) {
      const category = findCategoryById(categories, categoryId);
      
      // Agar kategoriya topilmasa, bosh sahifaga yo'naltirish
      if (!category) {
        console.warn(`Category not found: ${categoryId}`);
        toast.error('Kategoriya topilmadi');
        navigate('/categories', { replace: true });
        return;
      }
      
      setCurrentCategory(category);
      const bc = buildBreadcrumb(categories, categoryId) || [];
      setBreadcrumb(bc);
    } else if (categoryId && categories.length > 0) {
      // Kategoriya ID bor, lekin kategoriya topilmadi
      console.warn(`Category not found: ${categoryId}`);
      toast.error('Kategoriya topilmadi');
      navigate('/categories', { replace: true });
      return;
    } else {
      setCurrentCategory(null);
      setBreadcrumb([]);
    }
    
    // Mahsulotlarni yuklash - serverdan filter bilan
    const fetchProducts = async () => {
      setProductsLoading(true);
      setCurrentPage(1);
      try {
        const options = { 
          page: 1, 
          limit: PRODUCTS_PER_PAGE,
        };
        if (categoryId) {
          options.categoryId = categoryId;
          console.log('🔍 Fetching products with categoryId:', categoryId);
        }
        if (appliedMinPrice) {
          options.minPrice = appliedMinPrice;
        }
        if (appliedMaxPrice) {
          options.maxPrice = appliedMaxPrice;
        }
        options.expandVariants = true;
        
        console.log('📦 Fetching products with options:', options);
        const productsRes = await productsAPI.getAll(options);
        const productsData = productsRes.products || productsRes;
        
        console.log('✅ Received products:', productsData.length, 'Total:', productsRes.pagination?.total);
        
        setProducts(productsData);
        setAllProducts(productsData); // Qidiruv uchun barcha mahsulotlarni saqlash
        setHasMore(productsRes.pagination?.hasMore ?? false);
        setTotalProducts(productsRes.pagination?.total ?? productsData.length);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setProductsLoading(false);
      }
    };
    fetchProducts();
  }, [categoryId, categories, appliedMinPrice, appliedMaxPrice]);

  // Narx filterini debounce qilish
  useEffect(() => {
    if (priceFilterTimeout.current) {
      clearTimeout(priceFilterTimeout.current);
    }
    
    priceFilterTimeout.current = setTimeout(() => {
      setAppliedMinPrice(minPrice);
      setAppliedMaxPrice(maxPrice);
    }, 500);
    
    return () => {
      if (priceFilterTimeout.current) {
        clearTimeout(priceFilterTimeout.current);
      }
    };
  }, [minPrice, maxPrice]);

  // Глобальные обработчики для перетаскивания
  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const percent = x / rect.width;
      const value = priceRange.min + percent * (priceRange.max - priceRange.min);
      
      if (dragging === 'min') {
        const max = parseFloat(maxPrice) || priceRange.max;
        if (value <= max) {
          setMinPrice(Math.floor(value).toString());
        }
      } else if (dragging === 'max') {
        const min = parseFloat(minPrice) || priceRange.min;
        if (value >= min) {
          setMaxPrice(Math.floor(value).toString());
        }
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, priceRange, minPrice, maxPrice]);

  // Загрузить больше товаров
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const options = { 
        page: nextPage, 
        limit: PRODUCTS_PER_PAGE,
      };
      if (categoryId) {
        options.categoryId = categoryId;
      }
      if (appliedMinPrice) {
        options.minPrice = appliedMinPrice;
      }
      if (appliedMaxPrice) {
        options.maxPrice = appliedMaxPrice;
      }
      options.expandVariants = true;
      
      const productsRes = await productsAPI.getAll(options);
      const newProducts = productsRes.products || productsRes;
      
      setProducts(prev => [...prev, ...newProducts]);
      setHasMore(productsRes.pagination?.hasMore ?? false);
      setCurrentPage(nextPage);
    } catch (error) {
      console.error("Error loading more products:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, currentPage, categoryId, appliedMinPrice, appliedMaxPrice]);

  const handleProductFavoriteToggle = useCallback(
    async (event, currentProduct) => {
      event.preventDefault();
      event.stopPropagation();

      const button = event?.currentTarget ?? null;
      const startRect = button?.getBoundingClientRect();

      const result = await toggleFavorite(currentProduct);

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
    [navigate, toggleFavorite]
  );

  // Sidebar uchun kategoriyalar
  const getSidebarCategories = () => {
    if (!categoryId) return categories;
    if (currentCategory?.children?.length > 0) {
      return currentCategory.children;
    }
    // Agar bolalari yo'q bo'lsa, parent ning bolalarini ko'rsat
    if (breadcrumb.length > 1) {
      return breadcrumb[breadcrumb.length - 2].children || [];
    }
    return categories;
  };

  const sidebarCategories = getSidebarCategories();


  // Skeleton при загрузке
  if (loading) {
    return (
      <div className="min-h-screen text-gray-900 dark:text-white pb-20 sm:pb-0 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-24">
          {/* Breadcrumb skeleton */}
          <div className="h-12 rounded-xl bg-gray-200 dark:bg-white/10 mb-6" />
          
          <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
            {/* Sidebar skeleton */}
            <aside className="hidden lg:block">
              <div className="rounded-2xl border border-gray-200/60 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] p-5">
                <div className="h-6 w-32 bg-gray-200 dark:bg-white/10 rounded mb-5" />
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-10 bg-gray-200 dark:bg-white/10 rounded-xl" />
                  ))}
                </div>
              </div>
            </aside>
            
            {/* Main content skeleton */}
            <main>
              <div className="mb-8">
                <div className="h-8 w-64 bg-gray-200 dark:bg-white/10 rounded mb-2" />
                <div className="h-6 w-24 bg-gray-200 dark:bg-white/10 rounded-full" />
              </div>
              
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                  <ProductSkeleton key={i} />
                ))}
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-gray-900 dark:text-white pb-20 sm:pb-0 transition-colors duration-300 overflow-x-hidden">
      {/* Background decorations */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-24 overflow-x-hidden">
        {/* Breadcrumb - Glassmorphism */}
        <nav className="flex items-center gap-2 text-sm mb-6 flex-wrap px-4 py-3 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-gray-200/50 dark:border-white/10">
          <Link to="/" className="text-gray-500 dark:text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 flex items-center gap-1.5 transition-colors">
            <Home className="w-4 h-4" />
            <span>Bosh sahifa</span>
          </Link>
          {breadcrumb.map((cat, index) => (
            <span key={cat._id} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-600" />
              {index === breadcrumb.length - 1 ? (
                <span className="font-medium text-gray-900 dark:text-white">{cat.name}</span>
              ) : (
                <Link
                  to={`/categories?category=${cat._id}`}
                  className="text-gray-500 dark:text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                >
                  {cat.name}
                </Link>
              )}
            </span>
          ))}
        </nav>

        <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
          {/* Sidebar - Glassmorphism */}
          <aside className="hidden lg:block">
            <div className="rounded-2xl border border-gray-200/60 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl p-5 shadow-lg shadow-gray-200/50 dark:shadow-none">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1 h-5 rounded-full bg-gradient-to-b from-rose-500 to-orange-500" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Turkumlar
                </h2>
              </div>

              {/* Выбранная категория с кнопкой назад */}
              {currentCategory && (
                <Link
                  to={breadcrumb.length > 1 
                    ? `/categories?category=${breadcrumb[breadcrumb.length - 2]._id}`
                    : "/categories"
                  }
                  className="group flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-gradient-to-r from-rose-500/10 to-orange-500/10 dark:from-rose-500/20 dark:to-orange-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:from-rose-500/20 hover:to-orange-500/20 dark:hover:from-rose-500/30 dark:hover:to-orange-500/30 transition-all"
                >
                  <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="font-semibold">{currentCategory.name}</span>
                </Link>
              )}

              {/* Sub-kategoriyalar */}
              <div className="space-y-1 mb-5">
                {sidebarCategories.map((cat) => (
                  <Link
                    key={cat._id}
                    to={`/categories?category=${cat._id}`}
                    className={`group flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 ${
                      cat._id === categoryId
                        ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-medium shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white hover:pl-5"
                    }`}
                  >
                    <span>{cat.name}</span>
                    {cat.children?.length > 0 && (
                      <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    )}
                  </Link>
                ))}
              </div>

              {/* Фильтр по цене - Glassmorphism */}
              <div className="border-t border-gray-200/50 dark:border-white/10 pt-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Narx, so'm
                  </h3>
                  {/* Кнопка Tozalash */}
                  {(minPrice || maxPrice) && (
                    <button
                      onClick={() => {
                        setMinPrice("");
                        setMaxPrice("");
                      }}
                      className="text-xs text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 font-medium transition-colors"
                    >
                      Tozalash
                    </button>
                  )}
                </div>
                  <div className="space-y-4">
                    {/* Поля ввода */}
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
                          dan
                        </label>
                        <input
                          type="number"
                          value={minPrice}
                          onChange={(e) => {
                            const value = e.target.value;
                            setMinPrice(value);
                            if (value && !isNaN(parseFloat(value))) {
                              const numValue = Math.max(priceRange.min, Math.min(parseFloat(value), priceRange.max));
                              setMinPrice(numValue.toString());
                            }
                          }}
                          min={priceRange.min}
                          max={priceRange.max}
                          className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-rose-500 dark:focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
                          gacha
                        </label>
                        <input
                          type="number"
                          value={maxPrice}
                          onChange={(e) => {
                            const value = e.target.value;
                            setMaxPrice(value);
                            if (value && !isNaN(parseFloat(value))) {
                              const numValue = Math.max(priceRange.min, Math.min(parseFloat(value), priceRange.max));
                              setMaxPrice(numValue.toString());
                            }
                          }}
                          min={priceRange.min}
                          max={priceRange.max}
                          className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-rose-500 dark:focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all"
                        />
                      </div>
                    </div>

                    {/* Слайдер диапазона - Glassmorphism */}
                    <div className="relative py-5">
                      <div 
                        ref={sliderRef}
                        className="relative h-2 bg-gray-200 dark:bg-white/10 rounded-full cursor-pointer"
                        onMouseDown={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
                          const minPos = ((parseFloat(minPrice) || priceRange.min) - priceRange.min) / (priceRange.max - priceRange.min) * 100;
                          const maxPos = ((parseFloat(maxPrice) || priceRange.max) - priceRange.min) / (priceRange.max - priceRange.min) * 100;
                          
                          // Определяем, какую ручку перетаскивать
                          const distToMin = Math.abs(percent - minPos);
                          const distToMax = Math.abs(percent - maxPos);
                          
                          // Если клик ближе к минимальной ручке
                          if (distToMin < distToMax && distToMin < 15) {
                            setDragging('min');
                            const value = priceRange.min + (percent / 100) * (priceRange.max - priceRange.min);
                            const max = parseFloat(maxPrice) || priceRange.max;
                            if (value <= max) {
                              setMinPrice(Math.floor(value).toString());
                            }
                          } 
                          // Если клик ближе к максимальной ручке
                          else if (distToMax < 15) {
                            setDragging('max');
                            const value = priceRange.min + (percent / 100) * (priceRange.max - priceRange.min);
                            const min = parseFloat(minPrice) || priceRange.min;
                            if (value >= min) {
                              setMaxPrice(Math.floor(value).toString());
                            }
                          }
                          // Если клик далеко от обеих ручек, устанавливаем ближайшую
                          else {
                            if (percent < (minPos + maxPos) / 2) {
                              setDragging('min');
                              const value = priceRange.min + (percent / 100) * (priceRange.max - priceRange.min);
                              const max = parseFloat(maxPrice) || priceRange.max;
                              if (value <= max) {
                                setMinPrice(Math.floor(value).toString());
                              }
                            } else {
                              setDragging('max');
                              const value = priceRange.min + (percent / 100) * (priceRange.max - priceRange.min);
                              const min = parseFloat(minPrice) || priceRange.min;
                              if (value >= min) {
                                setMaxPrice(Math.floor(value).toString());
                              }
                            }
                          }
                        }}
                      >
                        {/* Активная часть слайдера */}
                        <div
                          className="absolute h-2 bg-gradient-to-r from-rose-500 to-orange-500 rounded-full pointer-events-none"
                          style={{
                            left: `${((parseFloat(minPrice) || priceRange.min) - priceRange.min) / (priceRange.max - priceRange.min) * 100}%`,
                            width: `${((parseFloat(maxPrice) || priceRange.max) - (parseFloat(minPrice) || priceRange.min)) / (priceRange.max - priceRange.min) * 100}%`,
                          }}
                        />
                        {/* Визуальная минимальная ручка */}
                        <div
                          className={`absolute w-5 h-5 bg-white border-2 border-rose-500 rounded-full -top-1.5 shadow-lg shadow-rose-500/30 transition-all ${
                            dragging === 'min' ? 'scale-125 cursor-grabbing shadow-rose-500/50' : 'cursor-grab hover:scale-110'
                          }`}
                          style={{
                            left: `calc(${((parseFloat(minPrice) || priceRange.min) - priceRange.min) / (priceRange.max - priceRange.min) * 100}% - 8px)`,
                            pointerEvents: 'auto',
                            zIndex: 30,
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setDragging('min');
                          }}
                        />
                        {/* Визуальная максимальная ручка */}
                        <div
                          className={`absolute w-5 h-5 bg-white border-2 border-orange-500 rounded-full -top-1.5 shadow-lg shadow-orange-500/30 transition-all ${
                            dragging === 'max' ? 'scale-125 cursor-grabbing shadow-orange-500/50' : 'cursor-grab hover:scale-110'
                          }`}
                          style={{
                            left: `calc(${((parseFloat(maxPrice) || priceRange.max) - priceRange.min) / (priceRange.max - priceRange.min) * 100}% - 8px)`,
                            pointerEvents: 'auto',
                            zIndex: 30,
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setDragging('max');
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          </aside>

          {/* Main content */}
          <main>
            <div className="mb-8">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {currentCategory?.name || "Barcha mahsulotlar"}
                  </h1>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm font-medium">
                      {totalProducts} ta tovar
                    </span>
                    {products.length < totalProducts && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({products.length} ko'rsatilmoqda)
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Мобильная кнопка фильтра + Сортировка */}
                <div className="flex items-center gap-2">
                  {/* Кнопка фильтра - только на мобильных */}
                  <button
                    onClick={() => setMobileFilterOpen(true)}
                    className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-all"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="hidden sm:inline">Filtr</span>
                  </button>
                  
                  {/* Сортировка */}
                  <div className="relative" ref={sortDropdownRef}>
                    <button
                      onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-all"
                    >
                    <span className="flex items-center gap-1.5">
                      {sortBy === "new" && <><Sparkles className="w-4 h-4" /> Yangi</>}
                      {sortBy === "cheap" && <><DollarSign className="w-4 h-4" /> Arzon</>}
                      {sortBy === "expensive" && <><Gem className="w-4 h-4" /> Qimmat</>}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {sortDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-44 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 shadow-xl shadow-black/10 dark:shadow-black/30 z-50 overflow-hidden">
                      <button
                        onClick={() => { setSortBy("new"); setSortDropdownOpen(false); }}
                        className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors flex items-center gap-2 ${
                          sortBy === "new" 
                            ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400" 
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <Sparkles className="w-4 h-4" />
                        Yangi
                      </button>
                      <button
                        onClick={() => { setSortBy("cheap"); setSortDropdownOpen(false); }}
                        className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors flex items-center gap-2 ${
                          sortBy === "cheap" 
                            ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400" 
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <DollarSign className="w-4 h-4" />
                        Arzon
                      </button>
                      <button
                        onClick={() => { setSortBy("expensive"); setSortDropdownOpen(false); }}
                        className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors flex items-center gap-2 ${
                          sortBy === "expensive" 
                            ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400" 
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <Gem className="w-4 h-4" />
                        Qimmat
                      </button>
                    </div>
                  )}
                  </div>
                </div>
              </div>
            </div>

            {/* Products grid */}
            {productsLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                  <ProductSkeleton key={i} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 dark:border-white/20 bg-white/50 dark:bg-white/5 backdrop-blur-sm p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                  <Store className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  {appliedMinPrice || appliedMaxPrice
                    ? "Narx bo'yicha mahsulotlar topilmadi"
                    : "Bu kategoriyada mahsulotlar yo'q"}
                </p>
              </div>
            ) : (
              <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {[...products].sort((a, b) => {
                  if (sortBy === "new") {
                    // Новые товары первые
                    const aIsNew = isNewProduct(a);
                    const bIsNew = isNewProduct(b);
                    if (aIsNew && !bIsNew) return -1;
                    if (!aIsNew && bIsNew) return 1;
                    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                  } else if (sortBy === "cheap") {
                    // Дешёвые первые
                    return (a.price || 0) - (b.price || 0);
                  } else if (sortBy === "expensive") {
                    // Дорогие первые
                    return (b.price || 0) - (a.price || 0);
                  }
                  return 0;
                }).map((product) => (
                  <Link
                    key={product._id}
                    to={product.isVariant 
                      ? `/product/${product.parentProductId}?variant=${product.variantIndex}` 
                      : `/product/${product._id}`}
                    className="group relative flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-gray-200/60 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl shadow-lg shadow-gray-200/50 dark:shadow-none transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:shadow-rose-500/10 dark:hover:shadow-rose-500/5 dark:hover:bg-white/[0.06] dark:hover:border-white/20"
                  >
                    {/* Image Container */}
                    <div className="relative overflow-hidden aspect-square">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-[1]" />
                      
                      {/* Метка "Yangi" для новых товаров */}
                      {isNewProduct(product) && (
                        <div className="absolute left-2 top-2 sm:left-3 sm:top-3 z-10">
                          <span className="flex items-center gap-1 px-2 py-1 text-[10px] sm:text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg shadow-lg shadow-emerald-500/30">
                            <Sparkles className="w-3 h-3" />
                            Yangi
                          </span>
                        </div>
                      )}
                      
                      {/* Favorite Button - Glassmorphism */}
                      <button
                        type="button"
                        onClick={(event) => handleProductFavoriteToggle(event, product)}
                        aria-pressed={isFavorite(product._id ?? product.id)}
                        className={`absolute right-2 top-2 sm:right-3 sm:top-3 z-10 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl backdrop-blur-md border transition-all duration-300 ${
                          isFavorite(product._id ?? product.id)
                            ? "border-yellow-400/60 bg-yellow-500/30 text-yellow-400 shadow-lg shadow-yellow-500/20"
                            : "border-white/30 dark:border-white/20 bg-white/70 dark:bg-black/30 text-gray-500 dark:text-white/70 hover:bg-white dark:hover:bg-black/50 hover:text-yellow-500 hover:border-yellow-400/50"
                        }`}
                      >
                        <Star
                          className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:scale-110"
                          fill={isFavorite(product._id ?? product.id) ? "currentColor" : "none"}
                        />
                      </button>
                      
                      {/* Product Image с постепенной загрузкой */}
                      <LazyImage
                        src={product.imageUrl || product.images?.[0] || product.image || "/placeholder.jpg"}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        delay={100}
                      />
                    </div>
                    
                    {/* Content - Glassmorphism panel */}
                    <div className="flex flex-1 flex-col p-3 sm:p-4 gap-1.5 bg-gradient-to-b from-transparent to-gray-50/50 dark:to-white/[0.02]">
                      <h3 className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-white line-clamp-2 leading-snug group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                        {product.searchQuery ? highlightText(product.name, product.searchQuery) : product.name}
                      </h3>
                      
                      {/* Price with gradient */}
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm sm:text-lg font-bold bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-transparent">
                          {formatCurrency(product.currency) === "$" ? "$" : ""}{product.price?.toLocaleString()}
                        </span>
                        {formatCurrency(product.currency) !== "$" && (
                          <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                            so'm
                          </span>
                        )}
                      </div>
                      
                      {/* Store info */}
                      {product.store && typeof product.store === 'object' && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="w-5 h-5 rounded-md bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                            <Store className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                          </div>
                          <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                            {product.store.name}
                          </span>
                        </div>
                      )}
                      
                      {/* Add to cart */}
                      <div className="mt-auto pt-2">
                        <QuantityCounterCompact product={product} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center pt-8 sm:pt-10">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="group relative px-8 sm:px-10 py-3 sm:py-4 rounded-2xl font-semibold text-sm sm:text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-500 via-rose-600 to-orange-500 transition-all duration-300 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-600 via-rose-500 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute inset-0 rounded-2xl shadow-lg shadow-rose-500/30 group-hover:shadow-xl group-hover:shadow-rose-500/40 transition-shadow duration-300" />
                    <span className="relative text-white flex items-center gap-2">
                      {loadingMore ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Yuklanmoqda...
                        </>
                      ) : (
                        <>
                          Ko'proq ko'rsatish ({totalProducts - products.length} ta qoldi)
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

      {/* Мобильное модальное окно фильтра */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileFilterOpen(false)}
          />
          
          {/* Панель фильтра */}
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto overflow-x-hidden">
            {/* Заголовок */}
            <div className="sticky top-0 flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Filtr</h2>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            {/* Категории */}
            <div className="p-4 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Turkumlar</h3>
              
              {currentCategory && (
                <Link
                  to={breadcrumb.length > 1 
                    ? `/categories?category=${breadcrumb[breadcrumb.length - 2]._id}`
                    : "/categories"
                  }
                  onClick={() => setMobileFilterOpen(false)}
                  className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {currentCategory.name}
                </Link>
              )}
              
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {sidebarCategories.map((cat) => (
                  <Link
                    key={cat._id}
                    to={`/categories?category=${cat._id}`}
                    onClick={() => setMobileFilterOpen(false)}
                    className={`block px-3 py-2 rounded-xl text-sm transition-colors ${
                      cat._id === categoryId
                        ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-medium"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
            
            {/* Фильтр по цене */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Narx, so'm</h3>
                {(minPrice || maxPrice) && (
                  <button
                    onClick={() => { setMinPrice(""); setMaxPrice(""); }}
                    className="text-xs text-rose-500 font-medium"
                  >
                    Tozalash
                  </button>
                )}
              </div>
              
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">dan</label>
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white"
                    placeholder="0"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">gacha</label>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white"
                    placeholder="999999"
                  />
                </div>
              </div>
            </div>
            
            {/* Кнопка применить */}
            <div className="sticky bottom-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-white/10">
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-semibold text-sm shadow-lg shadow-rose-500/30"
              >
                Ko'rsatish ({totalProducts} ta)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCategory;
