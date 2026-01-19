import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { useFavorites } from "@/context/FavoritesContext";
import BackButton from "@/components/BackButton";
import {
  playStarButtonAnimation,
  playNavbarFavoriteRemoveAnimation,
} from "@/utils/favoriteAnimations";
import { getNavbarFavoriteElements } from "@/utils/favoriteAnimationRegistry";
import QuantityCounterCompact from "@/components/QuantityCounterCompact";

const Favorites = () => {
  const { favorites, toggleFavorite } = useFavorites();

  const handleRemove = (event, product) => {
    toggleFavorite(product);
    const button = event?.currentTarget ?? null;
    if (button) {
      playStarButtonAnimation(button, "remove");
    }
    const { counterElement } = getNavbarFavoriteElements();
    playNavbarFavoriteRemoveAnimation({ counterElement });
  };

  return (
    <div className="min-h-screen text-gray-900 dark:text-white pb-28 md:pb-0 bg-gray-50 dark:bg-transparent">
      <div className="border-b border-gray-200 dark:border-white/5 bg-white/80 dark:bg-black/60 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <BackButton className="bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10" />
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-gray-600 dark:text-white/70">
            <Star className="h-4 w-4 text-amber-500 dark:text-amber-300" fill="currentColor" />
            Sevimlilar
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-6 py-8 md:py-12">
        <div className="mb-10 space-y-3 hidden md:block">
          <h1 className="text-3xl font-semibold sm:text-4xl">
            Siz tanlagan mahsulotlar
          </h1>
          <p className="max-w-2xl text-sm text-gray-600 dark:text-white/65">
            Har bir mahsulotni savatchaga qo'shing yoki tezkor buyurtma berish
            uchun miqdorni tanlang.
          </p>
        </div>

        {favorites.length === 0 ? (
          <div className="flex flex-col items-center space-y-4 rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-12 text-center shadow-sm dark:shadow-none">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-white/10 text-amber-500 dark:text-amber-300">
              <Star className="h-7 w-7" fill="currentColor" />
            </div>
            <h2 className="text-2xl font-semibold">Sevimlilar ro'yxati bo'sh</h2>
            <p className="max-w-md text-sm text-gray-600 dark:text-white/65">
              Biror mahsulotni yulducha ikonkasini bosib sevimlilarga
              qo'shishingiz mumkin. Keyin shu yerda tez topasiz.
            </p>
            <Link
              to="/"
              className="inline-flex h-11 items-center rounded-xl bg-gradient-to-r from-red-500 via-rose-600 to-orange-500 px-6 text-sm font-semibold text-white shadow-[0_18px_35px_-18px_rgba(244,63,94,0.65)] transition-all duration-300 hover:-translate-y-1 hover:shadow-red-900/60"
            >
              Mahsulotlarni ko'rish
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {favorites.map((product) => (
              <div
                key={product.id}
                className="group flex h-full flex-col rounded-[28px] border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 transition-all duration-300 hover:-translate-y-2 hover:border-rose-400/40 hover:bg-gray-50 dark:hover:bg-white/10 shadow-sm dark:shadow-none"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/0 opacity-50 transition-opacity duration-300 group-hover:opacity-80" />
                  <img
                    src={
                      product.imageUrl ||
                      product.images?.[0] ||
                      product.image ||
                      "/placeholder.jpg"
                    }
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <button
                    type="button"
                    onClick={(event) => handleRemove(event, product)}
                    className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-black/30 text-amber-300 transition-all hover:border-rose-400/60 hover:bg-rose-500/20"
                    aria-label="Sevimlilardan chiqarish"
                  >
                    <Star className="h-5 w-5" fill="currentColor" />
                  </button>
                </div>

                <div className="flex flex-1 flex-col gap-3 pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                    {product.name}
                  </h3>
                  <div className="text-2xl font-semibold text-rose-500 dark:text-rose-400">
                    {product.price}{" "}
                    <span className="text-base text-gray-500 dark:text-white/60">
                      {product.currency}
                    </span>
                  </div>
                  <div className="mt-auto">
                    <QuantityCounterCompact product={product} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Favorites;
