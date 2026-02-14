import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Search, Star, LayoutGrid, Moon, Sun, ChevronRight, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { setNavbarFavoriteElements } from "@/utils/favoriteAnimationRegistry";
import { categoriesAPI } from "@/services/api";
import CatalogModal from "./CatalogModal";
import SearchAutocomplete from "./SearchAutocomplete";

// Быстрые категории для отображения под навбаром
const QUICK_CATEGORIES = [
  { id: "new", name: "Yangi", slug: "new", icon: Sparkles },
];

export default function Header() {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const { itemCount } = useCart();
  const { favorites } = useFavorites();
  const favoriteCount = favorites.length;
  const favoritesIconRef = useRef(null);
  const favoritesCounterRef = useRef(null);
  const categoriesScrollRef = useRef(null);
  const { currentUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Загружаем категории
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cached = sessionStorage.getItem('nav_categories');
        if (cached) {
          setCategories(JSON.parse(cached));
          return;
        }
        const data = await categoriesAPI.getAll();
        // Берём только корневые категории (первые 8)
        const rootCategories = (data || []).filter(c => !c.parentId).slice(0, 8);
        setCategories(rootCategories);
        sessionStorage.setItem('nav_categories', JSON.stringify(rootCategories));
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, []);

  const handleSearch = (query) => {
    // Agar bosh sahifa yoki categories sahifasida bo'lsa, event dispatch qilamiz
    if (window.location.pathname === '/' || window.location.pathname === '/categories') {
      window.dispatchEvent(new CustomEvent('searchQuery', { detail: { query } }));
      setMobileSearchOpen(false);
    } else {
      // Boshqa sahifalarda /search ga yo'naltiramiz
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setMobileSearchOpen(false);
    }
  };

  useEffect(() => {
    setNavbarFavoriteElements({
      iconElement: favoritesIconRef.current,
      counterElement: favoritesCounterRef.current,
    });
  }, [favoriteCount]);

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-black/70 backdrop-blur-lg supports-[backdrop-filter]:bg-white/90 dark:supports-[backdrop-filter]:bg-black/55 transition-colors duration-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              to="/"
              className="flex items-center gap-2 transition-transform duration-300 hover:-translate-y-0.5"
            >
              <img src="/logo.webp" alt="AvtoFix" width="100" />
            </Link>

            {/* Katalog tugmasi - Desktop */}
            <button
              onClick={() => setCatalogOpen(true)}
              className="hidden md:flex items-center gap-2 px-4 py-2 ml-4 rounded-xl font-medium bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
            >
              <LayoutGrid className="w-5 h-5" />
              <span>Katalog</span>
            </button>

            {/* Qidiruv - Desktop */}
            <div className="hidden md:flex flex-1 max-w-lg mx-8">
              <SearchAutocomplete
                onSearch={handleSearch}
                placeholder="Mahsulot qidirish..."
                className="w-full"
              />
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-all"
                aria-label={theme === "dark" ? "Yorug' rejimga o'tish" : "Qorong'u rejimga o'tish"}
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5 text-yellow-400" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-700" />
                )}
              </button>

              {/* Mobile Qidiruv */}
              <button
                onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition md:hidden"
              >
                <Search className="w-5 h-5 text-gray-700 dark:text-white" />
              </button>

              {/* Sevimlilar */}
              <Link
                to="/favorites"
                className="group relative inline-flex p-2 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-100 dark:hover:bg-white/10"
                ref={favoritesIconRef}
              >
                <Star className="w-5 h-5 text-gray-700 dark:text-white transition-transform group-hover:rotate-12" />
                <span
                  ref={favoritesCounterRef}
                  className={`favorite-counter absolute top-1 right-1 min-w-[1.4rem] h-4 rounded-full flex items-center justify-center px-1 text-xs font-semibold transition-all ${favoriteCount > 0
                      ? "bg-red-600 text-white opacity-100 scale-100"
                      : "bg-red-600 text-white opacity-0 scale-75"
                    }`}
                >
                  {favoriteCount}
                </span>
              </Link>

              {/* Savatcha */}
              <Link
                to="/cart"
                className="relative hidden md:inline-flex p-2 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <ShoppingCart className="w-5 h-5 text-gray-700 dark:text-white" />
                {itemCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>

              {/* Auth tugmalari */}
              <div className="hidden md:flex items-center gap-2">
                {currentUser ? (
                  <Link
                    to="/profile"
                    className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-gray-100 hover:border-red-500 hover:bg-red-500/20 transition-all"
                  >
                    Profil
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 font-medium transition-all"
                    >
                      Kirish
                    </Link>
                    <Link
                      to="/register"
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 via-rose-600 to-orange-500 text-white font-medium shadow-lg shadow-red-900/40 hover:shadow-red-900/60 transition-all"
                    >
                      Ro'yxatdan o'tish
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Search Input */}
        {mobileSearchOpen && (
          <div className="px-4 pb-3 animate-fade-in-up">
            <SearchAutocomplete
              onSearch={handleSearch}
              placeholder="Mahsulot qidirish..."
              isMobile={true}
            />
          </div>
        )}

        {/* Categories Bar - под навбаром как в Uzum */}
        <div className="border-t border-gray-200 dark:border-white/5 bg-gray-50/95 dark:bg-black/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              ref={categoriesScrollRef}
              className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {/* Быстрые категории */}
              {QUICK_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <Link
                    key={cat.id}
                    to={`/categories?filter=${cat.slug}`}
                    className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-xl shadow-lg shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40 hover:-translate-y-0.5 transition-all duration-300 whitespace-nowrap"
                  >
                    <Icon className="w-4 h-4" />
                    {cat.name}
                  </Link>
                );
              })}

              {/* Разделитель */}
              <div className="flex-shrink-0 w-px h-5 bg-gradient-to-b from-transparent via-gray-300 dark:via-white/20 to-transparent mx-1" />

              {/* Категории из базы */}
              {categories.map((cat) => (
                <Link
                  key={cat._id}
                  to={`/categories?category=${cat._id}`}
                  className="flex-shrink-0 px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-500/30 hover:shadow-md hover:-translate-y-0.5 rounded-xl transition-all duration-300 whitespace-nowrap shadow-sm"
                >
                  {cat.name}
                </Link>
              ))}

              {/* Кнопка "Ещё" */}
              <button
                onClick={() => setCatalogOpen(true)}
                className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-500/30 hover:shadow-md hover:-translate-y-0.5 rounded-xl transition-all duration-300 whitespace-nowrap shadow-sm"
              >
                <span>Yana</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Catalog Modal */}
      <CatalogModal isOpen={catalogOpen} onClose={() => setCatalogOpen(false)} />
    </>
  );
}
