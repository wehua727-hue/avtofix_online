import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { favoritesAPI } from "@/services/api";
import { useAuth } from "./AuthContext";

const FavoritesContext = createContext(undefined);

const normalizeProduct = (product) => {
  if (!product) return null;
  const id = product._id ?? product.id;
  if (!id) return null;

  let image =
    product.imageUrl ||
    (Array.isArray(product.images) ? product.images[0] : null) ||
    product.image ||
    "";

  // If we only have a bare filename (no slash), assume it lives in /uploads
  if (image && typeof image === "string" && !image.startsWith("http") && !image.startsWith("/")) {
    image = `/uploads/${image}`;
  }
  return {
    id,
    name: product.name ?? "",
    price: product.price ?? "",
    currency: product.currency ?? "",
    image,
  };
};

const mapFromApi = (item) => {
  if (!item) return null;
  const id = item.id ?? item.productId;
  if (!id) return null;

  let image =
    item.imageUrl ||
    (Array.isArray(item.images) ? item.images[0] : null) ||
    item.image ||
    "";

  if (image && typeof image === "string" && !image.startsWith("http") && !image.startsWith("/")) {
    image = `/uploads/${image}`;
  }
  return {
    id,
    name: item.name ?? "",
    price: item.price ?? "",
    currency: item.currency ?? "",
    image,
  };
};

export const FavoritesProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadFavorites = async () => {
      const userId = currentUser?.id;

      if (!userId) {
        setFavorites([]);
        return;
      }

      setLoading(true);
      try {
        const data = await favoritesAPI.getFavorites(userId);
        if (!isMounted) {
          return;
        }
        const items = Array.isArray(data?.items)
          ? data.items.map(mapFromApi).filter(Boolean)
          : [];
        setFavorites(items);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        console.error("Failed to load favorites:", error);
        setFavorites([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadFavorites();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  const setFavoritesFromResponse = useCallback((items) => {
    setFavorites(
      Array.isArray(items) ? items.map(mapFromApi).filter(Boolean) : [],
    );
  }, []);

  const toggleFavorite = useCallback(
    async (product) => {
      const item = normalizeProduct(product);
      if (!item) {
        return { error: "Mahsulot ma'lumotlari topilmadi" };
      }

      const userId = currentUser?.id;
      if (!userId) {
        return { requiresAuth: true };
      }

      try {
        const response = await favoritesAPI.toggleFavorite(userId, {
          productId: item.id,
          name: item.name,
          price: item.price,
          currency: item.currency,
          image: item.image,
        });
        setFavoritesFromResponse(response?.items);
        return { isFavorite: response?.isFavorite ?? false };
      } catch (error) {
        console.error("Failed to toggle favorite:", error);
        return { error: "Sevimlilarni yangilashda xatolik" };
      }
    },
    [currentUser?.id, setFavoritesFromResponse],
  );

  const addFavorite = useCallback(
    async (product) => {
      const normalized = normalizeProduct(product);
      if (!normalized) {
        return { error: "Mahsulot ma'lumotlari topilmadi" };
      }

      if (favorites.some((favorite) => favorite.id === normalized.id)) {
        return { isFavorite: true };
      }

      return toggleFavorite(product);
    },
    [favorites, toggleFavorite],
  );

  const removeFavorite = useCallback(
    async (id) => {
      const userId = currentUser?.id;

      if (!userId) {
        return { requiresAuth: true };
      }

      if (!id) {
        return { error: "Mahsulot identifikatori topilmadi" };
      }

      try {
        const response = await favoritesAPI.removeFavorite(userId, id);
        setFavoritesFromResponse(response?.items);
        return { success: true };
      } catch (error) {
        console.error("Failed to remove favorite:", error);
        return { error: "Sevimlilarni o'chirishda xatolik" };
      }
    },
    [currentUser?.id, setFavoritesFromResponse],
  );

  const isFavorite = useCallback(
    (id) => favorites.some((favorite) => favorite.id === id),
    [favorites],
  );

  const value = useMemo(
    () => ({
      favorites,
      addFavorite,
      removeFavorite,
      toggleFavorite,
      isFavorite,
      loading,
    }),
    [
      favorites,
      addFavorite,
      removeFavorite,
      toggleFavorite,
      isFavorite,
      loading,
    ],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
};
