import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { productsAPI } from '../services/api';
import { searchProductsAndVariants } from '../utils/searchUtils';
import { useFavorites } from '@/context/FavoritesContext';
import { formatCurrency } from '@/utils/currency';
import { Star, ShoppingCart, Loader2, PackageSearch, AlertCircle } from 'lucide-react';
import QuantityCounterCompact from '@/components/QuantityCounterCompact';
import {
    playStarButtonAnimation,
    playNavbarFavoriteAddAnimation,
    playNavbarFavoriteRemoveAnimation,
} from "@/utils/favoriteAnimations";
import { getNavbarFavoriteElements } from "@/utils/favoriteAnimationRegistry";

const SearchResults = () => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { toggleFavorite, isFavorite } = useFavorites();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchResults = async () => {
            if (!query.trim()) {
                setResults([]);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                console.log('🔍 Searching for:', query);
                
                // Backend'dan qidiruv natijalarini olish
                const searchRes = await productsAPI.search({ q: query, limit: 100 });
                let searchData = Array.isArray(searchRes) ? searchRes : (searchRes.products || []);

                console.log('📦 Search results from API:', searchData.length);

                // Client side logikani ishlatish (variantlarni ajratish uchun)
                const formattedResults = searchProductsAndVariants(searchData, query);

                console.log('✅ Formatted results:', formattedResults.length);
                setResults(formattedResults);
            } catch (err) {
                console.error("Search error:", err);
                setError("Qidiruvda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.");
            } finally {
                setLoading(false);
            }
        };

        // Debounce
        const timeoutId = setTimeout(() => {
            fetchResults();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [query]);

    const handleProductFavoriteToggle = async (event, product) => {
        event.preventDefault();
        event.stopPropagation();

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

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
                <Loader2 className="w-10 h-10 text-rose-500 animate-spin mb-4" />
                <p className="text-gray-500 animate-pulse">Qidirilmoqda...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black/95 text-gray-900 dark:text-white pb-20 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                        <Link to="/" className="hover:text-rose-500 transition-colors">Bosh sahifa</Link>
                        <span>/</span>
                        <span>Qidiruv natijalari</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                        <span className="bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-transparent">
                            {query ? `"${query}"` : "Qidiruv"}
                        </span>
                        <span className="text-gray-400 text-lg font-normal py-1">
                            • {results.length} ta natija
                        </span>
                    </h1>
                </div>

                {/* Results Grid */}
                {results.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
                        {results.map((item, index) => {
                            const product = item.product;
                            const isVariantMatch = item.type === 'variant';

                            // ID generation logic for key
                            const uniqueKey = isVariantMatch
                                ? `${product._id}_v${item.variantIndex}_${index}`
                                : `${product._id}_${index}`;

                            // Link generation
                            const linkTo = isVariantMatch
                                ? `/product/${product._id}?variant=${item.variantIndex}`
                                : `/product/${product._id}`;

                            return (
                                <Link
                                    key={uniqueKey}
                                    to={linkTo}
                                    className="group relative flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-gray-200/60 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl shadow-lg shadow-gray-200/50 dark:shadow-none transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:shadow-rose-500/10 dark:hover:shadow-rose-500/5 dark:hover:bg-white/[0.06] dark:hover:border-white/20"
                                >
                                    {/* Image Container */}
                                    <div className="relative overflow-hidden aspect-square">
                                        {/* Gradient overlay on hover */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-[1]" />

                                        {/* Variant Badge */}
                                        {isVariantMatch && (
                                            <div className="absolute left-2 top-2 sm:left-3 sm:top-3 z-10">
                                                <span className="px-2 py-1 text-[10px] sm:text-xs font-bold text-white bg-gradient-to-r from-violet-500 to-purple-500 rounded-lg shadow-lg shadow-violet-500/30">
                                                    Variant: {item.variant.name}
                                                </span>
                                            </div>
                                        )}

                                        {/* Favorite Button */}
                                        <button
                                            type="button"
                                            onClick={(e) => handleProductFavoriteToggle(e, product)}
                                            className={`absolute right-2 top-2 sm:right-3 sm:top-3 z-10 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl backdrop-blur-md border transition-all duration-300 ${isFavorite(product._id)
                                                    ? "border-yellow-400/60 bg-yellow-500/30 text-yellow-400 shadow-lg shadow-yellow-500/20"
                                                    : "border-white/30 dark:border-white/20 bg-white/70 dark:bg-black/30 text-gray-500 dark:text-white/70 hover:bg-white dark:hover:bg-black/50 hover:text-yellow-500 hover:border-yellow-400/50"
                                                }`}
                                        >
                                            <Star
                                                className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:scale-110"
                                                fill={isFavorite(product._id) ? "currentColor" : "none"}
                                            />
                                        </button>

                                        {/* Image */}
                                        <div className="h-full w-full bg-gray-100 dark:bg-white/5">
                                            <img
                                                src={item.displayImage || product.imageUrl || "/placeholder.jpg"}
                                                alt={item.displayName}
                                                loading="lazy"
                                                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex flex-1 flex-col p-3 sm:p-4 gap-1.5 bg-gradient-to-b from-transparent to-gray-50/50 dark:to-white/[0.02]">
                                        <h3 className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-white line-clamp-2 leading-snug group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                                            {item.displayName}
                                        </h3>

                                        {/* Meta info (SKU / Code) */}
                                        <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                                            {(item.product.sku || (isVariantMatch && item.variant.sku)) && (
                                                <span className="bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded">
                                                    SKU: {isVariantMatch ? (item.variant.sku || item.product.sku) : item.product.sku}
                                                </span>
                                            )}
                                        </div>

                                        {/* Price */}
                                        <div className="flex items-baseline gap-1 flex-wrap mt-auto pt-2">
                                            <span className="text-sm sm:text-lg font-bold bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-transparent">
                                                {formatCurrency(product.currency) === "$" ? "$" : ""}
                                                {item.displayPrice?.toLocaleString()}
                                            </span>
                                            {formatCurrency(product.currency) !== "$" && (
                                                <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                                                    so'm
                                                </span>
                                            )}
                                        </div>

                                        {/* Cart Action */}
                                        <div className="pt-2">
                                            <QuantityCounterCompact product={product} />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-24 h-24 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
                            <PackageSearch className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            Hech narsa topilmadi
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-8">
                            "{query}" so'rovi bo'yicha hech qanday mahsulot topilmadi. Boshqa so'z bilan qidirib ko'ring yoki kategoriyalar orqali o'ting.
                        </p>
                        <Link
                            to="/categories"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors shadow-lg shadow-rose-500/30"
                        >
                            Kategoriyalarga o'tish
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchResults;
