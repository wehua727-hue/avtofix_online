import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, Phone, Star, Sparkles, Wrench, Shield, Truck, MapPin } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { productsAPI, professionalsAPI } from "../services/api";
import { useFavorites } from "@/context/FavoritesContext";
import { formatCurrency } from "@/utils/currency";
import {
  playStarButtonAnimation,
  playNavbarFavoriteAddAnimation,
  playNavbarFavoriteRemoveAnimation,
} from "@/utils/favoriteAnimations";
import { getNavbarFavoriteElements } from "@/utils/favoriteAnimationRegistry";
import QuantityCounterCompact from "@/components/QuantityCounterCompact";

const PRODUCTS_PER_PAGE = 24;
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

// Skeleton для профессионала
const ProfessionalSkeleton = () => (
  <div className="relative flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-gray-200/60 dark:border-white/10 bg-white/80 dark:bg-white/[0.03]">
    <div className="aspect-square bg-gray-200 dark:bg-white/10" />
    <div className="p-3 sm:p-4 space-y-2">
      <div className="h-8 bg-gray-200 dark:bg-white/10 rounded" />
      <div className="h-10 bg-gray-200 dark:bg-white/10 rounded" />
    </div>
  </div>
);

// Компонент изображения с постепенной загрузкой
const LazyImage = ({ src, alt, className, delay = 0 }) => {
  const [loaded, setLoaded] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    // Задержка перед началом загрузки изображения
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
          // Начинаем загрузку когда элемент виден
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
      {/* Placeholder skeleton - всегда показываем пока не загрузится */}
      <div 
        className={`absolute inset-0 bg-gray-200 dark:bg-white/10 transition-opacity duration-500 ${loaded ? 'opacity-0' : 'opacity-100'}`} 
      />
      {/* Изображение появляется плавно */}
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

const Index = () => {
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]); // Barcha mahsulotlar - qidiruv uchun
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { toggleFavorite, isFavorite } = useFavorites();
  const navigate = useNavigate();
  const isFetchingRef = useRef(false); // API so'rovi ketayotganini kuzatish
  
  // Highlight funksiyasi - topilgan so'zni sariq rangda ko'rsatish
  const highlightText = (text, query) => {
    if (!query || !text) return text;
    
    // Normalizatsiya funksiyasi
    const normalizeChar = (char) => {
      const lowerChar = char.toLowerCase();
      const latinToCyrillic = {
        'a': 'а', 'b': 'б', 'c': 'с', 'd': 'д', 'e': 'е',
        'f': 'ф', 'g': 'г', 'h': 'х', 'i': 'и', 'j': 'ж',
        'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о',
        'p': 'п', 'q': 'к', 'r': 'р', 's': 'с', 't': 'т',
        'u': 'у', 'v': 'в', 'w': 'в', 'y': 'у', 'z': 'з'
        // 'x' ni olib tashladik
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
  
  const fetchData = async () => {
    // Agar allaqachon so'rov ketayotgan bo'lsa, qayta yubormaslik
    if (isFetchingRef.current) {
      console.log('⏭️ Skipping fetch - already in progress');
      return;
    }
    
    try {
      isFetchingRef.current = true;
      setLoading(true);
      
      // 1) Tezkor yuklash uchun keshdan o'qib turamiz (agar yangi bo'lsa),
      // lekin baribir keyin API'dan yangisini olib kelamiz.
      const cachedProducts = sessionStorage.getItem('home_products');
      const cachedProfessionals = sessionStorage.getItem('home_professionals');
      const cacheTime = sessionStorage.getItem('home_cache_time');
      const CACHE_DURATION = 30 * 1000; // 30 sekund
      
      if (cachedProducts && cachedProfessionals && cacheTime && 
          Date.now() - Number(cacheTime) < CACHE_DURATION) {
        const cached = JSON.parse(cachedProducts);
        const sortedCached = [...cached].sort((a, b) => {
          const aIsNew = isNewProduct(a);
          const bIsNew = isNewProduct(b);
          if (aIsNew && !bIsNew) return -1;
          if (!aIsNew && bIsNew) return 1;
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
        setAllProducts(sortedCached); // MUHIM - qidiruv uchun
        setProducts(sortedCached);
        setProfessionals(JSON.parse(cachedProfessionals));
        setHasMore(JSON.parse(sessionStorage.getItem('home_hasMore') || 'false'));
        setCurrentPage(1);
        // loading flag'ini hali o'chirmaymiz - keyingi real ma'lumotlar bilan almashtiramiz
      }
      
      // 2) Har doim yangilangan ma'lumotlarni serverdan olib kelamiz
      const [productsRes, professionalsRes] = await Promise.all([
        productsAPI.getAll({ page: 1, limit: PRODUCTS_PER_PAGE, expandVariants: true }),
        professionalsAPI.getAll({ page: 1, limit: 8 }),
      ]);
      
      // Yangi API format bilan ishlash
      const productsData = productsRes.products || productsRes;
      const professionalsData = professionalsRes.professionals || professionalsRes;
      
      // Сортируем: новые товары (за последние 3 дня) в начало
      const sortedProducts = [...productsData]
        .sort((a, b) => {
          const aIsNew = isNewProduct(a);
          const bIsNew = isNewProduct(b);
          if (aIsNew && !bIsNew) return -1;
          if (!aIsNew && bIsNew) return 1;
          // Если оба новые или оба старые - сортируем по дате создания (новые первые)
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
      
      // Сохраняем в кэш
      sessionStorage.setItem('home_products', JSON.stringify(sortedProducts));
      sessionStorage.setItem('home_professionals', JSON.stringify(professionalsData));
      sessionStorage.setItem('home_hasMore', JSON.stringify(productsRes.pagination?.hasMore ?? false));
      sessionStorage.setItem('home_cache_time', String(Date.now()));
      
      setAllProducts(sortedProducts); // MUHIM - qidiruv uchun
      setProducts(sortedProducts);
      setProfessionals(professionalsData);
      setHasMore(productsRes.pagination?.hasMore ?? false);
      setCurrentPage(1);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
      isFetchingRef.current = false; // So'rov tugadi
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    
    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const productsRes = await productsAPI.getAll({ page: nextPage, limit: PRODUCTS_PER_PAGE, expandVariants: true });
      
      const newProducts = (productsRes.products || productsRes)
        .filter(product => {
          // Mahsulot stokda bo'lishi kerak
          const hasStock = product.inStock !== false && (product.stockCount === undefined || product.stockCount === null || Number(product.stockCount) > 0);
          return hasStock;
        });
      
      setProducts(prev => [...prev, ...newProducts]);
      setHasMore(productsRes.pagination?.hasMore ?? false);
      setCurrentPage(nextPage);
    } catch (err) {
      console.error("Error loading more products:", err);
    } finally {
      setLoadingMore(false);
    }
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

  useEffect(() => {
    // Faqat bir marta yuklash
    fetchData();
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
    [navigate, toggleFavorite],
  );

  // Показываем только skeleton без лоадера
  if (loading) {
    return (
      <div className="min-h-screen text-gray-900 dark:text-white pb-20 sm:pb-0 transition-colors duration-300">
        <section className="relative px-4 sm:px-6 pt-2 sm:pt-4 pb-8 sm:pb-16">
          <div className="max-w-7xl mx-auto">
            {/* Hero skeleton */}
            <div className="h-48 sm:h-64 rounded-3xl bg-gray-200 dark:bg-white/10 mb-8 sm:mb-12" />
            
            {/* Products header skeleton */}
            <div className="flex items-center justify-between mb-6">
              <div className="h-6 w-40 bg-gray-200 dark:bg-white/10 rounded" />
              <div className="h-10 w-24 bg-gray-200 dark:bg-white/10 rounded-xl" />
            </div>
            
            {/* Products grid skeleton */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
            
            {/* Professionals section skeleton */}
            <div className="mt-16">
              <div className="flex items-center justify-between mb-6">
                <div className="h-6 w-48 bg-gray-200 dark:bg-white/10 rounded" />
                <div className="h-10 w-24 bg-gray-200 dark:bg-white/10 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <ProfessionalSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-xl px-8 py-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-lg font-medium text-red-400">Xatolik yuz berdi</p>
          <p className="text-sm text-red-300/70 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-gray-900 dark:text-white pb-20 sm:pb-0 transition-colors duration-300">
      
      {/* Hero Section */}
      <section className="relative isolate overflow-hidden px-4 sm:px-6 pt-2 sm:pt-4 pb-8 sm:pb-16">
        {/* Animated background gradients */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-500/20 rounded-full blur-3xl animate-float-soft" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl animate-float-soft" style={{ animationDelay: '-3s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-rose-500/10 via-transparent to-blue-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Hero Banner - Glassmorphism */}
          <div className="relative rounded-3xl overflow-hidden mb-8 sm:mb-12">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/90 via-rose-600/85 to-orange-500/90" />
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_25%_25%,white_1px,transparent_1px)] bg-[length:24px_24px]" />
            
            <div className="relative px-6 sm:px-10 py-10 sm:py-16">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="text-center lg:text-left max-w-xl">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-4">
                    <Sparkles className="w-4 h-4 text-yellow-300" />
                    <span className="text-sm font-medium text-white">Yangi kolleksiya</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                    Avtomobil ehtiyot qismlari marketi
                  </h1>
                  <p className="text-white/80 text-base sm:text-lg mb-6">
                    Sifatli mahsulotlar va professional xizmatlar bir joyda. 24/7 xizmat ko'rsatamiz
                  </p>
                  <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                    <Link
                      to="/categories"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-rose-600 font-semibold text-sm hover:bg-white/90 transition-all shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5"
                    >
                      Katalogni ko'rish
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                    <Link
                      to="/professionals"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 text-white font-semibold text-sm hover:bg-white/30 transition-all"
                    >
                      Ustalar
                    </Link>
                  </div>
                </div>
                
                {/* Feature cards - hidden on mobile */}
                <div className="hidden sm:grid grid-cols-3 gap-4">
                  {[
                    { icon: Shield, label: "Sifat", desc: "Yuqori Darajada" },
                    { icon: Truck, label: "Yetkazish", desc: "O'zbekiston bo'ylab" },
                    { icon: Wrench, label: "Xizmat", desc: "24/7" },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex flex-col items-center p-4 md:p-5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all"
                    >
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/20 flex items-center justify-center mb-2">
                        <item.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      </div>
                      <span className="text-xs md:text-sm font-semibold text-white text-center">{item.label}</span>
                      <span className="text-[10px] md:text-xs text-white/70 text-center">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Products Section Header */}
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 sm:h-8 rounded-full bg-gradient-to-b from-rose-500 to-orange-500 shadow-lg shadow-rose-500/50" />
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                Mashhur tovarlar
              </h2>
            </div>
            <Link
              to="/categories"
              className="group inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/20 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 font-medium text-xs sm:text-sm hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all duration-300 hover:shadow-lg hover:shadow-rose-500/30"
            >
              <span>Barchasi</span>
              <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
            </Link>
          </div>

          {/* Products Grid - Glassmorphism Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {products.map((product) => (
              <Link
                key={product._id}
                to={product.isVariant 
                  ? `/product/${product.parentProductId}?variant=${product.variantIndex}` 
                  : `/product/${product._id}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-gray-200/60 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl shadow-lg shadow-gray-200/50 dark:shadow-none transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:shadow-rose-500/10 dark:hover:shadow-rose-500/5 dark:hover:bg-white/[0.06] dark:hover:border-white/20"
              >
                {/* Image Container */}
                <div className="relative overflow-hidden aspect-square">
                  {/* Gradient overlay on hover */}
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
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <span className="text-sm sm:text-lg font-bold bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-transparent">
                      {formatCurrency(product.currency) === "$" ? "$" : ""}{product.price?.toLocaleString()}
                    </span>
                    {formatCurrency(product.currency) !== "$" && (
                      <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        so'm
                      </span>
                    )}
                  </div>
                  
                  {/* Add to cart */}
                  <div className="mt-auto pt-2">
                    <QuantityCounterCompact product={product} />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Load More Button - Glassmorphism */}
          {hasMore && (
            <div className="flex justify-center pt-8 sm:pt-12">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="group relative px-8 sm:px-10 py-3 sm:py-4 rounded-2xl font-semibold text-sm sm:text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              >
                {/* Button gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-rose-500 via-rose-600 to-orange-500 transition-all duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-r from-rose-600 via-rose-500 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Shine effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>
                
                {/* Shadow */}
                <div className="absolute inset-0 rounded-2xl shadow-lg shadow-rose-500/30 group-hover:shadow-xl group-hover:shadow-rose-500/40 transition-shadow duration-300" />
                
                <span className="relative text-white flex items-center gap-2">
                  {loadingMore ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Yuklanmoqda...
                    </>
                  ) : (
                    <>
                      Ko'proq ko'rsatish
                      <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </>
                  )}
                </span>
              </button>
            </div>
          )}
        </div>
      </section>


      {/* Professionals Section */}
      <section className="relative isolate px-4 sm:px-6 py-10 sm:py-20 transition-colors duration-300">
        {/* Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-100/80 via-gray-50/50 to-transparent dark:from-black/40 dark:via-black/20 dark:to-transparent" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-white/10 to-transparent" />
          <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-emerald-500 to-teal-500" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                Professional ustalar
              </h2>
            </div>
            <Link
              to="/professionals"
              className="group inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-600 dark:text-white/70 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-500/30 transition-all"
            >
              Barchasi
              <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>

          {/* Professionals Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {professionals.map((professional) => (
              <div
                key={professional._id}
                className="group relative flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-gray-200/60 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl shadow-lg shadow-gray-200/50 dark:shadow-none transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:shadow-emerald-500/10 dark:hover:shadow-emerald-500/5 dark:hover:bg-white/[0.06] dark:hover:border-white/20"
              >
                {/* Image Container */}
                <div className="relative overflow-hidden aspect-square">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-[1]" />
                  <LazyImage
                    src={professional.image || professional.images?.[0] || "/placeholder.jpg"}
                    alt={professional.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    delay={100}
                  />
                  
                  {/* Experience Badge - Glassmorphism */}
                  <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-[2]">
                    <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-emerald-500/90 backdrop-blur-sm border border-emerald-400/30 shadow-lg shadow-emerald-500/20">
                      <span className="text-[10px] sm:text-xs font-bold text-white">
                        {professional.experience || "5+"} yil tajriba
                      </span>
                    </div>
                  </div>
                  
                  {/* Name overlay on image */}
                  <div className="absolute bottom-0 left-0 right-0 z-[2] p-3 sm:p-4">
                    <h3 className="text-sm sm:text-base font-bold text-white mb-0.5 drop-shadow-lg">
                      {professional.name}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-white/80 line-clamp-1">
                      {professional.specialty}
                    </p>
                  </div>
                </div>
                
                {/* Content */}
                <div className="flex flex-col p-3 sm:p-4 gap-2 bg-gradient-to-b from-transparent to-gray-50/50 dark:to-white/[0.02]">
                  {/* Phone */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <span className="text-[11px] sm:text-sm text-gray-600 dark:text-gray-300 font-medium truncate">
                      {professional.phone}
                    </span>
                  </div>

                  {/* Category */}
                  {professional.category && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                        <Wrench className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500 dark:text-purple-400" />
                      </div>
                      <span className="text-[11px] sm:text-sm text-gray-600 dark:text-gray-300 font-medium truncate">
                        {professional.category}
                      </span>
                    </div>
                  )}

                  {/* Location */}
                  {(professional.district || professional.region) && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-100 dark:bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-teal-500 dark:text-teal-400" />
                      </div>
                      <span className="text-[11px] sm:text-sm text-gray-600 dark:text-gray-300 font-medium truncate">
                        {professional.district || professional.region}
                      </span>
                    </div>
                  )}
                  
                  {/* Contact Button - Glassmorphism */}
                  <Link
                    to="/contact"
                    state={{ professional }}
                    className="group/btn relative mt-1 w-full py-2.5 sm:py-3 text-center text-xs sm:text-sm font-semibold rounded-xl overflow-hidden transition-all duration-300"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                    <div className="absolute inset-0 bg-gray-100 dark:bg-white/10 group-hover/btn:bg-transparent transition-colors duration-300" />
                    <span className="relative text-gray-700 dark:text-white group-hover/btn:text-white transition-colors duration-300">
                      Bog'lanish
                    </span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Footer - Premium Glassmorphism with Enhanced UX */}
      <footer className="relative border-t border-gray-200/50 dark:border-white/5 px-3 sm:px-6 py-8 sm:py-24 transition-colors duration-300 overflow-hidden">
        {/* Animated background decorations */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-[#0a0b10] dark:via-[#0f1117] dark:to-[#06080f]" />
          <div className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-rose-500/8 dark:bg-rose-500/12 blur-3xl animate-float-soft" />
          <div className="absolute top-0 right-1/4 h-80 w-80 rounded-full bg-blue-500/8 dark:bg-blue-500/12 blur-3xl animate-float-soft" style={{ animationDelay: '-3s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-gradient-to-br from-rose-500/5 to-blue-500/5 dark:from-rose-500/8 dark:to-blue-500/8 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Main footer content */}
          <div className="grid grid-cols-1 gap-5 sm:gap-12 md:grid-cols-12 lg:gap-14 mb-6 sm:mb-12">
            {/* Logo va tavsif */}
            <div className="md:col-span-4 space-y-3 sm:space-y-6">
              <Link to="/" className="inline-block group">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 w-fit group-hover:bg-white/70 dark:group-hover:bg-white/10 transition-all duration-300">
                  <img 
                    src="./logo.webp" 
                    alt="AvtoFix"
                    width="32" 
                    className="w-8 opacity-90 group-hover:opacity-100 transition-opacity group-hover:scale-110 duration-300"
                  />
                  <span className="text-base font-bold bg-gradient-to-r from-rose-500 via-rose-600 to-orange-500 bg-clip-text text-transparent">AvtoFix</span>
                </div>
              </Link>
              <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                AvtoFix - Avtomobil ehtiyot qismlari va professional xizmatlar uchun yagona platforma. Sifatli mahsulotlar va ishonchli ustalar bir joyda.
              </p>
              
              {/* Social links */}
              <div className="flex items-center gap-2 pt-1">
                {[
                  { href: "https://t.me/UmidjonAsadov", icon: "telegram", color: "blue" },
                  { href: "tel:+998918777711", icon: "phone", color: "emerald" },
                ].map((social, idx) => (
                  <a 
                    key={idx}
                    href={social.href}
                    target={social.href.startsWith('http') ? "_blank" : undefined}
                    rel={social.href.startsWith('http') ? "noopener noreferrer" : undefined}
                    className={`group flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-gradient-to-br from-${social.color}-500/20 to-${social.color}-600/20 border border-${social.color}-500/30 text-${social.color}-500 hover:from-${social.color}-500 hover:to-${social.color}-600 hover:text-white hover:border-${social.color}-600 shadow-lg shadow-${social.color}-500/20 hover:shadow-${social.color}-500/40 hover:scale-110 transition-all duration-300`}
                  >
                    {social.icon === "telegram" && (
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-12 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                      </svg>
                    )}
                    {social.icon === "phone" && <Phone className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-125 transition-transform" />}
                  </a>
                ))}
              </div>
            </div>

            {/* Linklar */}
            <div className="md:col-span-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-white mb-3 sm:mb-8 flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-gradient-to-b from-rose-500 to-orange-500 shadow-lg shadow-rose-500/30" />
                Sahifalar
              </h3>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-1 sm:space-y-4">
                {[
                  { to: "/", label: "Bosh sahifa" },
                  { to: "/categories", label: "Kategoriyalar" },
                  { to: "/professionals", label: "Ustalar" },
                  { to: "/contact", label: "Bog'lanish" },
                ].map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="group text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 transition-all inline-flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-rose-500 group-hover:scale-150 transition-all" />
                      <span className="group-hover:translate-x-1 transition-transform">{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Aloqa */}
            <div className="md:col-span-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-white mb-3 sm:mb-8 flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-gradient-to-b from-rose-500 to-orange-500 shadow-lg shadow-rose-500/30" />
                Aloqa
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:space-y-3">
                <a 
                  href="tel:+998918777711" 
                  className="group flex items-center gap-1.5 p-1.5 sm:p-4 rounded-lg bg-gradient-to-br from-white/60 to-white/40 dark:from-white/8 dark:to-white/3 border border-gray-200/60 dark:border-white/10 hover:from-rose-50 hover:to-rose-50/50 dark:hover:from-rose-500/15 dark:hover:to-rose-500/5 hover:border-rose-200 dark:hover:border-rose-500/30 shadow-sm hover:shadow-lg hover:shadow-rose-500/10 transition-all duration-300 hover:-translate-y-1"
                >
                  <span className="flex items-center justify-center w-7 h-7 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-rose-500/25 to-rose-600/25 border border-rose-500/40 text-rose-500 group-hover:from-rose-500 group-hover:to-rose-600 group-hover:text-white group-hover:border-rose-600 group-hover:shadow-lg group-hover:shadow-rose-500/30 transition-all flex-shrink-0">
                    <Phone className="w-3 h-3 sm:w-5 sm:h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[8px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Telefon</p>
                    <p className="text-[10px] sm:text-sm font-bold text-gray-900 dark:text-white mt-0.5 truncate">+998 (91) 071 28 28</p>
                  </div>
                </a>
                <div className="flex items-center gap-1.5 p-1.5 sm:p-4 rounded-lg bg-gradient-to-br from-white/60 to-white/40 dark:from-white/8 dark:to-white/3 border border-gray-200/60 dark:border-white/10">
                  <span className="flex items-center justify-center w-7 h-7 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-emerald-500/25 to-emerald-600/25 border border-emerald-500/40 text-emerald-500 flex-shrink-0">
                    <svg className="w-3 h-3 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[8px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ish vaqti</p>
                    <p className="text-[10px] sm:text-sm font-bold text-gray-900 dark:text-white mt-0.5 truncate">24/7</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-white/10 to-transparent mb-4 sm:mb-8" />

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-6">
            <p className="text-[9px] sm:text-sm text-gray-500 dark:text-gray-500 font-medium text-center sm:text-left">
              © {new Date().getFullYear()} AvtoFix. Barcha huquqlar himoyalangan.
            </p>
            <div className="flex items-center gap-2 sm:gap-6 text-[9px] sm:text-xs text-gray-400 dark:text-gray-600">
              <Link to="/" className="hover:text-gray-600 dark:hover:text-gray-400 transition-colors hover:underline">
                Maxfiylik
              </Link>
              <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
              <Link to="/" className="hover:text-gray-600 dark:hover:text-gray-400 transition-colors hover:underline">
                Shartlar
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
