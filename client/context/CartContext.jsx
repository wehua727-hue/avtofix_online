import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { cartAPI } from "@/services/api";

const CartContext = createContext(undefined);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [total, setTotal] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const { currentUser } = useAuth();

  // Load cart when user changes
  useEffect(() => {
    const loadCart = async () => {
      if (currentUser && currentUser.id) {
        try {
          const cartData = await cartAPI.getCart(currentUser.id);
          setItems(cartData.items || []);
          setTotal(cartData.total || 0);
          setItemCount(cartData.itemCount || 0);
        } catch (error) {
          console.error("Error loading cart:", error);
          setItems([]);
          setTotal(0);
          setItemCount(0);
        }
      } else {
        // Clear cart when user logs out or not authenticated
        setItems([]);
        setTotal(0);
        setItemCount(0);
      }
      setIsLoaded(true);
    };

    loadCart();
  }, [currentUser]);

  // Get quantity of a specific item
  const getItemQuantity = (id) => {
    const item = items.find((item) => item.productId === id || item.id === id);
    return item ? item.quantity : 0;
  };

  // Increment item quantity
  const incrementItem = async (product) => {
    if (!currentUser || !currentUser.id) {
      return { requiresAuth: true };
    }

    try {
      // Для вариантов используем уникальный ID, для обычных товаров - стандартный
      let productId = product.id || product._id;
      let variantName = null;
      let parentProductId = null;
      
      // Если это вариант (выбранный на странице продукта)
      if (product.selectedVariant && typeof product.selectedVariant === 'object') {
        variantName = product.selectedVariant.name;
        parentProductId = productId;
        // Создаём уникальный ID для варианта
        productId = `${productId}_variant_${variantName}`;
      }
      // Если это уже развёрнутый вариант с главной страницы
      else if (product.isVariant && product.parentProductId) {
        variantName = product.variantName;
        parentProductId = product.parentProductId;
        // ID уже уникальный
      }

      const rawPrice = product.price;
      let numericPrice = 0;
      if (typeof rawPrice === "number") {
        numericPrice = rawPrice;
      } else if (typeof rawPrice === "string") {
        const parsed = parseFloat(rawPrice.replace(/[^\d.,-]/g, "").replace(",", "."));
        numericPrice = Number.isFinite(parsed) ? parsed : 0;
      }
      if (!numericPrice && typeof product.priceNumber === "number") {
        numericPrice = product.priceNumber;
      }
      if (!numericPrice && typeof product.priceValue === "number") {
        numericPrice = product.priceValue;
      }
      if (!numericPrice && typeof product.priceRaw === "number") {
        numericPrice = product.priceRaw;
      }

      const imageSource =
        product.image ||
        product.imageUrl ||
        product.images?.[0] ||
        product.thumbnail ||
        product.coverImage ||
        "/placeholder.jpg";

      // stockCount ni olish (POST tizim mahsulotlari uchun stock maydonini ham tekshirish)
      let stockCount = null;
      if (product.stockCount !== null && product.stockCount !== undefined) {
        stockCount = Number(product.stockCount);
      } else if (product.stock !== null && product.stock !== undefined) {
        stockCount = Number(product.stock);
      }

      const itemData = {
        productId,
        name: product.name || "Noma'lum mahsulot",
        price: numericPrice,
        currency: product.currency || "UZS",
        image: imageSource,
        quantity: 1,
        variantName: variantName,
        parentProductId: parentProductId,
        stockCount: stockCount,
      };

      const cartData = await cartAPI.addItem(currentUser.id, itemData);
      setItems(cartData.items || []);
      setTotal(cartData.total || 0);
      setItemCount(cartData.itemCount || 0);
      return { success: true };
    } catch (error) {
      console.error("Error adding to cart:", error);
      return { error: `Savatga qo'shishda xatolik: ${error.message}` };
    }
  };

  // Decrement item quantity
  const decrementItem = async (productId) => {
    if (!currentUser || !currentUser.id) return;

    try {
      const currentQuantity = getItemQuantity(productId);
      const newQuantity = currentQuantity - 1;

      const cartData = await cartAPI.updateQuantity(
        currentUser.id,
        productId,
        newQuantity,
      );
      setItems(cartData.items || []);
      setTotal(cartData.total || 0);
      setItemCount(cartData.itemCount || 0);
    } catch (error) {
      console.error("Error updating cart:", error);
    }
  };

  // Remove item from cart
  const removeItem = async (productId) => {
    if (!currentUser || !currentUser.id) return;

    try {
      const cartData = await cartAPI.removeItem(currentUser.id, productId);
      setItems(cartData.items || []);
      setTotal(cartData.total || 0);
      setItemCount(cartData.itemCount || 0);
    } catch (error) {
      console.error("Error removing from cart:", error);
    }
  };

  // Clear cart
  const clearCart = async () => {
    if (!currentUser || !currentUser.id) return;

    try {
      const cartData = await cartAPI.clearCart(currentUser.id);
      setItems(cartData.items || []);
      setTotal(cartData.total || 0);
      setItemCount(cartData.itemCount || 0);
    } catch (error) {
      console.error("Error clearing cart:", error);
    }
  };

  // Legacy functions for compatibility
  const addItem = incrementItem;
  const updateQuantity = async (productId, quantity) => {
    if (!currentUser || !currentUser.id) return;
    try {
      const cartData = await cartAPI.updateQuantity(
        currentUser.id,
        productId,
        quantity,
      );
      setItems(cartData.items || []);
      setTotal(cartData.total || 0);
      setItemCount(cartData.itemCount || 0);
    } catch (error) {
      console.error("Error updating quantity:", error);
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        total,
        itemCount,
        getItemQuantity,
        incrementItem,
        decrementItem,
        isLoaded,
        currentUser,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
